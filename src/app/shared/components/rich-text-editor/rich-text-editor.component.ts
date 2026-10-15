import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  ViewEncapsulation,
  computed,
  input,
  output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  Editor,
  NgxEditorComponent,
  NgxEditorMenuComponent,
  Toolbar,
} from 'ngx-editor';

export type RichTextFormat = 'html' | 'markdown' | 'plain';

export interface RichTextValue {
  format: RichTextFormat;
  value: string;
  html: string;
  markdown: string;
  plain: string;
}

@Component({
  selector: 'app-rich-text-editor',
  standalone: true,
  imports: [FormsModule, NgxEditorComponent, NgxEditorMenuComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'gom-rich-text-editor',
  },
  template: `
    <div class="rte-container">
      @if (label()) {
        <label class="rte-label">{{ label() }}</label>
      }

      <div class="rte-editor">
        <ngx-editor-menu [editor]="editor" [toolbar]="resolvedToolbar()"></ngx-editor-menu>
        <ngx-editor
          [editor]="editor"
          [outputFormat]="'html'"
          [placeholder]="placeholder()"
          [ngModel]="editorHtml"
          (ngModelChange)="onEditorHtmlChanged($event)"
        ></ngx-editor>
      </div>
    </div>
  `,
  styles: [
    `
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
        background: #fff;
      }

      .gom-rich-text-editor .NgxEditor__MenuBar {
        border: none;
        border-bottom: 1px solid #ccc;
      }

      .gom-rich-text-editor .NgxEditor {
        border: none;
        min-height: 150px;
        max-height: 260px;
        overflow-y: auto;
        font-size: 0.875rem;
      }
    `,
  ],
})
export class RichTextEditorComponent implements OnInit, OnDestroy {
  readonly label = input<string>('');
  readonly placeholder = input<string>('');
  readonly value = input<string>('');
  readonly valueFormat = input<RichTextFormat>('html');
  readonly valueChange = output<string>();
  readonly richValueChange = output<RichTextValue>();

  // Kept for backward compatibility with previous API shape.
  readonly modules = input<unknown>(null);

  readonly toolbar = input<Toolbar | null>(null);
  readonly resolvedToolbar = computed<Toolbar>(() => this.toolbar() ?? this.defaultToolbar);

  readonly defaultToolbar: Toolbar = [
    ['bold', 'italic', 'underline', 'strike'],
    ['ordered_list', 'bullet_list'],
    ['align_left', 'align_center', 'align_right', 'align_justify'],
    ['blockquote', 'link'],
    ['undo', 'redo'],
  ];

  editor: Editor = new Editor();
  editorHtml = '';

  private skipNextEmit = false;

  ngOnInit(): void {
    this.editorHtml = this.toHtml(this.value(), this.valueFormat());
  }

  ngOnDestroy(): void {
    this.editor.destroy();
  }

  onEditorHtmlChanged(html: string): void {
    this.editorHtml = String(html || '');

    if (this.skipNextEmit) {
      this.skipNextEmit = false;
      return;
    }

    this.emitCurrentValue();
  }

  setContent(value: string, format: RichTextFormat = 'html'): void {
    this.skipNextEmit = true;
    this.editorHtml = this.toHtml(value, format);
  }

  getContent(format: RichTextFormat = 'html'): string {
    const html = this.getCurrentHtml();
    if (!html) {
      return '';
    }

    if (format === 'markdown') {
      return this.htmlToMarkdown(html);
    }

    if (format === 'plain') {
      return this.htmlToPlain(html);
    }

    return html;
  }

  clear(): void {
    this.skipNextEmit = true;
    this.editorHtml = '';
  }

  private emitCurrentValue(): void {
    const html = this.getCurrentHtml();
    if (!html) {
      this.valueChange.emit('');
      this.richValueChange.emit({
        format: this.valueFormat(),
        value: '',
        html: '',
        markdown: '',
        plain: '',
      });
      return;
    }

    const markdown = this.htmlToMarkdown(html);
    const plain = this.htmlToPlain(html);

    this.valueChange.emit(html);
    this.richValueChange.emit({
      format: this.valueFormat(),
      value: this.selectByFormat(this.valueFormat(), html, markdown, plain),
      html,
      markdown,
      plain,
    });
  }

  private getCurrentHtml(): string {
    const html = String(this.editorHtml || '').trim();
    return html;
  }

  private selectByFormat(
    format: RichTextFormat,
    html: string,
    markdown: string,
    plain: string,
  ): string {
    if (format === 'markdown') return markdown;
    if (format === 'plain') return plain;
    return html;
  }

  private toHtml(value: string, format: RichTextFormat): string {
    const content = String(value || '').trim();
    if (!content) return '';

    if (format === 'markdown') {
      return this.markdownToHtml(content);
    }

    if (format === 'plain') {
      return this.plainToHtml(content);
    }

    return content;
  }

  private plainToHtml(value: string): string {
    const escaped = this.escapeHtml(value);
    const blocks = escaped
      .replaceAll('\r\n', '\n')
      .split(/\n{2,}/)
      .map((part) => part.trim())
      .filter((part) => part.length > 0)
      .map((part) => `<p>${part.replaceAll('\n', '<br>')}</p>`);

    return blocks.join('');
  }

