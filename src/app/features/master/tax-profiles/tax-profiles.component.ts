import { CommonModule } from '@angular/common';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { FormControlsModule, GomButtonComponent } from '@gomlibs/ui';
import {
  GomButtonContentMode,
  getButtonContentMode,
  showButtonIcon,
  showButtonText,
} from '@gomlibs/ui';
import { GomTableColumn, GomTableComponent, GomTableRow } from '@gomlibs/ui';
import { GomModalComponent } from '@gomlibs/ui';
import { GomAlertToastService } from '@gomlibs/ui';
import { TaxProfile, TaxProfilesService } from './tax-profiles.service';
import { AuthSessionService } from '../../../core/auth/auth-session.service';

interface TaxProfileRow extends GomTableRow {
  _id: string;
  name: string;
  countryCode: string;
  taxMode: string;
  rate: string;
  inclusive: string;
  status: string;
  updatedAt: string;
  actions: string;
}

@Component({
  selector: 'gom-tax-profiles',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormControlsModule,
    GomButtonComponent,
    GomTableComponent,
    GomModalComponent,
  ],
  templateUrl: './tax-profiles.component.html',
  styleUrl: './tax-profiles.component.scss',
})
export class TaxProfilesComponent implements OnInit {
  private readonly service = inject(TaxProfilesService);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(GomAlertToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly authSession = inject(AuthSessionService);

  readonly loading = signal(false);
  readonly canCreateTaxProfile = computed(() => this.authSession.hasFeature('taxProfile.create'));
  readonly canEditTaxProfile = computed(() => this.authSession.hasFeature('taxProfile.edit'));
  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly taxProfiles = signal<TaxProfile[]>([]);
  readonly formOpen = signal(false);
  readonly editingId = signal<string | null>(null);

  readonly submitMode: GomButtonContentMode = getButtonContentMode('primary-action');
  readonly cancelMode: GomButtonContentMode = getButtonContentMode('dismiss');

  readonly taxProfileForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    countryCode: ['IN', [Validators.required, Validators.minLength(2), Validators.maxLength(3)]],
    taxMode: ['GST' as 'GST' | 'NO_TAX', [Validators.required]],
    rate: [5, [Validators.required, Validators.min(0)]],
    inclusive: ['NO' as 'YES' | 'NO'],
    hsnCode: [''],
    status: ['ACTIVE' as 'ACTIVE' | 'INACTIVE', [Validators.required]],
    effectiveFrom: [''],
  });

  readonly columns: GomTableColumn<TaxProfileRow>[] = [
    { key: 'name', header: 'Tax Profile', sortable: true, filterable: true, width: '14rem' },
    { key: 'countryCode', header: 'Country', sortable: true, width: '8rem' },
    { key: 'taxMode', header: 'Tax Mode', sortable: true, width: '10rem' },
    { key: 'rate', header: 'Rate %', sortable: true, width: '8rem' },
    { key: 'inclusive', header: 'Inclusive', sortable: true, width: '8rem' },
    { key: 'status', header: 'Status', sortable: true, filterable: true, width: '10rem' },
    { key: 'updatedAt', header: 'Updated', sortable: true, width: '10rem' },
    {
      key: 'actions',
      header: 'Actions',
      width: '9rem',
      actionButtons: this.canEditTaxProfile() ? [{ label: 'Edit', actionKey: 'edit', variant: 'secondary' }] : [],
    },
  ];

  readonly rows = computed<TaxProfileRow[]>(() =>
    this.taxProfiles().map((item) => ({
      _id: item._id,
      name: item.name,
      countryCode: item.countryCode,
      taxMode: item.taxMode,
      rate: Number(item.rate).toLocaleString(undefined, { maximumFractionDigits: 2 }),
      inclusive: item.inclusive ? 'YES' : 'NO',
      status: item.status,
      updatedAt: new Date(item.updatedAt).toLocaleDateString(),
      actions: 'Edit',
    }))
  );

  ngOnInit(): void {
    this.taxProfileForm.controls.taxMode.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((taxMode) => {
        this.syncRateControl(taxMode || 'GST');
      });

    this.syncRateControl(this.taxProfileForm.controls.taxMode.value || 'GST');
    this.loadTaxProfiles();
  }

  loadTaxProfiles(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.service.listTaxProfiles(1, 100).subscribe({
      next: (response) => {
        this.taxProfiles.set(response.data || []);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Failed to load tax profiles.');
        this.loading.set(false);
      },
    });
  }

  openCreate(): void {
    if (!this.canCreateTaxProfile()) {
      return;
    }

    this.editingId.set(null);
    this.taxProfileForm.reset({
      name: '',
      countryCode: 'IN',
      taxMode: 'GST',
      rate: 5,
      inclusive: 'NO',
      hsnCode: '',
      status: 'ACTIVE',
      effectiveFrom: '',
    });
    this.formOpen.set(true);
  }

  closeForm(): void {
    this.formOpen.set(false);
    this.editingId.set(null);
  }

  onRowAction(event: { actionKey: string; row: GomTableRow }): void {
    if (!this.canEditTaxProfile()) {
      return;
    }
    if (event.actionKey !== 'edit') {
      return;
    }

    const id = typeof event.row['_id'] === 'string' ? event.row['_id'] : '';
    const profile = this.taxProfiles().find((item) => item._id === id);
    if (!profile) {
      return;
    }

    this.editingId.set(profile._id);
    this.taxProfileForm.reset({
      name: profile.name,
      countryCode: profile.countryCode || 'IN',
      taxMode: profile.taxMode,
      rate: profile.rate,
      inclusive: profile.inclusive ? 'YES' : 'NO',
      hsnCode: profile.hsnCode || '',
      status: profile.status,
      effectiveFrom: this.toDateInput(profile.effectiveFrom),
    });
    this.formOpen.set(true);
  }

  saveTaxProfile(): void {
    const isEdit = !!this.editingId();
    const canProceed = isEdit ? this.canEditTaxProfile() : this.canCreateTaxProfile();
    if (!canProceed) {
      return;
    }

    this.taxProfileForm.markAllAsTouched();
    if (this.taxProfileForm.invalid) {
      this.toast.error('Please fill all required fields.');
      return;
    }

    const raw = this.taxProfileForm.getRawValue();
    const payload = {
      name: String(raw.name || '').trim(),
      countryCode: String(raw.countryCode || 'IN').trim().toUpperCase(),
      taxMode: raw.taxMode || 'GST',
      rate: Number(raw.rate || 0),
      inclusive: raw.inclusive === 'YES',
      hsnCode: String(raw.hsnCode || '').trim(),
      status: raw.status || 'ACTIVE',
      effectiveFrom: raw.effectiveFrom ? new Date(raw.effectiveFrom).toISOString() : null,
    };

    this.saving.set(true);
    const editingId = this.editingId();
    const request$ = editingId
      ? this.service.updateTaxProfile(editingId, payload)
      : this.service.createTaxProfile(payload);

    request$.subscribe({
      next: () => {
        this.toast.success(editingId ? 'Tax profile updated successfully.' : 'Tax profile created successfully.');
        this.closeForm();
        this.loadTaxProfiles();
        this.saving.set(false);
      },
      error: (error) => {
        this.toast.error(this.extractApiMessage(error) || 'Failed to save tax profile.');
        this.saving.set(false);
      },
    });
  }

  isSaveDisabled(): boolean {
    return this.saving() || this.taxProfileForm.invalid;
  }

  shouldShowIcon(mode: GomButtonContentMode): boolean {
    return showButtonIcon(mode);
  }

  shouldShowText(mode: GomButtonContentMode): boolean {
    return showButtonText(mode);
  }

  private toDateInput(value?: string | null): string {
    if (!value) {
      return '';
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return '';
    }

    return parsed.toISOString().slice(0, 10);
  }

  private syncRateControl(taxMode: string): void {
    const rateControl = this.taxProfileForm.controls.rate;

    if (taxMode === 'NO_TAX') {
      rateControl.setValue(0, { emitEvent: false });
      rateControl.disable({ emitEvent: false });
      return;
    }

    if (rateControl.disabled) {
      rateControl.enable({ emitEvent: false });
    }
  }

  private extractApiMessage(error: unknown): string {
    const maybeMessage = (error as { error?: { message?: string } })?.error?.message;
    return typeof maybeMessage === 'string' ? maybeMessage : '';
  }
}
