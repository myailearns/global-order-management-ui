import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  FormControlsModule,
  GomModalComponent,
  GomTableCellEditEvent,
  GomTableColumn,
  GomTableComponent,
  GomTableRow,
} from '@gomlibs/ui';

import {
  PricingEntity,
} from '../simple-pricing/simple-pricing.service';
import {
  SimplePricingComponent,
} from '../simple-pricing/simple-pricing.component';
import {
  SimplePricingEditModalComponent,
} from '../simple-pricing/edit-modal/simple-pricing-edit-modal.component';
import {
  SimplePricingInfoModalComponent,
} from '../simple-pricing/info-modal/simple-pricing-info-modal.component';
import {
  SimplePricingReviewModalComponent,
} from '../simple-pricing/review-modal/simple-pricing-review-modal.component';
import {
  SimplePricingUploadFeedbackModalComponent,
} from '../simple-pricing/upload-feedback-modal/simple-pricing-upload-feedback-modal.component';

type PricingManagementRow = GomTableRow & {
  _id: string;
  productDetails: string;
  category: string;
  sellingPrice: number;
  totalCost: string;
  profit: string;
  margin: string;
  priceEditable: boolean;
};

type BulkUpdateAction = 'increase-percent' | 'decrease-percent' | 'set-flat';
type BulkPreviewStatus = 'Healthy' | 'Warning' | 'Critical';

type BulkPreviewRow = GomTableRow & {
  _id: string;
  productName: string;
  sku: string;
  currentPrice: number;
  newPrice: number;
  changeAmount: number;
  newProfitAmount: number | null;
  marginChangePercent: number | null;
  status: BulkPreviewStatus;
  actions?: string;
};

