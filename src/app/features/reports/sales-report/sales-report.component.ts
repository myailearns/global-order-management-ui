import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import {
  FormControlsModule,
  GomButtonComponent,
  GomCardComponent,
  GomChipComponent,
  GomChipTone,
  GomSelectOption,
  GomTableCellDirective,
  GomTableColumn,
  GomTableComponent,
  GomTableRow,
} from '@gomlibs/ui';
import { EMPTY, catchError, debounceTime, finalize, switchMap, tap } from 'rxjs';

import { CategoriesService } from '../../master/categories/categories.service';
import { PageHeadingComponent } from '../../../shared/components/page-heading/page-heading.component';
import {
  SalesGroupReport,
  SalesGroupType,
  SalesMetrics,
  SalesReport,
  SalesReportParams,
} from './sales-report.models';
import { SalesReportService } from './sales-report.service';

type QuickRange = 'today' | 'yesterday' | 'week' | 'month' | 'lastMonth' | 'custom';

interface QuickRangeOption {
  key: QuickRange;
  label: string;
}

interface SalesRow extends GomTableRow {
  _id: string;
  name: string;
  subtitle: string;
  typeLabel: string;
  quantityLabel: string;
  quantity: number;
  revenue: number;
  cost: number;
  profit: number;
  marginPct: number | null;
  marginTone: GomChipTone;
  children?: SalesRow[];
}

const GROUP_TYPE_LABELS: Record<SalesGroupType, string> = {
  MEASURED: 'Measure',
  ATTRIBUTE: 'Attribute',
  HYBRID: 'Hybrid',
};

const QUICK_RANGES: QuickRangeOption[] = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'lastMonth', label: 'Last Month' },
  { key: 'custom', label: 'Custom Range' },
];

const ALL_CATEGORIES: GomSelectOption = { label: 'All categories', value: '' };

