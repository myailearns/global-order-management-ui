import { CommonModule } from '@angular/common';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { catchError, debounceTime, distinctUntilChanged, map, of, switchMap, throttleTime } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

import { GomAlertToastService } from '@gomlibs/ui';
import { GomButtonContentMode, getButtonContentMode, showButtonIcon, showButtonText } from '@gomlibs/ui';
import { FormControlsModule, GomButtonComponent, GomSelectOption } from '@gomlibs/ui';
import { GomTabContentComponent, GomTabsComponent, TabItem } from '@gomlibs/ui';
import {
  Customer,
  Group,
  OrdersService,
  PincodeFallbackSuggestion,
  StockCheckItem,
  TaxProfile,
  TenantDeliveryPincodeConfig,
  Variant,
} from '../orders/orders.service';

interface BillingLine {
  index: number;
  variantName: string;
  quantity: number;
  unitPrice: number;
  anchorPrice: number;
  discountPerLine: number;
  taxAmount: number;
  lineTotal: number;
  taxLabel: string;
}

@Component({
  selector: 'gom-create-order',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule, FormControlsModule, GomButtonComponent, GomTabsComponent, GomTabContentComponent],
  templateUrl: './create-order.component.html',
  styleUrl: './create-order.component.scss',
})
export class CreateOrderComponent implements OnInit {
  private static readonly PHONE_LOOKUP_MIN_CHARS = 3;

