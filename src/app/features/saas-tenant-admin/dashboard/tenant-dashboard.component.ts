import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { interval } from 'rxjs';

import { FormControlsModule, GomAlertToastService, GomButtonComponent, GomCardComponent, GomModalComponent, GomTableColumn, GomTableComponent, GomTableRow } from '@gomlibs/ui';
import { NgApexchartsModule } from 'ng-apexcharts';
import { environment } from '../../../../environments/environment';
import { TenantAccessService } from '../services';
import { 
  TenantAdminSummary,
  TenantDashboardSummary,
  DashboardOrdersNeedingActionResponse,
  DashboardLowStockResponse,
  DashboardOutOfStockResponse,
  DashboardTopProductsResponse,
  DashboardSlowProductsResponse,
  AnalyticsSalesTrendsResponse,
  AnalyticsContributionResponse,
  AnalyticsCustomerMixResponse,
  AnalyticsReasonSplitsResponse,
  AnalyticsChannelSplitsResponse,
  AnalyticsDemandHeatmapResponse,
  AnalyticsPromotionResponse,
} from '../models';

type DashboardTab = 'OPERATIONS' | 'ANALYTICS';
type DrillDownType = 'ORDERS_NEEDING_ACTION' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'TOP_PRODUCTS' | 'SLOW_PRODUCTS' | null;
type Granularity = 'DAILY' | 'WEEKLY' | 'MONTHLY';
type DashboardDateRange = 'TODAY' | 'LAST_7_DAYS' | 'LAST_30_DAYS' | 'THIS_MONTH' | 'CUSTOM';

@Component({
  selector: 'gom-tenant-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, FormControlsModule, GomButtonComponent, GomCardComponent, GomModalComponent, GomTableComponent, NgApexchartsModule],
  templateUrl: './tenant-dashboard.component.html',
  styleUrl: './tenant-dashboard.component.scss',
})
export class TenantDashboardComponent implements OnInit {
  private static readonly DASHBOARD_TIMEZONE = 'Asia/Kolkata';

