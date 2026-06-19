import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';

import {
  FormControlsModule,
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
import {
  Group,
  StockHistoryEntry,
  StockService,
  StockSummary,
  Unit,
} from './stock.service';
import { LocalDateTimePipe } from '../../../shared/pipes/local-date-time.pipe';
import { DisableIfNoFeatureDirective } from '../../../shared/directives/disable-if-no-feature.directive';

interface StockHistoryRow extends GomTableRow {
  _id: string;
  movementType: string;
  quantity: string;
  baseQuantity: string;
  notes: string;
  createdAt: string;
  actions: string;
}

@Component({
  selector: 'gom-stock',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormControlsModule,
    DisableIfNoFeatureDirective,
    GomButtonComponent,
    GomTableComponent,
    GomModalComponent,
    GomConfirmationModalComponent,
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
  private readonly localDateTimePipe = new LocalDateTimePipe();

  readonly loading = signal(false);
  readonly canCreateStock = computed(() => this.authSession.hasFeature('stock.create') && (this.stockCreateRemaining() ?? Infinity) > 0);
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

  readonly addStockOpen = signal(false);
  readonly editStockOpen = signal(false);
  readonly deleteStockConfirmOpen = signal(false);
  readonly selectedHistoryEntryId = signal<string | null>(null);
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

  readonly columns: GomTableColumn<StockHistoryRow>[] = [
    { key: 'movementType', header: 'Type', sortable: true, filterable: true, width: '8rem' },
    { key: 'quantity', header: 'Quantity', sortable: true, width: '10rem' },
    { key: 'baseQuantity', header: 'Base Qty', sortable: true, width: '10rem' },
    { key: 'notes', header: 'Notes', width: '14rem' },
    { key: 'createdAt', header: 'Date', sortable: true, width: '11rem' },
    {
      key: 'actions',
      header: 'Actions',
      width: '10rem',
      actionButtons: [
        {
          label: () => this.canUpdateStock() ? 'Edit' : 'No permission to edit stock entries',
          actionKey: 'edit',
          variant: 'secondary',
          disabled: () => !this.canUpdateStock(),
        },
        {
          label: () => this.canDeleteStock() ? 'Delete' : 'No permission to delete stock entries',
          actionKey: 'delete',
          variant: 'secondary',
          disabled: () => !this.canDeleteStock(),
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
    this.history().map((item) => ({
      _id: item._id,
      movementType: item.movementType,
      quantity: `${this.formatNumber(item.quantity)} ${item.unitId?.symbol || ''}`.trim(),
      baseQuantity: this.formatNumber(item.convertedQuantityInBase),
      notes: item.notes || '-',
      createdAt: this.localDateTimePipe.transform(item.createdAt),
      actions: 'Actions',
    }))
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
      return;
    }

    this.loadStockData(groupId);
  }

  loadStockData(groupId: string): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.historyTablePageIndex.set(0);
    this.allHistoryLoaded.set(false);

    forkJoin({
      summary: this.stockService.getSummary(groupId),
      history: this.stockService.getHistory({
        groupId,
        page: 1,
        limit: this.historyTablePageSize(),
      }),
    }).subscribe({
      next: ({ summary, history }) => {
        const pagination = history.pagination;
        this.summary.set(summary.data);
        this.historyTotal.set(Number(pagination.total || 0));
        this.stockCreateUsed.set(Number(pagination.total || 0));
        this.canLoadAllHistory.set(Boolean(pagination.canLoadAll) && Number(pagination.total || 0) <= 5000);
        this.allHistoryLoaded.set(Number(pagination.total || 0) <= 500);

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
        // Mark form as pristine to enable dirty detection
        this.reorderForm.markAsPristine();
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Failed to load stock summary/history.');
        this.loading.set(false);
      },
    });
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

    if (!this.selectedGroupId()) {
      this.toast.warning('Please select a group first.');
      return;
    }

    // Load pricing fields from selected group
    const selectedGroup = this.groups().find((g) => g._id === this.selectedGroupId());
    if (selectedGroup?.resolvedFields?.length) {
      this.currentGroupPricingFields.set(selectedGroup.resolvedFields);
      this.syncPricingForm(selectedGroup.resolvedFields);
    } else {
      this.currentGroupPricingFields.set([]);
      this.syncPricingForm([]);
    }

    this.setDefaultUnitIfNeeded();
    this.addStockOpen.set(true);
  }

  closeAddStock(): void {
    this.addStockOpen.set(false);
    this.currentGroupPricingFields.set([]);
    this.syncPricingForm([]);
    
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

  private syncPricingForm(fields: Array<{ fieldId: string; key: string; type: 'NUMBER' | 'PERCENTAGE'; value: number }>): void {
    Object.keys(this.pricingForm.controls).forEach((key) => this.pricingForm.removeControl(key));

    fields.forEach((field) => {
      this.pricingForm.addControl(
        field.key,
        this.fb.control<number | null>(Number(field.value), [Validators.required, Validators.min(0)])
      );
    });
  }

  saveAddStock(): void {
    if (!this.canCreateStock()) {
      return;
    }

    this.addStockForm.markAllAsTouched();
    this.pricingForm.markAllAsTouched();
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

    const formValue = this.addStockForm.getRawValue();
    this.saving.set(true);

    const pricingFieldValues = this.pricingForm.getRawValue();
    const changedPricingFields = this.currentGroupPricingFields()
      .map((field) => ({
        fieldId: field.fieldId,
        previousValue: Number(field.value),
        value: Number(pricingFieldValues[field.key]),
      }))
      .filter((field) => Number.isFinite(field.value))
      .filter((field) => field.value !== field.previousValue)
      .map((field) => ({ fieldId: field.fieldId, value: field.value }));

    const stockRequest = this.stockService.addStock({
      groupId: this.selectedGroupId(),
      quantity: finalQty,
      unitId: baseId,
      notes: formValue.notes?.trim() || undefined,
    });

    if (changedPricingFields.length === 0) {
      stockRequest.subscribe({
        next: () => {
          this.toast.success('Stock added successfully.');
          this.closeAddStock();
          this.loadStockData(this.selectedGroupId());
          this.saving.set(false);
        },
        error: () => {
          this.toast.error('Failed to add stock.');
          this.saving.set(false);
        },
      });
      return;
    }

    forkJoin({
      stock: stockRequest,
      pricing: this.stockService.updateGroupResolvedFields(this.selectedGroupId(), changedPricingFields),
    }).subscribe({
      next: () => {
        this.toast.success('Stock added and pricing updated successfully.');
        this.closeAddStock();
        this.loadStockData(this.selectedGroupId());
        this.saving.set(false);
      },
      error: () => {
        this.toast.error('Failed to add stock. Pricing fields may not have been updated.');
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

  onRowAction(event: { actionKey: string; row: GomTableRow }): void {
    const id = typeof event.row['_id'] === 'string' ? event.row['_id'] : '';
    const entry = this.history().find((item) => item._id === id);
    if (!entry) {
      return;
    }

    if (event.actionKey === 'edit') {
      if (!this.canUpdateStock()) {
        return;
      }
      this.openEditStock(entry);
      return;
    }

    if (event.actionKey === 'delete') {
      if (!this.canDeleteStock()) {
        return;
      }
      this.selectedHistoryEntryId.set(entry._id);
      this.deleteStockConfirmOpen.set(true);
    }
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
    return this.saving() || this.addStockForm.invalid || this.pricingForm.invalid || !this.selectedGroupId() || !!this.getAddStockValidationError();
  }

  isEditStockSaveDisabled(): boolean {
    return this.saving() || !this.canUpdateStock() || this.editStockForm.invalid || !this.selectedHistoryEntryId();
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

  private formatNumber(value: number): string {
    return Number.isFinite(value) ? value.toLocaleString(undefined, { maximumFractionDigits: 4 }) : '-';
  }
}
