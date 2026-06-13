import {
  Component,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  input,
  output,
  ChangeDetectionStrategy,
} from '@angular/core';

@Component({
  selector: 'app-rich-text-editor',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="rte-container">
      @if (label()) {
        <label class="rte-label">{{ label() }}</label>
      }
      <div #editorContainer class="rte-editor"></div>
    </div>
  `,
  styles: [`
    .rte-container {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }
    .rte-label {
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--color-text-secondary, #555);
    }
    .rte-editor {
      border: 1px solid #ccc;
      border-radius: 0.375rem;
      overflow: hidden;
    }
    :host ::ng-deep .ql-toolbar {
      border: none !important;
      border-bottom: 1px solid #ccc !important;
    }
    :host ::ng-deep .ql-container {
      border: none !important;
      font-size: 0.875rem;
    }
    :host ::ng-deep .ql-editor {
      min-height: 150px;
    }
  `],
})
export class RichTextEditorComponent implements AfterViewInit, OnDestroy {
  @ViewChild('editorContainer', { static: true }) editorContainer!: ElementRef;

  readonly label = input<string>('');
  readonly placeholder = input<string>('');
  readonly value = input<string>('');
  readonly valueChange = output<string>();
  readonly modules = input<any>({
    toolbar: [
      [{ header: [2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ color: [] }, { background: [] }],
      [{ list: 'ordered' }, { list: 'bullet' }],
      [{ indent: '-1' }, { indent: '+1' }],
      [{ align: [] }],
      ['blockquote', 'link'],
      ['clean'],
    ],
  });

  private quill: any = null;
  private skipNextEmit = false;

  ngAfterViewInit(): void {
    this.initQuill();
  }

  private async initQuill(): Promise<void> {
    const Quill = (await import('quill')).default;
    this.quill = new Quill(this.editorContainer.nativeElement, {
      theme: 'snow',
      placeholder: this.placeholder(),
      modules: this.modules(),
    });

    // Load initial value
    const initial = this.value();
    if (initial) {
      this.quill.clipboard.dangerouslyPasteHTML(initial);
    }

    // Listen for changes
    this.quill.on('text-change', () => {
      if (this.skipNextEmit) {
        this.skipNextEmit = false;
        return;
      }
      const html = this.quill.root.innerHTML;
      const isEmpty = !html || html === '<p></p>' || html === '<p><br></p>';
      this.valueChange.emit(isEmpty ? '' : html);
    });
  }

  /** Called externally to set content (e.g., when editing a group) */
  setContent(html: string): void {
    if (!this.quill) return;
    this.skipNextEmit = true;
    if (html) {
      this.quill.clipboard.dangerouslyPasteHTML(html);
    } else {
      this.quill.setText('');
    }
  }

  clear(): void {
    if (!this.quill) return;
    this.skipNextEmit = true;
    this.quill.setText('');
  }

  ngOnDestroy(): void {
    this.quill = null;
  }
}
