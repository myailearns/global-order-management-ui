import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { GomButtonComponent, GomModalComponent } from '@gomlibs/ui';
import { TemplateCategoryPreview } from '../template-subscription.service';

@Component({
  selector: 'gom-template-preview-modal',
  standalone: true,
  imports: [CommonModule, TranslateModule, GomModalComponent, GomButtonComponent],
  templateUrl: './template-preview-modal.component.html',
  styleUrl: './template-preview-modal.component.scss',
})
export class TemplatePreviewModalComponent {
  @Input() show = false;
  @Input() preview: TemplateCategoryPreview | null = null;
  @Input() loading = false;
  @Output() showChange = new EventEmitter<boolean>();
  @Output() closed = new EventEmitter<void>();
  @Output() subscribeClicked = new EventEmitter<string>();

  onClose(): void {
    this.show = false;
    this.showChange.emit(false);
    this.closed.emit();
  }

  onSubscribe(): void {
    if (this.preview?.category?._id) {
      this.subscribeClicked.emit(this.preview.category._id);
    }
  }
}
