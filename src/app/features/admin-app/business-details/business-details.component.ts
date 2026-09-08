import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import {
  GomAlertToastService,
  GomButtonComponent,
  GomInputComponent,
  GomSelectComponent,
  GomSelectOption,
  GomTextareaComponent,
} from '@gomlibs/ui';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { MediaAssetService } from '../../saas-platform/media/media-asset.service';
import { BusinessProfile, BusinessProfileUpdate } from './business-details.models';
import { BusinessDetailsService } from './business-details.service';

@Component({
  selector: 'gom-business-details',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    GomButtonComponent,
    GomInputComponent,
    GomSelectComponent,
    GomTextareaComponent,
  ],
  templateUrl: './business-details.component.html',
  styleUrl: './business-details.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BusinessDetailsComponent implements OnInit {
  private static readonly MAX_LOGO_BYTES = 2 * 1024 * 1024;

  private readonly service = inject(BusinessDetailsService);
  private readonly mediaService = inject(MediaAssetService);
  private readonly authSession = inject(AuthSessionService);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(GomAlertToastService);
  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly uploadingLogo = signal(false);
  readonly editing = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly savedProfile = signal<BusinessProfile | null>(null);
  readonly logoPreview = signal('');
  readonly canEdit = computed(
    () => this.authSession.canWrite('tenant-admin') && this.authSession.hasFeature('roles.edit'),
  );

  readonly businessTypeOptions: GomSelectOption[] = [
    { value: 'RETAIL', label: 'Retail' },
    { value: 'WHOLESALE', label: 'Wholesale' },
    { value: 'FOOD_BEVERAGE', label: 'Food & beverage' },
    { value: 'RESTAURANT', label: 'Restaurant' },
    { value: 'GROCERY', label: 'Grocery' },
    { value: 'PHARMACY', label: 'Pharmacy' },
    { value: 'SERVICES', label: 'Services' },
    { value: 'OTHER', label: 'Other' },
  ];

  readonly countryOptions: GomSelectOption[] = [
    { value: 'IN', label: 'India' },
  ];

  readonly stateOptions: GomSelectOption[] = INDIA_STATES.map(([value, label]) => ({ value, label }));

  readonly taxRegistrationOptions: GomSelectOption[] = [
    { value: 'GST_REGULAR', label: 'GST regular' },
    { value: 'GST_COMPOSITION', label: 'GST composition scheme' },
    { value: 'UNREGISTERED', label: 'Unregistered' },
    { value: 'OTHER', label: 'Other registration' },
  ];

  readonly form = this.fb.nonNullable.group({
    accountName: ['', [Validators.required, Validators.maxLength(120)]],
    legalBusinessName: ['', [Validators.required, Validators.maxLength(160)]],
    businessType: ['', Validators.required],
    businessDescription: ['', Validators.maxLength(500)],
    logoUrl: [''],
    primaryContactPhone: ['', [Validators.required, Validators.pattern(/^\+?\d[\d\s-]{7,14}$/)]],
    primaryContactEmail: ['', [Validators.required, Validators.email, Validators.maxLength(160)]],
    website: ['', [Validators.pattern(/^https?:\/\/.+/i), Validators.maxLength(300)]],
    supportEmail: ['', [Validators.required, Validators.email, Validators.maxLength(160)]],
    address: this.fb.nonNullable.group({
      line1: ['', [Validators.required, Validators.maxLength(200)]],
      line2: ['', Validators.maxLength(200)],
      city: ['', [Validators.required, Validators.maxLength(100)]],
      state: ['', Validators.required],
      countryCode: ['IN', Validators.required],
      postalCode: ['', [Validators.required, Validators.pattern(/^[A-Za-z0-9][A-Za-z0-9 -]{2,11}$/)]],
    }),
    taxRegistrationType: ['', Validators.required],
    gstin: ['', Validators.pattern(/^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/i)],
    pan: ['', Validators.pattern(/^[A-Z]{5}\d{4}[A-Z]$/i)],
    brandColor: ['#0a5d8b', Validators.pattern(/^#[0-9a-f]{6}$/i)],
    brandAccent: ['#fa5c00', Validators.pattern(/^#[0-9a-f]{6}$/i)],
    brandTagline: ['', Validators.maxLength(160)],
  });

  ngOnInit(): void {
    this.setupTaxValidation();
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.service.getBusinessDetails()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ data }) => {
          this.savedProfile.set(data);
          this.restoreSavedValues();
          this.editing.set(!data.completed);
          this.loading.set(false);
        },
        error: (error) => {
          this.loading.set(false);
          this.errorMessage.set(this.apiError(error, 'businessDetails.messages.loadError'));
        },
      });
  }

  edit(): void {
    if (!this.canEdit()) {
      return;
    }
    this.restoreSavedValues();
    this.editing.set(true);
  }

  cancel(): void {
    this.restoreSavedValues();
    if (this.savedProfile()?.completed) {
      this.editing.set(false);
    }
  }

  reset(): void {
    this.restoreSavedValues();
  }

  save(): void {
    if (!this.canEdit() || this.saving() || this.uploadingLogo()) {
      return;
    }

    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.errorMessage.set(this.translate.instant('businessDetails.messages.validationError'));
      return;
    }

    this.saving.set(true);
    this.errorMessage.set(null);
    this.service.updateBusinessDetails(this.buildPayload())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ data }) => {
          this.savedProfile.set(data);
          this.restoreSavedValues();
          this.editing.set(!data.completed);
          this.saving.set(false);
          this.toast.success(this.translate.instant('businessDetails.messages.saved'));
        },
        error: (error) => {
          this.saving.set(false);
          this.errorMessage.set(this.apiError(error, 'businessDetails.messages.saveError'));
        },
      });
  }

  onLogoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }
    if (!file.type.startsWith('image/')) {
      this.toast.error(this.translate.instant('businessDetails.messages.logoImageOnly'));
      return;
    }
    if (file.size > BusinessDetailsComponent.MAX_LOGO_BYTES) {
      this.toast.error(this.translate.instant('businessDetails.messages.logoTooLarge'));
      return;
    }

    this.uploadingLogo.set(true);
    this.mediaService.uploadTenantMedia(file, file.name)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (asset) => {
          this.form.controls.logoUrl.setValue(asset.url);
          this.form.controls.logoUrl.markAsDirty();
          this.logoPreview.set(asset.url);
          this.uploadingLogo.set(false);
          this.toast.success(this.translate.instant('businessDetails.messages.logoUploaded'));
        },
        error: () => {
          this.uploadingLogo.set(false);
          this.toast.error(this.translate.instant('businessDetails.messages.logoUploadError'));
        },
      });
  }

  removeLogo(): void {
    this.form.controls.logoUrl.setValue('');
    this.form.controls.logoUrl.markAsDirty();
    this.logoPreview.set('');
  }

  fieldError(control: AbstractControl, formatKey = ''): string {
    if (!control.touched || !control.invalid) {
      return '';
    }
    if (control.hasError('required')) {
      return this.translate.instant('businessDetails.validation.required');
    }
    if (control.hasError('email')) {
      return this.translate.instant('businessDetails.validation.email');
    }
    if (control.hasError('maxlength')) {
      return this.translate.instant('businessDetails.validation.tooLong');
    }
    return this.translate.instant(formatKey || 'businessDetails.validation.invalid');
  }

  optionLabel(options: GomSelectOption[], value: string): string {
    return options.find((option) => option.value === value)?.label || value || '—';
  }

  display(value: string | null | undefined): string {
    return value?.trim() || '—';
  }

  initials(name: string): string {
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'BD';
  }

  safeColor(value: string | null | undefined, fallback: string): string {
    return /^#[0-9a-f]{6}$/i.test(value || '') ? value! : fallback;
  }

  isTaxIdRequired(): boolean {
    const registrationType = this.form.controls.taxRegistrationType.value;
    return registrationType !== '' && registrationType !== 'UNREGISTERED';
  }

  private restoreSavedValues(): void {
    const profile = this.savedProfile();
    if (!profile) {
      return;
    }
    this.form.reset({
      accountName: profile.accountName || '',
      legalBusinessName: profile.legalBusinessName || '',
      businessType: profile.businessType || '',
      businessDescription: profile.businessDescription || '',
      logoUrl: profile.logoUrl || '',
      primaryContactPhone: profile.primaryContactPhone || '',
      primaryContactEmail: profile.primaryContactEmail || '',
      website: profile.website || '',
      supportEmail: profile.supportEmail || '',
      address: {
        line1: profile.address?.line1 || '',
        line2: profile.address?.line2 || '',
        city: profile.address?.city || '',
        state: profile.address?.state || '',
        countryCode: 'IN',
        postalCode: profile.address?.postalCode || '',
      },
      taxRegistrationType: profile.taxRegistrationType || '',
      gstin: profile.gstin || '',
      pan: profile.pan || '',
      brandColor: profile.brandColor || '#0a5d8b',
      brandAccent: profile.brandAccent || '#fa5c00',
      brandTagline: profile.brandTagline || '',
    });
    this.logoPreview.set(profile.logoUrl || '');
    this.form.markAsPristine();
    this.errorMessage.set(null);
  }

  private setupTaxValidation(): void {
    this.form.controls.taxRegistrationType.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((registrationType) => {
        const required = registrationType !== '' && registrationType !== 'UNREGISTERED';
        const gstinValidators = [Validators.pattern(/^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/i)];
        const panValidators = [Validators.pattern(/^[A-Z]{5}\d{4}[A-Z]$/i)];
        this.form.controls.gstin.setValidators(required ? [Validators.required, ...gstinValidators] : gstinValidators);
        this.form.controls.pan.setValidators(required ? [Validators.required, ...panValidators] : panValidators);
        this.form.controls.gstin.updateValueAndValidity({ emitEvent: false });
        this.form.controls.pan.updateValueAndValidity({ emitEvent: false });
      });
  }

  private buildPayload(): BusinessProfileUpdate {
    const value = this.form.getRawValue();
    return {
      accountName: value.accountName.trim(),
      legalBusinessName: value.legalBusinessName.trim(),
      businessType: value.businessType,
      businessDescription: value.businessDescription.trim(),
      logoUrl: value.logoUrl.trim(),
      primaryContactPhone: value.primaryContactPhone.trim(),
      primaryContactEmail: value.primaryContactEmail.trim().toLowerCase(),
      website: value.website.trim(),
      supportEmail: value.supportEmail.trim().toLowerCase(),
      address: {
        line1: value.address.line1.trim(),
        line2: value.address.line2.trim(),
        city: value.address.city.trim(),
        state: value.address.state,
        countryCode: value.address.countryCode,
        postalCode: value.address.postalCode.trim(),
      },
      taxRegistrationType: value.taxRegistrationType,
      gstin: value.gstin.trim().toUpperCase(),
      pan: value.pan.trim().toUpperCase(),
      brandColor: value.brandColor.trim(),
      brandAccent: value.brandAccent.trim(),
      brandTagline: value.brandTagline.trim(),
    };
  }

  private apiError(error: unknown, fallbackKey: string): string {
    const message = (error as { error?: { message?: string } })?.error?.message;
    return message || this.translate.instant(fallbackKey);
  }
}

