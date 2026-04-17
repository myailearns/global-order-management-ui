import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'gom-lib-switch',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './gom-switch.component.html',
  styleUrl: './gom-switch.component.scss',
})
export class GomSwitchComponent {
  @Input() checked = false;
  @Input() disabled = false;
  @Input() leftText = 'Off';
  @Input() rightText = 'On';
  @Input() leftIcon = '';
  @Input() rightIcon = '';
  @Input() ariaLabel = 'Toggle';

  @Output() checkedChange = new EventEmitter<boolean>();

  toggle(): void {
    if (this.disabled) {
      return;
    }

    this.checkedChange.emit(!this.checked);
  }
}