  private readonly service = inject(TenantAccessService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toast = inject(GomAlertToastService);

  readonly dashboardLoading = signal(false);
  readonly dashboardError = signal<string | null>(null);
  readonly tenantAdminSummary = signal<TenantAdminSummary | null>(null);
  readonly tenantSummaryLoading = signal(false);
  readonly supportModalOpen = signal(false);
  readonly supportRequestInFlight = signal(false);
  readonly activeTab = signal<DashboardTab>('OPERATIONS');
  readonly dashboardSummary = signal<TenantDashboardSummary | null>(null);
  readonly dashboardDateRange = signal<DashboardDateRange>('TODAY');
  readonly dashboardCustomFromDate = signal<string>('');
  readonly dashboardCustomToDate = signal<string>('');
  readonly dashboardFilterError = signal<string | null>(null);
  readonly dashboardDateRangeOptions: Array<{ value: DashboardDateRange; label: string }> = [
    { value: 'TODAY', label: 'Today' },
    { value: 'LAST_7_DAYS', label: 'Last 7 days' },
    { value: 'LAST_30_DAYS', label: 'Last 30 days' },
    { value: 'THIS_MONTH', label: 'This month' },
    { value: 'CUSTOM', label: 'Custom' },
  ];
  readonly supportPhone = environment.paymentSupportPhone;
  readonly supportEmail = environment.paymentSupportEmail;
  readonly supportCallbackSla = environment.paymentSupportCallbackSla;

  readonly trialActivationAlert = computed(() => {
    const tenant = this.tenantAdminSummary()?.tenant;
    if (!tenant || tenant.accountStatus !== 'TRIAL' || !tenant.trialEndAt) {
      return null;
    }

    const daysRemaining = this._daysUntil(tenant.trialEndAt);
    if (daysRemaining < 0 || daysRemaining > 10) {
      return null;
    }

    return {
      daysRemaining,
      accountName: tenant.accountName,
      urgency: daysRemaining <= 3 ? 'high' : 'normal',
      title: daysRemaining === 0
        ? 'Your trial ends today'
        : `Your trial ends in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}`,
    };
  });

  // Drill-down state signals
  readonly drillDownType = signal<DrillDownType>(null);
  readonly drillDownLoading = signal(false);
  readonly drillDownData = signal<
    DashboardOrdersNeedingActionResponse | 
    DashboardLowStockResponse | 
    DashboardOutOfStockResponse |
    DashboardTopProductsResponse | 
    DashboardSlowProductsResponse | 
    null
  >(null);

  // Analytics state signals
  readonly analyticsSalesTrends = signal<AnalyticsSalesTrendsResponse | null>(null);
  readonly analyticsLoading = signal(false);
  readonly analyticsContribution = signal<AnalyticsContributionResponse | null>(null);
  readonly analyticsCustomerMix = signal<AnalyticsCustomerMixResponse | null>(null);
  readonly analyticsReasonSplits = signal<AnalyticsReasonSplitsResponse | null>(null);
  readonly analyticsChannelSplits = signal<AnalyticsChannelSplitsResponse | null>(null);
  readonly analyticsDemandHeatmap = signal<AnalyticsDemandHeatmapResponse | null>(null);
  readonly analyticsContributionLoading = signal(false);
  readonly analyticsCustomerMixLoading = signal(false);
  readonly analyticsReasonSplitsLoading = signal(false);
  readonly analyticsChannelSplitsLoading = signal(false);
  readonly analyticsDemandHeatmapLoading = signal(false);

  // Sprint 4: Granularity auto-derived from date range
  readonly analyticsGranularity = signal<Granularity>('DAILY');

  // Sprint 4: Last-updated timestamps
  readonly summaryLastUpdated = signal<Date | null>(null);
  readonly analyticsLastUpdated = signal<Date | null>(null);

  // Sprint 4: Heatmap max count for color intensity
  readonly heatmapMaxCount = computed(() => {
    const buckets = this.analyticsDemandHeatmap()?.data.hourlyBuckets ?? [];
    return Math.max(1, ...buckets.map((b) => b.orderCount));
  });

  // Promotion analytics signals
  readonly analyticsPromotion = signal<AnalyticsPromotionResponse | null>(null);
  readonly analyticsPromotionLoading = signal(false);

  // Chart color palettes
  private readonly CHART_COLORS_BLUE = ['#0c3f75', '#1d6fad', '#3b9fe0', '#64c1f5', '#a0d8f8', '#d0ecfc'];
  private readonly CHART_COLORS_WARM = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899'];
  private readonly CHART_COLORS_MIXED = ['#a855f7', '#ec4899', '#f97316', '#22c55e', '#06b6d4', '#eab308'];

  // Static hour labels for heatmap matrix header (every 4 hours)
  readonly heatmapHourLabels = Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    label: h % 4 === 0 ? (h === 0 ? '12AM' : h < 12 ? `${h}AM` : h === 12 ? '12PM' : `${h - 12}PM`) : '',
  }));

  // Applied-filters label
  readonly appliedFilterDateLabel = computed(() => {
    const range = this.dashboardDateRange();
    if (range === 'CUSTOM') {
      const from = this.dashboardCustomFromDate();
      const to = this.dashboardCustomToDate();
      return from && to ? `${from} – ${to}` : 'Custom range';
    }
    const p = this._buildDashboardParams();
    return `${p.fromDate} – ${p.toDate}`;
  });

  // Sales Trends chart
  readonly salesTrendsTotal = computed(() => {
    const t = this.analyticsSalesTrends();
    if (!t) return '';
    const total = t.data.current.reduce((s, p) => s + p.netSales, 0);
    const cur = t.data.current[0]?.currency ?? 'INR';
    return `${cur} ${total.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  });

  readonly salesTrendsTrendPct = computed((): number | null => {
    const t = this.analyticsSalesTrends();
    if (!t) return null;
    const curr = t.data.current.reduce((s, p) => s + p.netSales, 0);
    const prev = t.data.previous.reduce((s, p) => s + p.netSales, 0);
    if (prev === 0) return null;
    return +((curr - prev) / prev * 100).toFixed(1);
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly salesTrendsChart = computed((): any | null => {
    const t = this.analyticsSalesTrends();
    if (!t || !t.data.current.length) return null;
    const currency = t.data.current[0]?.currency ?? 'INR';
    return {
      series: [
        { name: 'Current Period', data: t.data.current.map(p => +p.netSales.toFixed(2)) },
        { name: 'Previous Period', data: t.data.previous.map(p => +p.netSales.toFixed(2)) },
      ],
      chart: { type: 'line', height: 260, toolbar: { show: false }, zoom: { enabled: false }, fontFamily: 'inherit' },
      xaxis: { categories: t.data.current.map(p => p.period), labels: { rotate: -35, style: { fontSize: '10px' } } },
      stroke: { curve: 'smooth', width: [2, 2], dashArray: [0, 5] },
      colors: ['#0c3f75', '#94a3b8'],
      dataLabels: { enabled: false },
      tooltip: { y: { formatter: (v: number) => `${currency} ${(+v).toLocaleString('en-IN')}` } },
      grid: { borderColor: '#e2e8f0', strokeDashArray: 4 },
      legend: { show: true, position: 'top' },
      yaxis: { labels: { style: { fontSize: '11px' }, formatter: (v: number) => `${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}` } },
    };
  });

  // Contribution donut
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly categoryDonutChart = computed((): any | null => {
    const c = this.analyticsContribution();
    if (!c || !c.data.categories.length) return null;
    return {
      series: c.data.categories.map(cat => cat.netSales),
      chart: { type: 'donut', height: 280, fontFamily: 'inherit' },
      labels: c.data.categories.map(cat => cat.categoryName),
      colors: this.CHART_COLORS_BLUE,
      legend: { position: 'right', fontSize: '12px' },
      dataLabels: { enabled: false },
      plotOptions: { pie: { donut: { size: '65%', labels: { show: true, total: { show: true, label: 'Total', formatter: () => `${c.data.currency} ${c.data.totalNetSales.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` } } } } },
      tooltip: { y: { formatter: (v: number) => `${c.data.currency} ${v.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` } },
    };
  });

  // Customer mix donut
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly customerDonutChart = computed((): any | null => {
    const m = this.analyticsCustomerMix();
    if (!m) return null;
    const total = m.data.newCustomers + m.data.repeatCustomers;
    if (total === 0) return null;
    return {
      series: [m.data.repeatCustomers, m.data.newCustomers],
      chart: { type: 'donut', height: 240, fontFamily: 'inherit' },
      labels: [`Repeat (${m.data.repeatCustomers})`, `New (${m.data.newCustomers})`],
      colors: ['#0c3f75', '#64c1f5'],
      legend: { position: 'bottom' },
      dataLabels: { enabled: false },
      plotOptions: { pie: { donut: { size: '70%', labels: { show: true, total: { show: true, label: 'Repeat', formatter: () => `${m.data.repeatSharePercent.toFixed(0)}%` } } } } },
    };
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly repeatTrendChart = computed((): any | null => {
    const m = this.analyticsCustomerMix();
    if (!m?.data.series?.length) return null;
    return {
      series: [{ name: 'Repeat Share %', data: m.data.series.map(s => {
        const total = s.newCustomers + s.repeatCustomers;
        return total > 0 ? +((s.repeatCustomers / total) * 100).toFixed(1) : 0;
      }) }],
      chart: { type: 'area', height: 180, toolbar: { show: false }, zoom: { enabled: false }, fontFamily: 'inherit' },
      xaxis: { categories: m.data.series.map(s => s.period), labels: { style: { fontSize: '10px' } } },
      stroke: { curve: 'smooth', width: 2 },
      colors: ['#0c3f75'],
      dataLabels: { enabled: false },
      fill: { type: 'gradient', gradient: { opacityFrom: 0.35, opacityTo: 0.05 } },
      tooltip: { y: { formatter: (v: number) => `${v}%` } },
      grid: { borderColor: '#e2e8f0', strokeDashArray: 4 },
      yaxis: { min: 0, max: 100, labels: { formatter: (v: number) => `${v}%` } },
    };
  });

  // Loss analytics donuts
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly cancellationDonutChart = computed((): any | null => {
    const r = this.analyticsReasonSplits();
    if (!r?.data.cancellations.length) return null;
    return {
      series: r.data.cancellations.map(c => c.count),
      chart: { type: 'donut', height: 260, fontFamily: 'inherit' },
      labels: r.data.cancellations.map(c => c.reason),
      colors: this.CHART_COLORS_WARM,
      legend: { position: 'right', fontSize: '11px' },
      dataLabels: { enabled: false },
      plotOptions: { pie: { donut: { size: '60%', labels: { show: true, total: { show: true, label: 'Total', formatter: () => `${r.data.cancellations.reduce((s, c) => s + c.count, 0)}` } } } } },
      tooltip: { y: { formatter: (v: number, opts: any) => `${v} (${r.data.cancellations[opts?.seriesIndex ?? 0]?.percent ?? 0}%)` } },
    };
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly refundDonutChart = computed((): any | null => {
    const r = this.analyticsReasonSplits();
    if (!r?.data.refunds.length) return null;
    return {
      series: r.data.refunds.map(c => c.count),
      chart: { type: 'donut', height: 260, fontFamily: 'inherit' },
      labels: r.data.refunds.map(c => c.reason),
      colors: ['#f97316', '#ef4444', '#eab308', '#06b6d4', '#8b5cf6', '#22c55e', '#ec4899'],
      legend: { position: 'right', fontSize: '11px' },
      dataLabels: { enabled: false },
      plotOptions: { pie: { donut: { size: '60%', labels: { show: true, total: { show: true, label: 'Total', formatter: () => `${r.data.refunds.reduce((s, c) => s + c.count, 0)}` } } } } },
      tooltip: { y: { formatter: (v: number, opts: any) => `${v} (${r.data.refunds[opts?.seriesIndex ?? 0]?.percent ?? 0}%)` } },
    };
  });

  // Channel analytics donuts
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly paymentDonutChart = computed((): any | null => {
    const ch = this.analyticsChannelSplits();
    if (!ch?.data.paymentMethods.length) return null;
    return {
      series: ch.data.paymentMethods.map(p => p.orderCount),
      chart: { type: 'donut', height: 280, fontFamily: 'inherit' },
      labels: ch.data.paymentMethods.map(p => p.method),
      colors: this.CHART_COLORS_BLUE,
      legend: { position: 'bottom', fontSize: '11px' },
      dataLabels: { enabled: false },
      plotOptions: { pie: { donut: { size: '65%', labels: { show: true, total: { show: true, label: 'Total Orders', formatter: () => `${ch.data.paymentMethods.reduce((s, p) => s + p.orderCount, 0)}` } } } } },
    };
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly sourceDonutChart = computed((): any | null => {
    const ch = this.analyticsChannelSplits();
    if (!ch?.data.orderSources.length) return null;
    return {
      series: ch.data.orderSources.map(s => s.orderCount),
      chart: { type: 'donut', height: 280, fontFamily: 'inherit' },
      labels: ch.data.orderSources.map(s => s.source),
      colors: this.CHART_COLORS_MIXED,
      legend: { position: 'bottom', fontSize: '11px' },
      dataLabels: { enabled: false },
      plotOptions: { pie: { donut: { size: '65%', labels: { show: true, total: { show: true, label: 'Total Orders', formatter: () => `${ch.data.orderSources.reduce((s, src) => s + src.orderCount, 0)}` } } } } },
    };
  });

  // Heatmap helpers
  readonly heatmapDayMaxCount = computed(() => {
    const hm = this.analyticsDemandHeatmap();
    if (!hm?.data.dayMatrix?.length) return this.heatmapMaxCount();
    return Math.max(1, ...hm.data.dayMatrix.flatMap(row => row.hours.map(h => h.orderCount)));
  });

  readonly peakDemandWindow = computed(() => {
    const hm = this.analyticsDemandHeatmap();
    if (!hm) return 'N/A';
    const buckets = hm.data.hourlyBuckets;
    const peak = buckets.reduce((max, b) => b.orderCount > max.orderCount ? b : max, { hour: 0, orderCount: 0 } as { hour: number; orderCount: number });
    if (peak.orderCount === 0) return 'N/A';
    const fmt = (h: number) => `${h === 0 ? 12 : h > 12 ? h - 12 : h} ${h < 12 ? 'AM' : 'PM'}`;
    return `${fmt(peak.hour)} – ${fmt((peak.hour + 1) % 24)}`;
  });

  readonly dailyAvgOrders = computed(() => {
    const hm = this.analyticsDemandHeatmap();
    const rows = hm?.data.dayMatrix ?? [];
    if (!rows.length) {
      return 0;
    }
    const totalOrders = rows.reduce((sum, row) => sum + row.hours.reduce((s, h) => s + h.orderCount, 0), 0);
    return Math.round(totalOrders / rows.length);
  });

  readonly topPeakDays = computed(() => {
    const hm = this.analyticsDemandHeatmap();
    const rows = hm?.data.dayMatrix ?? [];
    return rows
      .map((row) => ({
        day: row.day,
        orders: row.hours.reduce((sum, h) => sum + h.orderCount, 0),
      }))
      .sort((a, b) => b.orders - a.orders)
      .slice(0, 3);
  });

  readonly topPeakDayMax = computed(() => {
    const topDays = this.topPeakDays();
    return Math.max(1, ...topDays.map((d) => d.orders));
  });

  readonly operationsCards = computed(() => {
    const dashboard = this.dashboardSummary();
    const activeOrdersCount = dashboard?.data.activeOrders?.count ?? 0;
    const needsActionCount = dashboard?.data.ordersNeedingAction?.count ?? 0;
    const newOrdersTodayCount = dashboard?.data.newOrdersToday?.count ?? 0;
    const salesTodayCurrency = dashboard?.data.salesToday?.currency || 'INR';
    const salesTodayAmount = dashboard?.data.salesToday?.netAmount ?? 0;
    const paymentPendingCurrency = dashboard?.data.paymentPending?.currency || 'INR';
    const paymentPendingAmount = dashboard?.data.paymentPending?.pendingAmount ?? 0;
    const lowStockCount = dashboard?.data.lowStock?.count ?? 0;

    return [
      {
        key: 'activeOrders',
        iconClass: 'ri-stack-line',
        label: 'Active Orders',
        value: activeOrdersCount,
        helperText: activeOrdersCount > 0 ? 'Open workload in progress' : 'No active processing queue',
        tone: 'info',
        trendText: null as string | null,
        trendDirection: 'flat',
        action: () => this.router.navigate(['/orders/list']),
      },
      {
        key: 'ordersNeedingAction',
        iconClass: 'ri-alarm-warning-line',
        label: 'Orders Needing Action',
        value: needsActionCount,
        helperText: needsActionCount > 0 ? 'Immediate intervention needed' : 'No blocked orders right now',
        tone: needsActionCount > 0 ? 'danger' : 'info',
        featured: true,
        trendText: null as string | null,
        trendDirection: 'flat',
        action: () => this.router.navigate(['/orders/list']),
      },
      {
        key: 'newOrdersToday',
        iconClass: 'ri-shopping-bag-3-line',
        label: 'New Orders Today',
        value: newOrdersTodayCount,
        helperText: 'Since business day start',
        tone: 'info',
        trendText: null as string | null,
        trendDirection: 'flat',
        action: () => this.router.navigate(['/orders/list']),
      },
      {
        key: 'salesToday',
        iconClass: 'ri-money-rupee-circle-line',
        label: 'Sales Today',
        value: `${salesTodayCurrency} ${salesTodayAmount.toFixed(2)}`,
        helperText: salesTodayAmount > 0 ? 'Net completed sales today' : 'No realized sales yet',
        tone: 'success',
        trendText: null as string | null,
        trendDirection: 'flat',
        action: () => this.router.navigate(['/orders/list']),
      },
      {
        key: 'paymentPending',
        iconClass: 'ri-wallet-3-line',
        label: 'Payment Pending',
        value: `${paymentPendingCurrency} ${paymentPendingAmount.toFixed(2)}`,
        helperText: paymentPendingAmount > 0 ? 'Outstanding amount to collect' : 'No pending collection',
        tone: paymentPendingAmount > 0 ? 'danger' : 'info',
        featured: true,
        trendText: null as string | null,
        trendDirection: 'flat',
        action: () => this.router.navigate(['/orders/list']),
      },
      {
        key: 'lowStock',
        iconClass: 'ri-alert-line',
        label: 'Low Stock Alerts',
        value: lowStockCount,
        helperText: lowStockCount > 0 ? 'Restock attention required' : 'Stock levels look healthy',
        tone: lowStockCount > 0 ? 'warning' : 'info',
        trendText: null as string | null,
        trendDirection: 'flat',
        action: () => this.router.navigate(['/product/stock']),
      },
    ];
  });

  readonly criticalAlerts = computed(() => {
    const dashboard = this.dashboardSummary();
    const ordersNeedingActionCount = dashboard?.data.ordersNeedingAction?.count ?? 0;
    const lowStockCount = dashboard?.data.lowStock?.count ?? 0;
    const paymentPendingCurrency = dashboard?.data.paymentPending?.currency || 'INR';
    const paymentPendingAmount = dashboard?.data.paymentPending?.pendingAmount ?? 0;

    return [
      {
        key: 'ordersNeedingAction',
        label: 'Orders need immediate action',
        value: `${ordersNeedingActionCount}`,
        iconClass: 'ri-error-warning-line',
        tone: ordersNeedingActionCount > 0 ? 'danger' : 'neutral',
        action: () => this.router.navigate(['/orders/list']),
      },
      {
        key: 'lowStock',
        label: 'Critical low stock items',
        value: `${lowStockCount}`,
        iconClass: 'ri-alert-line',
        tone: lowStockCount > 0 ? 'warning' : 'neutral',
        action: () => this.router.navigate(['/product/stock']),
      },
      {
        key: 'paymentPending',
        label: 'Payment pending',
        value: `${paymentPendingCurrency} ${paymentPendingAmount.toFixed(2)}`,
        iconClass: 'ri-wallet-3-line',
        tone: paymentPendingAmount > 0 ? 'danger' : 'neutral',
        action: () => this.router.navigate(['/orders/list']),
      },
    ];
  });

  readonly quickActions = computed(() => this.dashboardSummary()?.data.quickActions?.items || []);

  readonly statusFunnelStages = computed(() => this.dashboardSummary()?.data.statusFunnel?.stages ?? []);

  readonly funnelVisualStages = computed(() => {
    const stages = this.statusFunnelStages();
    if (!stages.length) {
      return [];
    }

    const firstCount = Math.max(1, stages[0].count ?? 0);
    const baseWidths = [100, 84, 68, 52, 38];
    let prevCount = Math.max(0, stages[0].count ?? 0);

    return stages.map((stage, index) => {
      const rawCount = Math.max(0, stage.count ?? 0);
      const adjustedCount = index === 0 ? rawCount : Math.min(rawCount, prevCount);
      const conversionPercent = index === 0 ? 100 : (prevCount > 0 ? (adjustedCount / prevCount) * 100 : 0);
      const dataWidth = Math.max(18, (adjustedCount / firstCount) * 100);
      const baseWidth = baseWidths[index] ?? Math.max(30, 100 - index * 12);
      const widthPercent = Math.max(dataWidth, baseWidth);
      const conversionDisplay = `${Number(conversionPercent.toFixed(1))}%`;
      const conversionContext = index === 0
        ? `${adjustedCount}/${Math.max(adjustedCount, 1)} baseline`
        : `${adjustedCount}/${Math.max(prevCount, 1)} from previous`;

      prevCount = adjustedCount;

      return {
        ...stage,
        adjustedCount,
        conversionPercent: Number(conversionPercent.toFixed(1)),
        conversionDisplay,
        conversionContext,
        widthPercent: Number(widthPercent.toFixed(1)),
      };
    });
  });

  readonly largestFunnelDrop = computed(() => {
    const stages = this.funnelVisualStages();
    if (stages.length < 2) {
      return null;
    }

    let maxDrop = -1;
    let fromLabel = '';
    let toLabel = '';

    for (let i = 1; i < stages.length; i += 1) {
      const dropPercent = Number((100 - stages[i].conversionPercent).toFixed(1));
      if (dropPercent > maxDrop) {
        maxDrop = dropPercent;
        fromLabel = stages[i - 1].label || stages[i - 1].status;
        toLabel = stages[i].label || stages[i].status;
      }
    }

    return maxDrop > 0
      ? {
          fromLabel,
          toLabel,
          dropPercent: maxDrop,
        }
      : null;
  });

  readonly topProductsItems = computed(() => this.dashboardSummary()?.data.topProducts?.items ?? []);

  readonly topProductsMaxQuantitySold = computed(() => {
    const items = this.topProductsItems();
    return Math.max(1, items[0]?.quantitySold ?? 0);
  });

  readonly outOfStockTableColumns: GomTableColumn<GomTableRow>[] = [
    { key: 'productName', header: 'Product Name', sortable: true, width: '18rem' },
    { key: 'onHand', header: 'On Hand', sortable: true, width: '8rem' },
    { key: 'reserved', header: 'Reserved', sortable: true, width: '8rem' },
    { key: 'available', header: 'Available', sortable: true, width: '8rem' },
  ];

  readonly outOfStockTableRows = computed<GomTableRow[]>(() => {
    if (this.drillDownType() !== 'OUT_OF_STOCK') {
      return [];
    }

    const data = this.drillDownData() as DashboardOutOfStockResponse | null;
    const items = data?.data?.items ?? [];
    return items.map((item) => ({
      variantId: item.variantId,
      productName: item.productName,
      onHand: item.onHand,
      reserved: item.reserved,
      available: item.available,
    }));
  });

  readonly topProductsTableColumns: GomTableColumn<GomTableRow>[] = [
    { key: 'productName', header: 'Product Name', sortable: true, width: '18rem' },
    { key: 'quantitySold', header: 'Quantity Sold', sortable: true, width: '10rem' },
    { key: 'netSales', header: 'Net Sales', sortable: true, width: '12rem' },
  ];

  readonly topProductsTableRows = computed<GomTableRow[]>(() => {
    if (this.drillDownType() !== 'TOP_PRODUCTS') {
      return [];
    }

    const data = this.drillDownData() as DashboardTopProductsResponse | null;
    const items = data?.data?.items ?? [];
    return items.map((item) => ({
      variantId: item.variantId,
      productName: item.productName,
      quantitySold: item.quantitySold,
      netSales: `${item.currency} ${item.netSalesAmount.toFixed(2)}`,
    }));
  });

  readonly entitlementItems = computed(() => this.dashboardSummary()?.data.entitlementUsage?.items ?? []);

  readonly operationsCompareLabel = computed(() => {
    switch (this.dashboardDateRange()) {
      case 'TODAY':
        return 'for today';
      case 'LAST_30_DAYS':
        return 'for last 30 days';
      case 'THIS_MONTH':
        return 'for this month';
      case 'CUSTOM':
        if (this.dashboardCustomFromDate() && this.dashboardCustomToDate()) {
          return `for ${this.dashboardCustomFromDate()} to ${this.dashboardCustomToDate()}`;
        }
        return 'for selected range';
      case 'LAST_7_DAYS':
      default:
        return 'for last 7 days';
    }
  });

  readonly middleRowCards = computed(() => {
    const dashboard = this.dashboardSummary();
    const funnelStages = dashboard?.data.statusFunnel?.stages ?? [];
    const outOfStockCount = dashboard?.data.outOfStock?.count ?? 0;
    const topProductsCount = dashboard?.data.topProducts?.items?.length ?? 0;
    const slowProductsCount = dashboard?.data.slowProducts?.items?.length ?? 0;

    return [
      {
        key: 'statusFunnel',
        iconClass: 'ri-filter-3-line',
        label: 'Order Funnel',
        value: `${funnelStages.length} stages`,
        helperText: funnelStages.length ? 'Track where orders are getting stuck' : 'No funnel stages available',
        action: () => this.openDrillDown('ORDERS_NEEDING_ACTION'),
      },
      {
        key: 'outOfStock',
        iconClass: 'ri-close-circle-line',
        label: 'Out of Stock',
        value: outOfStockCount,
        helperText: outOfStockCount > 0 ? 'Potential lost sales if not restocked' : 'No out-of-stock items',
        action: () => this.openDrillDown('LOW_STOCK'),
      },
      {
        key: 'topProducts',
        iconClass: 'ri-trophy-line',
        label: 'Top Products',
        value: `${topProductsCount} products`,
        helperText: 'Best-performing products in current window',
        action: () => this.openDrillDown('TOP_PRODUCTS'),
      },
      {
        key: 'slowProducts',
        iconClass: 'ri-timer-line',
        label: 'Slow Products',
        value: `${slowProductsCount} products`,
        helperText: 'Candidates for bundles or markdowns',
        action: () => this.openDrillDown('SLOW_PRODUCTS'),
      },
    ];
  });

  readonly bottomRowCards = computed(() => {
    const dashboard = this.dashboardSummary();
    const currency = dashboard?.data.salesToday?.currency || 'INR';

    const rangeLabel: Record<DashboardDateRange, string> = {
      TODAY: 'Today',
      LAST_7_DAYS: 'Last 7 Days',
      LAST_30_DAYS: 'Last 30 Days',
      THIS_MONTH: 'This Month',
      CUSTOM: 'Custom Period',
    };
    const periodLabel = rangeLabel[this.dashboardDateRange()];

    return [
      {
        key: 'salesPeriod',
        iconClass: 'ri-line-chart-line',
        label: `Net Sales (${periodLabel})`,
        value: `${currency} ${(dashboard?.data.salesTrends?.periodNetSales ?? 0).toFixed(2)}`,
        subLabel: 'net completed sales in period',
      },
      {
        key: 'aov',
        iconClass: 'ri-shopping-cart-2-line',
        label: 'Avg Order Value',
        value: `${currency} ${(dashboard?.data.aov?.value ?? 0).toFixed(2)}`,
        subLabel: 'per order (net)',
      },
      {
        key: 'cancellationRate',
        iconClass: 'ri-close-circle-line',
        label: 'Cancellation Rate',
        value: `${(dashboard?.data.cancellationRate?.percentage ?? 0).toFixed(1)}%`,
        subLabel: `${dashboard?.data.cancellationRate?.cancelledOrders ?? 0} of ${dashboard?.data.cancellationRate?.totalOrders ?? 0} orders`,
      },
      {
        key: 'returnRefund',
        iconClass: 'ri-arrow-go-back-line',
        label: 'Refunds',
        value: `${currency} ${(dashboard?.data.returnRefund?.refundedAmount ?? 0).toFixed(2)}`,
        subLabel: `${dashboard?.data.returnRefund?.refundedOrders ?? 0} refunded orders`,
      },
      {
        key: 'newCustomersToday',
        iconClass: 'ri-user-add-line',
        label: 'New Customers Today',
        value: dashboard?.data.newCustomersToday?.count ?? 0,
        subLabel: 'first-time buyers',
      },
      {
        key: 'repeatCustomerRate',
        iconClass: 'ri-user-heart-line',
        label: 'Repeat Customer Rate',
        value: `${(dashboard?.data.repeatCustomerRate?.percentage ?? 0).toFixed(1)}%`,
        subLabel: `${dashboard?.data.repeatCustomerRate?.repeatCustomers ?? 0} repeat of ${dashboard?.data.repeatCustomerRate?.purchasingCustomers ?? 0}`,
      },
      {
        key: 'offerPerformance',
        iconClass: 'ri-price-tag-3-line',
        label: 'Offer Performance',
        value: `${dashboard?.data.offerPerformance?.usedCount ?? 0} offers used`,
        subLabel: `${currency} ${(dashboard?.data.offerPerformance?.discountAmount ?? 0).toFixed(2)} discount given`,
      },
      {
        key: 'grossProfit',
        iconClass: 'ri-funds-line',
        label: 'Gross Profit',
        value: `${currency} ${(dashboard?.data.profitability?.grossProfit ?? 0).toFixed(2)}`,
        subLabel: dashboard?.data.profitability?.grossMarginPct != null
          ? `${(dashboard.data.profitability.grossMarginPct).toFixed(1)}% margin · COGS ${currency} ${(dashboard?.data.profitability?.cogsTotal ?? 0).toFixed(2)}`
          : 'No cost data yet',
      },
    ];
  });

  ngOnInit(): void {
    this.loadDashboardSummary();
    this.loadTenantAdminSummary();
    this.startAutoRefresh();
  }

  setTab(tab: DashboardTab): void {
    this.activeTab.set(tab);
    if (tab === 'ANALYTICS') {
      const hasAnyAnalyticsData = !!(
        this.analyticsSalesTrends() ||
        this.analyticsContribution() ||
        this.analyticsCustomerMix() ||
        this.analyticsReasonSplits() ||
        this.analyticsChannelSplits() ||
        this.analyticsDemandHeatmap() ||
        this.analyticsPromotion()
      );

      if (!hasAnyAnalyticsData) {
        this.loadAllAnalytics();
      }
    }
  }

  refreshDashboard(): void {
    this.loadDashboardSummary();
    this.loadTenantAdminSummary();
  }

  openSupportActivationModal(): void {
    this.supportModalOpen.set(true);
  }

  closeSupportActivationModal(): void {
    this.supportModalOpen.set(false);
  }

  requestSupportCallback(): void {
    if (this.supportRequestInFlight()) {
      return;
    }

    this.supportRequestInFlight.set(true);
    this.service
      .requestBillingSupportCallback({
        source: 'TENANT_DASHBOARD_ALERT',
        preferredChannel: 'CALL',
        note: 'Tenant admin requested activation support from trial dashboard alert.',
      })
      .subscribe({
        next: () => {
          this.supportRequestInFlight.set(false);
          this.supportModalOpen.set(false);
          this.toast.success('Support request sent. Our billing team will call you back shortly.');
        },
        error: () => {
          this.supportRequestInFlight.set(false);
          this.toast.error('Unable to submit support request right now. Please call billing support directly.');
        },
      });
  }

  setDashboardDateRange(value: DashboardDateRange): void {
    this.dashboardDateRange.set(value);
    this.dashboardFilterError.set(null);
    if (value === 'CUSTOM') {
      const today = this._formatDate(new Date());
      if (!this.dashboardCustomFromDate()) {
        this.dashboardCustomFromDate.set(today);
      }
      if (!this.dashboardCustomToDate()) {
        this.dashboardCustomToDate.set(today);
      }
      return;
    }
    this.refreshDashboardWithFilters();
  }

  applyCustomDateRange(): void {
    if (this.dashboardDateRange() !== 'CUSTOM') {
      return;
    }

    const from = this.dashboardCustomFromDate();
    const to = this.dashboardCustomToDate();
    if (!from || !to) {
      this.dashboardFilterError.set('Select both from and to dates for custom range.');
      return;
    }
    if (from > to) {
      this.dashboardFilterError.set('From date cannot be after to date.');
      return;
    }

    this.dashboardFilterError.set(null);
    this.refreshDashboardWithFilters();
  }

  openQuickAction(route: string): void {
    if (!route) {
      return;
    }
    this.router.navigate([route]);
  }

  quickActionGlyph(code?: string): string {
    switch (code) {
      case 'CREATE_ORDER':
        return 'ri-add-circle-line';
      case 'OPEN_PENDING_ACTIONS':
        return 'ri-alarm-warning-line';
      case 'ADD_STOCK':
        return 'ri-store-2-line';
      case 'OPEN_LOW_STOCK':
        return 'ri-error-warning-line';
      case 'OPEN_OUT_OF_STOCK':
        return 'ri-close-circle-line';
      case 'OPEN_ORDERS':
        return 'ri-file-list-3-line';
      default:
        return 'ri-arrow-right-up-line';
    }
  }

  openDrillDown(type: DrillDownType): void {
    if (!type) {
      this.drillDownType.set(null);
      this.drillDownData.set(null);
      return;
    }

    this.drillDownType.set(type);
    this.loadDrillDownData(type);
  }

  private loadDrillDownData(type: DrillDownType): void {
    this.drillDownLoading.set(true);
    const dashboardParams = this._buildDashboardParams();

    switch (type) {
      case 'ORDERS_NEEDING_ACTION':
        this.service.getDashboardOrdersNeedingAction({ page: 1, limit: 20, ...dashboardParams }).subscribe({
          next: (data) => {
            this.drillDownData.set(data);
            this.drillDownLoading.set(false);
          },
          error: () => {
            this.drillDownData.set(null);
            this.drillDownLoading.set(false);
          },
        });
        break;

      case 'OUT_OF_STOCK':
        this.service.getDashboardOutOfStock({ page: 1, limit: 50 }).subscribe({
          next: (data) => {
            this.drillDownData.set(data);
            this.drillDownLoading.set(false);
          },
          error: () => {
            this.drillDownData.set(null);
            this.drillDownLoading.set(false);
          },
        });
        break;

      case 'LOW_STOCK':
        this.service.getDashboardLowStock({ page: 1, limit: 20, ...dashboardParams }).subscribe({
          next: (data) => {
            this.drillDownData.set(data);
            this.drillDownLoading.set(false);
          },
          error: () => {
            this.drillDownData.set(null);
            this.drillDownLoading.set(false);
          },
        });
        break;

      case 'TOP_PRODUCTS':
        this.service.getDashboardTopProducts({ page: 1, limit: 10, ...dashboardParams }).subscribe({
          next: (data) => {
            this.drillDownData.set(data);
            this.drillDownLoading.set(false);
          },
          error: () => {
            const summaryTopProducts = this.dashboardSummary()?.data?.topProducts;
            if (summaryTopProducts) {
              this.drillDownData.set({ success: true, data: summaryTopProducts } as DashboardTopProductsResponse);
            } else {
              this.drillDownData.set(null);
            }
            this.drillDownLoading.set(false);
          },
        });
        break;

      case 'SLOW_PRODUCTS':
        this.service.getDashboardSlowProducts({ page: 1, limit: 20, ...dashboardParams }).subscribe({
          next: (data) => {
            this.drillDownData.set(data);
            this.drillDownLoading.set(false);
          },
          error: () => {
            this.drillDownData.set(null);
            this.drillDownLoading.set(false);
          },
        });
        break;
    }
  }

  loadSalesTrends(): void {
    this.analyticsLoading.set(true);
    const params = this._buildAnalyticsParams();
    this.service.getAnalyticsSalesTrends({ ...params, granularity: this.analyticsGranularity() }).subscribe({
      next: (trends) => {
        this.analyticsSalesTrends.set(trends);
        this.analyticsLoading.set(false);
        this.analyticsLastUpdated.set(new Date());
      },
      error: () => {
        this.analyticsSalesTrends.set(null);
        this.analyticsLoading.set(false);
      },
    });
  }

  loadAnalyticsContribution(): void {
    this.analyticsContributionLoading.set(true);
    this.service.getAnalyticsContribution(this._buildAnalyticsParams()).subscribe({
      next: (data) => { this.analyticsContribution.set(data); this.analyticsContributionLoading.set(false); },
      error: () => { this.analyticsContribution.set(null); this.analyticsContributionLoading.set(false); },
    });
  }

  loadAnalyticsCustomerMix(): void {
    this.analyticsCustomerMixLoading.set(true);
    this.service.getAnalyticsCustomerMix({ ...this._buildAnalyticsParams(), granularity: this.analyticsGranularity() }).subscribe({
      next: (data) => { this.analyticsCustomerMix.set(data); this.analyticsCustomerMixLoading.set(false); },
      error: () => { this.analyticsCustomerMix.set(null); this.analyticsCustomerMixLoading.set(false); },
    });
  }

  loadAnalyticsReasonSplits(): void {
    this.analyticsReasonSplitsLoading.set(true);
    this.service.getAnalyticsReasonSplits(this._buildAnalyticsParams()).subscribe({
      next: (data) => { this.analyticsReasonSplits.set(data); this.analyticsReasonSplitsLoading.set(false); },
      error: () => { this.analyticsReasonSplits.set(null); this.analyticsReasonSplitsLoading.set(false); },
    });
  }

  loadAnalyticsChannelSplits(): void {
    this.analyticsChannelSplitsLoading.set(true);
    this.service.getAnalyticsChannelSplits(this._buildAnalyticsParams()).subscribe({
      next: (data) => { this.analyticsChannelSplits.set(data); this.analyticsChannelSplitsLoading.set(false); },
      error: () => { this.analyticsChannelSplits.set(null); this.analyticsChannelSplitsLoading.set(false); },
    });
  }

  loadAnalyticsDemandHeatmap(): void {
    this.analyticsDemandHeatmapLoading.set(true);
    this.service.getAnalyticsDemandHeatmap(this._buildAnalyticsParams()).subscribe({
      next: (data) => { this.analyticsDemandHeatmap.set(data); this.analyticsDemandHeatmapLoading.set(false); },
      error: () => { this.analyticsDemandHeatmap.set(null); this.analyticsDemandHeatmapLoading.set(false); },
    });
  }

  loadAllAnalytics(): void {
    this.loadSalesTrends();
    this.loadAnalyticsContribution();
    this.loadAnalyticsCustomerMix();
    this.loadAnalyticsReasonSplits();
    this.loadAnalyticsChannelSplits();
    this.loadAnalyticsDemandHeatmap();
    this.loadAnalyticsPromotion();
  }

  loadAnalyticsPromotion(): void {
    this.analyticsPromotionLoading.set(true);
    this.service.getAnalyticsPromotion(this._buildAnalyticsParams()).subscribe({
      next: (data) => { this.analyticsPromotion.set(data); this.analyticsPromotionLoading.set(false); },
      error: () => { this.analyticsPromotion.set(null); this.analyticsPromotionLoading.set(false); },
    });
  }

  setGranularityAndReload(g: string): void {
    this.analyticsGranularity.set(g as Granularity);
    this.loadSalesTrends();
  }

  heatmapCellIntensity(orderCount: number): number {
    const max = this.heatmapDayMaxCount();
    return max > 0 ? Math.round((orderCount / max) * 100) : 0;
  }

  setGranularity(g: Granularity): void {
    this.analyticsGranularity.set(g);
  }

  exportTopProductsCsv(): void {
    const data = this.drillDownData();
    if (!data) { return; }
    const items: Record<string, unknown>[] = ((data as unknown as Record<string, unknown>)['data'] as { items?: Record<string, unknown>[] } | undefined)?.items ?? [];
    const str = (v: unknown, fallback: string | number = '') => `${(v as string | number | null | undefined) ?? fallback}`;
    const headers = ['Product Name', 'Qty Sold', 'Net Sales', 'Currency'];
    const rows = items.map((item) => {
      const name = item['productName'] !== undefined ? item['productName'] : item['variantId'];
      const qty = item['quantitySold'] !== undefined ? item['quantitySold'] : item['unitsSold'];
      return [str(name), str(qty, 0), str(item['netSalesAmount'], 0), str(item['currency'], 'INR')];
    });
    this._downloadCsv('products.csv', headers, rows);
  }

  exportSalesTrendsCsv(): void {
    const trends = this.analyticsSalesTrends();
    if (!trends) { return; }
    const headers = ['Period', 'Net Sales', 'Order Count', 'Currency'];
    const rows = trends.data.current.map((item) => [
      item.period,
      String(item.netSales),
      String(item.orderCount),
      item.currency,
    ]);
    this._downloadCsv('sales-trends.csv', headers, rows);
  }

  exportContributionCsv(): void {
    const contrib = this.analyticsContribution();
    if (!contrib) { return; }
    const headers = ['Category', 'Net Sales', 'Contribution %', 'Currency'];
    const rows = contrib.data.categories.map((c) => [
      c.categoryName,
      String(c.netSales),
      String(c.contributionPercent),
      c.currency,
    ]);
    this._downloadCsv('contribution.csv', headers, rows);
  }

  heatmapIntensity(orderCount: number): number {
    const max = this.heatmapMaxCount();
    return max > 0 ? Math.round((orderCount / max) * 100) : 0;
  }

  private startAutoRefresh(): void {
    // Top-row: every 45 seconds
    interval(45_000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.loadDashboardSummary();
        this.loadTenantAdminSummary();
      });

    // Middle-row drill-down data: every 5 minutes
    interval(5 * 60_000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (this.drillDownType()) {
          this.loadDrillDownData(this.drillDownType());
        }
      });

    // Analytics: every 30 minutes (only if already loaded)
    interval(30 * 60_000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (this.analyticsSalesTrends()) { this.loadSalesTrends(); }
        if (this.analyticsContribution()) { this.loadAnalyticsContribution(); }
        if (this.analyticsCustomerMix()) { this.loadAnalyticsCustomerMix(); }
        if (this.analyticsChannelSplits()) { this.loadAnalyticsChannelSplits(); }
        if (this.analyticsDemandHeatmap()) { this.loadAnalyticsDemandHeatmap(); }
        // Reason splits: 60-minute refresh
      });

    // Reason splits separately: 60 minutes
    interval(60 * 60_000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (this.analyticsReasonSplits()) { this.loadAnalyticsReasonSplits(); }
      });
  }

  private _buildAnalyticsParams(): { fromDate?: string; toDate?: string } {
    const { fromDate, toDate } = this._buildDashboardParams();
    // Auto-derive granularity from the selected date range
    const range = this.dashboardDateRange();
    const granularity: Granularity =
      range === 'LAST_30_DAYS' || range === 'THIS_MONTH' ? 'WEEKLY' : 'DAILY';
    this.analyticsGranularity.set(granularity);
    return { fromDate, toDate };
  }

  private _downloadCsv(filename: string, headers: string[], rows: string[][]): void {
    const escape = (v: string) => `"${v.replaceAll('"', '""')}"`;
    const lines = [headers.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  private refreshDashboardWithFilters(): void {
    this.loadDashboardSummary();

    const drillDownType = this.drillDownType();
    if (drillDownType) {
      this.loadDrillDownData(drillDownType);
    }

    if (this.activeTab() === 'ANALYTICS') {
      this.loadAllAnalytics();
    }
  }

  private _buildDashboardParams(): { fromDate: string; toDate: string; timezone: string } {
    const now = new Date();
    const end = new Date(now);
    const start = new Date(now);

    switch (this.dashboardDateRange()) {
      case 'TODAY':
        break;
      case 'LAST_30_DAYS':
        start.setDate(start.getDate() - 29);
        break;
      case 'THIS_MONTH':
        start.setDate(1);
        break;
      case 'CUSTOM': {
        const from = this.dashboardCustomFromDate();
        const to = this.dashboardCustomToDate();
        if (from && to) {
          return {
            fromDate: from,
            toDate: to,
            timezone: TenantDashboardComponent.DASHBOARD_TIMEZONE,
          };
        }
        break;
      }
      case 'LAST_7_DAYS':
      default:
        start.setDate(start.getDate() - 6);
        break;
    }

    return {
      fromDate: this._formatDate(start),
      toDate: this._formatDate(end),
      timezone: TenantDashboardComponent.DASHBOARD_TIMEZONE,
    };
  }

  private _formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private _daysUntil(dateValue: string): number {
    const targetDate = new Date(dateValue);
    if (Number.isNaN(targetDate.getTime())) {
      return Number.MAX_SAFE_INTEGER;
    }

    const now = new Date();
    const msPerDay = 24 * 60 * 60 * 1000;
    return Math.ceil((targetDate.getTime() - now.getTime()) / msPerDay);
  }

  private loadTenantAdminSummary(): void {
    this.tenantSummaryLoading.set(true);
    this.service.getTenantAdminSummary().subscribe({
      next: (summary) => {
        this.tenantAdminSummary.set(summary);
        this.tenantSummaryLoading.set(false);
      },
      error: () => {
        this.tenantAdminSummary.set(null);
        this.tenantSummaryLoading.set(false);
      },
    });
  }

  private loadDashboardSummary(): void {
    this.dashboardLoading.set(true);
    this.dashboardError.set(null);

    this.service.getTenantDashboardSummary(this._buildDashboardParams()).subscribe({
      next: (summary) => {
        this.dashboardSummary.set(summary);
        this.summaryLastUpdated.set(new Date());
        this.dashboardLoading.set(false);
      },
      error: () => {
        this.dashboardSummary.set(null);
        this.dashboardError.set('Unable to load dashboard summary.');
        this.dashboardLoading.set(false);
      },
    });
  }
}
