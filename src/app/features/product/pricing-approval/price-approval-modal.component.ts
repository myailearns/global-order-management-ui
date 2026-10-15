import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  inject,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';

import {
  FormControlsModule,
  GomAlertToastService,
  GomButtonComponent,
  GomCardComponent,
  GomModalComponent,
  GomTableColumn,
  GomTableComponent,
  GomTableRow,
} from '@gomlibs/ui';
import {
  PricingRefreshSuggestion,
  PricingRefreshDecisionPayload,
  VariantsService,
} from '../variants/variants.service';

interface SuggestionRow {
  suggestion: PricingRefreshSuggestion;
  overridePrice: number | null;
  isEditing: boolean;
  decision: 'pending' | 'approve' | 'reject' | null;
  customPrice: number;
  customProfitPct: number;
}

interface FormulaInputDisplay {
  key: string;
  value: number;
  type?: 'NUMBER' | 'PERCENTAGE';
}

interface GroupFormulaSet {
  actualPrice?: string;
  sellingPrice?: string;
  anchorPrice?: string;
}

interface PriceApprovalTableRow extends GomTableRow {
  variantName: string;
  currentPrice: string;
  priceToApply: string;
  appliedChange: string;
  appliedMarginImpact: string;
}

@Component({
  selector: 'gom-price-approval-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormControlsModule,
    GomButtonComponent,
    GomCardComponent,
    GomModalComponent,
    GomTableComponent,
  ],
  templateUrl: './price-approval-modal.component.html',
  styleUrl: './price-approval-modal.component.scss',
})
export class PriceApprovalModalComponent implements OnInit {
  private readonly service = inject(VariantsService);
  private readonly toast = inject(GomAlertToastService);
  private readonly fb = inject(FormBuilder);

  @Input() groupId = '';
  @Input() groupType: 'MEASURED' | 'ATTRIBUTE' | 'HYBRID' = 'MEASURED';
  @Input() groupName = '';
  @Input() pricingMode?: 'FIXED' | 'MANUAL_REFRESH' | 'AUTO_REFRESH';
  @Input() groupFormulas?: GroupFormulaSet;
  @Input() formulaInputs?: FormulaInputDisplay[];
  @Input() show = false;

  @Output() showChange = new EventEmitter<boolean>();
  @Output() decisionsCompleted = new EventEmitter<void>();

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly suggestionRows = signal<SuggestionRow[]>([]);
  readonly groupCustomPrice = signal(0);
  readonly groupCustomProfitPct = signal(0);
  readonly groupOverwriteEnabled = signal(false);
  readonly groupOverwriteControl = this.fb.control(false, { nonNullable: true });

  readonly reasonForm = this.fb.group({
    reason: ['', [Validators.required, Validators.minLength(3)]],
  });

  readonly groupLevelColumns: GomTableColumn<PriceApprovalTableRow>[] = [
    { key: 'variantName', header: 'Variant Name', sortable: true, width: '16rem' },
    { key: 'currentPrice', header: 'Current Price', sortable: true, width: '10rem' },
    { key: 'priceToApply', header: 'Price To Apply', sortable: true, width: '18rem' },
    { key: 'appliedChange', header: 'Applied Change', sortable: true, width: '16rem' },
    { key: 'appliedMarginImpact', header: 'Applied Margin Impact', sortable: true, width: '18rem' },
  ];

  get isGroupLevel(): boolean {
    return this.groupType === 'MEASURED' || this.groupType === 'HYBRID';
  }

  get pendingCount(): number {
    return this.suggestionRows().filter((r) => r.decision === null || r.decision === 'pending').length;
  }

  get approvedCount(): number {
    return this.suggestionRows().filter((r) => r.decision === 'approve').length;
  }

  get rejectedCount(): number {
    return this.suggestionRows().filter((r) => r.decision === 'reject').length;
  }

