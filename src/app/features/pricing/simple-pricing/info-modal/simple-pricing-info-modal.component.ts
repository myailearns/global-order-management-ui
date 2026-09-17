import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import {
  GomButtonComponent,
  GomModalComponent,
} from '@gomlibs/ui';

import { PricingEntity } from '../simple-pricing.service';

@Component({
  selector: 'gom-simple-pricing-info-modal',
  standalone: true,
  imports: [CommonModule, TranslateModule, GomModalComponent, GomButtonComponent],
  templateUrl: './simple-pricing-info-modal.component.html',
  styleUrls: ['./simple-pricing-info-modal.component.scss'],
})
export class SimplePricingInfoModalComponent {
  @Input({ required: true }) entity!: PricingEntity;
  @Output() closed = new EventEmitter<void>();

  onClose(): void {
    this.closed.emit();
  }

  formatMoney(value: number | null | undefined): string {
    if (!Number.isFinite(Number(value))) return '—';
    return `₹${Number(value).toFixed(2)}`;
  }
}