const INDIA_STATES: ReadonlyArray<readonly [string, string]> = [
  ['AN', 'Andaman and Nicobar Islands'], ['AP', 'Andhra Pradesh'], ['AR', 'Arunachal Pradesh'],
  ['AS', 'Assam'], ['BR', 'Bihar'], ['CH', 'Chandigarh'], ['CG', 'Chhattisgarh'],
  ['DN', 'Dadra and Nagar Haveli and Daman and Diu'], ['DL', 'Delhi'], ['GA', 'Goa'],
  ['GJ', 'Gujarat'], ['HR', 'Haryana'], ['HP', 'Himachal Pradesh'], ['JK', 'Jammu and Kashmir'],
  ['JH', 'Jharkhand'], ['KA', 'Karnataka'], ['KL', 'Kerala'], ['LA', 'Ladakh'],
  ['LD', 'Lakshadweep'], ['MP', 'Madhya Pradesh'], ['MH', 'Maharashtra'], ['MN', 'Manipur'],
  ['ML', 'Meghalaya'], ['MZ', 'Mizoram'], ['NL', 'Nagaland'], ['OD', 'Odisha'],
  ['PY', 'Puducherry'], ['PB', 'Punjab'], ['RJ', 'Rajasthan'], ['SK', 'Sikkim'],
  ['TN', 'Tamil Nadu'], ['TS', 'Telangana'], ['TR', 'Tripura'], ['UP', 'Uttar Pradesh'],
  ['UK', 'Uttarakhand'], ['WB', 'West Bengal'],
];