  ngOnInit(): void {
    if (this.groupId && this.show) {
      this.loadSuggestions();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    const showChanged = Object.prototype.hasOwnProperty.call(changes, 'show');
    const groupChanged = Object.prototype.hasOwnProperty.call(changes, 'groupId');
    if (this.show && this.groupId && (showChanged || groupChanged)) {
      this.loadSuggestions();
    }
  }

  onModalShowChange(next: boolean): void {
    this.show = next;
    this.showChange.emit(next);
  }

  loadSuggestions(): void {
    this.loading.set(true);
    this.service.listPricingRefreshSuggestions(this.groupId, 'PENDING').subscribe({
      next: (response) => {
        this.suggestionRows.set(
          (response.data || []).map((s) => {
            const suggestedPrice = s.suggestedSnapshot?.effectivePrice?.sellingPrice ?? 0;
            const cost = s.suggestedSnapshot?.effectivePrice?.actualPrice ?? 0;
            const profitPct = cost > 0 ? Number.parseFloat(((suggestedPrice - cost) / cost * 100).toFixed(2)) : 0;
            return {
              suggestion: s,
              overridePrice: null,
              isEditing: false,
              decision: null,
              customPrice: suggestedPrice,
              customProfitPct: profitPct,
            };
          })
        );
        const firstRow = (response.data || [])[0];
        if (firstRow) {
          const suggestedPrice = firstRow.suggestedSnapshot?.effectivePrice?.sellingPrice ?? 0;
          const cost = firstRow.suggestedSnapshot?.effectivePrice?.actualPrice ?? 0;
          const profitPct = cost > 0 ? Number.parseFloat(((suggestedPrice - cost) / cost * 100).toFixed(2)) : 0;
          this.groupCustomPrice.set(suggestedPrice);
          this.groupCustomProfitPct.set(profitPct);
        }
        this.groupOverwriteEnabled.set(false);
        this.groupOverwriteControl.setValue(false, { emitEvent: false });
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('Failed to load price suggestions.');
      },
    });
  }

  formatPrice(value: number | undefined): string {
    if (!Number.isFinite(Number(value))) return '—';
    return Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  formatMargin(value: number | undefined): string {
    if (!Number.isFinite(Number(value))) return '—';
    return `${Number(value).toFixed(1)}%`;
  }

  formatInputValue(input: FormulaInputDisplay): string {
    if (!Number.isFinite(Number(input.value))) {
      return '—';
    }

    if (input.type === 'PERCENTAGE') {
      return `${(Number(input.value) * 100).toFixed(2)}%`;
    }

    if (/percent|margin|markup|wastage/i.test(input.key) && Number(input.value) <= 1) {
      return `${(Number(input.value) * 100).toFixed(2)}%`;
    }

    return this.formatPrice(input.value);
  }

  formatInputLabel(key: string): string {
    return String(key || '')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  getCurrentDisplayPrice(row: SuggestionRow): number | null {
    const value = row.suggestion.previousSnapshot?.effectivePrice?.sellingPrice;
    return Number.isFinite(Number(value)) ? Number(value) : null;
  }

  getPriceChangePercent(row: SuggestionRow): number | null {
    const current = this.getCurrentDisplayPrice(row);
    const next = this.getSuggestedDisplayPrice(row);
    if (!Number.isFinite(Number(current)) || !Number.isFinite(Number(next)) || !current || current <= 0) {
      return null;
    }
    return Number((((next - current) / current) * 100).toFixed(1));
  }

  getRecommendationTone(row: SuggestionRow): 'safe' | 'review' | 'risk' {
    return this.getRiskBadgeType(row);
  }

  getRecommendationText(row: SuggestionRow): string {
    const badge = this.getRiskBadgeType(row);
    const changePercent = this.getPriceChangePercent(row);
    const impact = row.suggestion.marginImpact;

    if (badge === 'risk') {
      if (impact?.isBelowThreshold) {
        return 'Keep current price unless this low margin is intentional.';
      }
      return 'Review before approval because the price move is unusually large.';
    }

    if (badge === 'review') {
      return 'Review the cost change and approve if the new price is expected.';
    }

    if (changePercent !== null && Math.abs(changePercent) >= 25) {
      return 'Margin is healthy, but confirm the large price movement before approval.';
    }

    return 'Approve if this cost update matches your latest purchase.';
  }

  getRecommendationReason(row: SuggestionRow): string {
    const impact = row.suggestion.marginImpact;
    const priceChangePercent = this.getPriceChangePercent(row);
    if (!impact) {
      return 'Margin comparison is unavailable for this suggestion.';
    }

    if (impact.isBelowThreshold) {
      return `Suggested margin falls below the ${this.formatMargin(impact.thresholdPercent)} warning threshold.`;
    }

    if (priceChangePercent !== null && Math.abs(priceChangePercent) >= 25) {
      return `Selling price changes by ${priceChangePercent > 0 ? '+' : ''}${priceChangePercent.toFixed(1)}% while margin moves ${impact.changePercent >= 0 ? '+' : ''}${impact.changePercent.toFixed(1)} points.`;
    }

    return `Margin changes from ${this.formatMargin(impact.oldMarginPercent)} to ${this.formatMargin(impact.newMarginPercent)} at the latest cost.`;
  }

  getSummaryRow(): SuggestionRow | null {
    const rows = this.suggestionRows();
    if (!rows.length) {
      return null;
    }

    return rows.reduce((current, candidate) => {
      const currentScore = this.getRiskScore(current);
      const candidateScore = this.getRiskScore(candidate);
      return candidateScore > currentScore ? candidate : current;
    });
  }

  getSummaryTitle(): string {
    const row = this.getSummaryRow();
    if (!row) {
      return 'Review pending price update';
    }

    const badge = this.getRecommendationTone(row);
    if (badge === 'risk') {
      return 'Review carefully before approving';
    }
    if (badge === 'review') {
      return 'Check cost impact before approving';
    }
    return 'Approval looks healthy';
  }

  getSummaryMessage(): string {
    const row = this.getSummaryRow();
    if (!row) {
      return 'No pending price updates.';
    }

    const oldSellingPrice = this.getCurrentDisplayPrice(row);
    const suggestedSellingPrice = this.getSuggestedDisplayPrice(row);
    if (!Number.isFinite(Number(oldSellingPrice)) || !Number.isFinite(Number(suggestedSellingPrice))) {
      return '<strong>Current price:</strong> NA. <strong>Suggested price:</strong> NA. <strong>Difference:</strong> NA.';
    }

    const oldPrice = Number(oldSellingPrice);
    const suggestedPrice = Number(suggestedSellingPrice);
    const diff = suggestedPrice - oldPrice;
    return `<strong>Current price:</strong> INR ${this.formatPrice(oldPrice)}. <strong>Suggested price:</strong> INR ${this.formatPrice(suggestedPrice)}. <strong>Difference:</strong> ${diff >= 0 ? '+' : ''}INR ${this.formatPrice(diff)}.`;
  }

  getSummaryCurrentPriceText(): string {
    const prices = this.getSummaryPrices();
    return prices ? `INR ${this.formatPrice(prices.oldPrice)}` : 'NA';
  }

  getSummarySuggestedPriceText(): string {
    const prices = this.getSummaryPrices();
    return prices ? `INR ${this.formatPrice(prices.suggestedPrice)}` : 'NA';
  }

  getSummaryDifferenceText(): string {
    const prices = this.getSummaryPrices();
    if (!prices) {
      return 'NA';
    }

    return `${prices.diff >= 0 ? '+' : ''}INR ${this.formatPrice(prices.diff)}`;
  }

  getSummaryDifferenceChipClass(): string {
    const prices = this.getSummaryPrices();
    if (!prices) {
      return 'price-approval__decision-diff-chip--neutral';
    }

    return prices.diff < 0
      ? 'price-approval__decision-diff-chip--negative'
      : 'price-approval__decision-diff-chip--positive';
  }

  private getSummaryPrices(): { oldPrice: number; suggestedPrice: number; diff: number } | null {
    const row = this.getSummaryRow();
    if (!row) {
      return null;
    }

    const oldSellingPrice = this.getCurrentDisplayPrice(row);
    const suggestedSellingPrice = this.getSuggestedDisplayPrice(row);
    if (!Number.isFinite(Number(oldSellingPrice)) || !Number.isFinite(Number(suggestedSellingPrice))) {
      return null;
    }

    const oldPrice = Number(oldSellingPrice);
    const suggestedPrice = Number(suggestedSellingPrice);
    const diff = suggestedPrice - oldPrice;

    return { oldPrice, suggestedPrice, diff };
  }

  getSummaryTone(): 'safe' | 'review' | 'risk' {
    const row = this.getSummaryRow();
    return row ? this.getRecommendationTone(row) : 'review';
  }

  getFormulaSummary(): string {
    if (!this.groupFormulas?.sellingPrice) {
      return 'Price is recalculated from the latest cost inputs.';
    }

    const normalized = this.groupFormulas.sellingPrice
      .replace(/actualPrice/g, 'Latest cost')
      .replace(/\*/g, ' × ')
      .replace(/\+/g, ' + ')
      .replace(/-/g, ' - ')
      .replace(/\//g, ' ÷ ');

    return `Selling price uses: ${normalized}`;
  }

  getReadableFormula(type: 'actualPrice' | 'sellingPrice' | 'anchorPrice'): string {
    const raw = this.groupFormulas?.[type];
    if (!raw) {
      return '—';
    }

    return raw
      .replace(/actualPrice/g, 'Actual Price')
      .replace(/sellingPrice/g, 'Selling Price')
      .replace(/anchorPrice/g, 'Anchor Price')
      .replace(/\*/g, ' × ')
      .replace(/\+/g, ' + ')
      .replace(/-/g, ' - ')
      .replace(/\//g, ' ÷ ');
  }

  getGroupMetricValue(
    metric: 'actualPrice' | 'sellingPrice' | 'anchorPrice',
    snapshot: 'previous' | 'suggested'
  ): string {
    const values = this.suggestionRows()
      .map((row) => {
        if (snapshot === 'previous') {
          return Number(row.suggestion.previousSnapshot?.effectivePrice?.[metric]);
        }
        return Number(row.suggestion.suggestedSnapshot?.effectivePrice?.[metric]);
      })
      .filter((value) => Number.isFinite(value));

    if (!values.length) {
      return '—';
    }

    const min = Math.min(...values);
    const max = Math.max(...values);

    if (Math.abs(max - min) < 0.0001) {
      return this.formatPrice(min);
    }

    return `${this.formatPrice(min)} to ${this.formatPrice(max)}`;
  }

  getGroupCustomMetricValue(metric: 'actualPrice' | 'sellingPrice' | 'anchorPrice'): string {
    if (!this.groupOverwriteEnabled()) {
      return this.getGroupMetricValue(metric, 'suggested');
    }

    const values = this.suggestionRows()
      .map((row) => {
        const suggestedEffectivePrice = row.suggestion.suggestedSnapshot?.effectivePrice;
        const suggestedSellingPrice = Number(suggestedEffectivePrice?.sellingPrice);
        const customSellingPrice = Number(this.getSuggestedDisplayPrice(row));

        if (metric === 'actualPrice') {
          return Number(suggestedEffectivePrice?.actualPrice);
        }

        if (metric === 'sellingPrice') {
          return customSellingPrice;
        }

        const suggestedAnchorPrice = Number(suggestedEffectivePrice?.anchorPrice);
        if (!Number.isFinite(suggestedSellingPrice) || suggestedSellingPrice <= 0 || !Number.isFinite(customSellingPrice)) {
          return suggestedAnchorPrice;
        }

        const scaledAnchorPrice = suggestedAnchorPrice * (customSellingPrice / suggestedSellingPrice);
        return Number.isFinite(scaledAnchorPrice) ? scaledAnchorPrice : suggestedAnchorPrice;
      })
      .filter((value) => Number.isFinite(value));

    if (!values.length) {
      return '—';
    }

    const min = Math.min(...values);
    const max = Math.max(...values);

    if (Math.abs(max - min) < 0.0001) {
      return this.formatPrice(min);
    }

    return `${this.formatPrice(min)} to ${this.formatPrice(max)}`;
  }

  onGroupOverwriteToggle(checked: boolean): void {
    this.groupOverwriteEnabled.set(checked);
    if (!checked) {
      this.resetGroupCustomPrice();
    }
  }

  getGroupMetricDelta(metric: 'actualPrice' | 'sellingPrice' | 'anchorPrice'): string {
    const diff = this.getGroupMetricDeltaDiff(metric);
    if (diff === null) {
      return '—';
    }
    return `${diff >= 0 ? '+' : ''}${this.formatPrice(diff)}`;
  }

  getGroupMetricDeltaClass(metric: 'actualPrice' | 'sellingPrice' | 'anchorPrice'): string {
    const diff = this.getGroupMetricDeltaDiff(metric);
    if (diff === null) {
      return '';
    }
    return diff < 0 ? 'price-approval__price-change--negative' : 'price-approval__price-change--positive';
  }

  private getGroupMetricDeltaDiff(metric: 'actualPrice' | 'sellingPrice' | 'anchorPrice'): number | null {
    const previousValues = this.suggestionRows()
      .map((row) => Number(row.suggestion.previousSnapshot?.effectivePrice?.[metric]))
      .filter((value) => Number.isFinite(value));
    const suggestedValues = this.suggestionRows()
      .map((row) => Number(row.suggestion.suggestedSnapshot?.effectivePrice?.[metric]))
      .filter((value) => Number.isFinite(value));

    if (!previousValues.length || !suggestedValues.length) {
      return null;
    }

    const previousAvg = previousValues.reduce((sum, value) => sum + value, 0) / previousValues.length;
    const suggestedAvg = suggestedValues.reduce((sum, value) => sum + value, 0) / suggestedValues.length;
    return suggestedAvg - previousAvg;
  }

  getAffectedVariantsPreview(limit = 6): string[] {
    return this.suggestionRows()
      .map((row) => row.suggestion.previousSnapshot?.name || row.suggestion.suggestedSnapshot?.name || 'Variant')
      .slice(0, limit);
  }

  getRemainingVariantsCount(limit = 6): number {
    return Math.max(this.suggestionRows().length - limit, 0);
  }

  getGroupLevelAffectedVariantsText(): string {
    const count = this.suggestionRows().length;
    return `${count} variant${count === 1 ? '' : 's'}`;
  }

  getGroupLevelTablePageSize(): number {
    return Math.max(this.suggestionRows().length, 1);
  }

  getGroupLevelTableRows(): PriceApprovalTableRow[] {
    return this.suggestionRows().map((row, index) => ({
      id: row.suggestion._id || `${index}`,
      variantName: row.suggestion.previousSnapshot?.name || row.suggestion.suggestedSnapshot?.name || `Variant ${index + 1}`,
      currentPrice: this.formatPrice(this.getCurrentDisplayPrice(row) || undefined),
      priceToApply: this.getCombinedSuggestedPriceDisplay(row),
      appliedChange: this.getPriceChangeDisplay(row),
      appliedMarginImpact: this.getMarginImpactDisplay(row),
    }));
  }

  getGroupApprovalModeText(): string {
    const count = this.suggestionRows().length;
    const variantLabel = `${count} variant${count === 1 ? '' : 's'}`;

    if (this.groupOverwriteEnabled()) {
      return `Approve All will apply your override price to ${variantLabel}.`;
    }

    return `Approve All will apply the system suggested price to ${variantLabel}.`;
  }

  private getRiskScore(row: SuggestionRow): number {
    const badge = this.getRiskBadgeType(row);
    const changePercent = Math.abs(row.suggestion.marginImpact?.changePercent || 0);
    const priceJump = Math.abs(this.getPriceChangePercent(row) || 0);
    const badgeScore = badge === 'risk' ? 3 : badge === 'review' ? 2 : 1;
    return (badgeScore * 1000) + (changePercent * 10) + priceJump;
  }

  getMarginClass(row: SuggestionRow): string {
    const impact = row.suggestion.marginImpact;
    if (!impact) return '';
    if (impact.isBelowThreshold) return 'text-danger';
    if (impact.changePercent < 0) return 'text-warning';
    return 'text-success';
  }

  getRiskBadgeType(row: SuggestionRow): 'safe' | 'review' | 'risk' {
    const impact = row.suggestion.marginImpact;
    if (!impact) return 'safe';

    // High risk only when resulting margin goes below configured threshold.
    if (impact.isBelowThreshold) {
      return 'risk';
    }

    // Large negative shifts stay visible as review, but not hard risk.
    if (impact.changePercent <= -5) {
      return 'review';
    }

    // Moderate margin drop.
    if (impact.changePercent < -2) {
      return 'review';
    }

    // Safe: stable or improving margin
    return 'safe';
  }

  getRiskBadgeLabel(row: SuggestionRow): string {
    const badgeType = this.getRiskBadgeType(row);
    switch (badgeType) {
      case 'safe':
        return 'Safe';
      case 'review':
        return 'Review';
      case 'risk':
        return 'Risk';
    }
  }

  getPriceChange(row: SuggestionRow): string {
    const prev = row.suggestion.previousSnapshot?.effectivePrice?.sellingPrice;
    const next = row.overridePrice ?? row.suggestion.suggestedSnapshot?.effectivePrice?.sellingPrice;
    if (!Number.isFinite(Number(prev)) || !Number.isFinite(Number(next))) return '—';
    const diff = Number(next) - Number(prev);
    return (diff >= 0 ? '+' : '') + this.formatPrice(diff);
  }

  getPriceChangeDisplay(row: SuggestionRow): string {
    const systemChange = this.getSystemPriceChangeDisplay(row);
    if (!this.groupOverwriteEnabled()) {
      return systemChange;
    }

    const yourChange = this.getYourPriceChangeDisplay(row);
    return `${yourChange} | System: ${systemChange}`;
  }

  getMarginImpactDisplay(row: SuggestionRow): string {
    const systemMarginImpact = this.getSystemMarginImpactDisplay(row);
    if (!this.groupOverwriteEnabled()) {
      return systemMarginImpact;
    }

    const yourMarginImpact = this.getYourMarginImpactDisplay(row);
    return `${yourMarginImpact} | System: ${systemMarginImpact}`;
  }

  getSystemPriceChangeDisplay(row: SuggestionRow): string {
    const prev = row.suggestion.previousSnapshot?.effectivePrice?.sellingPrice;
    const next = row.suggestion.suggestedSnapshot?.effectivePrice?.sellingPrice;
    if (!Number.isFinite(Number(prev)) || !Number.isFinite(Number(next))) {
      return '—';
    }

    const diff = Number(next) - Number(prev);
    const percent = prev && Number(prev) > 0 ? Number((((Number(next) - Number(prev)) / Number(prev)) * 100).toFixed(1)) : null;
    const change = `${diff >= 0 ? '+' : ''}${this.formatPrice(diff)}`;
    if (percent === null) {
      return change;
    }

    return `${change} (${percent >= 0 ? '+' : ''}${percent}%)`;
  }

  getYourPriceChangeDisplay(row: SuggestionRow): string {
    const change = this.getPriceChange(row);
    const percent = this.getPriceChangePercent(row);
    if (percent === null) {
      return change;
    }

    return `${change} (${percent >= 0 ? '+' : ''}${percent}%)`;
  }

  getYourMarginImpactDisplay(row: SuggestionRow): string {
    const impact = row.suggestion.marginImpact;
    const overridePrice = row.overridePrice;
    if (overridePrice !== null) {
      const oldMarginPercent = Number(impact?.oldMarginPercent);
      const actualCost = this.getActualCost(row);
      if (!Number.isFinite(oldMarginPercent) || !Number.isFinite(actualCost) || !Number.isFinite(overridePrice) || overridePrice <= 0) {
        return '—';
      }

      const newMarginPercent = ((overridePrice - actualCost) / overridePrice) * 100;
      const marginDelta = newMarginPercent - oldMarginPercent;
      return `${this.formatMargin(oldMarginPercent)} → ${this.formatMargin(newMarginPercent)} (${marginDelta >= 0 ? '+' : ''}${marginDelta.toFixed(1)} pts)`;
    }

    return this.getSystemMarginImpactDisplay(row);
  }

  getSystemMarginImpactDisplay(row: SuggestionRow): string {
    const impact = row.suggestion.marginImpact;
    if (!impact) {
      return '—';
    }

    const delta = `${impact.changePercent >= 0 ? '+' : ''}${this.formatPrice(impact.changePercent)} INR`;
    return `${this.formatMargin(impact.oldMarginPercent)} → ${this.formatMargin(impact.newMarginPercent)} (${delta})`;
  }

  getSystemSuggestedPrice(row: SuggestionRow): number {
    return row.suggestion.suggestedSnapshot?.effectivePrice?.sellingPrice ?? 0;
  }

  getCombinedSuggestedPriceDisplay(row: SuggestionRow): string {
    const systemSuggestedPrice = this.formatPrice(this.getSystemSuggestedPrice(row));

    if (!this.groupOverwriteEnabled()) {
      return systemSuggestedPrice;
    }

    const yourSuggestedPrice = this.formatPrice(this.getSuggestedDisplayPrice(row));
    return `${yourSuggestedPrice} | System: ${systemSuggestedPrice}`;
  }

  getSuggestedDisplayPrice(row: SuggestionRow): number {
    return row.overridePrice ?? row.suggestion.suggestedSnapshot?.effectivePrice?.sellingPrice ?? 0;
  }

  // Group-level: approve all with single reason
  approveAll(): void {
    const reason = String(this.reasonForm.controls.reason.value || '').trim();
    if (!reason) {
      this.reasonForm.markAllAsTouched();
      this.toast.warning('Reason is required to approve suggestions.');
      return;
    }

    this.saving.set(true);
    const payload: PricingRefreshDecisionPayload = { reason };
    this.service.approvePricingRefreshSuggestions(this.groupId, payload).subscribe({
      next: () => {
        this.toast.success('Price suggestions approved. New prices are now active.');
        this.decisionsCompleted.emit();
        this.close();
      },
      error: (err) => {
        this.toast.error(this.extractMessage(err) || 'Failed to approve suggestions.');
        this.saving.set(false);
      },
    });
  }

  // Group-level: reject all with single reason
  rejectAll(): void {
    const reason = String(this.reasonForm.controls.reason.value || '').trim();
    if (!reason) {
      this.reasonForm.markAllAsTouched();
      this.toast.warning('Reason is required to reject suggestions.');
      return;
    }

    this.saving.set(true);
    this.service.rejectPricingRefreshSuggestions(this.groupId, { reason }).subscribe({
      next: () => {
        this.toast.success('Price suggestions rejected. Existing prices kept.');
        this.decisionsCompleted.emit();
        this.close();
      },
      error: (err) => {
        this.toast.error(this.extractMessage(err) || 'Failed to reject suggestions.');
        this.saving.set(false);
      },
    });
  }

  // Attribute: mark individual row decision
  markRowDecision(row: SuggestionRow, decision: 'pending' | 'approve' | 'reject'): void {
    this.suggestionRows.update((rows) =>
      rows.map((r) =>
        r.suggestion._id === row.suggestion._id ? { ...r, decision, isEditing: false } : r
      )
    );
  }

  toggleRowEdit(row: SuggestionRow): void {
    this.suggestionRows.update((rows) =>
      rows.map((r) =>
        r.suggestion._id === row.suggestion._id ? { ...r, isEditing: !r.isEditing } : r
      )
    );
  }

  updateOverridePrice(row: SuggestionRow, event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    this.suggestionRows.update((rows) =>
      rows.map((r) =>
        r.suggestion._id === row.suggestion._id
          ? { ...r, overridePrice: Number.isFinite(value) && value > 0 ? value : null }
          : r
      )
    );
  }

  getActualCost(row: SuggestionRow): number {
    return Number(row.suggestion.suggestedSnapshot?.effectivePrice?.actualPrice) || 0;
  }

  getGroupActualCost(): number {
    const rows = this.suggestionRows();
    if (!rows.length) return 0;
    return Number(rows[0].suggestion.suggestedSnapshot?.effectivePrice?.actualPrice) || 0;
  }

  onGroupCustomPriceChange(event: Event): void {
    const price = Number((event.target as HTMLInputElement).value);
    if (!Number.isFinite(price) || price <= 0) return;
    const cost = this.getGroupActualCost();
    const profitPct = cost > 0 ? Number.parseFloat(((price - cost) / cost * 100).toFixed(2)) : 0;
    this.groupCustomPrice.set(price);
    this.groupCustomProfitPct.set(profitPct);
    this.suggestionRows.update((rows) =>
      rows.map((r) => ({ ...r, overridePrice: price, customPrice: price, customProfitPct: profitPct }))
    );
  }

  onGroupCustomProfitChange(event: Event): void {
    const profitPct = Number((event.target as HTMLInputElement).value);
    if (!Number.isFinite(profitPct)) return;
    const cost = this.getGroupActualCost();
    const price = cost > 0 ? Number.parseFloat((cost * (1 + profitPct / 100)).toFixed(2)) : 0;
    this.groupCustomPrice.set(price);
    this.groupCustomProfitPct.set(profitPct);
    this.suggestionRows.update((rows) =>
      rows.map((r) => ({ ...r, overridePrice: price > 0 ? price : null, customPrice: price, customProfitPct: profitPct }))
    );
  }

  resetGroupCustomPrice(): void {
    this.suggestionRows.update((rows) =>
      rows.map((r) => {
        const suggestedPrice = r.suggestion.suggestedSnapshot?.effectivePrice?.sellingPrice ?? 0;
        const cost = r.suggestion.suggestedSnapshot?.effectivePrice?.actualPrice ?? 0;
        const profitPct = cost > 0 ? Number.parseFloat(((suggestedPrice - cost) / cost * 100).toFixed(2)) : 0;
        return { ...r, overridePrice: null, customPrice: suggestedPrice, customProfitPct: profitPct };
      })
    );
    const firstRow = this.suggestionRows()[0];
    if (firstRow) {
      this.groupCustomPrice.set(firstRow.customPrice);
      this.groupCustomProfitPct.set(firstRow.customProfitPct);
    }
  }

  onCustomPriceChange(row: SuggestionRow, event: Event): void {
    const price = Number((event.target as HTMLInputElement).value);
    if (!Number.isFinite(price) || price <= 0) return;
    const cost = this.getActualCost(row);
    const profitPct = cost > 0 ? Number.parseFloat(((price - cost) / cost * 100).toFixed(2)) : 0;
    this.suggestionRows.update((rows) =>
      rows.map((r) =>
        r.suggestion._id === row.suggestion._id
          ? { ...r, overridePrice: price, customPrice: price, customProfitPct: profitPct }
          : r
      )
    );
  }

  onCustomProfitChange(row: SuggestionRow, event: Event): void {
    const profitPct = Number((event.target as HTMLInputElement).value);
    if (!Number.isFinite(profitPct)) return;
    const cost = this.getActualCost(row);
    const price = cost > 0 ? Number.parseFloat((cost * (1 + profitPct / 100)).toFixed(2)) : 0;
    this.suggestionRows.update((rows) =>
      rows.map((r) =>
        r.suggestion._id === row.suggestion._id
          ? { ...r, overridePrice: price > 0 ? price : null, customPrice: price, customProfitPct: profitPct }
          : r
      )
    );
  }

  // Attribute: save all individual decisions
  saveVariantDecisions(): void {
    const reason = String(this.reasonForm.controls.reason.value || '').trim();
    if (!reason) {
      this.reasonForm.markAllAsTouched();
      this.toast.warning('Reason is required to save decisions.');
      return;
    }

    const rows = this.suggestionRows();
    const toApprove = rows.filter((r) => r.decision === 'approve');
    const toReject = rows.filter((r) => r.decision === 'reject');

    if (toApprove.length === 0 && toReject.length === 0) {
      this.toast.warning('No decisions made. Please approve or reject at least one variant.');
      return;
    }

    this.saving.set(true);

    const calls = [];
    if (toApprove.length > 0) {
      calls.push(this.service.approvePricingRefreshSuggestions(this.groupId, {
        suggestionIds: toApprove.map((r) => r.suggestion._id),
        reason,
      }));
    }
    if (toReject.length > 0) {
      calls.push(this.service.rejectPricingRefreshSuggestions(this.groupId, {
        suggestionIds: toReject.map((r) => r.suggestion._id),
        reason,
      }));
    }

    forkJoin(calls).subscribe({
      next: () => {
        const undecided = rows.filter((r) => r.decision === null || r.decision === 'pending').length;
        if (undecided > 0) {
          this.toast.success(`Decisions saved. ${undecided} suggestion(s) still pending.`);
        } else {
          this.toast.success('All price decisions saved.');
        }
        this.decisionsCompleted.emit();
        this.close();
      },
      error: (err) => {
        this.toast.error(this.extractMessage(err) || 'Failed to save some decisions.');
        this.saving.set(false);
      },
    });
  }

  close(): void {
    this.saving.set(false);
    this.groupOverwriteEnabled.set(false);
    this.groupOverwriteControl.setValue(false, { emitEvent: false });
    this.reasonForm.reset();
    this.showChange.emit(false);
  }

  private extractMessage(err: unknown): string {
    return (err as { error?: { message?: string }; message?: string })?.error?.message
      || (err as { message?: string })?.message
      || '';
  }
}