  private readonly service = inject(OrdersService);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(GomAlertToastService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly translate = inject(TranslateService);

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly variants = signal<Variant[]>([]);
  readonly groups = signal<Group[]>([]);
  readonly taxProfiles = signal<TaxProfile[]>([]);

  readonly resolvedCustomer = signal<{ _id: string; name: string; phone: string } | null>(null);
  readonly customerMatches = signal<Customer[]>([]);
  readonly customerLookupLoading = signal(false);
  readonly customerLookupError = signal(false);
  readonly customerLookupTouched = signal(false);
  readonly stockByRow = signal<Record<number, StockCheckItem>>({});
  readonly stockCheckLoading = signal(false);
  readonly addressOptions = signal<GomSelectOption[]>([]);
  readonly currentStep = signal(1);
  readonly quickAddVariantIds = signal<string[]>([]);
  readonly totalSteps = 4;
  readonly itemValuesRevision = signal(0);
  readonly pricingRevision = signal(0);
  readonly deliveryPincodeConfig = signal<TenantDeliveryPincodeConfig>({
    enabled: false,
    serviceablePincodes: [],
    nonServiceableSuggestion: 'CALL_COURIER',
  });

  readonly submitMode: GomButtonContentMode = getButtonContentMode('primary-action');
  readonly cancelMode: GomButtonContentMode = getButtonContentMode('dismiss');
  readonly secondaryMode: GomButtonContentMode = getButtonContentMode('secondary-action');

  readonly form = this.fb.group({
    phone: ['', [Validators.required, Validators.minLength(10)]],
    customerName: ['', [Validators.required, Validators.minLength(2)]],
    orderType: ['WALK_IN_INSTANT', [Validators.required]],
    intakeChannel: ['SHOP_COUNTER', [Validators.required]],
    deliveryType: ['PICKUP', [Validators.required]],
    paymentMode: ['CASH', [Validators.required]],
    paymentCollectionStage: ['AT_ORDER', [Validators.required]],
    deliveryAddressText: [''],
    deliveryPostalCode: [''],
    deliveryContactName: [''],
    deliveryContactPhone: [''],
    preferredDeliveryTime: [''],
    deliveryLocationText: [''],
    deliveryGeoLat: [''],
    deliveryGeoLng: [''],
    riderName: [''],
    riderPhone: [''],
    deliveryCharge: [0, [Validators.min(0)]],
    notes: [''],
    items: this.fb.array([this.createItemRow()]),
  });

  readonly variantOptions = computed<GomSelectOption[]>(() =>
    this.variants()
      .filter((item) => item.status === 'ACTIVE')
      .map((item) => ({ value: item._id, label: item.name }))
  );

  readonly quickAddVariantOptions = computed<GomSelectOption[]>(() => {
    this.itemValuesRevision();
    const selectedVariantIds = new Set(
      this.items.controls
        .map((control) => String(control.get('variantId')?.value || ''))
        .filter(Boolean)
    );

    return this.variantOptions().filter((option) => !selectedVariantIds.has(option.value));
  });

  readonly billingLines = computed<BillingLine[]>(() => {
    this.itemValuesRevision();
    const variantsById = new Map(this.variants().map((item) => [item._id, item]));
    const groupsById = new Map(this.groups().map((item) => [item._id, item]));
    const taxesById = new Map(this.taxProfiles().map((item) => [item._id, item]));

    return this.items.controls.map((control, index) => {
      const variantId = String(control.get('variantId')?.value || '');
      const quantity = Number(control.get('quantity')?.value || 0);
      const variant = variantsById.get(variantId);
      const unitPrice = this.round2(Number(variant?.effectivePrice?.sellingPrice || variant?.price?.sellingPrice || 0));
      const anchorPrice = this.round2(Number(variant?.effectivePrice?.anchorPrice || variant?.price?.anchorPrice || unitPrice));
      const subTotal = this.round2(unitPrice * quantity);
      const discountPerLine = anchorPrice > unitPrice ? this.round2((anchorPrice - unitPrice) * quantity) : 0;

      const group = variant ? groupsById.get(variant.groupId) : null;
      const taxProfile = group?.taxProfileId ? taxesById.get(group.taxProfileId) : null;
      const effectiveTax = taxProfile?.status === 'ACTIVE'
        ? taxProfile
        : { _id: '', name: 'No Tax', taxMode: 'NO_TAX' as const, rate: 0, inclusive: false, status: 'ACTIVE' as const, countryCode: 'IN', hsnCode: '', effectiveFrom: '' };

      let taxAmount = 0;
      if (effectiveTax.taxMode === 'GST' && Number(effectiveTax.rate) > 0) {
        const rate = Number(effectiveTax.rate);
        if (effectiveTax.inclusive) {
          taxAmount = this.round2(subTotal - subTotal / (1 + rate / 100));
        } else {
          taxAmount = this.round2(subTotal * (rate / 100));
        }
      }

      const lineTotal = effectiveTax.inclusive ? subTotal : this.round2(subTotal + taxAmount);
      const taxLabel = effectiveTax.taxMode === 'GST' ? `${this.round2(effectiveTax.rate)}% GST` : 'No Tax';

      return {
        index,
        variantName: variant?.name || '-',
        quantity,
        unitPrice,
        anchorPrice,
        discountPerLine,
        taxAmount,
        lineTotal,
        taxLabel,
      };
    });
  });

  readonly subTotal = computed(() =>
    this.round2(this.billingLines().reduce((sum, item) => sum + this.round2(item.unitPrice * item.quantity), 0))
  );

  readonly taxTotal = computed(() =>
    this.round2(this.billingLines().reduce((sum, item) => sum + item.taxAmount, 0))
  );

  readonly grandTotal = computed(() =>
    this.round2(this.billingLines().reduce((sum, item) => sum + item.lineTotal, 0) + this.currentDeliveryCharge)
  );

  readonly totalSavings = computed(() =>
    this.round2(this.billingLines().reduce((sum, item) => sum + item.discountPerLine, 0))
  );

  readonly wizardTabs = computed<TabItem[]>(() => [
    { id: 1, label: 'orderEntry.tabs.customer' },
    { id: 2, label: 'orderEntry.tabs.items' },
    { id: 3, label: 'orderEntry.tabs.deliveryPlace' },
    { id: 4, label: 'orderEntry.tabs.pricing' },
  ]);

  get items(): FormArray {
    return this.form.controls.items;
  }

  get deliveryTypeOptions(): GomSelectOption[] {
    return [
      { value: 'PICKUP', label: 'PICKUP' },
      { value: 'DELIVERY', label: 'DELIVERY' },
    ];
  }

  get orderTypeOptions(): GomSelectOption[] {
    return [
      { value: 'WALK_IN_INSTANT', label: 'Walk-in Instant' },
      { value: 'CALL_PICKUP', label: 'Call — Pickup Later' },
      { value: 'CALL_DELIVERY', label: 'Call — Home Delivery' },
      { value: 'CALL_COURIER', label: 'Call — Courier / Transport' },
    ];
  }

  get paymentModeOptions(): GomSelectOption[] {
    return [
      { value: 'CASH', label: 'CASH' },
      { value: 'UPI_MANUAL', label: 'UPI_MANUAL' },
    ];
  }

  get paymentCollectionStageOptions(): GomSelectOption[] {
    return [
      { value: 'AT_ORDER', label: 'AT_ORDER' },
      { value: 'AT_FULFILLMENT', label: this.isDeliveryOrder ? 'AT_DELIVERY' : 'AT_PICKUP' },
    ];
  }

  get canSelectPaymentMode(): boolean {
    return String(this.form.controls.paymentCollectionStage.value || 'AT_ORDER') === 'AT_ORDER';
  }

  get intakeChannelOptions(): GomSelectOption[] {
    return [
      { value: 'SHOP_COUNTER', label: 'SHOP_COUNTER' },
      { value: 'PHONE_CALL', label: 'PHONE_CALL' },
      { value: 'WHATSAPP_DM', label: 'WHATSAPP_DM' },
      { value: 'INSTAGRAM_DM', label: 'INSTAGRAM_DM' },
      { value: 'SOCIAL_DM', label: 'SOCIAL_DM' },
      { value: 'ADMIN_WEB', label: 'ADMIN_WEB' },
      { value: 'CUSTOMER_APP', label: 'CUSTOMER_APP (Future)' },
    ];
  }

  get isDeliveryOrder(): boolean {
    return this.form.controls.deliveryType.value === 'DELIVERY';
  }

  get deliveryChargeValue(): number {
    return this.round2(Number(this.form.controls.deliveryCharge.value || 0));
  }

  get currentDeliveryCharge(): number {
    this.pricingRevision();
    return this.deliveryChargeValue;
  }

  ngOnInit(): void {
    this.loadLookups();
    this.loadTenantPincodeConfig();
    this.onOrderTypeChange(String(this.form.controls.orderType.value || 'WALK_IN_INSTANT'));
    this.onDeliveryTypeChange(String(this.form.controls.deliveryType.value || 'PICKUP'));
    this.syncPaymentModeState();

    this.form.controls.phone.valueChanges
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        map((value) => String(value || '').trim()),
        distinctUntilChanged(),
        debounceTime(300),
        throttleTime(500, undefined, { leading: true, trailing: true }),
        switchMap((phone) => {
          this.customerLookupTouched.set(Boolean(phone));
          this.customerLookupError.set(false);

          if (phone.length < CreateOrderComponent.PHONE_LOOKUP_MIN_CHARS) {
            this.customerMatches.set([]);
            this.customerLookupLoading.set(false);
            if (this.resolvedCustomer() && this.resolvedCustomer()?.phone !== phone) {
              this.clearResolvedCustomer();
            }
            return of(null);
          }

          this.customerLookupLoading.set(true);
          return this.service.searchCustomersByPhone(phone).pipe(
            catchError(() => {
              this.customerLookupError.set(true);
              return of(null);
            })
          );
        })
      )
      .subscribe((response) => {
        this.customerLookupLoading.set(false);
        const matches = response?.data || [];
        this.customerMatches.set(matches);

        const current = this.resolvedCustomer();
        if (current && !matches.some((item) => item._id === current._id)) {
          this.clearResolvedCustomer();
        }
      });

    this.items.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.itemValuesRevision.update((value) => value + 1);
    });

    this.items.valueChanges
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        debounceTime(350),
        map(() => this.items.controls.map((control) => ({
          variantId: String(control.get('variantId')?.value || ''),
          quantity: Number(control.get('quantity')?.value || 0),
        })).filter((item) => item.variantId && item.quantity > 0)),
        switchMap((items) => {
          if (!items.length) {
            this.stockByRow.set({});
            this.stockCheckLoading.set(false);
            return of(null);
          }

          this.stockCheckLoading.set(true);
          return this.service.checkStock({ items }).pipe(
            catchError(() => {
              this.stockByRow.set({});
              this.stockCheckLoading.set(false);
              return of(null);
            })
          );
        })
      )
      .subscribe((response) => {
        this.stockCheckLoading.set(false);
        if (!response?.data?.items?.length) {
          return;
        }

        const nextState: Record<number, StockCheckItem> = {};
        for (const item of response.data.items) {
          nextState[item.index] = item;
        }
        this.stockByRow.set(nextState);
      });

    this.form.controls.deliveryCharge.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.pricingRevision.update((value) => value + 1);
    });

    this.form.controls.paymentCollectionStage.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.syncPaymentModeState();
      });
  }

  loadLookups(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.service.loadCreateOrderLookups().subscribe({
      next: (result) => {
        this.variants.set(result.variants.data || []);
        this.groups.set(result.groups.data || []);
        this.taxProfiles.set(result.taxProfiles.data || []);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set(this.translate.instant('orderEntry.messages.loadFailed'));
        this.loading.set(false);
      },
    });
  }

  private loadTenantPincodeConfig(): void {
    this.service.getTenantConfig()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          const cfg = response.data?.deliveryPincodeConfig;
          this.deliveryPincodeConfig.set({
            enabled: Boolean(cfg?.enabled),
            serviceablePincodes: Array.isArray(cfg?.serviceablePincodes)
              ? cfg.serviceablePincodes.map((code) => String(code || '').trim()).filter(Boolean)
              : [],
            nonServiceableSuggestion: cfg?.nonServiceableSuggestion || 'CALL_COURIER',
          });
        },
        error: () => {
          this.deliveryPincodeConfig.set({
            enabled: false,
            serviceablePincodes: [],
            nonServiceableSuggestion: 'CALL_COURIER',
          });
        },
      });
  }

  get isNonServiceableDeliveryPincode(): boolean {
    if (!this.isDeliveryOrder) {
      return false;
    }

    const currentOrderType = String(this.form.controls.orderType.value || '').trim().toUpperCase();
    const configuredSuggestion = this.deliveryPincodeConfig().nonServiceableSuggestion;
    if (currentOrderType === configuredSuggestion) {
      return false;
    }

    const config = this.deliveryPincodeConfig();
    if (!config.enabled || !config.serviceablePincodes.length) {
      return false;
    }

    const pincode = String(this.form.controls.deliveryPostalCode.value || '').trim();
    if (!/^\d{6}$/.test(pincode)) {
      return false;
    }

    return !config.serviceablePincodes.includes(pincode);
  }

  get nonServiceablePincodeMessage(): string {
    if (!this.isNonServiceableDeliveryPincode) {
      return '';
    }

    const suggestion = this.deliveryPincodeConfig().nonServiceableSuggestion;
    const suggestionLabel = suggestion === 'CALL_PICKUP' ? 'Call Pickup' : 'Call Courier';
    return `This pincode is not marked serviceable for home delivery. Suggested fallback: ${suggestionLabel}.`;
  }

  applyPincodeFallback(orderType: PincodeFallbackSuggestion): void {
    const currentOrderType = String(this.form.controls.orderType.value || '').trim().toUpperCase();
    if (currentOrderType === orderType) {
      return;
    }

    this.form.controls.orderType.setValue(orderType);
    this.onOrderTypeChange(orderType);

    const label = orderType === 'CALL_COURIER' ? 'Call Courier' : 'Call Pickup';
    this.toast.success(`Switched order type to ${label}.`);
  }

  resolveCustomer(): void {
    const phone = String(this.form.controls.phone.value || '').trim();
    const customerName = String(this.form.controls.customerName.value || '').trim();

    if (!phone || phone.length < 10 || !customerName) {
      this.toast.warning(this.translate.instant('orderEntry.toast.enterCustomerFirst'));
      return;
    }

    this.service.resolveCustomer(phone, customerName).subscribe({
      next: (response) => {
        const customer = response.data.customer;
        this.setResolvedCustomer(customer);
        this.toast.success(
          response.data.created
            ? this.translate.instant('orderEntry.toast.customerCreated')
            : this.translate.instant('orderEntry.toast.customerResolved')
        );
      },
      error: () => {
        this.toast.error(this.translate.instant('orderEntry.toast.resolveFailed'));
      },
    });
  }

  selectCustomerMatch(customer: Customer): void {
    this.form.controls.phone.setValue(customer.phone);
    this.form.controls.customerName.setValue(customer.name);
    this.setResolvedCustomer(customer);
    this.toast.success(this.translate.instant('orderEntry.toast.customerAutoFilled'));
  }

  canShowCustomerMatches(): boolean {
    return this.customerLookupTouched() && (this.customerLookupLoading() || this.customerLookupError() || this.customerMatches().length > 0);
  }

  isResolveDisabled(): boolean {
    const resolved = this.resolvedCustomer();
    if (!resolved) {
      return false;
    }

    const phone = String(this.form.controls.phone.value || '').trim();
    const customerName = String(this.form.controls.customerName.value || '').trim().toLowerCase();
    return resolved.phone === phone && String(resolved.name || '').trim().toLowerCase() === customerName;
  }

  shouldShowNoMatchHint(): boolean {
    return this.customerLookupTouched()
      && !this.customerLookupLoading()
      && !this.customerLookupError()
      && this.customerMatches().length === 0
      && String(this.form.controls.phone.value || '').trim().length >= CreateOrderComponent.PHONE_LOOKUP_MIN_CHARS;
  }

  onDeliveryTypeChange(value: string): void {
    if (value === 'DELIVERY') {
      this.form.controls.deliveryAddressText.setValidators([Validators.required, Validators.minLength(5)]);
      this.form.controls.deliveryPostalCode.setValidators([Validators.required, Validators.pattern(/^\d{6}$/)]);
      this.form.controls.deliveryContactName.setValidators([Validators.required, Validators.minLength(2)]);
      this.form.controls.deliveryContactPhone.setValidators([Validators.required, Validators.minLength(10)]);
      this.form.controls.preferredDeliveryTime.clearValidators();
      this.form.controls.deliveryLocationText.clearValidators();
      this.form.controls.deliveryGeoLat.clearValidators();
      this.form.controls.deliveryGeoLng.clearValidators();
      this.form.controls.riderName.clearValidators();
      this.form.controls.riderPhone.clearValidators();
      this.form.controls.deliveryCharge.setValidators([Validators.required, Validators.min(0)]);
      this.form.controls.notes.clearValidators();
    } else {
      this.form.controls.deliveryAddressText.clearValidators();
      this.form.controls.deliveryAddressText.setValue('');
      this.form.controls.deliveryPostalCode.clearValidators();
      this.form.controls.deliveryPostalCode.setValue('');
      this.form.controls.deliveryContactName.clearValidators();
      this.form.controls.deliveryContactName.setValue('');
      this.form.controls.deliveryContactPhone.clearValidators();
      this.form.controls.deliveryContactPhone.setValue('');
      this.form.controls.preferredDeliveryTime.clearValidators();
      this.form.controls.preferredDeliveryTime.setValue('');
      this.form.controls.deliveryLocationText.clearValidators();
      this.form.controls.deliveryLocationText.setValue('');
      this.form.controls.deliveryGeoLat.clearValidators();
      this.form.controls.deliveryGeoLat.setValue('');
      this.form.controls.deliveryGeoLng.clearValidators();
      this.form.controls.deliveryGeoLng.setValue('');
      this.form.controls.riderName.clearValidators();
      this.form.controls.riderName.setValue('');
      this.form.controls.riderPhone.clearValidators();
      this.form.controls.riderPhone.setValue('');
      this.form.controls.deliveryCharge.setValidators([Validators.min(0)]);
      this.form.controls.deliveryCharge.setValue(0);
      this.form.controls.notes.clearValidators();
    }

    this.form.controls.deliveryAddressText.updateValueAndValidity();
    this.form.controls.deliveryPostalCode.updateValueAndValidity();
    this.form.controls.deliveryContactName.updateValueAndValidity();
    this.form.controls.deliveryContactPhone.updateValueAndValidity();
    this.form.controls.preferredDeliveryTime.updateValueAndValidity();
    this.form.controls.deliveryLocationText.updateValueAndValidity();
    this.form.controls.deliveryGeoLat.updateValueAndValidity();
    this.form.controls.deliveryGeoLng.updateValueAndValidity();
    this.form.controls.riderName.updateValueAndValidity();
    this.form.controls.riderPhone.updateValueAndValidity();
    this.form.controls.deliveryCharge.updateValueAndValidity();
    this.form.controls.notes.updateValueAndValidity();
  }

  onOrderTypeChange(value: string): void {
    if (value === 'WALK_IN_INSTANT') {
      this.form.controls.intakeChannel.setValue('SHOP_COUNTER');
      this.form.controls.deliveryType.setValue('PICKUP');
      this.form.controls.paymentCollectionStage.setValue('AT_ORDER');
      this.onDeliveryTypeChange('PICKUP');
      this.syncPaymentModeState();
      return;
    }

    if (value === 'CALL_PICKUP') {
      this.form.controls.intakeChannel.setValue('PHONE_CALL');
      this.form.controls.deliveryType.setValue('PICKUP');
      this.onDeliveryTypeChange('PICKUP');
      this.syncPaymentModeState();
      return;
    }

    // CALL_COURIER and CALL_DELIVERY both use DELIVERY type
    this.form.controls.intakeChannel.setValue('PHONE_CALL');
    this.form.controls.deliveryType.setValue('DELIVERY');
    this.onDeliveryTypeChange('DELIVERY');
    this.syncPaymentModeState();
  }

  onPaymentCollectionStageChange(value: string): void {
    this.syncPaymentModeState();
  }

  goToStep(step: number): void {
    if (step < 1 || step > this.totalSteps) {
      return;
    }
    this.currentStep.set(step);
  }

  selectStep(stepId: string | number): void {
    const step = typeof stepId === 'number' ? stepId : Number.parseInt(stepId, 10);
    const current = this.currentStep();

    if (!Number.isFinite(step) || step < 1 || step > this.totalSteps) {
      return;
    }

    if (step < current) {
      this.currentStep.set(step);
      return;
    }

    if (step > current) {
      for (let i = current; i < step; i += 1) {
        if (!this.isStepValid(i)) {
          this.touchStep(i);
          this.toast.warning(this.translate.instant('orderEntry.toast.completeStepBeforeNext'));
          return;
        }
      }
    }

    this.currentStep.set(step);
  }

  nextStep(): void {
    if (!this.isCurrentStepValid()) {
      this.touchStep(this.currentStep());
      this.toast.warning(this.translate.instant('orderEntry.toast.completeCurrentStep'));
      return;
    }
    this.currentStep.set(Math.min(this.totalSteps, this.currentStep() + 1));
  }

  prevStep(): void {
    this.currentStep.set(Math.max(1, this.currentStep() - 1));
  }

  addItemRow(): void {
    this.items.push(this.createItemRow());
    this.itemValuesRevision.update((value) => value + 1);
  }

  addSelectedVariants(): void {
    const ids = this.quickAddVariantIds();
    if (!ids.length) return;

    // If there's only one empty placeholder row, replace it
    if (this.items.length === 1 && !this.items.at(0).get('variantId')?.value) {
      this.items.removeAt(0);
    }

    const existingIndexByVariantId = new Map<string, number>();
    this.items.controls.forEach((control, index) => {
      const variantId = String(control.get('variantId')?.value || '');
      if (variantId) {
        existingIndexByVariantId.set(variantId, index);
      }
    });

    for (const id of ids) {
      const existingIndex = existingIndexByVariantId.get(id);
      if (existingIndex === undefined) {
        this.items.push(this.createItemRow(id));
        existingIndexByVariantId.set(id, this.items.length - 1);
        continue;
      }

      const quantityControl = this.items.at(existingIndex).get('quantity');
      const currentQty = Number(quantityControl?.value || 0);
      quantityControl?.setValue(Math.max(1, currentQty + 1));
    }

    this.quickAddVariantIds.set([]);
    this.itemValuesRevision.update((value) => value + 1);
  }

  removeItemRow(index: number): void {
    if (this.items.length <= 1) {
      return;
    }
    this.items.removeAt(index);
    this.itemValuesRevision.update((value) => value + 1);
  }

  variantControlAt(index: number): FormControl {
    return (this.items.at(index).get('variantId') as FormControl) || new FormControl('');
  }

  quantityControlAt(index: number): FormControl {
    return (this.items.at(index).get('quantity') as FormControl) || new FormControl(1);
  }

  placeOrder(): void {
    this.form.markAllAsTouched();
    if (!this.isCurrentStepValid() || !this.isStepValid(1) || !this.isStepValid(2) || !this.isStepValid(3)) {
      this.toast.warning(this.translate.instant('orderEntry.toast.completeAllSteps'));
      return;
    }

    if (!this.resolvedCustomer()) {
      this.toast.warning(this.translate.instant('orderEntry.toast.resolveCustomerBeforePlace'));
      return;
    }

    if (this.form.invalid || this.items.length === 0) {
      this.toast.warning(this.translate.instant('orderEntry.toast.completeOrderDetails'));
      return;
    }

    const raw = this.form.getRawValue();
    const customer = this.resolvedCustomer();
    if (!customer) {
      return;
    }

    const selectedOrderType = String(raw.orderType || 'WALK_IN_INSTANT');
    const effectiveDeliveryType: 'PICKUP' | 'DELIVERY' = ['CALL_DELIVERY', 'CALL_COURIER'].includes(selectedOrderType) ? 'DELIVERY' : 'PICKUP';

    const items = this.items.controls.map((control) => ({
      variantId: String(control.get('variantId')?.value || ''),
      quantity: Number(control.get('quantity')?.value || 0),
    })).filter((item) => item.variantId && item.quantity > 0);

    if (!items.length) {
      this.toast.warning(this.translate.instant('orderEntry.toast.addOneItem'));
      return;
    }

    const unavailableItems = Object.values(this.stockByRow()).filter((item) => !item.isAvailable);
    if (unavailableItems.length) {
      const names = unavailableItems.map((item) => item.variantName).join(', ');
      this.toast.warning(`${this.translate.instant('orderEntry.toast.stockNotAvailable')}: ${names}`);
      return;
    }

    this.saving.set(true);
    this.service.createDraft({
      customerId: customer._id,
      orderSource: this.resolveOrderSource(String(raw.intakeChannel || 'SHOP_COUNTER')),
      deliveryType: effectiveDeliveryType,
      orderType: selectedOrderType as 'WALK_IN_INSTANT' | 'CALL_PICKUP' | 'CALL_DELIVERY' | 'CALL_COURIER',
      deliveryAddressText: effectiveDeliveryType === 'DELIVERY'
        ? String(raw.deliveryAddressText || '').trim()
        : undefined,
      deliveryCharge: this.deliveryChargeValue,
      items,
      deliveryDetails: effectiveDeliveryType === 'DELIVERY'
        ? {
            deliveryPostalCode: String(raw.deliveryPostalCode || '').trim(),
            deliveryContactName: String(raw.deliveryContactName || '').trim(),
            deliveryContactPhone: String(raw.deliveryContactPhone || '').trim(),
            preferredDeliveryTime: this.normalizeDateTimeForApi(raw.preferredDeliveryTime),
            deliveryLocationText: String(raw.deliveryLocationText || '').trim(),
            deliveryGeoLat: Number(raw.deliveryGeoLat || 0),
            deliveryGeoLng: Number(raw.deliveryGeoLng || 0),
            provisionalRiderName: String(raw.riderName || '').trim(),
            provisionalRiderPhone: String(raw.riderPhone || '').trim(),
          }
        : undefined,
      notes: this.buildOrderNotes(),
    }).subscribe({
      next: (draftResponse) => {
        this.service.placeOrder(draftResponse.data.draftId, {
          paymentMode: (raw.paymentMode || 'CASH') as 'CASH' | 'UPI_MANUAL',
          paymentCollectionStage: (raw.paymentCollectionStage || 'AT_ORDER') as 'AT_ORDER' | 'AT_FULFILLMENT',
          paymentReceived: String(raw.paymentCollectionStage || 'AT_ORDER') === 'AT_ORDER',
        }).subscribe({
          next: (placeResponse) => {
            this.toast.success(`${this.translate.instant('orderEntry.toast.orderPlaced')}: ${placeResponse.data.orderNo}`);
            this.saving.set(false);
            this.router.navigate(['/orders/list']);
          },
          error: (error) => {
            const message = this.extractApiErrorMessage(error, this.translate.instant('orderEntry.toast.draftCreatedPlaceFailed'));
            this.toast.error(message);
            this.saving.set(false);
          },
        });
      },
      error: (error) => {
        const message = this.extractApiErrorMessage(error, this.translate.instant('orderEntry.toast.createDraftFailed'));
        this.toast.error(message);
        this.saving.set(false);
      },
    });
  }

  backToList(): void {
    this.router.navigate(['/orders/list']);
  }

  shouldShowIcon(mode: GomButtonContentMode): boolean {
    return showButtonIcon(mode);
  }

  shouldShowText(mode: GomButtonContentMode): boolean {
    return showButtonText(mode);
  }

  isPlaceDisabled(): boolean {
    return this.saving() || !this.resolvedCustomer() || !this.isStepValid(1) || !this.isStepValid(2) || !this.isStepValid(3);
  }

  isStepValid(step: number): boolean {
    if (step === 1) {
      const customerValid = this.form.controls.phone.valid && this.form.controls.customerName.valid;
      return customerValid && !!this.resolvedCustomer();
    }

    if (step === 2) {
      return this.items.length > 0 && this.items.controls.every((item) => item.valid);
    }

    if (step === 3) {
      const paymentModeValid = this.form.controls.paymentMode.disabled
        || this.form.controls.paymentMode.valid;

      if (
        !this.form.controls.orderType.valid
        || !this.form.controls.intakeChannel.valid
        || !this.form.controls.deliveryType.valid
        || !paymentModeValid
        || !this.form.controls.paymentCollectionStage.valid
      ) {
        return false;
      }

      if (!this.isDeliveryOrder) {
        return true;
      }

      return this.form.controls.deliveryAddressText.valid
        && this.form.controls.deliveryPostalCode.valid
        && this.form.controls.deliveryContactName.valid
        && this.form.controls.deliveryContactPhone.valid
        && this.form.controls.deliveryCharge.valid;
    }

    if (step === 4) {
      return true;
    }

    return false;
  }

  isCurrentStepValid(): boolean {
    return this.isStepValid(this.currentStep());
  }

  canProceedToNextStep(): boolean {
    return this.isCurrentStepValid();
  }

  getRequiredError(control: AbstractControl | null, messageKey = 'orderEntry.validation.fieldRequired'): string {
    if (!control || !control.touched || control.disabled || !control.invalid) {
      return '';
    }

    return this.translate.instant(messageKey);
  }

  getDeliveryPincodeError(): string {
    const control = this.form.controls.deliveryPostalCode;
    if (!control.touched || control.disabled || !control.invalid) {
      return '';
    }

    if (control.hasError('required')) {
      return this.translate.instant('orderEntry.validation.fieldRequired');
    }

    return this.translate.instant('orderEntry.validation.deliveryPincodeInvalid');
  }

  getStockInfoAt(index: number): StockCheckItem | null {
    return this.stockByRow()[index] || null;
  }

  private resolveOrderSource(intakeChannel: string): 'ADMIN_WEB' | 'CUSTOMER_WEB' | 'SOCIAL_DM' | 'SHOP_COUNTER' {
    if (intakeChannel === 'SHOP_COUNTER') {
      return 'SHOP_COUNTER';
    }

    if (['WHATSAPP_DM', 'INSTAGRAM_DM', 'SOCIAL_DM'].includes(intakeChannel)) {
      return 'SOCIAL_DM';
    }

    if (intakeChannel === 'CUSTOMER_APP') {
      return 'CUSTOMER_WEB';
    }

    return 'ADMIN_WEB';
  }

  private setResolvedCustomer(customer: { _id: string; name: string; phone: string }): void {
    this.resolvedCustomer.set(customer);
    this.customerMatches.set([]);
    this.service.listCustomerAddresses(customer._id).subscribe({
      next: (addressesResponse) => {
        const options = (addressesResponse.data || []).map((item) => ({
          value: item._id,
          label: `${item.label} - ${item.line1}`,
        }));
        this.addressOptions.set(options);
      },
      error: () => {
        this.addressOptions.set([]);
      },
    });
  }

  private clearResolvedCustomer(): void {
    this.resolvedCustomer.set(null);
    this.addressOptions.set([]);
  }

  private touchStep(step: number): void {
    if (step === 1) {
      this.form.controls.phone.markAsTouched();
      this.form.controls.customerName.markAsTouched();
      return;
    }

    if (step === 2) {
      this.items.markAllAsTouched();
      return;
    }

    if (step === 3) {
      this.form.controls.orderType.markAsTouched();
      this.form.controls.intakeChannel.markAsTouched();
      this.form.controls.deliveryType.markAsTouched();
      this.form.controls.paymentMode.markAsTouched();
      this.form.controls.paymentCollectionStage.markAsTouched();

      if (this.isDeliveryOrder) {
        this.form.controls.deliveryAddressText.markAsTouched();
        this.form.controls.deliveryPostalCode.markAsTouched();
        this.form.controls.deliveryContactName.markAsTouched();
        this.form.controls.deliveryContactPhone.markAsTouched();
        this.form.controls.preferredDeliveryTime.markAsTouched();
        this.form.controls.deliveryLocationText.markAsTouched();
        this.form.controls.deliveryGeoLat.markAsTouched();
        this.form.controls.deliveryGeoLng.markAsTouched();
        this.form.controls.riderName.markAsTouched();
        this.form.controls.riderPhone.markAsTouched();
        this.form.controls.deliveryCharge.markAsTouched();
        this.form.controls.notes.markAsTouched();
      }
    }
  }

  private buildOrderNotes(): string | undefined {
    const notes = String(this.form.controls.notes.value || '').trim();
    return notes || undefined;
  }

  private normalizeDateTimeForApi(value: unknown): string {
    const raw = String(value || '').trim();
    if (!raw) {
      return '';
    }
    const parsed = new Date(raw);
    return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : raw;
  }

  private extractApiErrorMessage(error: unknown, fallback: string): string {
    const httpError = error as HttpErrorResponse;
    const message = httpError?.error?.message;
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
    return fallback;
  }

  private createItemRow(variantId = ''): FormGroup {
    return this.fb.group({
      variantId: [variantId, [Validators.required]],
      quantity: [1, [Validators.required, Validators.min(1)]],
    });
  }

  printPricingPreview(): void {
    const currency = 'Rs';
    const customer = this.resolvedCustomer();
    const lines = this.billingLines().filter((l) => l.quantity > 0 && l.variantName !== '-');

    const itemRows = lines
      .map(
        (l) => `<tr>
        <td>${l.variantName}</td>
        <td>${l.anchorPrice > l.unitPrice ? currency + ' ' + l.anchorPrice : '&mdash;'}</td>
        <td>${currency} ${l.unitPrice}</td>
        <td>${l.quantity}</td>
        <td>${l.discountPerLine > 0 ? '<span class="discount">&minus;' + currency + ' ' + l.discountPerLine + '</span>' : '&mdash;'}</td>
        <td>${l.taxAmount > 0 ? currency + ' ' + l.taxAmount + '<br><small>' + l.taxLabel + '</small>' : '&mdash;'}</td>
        <td><strong>${currency} ${l.lineTotal}</strong></td>
      </tr>`
      )
      .join('');

    const summaryRows = [
      `<tr><td>Sub Total</td><td><strong>${currency} ${this.subTotal()}</strong></td></tr>`,
      this.taxTotal() > 0 ? `<tr><td>Tax Total</td><td><strong>${currency} ${this.taxTotal()}</strong></td></tr>` : '',
      this.deliveryChargeValue > 0 ? `<tr><td>Delivery Charge</td><td><strong>${currency} ${this.deliveryChargeValue}</strong></td></tr>` : '',
      this.totalSavings() > 0 ? `<tr class="savings"><td>Total Savings</td><td><strong>&minus;${currency} ${this.totalSavings()}</strong></td></tr>` : '',
      `<tr class="grand"><td><strong>Grand Total</strong></td><td><strong>${currency} ${this.grandTotal()}</strong></td></tr>`,
    ].join('');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Order Bill</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; padding: 2rem; color: #111; font-size: 14px; }
    h2 { margin-bottom: 0.25rem; font-size: 1.3rem; }
    .customer { margin-bottom: 1.5rem; color: #555; font-size: 0.9rem; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 1.5rem; }
    th { text-align: left; background: #f3f4f6; padding: 0.5rem 0.75rem; font-size: 0.8rem; }
    td { padding: 0.45rem 0.75rem; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
    small { color: #6b7280; font-size: 0.75rem; }
    .summary { max-width: 22rem; margin-left: auto; border: 1px solid #e5e7eb; border-radius: 0.5rem; overflow: hidden; }
    .summary td { border-bottom: 1px solid #f3f4f6; padding: 0.4rem 0.85rem; }
    .savings { background: #f0fdf4; color: #16a34a; }
    .savings strong { color: #16a34a; }
    .grand { background: #eff6ff; font-size: 1rem; border-top: 2px solid #e5e7eb; }
    .grand strong { color: #1d4ed8; }
    .discount { color: #16a34a; font-weight: 600; }
    @media print { body { padding: 0.5rem; } }
  </style>
</head>
<body>
  <h2>Order Bill</h2>
  ${customer ? '<p class="customer">' + customer.name + ' &middot; ' + customer.phone + '</p>' : ''}
  <table>
    <thead>
      <tr>
        <th>Item</th><th>MRP</th><th>Selling</th><th>Qty</th><th>Discount</th><th>Tax</th><th>Total</th>
      </tr>
    </thead>
    <tbody>${itemRows}</tbody>
  </table>
  <table class="summary">
    <tbody>${summaryRows}</tbody>
  </table>
</body>
</html>`;

    const win = window.open('', '_blank', 'width=860,height=640');
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      win.print();
    }
  }

  shareViaWhatsApp(): void {
    const currency = 'Rs';
    const customer = this.resolvedCustomer();
    const lines = this.billingLines().filter((l) => l.quantity > 0 && l.variantName !== '-');
    const formatAmount = (value: number): string => `${currency} ${this.round2(value).toLocaleString('en-IN')}`;
    const now = new Date();
    const dateText = now.toLocaleDateString('en-IN');
    const timeText = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

    const itemLines = lines.length
      ? lines
          .map((l, index) => {
            const detailRows = [
              `${index + 1}. ${l.variantName}`,
              `   MRP: ${formatAmount(l.anchorPrice)} | Selling: ${formatAmount(l.unitPrice)} | Qty: ${l.quantity}`,
            ];
            if (l.discountPerLine > 0) {
              detailRows.push(`   Discount: -${formatAmount(l.discountPerLine)}`);
            }
            if (l.taxAmount > 0) {
              detailRows.push(`   Tax: ${formatAmount(l.taxAmount)} (${l.taxLabel})`);
            }
            detailRows.push(`   Line Total: ${formatAmount(l.lineTotal)}`);
            return detailRows.join('\n');
          })
          .join('\n------------------------------\n')
      : 'No items added';

    const parts: string[] = [];
    parts.push(`*ORDER BILL*`);
    parts.push(`Date: ${dateText} ${timeText}`);
    if (customer) {
      parts.push(`Customer: ${customer.name} (${customer.phone})`);
    }
    parts.push('------------------------------');
    parts.push(itemLines);
    parts.push('------------------------------');
    parts.push('');
    parts.push(`Sub Total: ${formatAmount(this.subTotal())}`);
    if (this.taxTotal() > 0) {
      parts.push(`Tax Total: ${formatAmount(this.taxTotal())}`);
    }
    if (this.deliveryChargeValue > 0) {
      parts.push(`Delivery Charge: ${formatAmount(this.deliveryChargeValue)}`);
    }
    if (this.totalSavings() > 0) {
      parts.push(`Total Savings: -${formatAmount(this.totalSavings())}`);
    }
    parts.push(`*Grand Total: ${formatAmount(this.grandTotal())}*`);

    const text = encodeURIComponent(parts.join('\n'));
    window.location.href = `https://wa.me/?text=${text}`;
  }

  shareViaMail(): void {
    const currency = 'Rs';
    const customer = this.resolvedCustomer();
    const lines = this.billingLines()
      .filter((l) => l.quantity > 0 && l.variantName !== '-')
      .map((l) => {
        const discount = l.discountPerLine > 0 ? ` (save ${currency} ${l.discountPerLine})` : '';
        return `  • ${l.variantName} x${l.quantity} — ${currency} ${l.lineTotal}${discount}`;
      })
      .join('\n');

    const body: string[] = [];
    body.push('Order Summary');
    body.push('=============');
    if (customer) {
      body.push(`Customer: ${customer.name} (${customer.phone})`);
    }
    body.push('');
    body.push(lines);
    body.push('');
    if (this.taxTotal() > 0) body.push(`Tax: ${currency} ${this.taxTotal()}`);
    if (this.deliveryChargeValue > 0) body.push(`Delivery: ${currency} ${this.deliveryChargeValue}`);
    if (this.totalSavings() > 0) body.push(`You save: ${currency} ${this.totalSavings()}`);
    body.push(`Grand Total: ${currency} ${this.grandTotal()}`);

    const subject = encodeURIComponent('Your Order Summary');
    const bodyEncoded = encodeURIComponent(body.join('\n'));
    window.location.href = `mailto:?subject=${subject}&body=${bodyEncoded}`;
  }

  private round2(value: number): number {
    return Number(Number(value || 0).toFixed(2));
  }

  private syncPaymentModeState(): void {
    const control = this.form.controls.paymentMode;
    if (this.canSelectPaymentMode) {
      control.enable({ emitEvent: false });
      return;
    }

    control.disable({ emitEvent: false });
  }
}