function toIsoDay(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function resolveQuickRange(key: Exclude<QuickRange, 'custom'>): { from: string; to: string } {
  const today = new Date();
  const startOf = (year: number, month: number, day: number) => new Date(year, month, day);
  switch (key) {
    case 'today':
      return { from: toIsoDay(today), to: toIsoDay(today) };
    case 'yesterday': {
      const yesterday = startOf(today.getFullYear(), today.getMonth(), today.getDate() - 1);
      return { from: toIsoDay(yesterday), to: toIsoDay(yesterday) };
    }
    case 'week': {
      const daysSinceMonday = (today.getDay() + 6) % 7;
      const monday = startOf(today.getFullYear(), today.getMonth(), today.getDate() - daysSinceMonday);
      return { from: toIsoDay(monday), to: toIsoDay(today) };
    }
    case 'month':
      return { from: toIsoDay(startOf(today.getFullYear(), today.getMonth(), 1)), to: toIsoDay(today) };
    case 'lastMonth':
      return {
        from: toIsoDay(startOf(today.getFullYear(), today.getMonth() - 1, 1)),
        to: toIsoDay(startOf(today.getFullYear(), today.getMonth(), 0)),
      };
  }
}

@Component({
  selector: 'gom-sales-report',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    FormControlsModule,
    GomButtonComponent,
    GomCardComponent,
    GomChipComponent,
    GomTableComponent,
    GomTableCellDirective,
    PageHeadingComponent,
  ],
  templateUrl: './sales-report.component.html',
  styleUrl: './sales-report.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SalesReportComponent implements OnInit {
  private readonly salesReportService = inject(SalesReportService);
  private readonly categoriesService = inject(CategoriesService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  private readonly currencyFormat = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  });

  readonly quickRanges = QUICK_RANGES;
  readonly defaultRange = resolveQuickRange('month');

  readonly form = new FormGroup({
    from: new FormControl(this.defaultRange.from, { nonNullable: true }),
    to: new FormControl(this.defaultRange.to, { nonNullable: true }),
    categoryId: new FormControl('', { nonNullable: true }),
    search: new FormControl('', { nonNullable: true }),
  });

  readonly report = signal<SalesReport | null>(null);
  readonly loading = signal(false);
  readonly exporting = signal(false);
  readonly errorMessage = signal('');
  readonly customRangeOpen = signal(false);
  readonly categoryOptions = signal<GomSelectOption[]>([ALL_CATEGORIES]);
  private readonly currentRange = signal({ ...this.defaultRange });

  readonly activeRange = computed<QuickRange>(() => {
    if (this.customRangeOpen()) {
      return 'custom';
    }
    const { from, to } = this.currentRange();
    const match = QUICK_RANGES.find(
      (option) => option.key !== 'custom' && this.sameRange(resolveQuickRange(option.key), from, to)
    );
    return match?.key ?? 'custom';
  });

  readonly summary = computed(() => this.report()?.summary ?? null);
  readonly rows = computed<SalesRow[]>(() => (this.report()?.groups ?? []).map((group) => this.toRow(group)));

  readonly columns: GomTableColumn<SalesRow>[] = [
    { key: 'name', header: 'Product name', sortable: true, width: '26%' },
    { key: 'typeLabel', header: 'Product type', width: '10%' },
    {
      key: 'quantityLabel',
      header: 'Quantity sold',
      sortable: true,
      sortValue: (row) => row.quantity,
      headerAlign: 'right',
      cellAlign: 'right',
    },
    {
      key: 'revenue',
      header: 'Total revenue',
      sortable: true,
      headerAlign: 'right',
      cellAlign: 'right',
      format: (value) => this.money(Number(value)),
    },
    {
      key: 'cost',
      header: 'Total cost',
      sortable: true,
      headerAlign: 'right',
      cellAlign: 'right',
      format: (value) => this.money(Number(value)),
    },
    {
      key: 'profit',
      header: 'Gross profit',
      sortable: true,
      headerAlign: 'right',
      cellAlign: 'right',
      format: (value) => this.money(Number(value)),
    },
    {
      key: 'marginPct',
      header: 'Margin %',
      sortable: true,
      sortValue: (row) => row.marginPct ?? -Infinity,
      headerAlign: 'right',
      cellAlign: 'right',
    },
  ];

  ngOnInit(): void {
    this.loadCategories();

    this.form.valueChanges
      .pipe(
        debounceTime(300),
        tap(() => this.errorMessage.set('')),
        switchMap(() => {
          const params = this.buildParams();
          if (!params) {
            return EMPTY;
          }
          this.loading.set(true);
          return this.salesReportService.getReport(params).pipe(
            finalize(() => this.loading.set(false)),
            catchError(() => {
              this.handleLoadError();
              return EMPTY;
            })
          );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((report) => this.report.set(report));

    this.loadReport();
  }

  selectQuickRange(key: QuickRange): void {
    if (key === 'custom') {
      this.customRangeOpen.set(true);
      return;
    }
    this.customRangeOpen.set(false);
    const range = resolveQuickRange(key);
    this.currentRange.set(range);
    this.form.patchValue(range);
  }

  onDateChange(): void {
    const { from, to } = this.form.getRawValue();
    this.currentRange.set({ from, to });
  }

  exportToExcel(): void {
    const params = this.buildParams();
    if (!params || this.exporting()) {
      return;
    }
    this.exporting.set(true);
    this.salesReportService
      .exportReport(params)
      .pipe(finalize(() => this.exporting.set(false)))
      .subscribe({
        next: (blob) => this.download(blob, `sales-report-${params.from}-to-${params.to}.xlsx`),
        error: () => this.errorMessage.set('Could not export the report. Please try again.'),
      });
  }

  retry(): void {
    this.loadReport();
  }

  money(value: number): string {
    return this.currencyFormat.format(value || 0);
  }

  percent(value: number | null): string {
    return value === null || value === undefined ? '—' : `${value.toFixed(1)}%`;
  }

  quantityText(entries: { quantity: number; unit: string }[]): string {
    return entries.map((entry) => `${entry.quantity} ${entry.unit}`).join(' · ') || '—';
  }

  private loadReport(): void {
    const params = this.buildParams();
    if (!params) {
      return;
    }
    this.errorMessage.set('');
    this.loading.set(true);
    this.salesReportService
      .getReport(params)
      .pipe(finalize(() => this.loading.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (report) => this.report.set(report),
        error: () => this.handleLoadError(),
      });
  }

  private loadCategories(): void {
    this.categoriesService
      .getCategories(1, 100, 'ACTIVE')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          const options = response.data
            .filter((category) => !!category._id)
            .map((category) => ({ label: category.name, value: category._id as string }));
          this.categoryOptions.set([ALL_CATEGORIES, ...options]);
        },
      });
  }

  private buildParams(): SalesReportParams | null {
    const { from, to, categoryId, search } = this.form.getRawValue();
    if (!from || !to) {
      return null;
    }
    if (from > to) {
      this.errorMessage.set('The From date must be on or before the To date.');
      return null;
    }
    return {
      from,
      to,
      timezone: this.timezone,
      categoryId: categoryId || undefined,
      search: search.trim() || undefined,
    };
  }

  private handleLoadError(): void {
    this.report.set(null);
    this.loading.set(false);
    this.errorMessage.set('Could not load the sales report.');
  }

  private sameRange(range: { from: string; to: string }, from: string, to: string): boolean {
    return range.from === from && range.to === to;
  }

  private toRow(entry: SalesGroupReport): SalesRow {
    const { group, total, variants } = entry;
    const isMeasured = group.groupType === 'MEASURED';
    const unitOf = (metrics: SalesMetrics) =>
      isMeasured
        ? { quantity: metrics.baseQuantity ?? 0, unit: group.baseUnit ?? '' }
        : { quantity: metrics.quantity, unit: group.baseUnitName ?? '' };

    const metricsFields = (metrics: SalesMetrics) => {
      const { quantity, unit } = unitOf(metrics);
      const { revenueExTax, cost, profit, marginPct, meetsDefinedMargin } = metrics.profitability;
      return {
        quantity,
        quantityLabel: quantity ? `${quantity} ${unit}`.trim() : '—',
        revenue: revenueExTax,
        cost,
        profit,
        marginPct,
        marginTone: (meetsDefinedMargin === null ? 'neutral' : meetsDefinedMargin ? 'success' : 'warning') as GomChipTone,
      };
    };

    const variantLabel = variants.length === 1 ? '1 sellable item' : `${variants.length} sellable items`;
    const subtitle = [variants.length ? variantLabel : '', group.categoryName ?? ''].filter(Boolean).join(' · ');

    return {
      _id: group._id,
      name: group.name,
      subtitle,
      typeLabel: GROUP_TYPE_LABELS[group.groupType] ?? group.groupType,
      ...metricsFields(total),
      children: variants.map((variant) => ({
        _id: variant.variantId,
        name: variant.name,
        subtitle: variant.sku ?? '',
        typeLabel: '',
        ...metricsFields(variant),
      })),
    };
  }

  private download(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(url);
  }
}
