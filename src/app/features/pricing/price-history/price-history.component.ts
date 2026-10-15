import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  FormControlsModule,
  GomTableColumn,
  GomTableComponent,
  GomTableRow,
} from '@gomlibs/ui';

import {
  SimplePricingPriceHistoryEntry,
  SimplePricingService,
} from '../simple-pricing/simple-pricing.service';

type TrendRange = 'DAY' | 'WEEK' | 'MONTH' | 'QUARTER' | 'YEAR';

type PriceHistoryRow = GomTableRow & {
  id: string;
  createdAt: string;
  previousPrice: number;
  newPrice: number;
  change: number;
  actorId: string;
  source: string;
  reason: string;
};

type ChartPoint = {
  x: number;
  y: number;
  value: number;
  label: string;
};

@Component({
  selector: 'gom-pricing-history',
  standalone: true,
  imports: [CommonModule, FormControlsModule, GomTableComponent],
  templateUrl: './price-history.component.html',
  styleUrls: ['./price-history.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PriceHistoryComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly pricingService = inject(SimplePricingService);

  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly entries = signal<SimplePricingPriceHistoryEntry[]>([]);

  readonly groupId = signal('');
  readonly variantId = signal('');
  readonly displayName = signal('Price History');
  readonly selectedRange = signal<TrendRange>('MONTH');

  readonly rangeOptions: Array<{ value: TrendRange; label: string }> = [
    { value: 'DAY', label: 'Day' },
    { value: 'WEEK', label: 'Week' },
    { value: 'MONTH', label: 'Month' },
    { value: 'QUARTER', label: 'Quarter' },
    { value: 'YEAR', label: 'Year' },
  ];

  readonly sortedEntries = computed(() =>
    [...this.entries()].sort((left, right) =>
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    )
  );

  readonly filteredEntries = computed(() => {
    const rows = this.sortedEntries();
    if (!rows.length) {
      return rows;
    }

    const range = this.selectedRange();
    const now = Date.now();
    const msByRange: Record<TrendRange, number> = {
      DAY: 24 * 60 * 60 * 1000,
      WEEK: 7 * 24 * 60 * 60 * 1000,
      MONTH: 30 * 24 * 60 * 60 * 1000,
      QUARTER: 90 * 24 * 60 * 60 * 1000,
      YEAR: 365 * 24 * 60 * 60 * 1000,
    };

    const latestTimestamp = new Date(rows[0].createdAt).getTime();
    const anchor = Number.isFinite(latestTimestamp) ? latestTimestamp : now;
    const cutoff = anchor - msByRange[range];
    const filtered = rows.filter((item) => {
      const timestamp = new Date(item.createdAt).getTime();
      return Number.isFinite(timestamp) && timestamp >= cutoff;
    });

    return filtered.length ? filtered : rows;
  });

  readonly trendEntries = computed(() =>
    this.filteredEntries().filter((entry) => Number(entry.newPrice?.sellingPrice || 0) > 0)
  );

  readonly chartSeries = computed(() => this.buildChartSeries(this.selectedRange(), this.trendEntries()));

  readonly currentPrice = computed(() => {
    const values = this.chartSeries().values;
    if (!values.length) {
      return 0;
    }
    return values.at(-1) || 0;
  });

  readonly netChange = computed(() => {
    const values = this.chartSeries().values;
    if (values.length < 2) {
      return 0;
    }

    return (values.at(-1) || 0) - values[0];
  });

  readonly netChangePercent = computed(() => {
    const values = this.chartSeries().values;
    if (values.length < 2) {
      return 0;
    }

    const oldest = values[0];
    if (!oldest) {
      return 0;
    }

    return ((this.netChange() / oldest) * 100);
  });

  readonly rangeHint = computed(() => {
    const hintByRange: Record<TrendRange, string> = {
      DAY: 'Showing hourly price changes',
      WEEK: 'Showing daily price changes',
      MONTH: 'Showing monthly price changes',
      QUARTER: 'Showing quarterly price changes',
      YEAR: 'Showing yearly price changes',
    };
    return hintByRange[this.selectedRange()];
  });

  readonly dateRangeHint = computed(() => {
    const entries = this.trendEntries();
    if (!entries.length) {
      return 'No trend data recorded.';
    }

    const asc = [...entries].sort((left, right) =>
      new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
    );
    const from = this.formatDate(new Date(asc[0].createdAt));
    const to = this.formatDate(new Date(asc.at(-1)?.createdAt || asc[0].createdAt));
    if (from === to) {
      return `Data recorded for ${from}`;
    }
    return `Data recorded from ${from} to ${to}`;
  });

  readonly chartYAxisTicks = computed(() => {
    const values = this.chartSeries().values;
    if (!values.length) {
      return [] as Array<{ y: number; label: string }>;
    }

    const max = Math.max(...values);
    const min = Math.min(...values);
    const spread = Math.max(1, max - min);
    const paddedMin = Math.max(0, min - spread * 0.15);
    const paddedMax = max + spread * 0.15;
    const tickCount = 6;
    const step = (paddedMax - paddedMin) / (tickCount - 1);

    return Array.from({ length: tickCount }, (_, index) => {
      const value = paddedMin + step * index;
      return {
        y: this.plotBottom() - ((value - paddedMin) / Math.max(1, paddedMax - paddedMin)) * this.plotHeight(),
        label: this.formatCompactCurrency(value),
      };
    });
  });

  readonly chartPlotPoints = computed<ChartPoint[]>(() => {
    const series = this.chartSeries();
    if (!series.values.length) {
      return [];
    }

    const min = Math.min(...series.values);
    const max = Math.max(...series.values);
    const spread = Math.max(1, max - min);
    const paddedMin = Math.max(0, min - spread * 0.15);
    const paddedMax = max + spread * 0.15;
    const stepX = series.values.length > 1 ? this.plotWidth() / (series.values.length - 1) : 0;

    return series.values.map((value, index) => {
      const normalized = (value - paddedMin) / Math.max(1, paddedMax - paddedMin);
      return {
        x: this.plotLeft() + stepX * index,
        y: this.plotBottom() - normalized * this.plotHeight(),
        value,
        label: series.labels[index] || '',
      };
    });
  });

  readonly chartPolylinePoints = computed(() =>
    this.chartPlotPoints().map((point) => `${point.x},${point.y}`).join(' ')
  );

  readonly chartLatestPoint = computed(() => {
    const points = this.chartPlotPoints();
    return points.at(-1) || null;
  });

  readonly chartXAxisLabels = computed(() => {
    const points = this.chartPlotPoints();
    return points.map((point) => ({ x: point.x, label: point.label }));
  });

  readonly tableRows = computed<PriceHistoryRow[]>(() =>
    this.filteredEntries().map((entry) => {
      const previousPrice = Number(entry.oldPrice?.sellingPrice || 0);
      const newPrice = Number(entry.newPrice?.sellingPrice || 0);
      return {
        id: entry.id,
        createdAt: this.formatDateTime(entry.createdAt),
        previousPrice,
        newPrice,
        change: newPrice - previousPrice,
        actorId: entry.actorId || 'system',
        source: this.formatSource(entry.source),
        reason: entry.reason || '—',
      };
    })
  );

  readonly columns: GomTableColumn<PriceHistoryRow>[] = [
    { key: 'createdAt', header: 'Date & Time', width: '20%' },
    {
      key: 'previousPrice',
      header: 'Previous Price',
      width: '12%',
      format: (value) => this.formatCurrency(Number(value)),
    },
    {
      key: 'newPrice',
      header: 'New Price',
      width: '12%',
      format: (value) => this.formatCurrency(Number(value)),
    },
    {
      key: 'change',
      header: 'Change',
      width: '10%',
      format: (value) => this.formatSignedCurrency(Number(value)),
      cellClass: (value) => Number(value) < 0 ? 'price-history__change--negative' : 'price-history__change--positive',
    },
    { key: 'actorId', header: 'Changed By', width: '14%' },
    {
      key: 'source',
      header: 'Source Channel',
      width: '14%',
      chipTone: (_value, row) => this.sourceTone(typeof row.source === 'string' ? row.source : ''),
    },
    { key: 'reason', header: 'Update Reason', width: '18%', textMode: 'wrap' },
  ];

  constructor() {
    this.route.queryParamMap.subscribe((params) => {
      this.groupId.set(String(params.get('groupId') || '').trim());
      this.variantId.set(String(params.get('variantId') || '').trim());

      const name = String(params.get('name') || '').trim();
      this.displayName.set(name || 'Price History');

      this.loadHistory();
    });
  }

  setRange(range: TrendRange): void {
    this.selectedRange.set(range);
  }

  goToPricing(): void {
    this.router.navigate(['/pricing/simple']);
  }

  private loadHistory(): void {
    const groupId = this.groupId();
    const variantId = this.variantId();

    if (!groupId && !variantId) {
      this.errorMessage.set('History scope is missing. Open history from Pricing Management table action.');
      this.entries.set([]);
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);
    this.pricingService.listPriceHistory({
      groupId,
      variantId,
      page: 1,
      limit: 500,
    }).subscribe({
      next: (response) => {
        this.loading.set(false);
        const history = response?.data || [];
        this.entries.set(history);

        if (!this.displayName()) {
          const first = history[0];
          this.displayName.set(first?.variantName || first?.groupName || 'Price History');
        }
      },
      error: (error) => {
        this.loading.set(false);
        this.entries.set([]);
        this.errorMessage.set(error?.error?.message || 'Failed to load price history.');
      },
    });
  }

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }

  private formatCompactCurrency(value: number): string {
    const rounded = Math.round(value);
    return `₹${rounded}`;
  }

  private formatSignedCurrency(value: number): string {
    const abs = Math.abs(value);
    const formatted = this.formatCurrency(abs);
    return `${value >= 0 ? '+' : '-'}${formatted}`;
  }

  private formatDateTime(value: string): string {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) {
      return '—';
    }

    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  }

  private formatDate(date: Date): string {
    if (!Number.isFinite(date.getTime())) {
      return '—';
    }

    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date);
  }

  private plotLeft(): number {
    return 56;
  }

  private plotRight(): number {
    return 700;
  }

  private plotTop(): number {
    return 14;
  }

  private plotBottom(): number {
    return 170;
  }

  private plotWidth(): number {
    return this.plotRight() - this.plotLeft();
  }

  private plotHeight(): number {
    return this.plotBottom() - this.plotTop();
  }

  private buildChartSeries(range: TrendRange, rows: SimplePricingPriceHistoryEntry[]): { labels: string[]; values: number[] } {
    if (!rows.length) {
      return { labels: [], values: [] };
    }

    const asc = [...rows].sort((left, right) =>
      new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
    );
    const latestEntry = asc.at(-1) || asc[0];
    const latest = new Date(latestEntry.createdAt);
    const latestValue = Number(latestEntry.newPrice?.sellingPrice || 0);
    const earliestValue = Number(asc[0].newPrice?.sellingPrice || latestValue || 0);
    const earliest = new Date(asc[0].createdAt);
    const rangeStart = this.getRangeStart(range, latest);
    const effectiveStart = new Date(Math.max(rangeStart.getTime(), earliest.getTime()));

    const buckets = this.buildBuckets(range, effectiveStart, latest);
    const values: number[] = [];
    let carry = earliestValue;

    for (const bucket of buckets) {
      const match = asc.filter((entry) => {
        const timestamp = new Date(entry.createdAt).getTime();
        return timestamp >= bucket.start.getTime() && timestamp <= bucket.end.getTime();
      });

      if (match.length) {
        carry = Number((match.at(-1)?.newPrice?.sellingPrice) || carry);
      }

      values.push(carry);
    }

    return {
      labels: buckets.map((bucket) => bucket.label),
      values,
    };
  }

  private buildBuckets(range: TrendRange, effectiveStart: Date, latest: Date): Array<{ start: Date; end: Date; label: string }> {
    if (range === 'DAY') {
      const start = new Date(effectiveStart);
      start.setMinutes(0, 0, 0);
      start.setHours(start.getHours() - (start.getHours() % 2));

      const end = new Date(latest);
      end.setMinutes(0, 0, 0);
      end.setHours(end.getHours() + (2 - (end.getHours() % 2 || 2)));

      const buckets: Array<{ start: Date; end: Date; label: string }> = [];
      for (let cursor = new Date(start); cursor <= end; cursor.setHours(cursor.getHours() + 2)) {
        const bucketStart = new Date(cursor);
        const bucketEnd = new Date(cursor);
        bucketEnd.setHours(bucketEnd.getHours() + 2);
        buckets.push({
          start: bucketStart,
          end: bucketEnd,
          label: bucketStart.toLocaleTimeString('en-IN', { hour: 'numeric', hour12: true }).replace(' ', ''),
        });
      }
      return buckets;
    }

    if (range === 'WEEK') {
      const start = new Date(effectiveStart);
      start.setHours(0, 0, 0, 0);
      const end = new Date(latest);
      end.setHours(23, 59, 59, 999);

      const buckets: Array<{ start: Date; end: Date; label: string }> = [];
      for (let cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
        const bucketStart = new Date(cursor);
        const bucketEnd = new Date(cursor);
        bucketEnd.setHours(23, 59, 59, 999);
        buckets.push({
          start: bucketStart,
          end: bucketEnd,
          label: bucketStart.toLocaleDateString('en-IN', { weekday: 'short' }),
        });
      }
      return buckets;
    }

    if (range === 'MONTH') {
      return this.buildHalfMonthBuckets(effectiveStart, latest);
    }

    if (range === 'QUARTER') {
      return this.buildHalfMonthBuckets(effectiveStart, latest);
    }

    const start = new Date(effectiveStart.getFullYear(), effectiveStart.getMonth(), 1);
    const end = new Date(latest.getFullYear(), latest.getMonth(), 1);
    const buckets: Array<{ start: Date; end: Date; label: string }> = [];
    for (let cursor = new Date(start); cursor <= end; cursor.setMonth(cursor.getMonth() + 1)) {
      const bucketStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
      const bucketEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0, 23, 59, 59, 999);
      buckets.push({
        start: bucketStart,
        end: bucketEnd,
        label: bucketStart.toLocaleDateString('en-IN', { month: 'short' }),
      });
    }
    return buckets;
  }

  private buildHalfMonthBuckets(start: Date, end: Date): Array<{ start: Date; end: Date; label: string }> {
    const firstMonth = new Date(start.getFullYear(), start.getMonth(), 1);
    const lastMonth = new Date(end.getFullYear(), end.getMonth(), 1);
    const buckets: Array<{ start: Date; end: Date; label: string }> = [];

    for (let cursor = new Date(firstMonth); cursor <= lastMonth; cursor.setMonth(cursor.getMonth() + 1)) {
      const month = cursor.getMonth();
      const year = cursor.getFullYear();

      const firstStart = new Date(year, month, 1);
      const firstEnd = new Date(year, month, 15, 23, 59, 59, 999);
      const secondStart = new Date(year, month, 16);
      const secondEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);
      const monthLabel = firstStart.toLocaleDateString('en-IN', { month: 'short' });

      if (firstEnd >= start && firstStart <= end) {
        buckets.push({ start: firstStart, end: firstEnd, label: `${monthLabel} W1` });
      }
      if (secondEnd >= start && secondStart <= end) {
        buckets.push({ start: secondStart, end: secondEnd, label: `${monthLabel} W3` });
      }
    }

    return buckets;
  }

  private getRangeStart(range: TrendRange, latest: Date): Date {
    const start = new Date(latest);
    if (range === 'DAY') {
      start.setDate(start.getDate() - 1);
      return start;
    }
    if (range === 'WEEK') {
      start.setDate(start.getDate() - 6);
      return start;
    }
    if (range === 'MONTH') {
      start.setDate(start.getDate() - 29);
      return start;
    }
    if (range === 'QUARTER') {
      start.setMonth(start.getMonth() - 2);
      start.setDate(1);
      return start;
    }
    start.setMonth(0, 1);
    start.setHours(0, 0, 0, 0);
    return start;
  }

  private formatSource(source: string): string {
    const normalized = String(source || '').trim().toUpperCase();
    if (normalized === 'MANUAL_PRICING') {
      return 'Pricing Management';
    }
    if (normalized === 'STOCK_REFRESH') {
      return 'Stock Update';
    }
    if (normalized === 'GROUP_REFRESH') {
      return 'Excel Import';
    }
    return normalized || 'Unknown';
  }

  private sourceTone(sourceLabel: string): 'info' | 'success' | 'warning' | 'neutral' {
    const normalized = String(sourceLabel || '').trim().toUpperCase();
    if (normalized.includes('EXCEL')) {
      return 'success';
    }
    if (normalized.includes('STOCK')) {
      return 'warning';
    }
    if (normalized.includes('PRICING')) {
      return 'info';
    }
    return 'neutral';
  }
}
