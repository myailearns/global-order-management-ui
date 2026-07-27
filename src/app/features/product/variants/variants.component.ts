import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { catchError, debounceTime, distinctUntilChanged, forkJoin, of, startWith, switchMap } from 'rxjs';

import {
  FormControlsModule,
  GomAccordionComponent,
  GomAlertToastService,
  GomButtonComponent,
  GomButtonContentMode,
  GomConfirmationModalComponent,
  GomModalComponent,
  GomSelectOption,
  GomTableColumn,
  GomTableComponent,
  GomTableQuery,
  GomTableRow,
  getButtonContentMode,
  showButtonIcon,
  showButtonText,
} from '@gomlibs/ui';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { MediaAssetService } from '../../saas-platform/media/media-asset.service';
import { GroupImage, GroupImageEntry } from '../../saas-platform/media/media-asset.model';
import { ImagePickerComponent, PickedImage } from '../../../shared/components/image-picker/image-picker.component';
import { DisableIfNoFeatureDirective } from '../../../shared/directives/disable-if-no-feature.directive';
import { PriceApprovalModalComponent } from '../pricing-approval/price-approval-modal.component';
import { ProductCollection, ProductCollectionsService } from '../product-collections/product-collections.service';
import {
  Group,
  PricingRefreshSuggestion,
  Unit,
  VariantCombinationItem,
  Variant,
  VariantPricePreview,
  VariantsService,
} from './variants.service';

