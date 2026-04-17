import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'gom-lib-button',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './gom-button.component.html',
  styleUrl: './gom-button.component.scss',
})
export class GomButtonComponent {
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() variant: 'primary' | 'secondary' | 'danger' = 'primary';
  @Input() size: 'default' | 'icon' = 'default';
  @Input() disabled = false;

  @Output() buttonClick = new EventEmitter<MouseEvent>();

  handleClick(event: MouseEvent): void {
    if (this.disabled) {
      event.preventDefault();
      return;
    }
    this.buttonClick.emit(event);
  }
}
