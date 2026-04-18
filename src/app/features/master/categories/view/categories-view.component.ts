import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import {
  GomButtonContentMode,
  getButtonContentMode,
  showButtonIcon,
  showButtonText,
} from '@gomlibs/ui';
import { CATEGORY_UI_TEXT } from '../categories.constants';
import { GomButtonComponent } from '@gomlibs/ui';
import { GomModalComponent } from '@gomlibs/ui';
import { Category } from '../categories.service';

@Component({
  selector: 'gom-categories-view',
  standalone: true,
  imports: [CommonModule, TranslateModule, GomModalComponent, GomButtonComponent],
  templateUrl: './categories-view.component.html',
  styleUrl: './categories-view.component.scss',
})
export class CategoriesViewComponent {
  @Input() isOpen = false;
  @Input() category: Category | null = null;
  @Input() busy = false;
  @Input() canEdit = true;
  @Input() canDelete = true;

  readonly text = CATEGORY_UI_TEXT;
  @Output() viewClosed = new EventEmitter<void>();
  @Output() edit = new EventEmitter<Category>();
  @Output() delete = new EventEmitter<Category>();

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
    if (!this.category) {
      return;
    }

    this.edit.emit(this.category);
  }

  onDelete(): void {
    if (!this.category) {
      return;
    }

    this.delete.emit(this.category);
  }
}
