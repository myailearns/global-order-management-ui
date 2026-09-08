import { Component, computed, EventEmitter, Input, OnInit, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { GomButtonComponent, GomModalComponent } from '@gomlibs/ui';

export interface PriceReviewItem {
  trackId: string;
  groupName: string;
  productName: string;
  entityType: 'GROUP' | 'VARIANT';
  oldSellingPrice: number;
  newSellingPrice: number;
  oldProfitAmount: number | null;
  newProfitAmount: number | null;
  oldMarginPercent: number | null;
  newMarginPercent: number | null;
  impactAmount: number | null;
  existingProfit: string;   // e.g. "30.0%"
  newProfit: string;        // e.g. "26.8%"
  newProfitTone: 'info' | 'success' | 'danger' | 'neutral';
}

@Component({
  selector: 'gom-simple-pricing-review-modal',
  standalone: true,
  imports: [CommonModule, TranslateModule, GomModalComponent, GomButtonComponent],
  templateUrl: './simple-pricing-review-modal.component.html',
  styleUrl: './simple-pricing-review-modal.component.scss',
})
export class SimplePricingReviewModalComponent implements OnInit {
  @Input({ required: true }) items: PriceReviewItem[] = [];

  /** Emits the trackIds that should actually be saved (after removals). */
  @Output() confirmed = new EventEmitter<string[]>();

  /** Emits with no data – parent just closes the modal, no reset. */
  @Output() cancelled = new EventEmitter<void>();

  /** Local working copy so removals don't affect the parent until confirmed. */
  readonly reviewItems = signal<PriceReviewItem[]>([]);

  readonly averageMarginChange = computed(() => {
    const deltas = this.reviewItems().flatMap((item) => {
      if (item.oldMarginPercent === null || item.newMarginPercent === null) {
        return [];
      }
      return [item.newMarginPercent - item.oldMarginPercent];
    });

    if (!deltas.length) {
      return null;
    }

    return deltas.reduce((sum, value) => sum + value, 0) / deltas.length;
  });

  readonly totalImpactAmount = computed(() => (
    this.reviewItems().reduce((sum, item) => sum + (item.impactAmount ?? 0), 0)
  ));

  ngOnInit(): void {
    this.reviewItems.set([...this.items]);
  }

  removeItem(trackId: string): void {
    this.reviewItems.update((list) => list.filter((i) => i.trackId !== trackId));
  }

  confirm(): void {
    const remaining = this.reviewItems().map((i) => i.trackId);
    this.confirmed.emit(remaining);
  }

  cancel(): void {
    this.cancelled.emit();
  }

  formatPrice(price: number): string {
    return `₹${price.toFixed(2)}`;
  }

  formatAmount(value: number | null): string {
    return value === null ? '—' : this.formatPrice(value);
  }

  formatMargin(value: number | null): string {
    return value === null ? '—' : `${value.toFixed(1)}%`;
  }

  formatSignedAmount(value: number | null): string {
    if (value === null) {
      return '—';
    }
    return `${value >= 0 ? '+' : '-'}${this.formatPrice(Math.abs(value))}`;
  }

  formatSignedPercent(value: number | null): string {
    if (value === null) {
      return '—';
    }
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  }

  formatCompactPrice(value: number): string {
    return `₹${this.formatCompactNumber(value)}`;
  }

  formatCompactAmount(value: number | null): string {
    if (value === null) {
      return '—';
    }
    return this.formatCompactPrice(value);
  }

  private formatCompactNumber(value: number): string {
    const rounded = Math.round(value * 100) / 100;
    return Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(2);
  }
}
