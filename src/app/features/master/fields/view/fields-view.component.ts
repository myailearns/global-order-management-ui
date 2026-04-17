import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import {
  GomButtonContentMode,
  getButtonContentMode,
  showButtonIcon,
  showButtonText,
} from '../../../../shared/components/config';
import { GomButtonComponent } from '../../../../shared/components/form-controls';
import { GomModalComponent } from '../../../../shared/components/modal';
import { FIELD_UI_TEXT } from '../fields.constants';
import { Field } from '../fields.service';

@Component({
  selector: 'gom-fields-view',
  standalone: true,
  imports: [CommonModule, TranslateModule, GomModalComponent, GomButtonComponent],
  templateUrl: './fields-view.component.html',
  styleUrl: './fields-view.component.scss',
})
export class FieldsViewComponent {
  @Input() isOpen = false;
  @Input() field: Field | null = null;
  @Input() usedInFieldGroups: string[] = [];
  @Input() busy = false;
  @Input() canEdit = true;
  @Input() canDelete = true;

  readonly text = FIELD_UI_TEXT;
  @Output() viewClosed = new EventEmitter<void>();
  @Output() edit = new EventEmitter<Field>();
  @Output() delete = new EventEmitter<Field>();

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
    if (!this.field) {
      return;
    }

    this.edit.emit(this.field);
  }

  onDelete(): void {
    if (!this.field) {
      return;
    }

    this.delete.emit(this.field);
  }
}
