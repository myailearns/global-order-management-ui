import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { catchError, debounceTime, distinctUntilChanged, forkJoin, of, startWith, switchMap } from 'rxjs';

import {
  FormControlsModule,
  GomButtonComponent,
  GomSelectOption,
} from '../../../shared/components/form-controls';
import {
  GomButtonContentMode,
  getButtonContentMode,
  showButtonIcon,
  showButtonText,
} from '../../../shared/components/config';
import { GomTableColumn, GomTableComponent, GomTableRow } from '../../../shared/components/table';
import { GomConfirmationModalComponent, GomModalComponent } from '../../../shared/components/modal';
import { GomAlertToastService } from '../../../shared/components/alert';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { Group, Unit, Variant, VariantPricePreview, VariantsService } from './variants.service';

interface VariantRow extends GomTableRow {
  _id: string;
  name: string;
  itemType: string;
  quantity: string;
  convertedQuantity: string;
  pricingMode: string;
  basePrice: string;
  additionalPrice: string;
  finalPrice: string;
  discount: string;
  updatedAt: string;
  actions: string;
}

@Component({
  selector: 'gom-variants',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormControlsModule,
    GomButtonComponent,
    GomTableComponent,
    GomModalComponent,
    GomConfirmationModalComponent,
  ],
  templateUrl: './variants.component.html',
  styleUrl: './variants.component.scss',
})
export class VariantsComponent implements OnInit {
  private readonly service = inject(VariantsService);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(GomAlertToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly authSession = inject(AuthSessionService);

  readonly loading = signal(false);
  readonly canWrite = computed(() => this.authSession.canWrite('product'));
  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly groups = signal<Group[]>([]);
  readonly units = signal<Unit[]>([]);
  readonly variants = signal<Variant[]>([]);
  readonly selectedGroupId = signal('');

  readonly formOpen = signal(false);
  readonly deleteConfirmOpen = signal(false);
  readonly editingVariantId = signal<string | null>(null);
  readonly deletingVariantId = signal<string | null>(null);
  readonly submitMode: GomButtonContentMode = getButtonContentMode('primary-action');
  readonly cancelMode: GomButtonContentMode = getButtonContentMode('dismiss');

  private requestedGroupId = '';

  readonly filtersForm = this.fb.group({
    groupId: ['', [Validators.required]],
  });

  readonly variantForm = this.fb.group({
    quantity: [null as number | null, [Validators.required, Validators.min(0.000001)]],
    createAsPack: [false],
    packCount: [1, [Validators.min(1)]],
    unitId: ['', [Validators.required]],
    pricingMode: ['FORMULA' as 'FORMULA' | 'OVERRIDE', [Validators.required]],
    additionalPrice: [0, [Validators.min(0)]],
    additionalPriceReason: [''],
    discountType: ['PERCENT' as 'PERCENT' | 'AMOUNT'],
    discountValue: [0],
    anchorDiscountType: ['PERCENT' as 'PERCENT' | 'AMOUNT'],
    anchorDiscountValue: [0],
    reason: [''],
  });

  private readonly currentBasePrice = signal<VariantPricePreview | null>(null);

  private readonly variantFormValue = toSignal(
    this.variantForm.valueChanges.pipe(startWith(this.variantForm.getRawValue())),
    { initialValue: this.variantForm.getRawValue() }
  );

  readonly previewFinalPrice = computed<string>(() => {
    const prices = this.previewPriceNumbers();
    if (!Number.isFinite(prices.selling)) {
      return '-';
    }

    return this.formatCurrency(prices.selling);
  });

  readonly previewFinalAnchorPrice = computed<string>(() => {
    const prices = this.previewPriceNumbers();
    if (!Number.isFinite(prices.anchor)) {
      return '-';
    }

    return this.formatCurrency(prices.anchor);
  });

  readonly previewBasePrice = computed<string>(() => {
    const basePrice = this.currentBasePrice();
    if (!basePrice) {
      return '-';
    }

    return this.formatCurrency(basePrice.sellingPrice);
  });

  readonly previewAdditionalPrice = computed<string>(() => {
    const formValue = this.variantFormValue();
    const additionalPrice = this.getTotalAdditionalPrice(formValue);

    if (!Number.isFinite(additionalPrice) || additionalPrice < 0) {
      return '-';
    }

    return this.formatCurrency(additionalPrice);
  });

  readonly hasPricePreview = computed<boolean>(() => this.currentBasePrice() !== null);

  readonly pricingModeDescription = computed<string>(() => {
    const mode = this.variantFormValue().pricingMode || 'FORMULA';
    return mode === 'OVERRIDE'
      ? 'Apply a custom discount on top of the group formula price for this variant only.'
      : 'Price is automatically calculated from the group formula based on weight and unit conversion.';
  });

  readonly hasAdditionalCharge = computed<boolean>(() => {
    const val = this.getTotalAdditionalPrice(this.variantFormValue());
    return Number.isFinite(val) && val > 0;
  });

  readonly showPackFields = computed<boolean>(() => !!this.variantFormValue().createAsPack);

  readonly totalInputWeight = computed<number>(() => {
    const value = this.getEffectiveQuantity(this.variantFormValue());
    return Number.isFinite(value) ? value : Number.NaN;
  });

  readonly totalWeightSummary = computed<string>(() => {
    const formValue = this.variantFormValue();
    if (!formValue.createAsPack) {
      return '';
    }

    const weightPerPack = Number(formValue.quantity || 0);
    const packCount = Number(formValue.packCount || 0);
    const totalWeight = this.totalInputWeight();
    const symbol = this.getUnitSymbol(formValue.unitId || '');

    if (!Number.isFinite(weightPerPack) || weightPerPack <= 0 || !Number.isFinite(packCount) || packCount < 1) {
      return 'Enter weight per pack and number of packs to see total weight.';
    }

    if (!Number.isFinite(totalWeight)) {
      return '';
    }

    return `Total weight = ${this.formatNumber(weightPerPack)} ${symbol} x ${this.formatNumber(packCount)} packs = ${this.formatNumber(totalWeight)} ${symbol}`.trim();
  });

  readonly priceImpact = computed(() => {
    const base = Number(this.currentBasePrice()?.sellingPrice);
    const final = Number(this.previewPriceNumbers().selling);
    const formValue = this.variantFormValue();
    const packCount = Math.max(1, Number(formValue.packCount || 1));

    if (!Number.isFinite(base) || !Number.isFinite(final)) {
      return {
        available: false,
        tone: 'neutral' as 'positive' | 'negative' | 'neutral',
        deltaTotalText: '-',
        deltaPercentText: '-',
        perPackText: '-',
        hasPackBreakdown: false,
      };
    }

    const deltaTotal = this.roundTo2(final - base);
    const deltaPercent = base > 0 ? this.roundTo2((deltaTotal / base) * 100) : 0;
    const deltaPerPack = formValue.createAsPack
      ? this.roundTo2(deltaTotal / packCount)
      : deltaTotal;

    let tone: 'positive' | 'negative' | 'neutral' = 'neutral';
    if (deltaTotal > 0) {
      tone = 'positive';
    } else if (deltaTotal < 0) {
      tone = 'negative';
    }

    return {
      available: true,
      tone,
      deltaTotalText: `${deltaTotal >= 0 ? '+' : ''}${this.formatCurrency(deltaTotal)}`,
      deltaPercentText: `${deltaPercent >= 0 ? '+' : ''}${this.formatNumber(deltaPercent)}%`,
      perPackText: `${deltaPerPack >= 0 ? '+' : ''}${this.formatCurrency(deltaPerPack)}`,
      hasPackBreakdown: !!formValue.createAsPack,
    };
  });

  readonly currencySymbol = 'Rs';

  private readonly previewPriceNumbers = computed(() => {
    const basePrice = this.currentBasePrice();
    if (!basePrice) {
      return { selling: Number.NaN, anchor: Number.NaN };
    }

    const formValue = this.variantFormValue();
    const pricingMode = formValue.pricingMode || 'FORMULA';
    const additionalPrice = this.getTotalAdditionalPrice(formValue);
    if (pricingMode !== 'OVERRIDE') {
      return {
        selling: this.roundTo2(basePrice.sellingPrice + additionalPrice),
        anchor: this.roundTo2(basePrice.anchorPrice + additionalPrice),
      };
    }

    const selling = this.applyDiscount(
      basePrice.sellingPrice,
      formValue.discountType || 'PERCENT',
      Number(formValue.discountValue || 0)
    );

    const anchor = this.applyDiscount(
      basePrice.anchorPrice,
      formValue.anchorDiscountType || 'PERCENT',
      Number(formValue.anchorDiscountValue || 0)
    );

    return {
      selling: this.roundTo2(selling + additionalPrice),
      anchor: this.roundTo2(anchor + additionalPrice),
    };
  });

  readonly columns: GomTableColumn<VariantRow>[] = [
    { key: 'name', header: 'Variant', sortable: true, filterable: true, width: '16rem' },
    { key: 'itemType', header: 'Item Type', sortable: true, width: '10rem' },
    { key: 'quantity', header: 'Weight', sortable: true, width: '9rem' },
    { key: 'convertedQuantity', header: 'Base Qty', sortable: true, width: '10rem' },
    { key: 'pricingMode', header: 'Pricing Mode', sortable: true, width: '10rem' },
    { key: 'basePrice', header: 'Base Price', sortable: true, width: '10rem' },
    { key: 'additionalPrice', header: 'Additional Charge', sortable: true, width: '11rem' },
    { key: 'finalPrice', header: 'Final Price', sortable: true, width: '10rem' },
    { key: 'discount', header: 'Discount', sortable: true, width: '10rem' },
    { key: 'updatedAt', header: 'Updated', sortable: true, width: '10rem' },
    {
      key: 'actions',
      header: 'Actions',
      width: '10rem',
      actionButtons: [
        { label: 'Edit', actionKey: 'edit', variant: 'secondary' },
        { label: 'Delete', actionKey: 'delete', variant: 'secondary' },
      ],
    },
  ];

  readonly groupOptions = computed<GomSelectOption[]>(() =>
    this.groups().map((item) => ({ value: item._id, label: item.name }))
  );

  readonly availableUnitOptions = computed<GomSelectOption[]>(() => {
    const selectedGroup = this.groups().find((item) => item._id === this.selectedGroupId());
    if (!selectedGroup) {
      return [];
    }

    const allowedIds = new Set([selectedGroup.baseUnitId, ...selectedGroup.allowedUnitIds].filter(Boolean));
    return this.units()
      .filter((unit) => allowedIds.has(unit._id))
      .map((unit) => ({ value: unit._id, label: `${unit.name} (${unit.symbol})` }));
  });

  readonly rows = computed<VariantRow[]>(() => {
    const unitById = new Map(this.units().map((item) => [item._id, item]));

    return this.variants().map((variant) => {
      const unit = unitById.get(variant.unitId);
      const symbol = unit?.symbol || '';

      return {
        _id: variant._id,
        name: variant.name,
        itemType: variant.itemType === 'PACK' ? 'Pack of Items' : 'Individual Item',
        quantity: `${this.formatNumber(variant.quantity)} ${symbol}`.trim(),
        convertedQuantity: this.formatNumber(variant.convertedQuantity),
        pricingMode: variant.pricingMode || 'FORMULA',
        basePrice: this.formatCurrency(variant.price.sellingPrice),
        additionalPrice: this.formatCurrency(Number(variant.additionalPrice || 0)),
        finalPrice: this.formatCurrency(variant.effectivePrice?.sellingPrice ?? variant.price.sellingPrice),
        discount: this.formatDiscount(variant),
        updatedAt: new Date(variant.updatedAt).toLocaleDateString(),
        actions: 'Actions',
      };
    });
  });

  ngOnInit(): void {
    this.requestedGroupId = this.route.snapshot.queryParamMap.get('groupId') || '';
    this.setupPricePreviewWatcher();
    this.loadInitialData();
  }

  private setupPricePreviewWatcher(): void {
    this.variantForm.valueChanges.pipe(
      startWith(this.variantForm.getRawValue()),
      debounceTime(250),
      switchMap((value) => {
        const groupId = this.selectedGroupId();
        const quantity = this.getEffectiveQuantity(value);
        const unitId = value.unitId || '';

        if (!groupId || !unitId || !Number.isFinite(quantity) || quantity <= 0) {
          return of(null);
        }

        return this.service.previewVariantPrice({ groupId, quantity, unitId }).pipe(
          switchMap((response) => of(response.data || null)),
          catchError(() => of(null))
        );
      }),
      distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b))
    ).subscribe((price) => {
      this.currentBasePrice.set(price);
    });
  }

  loadInitialData(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    forkJoin({
      groups: this.service.listGroups(),
      units: this.service.listUnits(),
    }).subscribe({
      next: ({ groups, units }) => {
        const activeGroups = (groups.data || []).filter((item) => item.status === 'ACTIVE');
        const activeUnits = (units.data || []).filter((item) => item.status === 'ACTIVE');

        this.groups.set(activeGroups);
        this.units.set(activeUnits);

        const selectedGroupId =
          activeGroups.find((item) => item._id === this.requestedGroupId)?._id
          || activeGroups[0]?._id
          || '';

        this.filtersForm.patchValue({ groupId: selectedGroupId });

        if (selectedGroupId) {
          this.onGroupChange(selectedGroupId);
        }

        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Failed to load variant setup data.');
        this.loading.set(false);
      },
    });
  }

  onGroupChange(groupId: string): void {
    this.selectedGroupId.set(groupId);
    this.filtersForm.patchValue({ groupId });

    if (!groupId) {
      this.variants.set([]);
      return;
    }

    this.loadVariants(groupId);
  }

  loadVariants(groupId: string): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.service.listVariants(groupId).subscribe({
      next: (response) => {
        this.variants.set(response.data || []);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Failed to load variants.');
        this.loading.set(false);
      },
    });
  }

  openCreateVariant(): void {
    if (!this.selectedGroupId()) {
      this.toast.warning('Please select a group first.');
      return;
    }

    this.editingVariantId.set(null);
    this.variantForm.reset({
      quantity: null,
      createAsPack: false,
      packCount: 1,
      unitId: this.availableUnitOptions()[0]?.value || '',
      pricingMode: 'FORMULA',
      additionalPrice: 0,
      additionalPriceReason: '',
      discountType: 'PERCENT',
      discountValue: 0,
      anchorDiscountType: 'PERCENT',
      anchorDiscountValue: 0,
      reason: '',
    });
    this.currentBasePrice.set(null);
    this.formOpen.set(true);
  }

  openEditVariant(variant: Variant): void {
    this.editingVariantId.set(variant._id);
    const isPackVariant = variant.itemType === 'PACK';

    this.variantForm.reset({
      quantity: variant.quantity,
      createAsPack: isPackVariant,
      packCount: 1,
      unitId: variant.unitId,
      pricingMode: variant.pricingMode || 'FORMULA',
      additionalPrice: Number(variant.additionalPrice || 0),
      additionalPriceReason: variant.additionalPriceReason || '',
      discountType: variant.override?.discountType || 'PERCENT',
      discountValue: variant.override?.discountValue ?? 0,
      anchorDiscountType: 'AMOUNT',
      anchorDiscountValue: Math.max(
        0,
        (variant.price.anchorPrice || 0) - (variant.override?.finalAnchorPrice ?? (variant.price.anchorPrice || 0))
      ),
      reason: variant.override?.reason || '',
    });
    this.currentBasePrice.set({
      convertedQuantity: variant.convertedQuantity,
      sellingPrice: variant.price.sellingPrice,
      anchorPrice: variant.price.anchorPrice,
    });
    this.formOpen.set(true);
  }

  closeForm(): void {
    this.formOpen.set(false);
    this.editingVariantId.set(null);
    this.currentBasePrice.set(null);
  }

  saveVariant(): void {
    this.variantForm.markAllAsTouched();
    if (this.variantForm.invalid || !this.selectedGroupId()) {
      return;
    }

    const formValue = this.variantForm.getRawValue();
    const pricingMode = formValue.pricingMode || 'FORMULA';
    const previewPrices = this.previewPriceNumbers();
    const additionalPrice = this.getTotalAdditionalPrice(formValue);
    const effectiveQuantity = this.getEffectiveQuantity(formValue);

    if (!Number.isFinite(effectiveQuantity) || effectiveQuantity <= 0) {
      this.toast.error('Please enter a valid total weight greater than zero.');
      return;
    }

    if (formValue.createAsPack && Number(formValue.packCount || 0) < 1) {
      this.toast.error('Number of packs must be at least 1.');
      return;
    }

    if (!Number.isFinite(additionalPrice) || additionalPrice < 0) {
      this.toast.error('Additional price must be non-negative.');
      return;
    }

    const payloadPricing = pricingMode === 'OVERRIDE'
      ? {
          pricingMode,
          discountType: formValue.discountType || 'PERCENT',
          discountValue: Number(formValue.discountValue || 0),
          finalAnchorPrice: Number.isFinite(previewPrices.anchor)
            ? Number(previewPrices.anchor)
            : undefined,
          reason: formValue.reason?.trim() || undefined,
        }
      : { pricingMode: 'FORMULA' as const };

    if (pricingMode === 'OVERRIDE' && Number(payloadPricing.discountValue) < 0) {
      this.toast.error('Discount value must be non-negative.');
      return;
    }

    if (
      pricingMode === 'OVERRIDE'
      && payloadPricing.discountType === 'PERCENT'
      && Number(payloadPricing.discountValue) > 100
    ) {
      this.toast.error('Percentage discount cannot exceed 100.');
      return;
    }

    if (pricingMode === 'OVERRIDE' && Number(formValue.anchorDiscountValue || 0) < 0) {
      this.toast.error('Anchor discount value must be non-negative.');
      return;
    }

    if (
      pricingMode === 'OVERRIDE'
      && (formValue.anchorDiscountType || 'PERCENT') === 'PERCENT'
      && Number(formValue.anchorDiscountValue || 0) > 100
    ) {
      this.toast.error('Anchor percentage discount cannot exceed 100.');
      return;
    }

    this.saving.set(true);

    const editingId = this.editingVariantId();
    if (editingId) {
      this.service.updateVariant(editingId, {
        itemType: formValue.createAsPack ? 'PACK' : 'INDIVIDUAL',
        quantity: effectiveQuantity,
        unitId: formValue.unitId || '',
        additionalPrice,
        additionalPriceReason: formValue.additionalPriceReason?.trim() || undefined,
        ...payloadPricing,
      }).subscribe({
        next: () => {
          this.toast.success('Variant updated successfully.');
          this.closeForm();
          this.loadVariants(this.selectedGroupId());
          this.saving.set(false);
        },
        error: (error) => {
          this.toast.error(this.extractApiMessage(error) || 'Failed to update variant.');
          this.saving.set(false);
        },
      });

      return;
    }

    this.service.createVariants({
      groupId: this.selectedGroupId(),
      variants: [
        {
          itemType: formValue.createAsPack ? 'PACK' : 'INDIVIDUAL',
          quantity: effectiveQuantity,
          unitId: formValue.unitId || '',
          additionalPrice,
          additionalPriceReason: formValue.additionalPriceReason?.trim() || undefined,
          ...payloadPricing,
        },
      ],
    }).subscribe({
      next: () => {
        this.toast.success('Variant created successfully.');
        this.closeForm();
        this.loadVariants(this.selectedGroupId());
        this.saving.set(false);
      },
      error: (error) => {
        this.toast.error(this.extractApiMessage(error) || 'Failed to create variant.');
        this.saving.set(false);
      },
    });
  }

  onRowAction(event: { actionKey: string; row: GomTableRow }): void {
    if (!this.canWrite()) {
      return;
    }
    const id = typeof event.row['_id'] === 'string' ? event.row['_id'] : '';
    const variant = this.variants().find((item) => item._id === id);
    if (!variant) {
      return;
    }

    if (event.actionKey === 'edit') {
      this.openEditVariant(variant);
      return;
    }

    if (event.actionKey === 'delete') {
      this.deletingVariantId.set(variant._id);
      this.deleteConfirmOpen.set(true);
    }
  }

  cancelDelete(): void {
    this.deleteConfirmOpen.set(false);
    this.deletingVariantId.set(null);
  }

  confirmDelete(): void {
    const id = this.deletingVariantId();
    if (!id) {
      return;
    }

    this.saving.set(true);
    this.deleteConfirmOpen.set(false);

    this.service.deleteVariant(id).subscribe({
      next: () => {
        this.toast.success('Variant deleted successfully.');
        this.deletingVariantId.set(null);
        this.loadVariants(this.selectedGroupId());
        this.saving.set(false);
      },
      error: (error) => {
        this.toast.error(this.extractApiMessage(error) || 'Failed to delete variant.');
        this.saving.set(false);
      },
    });
  }

  getDeleteMessage(): string {
    return 'Are you sure you want to delete this variant?';
  }

  private formatNumber(value: number): string {
    return Number.isFinite(value)
      ? value.toLocaleString(undefined, { maximumFractionDigits: 4 })
      : '-';
  }

  private formatCurrency(value: number): string {
    return Number.isFinite(value)
      ? value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : '-';
  }

  isOverrideMode(): boolean {
    return this.variantForm.controls.pricingMode.value === 'OVERRIDE';
  }

  isSaveDisabled(): boolean {
    if (this.saving() || this.variantForm.invalid || !this.selectedGroupId()) {
      return true;
    }

    const formValue = this.variantForm.getRawValue();
    const additionalPrice = this.getTotalAdditionalPrice(formValue);
    const effectiveQuantity = this.getEffectiveQuantity(formValue);

    if (!Number.isFinite(effectiveQuantity) || effectiveQuantity <= 0) {
      return true;
    }

    if (formValue.createAsPack && Number(formValue.packCount || 0) < 1) {
      return true;
    }

    if (!Number.isFinite(additionalPrice) || additionalPrice < 0) {
      return true;
    }

    if ((formValue.pricingMode || 'FORMULA') !== 'OVERRIDE') {
      return false;
    }

    const discountValue = Number(formValue.discountValue || 0);
    const anchorDiscountValue = Number(formValue.anchorDiscountValue || 0);

    if (discountValue < 0 || anchorDiscountValue < 0) {
      return true;
    }

    if ((formValue.discountType || 'PERCENT') === 'PERCENT' && discountValue > 100) {
      return true;
    }

    if ((formValue.anchorDiscountType || 'PERCENT') === 'PERCENT' && anchorDiscountValue > 100) {
      return true;
    }

    return false;
  }

  shouldShowIcon(mode: GomButtonContentMode): boolean {
    return showButtonIcon(mode);
  }

  shouldShowText(mode: GomButtonContentMode): boolean {
    return showButtonText(mode);
  }

  private applyDiscount(base: number, type: 'PERCENT' | 'AMOUNT', value: number): number {
    const safeValue = Math.max(0, Number(value || 0));
    const discounted = type === 'PERCENT'
      ? base * (1 - Math.min(safeValue, 100) / 100)
      : base - safeValue;

    return Number(Math.max(0, discounted).toFixed(2));
  }

  private roundTo2(value: number): number {
    return Number(Number(value || 0).toFixed(2));
  }

  private getEffectiveQuantity(formValue: {
    quantity?: number | null;
    createAsPack?: boolean | null;
    packCount?: number | null;
  }): number {
    const quantity = Number(formValue.quantity || 0);
    const createAsPack = !!formValue.createAsPack;
    const packCount = Number(formValue.packCount || 0);

    if (!Number.isFinite(quantity) || quantity <= 0) {
      return Number.NaN;
    }

    if (!createAsPack) {
      return quantity;
    }

    if (!Number.isFinite(packCount) || packCount < 1) {
      return Number.NaN;
    }

    return Number((quantity * packCount).toFixed(6));
  }

  private getTotalAdditionalPrice(formValue: {
    additionalPrice?: number | null;
    createAsPack?: boolean | null;
    packCount?: number | null;
  }): number {
    const additional = Number(formValue.additionalPrice || 0);
    const createAsPack = !!formValue.createAsPack;
    const packCount = Math.max(1, Number(formValue.packCount || 1));

    if (!Number.isFinite(additional) || additional < 0) {
      return Number.NaN;
    }

    if (!createAsPack) {
      return additional;
    }

    return this.roundTo2(additional * packCount);
  }

  private getUnitSymbol(unitId: string): string {
    const unit = this.units().find((item) => item._id === unitId);
    return unit?.symbol || '';
  }

  private formatDiscount(variant: Variant): string {
    if ((variant.pricingMode || 'FORMULA') !== 'OVERRIDE' || !variant.override) {
      return '-';
    }

    if (variant.override.discountType === 'PERCENT') {
      return `${this.formatNumber(variant.override.discountValue)}%`;
    }

    return this.formatCurrency(variant.override.discountValue);
  }

  private extractApiMessage(error: unknown): string {
    const maybeMessage = (error as { error?: { message?: string } })?.error?.message;
    return typeof maybeMessage === 'string' ? maybeMessage : '';
  }
}
