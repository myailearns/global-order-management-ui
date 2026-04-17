import { ChangeDetectionStrategy, Component, input, model, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GomModalComponent } from './gom-modal.component';
import { GomButtonComponent } from '../form-controls/button/gom-button.component';
import { GomButtonContentMode, getButtonContentMode, showButtonIcon, showButtonText } from '../config';

@Component({
  selector: 'gom-lib-confirmation-modal',
  standalone: true,
  imports: [CommonModule, GomModalComponent, GomButtonComponent],
  templateUrl: './gom-confirmation-modal.component.html',
  styleUrls: ['./gom-confirmation-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GomConfirmationModalComponent {
  show = model(false);

  title = input('Confirm Action');
  message = input('Are you sure you want to continue?');
  confirmText = input('Confirm');
  cancelText = input('Cancel');
  busy = input(false);
  confirmVariant = input<'primary' | 'secondary' | 'danger'>('danger');
  confirmIconOnly = input(false);
  confirmIcon = input('ri-check-line');
  cancelIcon = input('ri-close-line');

  confirmed = output<void>();
  cancelled = output<void>();

  get cancelMode(): GomButtonContentMode {
    return getButtonContentMode('dismiss');
  }

  get confirmMode(): GomButtonContentMode {
    if (this.confirmIconOnly()) {
      return 'icon-only';
    }

    return this.confirmVariant() === 'danger'
      ? getButtonContentMode('danger-action')
      : getButtonContentMode('primary-action');
  }

  shouldShowIcon(mode: GomButtonContentMode): boolean {
    return showButtonIcon(mode);
  }

  shouldShowText(mode: GomButtonContentMode): boolean {
    return showButtonText(mode);
  }

  onConfirm(): void {
    this.confirmed.emit();
  }

  onCancel(): void {
    this.show.set(false);
    this.cancelled.emit();
  }
}
