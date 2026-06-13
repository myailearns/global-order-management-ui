import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Router, ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, map, Observable, of, switchMap } from 'rxjs';

import {
  FormControlsModule,
  GomAlertToastService,
  GomSelectOption,
  TabItem,
} from '@gomlibs/ui';

import { OfferService } from '../../services';
import {
  Offer,
  OfferType,
  OfferTriggerType,
  B1G1RewardMode,
  DiscountType,
  DeliveryMethod,
  CreateOfferRequest,
  UpdateOfferRequest,
} from '../../models';
import { CategoriesService } from '../../../master/categories/categories.service';
import { VariantsService } from '../../../product/variants/variants.service';
import { AuthSessionService } from '../../../../core/auth/auth-session.service';
import { DeliveryService } from '../../../delivery/delivery.service';

/**
 * Offers Management - Create/Edit Wizard Component
 * Multi-step form for creating or editing offers (coupon, B1G1, loyalty)
 */
@Component({
  selector: 'gom-offer-create-wizard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TranslateModule,
    FormControlsModule,
  ],
  templateUrl: './offer-create-wizard.component.html',
  styleUrl: './offer-create-wizard.component.scss',
})
export class OfferCreateWizardComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly offerService = inject(OfferService);
  private readonly categoriesService = inject(CategoriesService);
  private readonly variantsService = inject(VariantsService);
  private readonly deliveryService = inject(DeliveryService);
  private readonly authSession = inject(AuthSessionService);
  private readonly toast = inject(GomAlertToastService);
  private readonly translate = inject(TranslateService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly currentStep = signal(1);
  readonly activeTab = signal<string | number>('basic-info');
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly editOfferId = signal<string | null>(null);
  readonly isEditMode = computed(() => !!this.editOfferId());
  readonly minStartDateTime = computed(() => this.getTodayStartDateTimeInputValue());
  // Reactive signal tracking startDate form control value changes
  private readonly startDateValue = signal<string>('');
  readonly minEndDateTime = computed(() => {
    const raw = this.startDateValue();
    const startDate = this.parseDateTime(raw);
    return startDate ? this.toLocalDateTimeInputValue(startDate) : this.minStartDateTime();
  });

  // Category & Product Options
  readonly categoryOptions = signal<GomSelectOption[]>([]);
  readonly allProductOptions = signal<Array<GomSelectOption & { categoryId?: string }>>([]);
  readonly productOptions = signal<GomSelectOption[]>([]);
  readonly rewardProductOptions = computed<GomSelectOption[]>(() =>
    this.allProductOptions().map(({ label, value }) => ({ label, value })),
  );

  readonly tabs: TabItem[] = [
    { id: 'basic-info', label: 'gom.offers.step_basic_info' },
    { id: 'offer-details', label: 'gom.offers.step_details' },
    { id: 'limits-applicability', label: 'gom.offers.step_limits' },
  ];

  // Step 1: Basic Info
  basicInfoForm!: FormGroup;

  // Step 2: Offer Details (conditional based on type)
  offerDetailsForm!: FormGroup;

  // Step 3: Limits & Applicability
  limitsForm!: FormGroup;

  readonly offerTypeOptions: GomSelectOption[] = [];
  readonly discountTypeOptions: GomSelectOption[] = [];
  readonly triggerTypeOptions: GomSelectOption[] = [];
  readonly b1g1RewardTypeOptions: GomSelectOption[] = [];
  readonly deliveryMethodOptions: GomSelectOption[] = [];
  readonly deliveryPinCodeOptions = signal<GomSelectOption[]>([]);
  readonly serviceablePincodeMode = signal<'DISABLED' | 'SERVE_ALL' | 'RESTRICTED'>('DISABLED');
  readonly allPinCodesSelected = signal(false);
  readonly showSpecificPinCodeOption = computed(() =>
    this.serviceablePincodeMode() === 'RESTRICTED' && this.deliveryPinCodeOptions().length > 0,
  );

  goBack(): void {
    this.router.navigate(['../'], { relativeTo: this.route });
  }

  ngOnInit(): void {
    const offerId = this.route.snapshot.paramMap.get('id');
    if (offerId) {
      this.editOfferId.set(offerId);
    }

    this.rebuildSelectOptions();
    this.translate.onLangChange.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.rebuildSelectOptions();
    });
    this.initializeForms();
    this.setupDateDependencies();
    this.setupApplicabilityDependencies();
    this.loadCategories();
    this.loadProducts();
    this.loadServiceAreaPinCodes();
    if (offerId) {
      this.loadOffer(offerId);
    }
  }

  private loadCategories(): void {
    this.fetchAllPages((page, limit) => this.categoriesService.getCategories(page, limit, 'ACTIVE'))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (categories) => {
          this.categoryOptions.set(
            categories.map((cat) => ({
              label: cat.name,
              value: String(cat._id || ''),
            })),
          );
        },
        error: (err) => {
          console.error('Error loading categories:', err);
          this.categoryOptions.set([]);
        },
      });
  }

  private loadProducts(): void {
    const tenantHeaders = this.authSession.getTenantHeaders();
    if (!tenantHeaders['x-tenant-id']) {
      // Without tenant context, avoid showing stale/cross-tenant product data.
      this.allProductOptions.set([]);
      this.productOptions.set([]);
      return;
    }

    forkJoin({
      groups: this.fetchAllPages((page, limit) => this.variantsService.listGroups(page, limit, 'ACTIVE')),
      variants: this.fetchAllPages((page, limit) => this.variantsService.listVariants(undefined, page, limit, 'ACTIVE')),
    })
      .pipe(
        map(({ groups, variants }) => ({
          groups,
          variants,
        })),
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ groups, variants }) => {
          const currentTenantId = String(this.authSession.getTenantHeaders()['x-tenant-id'] || '').trim().toLowerCase();
          // Normalize all IDs to plain strings to avoid ObjectId vs string mismatch
          const groupCategoryById = new Map(
            (groups || []).map((group) => [
              String(group._id),
              // categoryId may be a Mongo ObjectId object; .toString() gives the hex string
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              ((group as any).categoryId?.toString?.() ?? String((group as any).categoryId ?? '')),
            ]),
          );

          const tenantScopedVariants = (variants || []).filter((variant) => {
            const variantTenantId = String(variant.tenantId || '').trim().toLowerCase();
            return !currentTenantId || !variantTenantId || variantTenantId === currentTenantId;
          });

          const variantOptions = tenantScopedVariants
            .filter((variant) => !!variant._id)
            .map((variant) => ({
              label: variant.name,
              value: String(variant._id),
              categoryId: groupCategoryById.get(String(variant.groupId)) || '',
            }));

          this.allProductOptions.set(this.uniqueScopedOptions(variantOptions));
          this.applyProductCategoryFilter();
        },
        error: (err) => {
          console.error('Error loading products:', err);
          this.allProductOptions.set([]);
          this.productOptions.set([]);
        },
      });
  }

  private loadServiceAreaPinCodes(): void {
    this.deliveryService.getTenantConfig()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          const modeRaw = String(res?.data?.deliveryPincodeConfig?.pincodeMode || 'DISABLED').toUpperCase();
          const mode = modeRaw === 'RESTRICTED' || modeRaw === 'SERVE_ALL' ? modeRaw : 'DISABLED';
          this.serviceablePincodeMode.set(mode);

          const rawPinCodes = res?.data?.deliveryPincodeConfig?.serviceablePincodes || [];
          // Strip the optional :days suffix (e.g. "502032:3" → pincode "502032", label "502032 (3 days)")
          const seenValues = new Set<string>();
          const pinCodeOptions = rawPinCodes
            .map((raw) => {
              const str = String(raw || '').trim();
              if (!str) return null;
              const colonIdx = str.indexOf(':');
              const pincode = colonIdx >= 0 ? str.slice(0, colonIdx).trim() : str;
              const days = colonIdx >= 0 ? str.slice(colonIdx + 1).trim() : '';
              if (!pincode) return null;
              const label = days ? `${pincode} (${days} days)` : pincode;
              return { label, value: pincode };
            })
            .filter((opt): opt is { label: string; value: string } => {
              if (!opt) return false;
              if (seenValues.has(opt.value)) return false;
              seenValues.add(opt.value);
              return true;
            });

          this.deliveryPinCodeOptions.set(pinCodeOptions);
          this.applyDeliveryPinCodeModeDefaults();
        },
        error: (err) => {
          console.error('Error loading serviceable pin codes:', err);
          this.serviceablePincodeMode.set('DISABLED');
          this.deliveryPinCodeOptions.set([]);
          this.applyDeliveryPinCodeModeDefaults();
        },
      });
  }

  private applyDeliveryPinCodeModeDefaults(): void {
    const modeControl = this.offerDetailsForm?.controls['deliveryPinCodesMode'];
    const pinCodesControl = this.offerDetailsForm?.controls['deliveryPinCodes'];
    if (!modeControl || !pinCodesControl) {
      return;
    }

    if (!this.showSpecificPinCodeOption()) {
      modeControl.setValue('all', { emitEvent: false });
      pinCodesControl.setValue([], { emitEvent: false });
    } else if (!modeControl.value) {
      modeControl.setValue('all', { emitEvent: false });
    }

    pinCodesControl.updateValueAndValidity({ emitEvent: false });
  }

  private fetchAllPages<T>(
    fetchPage: (page: number, limit: number) => Observable<{ data: T[]; meta?: { total?: number; limit?: number } }>,
    pageSize = 100,
  ): Observable<T[]> {
    return fetchPage(1, pageSize).pipe(
      switchMap((firstPage) => {
        const firstData = firstPage.data || [];
        const total = Number(firstPage.meta?.total || firstData.length || 0);
        const limit = Number(firstPage.meta?.limit || pageSize || 100);
        const totalPages = Math.max(1, Math.ceil(total / Math.max(1, limit)));

        if (totalPages === 1) {
          return of(firstData);
        }

        const remainingRequests = Array.from({ length: totalPages - 1 }, (_, index) => index + 2)
          .map((page) => fetchPage(page, limit));

        return forkJoin(remainingRequests).pipe(
          map((remainingPages) => [
            ...firstData,
            ...remainingPages.flatMap((page) => page.data || []),
          ]),
        );
      }),
    );
  }

  private setupApplicabilityDependencies(): void {
    this.limitsForm.controls['applicableCategories'].valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.applyProductCategoryFilter();
      });
  }

  private applyProductCategoryFilter(): void {
    const selectedCategoryIds = ((this.limitsForm.controls['applicableCategories'].value as string[] | null) || [])
      .map(String);
    const allOptions = this.allProductOptions();

    const hasCategoryFilter = selectedCategoryIds.length > 0;
    const filtered = hasCategoryFilter
      ? allOptions.filter((option) => !!option.categoryId && selectedCategoryIds.includes(String(option.categoryId)))
      : allOptions;

    this.productOptions.set(filtered.map(({ label, value }) => ({ label, value })));
    this.pruneOutOfScopeProductSelections(filtered.map((option) => option.value));
  }

  private pruneOutOfScopeProductSelections(allowedProductIds: string[]): void {
    const allowed = new Set(allowedProductIds);
    const applicableProducts = (this.limitsForm.controls['applicableProducts'].value as string[] | null) || [];
    const excludedProducts = (this.limitsForm.controls['excludedProducts'].value as string[] | null) || [];

    const nextApplicable = applicableProducts.filter((id) => allowed.has(id));
    const nextExcluded = excludedProducts.filter((id) => allowed.has(id));

    if (nextApplicable.length !== applicableProducts.length) {
      this.limitsForm.controls['applicableProducts'].setValue(nextApplicable, { emitEvent: false });
    }

    if (nextExcluded.length !== excludedProducts.length) {
      this.limitsForm.controls['excludedProducts'].setValue(nextExcluded, { emitEvent: false });
    }
  }

  private uniqueScopedOptions(options: Array<GomSelectOption & { categoryId?: string }>): Array<GomSelectOption & { categoryId?: string }> {
    const seen = new Set<string>();
    return options.filter((option) => {
      if (!option.value || seen.has(option.value)) {
        return false;
      }
      seen.add(option.value);
      return true;
    });
  }

  private rebuildSelectOptions(): void {
    this.offerTypeOptions.length = 0;
    this.offerTypeOptions.push(
      ...Object.values(OfferType)
        .filter((type) => type !== OfferType.PACK_DISCOUNT)
        .map((type) => ({
          label: this.translate.instant(`gom.offers.type_${type.toLowerCase()}`),
          value: type,
        })),
    );

    this.discountTypeOptions.length = 0;
    this.discountTypeOptions.push(
      ...Object.values(DiscountType).map((type) => ({
        label: this.translate.instant(`gom.offers.discount_${type.toLowerCase()}`),
        value: type,
      })),
    );

    this.triggerTypeOptions.length = 0;
    this.triggerTypeOptions.push(
      ...Object.values(OfferTriggerType).map((type) => ({
        label: this.translate.instant(`gom.offers.trigger_${type.toLowerCase()}`),
        value: type,
      })),
    );

    this.b1g1RewardTypeOptions.length = 0;
    this.b1g1RewardTypeOptions.push(
      {
        label: this.translate.instant('gom.offers.b1g1_reward_same_item'),
        value: 'SAME_ITEM',
      },
      {
        label: this.translate.instant('gom.offers.b1g1_reward_different_item'),
        value: 'DIFFERENT_ITEM',
      },
    );

    this.deliveryMethodOptions.length = 0;
    this.deliveryMethodOptions.push(
      ...(Object.values(DeliveryMethod) as string[]).map((method) => ({
        label: this.translate.instant(`gom.offers.delivery_method_${method.toLowerCase()}`),
        value: method,
      })),
    );
  }

  private initializeForms(): void {
    const defaultStartDate = this.isEditMode() ? '' : this.getTodayStartDateTimeInputValue();
    const defaultEndDate = this.isEditMode() ? '' : this.getTodayEndDateTimeInputValue();

    // Step 1: Basic Info
    this.basicInfoForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      description: [''],
      type: [OfferType.ORDER_DISCOUNT, Validators.required],
      triggerType: [OfferTriggerType.AUTO, Validators.required],
      priority: [''],
      startDate: [defaultStartDate, [Validators.required, this.startDateNotPastValidator()]],
      endDate: [defaultEndDate, Validators.required],
    }, {
      validators: [this.endDateAfterStartDateValidator()],
    });

    // Keep startDateValue signal in sync so minEndDateTime recomputes reactively
    this.basicInfoForm.controls['startDate'].valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((val: string) => {
        this.startDateValue.set(val ?? '');
        // Re-trigger end date validation when start date changes
        this.basicInfoForm.controls['endDate'].updateValueAndValidity({ emitEvent: false });
      });
    // Initialise with current value
    this.startDateValue.set(defaultStartDate);

    // Step 2: Offer Details
    this.offerDetailsForm = this.fb.group({
      // Discount
      discountType: [DiscountType.PERCENT],
      discountValue: [''],
      minOrderValue: [''],
      maxDiscount: [''],

      // B1G1
      b1g1RewardType: ['SAME_ITEM'],
      b1g1MinQty: [2],
      b1g1GetCount: [1],
      b1g1MaxRepeat: [5],
      b1g1BuyVariantIds: [[]],
      b1g1GetVariantId: [''],

      // Delivery
      deliveryMinCartValue: [''],
      deliveryMaxChargeCap: [''],
      deliveryMethods: [[]],
      deliveryPinCodesMode: ['all'], // 'all' or 'specific'
      deliveryPinCodes: [[]],

      // Loyalty
      loyaltyPointsPerUnit: [''],
      loyaltyMaxEarnPoints: [''],
      loyaltyMinPointsToRedeem: [50],
      loyaltyPointRedemptionValue: [1],

      // Coupon
      couponCode: [''],
    });

    this.setupOfferDetailsValidators();

    // Step 3: Limits & Applicability
    this.limitsForm = this.fb.group({
      usageLimit: [''],
      perCustomerLimit: [''],
      deliveryRepeatLimit: [''],
      applicableCategories: [[]],
      applicableProducts: [[]],
      excludedCategories: [[]],
      excludedProducts: [[]],
      deliveryApplicableCategories: [[]],
      deliveryExcludedCategories: [[]],
    });
  }

  private setupDateDependencies(): void {
    const startDateControl = this.basicInfoForm.controls['startDate'];
    const endDateControl = this.basicInfoForm.controls['endDate'];

    startDateControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((startValue) => {
        const startDate = this.parseDateTime(startValue);
        if (!startDate) {
          return;
        }

        const endDate = this.parseDateTime(endDateControl.value);
        if (!endDate || endDate < startDate) {
          endDateControl.setValue(this.getDayEndDateTimeInputValue(startDate), { emitEvent: false });
        }

        this.basicInfoForm.updateValueAndValidity({ emitEvent: false });
      });

    endDateControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.basicInfoForm.updateValueAndValidity({ emitEvent: false });
      });
  }

  private setupOfferDetailsValidators(): void {
    this.basicInfoForm.controls['type'].valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.updateOfferDetailsValidators();
      });

    this.offerDetailsForm.controls['discountType'].valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.updateOfferDetailsValidators();
      });

    // Handle delivery pin code mode change
    this.offerDetailsForm.controls['deliveryPinCodesMode'].valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((mode) => {
        const deliveryPinCodesControl = this.offerDetailsForm.controls['deliveryPinCodes'];
        if (mode === 'specific' && this.showSpecificPinCodeOption()) {
          deliveryPinCodesControl.setValidators([Validators.required]);
        } else {
          deliveryPinCodesControl.clearValidators();
          deliveryPinCodesControl.setValue([], { emitEvent: false });
        }
        deliveryPinCodesControl.updateValueAndValidity({ emitEvent: false });
      });

    this.updateOfferDetailsValidators();
  }

  private updateOfferDetailsValidators(): void {
    const discountTypeControl = this.offerDetailsForm.controls['discountType'];
    const discountValueControl = this.offerDetailsForm.controls['discountValue'];
    const minOrderValueControl = this.offerDetailsForm.controls['minOrderValue'];
    const maxDiscountControl = this.offerDetailsForm.controls['maxDiscount'];

    const discountOfferTypes = [
      OfferType.ORDER_DISCOUNT,
      OfferType.PRODUCT_DISCOUNT,
      OfferType.CATEGORY_DISCOUNT,
      OfferType.PACK_DISCOUNT,
      OfferType.FREE_DELIVERY,
    ];

    const isDiscountOfferType = discountOfferTypes.includes(this.selectedOfferType);
    const requiresDiscountValue = isDiscountOfferType && this.showDiscountValue;

    if (isDiscountOfferType) {
      discountTypeControl.setValidators([Validators.required]);
    } else {
      discountTypeControl.clearValidators();
    }

    if (requiresDiscountValue) {
      discountValueControl.setValidators([Validators.required, Validators.min(0)]);
    } else {
      discountValueControl.clearValidators();
    }

    // Optional fields: validate only when value is provided
    minOrderValueControl.setValidators([Validators.min(0)]);
    maxDiscountControl.setValidators([Validators.min(0)]);

    discountTypeControl.updateValueAndValidity({ emitEvent: false });
    discountValueControl.updateValueAndValidity({ emitEvent: false });
    minOrderValueControl.updateValueAndValidity({ emitEvent: false });
    maxDiscountControl.updateValueAndValidity({ emitEvent: false });

    // Handle delivery-specific validators
    if (this.showDeliveryFields) {
      const deliveryMinCartValueControl = this.offerDetailsForm.controls['deliveryMinCartValue'];
      const deliveryMaxChargeCapControl = this.offerDetailsForm.controls['deliveryMaxChargeCap'];
      const deliveryMethodsControl = this.offerDetailsForm.controls['deliveryMethods'];
      const deliveryPinCodesControl = this.offerDetailsForm.controls['deliveryPinCodes'];

      deliveryMinCartValueControl.setValidators([Validators.required, Validators.min(0)]);
      deliveryMaxChargeCapControl.setValidators([Validators.required, Validators.min(0.01)]);
      deliveryMethodsControl.setValidators([Validators.required]);

      if (this.selectedDeliveryPinCodeMode === 'specific' && this.showSpecificPinCodeOption()) {
        deliveryPinCodesControl.setValidators([Validators.required]);
      } else {
        deliveryPinCodesControl.clearValidators();
        if (!this.showSpecificPinCodeOption()) {
          this.offerDetailsForm.controls['deliveryPinCodesMode'].setValue('all', { emitEvent: false });
          deliveryPinCodesControl.setValue([], { emitEvent: false });
        }
      }

      deliveryMinCartValueControl.updateValueAndValidity({ emitEvent: false });
      deliveryMaxChargeCapControl.updateValueAndValidity({ emitEvent: false });
      deliveryMethodsControl.updateValueAndValidity({ emitEvent: false });
      deliveryPinCodesControl.updateValueAndValidity({ emitEvent: false });
    } else {
      // Clear delivery validators if not FREE_DELIVERY
      this.offerDetailsForm.controls['deliveryMinCartValue'].clearValidators();
      this.offerDetailsForm.controls['deliveryMaxChargeCap'].clearValidators();
      this.offerDetailsForm.controls['deliveryMethods'].clearValidators();
      this.offerDetailsForm.controls['deliveryPinCodes'].clearValidators();

      this.offerDetailsForm.controls['deliveryMinCartValue'].updateValueAndValidity({ emitEvent: false });
      this.offerDetailsForm.controls['deliveryMaxChargeCap'].updateValueAndValidity({ emitEvent: false });
      this.offerDetailsForm.controls['deliveryMethods'].updateValueAndValidity({ emitEvent: false });
      this.offerDetailsForm.controls['deliveryPinCodes'].updateValueAndValidity({ emitEvent: false });
    }
  }

  private startDateNotPastValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (this.isEditMode()) {
        return null;
      }

      const startDate = this.parseDateTime(control.value);
      if (!startDate) {
        return null;
      }

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      return startDate < todayStart ? { pastStartDate: true } : null;
    };
  }

  private endDateAfterStartDateValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const startDate = this.parseDateTime(control.get('startDate')?.value);
      const endDate = this.parseDateTime(control.get('endDate')?.value);

      if (!startDate || !endDate) {
        return null;
      }

      return endDate < startDate ? { endDateBeforeStartDate: true } : null;
    };
  }

  private parseDateTime(value: unknown): Date | null {
    let raw = '';
    if (typeof value === 'string') {
      raw = value;
    } else if (value instanceof Date) {
      raw = value.toISOString();
    } else if (typeof value === 'number') {
      raw = String(value);
    }

    const normalized = raw.trim();
    if (!normalized) {
      return null;
    }

    const parsedUs = this.parseUsDateTime(normalized);
    if (parsedUs) {
      return parsedUs;
    }

    const parsed = new Date(normalized);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }

    return parsed;
  }

  private parseUsDateTime(value: string): Date | null {
    // Support picker format like "06/02/2026 12:00 AM"
    const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})\s*(AM|PM))?$/i.exec(value);
    if (!match) {
      return null;
    }

    const month = Number(match[1]);
    const day = Number(match[2]);
    const year = Number(match[3]);
    const hour12 = Number(match[4] || '0');
    const minute = Number(match[5] || '0');
    const meridiem = String(match[6] || '').toUpperCase();

    const hasValidParts = Number.isFinite(month)
      && Number.isFinite(day)
      && Number.isFinite(year)
      && month >= 1
      && month <= 12
      && day >= 1
      && day <= 31
      && hour12 >= 0
      && hour12 <= 12
      && minute >= 0
      && minute <= 59;

    if (!hasValidParts) {
      return null;
    }

    let hour24 = hour12 % 12;
    if (meridiem === 'PM') {
      hour24 += 12;
    }

    const candidate = new Date(year, month - 1, day, hour24, minute, 0, 0);
    const isSameDate = candidate.getFullYear() === year
      && candidate.getMonth() === month - 1
      && candidate.getDate() === day;

    return isSameDate ? candidate : null;
  }

  private getTodayStartDateTimeInputValue(): string {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return this.toLocalDateTimeInputValue(now);
  }

  private getTodayEndDateTimeInputValue(): string {
    const now = new Date();
    now.setHours(23, 59, 0, 0);
    return this.toLocalDateTimeInputValue(now);
  }

  private getDayEndDateTimeInputValue(date: Date): string {
    const endDate = new Date(date);
    endDate.setHours(23, 59, 0, 0);
    return this.toLocalDateTimeInputValue(endDate);
  }

  private toLocalDateTimeInputValue(date: Date): string {
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
  }

  get selectedOfferType(): OfferType {
    return this.basicInfoForm.get('type')?.value;
  }

  get selectedTriggerType(): OfferTriggerType {
    return this.basicInfoForm.get('triggerType')?.value;
  }

  get selectedDiscountType(): DiscountType {
    return this.offerDetailsForm.get('discountType')?.value;
  }

  /** Show Discount Value only for PERCENT and AMOUNT — not FREE_DELIVERY */
  get showDiscountValue(): boolean {
    return this.selectedDiscountType === DiscountType.PERCENT || this.selectedDiscountType === DiscountType.AMOUNT;
  }

  /** Show Max Discount Cap only for PERCENT — it's meaningless for AMOUNT and FREE_DELIVERY */
  get showMaxDiscountCap(): boolean {
    return this.selectedDiscountType === DiscountType.PERCENT;
  }

  /** Show Minimum Order Value for all discount types — it's always relevant */
  get showMinOrderValue(): boolean {
    return true;
  }

  /** CATEGORY_DISCOUNT: categories are the primary selector */
  get showApplicableCategories(): boolean {
    return this.selectedOfferType === OfferType.ORDER_DISCOUNT
      || this.selectedOfferType === OfferType.CATEGORY_DISCOUNT
      || this.selectedOfferType === OfferType.BUY_X_GET_Y
      || this.selectedOfferType === OfferType.FREE_DELIVERY;
  }

  /** PRODUCT_DISCOUNT / ORDER_DISCOUNT: products can be scoped */
  get showApplicableProducts(): boolean {
    return this.selectedOfferType === OfferType.ORDER_DISCOUNT
      || this.selectedOfferType === OfferType.PRODUCT_DISCOUNT
      || this.selectedOfferType === OfferType.BUY_X_GET_Y
      || this.selectedOfferType === OfferType.FREE_DELIVERY;
  }

  /** Excluded Categories: useful when applying broadly (order/category/free delivery) */
  get showExcludedCategories(): boolean {
    const type = this.selectedOfferType;
    return type === OfferType.ORDER_DISCOUNT
      || type === OfferType.CATEGORY_DISCOUNT
      || type === OfferType.BUY_X_GET_Y
      || type === OfferType.FREE_DELIVERY;
  }

  /** Excluded Products: useful for all non-pack, non-loyalty types */
  get showExcludedProducts(): boolean {
    return this.selectedOfferType === OfferType.ORDER_DISCOUNT
      || this.selectedOfferType === OfferType.PRODUCT_DISCOUNT
      || this.selectedOfferType === OfferType.CATEGORY_DISCOUNT
      || this.selectedOfferType === OfferType.BUY_X_GET_Y
      || this.selectedOfferType === OfferType.FREE_DELIVERY;
  }

  /** Show delivery-specific form fields only for FREE_DELIVERY offers */
  get showDeliveryFields(): boolean {
    return this.selectedOfferType === OfferType.FREE_DELIVERY;
  }

  /** Show delivery category applicability for FREE_DELIVERY */
  get showDeliveryCategories(): boolean {
    return this.selectedOfferType === OfferType.FREE_DELIVERY;
  }

  get selectedDeliveryPinCodeMode(): string {
    return this.offerDetailsForm.get('deliveryPinCodesMode')?.value ?? 'all';
  }

  goToPreviousStep(): void {
    const tabIds = this.tabs.map(tab => tab.id);
    const currentIndex = tabIds.indexOf(this.activeTab());
    if (currentIndex > 0) {
      this.activeTab.set(tabIds[currentIndex - 1]);
    }
  }

  canGoToNextStep(): boolean {
    const currentForm = this.getCurrentForm();
    return !!currentForm && currentForm.valid && !this.loading();
  }

  goToNextStep(): void {
    // Validate current form before proceeding
    const currentForm = this.getCurrentForm();
    if (currentForm?.valid) {
      this.errorMessage.set(null);
      const tabIds = this.tabs.map(tab => tab.id);
      const currentIndex = tabIds.indexOf(this.activeTab());
      if (currentIndex < tabIds.length - 1) {
        this.activeTab.set(tabIds[currentIndex + 1]);
      }
    } else {
      this.errorMessage.set(this.translate.instant('gom.offers.validation_error'));
    }
  }

  onTabChange(tabId: string | number): void {
    // Validate current form before switching tabs
    const currentForm = this.getCurrentForm();
    if (currentForm && !currentForm.valid) {
      this.errorMessage.set(this.translate.instant('gom.offers.validation_error'));
      return;
    }
    this.errorMessage.set(null);
    this.activeTab.set(tabId);
  }

  private getCurrentForm(): FormGroup | null {
    switch (this.activeTab()) {
      case 'basic-info':
        return this.basicInfoForm;
      case 'offer-details':
        return this.offerDetailsForm;
      case 'limits-applicability':
        return this.limitsForm;
      default:
        return null;
    }
  }

  submit(): void {
    this.basicInfoForm.updateValueAndValidity({ emitEvent: false });

    // Validate all forms
    if (!this.basicInfoForm.valid || !this.offerDetailsForm.valid || !this.limitsForm.valid) {
      if (this.basicInfoForm.controls['startDate'].hasError('pastStartDate')) {
        this.errorMessage.set(this.translate.instant('gom.offers.validation_start_date_not_past'));
      } else if (this.basicInfoForm.hasError('endDateBeforeStartDate')) {
        this.errorMessage.set(this.translate.instant('gom.offers.validation_end_date_after_start'));
      } else {
        this.errorMessage.set(this.translate.instant('gom.offers.validation_error'));
      }
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    const offerId = this.editOfferId();
    if (offerId) {
      const request = this.buildUpdateRequest();
      this.offerService.updateOffer(offerId, request).subscribe({
        next: () => {
          this.toast.success(this.translate.instant('gom.offers.updated_success'));
          this.loading.set(false);
          this.router.navigate(['/saas-admin/offers']);
        },
        error: (error) => {
          console.error('Error updating offer:', error);
          this.errorMessage.set(this.translate.instant('gom.offers.error_update'));
          this.toast.error(this.translate.instant('gom.offers.error_update'));
          this.loading.set(false);
        },
      });
      return;
    }

    const request = this.buildCreateRequest();
    this.offerService.createOffer(request).subscribe({
      next: () => {
        this.toast.success(this.translate.instant('gom.offers.created_success'));
        this.loading.set(false);
        this.router.navigate(['/saas-admin/offers']);
      },
      error: (error) => {
        console.error('Error creating offer:', error);
        this.errorMessage.set(this.translate.instant('gom.offers.error_create'));
        this.toast.error(this.translate.instant('gom.offers.error_create'));
        this.loading.set(false);
      },
    });
  }

  private buildCreateRequest(): CreateOfferRequest {
    const basicInfo = this.basicInfoForm.value;
    const offerDetails = this.offerDetailsForm.value;
    const limits = this.limitsForm.value;

    const request: CreateOfferRequest = {
      name: basicInfo.name,
      description: basicInfo.description,
      type: basicInfo.type,
      triggerType: basicInfo.triggerType,
      priority: Number(basicInfo.priority || 100),
      validFrom: basicInfo.startDate || undefined,
      validTo: basicInfo.endDate || undefined,
      usageLimitTotal: limits.usageLimit || undefined,
      usageLimitPerCustomer: limits.perCustomerLimit || undefined,
      applicableCategoryIds: limits.applicableCategories?.length ? limits.applicableCategories : undefined,
      applicableVariantIds: limits.applicableProducts?.length ? limits.applicableProducts : undefined,
      excludedCategoryIds: limits.excludedCategories?.length ? limits.excludedCategories : undefined,
      excludedVariantIds: limits.excludedProducts?.length ? limits.excludedProducts : undefined,
    };

    if (this.isDiscountOfferType(basicInfo.type)) {
      this.applyDiscountDetails(request, offerDetails);
    } else if (basicInfo.type === OfferType.BUY_X_GET_Y) {
      this.applyB1g1Details(request, offerDetails, limits);
    }

    // Apply delivery-specific details if FREE_DELIVERY
    if (basicInfo.type === OfferType.FREE_DELIVERY) {
      this.applyDeliveryDetails(request, offerDetails, limits);
    }

    // Add coupon code if trigger type is COUPON
    if (basicInfo.triggerType === OfferTriggerType.COUPON && offerDetails.couponCode) {
      request.couponCode = offerDetails.couponCode.toUpperCase();
    }

    return request;
  }

  private isDiscountOfferType(type: OfferType): boolean {
    return [
      OfferType.ORDER_DISCOUNT,
      OfferType.PRODUCT_DISCOUNT,
      OfferType.CATEGORY_DISCOUNT,
      OfferType.PACK_DISCOUNT,
      OfferType.FREE_DELIVERY,
    ].includes(type);
  }

  private applyDiscountDetails(request: CreateOfferRequest, offerDetails: any): void {
    request.discountType = offerDetails.discountType;
    request.discountValue = Number.parseFloat(offerDetails.discountValue || '0');
    request.minOrderValue = offerDetails.minOrderValue ? Number.parseFloat(offerDetails.minOrderValue) : undefined;
    request.maxDiscountCap = offerDetails.maxDiscount ? Number.parseFloat(offerDetails.maxDiscount) : undefined;
  }

  private getB1g1RewardVariantIds(offerDetails: any, rewardMode: B1G1RewardMode): string[] | undefined {
    if (rewardMode !== B1G1RewardMode.DIFFERENT_ITEM) {
      return undefined;
    }
    const rewardVariantId = String(offerDetails.b1g1GetVariantId || '').trim();
    return rewardVariantId ? [rewardVariantId] : undefined;
  }

  private toMaxFreeQtyPerOrder(offerDetails: any): number {
    const maxRepeat = Math.max(0, Number.parseInt(offerDetails.b1g1MaxRepeat || '0', 10));
    const getQty = Math.max(0, Number.parseInt(offerDetails.b1g1GetCount || '0', 10));
    if (maxRepeat <= 0 || getQty <= 0) return 0;
    return maxRepeat * getQty;
  }

  private toB1g1MaxRepeat(maxFreeQtyPerOrder: number | null | undefined, getQty: number | null | undefined): number {
    const maxFreeQty = Math.max(0, Number(maxFreeQtyPerOrder || 0));
    const safeGetQty = Math.max(0, Number(getQty || 0));
    if (maxFreeQty <= 0 || safeGetQty <= 0) return 0;
    return Math.ceil(maxFreeQty / safeGetQty);
  }

  private applyB1g1Details(request: CreateOfferRequest, offerDetails: any, limits: any): void {
    request.buyQty = Number.parseInt(offerDetails.b1g1MinQty || '0', 10);
    request.getQty = Number.parseInt(offerDetails.b1g1GetCount || '0', 10);
    request.maxFreeQtyPerOrder = this.toMaxFreeQtyPerOrder(offerDetails);
    const rewardMode = (offerDetails.b1g1RewardType || 'SAME_ITEM') as B1G1RewardMode;
    request.rewardMode = rewardMode;
    request.rewardVariantIds = this.getB1g1RewardVariantIds(offerDetails, rewardMode);
    request.applicableCategoryIds = limits.applicableCategories?.length ? limits.applicableCategories : undefined;
    request.applicableVariantIds = limits.applicableProducts?.length ? limits.applicableProducts : undefined;
    request.repeatAllowed = true;
  }

  private applyDeliveryDetails(request: CreateOfferRequest, offerDetails: any, limits: any): void {
    request.deliveryMinCartValue = offerDetails.deliveryMinCartValue ? Number.parseFloat(offerDetails.deliveryMinCartValue) : undefined;
    request.deliveryMaxChargeCap = offerDetails.deliveryMaxChargeCap ? Number.parseFloat(offerDetails.deliveryMaxChargeCap) : undefined;
    request.deliveryMethods = offerDetails.deliveryMethods?.length ? offerDetails.deliveryMethods : undefined;
    
    // Handle pin code selection
    if (offerDetails.deliveryPinCodesMode === 'specific') {
      request.deliveryPinCodes = offerDetails.deliveryPinCodes?.length ? offerDetails.deliveryPinCodes : undefined;
    } else {
      // 'all' mode - pin codes will be determined by service areas, not explicitly set here
      request.deliveryPinCodes = undefined;
    }

    request.deliveryApplicableCategories = limits.deliveryApplicableCategories?.length ? limits.deliveryApplicableCategories : undefined;
    request.deliveryExcludedCategories = limits.deliveryExcludedCategories?.length ? limits.deliveryExcludedCategories : undefined;
    request.deliveryRepeatLimit = limits.deliveryRepeatLimit ? Number.parseInt(limits.deliveryRepeatLimit || '0', 10) : undefined;
  }

  private buildUpdateRequest(): UpdateOfferRequest {
    const create = this.buildCreateRequest();
    const update: UpdateOfferRequest = {
      name: create.name,
      description: create.description,
      priority: create.priority,
      validFrom: create.validFrom,
      validTo: create.validTo,
      discountType: create.discountType,
      discountValue: create.discountValue,
      maxDiscountCap: create.maxDiscountCap,
      minOrderValue: create.minOrderValue,
      applicableCategoryIds: create.applicableCategoryIds,
      applicableVariantIds: create.applicableVariantIds,
      excludedCategoryIds: create.excludedCategoryIds,
      excludedVariantIds: create.excludedVariantIds,
      applicablePackIds: create.applicablePackIds,
      buyQty: create.buyQty,
      getQty: create.getQty,
      rewardMode: create.rewardMode,
      rewardVariantIds: create.rewardVariantIds,
      maxFreeQtyPerOrder: create.maxFreeQtyPerOrder,
      repeatAllowed: create.repeatAllowed,
      usageLimitTotal: create.usageLimitTotal,
      usageLimitPerCustomer: create.usageLimitPerCustomer,
      allowCouponWithLoyalty: create.allowCouponWithLoyalty,
      loyaltyPointsPerUnit: create.loyaltyPointsPerUnit,
      loyaltyMaxEarnPoints: create.loyaltyMaxEarnPoints,
      loyaltyMinPointsToRedeem: create.loyaltyMinPointsToRedeem,
      loyaltyPointRedemptionValue: create.loyaltyPointRedemptionValue,
      // Delivery fields
      deliveryMinCartValue: create.deliveryMinCartValue,
      deliveryMaxChargeCap: create.deliveryMaxChargeCap,
      deliveryMethods: create.deliveryMethods,
      deliveryPinCodes: create.deliveryPinCodes,
      deliveryApplicableCategories: create.deliveryApplicableCategories,
      deliveryExcludedCategories: create.deliveryExcludedCategories,
      deliveryRepeatLimit: create.deliveryRepeatLimit,
    };

    return update;
  }

  private loadOffer(offerId: string): void {
    this.loading.set(true);
    this.offerService.getOffer(offerId).subscribe({
      next: (offer) => {
        this.patchFormsForEdit(offer);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set(this.translate.instant('gom.offers.error_load'));
        this.loading.set(false);
      },
    });
  }

  private patchFormsForEdit(offer: Offer): void {
    this.basicInfoForm.patchValue({
      name: offer.name,
      description: offer.description || '',
      type: offer.type,
      triggerType: offer.triggerType,
      priority: offer.priority,
      startDate: offer.validFrom ? this.toDateInputValue(offer.validFrom) : '',
      endDate: offer.validTo ? this.toDateInputValue(offer.validTo) : '',
    });

    this.offerDetailsForm.patchValue({
      discountType: offer.discountType,
      discountValue: offer.discountValue,
      minOrderValue: offer.minOrderValue,
      maxDiscount: offer.maxDiscountCap,
      b1g1MinQty: offer.buyQty,
      b1g1GetCount: offer.getQty,
      b1g1MaxRepeat: this.toB1g1MaxRepeat(offer.maxFreeQtyPerOrder, offer.getQty),
      b1g1RewardType: offer.rewardMode || B1G1RewardMode.SAME_ITEM,
      b1g1GetVariantId: Array.isArray(offer.rewardVariantIds) && offer.rewardVariantIds.length
        ? String(offer.rewardVariantIds[0])
        : '',
      // Delivery fields
      deliveryMinCartValue: offer.deliveryMinCartValue,
      deliveryMaxChargeCap: offer.deliveryMaxChargeCap,
      deliveryMethods: offer.deliveryMethods || [],
      deliveryPinCodesMode: (this.showSpecificPinCodeOption() && offer.deliveryPinCodes && offer.deliveryPinCodes.length > 0) ? 'specific' : 'all',
      deliveryPinCodes: offer.deliveryPinCodes || [],
      // Loyalty fields
      loyaltyPointsPerUnit: offer.loyaltyPointsPerUnit,
      loyaltyMaxEarnPoints: offer.loyaltyMaxEarnPoints,
      loyaltyMinPointsToRedeem: offer.loyaltyMinPointsToRedeem,
      loyaltyPointRedemptionValue: offer.loyaltyPointRedemptionValue,
      couponCode: offer.coupon?.code || '',
    });

    this.limitsForm.patchValue({
      usageLimit: offer.usageLimitTotal,
      perCustomerLimit: offer.usageLimitPerCustomer,
      deliveryRepeatLimit: offer.deliveryRepeatLimit,
      applicableCategories: offer.applicableCategoryIds || [],
      applicableProducts: offer.applicableVariantIds || [],
      excludedCategories: offer.excludedCategoryIds || [],
      excludedProducts: offer.excludedVariantIds || [],
      deliveryApplicableCategories: offer.deliveryApplicableCategories || [],
      deliveryExcludedCategories: offer.deliveryExcludedCategories || [],
    });

    this.applyDeliveryPinCodeModeDefaults();
  }

  private toDateInputValue(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    return this.toLocalDateTimeInputValue(date);
  }

  cancel(): void {
    this.router.navigate(['/saas-admin/offers']);
  }
}
