import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormControl, FormRecord, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { concatMap, forkJoin, from, Observable, switchMap, toArray } from 'rxjs';

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
import { PriceApprovalModalComponent } from '../pricing-approval/price-approval-modal.component';
import {
  AdjustStockPayload,
  Group,
  StockHistoryEntry,
  StockService,
  StockSummary,
  StockVariantItem,
  Unit,
  VariantStockInfo,
} from './stock.service';
import { LocalDateTimePipe } from '../../../shared/pipes/local-date-time.pipe';
import { DisableIfNoFeatureDirective } from '../../../shared/directives/disable-if-no-feature.directive';

interface StockHistoryRow extends GomTableRow {
  _id: string;
  movementType: string;
  quantity: string;
  priceChanged: string;
  actualPrice: string;
  sellingPrice: string;
  profit: string;
  createdAt: string;
  rawEntry: StockHistoryEntry;
  actions: string;
}

type PricingRecordForm = FormRecord<FormControl<number | null>>;

@Component({
  selector: 'gom-stock',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormControlsModule,
    DisableIfNoFeatureDirective,
    GomAccordionComponent,
    GomButtonComponent,
    GomTableComponent,
    GomModalComponent,
    GomConfirmationModalComponent,
    PriceApprovalModalComponent,
  ],
  templateUrl: './stock.component.html',
  styleUrl: './stock.component.scss',
})
export class StockComponent implements OnInit {
  private readonly stockService = inject(StockService);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(GomAlertToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly authSession = inject(AuthSessionService);
  readonly localDateTimePipe = new LocalDateTimePipe();

  readonly loading = signal(false);
  readonly canCreateStock = computed(() => this.authSession.hasFeature('stock.create'));
  readonly canUpdateStock = computed(() => this.authSession.hasFeature('stock.edit') || this.authSession.hasFeature('stock.update'));
  readonly canDeleteStock = computed(() => this.authSession.hasFeature('stock.delete'));
  readonly stockCreateLimit = computed(() => this.authSession.getFeatureConfigNumber('stock.create', 'max_count'));
  readonly stockCreateUsed = signal(0);
  readonly stockCreateRemaining = computed(() => {
    const limit = this.stockCreateLimit();
    if (limit === null) {
      return null;
    }

    return Math.max(limit - this.stockCreateUsed(), 0);
  });
  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly groups = signal<Group[]>([]);
  readonly units = signal<Unit[]>([]);
  readonly selectedGroupId = signal<string>('');
  readonly summary = signal<StockSummary | null>(null);
  readonly history = signal<StockHistoryEntry[]>([]);
  readonly historyTotal = signal(0);
  readonly historyTablePageIndex = signal(0);
  readonly historyTablePageSize = signal(50);
  readonly canLoadAllHistory = signal(false);
  readonly allHistoryLoaded = signal(false);
  readonly serverSidePaginationHistory = computed(() => this.historyTotal() > 500);
  readonly historyTableDataMode = computed<'client' | 'server'>(() => (this.serverSidePaginationHistory() && !this.allHistoryLoaded() ? 'server' : 'client'));
  readonly currentGroupPricingFields = signal<Array<{ fieldId: string; key: string; type: 'NUMBER' | 'PERCENTAGE'; value: number }>>([]);
  readonly pricingForm = this.fb.record<FormControl<number | null>>({});
  readonly bulkVariantPricingForm = this.fb.record<FormControl<number | null>>({});
  readonly variantPricingForms = signal<Record<string, PricingRecordForm>>({});
  readonly bulkPricingApplyMode = signal<'EMPTY_ONLY' | 'OVERWRITE_ALL'>('EMPTY_ONLY');
  readonly variantPricingMode = signal<'NONE' | 'BULK' | 'CUSTOM'>('NONE');

  readonly groupVariants = signal<StockVariantItem[]>([]);
  readonly variantAvailableMap = signal<Record<string, number>>({});
  readonly variantAllocationQtys = signal<Record<string, number>>({});
  readonly variantStockInfo = signal<VariantStockInfo[]>([]);

  readonly selectedGroupType = computed<'MEASURED' | 'ATTRIBUTE' | 'HYBRID'>(() => {
    const selectedGroup = this.groups().find((g) => g._id === this.selectedGroupId());
    const value = String(selectedGroup?.groupType || 'MEASURED').toUpperCase();
    if (value === 'ATTRIBUTE' || value === 'HYBRID') {
      return value;
    }
    return 'MEASURED';
  });

  readonly isVariantTrackedGroup = computed<boolean>(() => {
    const groupType = this.selectedGroupType();
    return groupType === 'ATTRIBUTE' || groupType === 'HYBRID';
  });

  readonly isHybridGroup = computed<boolean>(() => this.selectedGroupType() === 'HYBRID');
  readonly showsVariantBreakdown = computed<boolean>(() => this.selectedGroupType() !== 'MEASURED');
  readonly selectedGroupName = computed<string>(() => this.groups().find((g) => g._id === this.selectedGroupId())?.name || '');

  readonly selectedGroupPricingMode = computed<'FIXED' | 'MANUAL_REFRESH' | 'AUTO_REFRESH' | undefined>(() => {
    const selectedGroup = this.groups().find((g) => g._id === this.selectedGroupId());
    return selectedGroup?.pricingRefreshMode;
  });

  readonly selectedGroupFormulas = computed<{ actualPrice?: string; sellingPrice?: string; anchorPrice?: string } | undefined>(() => {
    const selectedGroup = this.groups().find((g) => g._id === this.selectedGroupId());
    if (!selectedGroup?.formula) {
      return undefined;
    }

    return {
      actualPrice: selectedGroup.formula.actualPrice,
      sellingPrice: selectedGroup.formula.sellingPrice,
      anchorPrice: selectedGroup.formula.anchorPrice,
    };
  });

  readonly selectedGroupFormulaInputs = computed<Array<{ key: string; value: number; type: 'NUMBER' | 'PERCENTAGE' }> | undefined>(() => {
    const selectedGroup = this.groups().find((g) => g._id === this.selectedGroupId());
    return selectedGroup?.resolvedFields?.map((f) => ({ key: f.key, value: f.value, type: f.type }));
  });

  readonly allocationBaseTotal = computed<number>(() => {
    const qtys = this.variantAllocationQtys();
    return this.groupVariants().reduce((sum, v) => {
      const qty = Number(qtys[v._id] || 0);
      const factor = Number(v.convertedQuantity || 1);
      const base = Math.round(qty * factor * 10000) / 10000;
      return Math.round((sum + base) * 10000) / 10000;
    }, 0);
  });

  readonly allocationValidationError = computed<string | null>(() => {
    if (!this.isVariantTrackedGroup()) return null;
    if (this.allocationBaseTotal() <= 0) return 'Allocate quantity to at least one variant.';
    return null;
  });

  readonly addStockOpen = signal(false);
  readonly correctionOpen = signal(false);
  readonly editStockOpen = signal(false);
  readonly deleteStockConfirmOpen = signal(false);
  readonly priceApprovalOpen = signal(false);
  readonly pendingPricingSuggestionsCount = signal(0);
  readonly totalPendingPricingSuggestionsCount = signal(0);
  readonly pendingInboxExpanded = signal(false);
  readonly pendingGroupSummaries = signal<Array<{ groupId: string; groupName: string; pendingCount: number; lastCreatedAt: string }>>([]);
  readonly selectedHistoryEntryId = signal<string | null>(null);
  readonly stockDetailsOpen = signal(false);
  readonly stockImpactVariantExpanded = signal(false);
  readonly selectedStockDetailsEntry = signal<StockHistoryEntry | null>(null);
  readonly submitMode: GomButtonContentMode = getButtonContentMode('primary-action');
  readonly cancelMode: GomButtonContentMode = getButtonContentMode('dismiss');
  private requestedGroupId = '';
  private shouldAutoOpenAddStock = false;

  readonly filtersForm = this.fb.group({
    groupId: ['', [Validators.required]],
  });

  readonly reorderForm = this.fb.group({
    reorderLevel: [0, [Validators.required, Validators.min(0)]],
  });

  readonly costingForm = this.fb.group({
    costingMethod: ['WAC' as 'WAC' | 'LATEST' | 'FIFO', [Validators.required]],
  });

  readonly costingMethodOptions: GomSelectOption[] = [
    { value: 'WAC', label: 'Weighted Average Cost (Default)' },
    { value: 'LATEST', label: 'Latest Cost' },
  ];

  readonly addStockForm = this.fb.group({
    baseQuantity: [null as number | null, [Validators.min(0)]],
    baseUnit: [{ value: '', disabled: true }],
    subQuantity: [null as number | null, [Validators.min(0)]],
    subUnit: [''],
    notes: [''],
  });

  readonly subUnitOptions = computed<GomSelectOption[]>(() => {
    const baseId = this.baseUnitId();
    const allOptions = this.filteredUnitOptions();
    // Exclude the base unit from subunit dropdown
    return allOptions.filter((opt) => opt.value !== baseId);
  });

  readonly editStockForm = this.fb.group({
    quantity: [null as number | null, [Validators.required]],
    unitId: ['', [Validators.required]],
    notes: [''],
  });

  readonly correctionForm = this.fb.group({
    quantityDelta: [null as number | null, [Validators.required, Validators.min(0.000001)]],
    unitId: ['', [Validators.required]],
    variantId: [''],
    correctionReason: ['DAMAGE' as 'DAMAGE' | 'RETURN' | 'EXPIRY' | 'OTHER', [Validators.required]],
    notes: [''],
  });

  readonly correctionReasonOptions: GomSelectOption[] = [
    { value: 'DAMAGE', label: 'Damage' },
    { value: 'RETURN', label: 'Return' },
    { value: 'EXPIRY', label: 'Expiry' },
    { value: 'OTHER', label: 'Other' },
  ];

  readonly correctionVariantOptions = computed<GomSelectOption[]>(() =>
    this.groupVariants().map((v) => ({ value: v._id, label: v.name }))
  );

  readonly columns: GomTableColumn<StockHistoryRow>[] = [
    { key: 'movementType', header: 'Type', sortable: true, filterable: true, width: '8rem' },
    { key: 'quantity', header: 'Quantity', sortable: true, width: '12rem' },
    {
      key: 'priceChanged',
      header: 'Price Change',
      width: '8rem',
      format: (_, row) => row.priceChanged,
      chipTone: (_, row) => (row.priceChanged === 'Yes' ? 'warning' : 'success'),
    },
    { key: 'actualPrice', header: 'Actual Price', width: '12rem' },
    { key: 'sellingPrice', header: 'Selling Price', width: '12rem' },
    { key: 'profit', header: 'Profit', width: '12rem' },
    {
      key: 'createdAt',
      header: 'Date',
      sortable: true,
      width: '12rem',
    },
    {
      key: 'actions',
      header: 'Actions',
      width: '6rem',
      actionButtons: [
        {
          label: () => 'View details',
          actionKey: 'view-details',
          variant: 'secondary',
          icon: () => 'ri-eye-line',
        },
      ],
    },
  ];

  readonly groupOptions = computed<GomSelectOption[]>(() =>
    this.groups().map((item) => ({
      value: item._id,
      label: item.name,
    }))
  );

  readonly baseUnitId = computed<string>(() => {
    const selectedGroup = this.groups().find((item) => item._id === this.selectedGroupId());
    return selectedGroup?.baseUnitId || '';
  });

  readonly filteredUnitOptions = computed<GomSelectOption[]>(() => {
    const selectedGroup = this.groups().find((item) => item._id === this.selectedGroupId());
    if (!selectedGroup) {
      return [];
    }

    const allowed = new Set([selectedGroup.baseUnitId, ...selectedGroup.allowedUnitIds].filter(Boolean));

    return this.units()
      .filter((unit) => allowed.has(unit._id))
      .map((unit) => {
        const isBase = unit._id === selectedGroup.baseUnitId;
        return { value: unit._id, label: `${unit.name} (${unit.symbol})${isBase ? ' [Base]' : ''}` };
      });
  });

  readonly rows = computed<StockHistoryRow[]>(() =>
    this.history().map((item, index, list) => {
      const pricing = this.getEntryPricingForTable(item);
      const priceChanged = pricing.changed ? 'Yes' : 'No';
      return {
        _id: item._id,
        movementType: item.movementType,
        quantity: this.formatHistoryQuantity(item),
        priceChanged,
        actualPrice: pricing.actual,
        sellingPrice: pricing.selling,
        profit: pricing.profit,
        createdAt: this.localDateTimePipe.transform(item.createdAt),
        rawEntry: item,
        actions: 'Actions',
      };
    })
  );

  ngOnInit(): void {
    this.requestedGroupId = this.route.snapshot.queryParamMap.get('groupId') || '';
    this.shouldAutoOpenAddStock = this.route.snapshot.queryParamMap.get('openAdd') === '1';
    this.loadInitialData();
  }

  loadInitialData(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    forkJoin({
      groups: this.stockService.listGroups(),
      units: this.stockService.listUnits(),
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
          this.onGroupSelectionChange(selectedGroupId);

          if (this.shouldAutoOpenAddStock) {
            this.shouldAutoOpenAddStock = false;
            this.openAddStock();
          }
        }

        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Failed to load stock setup data.');
        this.loading.set(false);
      },
    });
  }

  onGroupSelectionChange(groupId: string): void {
    this.selectedGroupId.set(groupId);
    this.filtersForm.patchValue({ groupId });

    if (!groupId) {
      this.summary.set(null);
      this.history.set([]);
      this.historyTotal.set(0);
      this.stockCreateUsed.set(0);
      this.variantStockInfo.set([]);
      this.pendingPricingSuggestionsCount.set(0);
      return;
    }

    this.loadStockData(groupId);
    this.loadPendingCount(groupId);
  }

  loadPendingCount(groupId: string): void {
    if (!groupId) return;
    this.stockService.listPricingRefreshSuggestions(groupId).subscribe({
      next: (res) => {
        const count = Number(res.pagination?.total || 0);
        this.pendingPricingSuggestionsCount.set(count);
        this.loadPendingGroupsSummary();
      },
      error: () => {
        this.pendingPricingSuggestionsCount.set(0);
        this.loadPendingGroupsSummary();
      },
    });
  }

  loadPendingGroupsSummary(): void {
    this.stockService.getPendingGroupsSummary().subscribe({
      next: (res) => {
        const data = res.data;
        const totalPending = Number(data?.totalPending ?? 0);
        this.totalPendingPricingSuggestionsCount.set(totalPending);
        this.pendingGroupSummaries.set(data?.groups ?? []);
        if (totalPending > 0 && !this.pendingInboxExpanded()) {
          this.pendingInboxExpanded.set(true);
        } else if (totalPending === 0) {
          this.pendingInboxExpanded.set(false);
        }
      },
      error: () => {
        this.totalPendingPricingSuggestionsCount.set(0);
        this.pendingGroupSummaries.set([]);
      },
    });
  }

  onInboxToggle(expanded: boolean): void {
    this.pendingInboxExpanded.set(expanded);
  }

  getPendingInboxSubtitle(): string {
    const groupCount = this.pendingGroupSummaries().length;
    if (groupCount > 0) {
      return `${groupCount} group${groupCount === 1 ? '' : 's'} awaiting review — prices will not change until approved`;
    }

    const totalPending = this.totalPendingPricingSuggestionsCount();
    return `${totalPending} update${totalPending === 1 ? '' : 's'} awaiting review — prices will not change until approved`;
  }

  getPendingGroupBadgeText(groupId: string, pendingCount: number): string {
    const group = this.groups().find((item) => item._id === groupId);
    const isGroupLevel = (group?.groupType || 'MEASURED') !== 'ATTRIBUTE';

    if (isGroupLevel) {
      return `${pendingCount} variant${pendingCount === 1 ? '' : 's'} affected`;
    }

    return `${pendingCount} pending`;
  }

  openPriceApprovalForGroup(groupId: string, groupName: string): void {
    this.openPriceApproval(groupId);
  }

  openPriceApproval(groupIdOverride?: string): void {
    const groupId = groupIdOverride || this.selectedGroupId();
    if (!groupId) {
      this.toast.warning('Please select a group first.');
      return;
    }

    if (this.selectedGroupId() !== groupId) {
      this.onGroupSelectionChange(groupId);
    }

    this.stockService.listPricingRefreshSuggestions(groupId).subscribe({
      next: (res) => {
        const count = Number(res.pagination?.total || 0);
        if (this.selectedGroupId() === groupId) {
          this.pendingPricingSuggestionsCount.set(count);
        }
        if (count > 0) {
          this.priceApprovalOpen.set(true);
          return;
        }

        this.priceApprovalOpen.set(false);
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
        // Close the pricing details modal to ensure fresh data when reopened
        this.closeStockHistoryDetails();
      this.loadPendingCount(groupId);
      this.loadStockData(groupId);
      return;
    }

    this.pendingPricingSuggestionsCount.set(0);
    this.totalPendingPricingSuggestionsCount.set(0);
    this.loadPendingGroupsSummary();
  }

  loadStockData(groupId: string): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.historyTablePageIndex.set(0);
    this.allHistoryLoaded.set(false);

    const requests: any = {
      summary: this.stockService.getSummary(groupId),
      costing: this.stockService.getCostingMethodConfig(groupId),
      history: this.stockService.getHistory({
        groupId,
        page: 1,
        limit: this.historyTablePageSize(),
      }),
    };

    // Load variant stock info for ATTRIBUTE/HYBRID groups
    if (this.showsVariantBreakdown()) {
      requests.variantStock = this.stockService.getVariantStockSummary(groupId);
    }

    forkJoin(requests).subscribe({
      next: (response: any) => {
        const { summary, costing, history, variantStock } = response;
        const pagination = history.pagination;
        this.summary.set(summary.data);
        this.historyTotal.set(Number(pagination.total || 0));
        this.stockCreateUsed.set(Number(pagination.total || 0));
        this.canLoadAllHistory.set(Boolean(pagination.canLoadAll) && Number(pagination.total || 0) <= 5000);
        this.allHistoryLoaded.set(Number(pagination.total || 0) <= 500);

        // Set variant stock info if loaded
        if (variantStock) {
          this.variantStockInfo.set(variantStock.data || []);
        } else {
          this.variantStockInfo.set([]);
        }

        if (Number(pagination.total || 0) <= 500 && Boolean(pagination.hasMore)) {
          this.stockService.getHistory({
            groupId,
            page: 1,
            limit: Number(pagination.total || 0),
          }).subscribe({
            next: (allRes) => this.history.set(allRes.data || []),
          });
        } else {
          this.history.set(history.data || []);
        }

        this.reorderForm.patchValue({
          reorderLevel: summary.data.reorderLevel,
        });
        this.costingForm.patchValue({
          costingMethod: costing.data.effectiveMethod,
        });
        // Mark form as pristine to enable dirty detection
        this.reorderForm.markAsPristine();
        this.costingForm.markAsPristine();
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Failed to load stock summary/history.');
        this.loading.set(false);
      },
    });
  }


  calculateMarginPercent(cost: number, selling: number): number {
    const safeSelling = Number(selling || 0);
    const safeCost = Number(cost || 0);
    if (!Number.isFinite(safeSelling) || safeSelling <= 0) {
      return 0;
    }
    return ((safeSelling - safeCost) / safeSelling) * 100;
  }

  calculateMarkupPercent(cost: number, selling: number): number {
    const safeSelling = Number(selling || 0);
    const safeCost = Number(cost || 0);
    if (!Number.isFinite(safeCost) || safeCost <= 0) {
      return 0;
    }
    return ((safeSelling - safeCost) / safeCost) * 100;
  }

  onHistoryTableQueryChange(query: GomTableQuery): void {
    if (this.historyTableDataMode() !== 'server') {
      return;
    }

    const groupId = this.selectedGroupId();
    if (!groupId) {
      return;
    }

    const normalizedSearch = String(query.searchTerm || '').trim().toUpperCase();
    const movementType = ['IN', 'OUT', 'ADJUST'].includes(normalizedSearch)
      ? (normalizedSearch as 'IN' | 'OUT' | 'ADJUST')
      : undefined;

    this.loading.set(true);
    this.stockService.getHistory({
      groupId,
      page: query.pageIndex + 1,
      limit: query.pageSize,
      transactionType: movementType,
    }).subscribe({
      next: (res) => {
        this.allHistoryLoaded.set(false);
        this.history.set(res.data || []);
        this.historyTotal.set(res.pagination.total);
        this.stockCreateUsed.set(Number(res.pagination.total || 0));
        this.canLoadAllHistory.set(Boolean(res.pagination.canLoadAll) && Number(res.pagination.total || 0) <= 5000);
        this.historyTablePageIndex.set(query.pageIndex);
        this.historyTablePageSize.set(query.pageSize);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  loadAllHistory(): void {
    const groupId = this.selectedGroupId();
    if (!groupId || this.historyTotal() > 5000) {
      return;
    }

    this.loading.set(true);
    this.stockService.getHistory({
      groupId,
      page: 1,
      limit: this.historyTotal(),
    }).subscribe({
      next: (res) => {
        this.history.set(res.data || []);
        this.historyTotal.set(res.pagination.total);
        this.stockCreateUsed.set(Number(res.pagination.total || 0));
        this.canLoadAllHistory.set(false);
        this.allHistoryLoaded.set(true);
        this.historyTablePageIndex.set(0);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  openAddStock(): void {
    if (!this.canCreateStock()) {
      return;
    }

    const remaining = this.stockCreateRemaining();
    if (remaining !== null && remaining <= 0) {
      const limit = this.stockCreateLimit();
      this.toast.error(`Stock entry limit reached. You have used ${this.stockCreateUsed()} of ${limit} allowed entries this month.`);
      return;
    }

    if (!this.selectedGroupId()) {
      this.toast.warning('Please select a group first.');
      return;
    }

    // Load pricing fields from selected group
    const selectedGroup = this.groups().find((g) => g._id === this.selectedGroupId());
    if (selectedGroup?.resolvedFields?.length) {
      this.currentGroupPricingFields.set(selectedGroup.resolvedFields);
      this.syncPricingForm(selectedGroup.resolvedFields);
      this.syncBulkVariantPricingForm(selectedGroup.resolvedFields);
    } else {
      this.currentGroupPricingFields.set([]);
      this.syncPricingForm([]);
      this.syncBulkVariantPricingForm([]);
    }

    if (this.isVariantTrackedGroup()) {
      this.loadGroupVariants(this.selectedGroupId());
    } else {
      this.groupVariants.set([]);
      this.variantAvailableMap.set({});
      this.variantAllocationQtys.set({});
    }

    this.setDefaultUnitIfNeeded();
    this.addStockOpen.set(true);
  }

  openCorrection(): void {
    if (!this.canCreateStock()) {
      return;
    }

    if (!this.selectedGroupId()) {
      this.toast.warning('Please select a group first.');
      return;
    }

    if (this.isVariantTrackedGroup()) {
      this.loadGroupVariants(this.selectedGroupId());
    } else {
      this.groupVariants.set([]);
    }

    this.correctionForm.reset({
      quantityDelta: null,
      unitId: this.baseUnitId(),
      variantId: '',
      correctionReason: 'DAMAGE',
      notes: '',
    });

    this.correctionOpen.set(true);
  }

  closeCorrection(): void {
    this.correctionOpen.set(false);
  }

  closeAddStock(): void {
    this.addStockOpen.set(false);
    this.currentGroupPricingFields.set([]);
    this.syncPricingForm([]);
    this.syncBulkVariantPricingForm([]);
    this.variantPricingForms.set({});
    this.bulkPricingApplyMode.set('EMPTY_ONLY');
    this.variantPricingMode.set('NONE');
    
    this.addStockForm.reset({
      baseQuantity: null,
      baseUnit: this.baseUnitId() || '',
      subQuantity: null,
      subUnit: '',
      notes: '',
    }, { emitEvent: true });
    // Re-enable baseUnit in case it was disabled
    this.addStockForm.controls.baseUnit.disable();
  }

  saveCorrection(): void {
    this.correctionForm.markAllAsTouched();
    if (this.correctionForm.invalid || !this.selectedGroupId()) {
      return;
    }

    const raw = this.correctionForm.getRawValue();
    const quantityDelta = Number(raw.quantityDelta || 0);
    const correctionReason = raw.correctionReason || 'DAMAGE';
    const unitId = String(raw.unitId || '').trim();
    const variantId = String(raw.variantId || '').trim();
    const notes = String(raw.notes || '').trim();

    if (!Number.isFinite(quantityDelta) || quantityDelta <= 0) {
      this.toast.error('Reduction quantity must be greater than zero.');
      return;
    }

    if (!unitId) {
      this.toast.error('Please select a unit.');
      return;
    }

    if (this.isVariantTrackedGroup() && !variantId) {
      this.toast.error('Please select a variant for this group.');
      return;
    }

    if (correctionReason === 'OTHER' && !notes) {
      this.toast.error('Notes are required when reason is Other.');
      return;
    }

    const payload: AdjustStockPayload = {
      groupId: this.selectedGroupId(),
      quantityDelta,
      unitId,
      correctionReason,
      notes: notes || undefined,
    };

    if (variantId) {
      payload.variantId = variantId;
    }

    this.saving.set(true);
    this.stockService.adjustStock(payload).subscribe({
      next: () => {
        this.toast.success('Stock correction recorded successfully.');
        this.closeCorrection();
        this.loadStockData(this.selectedGroupId());
        this.saving.set(false);
      },
      error: (error) => {
        this.toast.error(this.extractApiMessage(error) || 'Failed to record stock correction.');
        this.saving.set(false);
      },
    });
  }

  private syncPricingForm(fields: Array<{ fieldId: string; key: string; type: 'NUMBER' | 'PERCENTAGE'; value: number }>): void {
    Object.keys(this.pricingForm.controls).forEach((key) => this.pricingForm.removeControl(key));

    fields.forEach((field) => {
      this.pricingForm.addControl(
        field.key,
        // Pricing inputs in Add Stock should start empty so users enter values relevant to this stock event.
        this.fb.control<number | null>(null, [Validators.required, Validators.min(0)])
      );
    });
  }

  private syncBulkVariantPricingForm(fields: Array<{ fieldId: string; key: string; type: 'NUMBER' | 'PERCENTAGE'; value: number }>): void {
    Object.keys(this.bulkVariantPricingForm.controls).forEach((key) => this.bulkVariantPricingForm.removeControl(key));

    fields.forEach((field) => {
      this.bulkVariantPricingForm.addControl(
        field.key,
        this.fb.control<number | null>(null, [Validators.min(0)])
      );
    });
  }

  getAllocatedVariants(): StockVariantItem[] {
    return this.groupVariants().filter((variant) => this.getAllocationQty(variant._id) > 0);
  }

  setVariantPricingMode(mode: 'NONE' | 'BULK' | 'CUSTOM'): void {
    this.variantPricingMode.set(mode);
  }

  setBulkPricingApplyMode(mode: 'EMPTY_ONLY' | 'OVERWRITE_ALL'): void {
    this.bulkPricingApplyMode.set(mode);
  }

  applyBulkPricingToAllocatedVariants(): void {
    const activeVariants = this.getAllocatedVariants();
    if (!activeVariants.length) {
      this.toast.warning('Allocate quantity to at least one variant first.');
      return;
    }

    const bulkValues = this.bulkVariantPricingForm.getRawValue();
    const candidateKeys = this.currentGroupPricingFields()
      .map((field) => field.key)
      .filter((key) => {
        const value = bulkValues[key];
        return value !== null && value !== undefined && Number.isFinite(Number(value));
      });

    if (!candidateKeys.length) {
      this.toast.warning('Enter at least one pricing value to apply.');
      return;
    }

    const onlyEmpty = this.bulkPricingApplyMode() === 'EMPTY_ONLY';
    let updatedFieldCount = 0;

    activeVariants.forEach((variant) => {
      const pricingForm = this.getVariantPricingForm(variant._id);
      candidateKeys.forEach((key) => {
        const control = pricingForm.controls[key];
        if (!control) {
          return;
        }

        const existing = control.value;
        const hasExistingValue = existing !== null && existing !== undefined && Number.isFinite(Number(existing));
        if (onlyEmpty && hasExistingValue) {
          return;
        }

        const nextValue = Number(bulkValues[key]);
        control.setValue(Number.isFinite(nextValue) ? nextValue : null);
        updatedFieldCount += 1;
      });
    });

    if (!updatedFieldCount) {
      this.toast.warning('No pricing fields were updated. Try Overwrite all mode.');
      return;
    }

    this.toast.success(`Applied pricing to ${updatedFieldCount} field value${updatedFieldCount === 1 ? '' : 's'}.`);
  }

  saveAddStock(): void {
    if (!this.canCreateStock()) {
      return;
    }

    this.pricingForm.markAllAsTouched();

    // ─── Variant-tracked group path (ATTRIBUTE / HYBRID) ───
    if (this.isVariantTrackedGroup()) {
      this.saveAddStockForVariantTrackedGroup();
      return;
    }

    // ─── Measured group path ───
    this.addStockForm.markAllAsTouched();
    if (this.addStockForm.invalid || this.pricingForm.invalid || !this.selectedGroupId()) {
      return;
    }

    const validationError = this.getAddStockValidationError();
    if (validationError) {
      this.toast.error(validationError);
      return;
    }

    const finalQty = this.getFinalConvertedQuantity();
    if (finalQty === null || !Number.isFinite(finalQty) || finalQty <= 0) {
      this.toast.error('Invalid quantity. Please check your entries.');
      return;
    }

    const baseId = this.baseUnitId();
    if (!baseId) {
      this.toast.error('Base unit not found for this group.');
      return;
    }

    const pricingFieldValues = this.pricingForm.getRawValue();
    const changedPricingFields = this.buildChangedPricingFields(pricingFieldValues, finalQty);
    const stockRequest = this.stockService.addStock({
      groupId: this.selectedGroupId(),
      quantity: finalQty,
      unitId: baseId,
      costComponents: this.buildCostComponentsPayload(pricingFieldValues),
      notes: String(this.addStockForm.getRawValue().notes || '').trim() || undefined,
    });

    this.saving.set(true);
    this.executeStockSaveRequest(stockRequest, changedPricingFields);
  }

  private saveAddStockForVariantTrackedGroup(): void {
    const groupId = this.selectedGroupId();
    if (!groupId) {
      return;
    }

    const allocError = this.allocationValidationError();
    if (allocError) {
      this.toast.error(allocError);
      return;
    }

    const baseId = this.baseUnitId();
    if (!baseId) {
      this.toast.error('Base unit not found for this group.');
      return;
    }

    const notes = String(this.addStockForm.getRawValue().notes || '').trim() || undefined;
    const allocations = this.groupVariants()
      .map((v) => ({ variantId: v._id, quantity: Number(this.variantAllocationQtys()[v._id] || 0), variant: v }))
      .filter((a) => a.quantity > 0);

    const dedupedAllocations = allocations.reduce<Array<{ variantId: string; quantity: number; variant: StockVariantItem }>>((acc, item) => {
      const existing = acc.find((x) => x.variantId === item.variantId);
      if (existing) {
        existing.quantity += item.quantity;
      } else {
        acc.push({ ...item });
      }
      return acc;
    }, []);

    if (!dedupedAllocations.length) {
      this.toast.error('Allocate quantity to at least one variant.');
      return;
    }

    const pricingMode = this.variantPricingMode();
    if (pricingMode === 'BULK' && this.bulkVariantPricingForm.invalid) {
      this.bulkVariantPricingForm.markAllAsTouched();
      return;
    }

    if (pricingMode === 'CUSTOM') {
      const invalidVariant = dedupedAllocations.find((a) => this.getVariantPricingForm(a.variantId).invalid);
      if (invalidVariant) {
        this.getVariantPricingForm(invalidVariant.variantId).markAllAsTouched();
        return;
      }
    }

    const bulkValues = this.bulkVariantPricingForm.getRawValue();
    const pricingKeys = this.currentGroupPricingFields().map((field) => field.key);
    const bulkValuesAsRecord = pricingKeys.reduce<Record<string, number | null>>((acc, key) => {
      const raw = bulkValues[key];
      acc[key] = raw === null || raw === undefined ? null : Number(raw);
      return acc;
    }, {});

    if (pricingMode === 'BULK') {
      const hasAtLeastOneBulkValue = pricingKeys.some((key) => {
        const value = bulkValuesAsRecord[key];
        return value !== null && value !== undefined && Number.isFinite(Number(value));
      });
      if (!hasAtLeastOneBulkValue) {
        this.toast.warning('Enter at least one bulk pricing value or switch to No pricing update.');
        return;
      }
    }

    const requests = dedupedAllocations.map((allocation) => {
      let variantPricingValues: Record<string, number | null> = {};
      if (pricingMode === 'BULK') {
        variantPricingValues = bulkValuesAsRecord;
      } else if (pricingMode === 'CUSTOM') {
        variantPricingValues = this.getVariantPricingForm(allocation.variantId).getRawValue();
      }

      return this.stockService.addStock({
        groupId,
        quantity: allocation.quantity * Number(allocation.variant.quantity || 0),
        unitId: allocation.variant.unitId || baseId,
        variantId: allocation.variantId,
        costComponents: this.buildCostComponentsPayload(variantPricingValues),
        notes,
      });
    });

    this.saving.set(true);
    from(requests).pipe(
      concatMap((request) => request),
      toArray()
    ).subscribe({
      next: () => {
        this.toast.success('Stock added successfully.');
        this.closeAddStock();
        this.loadStockData(groupId);
        this.loadPendingCount(groupId);
        this.saving.set(false);
      },
      error: (error) => {
        this.toast.error(this.extractApiMessage(error) || 'Failed to add stock for one or more variants.');
        this.saving.set(false);
      },
    });
  }

  saveReorderLevel(): void {
    this.reorderForm.markAllAsTouched();
    if (this.reorderForm.invalid || !this.selectedGroupId()) {
      return;
    }

    const reorderLevel = Number(this.reorderForm.controls.reorderLevel.value);
    this.saving.set(true);

    this.stockService.updateReorderLevel(this.selectedGroupId(), reorderLevel).subscribe({
      next: () => {
        this.toast.success('Reorder level updated.');
        this.reorderForm.markAsPristine();
        this.loadStockData(this.selectedGroupId());
        this.saving.set(false);
      },
      error: () => {
        this.toast.error('Failed to update reorder level.');
        this.saving.set(false);
      },
    });
  }

  saveCostingMethod(): void {
    this.costingForm.markAllAsTouched();
    if (this.costingForm.invalid || !this.selectedGroupId()) {
      return;
    }

    const costingMethod = this.costingForm.controls.costingMethod.value;
    if (!costingMethod) {
      return;
    }

    this.saving.set(true);
    this.stockService.updateGroupCostingMethod(this.selectedGroupId(), costingMethod).subscribe({
      next: () => {
        this.toast.success('Costing method updated.');
        this.costingForm.markAsPristine();
        this.loadStockData(this.selectedGroupId());
        this.saving.set(false);
      },
      error: (error) => {
        this.toast.error(this.extractApiMessage(error) || 'Failed to update costing method.');
        this.saving.set(false);
      },
    });
  }

  onRowAction(event: { actionKey: string; row: GomTableRow }): void {
    const id = typeof event.row['_id'] === 'string' ? event.row['_id'] : '';
    const entry = this.history().find((item) => item._id === id);
    if (!entry) {
      return;
    }

    if (event.actionKey === 'view-details') {
      this.openStockHistoryDetails(entry);
    }
  }

  openStockHistoryDetails(entry: StockHistoryEntry): void {
    this.selectedStockDetailsEntry.set(entry);
    this.stockDetailsOpen.set(true);
  }

  closeStockHistoryDetails(): void {
    this.stockDetailsOpen.set(false);
    this.stockImpactVariantExpanded.set(false);
    this.selectedStockDetailsEntry.set(null);
  }

  getImpactChangeCount(entry: StockHistoryEntry | null): number {
    if (!entry?.pricingImpact?.variantChanges?.length) {
      return 0;
    }
    return entry.pricingImpact.variantChanges.length;
  }

  getImpactBeforeTotals(entry: StockHistoryEntry | null): { selling: number; actual: number; profit: number } {
    const changes = entry?.pricingImpact?.variantChanges || [];
    return changes.reduce((acc, change) => {
      acc.selling += Number(change?.before?.sellingPrice || 0);
      acc.actual += Number(change?.before?.actualPrice || 0);
      acc.profit += Number(change?.before?.profitValue || 0);
      return acc;
    }, { selling: 0, actual: 0, profit: 0 });
  }

  getImpactAfterTotals(entry: StockHistoryEntry | null): { selling: number; actual: number; profit: number } {
    const changes = entry?.pricingImpact?.variantChanges || [];
    return changes.reduce((acc, change) => {
      acc.selling += Number(change?.after?.sellingPrice || 0);
      acc.actual += Number(change?.after?.actualPrice || 0);
      acc.profit += Number(change?.after?.profitValue || 0);
      return acc;
    }, { selling: 0, actual: 0, profit: 0 });
  }

  getImpactTotalMarkupPercent(entry: StockHistoryEntry | null): number {
    const after = this.getImpactAfterTotals(entry);
    return this.calculateMarkupPercent(after.actual, after.selling);
  }

  getCostFormula(entry: StockHistoryEntry): string {
    const components = entry.costComponents || [];
    if (!components.length) {
      return 'No pricing inputs were captured for this movement.';
    }

    const labels = components.map((component) => this.getCostComponentLabel(component.label, component.key));
    const total = Number(entry.costSummary?.totalCost || 0);
    return `${labels.join(' + ')} = ${this.formatCurrency(total)}`;
  }

  getCostPerBaseFormula(entry: StockHistoryEntry): string {
    const costPerBase = Number(entry.costSummary?.costPerBaseUnit || 0);
    const totalCost = Number(entry.costSummary?.totalCost || 0);
    const baseQty = Number(entry.convertedQuantityInBase || 0);

    if (!Number.isFinite(baseQty) || baseQty === 0) {
      return `Cost per base unit: ${this.formatCurrency(costPerBase)}`;
    }

    return `${this.formatCurrency(totalCost)} / ${this.formatNumber(baseQty)} = ${this.formatCurrency(costPerBase)}`;
  }

  private formatHistoryQuantity(entry: StockHistoryEntry): string {
    const main = `${this.formatNumber(entry.quantity)} ${entry.unitId?.symbol || ''}`.trim();
    const base = Number(entry.convertedQuantityInBase || 0);
    if (!Number.isFinite(base)) {
      return main;
    }
    if (Math.abs(Number(entry.quantity || 0) - base) < 0.0001) {
      return main;
    }
    const baseUnitSymbol = this.getBaseUnitSymbol();
    return `${main} (${this.formatNumber(base)} ${baseUnitSymbol || 'base'})`;
  }

  private getEntryPricingForTable(entry: StockHistoryEntry): {
    changed: boolean;
    actual: string;
    selling: string;
    profit: string;
  } {
    const changes = entry.pricingImpact?.variantChanges || [];
    if (!changes.length) {
      const same = this.formatCurrency(0);
      return {
        changed: false,
        actual: same,
        selling: same,
        profit: same,
      };
    }

    const before = changes.reduce((acc, item) => {
      acc.actual += Number(item?.before?.actualPrice || 0);
      acc.selling += Number(item?.before?.sellingPrice || 0);
      acc.profit += Number(item?.before?.profitValue || 0);
      return acc;
    }, { actual: 0, selling: 0, profit: 0 });

    const after = changes.reduce((acc, item) => {
      acc.actual += Number(item?.after?.actualPrice || 0);
      acc.selling += Number(item?.after?.sellingPrice || 0);
      acc.profit += Number(item?.after?.profitValue || 0);
      return acc;
    }, { actual: 0, selling: 0, profit: 0 });

    const changed = changes.some((item) => {
      const deltaActual = Number(item?.delta?.actualPrice || 0);
      const deltaSelling = Number(item?.delta?.sellingPrice || 0);
      const deltaProfit = Number(item?.delta?.profitValue || 0);
      return Math.abs(deltaActual) > 0.0001 || Math.abs(deltaSelling) > 0.0001 || Math.abs(deltaProfit) > 0.0001;
    });

    const formatPair = (oldValue: number, newValue: number) => {
      if (!changed) {
        return this.formatCurrency(newValue);
      }
      return `${this.formatCurrency(oldValue)} / ${this.formatCurrency(newValue)}`;
    };

    return {
      changed,
      actual: formatPair(before.actual, after.actual),
      selling: formatPair(before.selling, after.selling),
      profit: formatPair(before.profit, after.profit),
    };
  }

  getCostComponentLabel(label: string | undefined, key: string): string {
    const source = String(label || key || '').trim();
    if (!source) {
      return 'Component';
    }

    return source
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replaceAll('_', ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^./, (char) => char.toUpperCase());
  }

  formatCurrency(value: number): string {
    if (!Number.isFinite(value)) {
      return '-';
    }

    return value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  openEditStock(entry: StockHistoryEntry): void {
    this.selectedHistoryEntryId.set(entry._id);
    this.editStockForm.reset({
      quantity: entry.quantity,
      unitId: entry.unitId?._id || '',
      notes: entry.notes || '',
    });
    this.editStockOpen.set(true);
  }

  closeEditStock(): void {
    this.editStockOpen.set(false);
    this.selectedHistoryEntryId.set(null);
  }

  saveEditStock(): void {
    if (!this.canUpdateStock()) {
      return;
    }

    this.editStockForm.markAllAsTouched();
    const entryId = this.selectedHistoryEntryId();

    if (this.editStockForm.invalid || !entryId) {
      return;
    }

    const formValue = this.editStockForm.getRawValue();
    this.saving.set(true);

    this.stockService.updateStockEntry(entryId, {
      quantity: Number(formValue.quantity),
      unitId: formValue.unitId || '',
      notes: formValue.notes?.trim() || undefined,
    }).subscribe({
      next: () => {
        this.toast.success('Stock entry updated successfully.');
        this.closeEditStock();
        this.loadStockData(this.selectedGroupId());
        this.saving.set(false);
      },
      error: (error) => {
        this.toast.error(this.extractApiMessage(error) || 'Failed to update stock entry.');
        this.saving.set(false);
      },
    });
  }

  cancelDeleteStock(): void {
    this.deleteStockConfirmOpen.set(false);
    this.selectedHistoryEntryId.set(null);
  }

  confirmDeleteStock(): void {
    if (!this.canDeleteStock()) {
      return;
    }

    const entryId = this.selectedHistoryEntryId();
    if (!entryId) {
      return;
    }

    this.saving.set(true);
    this.deleteStockConfirmOpen.set(false);

    this.stockService.deleteStockEntry(entryId).subscribe({
      next: () => {
        this.toast.success('Stock entry deleted successfully.');
        this.selectedHistoryEntryId.set(null);
        this.loadStockData(this.selectedGroupId());
        this.saving.set(false);
      },
      error: (error) => {
        this.toast.error(this.extractApiMessage(error) || 'Failed to delete stock entry.');
        this.saving.set(false);
      },
    });
  }

  getDeleteMessage(): string {
    return 'Are you sure you want to delete this stock history entry?';
  }

  isAddStockSaveDisabled(): boolean {
    if (this.saving() || !this.selectedGroupId()) return true;
    if (this.isVariantTrackedGroup()) {
      const activeVariants = this.groupVariants().filter((v) => this.getAllocationQty(v._id) > 0);
      if (!activeVariants.length) {
        return true;
      }

      const mode = this.variantPricingMode();
      if (mode === 'BULK') {
        return this.allocationBaseTotal() <= 0 || !!this.allocationValidationError() || this.bulkVariantPricingForm.invalid;
      }

      if (mode === 'CUSTOM') {
        const hasInvalidVariantForm = activeVariants.some((v) => this.getVariantPricingForm(v._id).invalid);
        return this.allocationBaseTotal() <= 0 || !!this.allocationValidationError() || hasInvalidVariantForm;
      }

      return this.allocationBaseTotal() <= 0 || !!this.allocationValidationError();
    }
    return this.addStockForm.invalid || this.pricingForm.invalid || !!this.getAddStockValidationError();
  }

  isEditStockSaveDisabled(): boolean {
    return this.saving() || !this.canUpdateStock() || this.editStockForm.invalid || !this.selectedHistoryEntryId();
  }

  isCorrectionSaveDisabled(): boolean {
    return this.saving() || this.correctionForm.invalid || !this.selectedGroupId();
  }

  shouldShowIcon(mode: GomButtonContentMode): boolean {
    return showButtonIcon(mode);
  }

  shouldShowText(mode: GomButtonContentMode): boolean {
    return showButtonText(mode);
  }

  private extractApiMessage(error: unknown): string {
    const maybeMessage = (error as { error?: { message?: string } })?.error?.message;
    return typeof maybeMessage === 'string' ? maybeMessage : '';
  }

  private setDefaultUnitIfNeeded(): void {
    const baseId = this.baseUnitId();
    this.addStockForm.patchValue({ baseUnit: baseId || '' }, { emitEvent: false });

    const subUnit = String(this.addStockForm.controls.subUnit.value || '').trim();
    const validSubUnit = this.subUnitOptions().some((item) => item.value === subUnit);
    if (!validSubUnit) {
      this.addStockForm.patchValue({ subUnit: '' }, { emitEvent: false });
    }
  }

  getBaseUnitSymbol(): string {
    const baseId = this.baseUnitId();
    if (!baseId) {
      return '';
    }

    return this.units().find((unit) => unit._id === baseId)?.symbol || '';
  }

  getFinalConvertedQuantity(): number | null {
    const safeBase = this.getPositiveNumber(this.addStockForm.controls.baseQuantity.value);
    const safeSub = this.getPositiveNumber(this.addStockForm.controls.subQuantity.value);
    const subUnitId = String(this.addStockForm.controls.subUnit.value || '').trim();

    const convertedSub = this.convertSubQuantityToBase(safeSub, subUnitId);
    const total = safeBase + convertedSub;
    return total > 0 ? total : null;
  }

  private getAddStockValidationError(): string | null {
    const baseValue = this.addStockForm.controls.baseQuantity.value;
    const subValue = this.addStockForm.controls.subQuantity.value;
    const subUnitId = String(this.addStockForm.controls.subUnit.value || '').trim();

    const baseQty = Number(baseValue ?? 0);
    const subQty = Number(subValue ?? 0);
    const hasBase = Number.isFinite(baseQty) && baseQty > 0;
    const hasSubQty = Number.isFinite(subQty) && subQty > 0;

    if (!hasBase && !hasSubQty) {
      return 'Enter base quantity or additional quantity.';
    }

    if (hasSubQty && !subUnitId) {
      return 'Please select a unit for additional quantity.';
    }

    return null;
  }

  private getPositiveNumber(value: unknown): number {
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }

  private convertSubQuantityToBase(subQuantity: number, subUnitId: string): number {
    if (subQuantity <= 0 || !subUnitId) {
      return 0;
    }

    const subUnit = this.units().find((u) => u._id === subUnitId);
    if (!subUnit) {
      return 0;
    }

    const factor = Number(subUnit.conversionFactor ?? 0);
    if (!Number.isFinite(factor) || factor <= 0) {
      return 0;
    }

    return factor >= 1 ? subQuantity / factor : subQuantity * factor;
  }

  formatNumber(value: number): string {
    return Number.isFinite(value) ? value.toLocaleString(undefined, { maximumFractionDigits: 4 }) : '-';
  }

  private buildChangedPricingFields(
    pricingFieldValues: Record<string, number | null>,
    baseQuantityForNormalization: number
  ): Array<{ fieldId: string; value: number }> {
    const safeBaseQuantity = Number.isFinite(baseQuantityForNormalization) && baseQuantityForNormalization > 0
      ? baseQuantityForNormalization
      : 0;

    return this.currentGroupPricingFields()
      .map((field) => ({
        fieldId: field.fieldId,
        previousValue: Number(field.value),
        value: (
          pricingFieldValues[field.key] === null
          || pricingFieldValues[field.key] === undefined
        )
          ? Number.NaN
          : Number(pricingFieldValues[field.key]),
        type: field.type,
      }))
      .filter((field) => Number.isFinite(field.value))
      .map((field) => {
        const nextValue = field.type === 'NUMBER' && safeBaseQuantity > 0
          ? Number((field.value / safeBaseQuantity).toFixed(6))
          : field.value;

        return {
          fieldId: field.fieldId,
          previousValue: field.previousValue,
          value: nextValue,
        };
      })
      .filter((field) => field.value !== field.previousValue)
      .map((field) => ({ fieldId: field.fieldId, value: field.value }));
  }

  private buildCostComponentsPayload(pricingFieldValues: Record<string, number | null>): Array<{ key: string; label: string; value: number; isRequired: boolean }> {
    return this.currentGroupPricingFields()
      .map((field) => {
        const raw = pricingFieldValues[field.key];
        if (raw === null || raw === undefined) return null;
        const rawValue = Number(raw);
        if (!Number.isFinite(rawValue)) return null;
        return { key: field.key, label: field.key, value: rawValue, isRequired: false };
      })
      .filter((item): item is { key: string; label: string; value: number; isRequired: boolean } => !!item);
  }

  private executeStockSaveRequest(
    stockRequest: Observable<unknown>,
    changedPricingFields: Array<{ fieldId: string; value: number }>
  ): void {
    const sourceGroupId = this.selectedGroupId();
    if (!sourceGroupId) {
      this.toast.warning('Please select a group first.');
      return;
    }

    const hadPendingBeforeSave = this.pendingPricingSuggestionsCount() > 0;
    const isManualRefresh = this.selectedGroupPricingMode() === 'MANUAL_REFRESH';
    const isFixed = this.selectedGroupPricingMode() === 'FIXED';
    // In MANUAL_REFRESH mode, stock cost changes can generate suggestions even without editing pricing inputs.
    // AUTO_REFRESH applies prices immediately (no suggestions). FIXED never recalculates and never updates group pricing.
    const shouldRecheckSuggestions = isManualRefresh;

    // In FIXED mode, group pricing fields should never be updated automatically, even if user provided cost components
    const shouldUpdateGroupFields = !isFixed && changedPricingFields.length > 0;

    if (!shouldUpdateGroupFields) {
      stockRequest.subscribe({
        next: (response) => {
          this.toast.success('Stock added successfully.');
          this.closeAddStock();
          this.loadStockData(sourceGroupId);
          const suggestionCountFromResponse = this.extractSuggestionCountFromStockResponse(response);
          this.loadPendingCount(sourceGroupId);
          if (suggestionCountFromResponse > 0) {
            this.toast.info('Price suggestions are pending approval.');
            this.openPriceApproval(sourceGroupId);
          }
          // Re-check suggestions for MANUAL_REFRESH stock events, or when there were already pending items.
          if (shouldRecheckSuggestions || hadPendingBeforeSave) {
            this.schedulePendingSuggestionsModalRefresh(
              sourceGroupId,
              shouldRecheckSuggestions || suggestionCountFromResponse > 0
            );
          }
          this.saving.set(false);
        },
        error: () => {
          this.toast.error('Failed to add stock.');
          this.saving.set(false);
        },
      });
      return;
    }

    this.stockService
      .updateGroupResolvedFields(sourceGroupId, changedPricingFields)
      .pipe(switchMap(() => stockRequest))
      .subscribe({
      next: (response) => {
        this.toast.success('Stock added and pricing updated successfully.');
        this.closeAddStock();
        this.loadStockData(sourceGroupId);
        const suggestionCountFromResponse = this.extractSuggestionCountFromStockResponse(response);
        this.loadPendingCount(sourceGroupId);
        if (suggestionCountFromResponse > 0) {
          this.toast.info('Price suggestions are pending approval.');
          this.openPriceApproval(sourceGroupId);
        }
        // Re-check suggestions for MANUAL_REFRESH stock events, or when there were already pending items.
        if (shouldRecheckSuggestions || hadPendingBeforeSave) {
          this.schedulePendingSuggestionsModalRefresh(
            sourceGroupId,
            shouldRecheckSuggestions || suggestionCountFromResponse > 0
          );
        }
        this.saving.set(false);
      },
      error: () => {
        this.toast.error('Failed to add stock. Pricing fields may not have been updated.');
        this.saving.set(false);
      },
    });
  }

  private schedulePendingSuggestionsModalRefresh(groupId: string, expectPending: boolean): void {
    // Give add-stock modal close animation time before opening approval modal.
    // expectPending=true → longer polling window for slow backends.
    // expectPending=false → short re-check for pre-existing suggestions.
    setTimeout(() => {
      this.refreshPendingSuggestionsAndOpenModal(groupId, expectPending ? 30 : 5, expectPending);
    }, 180);
  }

  private extractSuggestionCountFromStockResponse(response: unknown): number {
    const count = Number((response as { data?: { pricingImpact?: { suggestionCount?: number } } })?.data?.pricingImpact?.suggestionCount || 0);
    return Number.isFinite(count) ? count : 0;
  }

  private refreshPendingSuggestionsAndOpenModal(groupId: string, attemptsRemaining: number, expectPending: boolean): void {
    this.stockService.listPricingRefreshSuggestions(groupId).subscribe({
      next: (res) => {
        const count = Number(res.pagination?.total || 0);
        if (this.selectedGroupId() === groupId) {
          this.pendingPricingSuggestionsCount.set(count);
        }

        if (count > 0) {
          if (this.selectedGroupId() !== groupId) {
            this.onGroupSelectionChange(groupId);
          }
          this.loadPendingGroupsSummary();
          if (!this.priceApprovalOpen()) {
            this.toast.info('Price suggestions are pending approval.');
          }
          this.priceApprovalOpen.set(true);
          return;
        }

        if (attemptsRemaining > 1) {
          setTimeout(() => this.refreshPendingSuggestionsAndOpenModal(groupId, attemptsRemaining - 1, expectPending), 300);
          return;
        }

        if (expectPending) {
          this.loadPendingGroupsSummary();
        }
      },
      error: () => {
        if (this.selectedGroupId() === groupId) {
          this.pendingPricingSuggestionsCount.set(0);
        }
        if (attemptsRemaining > 1) {
          setTimeout(() => this.refreshPendingSuggestionsAndOpenModal(groupId, attemptsRemaining - 1, expectPending), 300);
          return;
        }

        if (expectPending) {
          this.loadPendingGroupsSummary();
        }
      },
    });
  }

  private loadGroupVariants(groupId: string): void {
    this.groupVariants.set([]);
    this.variantAllocationQtys.set({});
    this.variantAvailableMap.set({});
    this.variantPricingForms.set({});

    this.stockService.listVariantsByGroup(groupId).subscribe({
      next: (res) => {
        this.groupVariants.set(res.data || []);
        const pricingForms: Record<string, PricingRecordForm> = {};
        (res.data || []).forEach((variant) => {
          pricingForms[variant._id] = this.createPricingFormForFields(this.currentGroupPricingFields());
        });
        this.variantPricingForms.set(pricingForms);
        this.stockService.getVariantStockSummary(groupId).subscribe({
          next: (stockRes) => {
            const map: Record<string, number> = {};
            (stockRes.data || []).forEach((item: VariantStockInfo) => {
              map[item.variantId] = Math.max(0, item.available);
            });
            this.variantAvailableMap.set(map);
          },
          error: () => {},
        });
      },
      error: () => {},
    });
  }

  onAllocationInput(variantId: string, event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    const qty = Math.max(0, Number.isFinite(value) ? value : 0);
    this.variantAllocationQtys.update((current) => ({
      ...current,
      [variantId]: qty,
    }));
  }

  getAllocationQty(variantId: string): number {
    return Number(this.variantAllocationQtys()[variantId] || 0);
  }

  getVariantAvailable(variantId: string): string {
    const map = this.variantAvailableMap();
    if (!(variantId in map)) return '–';
    return String(Math.max(0, Number(map[variantId] || 0)));
  }

  getVariantUnitSymbol(unitId: string): string {
    return this.units().find((u) => u._id === unitId)?.symbol || '';
  }

  getVariantPricingForm(variantId: string): PricingRecordForm {
    const forms = this.variantPricingForms();
    const existing = forms[variantId];
    if (existing) {
      return existing;
    }

    const created = this.createPricingFormForFields(this.currentGroupPricingFields());
    this.variantPricingForms.set({
      ...forms,
      [variantId]: created,
    });
    return created;
  }

  private createPricingFormForFields(fields: Array<{ fieldId: string; key: string; type: 'NUMBER' | 'PERCENTAGE'; value: number }>): PricingRecordForm {
    const form = this.fb.record<FormControl<number | null>>({});
    fields.forEach((field) => {
      form.addControl(field.key, this.fb.control<number | null>(null, [Validators.min(0)]));
    });
    return form;
  }
}