  private markdownToHtml(markdown: string): string {
    const lines = markdown.replaceAll('\r\n', '\n').split('\n');
    const parts: string[] = [];
    let inUl = false;
    let inOl = false;

    const closeLists = (): void => {
      if (inUl) {
        parts.push('</ul>');
        inUl = false;
      }
      if (inOl) {
        parts.push('</ol>');
        inOl = false;
      }
    };

    for (const line of lines) {
      const next = this.appendMarkdownLine(parts, line, inUl, inOl, closeLists);
      inUl = next.inUl;
      inOl = next.inOl;
    }

    closeLists();
    return parts.join('');
  }

  private parseInlineMarkdown(value: string): string {
    const escaped = this.escapeHtml(value);

    return escaped
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/__(.+?)__/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/_(.+?)_/g, '<em>$1</em>')
      .replace(/~~(.+?)~~/g, '<s>$1</s>')
      .replace(/`([^`]+)`/g, '<code>$1</code>');
  }

  private htmlToPlain(html: string): string {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return (doc.body.textContent || '').replaceAll('\u00a0', ' ').trim();
  }

  private htmlToMarkdown(html: string): string {
    let text = html;

    text = text.replace(/<br\s*\/?>/gi, '\n');
    text = text.replace(/<\/(p|div|h1|h2|h3|h4|h5|h6|blockquote)>/gi, '$&\n');

    text = text.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n');
    text = text.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n');
    text = text.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n');
    text = text.replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n');
    text = text.replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1\n');
    text = text.replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1\n');

    text = text.replace(/<(strong|b)[^>]*>(.*?)<\/(strong|b)>/gi, '**$2**');
    text = text.replace(/<(em|i)[^>]*>(.*?)<\/(em|i)>/gi, '*$2*');
    text = text.replace(/<s[^>]*>(.*?)<\/s>/gi, '~~$1~~');
    text = text.replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`');
    text = text.replace(/<a[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi, '[$2]($1)');

    text = text.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n');
    text = text.replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gi, '> $1\n');

    const doc = new DOMParser().parseFromString(text, 'text/html');
    return (doc.body.textContent || '')
      .replaceAll('\u00a0', ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  private escapeHtml(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  private parseHeading(line: string): { level: number; text: string } | null {
    if (!line.startsWith('#')) {
      return null;
    }

    let level = 0;
    while (level < line.length && line[level] === '#') {
      level += 1;
    }

    if (level < 1 || level > 6 || line[level] !== ' ') {
      return null;
    }

    const text = line.slice(level + 1).trim();
    if (!text) {
      return null;
    }

    return { level, text };
  }

  private parseUnorderedListItem(line: string): string | null {
    if (line.length < 3) return null;
    const marker = line[0];
    if ((marker === '-' || marker === '*' || marker === '+') && line[1] === ' ') {
      const text = line.slice(2).trim();
      return text || null;
    }

    return null;
  }

  private parseOrderedListItem(line: string): string | null {
    const dotIndex = line.indexOf('. ');
    if (dotIndex <= 0) {
      return null;
    }

    const numberPart = line.slice(0, dotIndex);
    if (!/^\d+$/.test(numberPart)) {
      return null;
    }

    const text = line.slice(dotIndex + 2).trim();
    return text || null;
  }

  private parseQuote(line: string): string | null {
    if (!line.startsWith('>')) {
      return null;
    }

    const text = line.slice(1).trim();
    return text || null;
  }

  private appendMarkdownLine(
    parts: string[],
    line: string,
    inUl: boolean,
    inOl: boolean,
    closeLists: () => void,
  ): { inUl: boolean; inOl: boolean } {
    const trimmed = line.trim();
    if (!trimmed) {
      closeLists();
      return { inUl: false, inOl: false };
    }

    const heading = this.parseHeading(trimmed);
    if (heading) {
      closeLists();
      parts.push(`<h${heading.level}>${this.parseInlineMarkdown(heading.text)}</h${heading.level}>`);
      return { inUl: false, inOl: false };
    }

    const ulItem = this.parseUnorderedListItem(trimmed);
    if (ulItem) {
      if (inOl) {
        parts.push('</ol>');
      }
      if (!inUl) {
        parts.push('<ul>');
      }
      parts.push(`<li>${this.parseInlineMarkdown(ulItem)}</li>`);
      return { inUl: true, inOl: false };
    }

    const olItem = this.parseOrderedListItem(trimmed);
    if (olItem) {
      if (inUl) {
        parts.push('</ul>');
      }
      if (!inOl) {
        parts.push('<ol>');
      }
      parts.push(`<li>${this.parseInlineMarkdown(olItem)}</li>`);
      return { inUl: false, inOl: true };
    }

    closeLists();

    const quote = this.parseQuote(trimmed);
    if (quote) {
      parts.push(`<blockquote>${this.parseInlineMarkdown(quote)}</blockquote>`);
      return { inUl: false, inOl: false };
    }

    parts.push(`<p>${this.parseInlineMarkdown(trimmed)}</p>`);
    return { inUl: false, inOl: false };
  }
}
