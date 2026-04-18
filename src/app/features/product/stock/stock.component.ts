import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';

import {
  FormControlsModule,
  GomButtonComponent,
  GomSelectOption,
} from '@gomlibs/ui';
import {
  GomButtonContentMode,
  getButtonContentMode,
  showButtonIcon,
  showButtonText,
} from '@gomlibs/ui';
import { GomTableColumn, GomTableComponent, GomTableRow } from '@gomlibs/ui';
import { GomConfirmationModalComponent, GomModalComponent } from '@gomlibs/ui';
import { GomAlertToastService } from '@gomlibs/ui';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import {
  Group,
  StockHistoryEntry,
  StockService,
  StockSummary,
  Unit,
} from './stock.service';

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

  readonly loading = signal(false);
  readonly canWrite = computed(() => this.authSession.canWrite('product'));
  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly groups = signal<Group[]>([]);
  readonly units = signal<Unit[]>([]);
  readonly selectedGroupId = signal<string>('');
  readonly summary = signal<StockSummary | null>(null);
  readonly history = signal<StockHistoryEntry[]>([]);

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
    quantity: [null as number | null, [Validators.required, Validators.min(0.000001)]],
    unitId: ['', [Validators.required]],
    notes: [''],
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
        { label: 'Edit', actionKey: 'edit', variant: 'secondary' },
        { label: 'Delete', actionKey: 'delete', variant: 'secondary' },
      ],
    },
  ];

  readonly groupOptions = computed<GomSelectOption[]>(() =>
    this.groups().map((item) => ({
      value: item._id,
      label: item.name,
    }))
  );

  readonly filteredUnitOptions = computed<GomSelectOption[]>(() => {
    const selectedGroup = this.groups().find((item) => item._id === this.selectedGroupId());
    if (!selectedGroup) {
      return [];
    }

    const allowed = new Set([selectedGroup.baseUnitId, ...selectedGroup.allowedUnitIds].filter(Boolean));

    return this.units()
      .filter((unit) => allowed.has(unit._id))
      .map((unit) => ({ value: unit._id, label: `${unit.name} (${unit.symbol})` }));
  });

  readonly rows = computed<StockHistoryRow[]>(() =>
    this.history().map((item) => ({
      _id: item._id,
      movementType: item.movementType,
      quantity: `${this.formatNumber(item.quantity)} ${item.unitId?.symbol || ''}`.trim(),
      baseQuantity: this.formatNumber(item.convertedQuantityInBase),
      notes: item.notes || '-',
      createdAt: new Date(item.createdAt).toLocaleString(),
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
      return;
    }

    this.loadStockData(groupId);
  }

  loadStockData(groupId: string): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    forkJoin({
      summary: this.stockService.getSummary(groupId),
      history: this.stockService.getHistory(groupId, 1, 50),
    }).subscribe({
      next: ({ summary, history }) => {
        this.summary.set(summary.data);
        this.history.set(history.data || []);

        this.reorderForm.patchValue({
          reorderLevel: summary.data.reorderLevel,
        });

        this.setDefaultUnitIfNeeded();
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Failed to load stock summary/history.');
        this.loading.set(false);
      },
    });
  }

  openAddStock(): void {
    if (!this.selectedGroupId()) {
      this.toast.warning('Please select a group first.');
      return;
    }

    this.setDefaultUnitIfNeeded();
    this.addStockOpen.set(true);
  }

  closeAddStock(): void {
    this.addStockOpen.set(false);
    this.addStockForm.reset({
      quantity: null,
      unitId: this.filteredUnitOptions()[0]?.value || '',
      notes: '',
    });
  }

  saveAddStock(): void {
    this.addStockForm.markAllAsTouched();
    if (this.addStockForm.invalid || !this.selectedGroupId()) {
      return;
    }

    const formValue = this.addStockForm.getRawValue();
    this.saving.set(true);

    this.stockService
      .addStock({
        groupId: this.selectedGroupId(),
        quantity: Number(formValue.quantity),
        unitId: formValue.unitId || '',
        notes: formValue.notes?.trim() || undefined,
      })
      .subscribe({
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
    if (!this.canWrite()) {
      return;
    }
    const id = typeof event.row['_id'] === 'string' ? event.row['_id'] : '';
    const entry = this.history().find((item) => item._id === id);
    if (!entry) {
      return;
    }

    if (event.actionKey === 'edit') {
      this.openEditStock(entry);
      return;
    }

    if (event.actionKey === 'delete') {
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
    return this.saving() || this.addStockForm.invalid || !this.selectedGroupId();
  }

  isEditStockSaveDisabled(): boolean {
    return this.saving() || this.editStockForm.invalid || !this.selectedHistoryEntryId();
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
    const currentUnitId = this.addStockForm.controls.unitId.value;
    const options = this.filteredUnitOptions();
    const hasCurrent = options.some((item) => item.value === currentUnitId);

    if (!hasCurrent) {
      this.addStockForm.patchValue({ unitId: options[0]?.value || '' });
    }
  }

  private formatNumber(value: number): string {
    return Number.isFinite(value) ? value.toLocaleString(undefined, { maximumFractionDigits: 4 }) : '-';
  }
}
