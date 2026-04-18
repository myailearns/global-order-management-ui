import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { GomButtonContentMode, getButtonContentMode, showButtonIcon, showButtonText } from '@gomlibs/ui';
import { GomButtonComponent } from '@gomlibs/ui';
import { GomModalComponent } from '@gomlibs/ui';
import { UNIT_UI_TEXT } from '../units.constants';
import { Unit } from '../units.service';

@Component({
  selector: 'gom-units-view',
  standalone: true,
  imports: [CommonModule, TranslateModule, GomModalComponent, GomButtonComponent],
  templateUrl: './units-view.component.html',
  styleUrl: './units-view.component.scss',
})
export class UnitsViewComponent {
  @Input() isOpen = false;
  @Input() unit: Unit | null = null;
  @Input() baseUnitName = '';
  @Input() busy = false;
  @Input() canEdit = true;
  @Input() canDelete = true;

  readonly text = UNIT_UI_TEXT;
  @Output() viewClosed = new EventEmitter<void>();
  @Output() edit = new EventEmitter<Unit>();
  @Output() delete = new EventEmitter<Unit>();

  readonly editMode: GomButtonContentMode = getButtonContentMode('primary-action');
  readonly deleteMode: GomButtonContentMode = getButtonContentMode('danger-action');
  readonly closeMode: GomButtonContentMode = getButtonContentMode('dismiss');

  shouldShowIcon(mode: GomButtonContentMode): boolean {
    return showButtonIcon(mode);
  }

  shouldShowText(mode: GomButtonContentMode): boolean {
    return showButtonText(mode);
  }

  onClose(): void {
    this.viewClosed.emit();
  }

  onEdit(): void {
    if (this.unit) {
      this.edit.emit(this.unit);
    }
  }

  onDelete(): void {
    if (this.unit) {
      this.delete.emit(this.unit);
    }
  }
}