@Component({
  selector: 'gom-pricing',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    FormControlsModule,
    GomModalComponent,
    GomTableComponent,
    SimplePricingEditModalComponent,
    SimplePricingInfoModalComponent,
    SimplePricingReviewModalComponent,
    SimplePricingUploadFeedbackModalComponent,
  ],
  templateUrl: './pricing.component.html',
  styleUrl: './pricing.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PricingComponent extends SimplePricingComponent {
  private readonly router = inject(Router);

  readonly bulkUpdateModalOpen = signal(false);
  readonly bulkPreviewOpen = signal(false);
  readonly bulkPreviewRows = signal<BulkPreviewRow[]>([]);
  readonly bulkAction = signal<BulkUpdateAction>('increase-percent');
  readonly bulkUpdateError = signal('');
  readonly bulkValueControl = new FormControl<string>('5', { nonNullable: true });

  readonly pricingCategoryOptions = computed(() =>
    this.categoryOptions().map((option, index) =>
      index === 0 ? { ...option, label: 'Category: All' } : option
    )
  );

  readonly pricingGroupOptions = computed(() =>
    this.groupOptions().map((option, index) =>
      index === 0 ? { ...option, label: 'Product Group: All' } : option
    )
  );

  readonly pricingRows = computed<PricingManagementRow[]>(() =>
    this.filteredEntities().map((entity) => {
      const editedPrice = this.inlinePriceEdits()[entity.trackId];
      return this.toPricingRow(entity, editedPrice ?? entity.sellingPrice);
    })
  );

  readonly averageMarginImpact = computed(() => {
    const changes = Object.entries(this.inlinePriceEdits()).flatMap(([trackId, newPrice]) => {
      const entity = this.getEntity(trackId);
      const cost = entity?.actualPrice;
      if (!entity || cost == null || entity.sellingPrice <= 0 || newPrice <= 0) {
        return [];
      }

      const oldMargin = ((entity.sellingPrice - cost) / entity.sellingPrice) * 100;
      const newMargin = ((newPrice - cost) / newPrice) * 100;
      return [newMargin - oldMargin];
    });

    if (!changes.length) {
      return '0.0%';
    }

    const average = changes.reduce((total, change) => total + change, 0) / changes.length;
    return `${average >= 0 ? '+' : ''}${average.toFixed(1)}%`;
  });

  readonly bulkTargetEntities = computed(() => {
    if (!this.canEdit()) {
      return [] as PricingEntity[];
    }

    const candidates = this.filteredEntities().filter((entity) => entity.actualPrice !== null && entity.actualPrice > 0);
    const selectedGroupIds = new Set(
      candidates
        .filter((entity) => entity.entityType === 'GROUP')
        .map((entity) => entity.entityId)
    );

    return candidates.filter((entity) => (
      entity.entityType === 'GROUP' || !selectedGroupIds.has(String(entity.group?._id || ''))
    ));
  });

  readonly bulkDerivedProductsCount = computed(() => (
    this.bulkTargetEntities().reduce((sum, entity) => {
      if (entity.entityType !== 'GROUP') {
        return sum;
      }
      return sum + Math.max(0, Number(entity.variantCount || 0));
    }, 0)
  ));

  readonly bulkAffectedProductsCount = computed(() => (
    this.bulkTargetEntities().length + this.bulkDerivedProductsCount()
  ));

  readonly bulkActionLabel = computed(() => {
    const action = this.bulkAction();
    if (action === 'set-flat') {
      return 'Flat Price Value';
    }
    return 'Percentage Value';
  });

  readonly bulkActionSuffix = computed(() => (this.bulkAction() === 'set-flat' ? 'INR' : '%'));

  readonly previewWarningCount = computed(() => (
    this.bulkPreviewRows().filter((row) => row.status !== 'Healthy').length
  ));

  readonly previewAverageMarginImpact = computed(() => {
    const rows = this.bulkPreviewRows();
    if (!rows.length) {
      return '0.0%';
    }

    const candidates = rows.filter((row) => row.marginChangePercent !== null);
    if (!candidates.length) {
      return '0.0%';
    }

    const deltaAverage = candidates.reduce((sum, row) => sum + Number(row.marginChangePercent || 0), 0) / candidates.length;
    const oldAverage = candidates.reduce((sum, row) => {
      const entity = this.getEntity(row._id);
      if (!entity?.actualPrice || entity.sellingPrice <= 0) {
        return sum;
      }
      const oldMargin = ((entity.sellingPrice - entity.actualPrice) / entity.sellingPrice) * 100;
      return sum + oldMargin;
    }, 0) / candidates.length;
    const newAverage = oldAverage + deltaAverage;

    return `${deltaAverage >= 0 ? '+' : ''}${deltaAverage.toFixed(1)}% (${oldAverage.toFixed(1)}% -> ${newAverage.toFixed(1)}%)`;
  });

  readonly previewTotalChangeAmount = computed(() => (
    this.bulkPreviewRows().reduce((sum, row) => sum + row.changeAmount, 0)
  ));

  readonly pricingColumns: GomTableColumn<PricingManagementRow>[] = [
    {
      key: 'productDetails',
      header: 'Product Details & SKU',
      sortable: true,
      filterable: true,
      cellClass: (_value, row) => this.dirtyCellClass(row),
      width: '30%',
      textMode: 'wrap',
    },
    {
      key: 'category',
      header: 'Category',
      sortable: true,
      filterable: true,
      cellClass: (_value, row) => this.dirtyCellClass(row),
      width: '14%',
    },
    {
      key: 'sellingPrice',
      header: 'Current Selling Price',
      sortable: true,
      filterable: true,
      format: (value) => this.formatCurrency(Number(value)),
      cellClass: (_value, row) => this.dirtyCellClass(row),
      editable: {
        type: 'number',
        mode: 'click',
        min: 0.01,
        step: 0.01,
        disabled: (row) => !row.priceEditable,
      },
      width: '14%',
      sortValue: (row) => row.sellingPrice,
    },
    {
      key: 'totalCost',
      header: 'Total Cost',
      sortable: true,
      filterable: true,
      cellClass: (_value, row) => this.dirtyCellClass(row),
      width: '12%',
      sortValue: (row) => row['totalCostValue'],
    },
    {
      key: 'profit',
      header: 'Profit',
      sortable: true,
      filterable: true,
      cellClass: (_value, row) => this.dirtyCellClass(row),
      width: '10%',
      sortValue: (row) => row['profitValue'],
    },
    {
      key: 'margin',
      header: 'Margin %',
      sortable: true,
      filterable: true,
      cellClass: (_value, row) => this.dirtyCellClass(row),
      width: '9%',
      sortValue: (row) => row['marginValue'],
    },
    {
      key: 'actions',
      header: 'Actions',
      width: '150px',
      cellClass: (_value, row) => this.dirtyCellClass(row),
      actionButtons: [
        {
          actionKey: 'edit',
          label: 'Edit pricing',
          icon: 'ri-pencil-line',
          variant: 'secondary',
          disabled: () => !this.canEdit(),
          disabledTooltip: 'You do not have permission to edit pricing',
        },
        {
          actionKey: 'info',
          label: 'View pricing details',
          icon: 'ri-information-line',
          variant: 'secondary',
        },
        {
          actionKey: 'history',
          label: 'View price history',
          icon: 'ri-history-line',
          variant: 'secondary',
        },
      ],
    },
  ];

  readonly bulkPreviewColumns: GomTableColumn<BulkPreviewRow>[] = [
    {
      key: 'productName',
      header: 'Product Name & SKU',
      width: '28%',
      textMode: 'wrap',
      format: (_value, row) => `${row.productName} · ${row.sku}`,
      cellClass: (_value, row) => this.bulkPreviewToneClass(row),
    },
    {
      key: 'currentPrice',
      header: 'Current Price',
      width: '10%',
      format: (value) => this.formatCurrency(Number(value)),
      cellClass: (_value, row) => this.bulkPreviewToneClass(row),
    },
    {
      key: 'newPrice',
      header: 'New Price',
      width: '10%',
      format: (value) => this.formatCurrency(Number(value)),
      cellClass: (_value, row) => this.bulkPreviewToneClass(row),
    },
    {
      key: 'changeAmount',
      header: 'Change',
      width: '10%',
      format: (value) => this.formatBulkSignedAmount(Number(value)),
      cellClass: (_value, row) => this.bulkPreviewDeltaClass(row, row.changeAmount),
    },
    {
      key: 'newProfitAmount',
      header: 'New Profit',
      width: '10%',
      format: (value) => value === null ? '—' : this.formatCurrency(Number(value)),
      cellClass: (_value, row) => this.bulkPreviewDeltaClass(row, row.newProfitAmount),
    },
    {
      key: 'marginChangePercent',
      header: 'Margin Change',
      width: '10%',
      format: (value) => this.formatBulkSignedPercent(value as number | null),
      cellClass: (_value, row) => this.bulkPreviewDeltaClass(row, row.marginChangePercent),
    },
    {
      key: 'status',
      header: 'Preview Status',
      width: '12%',
      chipTone: (_value, row) => {
        if (row.status === 'Critical') {
          return 'danger';
        }
        if (row.status === 'Warning') {
          return 'warning';
        }
        return 'success';
      },
      cellClass: (_value, row) => this.bulkPreviewToneClass(row),
    },
    {
      key: 'actions',
      header: 'Actions',
      width: '96px',
      cellClass: (_value, row) => this.bulkPreviewToneClass(row),
      actionButtons: [
        {
          actionKey: 'remove',
          label: 'Remove row',
          icon: 'ri-delete-bin-line',
          variant: 'secondary',
        },
      ],
    },
  ];

  onPricingCellEdit(event: GomTableCellEditEvent<PricingManagementRow>): void {
    if (event.columnKey !== 'sellingPrice') {
      return;
    }

    this.getSellingPriceControl(event.row._id).setValue(String(event.value));
  }

  override onRowAction(event: { actionKey: string; row: Record<string, unknown> }): void {
    const trackId = typeof event.row['_id'] === 'string' ? event.row['_id'] : '';
    const entity = this.getEntity(trackId);
    if (!entity) {
      return;
    }

    if (event.actionKey === 'history') {
      const groupId = entity.entityType === 'GROUP'
        ? String(entity.entityId || '').trim()
        : String(entity.group?._id || '').trim();
      const variantId = entity.entityType === 'VARIANT'
        ? String(entity.entityId || '').trim()
        : '';

      void this.router.navigate(['/pricing/history'], {
        queryParams: {
          groupId,
          variantId,
          name: entity.displayName,
        },
      });
      return;
    }

    super.onRowAction(event);
  }

  openBulkUpdate(): void {
    this.bulkUpdateError.set('');
    this.bulkPreviewOpen.set(false);
    this.bulkAction.set('increase-percent');
    this.bulkValueControl.setValue('5');
    this.bulkUpdateModalOpen.set(true);
  }

  closeBulkUpdate(): void {
    this.bulkUpdateModalOpen.set(false);
    this.bulkUpdateError.set('');
    this.restoreDocumentScroll();
  }

  chooseBulkAction(action: BulkUpdateAction): void {
    this.bulkAction.set(action);
    this.bulkUpdateError.set('');
  }

  previewBulkChanges(): void {
    this.bulkUpdateError.set('');

    const numericValue = this.parseBulkInput(this.bulkValueControl.value);
    if (!Number.isFinite(numericValue)) {
      this.bulkUpdateError.set('Enter a valid update value.');
      return;
    }

    if ((this.bulkAction() === 'increase-percent' || this.bulkAction() === 'decrease-percent') && numericValue <= 0) {
      this.bulkUpdateError.set('Percentage must be greater than 0.');
      return;
    }

    if (this.bulkAction() === 'set-flat' && numericValue <= 0) {
      this.bulkUpdateError.set('Flat price must be greater than 0.');
      return;
    }

    const rows = this.buildBulkPreviewRows(this.bulkAction(), numericValue);
    if (!rows.length) {
      this.bulkUpdateError.set('No eligible products found for the selected filters.');
      return;
    }

    this.bulkPreviewRows.set(rows);
    this.bulkUpdateModalOpen.set(false);
    this.bulkPreviewOpen.set(true);
    this.restoreDocumentScroll();
  }

  backToBulkEdit(): void {
    this.bulkPreviewOpen.set(false);
    this.bulkUpdateModalOpen.set(true);
  }

  discardBulkPreview(): void {
    this.bulkPreviewOpen.set(false);
    this.bulkPreviewRows.set([]);
    this.restoreDocumentScroll();
  }

  removeBulkPreviewRow(trackId: string): void {
    this.bulkPreviewRows.update((rows) => rows.filter((row) => row._id !== trackId));
  }

  onBulkPreviewRowAction(event: { actionKey: string; row: Record<string, unknown> }): void {
    if (event.actionKey !== 'remove') {
      return;
    }

    const rowId = typeof event.row['_id'] === 'string' ? event.row['_id'] : '';
    if (!rowId) {
      return;
    }

    this.removeBulkPreviewRow(rowId);
  }

  applyBulkChanges(): void {
    const rows = this.bulkPreviewRows();
    if (!rows.length) {
      return;
    }

    const edits = rows.reduce((acc, row) => {
      acc[row._id] = row.newPrice;
      return acc;
    }, {} as Record<string, number>);

    this.bulkPreviewOpen.set(false);
    this.bulkUpdateModalOpen.set(false);
    this.restoreDocumentScroll();
    this.inlinePriceEdits.set(edits);
    this.onReviewConfirmed(Object.keys(edits));
    this.bulkPreviewRows.set([]);
  }

  formatBulkSignedAmount(value: number): string {
    return `${value >= 0 ? '+' : '-'}${this.formatCurrency(Math.abs(value))}`;
  }

  formatBulkSignedPercent(value: number | null): string {
    if (value === null) {
      return '—';
    }
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  }

  private buildBulkPreviewRows(action: BulkUpdateAction, value: number): BulkPreviewRow[] {
    return this.bulkTargetEntities().map((entity) => {
      const currentPrice = Number(entity.sellingPrice || 0);
      const newPrice = this.calculateBulkNewPrice(currentPrice, action, value);
      const changeAmount = this.roundToTwo(newPrice - currentPrice);
      const cost = entity.actualPrice;
      const oldProfit = cost === null ? null : currentPrice - cost;
      const newProfit = cost === null ? null : newPrice - cost;
      const oldMargin = (cost === null || currentPrice <= 0) ? null : ((currentPrice - cost) / currentPrice) * 100;
      const newMargin = (cost === null || newPrice <= 0) ? null : ((newPrice - cost) / newPrice) * 100;
      const marginChange = (oldMargin === null || newMargin === null) ? null : this.roundToTwo(newMargin - oldMargin);

      let status: BulkPreviewStatus = 'Healthy';
      if ((newProfit !== null && newProfit <= 0) || (newMargin !== null && newMargin <= 0)) {
        status = 'Critical';
      } else if ((oldProfit !== null && newProfit !== null && newProfit < oldProfit) || (oldMargin !== null && newMargin !== null && newMargin < oldMargin)) {
        status = 'Warning';
      }

      return {
        _id: entity.trackId,
        productName: entity.displayName,
        sku: String(entity.variant?.sku || '').trim() || 'Not assigned',
        currentPrice,
        newPrice,
        changeAmount,
        newProfitAmount: newProfit,
        marginChangePercent: marginChange,
        status,
        actions: '',
      };
    });
  }

  private bulkPreviewToneClass(row: BulkPreviewRow): string {
    if (row.status === 'Critical') {
      return 'pricing-bulk-preview__cell--critical';
    }

    if (row.status === 'Warning') {
      return 'pricing-bulk-preview__cell--warning';
    }

    return '';
  }

  private bulkPreviewDeltaClass(row: BulkPreviewRow, value: number | null): string {
    const toneClass = this.bulkPreviewToneClass(row);
    const deltaClass = Number(value) < 0 ? 'pricing-bulk-preview__delta--negative' : 'pricing-bulk-preview__delta--positive';
    return `${toneClass} ${deltaClass}`.trim();
  }

  private calculateBulkNewPrice(currentPrice: number, action: BulkUpdateAction, value: number): number {
    if (action === 'set-flat') {
      return this.roundToTwo(Math.max(0.01, value));
    }

    const ratio = value / 100;
    const nextPrice = action === 'increase-percent'
      ? currentPrice * (1 + ratio)
      : currentPrice * (1 - ratio);
    return this.roundToTwo(Math.max(0.01, nextPrice));
  }

  private parseBulkInput(value: string): number {
    const normalized = String(value || '').trim();
    if (!normalized) {
      return Number.NaN;
    }

    const parseTarget = normalized.includes('.') && normalized.includes(',')
      ? normalized.replaceAll(',', '')
      : normalized.replace(',', '.');
    const numeric = Number(parseTarget);
    return Number.isFinite(numeric) ? numeric : Number.NaN;
  }

  private roundToTwo(value: number): number {
    return Math.round(value * 100) / 100;
  }

  private restoreDocumentScroll(): void {
    document.documentElement.style.overflow = '';
  }

  private dirtyCellClass(row: PricingManagementRow): string {
    return Object.hasOwn(this.inlinePriceEdits(), row._id) ? 'pricing__dirty-cell' : '';
  }

  private toPricingRow(entity: PricingEntity, sellingPrice: number): PricingManagementRow {
    sellingPrice = Number(sellingPrice || 0);
    const totalCost = entity.actualPrice;
    const profit = totalCost === null ? null : sellingPrice - totalCost;
    const margin = profit === null || sellingPrice <= 0
      ? null
      : (profit / sellingPrice) * 100;
    const sku = String(entity.variant?.sku || '').trim() || 'Not assigned';
    const typeLabel = entity.groupType.charAt(0) + entity.groupType.slice(1).toLowerCase();

    return {
      _id: entity.trackId,
      productDetails: `${entity.displayName} · SKU: ${sku} · ${typeLabel}`,
      category: entity.categoryName || '—',
      sellingPrice,
      totalCost: totalCost === null ? '—' : this.formatCurrency(totalCost),
      profit: profit === null ? '—' : this.formatCurrency(profit),
      margin: margin === null ? '—' : `${margin.toFixed(1)}%`,
      priceEditable: this.canEdit() && totalCost !== null && totalCost > 0,
      sellingPriceValue: sellingPrice,
      totalCostValue: totalCost,
      profitValue: profit,
      marginValue: margin,
    };
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }
}
