import {
  Component,
  ChangeDetectionStrategy,
  input,
  model,
  output,
  HostListener,
  ElementRef,
  inject,
  ViewEncapsulation,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { GomButtonComponent } from '../form-controls/button/gom-button.component';

@Component({
  selector: 'gom-lib-modal',
  standalone: true,
  imports: [CommonModule, GomButtonComponent],
  templateUrl: './gom-modal.component.html',
  styleUrl: './gom-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'gom-modal',
  },
})
export class GomModalComponent {
  private el = inject(ElementRef<HTMLElement>);

  /**
   * Controls visibility of the modal
   */
  show = model(false);

  /**
   * Title of the modal
   */
  title = input<string>('');

  /**
   * Determines if clicking outside modal closes it
   * @default false
   */
  closeOnBackdropClick = input(false);

  /**
   * Determines if escape key closes modal
   * @default true
   */
  closeOnEscape = input(true);

  /**
   * Determines if close button is shown
   * @default true
   */
  showCloseButton = input(true);

  /**
   * Size variant: small | medium | large
   * @default 'medium'
   */
  size = input<'small' | 'medium' | 'large'>('medium');

  /**
   * Emits when modal is closed
   */
  closed = output<void>();

  constructor() {
    effect(() => {
      const isOpen = this.show();
      if (isOpen) {
        document.documentElement.style.overflow = 'hidden';
        // Small delay to ensure DOM is ready before focus trap
        setTimeout(() => {
          const modal = this.el.nativeElement.querySelector('[role="dialog"]');
          if (modal) {
            modal.focus();
          }
        }, 0);
      } else {
        document.documentElement.style.overflow = '';
      }
    });
  }

  @HostListener('document:keydown', ['$event'])
  onKeydownEscape(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.closeOnEscape() && this.show()) {
      event.preventDefault();
      this.close();
    }
  }

  /**
   * Close the modal
   */
  close(): void {
    this.show.set(false);
    this.closed.emit();
  }

  /**
   * Handle backdrop click
   */
  onBackdropClick(): void {
    if (this.closeOnBackdropClick()) {
      this.close();
    }
  }

  /**
   * Handle dialog click (prevent backdrop close)
   */
  onDialogClick(event: MouseEvent): void {
    event.stopPropagation();
  }
}
