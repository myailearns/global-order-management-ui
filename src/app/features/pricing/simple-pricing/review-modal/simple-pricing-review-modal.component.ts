import { Component, EventEmitter, Input, OnInit, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { GomButtonComponent, GomChipComponent, GomModalComponent } from '@gomlibs/ui';

export interface PriceReviewItem {
  trackId: string;
  groupName: string;
  productName: string;
  entityType: 'GROUP' | 'VARIANT';
  oldSellingPrice: number;
  newSellingPrice: number;
  existingProfit: string;   // e.g. "30.0%"
  newProfit: string;        // e.g. "26.8%"
  newProfitTone: 'info' | 'success' | 'danger' | 'neutral';
}

@Component({
  selector: 'gom-simple-pricing-review-modal',
  standalone: true,
  imports: [CommonModule, TranslateModule, GomModalComponent, GomButtonComponent, GomChipComponent],
  templateUrl: './simple-pricing-review-modal.component.html',
  styleUrls: ['./simple-pricing-review-modal.component.scss'],
})
export class SimplePricingReviewModalComponent implements OnInit {
  @Input({ required: true }) items: PriceReviewItem[] = [];

  /** Emits the trackIds that should actually be saved (after removals). */
  @Output() confirmed = new EventEmitter<string[]>();

  /** Emits with no data – parent just closes the modal, no reset. */
  @Output() cancelled = new EventEmitter<void>();

  /** Local working copy so removals don't affect the parent until confirmed. */
  readonly reviewItems = signal<PriceReviewItem[]>([]);

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

  priceDirection(item: PriceReviewItem): 'up' | 'down' | 'same' {
    if (item.newSellingPrice > item.oldSellingPrice) return 'up';
    if (item.newSellingPrice < item.oldSellingPrice) return 'down';
    return 'same';
  }
}
