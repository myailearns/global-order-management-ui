import { CommonModule } from '@angular/common';
import { Component, computed, ElementRef, input, output, signal, viewChild } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { GomButtonComponent } from '@gomlibs/ui';

export interface UploadPreview {
  file: File;
  dataUrl: string;
  mediaType: 'IMAGE' | 'VIDEO';
}

@Component({
  selector: 'gom-image-upload',
  standalone: true,
  imports: [CommonModule, TranslateModule, GomButtonComponent],
  templateUrl: './image-upload.component.html',
  styleUrl: './image-upload.component.scss',
})
export class ImageUploadComponent {
  readonly accept = input<string>('image/jpeg,image/png,image/webp,image/gif');
  readonly maxSizeMb = input<number>(5);
  readonly maxFiles = input<number>(1);
  readonly disabled = input<boolean>(false);
  readonly dragOrClickLabel = input<string>('media.upload.dragOrClick');
  readonly hintLabel = input<string>('media.upload.hint');
  readonly hintMultiLabel = input<string>('media.upload.hintMulti');
  readonly hintMultiVideoLabel = input<string>('media.upload.hintMultiVideo');

  /** Emitted in single mode (maxFiles=1). */
  readonly fileSelected = output<File>();
  /** Emitted in multi mode (maxFiles>1). */
  readonly filesSelected = output<File[]>();

  readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');
  readonly dragging = signal(false);
  readonly error = signal<string | null>(null);
  readonly preview = signal<string | null>(null);
  readonly previewMediaType = signal<'IMAGE' | 'VIDEO'>('IMAGE');
  readonly selectedFile = signal<File | null>(null);
  readonly previews = signal<UploadPreview[]>([]);

  readonly isVideoMode = computed(() => this.accept().includes('video'));
  readonly hintLabelResolved = computed(() => {
    if (this.isMultiple) {
      return this.isVideoMode() ? this.hintMultiVideoLabel() : this.hintMultiLabel();
    }
    return this.hintLabel();
  });

  get isMultiple(): boolean {
    return this.maxFiles() > 1;
  }

  openFilePicker(): void {
    this.fileInput()?.nativeElement.click();
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      if (this.isMultiple) {
        this.processFiles(Array.from(input.files));
      } else {
        this.processFile(input.files[0]);
      }
    }
    input.value = '';
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragging.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragging.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragging.set(false);

    const files = event.dataTransfer?.files;
    if (!files?.length) return;

    if (this.isMultiple) {
      this.processFiles(Array.from(files));
    } else {
      this.processFile(files[0]);
    }
  }

  onDropzoneKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.openFilePicker();
    }
  }

  clearSelection(): void {
    this.preview.set(null);
    this.previewMediaType.set('IMAGE');
    this.selectedFile.set(null);
    this.error.set(null);
    this.previews.set([]);
  }

  removePreview(index: number): void {
    this.previews.update((list) => list.filter((_, i) => i !== index));
  }

  confirmMultiSelection(): void {
    const files = this.previews().map((p) => p.file);
    if (files.length > 0) {
      this.filesSelected.emit(files);
    }
  }

  private processFiles(files: File[]): void {
    this.error.set(null);
    const max = this.maxFiles();
    const current = this.previews();
    const remaining = max - current.length;

    if (remaining <= 0) {
      this.error.set('media.upload.errorMaxFiles');
      return;
    }

    const toProcess = files.slice(0, remaining);
    const allowedTypes = new Set(this.accept().split(',').map((t) => t.trim()));
    const maxBytes = this.maxSizeMb() * 1024 * 1024;

    const valid: File[] = [];
    for (const file of toProcess) {
      if (!allowedTypes.has(file.type)) {
        this.error.set('media.upload.errorInvalidType');
        continue;
      }
      if (file.size > maxBytes) {
        this.error.set('media.upload.errorTooLarge');
        continue;
      }
      valid.push(file);
    }

    if (valid.length === 0) return;

    let loaded = 0;
    const newPreviews: UploadPreview[] = [];

    for (const file of valid) {
      const reader = new FileReader();
      reader.onload = () => {
        newPreviews.push({
          file,
          dataUrl: reader.result as string,
          mediaType: String(file.type || '').startsWith('video/') ? 'VIDEO' : 'IMAGE',
        });
        loaded++;
        if (loaded === valid.length) {
          this.previews.update((list) => [...list, ...newPreviews]);
        }
      };
      reader.readAsDataURL(file);
    }
  }

  private processFile(file: File): void {
    this.error.set(null);

    const allowedTypes = new Set(this.accept().split(',').map((t) => t.trim()));
    if (!allowedTypes.has(file.type)) {
      this.error.set('media.upload.errorInvalidType');
      return;
    }

    const maxBytes = this.maxSizeMb() * 1024 * 1024;
    if (file.size > maxBytes) {
      this.error.set('media.upload.errorTooLarge');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.preview.set(reader.result as string);
      this.previewMediaType.set(String(file.type || '').startsWith('video/') ? 'VIDEO' : 'IMAGE');
      this.selectedFile.set(file);
      this.fileSelected.emit(file);
    };
    reader.readAsDataURL(file);
  }
}