interface VariantRow extends GomTableRow {
  id: string;
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

interface VariantDraftRow {
  rowId: string;
  form: any;
  mode: 'MANUAL' | 'AUTO';
  selected: boolean;
  quantity: number | null;
  unitId: string;
  itemType: 'INDIVIDUAL' | 'PACK';
  additionalPrice: number;
  displayName: string;
  optionSelections: Array<{
    key: string;
    label: string;
    value: string;
  }>;
  fieldOverrideEntries: Array<{
    id: string;
    key: string;
    value: string;
  }>;
  fieldOverrides: Record<string, number>;
  fieldOverridesJson: string;
  combinationKey?: string;
  preview: VariantPricePreview | null;
  error: string | null;
}

interface DraftBulkApplyFormValue {
  additionalPrice: number | null;
}

interface VariantCollectionMembership {
  collectionId: string;
  name: string;
  sourceLabel: 'DIRECT' | 'VIA_GROUP' | 'DIRECT + VIA_GROUP';
}

@Component({
  selector: 'gom-variants',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    FormControlsModule,
    DisableIfNoFeatureDirective,
    GomButtonComponent,
    GomTableComponent,
    GomModalComponent,
    GomConfirmationModalComponent,
    GomAccordionComponent,
    PriceApprovalModalComponent,
    ImagePickerComponent,
  ],
  templateUrl: './variants.component.html',
  styleUrl: './variants.component.scss',
})
export class VariantsComponent implements OnInit {
  private readonly service = inject(VariantsService);
  private readonly productCollectionsService = inject(ProductCollectionsService);
  private readonly mediaService = inject(MediaAssetService);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(GomAlertToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly authSession = inject(AuthSessionService);
  private readonly translate = inject(TranslateService);

  readonly loading = signal(false);
  readonly canCreateVariant = computed(() => this.authSession.hasFeature('variant.create'));
  readonly canUpdateVariant = computed(
    () => this.authSession.hasFeature('variant.edit')
      || this.authSession.hasFeature('variant.update')
  );
  readonly canDeleteVariant = computed(() => this.authSession.hasFeature('variant.delete'));
  readonly canManageProductCollections = computed(
    () => this.authSession.hasFeature('productCollection.list') && this.authSession.hasFeature('productCollection.assign')
  );
  readonly variantCreateLimit = computed(() => this.authSession.getFeatureConfigNumber('variant.create', 'max_count'));
  readonly variantCreateUsed = computed(() => this.variants().length);
  readonly variantCreateRemaining = computed(() => {
    const limit = this.variantCreateLimit();
    if (limit === null) {
      return null;
    }

    return Math.max(limit - this.variantCreateUsed(), 0);
  });
  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly totalVariants = signal(0);
  readonly variantTablePageIndex = signal(0);
  readonly variantTablePageSize = signal(50);
  readonly canLoadAllVariants = signal(false);
  readonly allVariantsLoaded = signal(false);
  readonly serverSidePaginationVariants = computed(() => this.totalVariants() > 500);
  readonly variantTableDataMode = computed<'client' | 'server'>(() => (this.serverSidePaginationVariants() && !this.allVariantsLoaded() ? 'server' : 'client'));

  readonly groups = signal<Group[]>([]);
  readonly units = signal<Unit[]>([]);
  readonly variants = signal<Variant[]>([]);
  readonly selectedGroupId = signal('');
  readonly pricingSuggestions = signal<PricingRefreshSuggestion[]>([]);
  readonly loadingPricingSuggestions = signal(false);
  readonly draftRows = signal<VariantDraftRow[]>([]);
  readonly bulkFieldOverrideEntries = signal<Array<{ id: string; key: string; value: string }>>([]);
  readonly bulkSaving = signal(false);
  readonly loadingDraftPreview = signal(false);
  readonly bulkPanelOpen = signal(false);

  readonly selectedGroup = computed(() => {
    const groupId = this.selectedGroupId();
    return this.groups().find((g) => g._id === groupId) || null;
  });

  readonly needsOptionSelections = computed(() => {
    const group = this.selectedGroup();
    const groupType = group?.groupType || 'MEASURED';
    return groupType === 'ATTRIBUTE' || groupType === 'HYBRID';
  });

  readonly showFieldOverrides = computed(() => {
    const groupType = this.selectedGroup()?.groupType || 'MEASURED';
    return groupType === 'ATTRIBUTE';
  });

  readonly baseCostFieldKey = computed(() => {
    const group = this.selectedGroup();
    const groupType = group?.groupType || 'MEASURED';
    if (groupType !== 'ATTRIBUTE') {
      return '';
    }

    const resolvedKeys = (group?.resolvedFields || [])
      .map((item) => String(item.key || '').trim())
      .filter((key) => !!key);

    if (!resolvedKeys.length) {
      return '';
    }

    const formula = String(group?.formula?.actualPrice || '').trim();
    const tokens = formula.match(/[A-Za-z_]\w*/g) || [];
    const skip = new Set(['actualPrice', 'sellingPrice', 'anchorPrice', 'quantity', 'weight', 'Math']);

    for (const token of tokens) {
      if (!skip.has(token) && resolvedKeys.includes(token)) {
        return token;
      }
    }

    return resolvedKeys.find((key) => ['buyPrice', 'buy_price', 'basePrice', 'costPrice'].includes(key)) || resolvedKeys[0] || '';
  });

  readonly showBaseCostColumn = computed(() => this.showFieldOverrides() && !!this.baseCostFieldKey());

  readonly showOptionsColumn = computed(() => {
    const groupType = this.selectedGroup()?.groupType || 'MEASURED';
    return groupType === 'ATTRIBUTE' || groupType === 'HYBRID';
  });

  readonly optionSelectionControls = signal<Record<string, string>>({});

  readonly hasPendingPricingSuggestions = computed(() => this.pricingSuggestions().length > 0);
  readonly suggestionWarningCount = computed(
    () => this.pricingSuggestions().filter((item) => !!item.marginImpact?.isBelowThreshold).length
  );

  readonly priceApprovalOpen = signal(false);
  readonly variantCollectionsModalOpen = signal(false);
  readonly loadingVariantCollections = signal(false);
  readonly currentVariantForCollections = signal<Variant | null>(null);
  readonly variantCollectionMemberships = signal<VariantCollectionMembership[]>([]);
  readonly availableProductCollections = signal<ProductCollection[]>([]);
  readonly formOpen = signal(false);
  readonly pickerOpen = signal(false);
  // Media state
  readonly groupImages = signal<GroupImage[]>([]);
  readonly variantImages = signal<GroupImage[]>([]);
  readonly existingVariantImageIds = computed(() => new Set(this.variantImages().map((img) => img.mediaAssetId._id)));
  readonly canUploadMedia = computed(() => this.authSession.hasFeature('media.upload'));
  readonly deleteConfirmOpen = signal(false);
  readonly editingVariantId = signal<string | null>(null);
  readonly deletingVariantId = signal<string | null>(null);
  readonly deletingVariantName = signal<string>('');
  readonly deletingVariantImpactCount = signal<number | null>(null);
  readonly submitMode: GomButtonContentMode = getButtonContentMode('primary-action');
  readonly cancelMode: GomButtonContentMode = getButtonContentMode('dismiss');
  readonly editingOriginalPricingMode = signal<'FORMULA' | 'OVERRIDE' | null>(null);

  private requestedGroupId = '';

  readonly filtersForm = this.fb.group({
    groupId: ['', [Validators.required]],
  });

  readonly variantForm = this.fb.group({
    name: ['', [Validators.required]],
    quantity: [null as number | null, [Validators.required, Validators.min(0.000001)]],
    createAsPack: [false],
    packCount: [1, [Validators.min(1)]],
    unitId: ['', [Validators.required]],
    pricingMode: ['FORMULA' as 'FORMULA' | 'OVERRIDE', [Validators.required]],
    fixedSellingPrice: [null as number | null],
    targetMarginPercent: [null as number | null],
    additionalPrice: [0, [Validators.min(0)]],
    additionalPriceReason: [''],
    discountType: ['PERCENT' as 'PERCENT' | 'AMOUNT'],
    discountValue: [0],
    anchorDiscountType: ['PERCENT' as 'PERCENT' | 'AMOUNT'],
    anchorDiscountValue: [0],
    reason: [''],
    fieldOverridesJson: [''],
    mrp: [null as number | null, [Validators.min(0)]],
  });

  readonly draftBulkApplyForm = this.fb.group({
    quantity: [null as number | null],
    baseCost: [null as number | null],
    additionalPrice: [null as number | null],
  });

  readonly variantCollectionForm = this.fb.group({
    collectionId: [''],
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
      ? 'Set a fixed override selling price or use discount-based override for this variant.'
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
      const mrpValue = Number(formValue.mrp);
      const hasExplicitMrp = Number.isFinite(mrpValue) && mrpValue > 0;
      return {
        selling: this.roundTo2(basePrice.sellingPrice + additionalPrice),
        anchor: hasExplicitMrp ? mrpValue : this.roundTo2(basePrice.anchorPrice + additionalPrice),
      };
    }

    const fixedSellingPrice = Number(formValue.fixedSellingPrice);
    if (Number.isFinite(fixedSellingPrice) && fixedSellingPrice >= 0) {
      return {
        selling: this.roundTo2(fixedSellingPrice),
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
        {
          label: () => this.canUpdateVariant() ? 'Edit' : 'No permission to edit variants',
          icon: 'ri-pencil-line',
          actionKey: 'edit',
          variant: 'secondary',
          disabled: () => !this.canUpdateVariant(),
        },
        {
          label: () => this.canManageProductCollections() ? 'Collections' : 'No permission for collections',
          icon: 'ri-folders-line',
          actionKey: 'collections',
          variant: 'secondary',
          disabled: () => !this.canManageProductCollections(),
        },
        {
          label: () => this.canDeleteVariant() ? 'Delete' : 'No permission to delete variants',
          icon: 'ri-delete-bin-line',
          actionKey: 'delete',
          variant: 'danger',
          disabled: () => !this.canDeleteVariant(),
        },
      ],
    },
  ];

  readonly groupOptions = computed<GomSelectOption[]>(() =>
    this.groups().map((item) => ({ value: item._id, label: item.name }))
  );

  readonly variantCollectionOptions = computed<GomSelectOption[]>(() =>
    this.availableProductCollections().map((item) => ({ value: item._id, label: item.name }))
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

      // Build variant display name: prefer variant.name, otherwise use option selections or price as identifier
      let displayName = String(variant.name || '').trim();
      if (!displayName) {
        // If no variant name, construct from option selections
        if (variant.optionSelections && variant.optionSelections.length > 0) {
          displayName = variant.optionSelections.map((opt) => opt.value).join(', ');
        } else {
          // Fallback to price if no options
          displayName = `Price: ${this.formatCurrency(variant.price.sellingPrice)}`;
        }
      }

      return {
        id: variant._id,
        _id: variant._id,
        name: displayName,
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

  readonly draftRowsPreview = computed(() => {
    const unitById = new Map(this.units().map((item) => [item._id, item]));
    return this.draftRows().map((row) => {
      const unitSymbol = unitById.get(row.unitId)?.symbol || '';
      const derivedSelling = Number(row.preview?.sellingPrice || 0) + Number(row.additionalPrice || 0);
      return {
        ...row,
        unitSymbol,
        optionsText: row.optionSelections.map((item) => `${item.label}: ${item.value}`).join(', '),
        derivedSelling,
      };
    });
  });

  readonly selectedDraftRowCount = computed(() => this.draftRows().filter((row) => row.selected).length);
  readonly draftRowsErrorCount = computed(() => this.draftRows().filter((row) => !!row.error).length);

  readonly defaultVariantName = computed<string>(() => {
    const group = this.selectedGroup();
    const groupName = group?.name || 'Variant';
    const groupType = group?.groupType || 'MEASURED';
    
    if (groupType === 'ATTRIBUTE' || groupType === 'HYBRID') {
      const selections = Object.values(this.optionSelectionControls());
      const optionPart = selections
        .map((value) => String(value || '').trim())
        .filter((value) => !!value)
        .map((value) => ` (${value})`)
        .join('');
      return `${groupName}${optionPart}`.trim();
    }

    const formValue = this.variantFormValue();
    const quantity = Number(formValue.quantity);
    const unit = this.units().find((u: Unit) => u._id === formValue.unitId);
    
    if (Number.isFinite(quantity) && unit) {
      return `${groupName} ${this.formatNumber(quantity)} ${unit.symbol}`.trim();
    }

    return groupName;
  });

  readonly variantFieldOverrides = computed<Record<string, number>>(() => {
    const json = String(this.variantFormValue().fieldOverridesJson || '').trim();
    if (!json) {
      return {};
    }

    try {
      const parsed = JSON.parse(json);
      return typeof parsed === 'object' && parsed !== null ? parsed : {};
    } catch {
      return {};
    }
  });

  readonly variantFieldOverrideEntries = computed<Array<{ id: string; key: string; value: string }>>(() => {
    const overrides = this.variantFieldOverrides();
    return Object.entries(overrides).map(([key, value]) => ({
      id: key,
      key,
      value: String(value),
    }));
  });

  readonly availableFieldOptions = computed<GomSelectOption[]>(() => {
    const group = this.selectedGroup();
    const resolvedKeys = (group?.resolvedFields || [])
      .map((item) => String(item.key || '').trim())
      .filter((key) => !!key);

    // Exclude base cost and any fields already in use
    const baseCostKey = this.baseCostFieldKey();
    const usedKeys = new Set([baseCostKey]);
    
    this.additionalFieldOverrides().forEach(entry => {
      usedKeys.add(entry.key);
    });

    return resolvedKeys
      .filter(key => !usedKeys.has(key))
      .map(key => ({ label: key, value: key }));
  });

  readonly baseCostValue = computed<string>(() => {
    const baseCostKey = this.baseCostFieldKey();
    if (!baseCostKey) {
      return '';
    }
    const overrides = this.variantFieldOverrides();
    return String(overrides[baseCostKey] || '');
  });

  readonly additionalFieldOverrides = computed<Array<{ id: string; key: string; value: string }>>(() => {
    const baseCostKey = this.baseCostFieldKey();
    const allOverrides = this.variantFieldOverrideEntries();
    return allOverrides.filter(entry => entry.key !== baseCostKey);
  });

  getFieldOptionsForEntry(currentKey: string): GomSelectOption[] {
    const group = this.selectedGroup();
    const resolvedKeys = (group?.resolvedFields || [])
      .map((item) => String(item.key || '').trim())
      .filter((key) => !!key);

    // Include current key + exclude base cost and other used keys
    const baseCostKey = this.baseCostFieldKey();
    const usedKeys = new Set([baseCostKey]);
    
    this.additionalFieldOverrides().forEach(entry => {
      if (entry.key !== currentKey) {
        usedKeys.add(entry.key);
      }
    });

    return resolvedKeys
      .filter(key => !usedKeys.has(key))
      .map(key => ({ label: key, value: key }));
  }

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

        const parsedOverrides = this.parseFieldOverridesJson(String(value.fieldOverridesJson || ''));
        let fieldOverrides: Record<string, number> | undefined;
        if (parsedOverrides.ok && Object.keys(parsedOverrides.value).length > 0) {
          fieldOverrides = parsedOverrides.value;
        }

        return this.service.previewVariantPrice({ groupId, quantity, unitId, fieldOverrides }).pipe(
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
        const allGroups = (groups.data || []);
        const activeUnits = (units.data || []).filter((item) => item.status === 'ACTIVE');

        this.groups.set(allGroups);
        this.units.set(activeUnits);

        const selectedGroupId =
          allGroups.find((item) => item._id === this.requestedGroupId)?._id
          || allGroups[0]?._id
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
      this.pricingSuggestions.set([]);
      this.clearDraftRows();
      return;
    }

    this.clearDraftRows();

    this.loadVariants(groupId);
  }

  loadVariants(groupId: string): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.variantTablePageIndex.set(0);
    this.allVariantsLoaded.set(false);

    this.service.listVariants(groupId, 1, this.variantTablePageSize()).subscribe({
      next: (response) => {
        const pagination = response.pagination;
        this.totalVariants.set(pagination.total);
        this.canLoadAllVariants.set(pagination.canLoadAll);
        this.allVariantsLoaded.set(pagination.total <= 500);

        if (pagination.total <= 500 && pagination.hasMore) {
          this.service.listVariants(groupId, 1, pagination.total).subscribe({
            next: (allRes) => this.variants.set(allRes.data || []),
          });
        } else {
          this.variants.set(response.data || []);
        }
        this.loadPricingSuggestions(groupId);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Failed to load variants.');
        this.loading.set(false);
      },
    });
  }

  onVariantTableQueryChange(query: GomTableQuery): void {
    if (this.variantTableDataMode() !== 'server') {
      return;
    }

    this.loading.set(true);
    const groupId = this.selectedGroupId();

    const search = query.searchTerm?.trim();
    const sortBy = query.sort?.key;
    const order = query.sort?.direction as 'asc' | 'desc' | undefined;

    this.service.listVariants(groupId, query.pageIndex + 1, query.pageSize, undefined, search, sortBy, order).subscribe({
      next: (res) => {
        this.allVariantsLoaded.set(false);
        this.variants.set(res.data ?? []);
        this.totalVariants.set(res.pagination.total);
        this.canLoadAllVariants.set(res.pagination.canLoadAll);
        this.variantTablePageIndex.set(query.pageIndex);
        this.variantTablePageSize.set(query.pageSize);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  loadAllVariants(): void {
    this.loading.set(true);
    const groupId = this.selectedGroupId();
    this.service.listVariants(groupId, 1, this.totalVariants()).subscribe({
      next: (res) => {
        this.variants.set(res.data ?? []);
        this.totalVariants.set(res.pagination.total);
        this.canLoadAllVariants.set(false);
        this.allVariantsLoaded.set(true);
        this.variantTablePageIndex.set(0);
        this.loadPricingSuggestions(groupId);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  openCreateVariant(): void {
    if (!this.selectedGroupId()) {
      this.toast.warning('Please select a group first.');
      return;
    }

    const remaining = this.variantCreateRemaining();
    if (remaining !== null && remaining <= 0) {
      const limit = this.variantCreateLimit();
      this.toast.error(`Variant creation limit reached. You have used ${this.variantCreateUsed()} of ${limit} allowed variants.`);
      return;
    }

    this.editingVariantId.set(null);
    
    // Initialize option selections for ATTRIBUTE groups
    const group = this.selectedGroup();
    const optionControls: Record<string, string> = {};
    if (group?.optionAxes) {
      group.optionAxes.forEach(axis => {
        optionControls[axis.key] = axis.values[0] || '';
      });
    }
    this.optionSelectionControls.set(optionControls);
    
    const defaultUnitId = this.availableUnitOptions()[0]?.value || '';
    
    this.variantForm.reset({
      name: '',
      quantity: null,
      createAsPack: false,
      packCount: 1,
      unitId: defaultUnitId,
      pricingMode: 'FORMULA',
      fixedSellingPrice: null,
      targetMarginPercent: null,
      additionalPrice: 0,
      additionalPriceReason: '',
      discountType: 'PERCENT',
      discountValue: 0,
      anchorDiscountType: 'PERCENT',
      anchorDiscountValue: 0,
      reason: '',
      fieldOverridesJson: '',
    });
    
    // Set default name after a short delay to let signals update
    setTimeout(() => {
      const defaultName = this.defaultVariantName();
      this.variantForm.patchValue({ name: defaultName });
    }, 50);
    
    this.currentBasePrice.set(null);
    this.editingOriginalPricingMode.set(null);
    
    // Defer modal open to allow form initialization
    setTimeout(() => this.formOpen.set(true), 50);
  }

  addDraftRow(): void {
    const defaultUnitId = this.availableUnitOptions()[0]?.value || '';
    const optionSelections = this.buildOptionSelections() || [];
    const defaultDisplayName = this.buildDraftRowDefaultNameFromSelections(optionSelections);
    const row: VariantDraftRow = {
      rowId: this.createDraftRowId(),
      form: this.createDraftRowForm({
        selected: true,
        quantity: 1,
        unitId: defaultUnitId,
        additionalPrice: 0,
        displayName: defaultDisplayName,
        fieldOverridesJson: '',
      }),
      mode: 'MANUAL',
      selected: true,
      quantity: 1,
      unitId: defaultUnitId,
      itemType: 'INDIVIDUAL',
      additionalPrice: 0,
      displayName: defaultDisplayName,
      optionSelections,
      fieldOverrideEntries: [],
      fieldOverrides: {},
      fieldOverridesJson: '',
      preview: null,
      error: null,
    };

    this.draftRows.set([...this.draftRows(), row]);
    this.refreshDraftRowPreview(row.rowId);
  }

  clearDraftRows(): void {
    this.draftRows.set([]);
  }

  toggleBulkPanel(): void {
    this.bulkPanelOpen.set(!this.bulkPanelOpen());
  }

  removeDraftRow(rowId: string): void {
    this.draftRows.set(this.draftRows().filter((item) => item.rowId !== rowId));
  }

  duplicateDraftRow(rowId: string): void {
    const row = this.draftRows().find((item) => item.rowId === rowId);
    if (!row) {
      return;
    }

    const clone = this.cloneDraftRow(row);
    this.draftRows.set([...this.draftRows(), clone]);
    this.refreshDraftRowPreview(clone.rowId);
  }

  applyBulkAdditionalCharge(): void {
    const formValue = this.draftBulkApplyForm.getRawValue();
    const additionalPrice = Number(formValue.additionalPrice);

    if (!Number.isFinite(additionalPrice) || additionalPrice < 0) {
      this.toast.warning(this.translate.instant('gom.variantsWorkspace.toast.invalidBulkAdditionalCharge'));
      return;
    }

    this.draftRows.set(this.draftRows().map((row) => {
      if (!row.selected) {
        return row;
      }

      row.form.controls.additionalPrice.setValue(additionalPrice);
      const nextRow = {
        ...row,
        additionalPrice,
      };

      return {
        ...nextRow,
        error: this.validateDraftRow(nextRow),
      };
    }));

    this.toast.success(this.translate.instant('gom.variantsWorkspace.toast.bulkApplySuccess'));
  }

  applyBulkQuantity(): void {
    const formValue = this.draftBulkApplyForm.getRawValue();
    const quantity = Number(formValue.quantity);

    if (!Number.isFinite(quantity) || quantity <= 0) {
      this.toast.warning(this.translate.instant('gom.variantsWorkspace.toast.invalidBulkQuantity') || 'Invalid quantity value');
      return;
    }

    this.draftRows.set(this.draftRows().map((row) => {
      if (!row.selected) {
        return row;
      }

      row.form.controls.quantity.setValue(quantity);
      const nextRow = {
        ...row,
        quantity,
      };

      return {
        ...nextRow,
        error: this.validateDraftRow(nextRow),
      };
    }));

    this.draftRows().forEach((row) => {
      if (row.selected) {
        this.refreshDraftRowPreview(row.rowId);
      }
    });

    this.toast.success(this.translate.instant('gom.variantsWorkspace.toast.bulkApplySuccess'));
  }

  applyBulkBaseCost(): void {
    if (!this.showBaseCostColumn()) {
      this.toast.warning('Base Cost is not available for this group type');
      return;
    }

    const formValue = this.draftBulkApplyForm.getRawValue();
    const baseCost = Number(formValue.baseCost);

    if (!Number.isFinite(baseCost) || baseCost < 0) {
      this.toast.warning('Invalid base cost value');
      return;
    }

    const baseCostKey = this.baseCostFieldKey();
    if (!baseCostKey) {
      this.toast.warning('Base cost field not configured for this group');
      return;
    }

    this.draftRows.set(this.draftRows().map((row) => {
      if (!row.selected) {
        return row;
      }

      const nextRow = {
        ...row,
        fieldOverrides: {
          ...row.fieldOverrides,
          [baseCostKey]: baseCost,
        },
      };

      return {
        ...nextRow,
        error: this.validateDraftRow(nextRow),
      };
    }));

    this.draftRows().forEach((row) => {
      if (row.selected) {
        this.refreshDraftRowPreview(row.rowId);
      }
    });

    this.toast.success(this.translate.instant('gom.variantsWorkspace.toast.bulkApplySuccess'));
  }

  applyBulkFieldOverrides(): void {
    const normalized = this.normalizeFieldOverrideEntries(this.bulkFieldOverrideEntries());
    if (!normalized.ok) {
      this.toast.error(this.translate.instant('gom.variantsWorkspace.errors.fieldOverridesInvalid'));
      return;
    }

    const overrides = normalized.value || {};
    const asJson = JSON.stringify(overrides);
    this.draftRows.set(this.draftRows().map((row) => {
      if (!row.selected) {
        return row;
      }

      row.form.controls.fieldOverridesJson.setValue(asJson);
      const nextRow = {
        ...row,
        fieldOverrideEntries: this.toFieldOverrideEntries(overrides),
        fieldOverrides: overrides,
        fieldOverridesJson: asJson,
      };

      return {
        ...nextRow,
        error: this.validateDraftRow(nextRow),
      };
    }));

    this.refreshAllDraftRowPreviews();
    this.toast.success(this.translate.instant('gom.variantsWorkspace.toast.bulkOverridesApplySuccess'));
  }

  addBulkFieldOverrideEntry(): void {
    const usedKeys = new Set(
      this.bulkFieldOverrideEntries()
        .map((entry) => String(entry.key || '').trim())
        .filter((key) => !!key)
    );
    const defaultKey = this.getGroupOverrideKeyCatalog()
      .map((item) => item.key)
      .find((key) => !usedKeys.has(key)) || '';

    this.bulkFieldOverrideEntries.set([
      ...this.bulkFieldOverrideEntries(),
      { id: this.createDraftRowId(), key: defaultKey, value: '' },
    ]);
  }

  removeBulkFieldOverrideEntry(entryId: string): void {
    this.bulkFieldOverrideEntries.set(
      this.bulkFieldOverrideEntries().filter((entry) => entry.id !== entryId)
    );
  }

  updateBulkFieldOverrideEntryKey(entryId: string, key: string): void {
    this.bulkFieldOverrideEntries.set(this.bulkFieldOverrideEntries().map((entry) => {
      if (entry.id !== entryId) {
        return entry;
      }
      return { ...entry, key: String(key || '') };
    }));
  }

  updateBulkFieldOverrideEntryValue(entryId: string, value: string): void {
    this.bulkFieldOverrideEntries.set(this.bulkFieldOverrideEntries().map((entry) => {
      if (entry.id !== entryId) {
        return entry;
      }
      return { ...entry, value: String(value || '') };
    }));
  }

  getBulkFieldOverrideKeyOptions(entryId: string): Array<{ key: string; label: string }> {
    const currentEntry = this.bulkFieldOverrideEntries().find((entry) => entry.id === entryId);
    const currentKey = String(currentEntry?.key || '').trim();
    const usedByOthers = new Set(
      this.bulkFieldOverrideEntries()
        .filter((entry) => entry.id !== entryId)
        .map((entry) => String(entry.key || '').trim())
        .filter((key) => !!key)
    );

    const options = this.getGroupOverrideKeyCatalog().filter(
      (item) => !usedByOthers.has(item.key) || item.key === currentKey
    );

    if (currentKey && !options.some((item) => item.key === currentKey)) {
      return [{ key: currentKey, label: currentKey }, ...options];
    }

    return options;
  }

  addDraftRowFieldOverrideEntry(rowId: string): void {
    this.draftRows.set(this.draftRows().map((row) => {
      if (row.rowId !== rowId) {
        return row;
      }

      const usedKeys = new Set(
        (row.fieldOverrideEntries || [])
          .map((entry) => String(entry.key || '').trim())
          .filter((key) => !!key)
      );
      const defaultKey = this.getGroupOverrideKeyCatalog()
        .map((item) => item.key)
        .find((key) => !usedKeys.has(key)) || '';

      const nextEntries = [
        ...(row.fieldOverrideEntries || []),
        { id: this.createDraftRowId(), key: defaultKey, value: '' },
      ];

      return {
        ...row,
        fieldOverrideEntries: nextEntries,
        error: this.validateDraftRow({ ...row, fieldOverrideEntries: nextEntries }),
      };
    }));
  }

  removeDraftRowFieldOverrideEntry(rowId: string, entryId: string): void {
    this.draftRows.set(this.draftRows().map((row) => {
      if (row.rowId !== rowId) {
        return row;
      }

      const nextEntries = (row.fieldOverrideEntries || []).filter((entry) => entry.id !== entryId);
      const normalized = this.normalizeFieldOverrideEntries(nextEntries);

      return {
        ...row,
        fieldOverrideEntries: nextEntries,
        fieldOverrides: normalized.ok ? normalized.value : {},
        fieldOverridesJson: normalized.ok ? JSON.stringify(normalized.value) : row.fieldOverridesJson,
        error: this.validateDraftRow({
          ...row,
          fieldOverrideEntries: nextEntries,
          fieldOverrides: normalized.ok ? normalized.value : {},
          fieldOverridesJson: normalized.ok ? JSON.stringify(normalized.value) : row.fieldOverridesJson,
        }),
      };
    }));

    this.refreshDraftRowPreview(rowId);
  }

  updateDraftRowFieldOverrideEntryKey(rowId: string, entryId: string, key: string): void {
    this.updateDraftRowFieldOverrideEntry(rowId, entryId, { key: String(key || '') });
  }

  updateDraftRowFieldOverrideEntryValue(rowId: string, entryId: string, value: string): void {
    this.updateDraftRowFieldOverrideEntry(rowId, entryId, { value: String(value || '') });
  }

  syncDraftRowSelection(rowId: string): void {
    this.draftRows.set(this.draftRows().map((row) => {
      if (row.rowId !== rowId) {
        return row;
      }

      return {
        ...row,
        selected: !!row.form.controls.selected.value,
      };
    }));
  }

  updateDraftRowQuantity(rowId: string, value: string): void {
    const quantity = Number(value);
    const row = this.draftRows().find((r) => r.rowId === rowId);
    if (row) {
      row.form.patchValue({ quantity: Number.isFinite(quantity) ? quantity : null }, { emitEvent: false });
    }
    this.updateDraftRow(rowId, {
      quantity: Number.isFinite(quantity) ? quantity : null,
    });
    this.refreshDraftRowPreview(rowId);
  }

  updateDraftRowUnit(rowId: string, unitId: string): void {
    this.updateDraftRow(rowId, { unitId });
    this.refreshDraftRowPreview(rowId);
  }

  updateDraftRowAdditionalPrice(rowId: string, value: string): void {
    const additionalPrice = Number(value);
    this.updateDraftRow(rowId, {
      additionalPrice: Number.isFinite(additionalPrice) && additionalPrice >= 0 ? additionalPrice : 0,
    });
  }

  updateDraftRowDisplayName(rowId: string, value: string): void {
    this.updateDraftRow(rowId, { displayName: value });
  }

  updateDraftRowFieldOverrides(rowId: string, value: string): void {
    const parsed = this.parseFieldOverridesJson(value);
    if (!parsed.ok) {
      this.updateDraftRow(rowId, {
        fieldOverridesJson: value,
        fieldOverrides: {},
        fieldOverrideEntries: [],
        error: parsed.error || this.translate.instant('gom.variantsWorkspace.errors.fieldOverridesInvalid'),
      });
      return;
    }

    this.updateDraftRow(rowId, {
      fieldOverridesJson: value,
      fieldOverrides: parsed.value || {},
      fieldOverrideEntries: this.toFieldOverrideEntries(parsed.value || {}),
    });
    this.refreshDraftRowPreview(rowId);
  }

  autoGenerateDraftRows(): void {
    const groupId = this.selectedGroupId();
    if (!groupId) {
      this.toast.warning(this.translate.instant('gom.variantsWorkspace.toast.selectGroupFirst'));
      return;
    }

    this.loadingDraftPreview.set(true);
    this.service.previewVariantCombinations({ groupId }).subscribe({
      next: (response) => {
        const generatedRows = (response.data?.items || [])
          .filter((item) => !item.exists)
          .map((item) => this.mapAutoCombinationToDraftRow(item));

        const existingRows = this.draftRows();
        const existingKeys = new Set(existingRows.map((row) => this.getRowCombinationKey(row)));
        const uniqueGeneratedRows = generatedRows.filter((row) => !existingKeys.has(this.getRowCombinationKey(row)));

        this.draftRows.set([...existingRows, ...uniqueGeneratedRows]);
        this.loadingDraftPreview.set(false);

        if (!generatedRows.length) {
          this.toast.warning(this.translate.instant('gom.variantsWorkspace.toast.noCombinations'));
          return;
        }

        if (!uniqueGeneratedRows.length) {
          this.toast.warning('All available combinations are already added to workspace.');
          return;
        }

        uniqueGeneratedRows.forEach((row) => this.refreshDraftRowPreview(row.rowId));
      },
      error: (error) => {
        this.loadingDraftPreview.set(false);
        this.toast.error(this.extractApiMessage(error) || this.translate.instant('gom.variantsWorkspace.toast.autoGenerateFailed'));
      },
    });
  }

  saveDraftRowsAsVariants(): void {
    const groupId = this.selectedGroupId();
    if (!groupId) {
      this.toast.warning(this.translate.instant('gom.variantsWorkspace.toast.selectGroupFirst'));
      return;
    }

    const rows = this.draftRows();
    const selectedRows = rows.filter((row) => row.selected);
    if (!selectedRows.length) {
      this.toast.warning(this.translate.instant('gom.variantsWorkspace.toast.selectOneRow'));
      return;
    }

    const invalidRows = selectedRows.filter((row) => !!this.validateDraftRow(row));
    if (invalidRows.length) {
      this.toast.error(this.translate.instant('gom.variantsWorkspace.toast.fixRowErrors'));
      this.draftRows.set(rows.map((row) => {
        if (!row.selected) {
          return row;
        }
        return { ...row, error: this.validateDraftRow(row) };
      }));
      return;
    }

    const duplicateKeys = this.findDuplicateCombinationKeys(selectedRows);
    if (duplicateKeys.size > 0) {
      this.toast.error(this.translate.instant('gom.variantsWorkspace.errors.duplicateCombination'));
      this.draftRows.set(rows.map((row) => {
        if (!row.selected) {
          return row;
        }
        const key = this.getRowCombinationKey(row);
        if (duplicateKeys.has(key)) {
          return {
            ...row,
            error: this.translate.instant('gom.variantsWorkspace.errors.duplicateCombination'),
          };
        }
        return row;
      }));
      return;
    }

    const variantsPayload = selectedRows.map((row) => {
      const finalName = (row.displayName || '').trim() || this.buildDraftRowDefaultName(row);
      return {
        name: finalName,
        itemType: row.itemType,
        quantity: Number(row.quantity),
        unitId: row.unitId,
        optionSelections: row.optionSelections,
        fieldOverrides: row.fieldOverrides,
        additionalPrice: Number(row.additionalPrice || 0),
        pricingMode: 'FORMULA' as const,
        combinationKey: row.combinationKey,
      };
    });

    this.bulkSaving.set(true);
    this.service.createVariants({
      groupId,
      variants: variantsPayload,
    }).subscribe({
      next: () => {
        this.bulkSaving.set(false);
        this.toast.success(this.translate.instant('gom.variantsWorkspace.toast.saveSuccess', { count: variantsPayload.length }));
        this.clearDraftRows();
        this.loadVariants(groupId);
      },
      error: (error) => {
        this.bulkSaving.set(false);
        this.toast.error(this.extractApiMessage(error) || this.translate.instant('gom.variantsWorkspace.toast.saveFailed'));
      },
    });
  }

  openEditVariant(variant: Variant): void {
    this.editingVariantId.set(variant._id);
    const isPackVariant = variant.itemType === 'PACK';

    const group = this.selectedGroup();
    const selectedOptionMap = new Map(
      (variant.optionSelections || [])
        .map((item) => [String(item.key || '').trim(), String(item.value || '').trim()])
    );
    const optionControls: Record<string, string> = {};
    if (group?.optionAxes) {
      group.optionAxes.forEach((axis) => {
        const key = String(axis.key || '').trim();
        optionControls[key] = selectedOptionMap.get(key) || axis.values?.[0] || '';
      });
    }
    this.optionSelectionControls.set(optionControls);

    const fieldOverridesJson = Object.keys(variant.fieldOverrides || {}).length > 0
      ? JSON.stringify(variant.fieldOverrides)
      : '';

    // For FORMULA-mode variants, populate the explicit MRP if one was stored
    const formulaMrp = (variant.pricingMode || 'FORMULA') === 'FORMULA' && variant.override?.finalAnchorPrice
      ? Number(variant.override.finalAnchorPrice)
      : null;

    this.variantForm.reset({
      name: variant.name || '',
      quantity: variant.quantity,
      createAsPack: isPackVariant,
      packCount: 1,
      unitId: variant.unitId,
      pricingMode: variant.pricingMode || 'FORMULA',
      fixedSellingPrice: Number.isFinite(Number(variant.override?.fixedSellingPrice))
        ? Number(variant.override?.fixedSellingPrice)
        : null,
      targetMarginPercent: null,
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
      fieldOverridesJson,
      mrp: formulaMrp && Number.isFinite(formulaMrp) && formulaMrp > 0 ? formulaMrp : null,
    });
    this.currentBasePrice.set({
      convertedQuantity: variant.convertedQuantity,
      sellingPrice: variant.price.sellingPrice,
      anchorPrice: variant.price.anchorPrice,
    });
    this.editingOriginalPricingMode.set(variant.pricingMode || 'FORMULA');
    
    // Load media for the variant being edited
    const groupId = String(variant.groupId || '');
    if (groupId) {
      this.mediaService.getGroupImages(groupId).subscribe({
        next: (imgs) => this.groupImages.set(imgs || []),
        error: () => this.groupImages.set([]),
      });
    }
    this.mediaService.getVariantImages(variant._id).subscribe({
      next: (imgs) => this.variantImages.set(imgs || []),
      error: () => this.variantImages.set([]),
    });
    
    // Defer modal open to allow form initialization
    setTimeout(() => this.formOpen.set(true), 50);
  }

  closeForm(): void {
    this.formOpen.set(false);
    this.editingVariantId.set(null);
    this.editingOriginalPricingMode.set(null);
    this.currentBasePrice.set(null);
    this.groupImages.set([]);
    this.variantImages.set([]);
  }

  saveVariant(): void {
    this.variantForm.markAllAsTouched();
    if (this.variantForm.invalid || !this.selectedGroupId()) {
      return;
    }

    const formValue = this.variantForm.getRawValue();
    const pricingMode = formValue.pricingMode || 'FORMULA';
    const fixedSellingPrice = Number(formValue.fixedSellingPrice);
    const hasFixedSellingPrice = Number.isFinite(fixedSellingPrice);
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

    const explicitMrp = Number(formValue.mrp);
    const hasExplicitMrp = Number.isFinite(explicitMrp) && explicitMrp > 0;

    const payloadPricing = pricingMode === 'OVERRIDE'
      ? {
          pricingMode,
          fixedSellingPrice: hasFixedSellingPrice ? fixedSellingPrice : undefined,
          discountType: formValue.discountType || 'PERCENT',
          discountValue: Number(formValue.discountValue || 0),
          finalAnchorPrice: Number.isFinite(previewPrices.anchor)
            ? Number(previewPrices.anchor)
            : undefined,
          reason: formValue.reason?.trim() || undefined,
        }
      : {
          pricingMode: 'FORMULA' as const,
          // Pass null to clear an existing MRP override when the field is blank
          finalAnchorPrice: hasExplicitMrp ? explicitMrp : null,
        };

    if (pricingMode === 'OVERRIDE' && hasFixedSellingPrice && fixedSellingPrice < 0) {
      this.toast.error('Fixed override price must be non-negative.');
      return;
    }

    if (pricingMode === 'OVERRIDE' && !hasFixedSellingPrice && Number(payloadPricing.discountValue) < 0) {
      this.toast.error('Discount value must be non-negative.');
      return;
    }

    if (
      pricingMode === 'OVERRIDE'
      && !hasFixedSellingPrice
      && payloadPricing.discountType === 'PERCENT'
      && Number(payloadPricing.discountValue) > 100
    ) {
      this.toast.error('Percentage discount cannot exceed 100.');
      return;
    }

    if (pricingMode === 'OVERRIDE' && !hasFixedSellingPrice && Number(formValue.anchorDiscountValue || 0) < 0) {
      this.toast.error('Anchor discount value must be non-negative.');
      return;
    }

    if (
      pricingMode === 'OVERRIDE'
      && !hasFixedSellingPrice
      && (formValue.anchorDiscountType || 'PERCENT') === 'PERCENT'
      && Number(formValue.anchorDiscountValue || 0) > 100
    ) {
      this.toast.error('Anchor percentage discount cannot exceed 100.');
      return;
    }

    const editingId = this.editingVariantId();
    const clearOverride = Boolean(
      editingId
      && this.editingOriginalPricingMode() === 'OVERRIDE'
      && pricingMode === 'FORMULA'
    );

    if (clearOverride && !(formValue.reason || '').trim()) {
      this.toast.error('Reason is required when clearing override mode.');
      return;
    }

    this.saving.set(true);

    const variantName = (formValue.name || '').trim() || this.defaultVariantName();
    const fieldOverrides = this.variantFieldOverrides();

    if (editingId) {
      this.service.updateVariant(editingId, {
        name: variantName,
        itemType: formValue.createAsPack ? 'PACK' : 'INDIVIDUAL',
        quantity: effectiveQuantity,
        unitId: formValue.unitId || '',
        additionalPrice,
        additionalPriceReason: formValue.additionalPriceReason?.trim() || undefined,
        fieldOverrides: Object.keys(fieldOverrides).length > 0 ? fieldOverrides : undefined,
        clearOverride,
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
          name: variantName,
          itemType: formValue.createAsPack ? 'PACK' : 'INDIVIDUAL',
          quantity: effectiveQuantity,
          unitId: formValue.unitId || '',
          optionSelections: this.buildOptionSelections(),
          additionalPrice,
          additionalPriceReason: formValue.additionalPriceReason?.trim() || undefined,
          fieldOverrides: Object.keys(fieldOverrides).length > 0 ? fieldOverrides : undefined,
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
    const rawId = event.row['_id'] ?? event.row['id'];
    const id = typeof rawId === 'string' ? rawId : '';
    const variant = this.variants().find((item) => item._id === id);
    if (!variant) {
      this.toast.warning('Unable to find the selected variant. Please refresh and try again.');
      return;
    }

    if (event.actionKey === 'edit') {
      if (!this.canUpdateVariant()) {
        this.toast.warning('Your current package does not allow editing variants.');
        return;
      }
      this.openEditVariant(variant);
      return;
    }

    if (event.actionKey === 'delete') {
      if (!this.canDeleteVariant()) {
        return;
      }
      this.deletingVariantId.set(variant._id);
      this.deletingVariantName.set(variant.name);
      this.deletingVariantImpactCount.set(null);
      this.deleteConfirmOpen.set(true);
      this.productCollectionsService.listCollectionsByVariant(variant._id).subscribe({
        next: (response) => {
          this.deletingVariantImpactCount.set((response.data || []).length);
        },
        error: () => {
          this.deletingVariantImpactCount.set(0);
        },
      });
      return;
    }

    if (event.actionKey === 'collections') {
      if (!this.canManageProductCollections()) {
        return;
      }
      this.openVariantCollections(variant);
    }
  }

  closeVariantCollectionsModal(): void {
    this.variantCollectionsModalOpen.set(false);
    this.currentVariantForCollections.set(null);
    this.variantCollectionMemberships.set([]);
    this.availableProductCollections.set([]);
    this.variantCollectionForm.reset({ collectionId: '' });
  }

  addCurrentVariantToCollection(): void {
    const variant = this.currentVariantForCollections();
    const collectionId = String(this.variantCollectionForm.controls.collectionId.value || '');
    if (!variant?._id || !collectionId) {
      return;
    }

    this.loadingVariantCollections.set(true);
    this.productCollectionsService.assignItems(collectionId, {
      assignments: [{ type: 'VARIANT', referenceId: variant._id }],
    }).subscribe({
      next: () => {
        this.variantCollectionForm.reset({ collectionId: '' });
        this.toast.success('Variant added to collection.');
        this.reloadVariantCollections(variant);
      },
      error: (error) => {
        this.loadingVariantCollections.set(false);
        this.toast.error(String(error?.error?.message || 'Failed to add variant to collection.'));
      },
    });
  }

  cancelDelete(): void {
    this.deleteConfirmOpen.set(false);
    this.deletingVariantId.set(null);
    this.deletingVariantName.set('');
    this.deletingVariantImpactCount.set(null);
  }

  confirmDelete(): void {
    const id = this.deletingVariantId();
    if (!id) {
      return;
    }

    this.saving.set(true);
    this.deleteConfirmOpen.set(false);

    this.service.deleteVariant(id).subscribe({
      next: (response) => {
        const unmapped = Number(response.data?.unmappedFromCollections || 0);
        if (unmapped > 0) {
          this.toast.success(`Variant deleted successfully. Removed from ${unmapped} collections.`);
        } else {
          this.toast.success('Variant deleted successfully.');
        }
        this.deletingVariantId.set(null);
        this.deletingVariantName.set('');
        this.deletingVariantImpactCount.set(null);
        this.loadVariants(this.selectedGroupId());
        this.loadPricingSuggestions(this.selectedGroupId());
        this.saving.set(false);
      },
      error: (error) => {
        this.toast.error(this.extractApiMessage(error) || 'Failed to delete variant.');
        this.saving.set(false);
      },
    });
  }

  getDeleteMessage(): string {
    const name = this.deletingVariantName();
    const impactCount = this.deletingVariantImpactCount();

    if ((impactCount || 0) > 0) {
      return `Delete ${name || 'this variant'}? It is used in ${impactCount} collections and will be removed where applicable.`;
    }

    if (impactCount === null) {
      return `Delete ${name || 'this variant'}? Checking collection impact...`;
    }

    return `Delete ${name || 'this variant'}?`;
  }

  loadPricingSuggestions(groupId: string): void {
    if (!groupId) {
      this.pricingSuggestions.set([]);
      return;
    }

    this.loadingPricingSuggestions.set(true);
    this.service.listPricingRefreshSuggestions(groupId, 'PENDING').subscribe({
      next: (response) => {
        this.pricingSuggestions.set(response.data || []);
        this.loadingPricingSuggestions.set(false);
      },
      error: () => {
        this.pricingSuggestions.set([]);
        this.loadingPricingSuggestions.set(false);
      },
    });
  }

  openPriceApproval(): void {
    const groupId = this.selectedGroupId();
    if (!groupId) {
      this.toast.warning('Please select a group first.');
      return;
    }

    this.service.listPricingRefreshSuggestions(groupId, 'PENDING').subscribe({
      next: (res) => {
        const count = Number(res.pagination?.total || 0);
        if (count > 0) {
          this.priceApprovalOpen.set(true);
          return;
        }

        this.toast.info('No pending pricing suggestions found.');
      },
      error: () => {
        this.toast.error('Unable to load pending pricing suggestions. Please try again.');
      },
    });
  }

  onPriceApprovalCompleted(): void {
    this.priceApprovalOpen.set(false);
    const groupId = this.selectedGroupId();
    if (groupId) {
      this.loadPricingSuggestions(groupId);
      this.loadVariants(groupId);
    }
  }

  getPendingPricingSubtitle(): string {
    const count = this.pricingSuggestions().length;
    const warningCount = this.suggestionWarningCount();
    if (warningCount > 0) {
      return `${count} pending • ${warningCount} below threshold`;
    }
    return count === 1 ? '1 pending suggestion' : `${count} pending suggestions`;
  }

  formatMarginPercent(value: number | undefined): string {
    if (!Number.isFinite(Number(value))) {
      return '-';
    }
    return `${this.formatNumber(Number(value))}%`;
  }

  applyTargetMarginToVariantForm(): void {
    const targetMarginPercent = Number(this.variantForm.controls.targetMarginPercent.value);
    if (!Number.isFinite(targetMarginPercent)) {
      this.toast.warning('Enter a valid target margin %.');
      return;
    }

    const editingId = this.editingVariantId();
    const payload = editingId
      ? { targetMarginPercent, variantId: editingId }
      : {
          targetMarginPercent,
          groupId: this.selectedGroupId(),
          quantity: this.getEffectiveQuantity(this.variantForm.getRawValue()),
          unitId: this.variantForm.controls.unitId.value || '',
        };

    this.service.previewTargetMargin(payload).subscribe({
      next: (response) => {
        const preview = response.data;
        this.variantForm.patchValue({
          pricingMode: 'OVERRIDE',
          fixedSellingPrice: Number(preview.recommendedSellingPrice || 0),
        });
        this.toast.success(`Recommended price applied: ${this.currencySymbol} ${this.formatCurrency(preview.recommendedSellingPrice)}`);
      },
      error: (error) => {
        this.toast.error(this.extractApiMessage(error) || 'Failed to calculate target margin recommendation.');
      },
    });
  }

  formatNumber(value: number): string {
    return Number.isFinite(value)
      ? value.toLocaleString(undefined, { maximumFractionDigits: 4 })
      : '-';
  }

  // --- Variant Media ---

  openVariantMediaPicker(): void {
    this.pickerOpen.set(true);
  }

  onVariantImagesSelected(picked: PickedImage[]): void {
    const variantId = this.editingVariantId();
    if (!variantId || picked.length === 0) return;

    const seen = new Set<string>();
    const uniquePicked = picked.filter((p) => {
      if (seen.has(p.asset._id)) return false;
      seen.add(p.asset._id);
      return true;
    });
    const entries: GroupImageEntry[] = uniquePicked.map((p, i) => ({
      mediaAssetId: p.asset._id,
      source: p.source,
      sortOrder: this.variantImages().length + i,
    }));

    this.mediaService.attachVariantImages(variantId, entries).subscribe({
      next: () => {
        this.mediaService.getVariantImages(variantId).subscribe({
          next: (imgs) => this.variantImages.set(imgs || []),
        });
        this.toast.success('Media added to variant');
      },
      error: () => this.toast.error('Failed to attach media'),
    });
  }

  removeVariantImage(img: GroupImage): void {
    const variantId = this.editingVariantId();
    if (!variantId) return;

    this.variantImages.set(this.variantImages().filter((i) => i.mediaAssetId._id !== img.mediaAssetId._id));
    this.mediaService.detachVariantImages(variantId, [img.mediaAssetId._id]).subscribe({
      next: () => this.toast.success('Media removed'),
      error: () => {
        this.mediaService.getVariantImages(variantId).subscribe({
          next: (imgs) => this.variantImages.set(imgs || []),
        });
        this.toast.error('Failed to remove media');
      },
    });
  }

  updateOptionSelection(key: string, value: string): void {
    const current = this.optionSelectionControls();
    this.optionSelectionControls.set({ ...current, [key]: value });
    
    // Update variant name if it matches the default  
    setTimeout(() => {
      const currentName = this.variantForm.value.name || '';
      const defaultName = this.defaultVariantName();
      // Only auto-update if user hasn't customized the name
      if (!currentName || this.isDefaultName(currentName)) {
        this.variantForm.patchValue({ name: defaultName });
      }
    }, 10);
  }

  private isDefaultName(name: string): boolean {
    // Check if the name follows the default pattern
    const group = this.selectedGroup();
    const groupName = group?.name || '';
    return name.startsWith(groupName);
  }

  updateVariantFieldOverride(key: string, value: string): void {
    const numValue = Number(value);
    if (!Number.isFinite(numValue)) {
      return;
    }

    const current = this.variantFieldOverrides();
    const updated = { ...current, [key]: numValue };
    this.variantForm.patchValue({ 
      fieldOverridesJson: JSON.stringify(updated) 
    });
  }

  updateBaseCostOverride(value: string): void {
    const baseCostKey = this.baseCostFieldKey();
    if (!baseCostKey) {
      return;
    }

    const numValue = Number(value);
    const current = this.variantFieldOverrides();
    
    if (!value || value.trim() === '') {
      // Remove base cost override if empty
      const updated = { ...current };
      delete updated[baseCostKey];
      this.variantForm.patchValue({ 
        fieldOverridesJson: Object.keys(updated).length > 0 ? JSON.stringify(updated) : '' 
      });
      return;
    }

    if (!Number.isFinite(numValue)) {
      return;
    }

    const updated = { ...current, [baseCostKey]: numValue };
    this.variantForm.patchValue({ 
      fieldOverridesJson: JSON.stringify(updated) 
    });
  }

  updateFieldKeyInOverride(oldKey: string, newKey: string): void {
    if (oldKey === newKey) {
      return;
    }

    const current = this.variantFieldOverrides();
    const value = current[oldKey] || 0;
    const updated = { ...current };
    delete updated[oldKey];
    updated[newKey] = value;
    
    this.variantForm.patchValue({ 
      fieldOverridesJson: JSON.stringify(updated) 
    });
  }

  removeVariantFieldOverride(key: string): void {
    const current = this.variantFieldOverrides();
    const updated = { ...current };
    delete updated[key];
    this.variantForm.patchValue({ 
      fieldOverridesJson: Object.keys(updated).length > 0 ? JSON.stringify(updated) : '' 
    });
  }

  addVariantFieldOverride(): void {
    const group = this.selectedGroup();
    const resolvedKeys = (group?.resolvedFields || [])
      .map((item) => String(item.key || '').trim())
      .filter((key) => !!key);

    if (!resolvedKeys.length) {
      this.toast.warning('No formula fields available to override.');
      return;
    }

    const current = this.variantFieldOverrides();
    // Find the first available key that's not already in use
    const availableKey = resolvedKeys.find(key => !(key in current));

    if (!availableKey) {
      this.toast.warning('All formula fields already have overrides.');
      return;
    }

    const updated = { ...current, [availableKey]: 0 };
    this.variantForm.patchValue({ 
      fieldOverridesJson: JSON.stringify(updated) 
    });
  }

  getOptionValues(axisKey: string): string[] {
    const group = this.selectedGroup();
    const axis = group?.optionAxes?.find(a => a.key === axisKey);
    return axis?.values || [];
  }

  getOptionValuesAsSelectOptions(values: string[]): GomSelectOption[] {
    return values.map(v => ({ label: v, value: v }));
  }

  getBaseCostFieldLabel(): string {
    const key = this.baseCostFieldKey();
    if (!key) {
      return 'Base Cost';
    }

    return `Base Cost (${key})`;
  }

  getDraftRowBaseCostValue(row: VariantDraftRow): string {
    const key = this.baseCostFieldKey();
    if (!key) {
      return '';
    }

    const overrideValue = Number(row.fieldOverrides?.[key]);
    if (Number.isFinite(overrideValue)) {
      return String(overrideValue);
    }

    const resolvedValue = Number(this.selectedGroup()?.resolvedFields?.find((item) => item.key === key)?.value);
    return Number.isFinite(resolvedValue) ? String(resolvedValue) : '';
  }

  updateDraftRowBaseCost(rowId: string, value: string): void {
    const key = this.baseCostFieldKey();
    if (!key) {
      return;
    }

    this.draftRows.set(this.draftRows().map((row) => {
      if (row.rowId !== rowId) {
        return row;
      }

      const raw = String(value || '').trim();
      const parsed = Number(raw);
      const nextOverrides = { ...row.fieldOverrides };

      if (raw && Number.isFinite(parsed)) {
        nextOverrides[key] = parsed;
      } else {
        delete nextOverrides[key];
      }

      const nextEntries = (row.fieldOverrideEntries || []).filter((entry) => String(entry.key || '').trim() !== key);
      const nextOverridesJson = JSON.stringify(nextOverrides);
      const nextRow = {
        ...row,
        fieldOverrideEntries: nextEntries,
        fieldOverrides: nextOverrides,
        fieldOverridesJson: nextOverridesJson,
      };

      return {
        ...nextRow,
        error: this.validateDraftRow(nextRow),
      };
    }));

    this.refreshDraftRowPreview(rowId);
  }

  getFieldOverrideKeyOptions(
    row: VariantDraftRow,
    entryId: string
  ): Array<{ key: string; label: string }> {
    const currentEntry = (row.fieldOverrideEntries || []).find((entry) => entry.id === entryId);
    const currentKey = String(currentEntry?.key || '').trim();
    const usedByOtherEntries = new Set(
      (row.fieldOverrideEntries || [])
        .filter((entry) => entry.id !== entryId)
        .map((entry) => String(entry.key || '').trim())
        .filter((key) => !!key)
    );

    const options = this.getGroupOverrideKeyCatalog().filter(
      (item) => !usedByOtherEntries.has(item.key) || item.key === currentKey
    );

    if (currentKey && !options.some((item) => item.key === currentKey)) {
      return [{ key: currentKey, label: currentKey }, ...options];
    }

    return options;
  }

  private buildOptionSelections(): Array<{ key: string; label: string; value: string }> | undefined {
    if (!this.needsOptionSelections()) {
      return undefined;
    }

    const group = this.selectedGroup();
    const controls = this.optionSelectionControls();
    
    if (!group?.optionAxes) {
      return undefined;
    }

    return group.optionAxes.map(axis => ({
      key: axis.key,
      label: axis.label,
      value: controls[axis.key] || axis.values[0] || '',
    }));
  }

  formatCurrency(value: number): string {
    return Number.isFinite(value)
      ? value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : '-';
  }

  isOverrideMode(): boolean {
    return this.variantForm.controls.pricingMode.value === 'OVERRIDE';
  }

  isClearingOverrideMode(): boolean {
    return Boolean(
      this.editingVariantId()
      && this.editingOriginalPricingMode() === 'OVERRIDE'
      && this.variantForm.controls.pricingMode.value === 'FORMULA'
    );
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
      if (this.editingVariantId() && this.editingOriginalPricingMode() === 'OVERRIDE') {
        return !(formValue.reason || '').trim();
      }
      return false;
    }

    const fixedSellingPrice = Number(formValue.fixedSellingPrice);
    if (Number.isFinite(fixedSellingPrice)) {
      return fixedSellingPrice < 0;
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

    if (Number.isFinite(Number(variant.override.fixedSellingPrice))) {
      return `Fixed ${this.formatCurrency(Number(variant.override.fixedSellingPrice))}`;
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

  private updateDraftRow(rowId: string, patch: Partial<VariantDraftRow>): void {
    this.draftRows.set(this.draftRows().map((row) => {
      if (row.rowId !== rowId) {
        return row;
      }
      const nextRow = { ...row, ...patch };
      return {
        ...nextRow,
        error: this.validateDraftRow(nextRow),
      };
    }));
  }

  private refreshAllDraftRowPreviews(): void {
    this.draftRows().forEach((row) => this.refreshDraftRowPreview(row.rowId));
  }

  private refreshDraftRowPreview(rowId: string): void {
    const row = this.draftRows().find((item) => item.rowId === rowId);
    if (!row) {
      return;
    }

    const quantity = Number(row.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0 || !row.unitId || !this.selectedGroupId()) {
      this.updateDraftRow(rowId, { preview: null });
      return;
    }

    this.service.previewVariantPrice({
      groupId: this.selectedGroupId(),
      quantity,
      unitId: row.unitId,
      fieldOverrides: row.fieldOverrides,
    }).subscribe({
      next: (response) => {
        this.updateDraftRow(rowId, { preview: response.data || null });
      },
      error: () => {
        this.updateDraftRow(rowId, { preview: null, error: this.translate.instant('gom.variantsWorkspace.errors.previewFailed') });
      },
    });
  }

  private mapAutoCombinationToDraftRow(item: VariantCombinationItem): VariantDraftRow {
    const optionSelections = Array.isArray(item.optionSelections) ? item.optionSelections : [];
    const defaultDisplayName = this.buildDraftRowDefaultNameFromSelections(optionSelections);
    return {
      rowId: this.createDraftRowId(),
      form: this.createDraftRowForm({
        selected: true,
        quantity: Number(item.quantity),
        unitId: item.unitId,
        additionalPrice: 0,
        displayName: defaultDisplayName,
        fieldOverridesJson: '',
      }),
      mode: 'AUTO',
      selected: true,
      quantity: Number(item.quantity),
      unitId: item.unitId,
      itemType: 'INDIVIDUAL',
      additionalPrice: 0,
      displayName: defaultDisplayName,
      optionSelections,
      fieldOverrideEntries: [],
      fieldOverrides: {},
      fieldOverridesJson: '',
      combinationKey: item.combinationKey,
      preview: null,
      error: null,
    };
  }

  private validateDraftRow(row: VariantDraftRow): string | null {
    const quantity = Number(row.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return this.translate.instant('gom.variantsWorkspace.errors.quantityPositive');
    }

    if (!row.unitId) {
      return this.translate.instant('gom.variantsWorkspace.errors.unitRequired');
    }

    const additionalPrice = Number(row.additionalPrice || 0);
    if (!Number.isFinite(additionalPrice) || additionalPrice < 0) {
      return this.translate.instant('gom.variantsWorkspace.errors.additionalChargeNonNegative');
    }

    const parsed = this.parseFieldOverridesJson(row.fieldOverridesJson || '');
    if (!parsed.ok) {
      return parsed.error || this.translate.instant('gom.variantsWorkspace.errors.fieldOverridesInvalid');
    }

    return null;
  }

  private buildDraftRowDefaultName(row: VariantDraftRow): string {
    return this.buildDraftRowDefaultNameFromSelections(row.optionSelections);
  }

  private buildDraftRowDefaultNameFromSelections(
    selections: Array<{ key: string; label: string; value: string }>
  ): string {
    const group = this.selectedGroup();
    const groupName = group?.name || 'Variant';
    const optionPart = (selections || [])
      .map((item) => String(item?.value || '').trim())
      .filter((value) => !!value)
      .map((value) => ` (${value})`)
      .join('');

    return `${groupName}${optionPart}`.trim();
  }

  private createDraftRowId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  private createDraftRowForm(value: {
    selected: boolean;
    quantity: number | null;
    unitId: string;
    additionalPrice: number;
    displayName: string;
    fieldOverridesJson: string;
  }) {
    return this.fb.group({
      selected: [value.selected],
      quantity: [value.quantity],
      unitId: [value.unitId],
      additionalPrice: [value.additionalPrice],
      displayName: [value.displayName],
      fieldOverridesJson: [value.fieldOverridesJson],
    });
  }

  private cloneDraftRow(row: VariantDraftRow): VariantDraftRow {
    return {
      rowId: this.createDraftRowId(),
      form: this.createDraftRowForm({
        selected: true,
        quantity: row.quantity,
        unitId: row.unitId,
        additionalPrice: row.additionalPrice,
        displayName: row.displayName,
        fieldOverridesJson: row.fieldOverridesJson || '',
      }),
      mode: 'MANUAL',
      selected: true,
      quantity: row.quantity,
      unitId: row.unitId,
      itemType: row.itemType,
      additionalPrice: row.additionalPrice,
      displayName: row.displayName,
      optionSelections: [...row.optionSelections],
      fieldOverrideEntries: (row.fieldOverrideEntries || []).map((entry) => ({ ...entry, id: this.createDraftRowId() })),
      fieldOverrides: { ...row.fieldOverrides },
      fieldOverridesJson: row.fieldOverridesJson,
      combinationKey: row.combinationKey,
      preview: null,
      error: row.error,
    };
  }

  private updateDraftRowFieldOverrideEntry(
    rowId: string,
    entryId: string,
    patch: { key?: string; value?: string }
  ): void {
    this.draftRows.set(this.draftRows().map((row) => {
      if (row.rowId !== rowId) {
        return row;
      }

      const nextEntries = (row.fieldOverrideEntries || []).map((entry) => {
        if (entry.id !== entryId) {
          return entry;
        }

        return {
          ...entry,
          ...patch,
        };
      });

      const normalized = this.normalizeFieldOverrideEntries(nextEntries);
      const nextOverrides = normalized.ok ? normalized.value : {};
      const nextOverridesJson = normalized.ok ? JSON.stringify(nextOverrides) : row.fieldOverridesJson;

      return {
        ...row,
        fieldOverrideEntries: nextEntries,
        fieldOverrides: nextOverrides,
        fieldOverridesJson: nextOverridesJson,
        error: normalized.ok
          ? this.validateDraftRow({
              ...row,
              fieldOverrideEntries: nextEntries,
              fieldOverrides: nextOverrides,
              fieldOverridesJson: nextOverridesJson,
            })
          : this.translate.instant('gom.variantsWorkspace.errors.fieldOverridesInvalid'),
      };
    }));

    this.refreshDraftRowPreview(rowId);
  }

  private toFieldOverrideEntries(overrides: Record<string, number>): Array<{ id: string; key: string; value: string }> {
    return Object.entries(overrides || {}).map(([key, value]) => ({
      id: this.createDraftRowId(),
      key,
      value: String(value),
    }));
  }

  private normalizeFieldOverrideEntries(
    entries: Array<{ id: string; key: string; value: string }>
  ): { ok: true; value: Record<string, number> } | { ok: false } {
    const normalized: Record<string, number> = {};

    for (const entry of entries || []) {
      const key = String(entry?.key || '').trim();
      const rawValue = String(entry?.value || '').trim();

      if (!key && !rawValue) {
        continue;
      }

      if (!key) {
        return { ok: false };
      }

      const numericValue = Number(rawValue);
      if (!Number.isFinite(numericValue)) {
        return { ok: false };
      }

      normalized[key] = numericValue;
    }

    return { ok: true, value: normalized };
  }

  private parseFieldOverridesJson(raw: string): { ok: true; value: Record<string, number> } | { ok: false; error: string } {
    const source = String(raw || '').trim();
    if (!source) {
      return { ok: true, value: {} };
    }

    try {
      const parsed = JSON.parse(source) as Record<string, unknown>;
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return { ok: false, error: this.translate.instant('gom.variantsWorkspace.errors.fieldOverridesInvalid') };
      }

      const normalized: Record<string, number> = {};
      for (const [key, value] of Object.entries(parsed)) {
        const normalizedKey = String(key || '').trim();
        const numericValue = Number(value);
        if (!normalizedKey || !Number.isFinite(numericValue)) {
          return { ok: false, error: this.translate.instant('gom.variantsWorkspace.errors.fieldOverridesInvalid') };
        }
        normalized[normalizedKey] = numericValue;
      }

      return { ok: true, value: normalized };
    } catch {
      return { ok: false, error: this.translate.instant('gom.variantsWorkspace.errors.fieldOverridesInvalid') };
    }
  }

  private findDuplicateCombinationKeys(rows: VariantDraftRow[]): Set<string> {
    const counts = new Map<string, number>();
    for (const row of rows) {
      const key = this.getRowCombinationKey(row);
      counts.set(key, (counts.get(key) || 0) + 1);
    }

    const duplicates = new Set<string>();
    for (const [key, count] of counts.entries()) {
      if (count > 1) {
        duplicates.add(key);
      }
    }

    return duplicates;
  }

  private getRowCombinationKey(row: VariantDraftRow): string {
    const quantityPart = Number.isFinite(Number(row.quantity)) ? Number(row.quantity) : 'NaN';
    const unitPart = String(row.unitId || '').trim();
    const optionsPart = [...(row.optionSelections || [])]
      .map((item) => `${String(item.key)}=${String(item.value)}`)
      .sort((left, right) => left.localeCompare(right))
      .join('|');

    return `q:${quantityPart}|u:${unitPart}|o:${optionsPart}`;
  }

  private getGroupOverrideKeyCatalog(): Array<{ key: string; label: string }> {
    const group = this.selectedGroup();
    const fields = group?.resolvedFields || [];
    const baseKey = this.baseCostFieldKey();

    return fields
      .map((field) => {
        const key = String(field.key || '').trim();
        const label = String(field.key || '').trim();
        return { key, label };
      })
      .filter((item) => !!item.key && item.key !== baseKey);
  }

  private openVariantCollections(variant: Variant): void {
    this.currentVariantForCollections.set(variant);
    this.variantCollectionsModalOpen.set(true);
    this.loadingVariantCollections.set(true);
    this.variantCollectionForm.reset({ collectionId: '' });
    this.reloadVariantCollections(variant);
  }

  private reloadVariantCollections(variant: Variant): void {
    forkJoin({
      memberships: this.productCollectionsService.listCollectionsByVariant(variant._id),
      all: this.productCollectionsService.list({ page: 1, limit: 500 }),
    }).pipe(
      switchMap(({ memberships, all }) => {
        const rows = memberships.data || [];
        this.availableProductCollections.set(all.data || []);
        if (!rows.length) {
          return of([] as VariantCollectionMembership[]);
        }

        return forkJoin(
          rows.map((item) =>
            this.productCollectionsService.getById(item._id).pipe(
              catchError(() => of({ data: { assignments: [] } as any }))
            )
          )
        ).pipe(
          switchMap((details) => {
            const mapped = rows.map((collection, index) => {
              const assignments = details[index]?.data?.assignments || [];
              const hasDirect = assignments.some(
                (assignment: { type: string; referenceId: string }) =>
                  assignment.type === 'VARIANT' && String(assignment.referenceId) === String(variant._id)
              );
              const hasViaGroup = assignments.some(
                (assignment: { type: string; referenceId: string }) =>
                  assignment.type === 'GROUP' && String(assignment.referenceId) === String(variant.groupId)
              );

              let sourceLabel: VariantCollectionMembership['sourceLabel'] = 'DIRECT';
              if (hasDirect && hasViaGroup) {
                sourceLabel = 'DIRECT + VIA_GROUP';
              } else if (!hasDirect && hasViaGroup) {
                sourceLabel = 'VIA_GROUP';
              }

              return {
                collectionId: collection._id,
                name: collection.name,
                sourceLabel,
              };
            });

            return of(mapped);
          })
        );
      })
    ).subscribe({
      next: (memberships) => {
        this.variantCollectionMemberships.set(memberships);
        this.loadingVariantCollections.set(false);
      },
      error: () => {
        this.loadingVariantCollections.set(false);
        this.toast.error('Failed to load collection memberships.');
      },
    });
  }
}
