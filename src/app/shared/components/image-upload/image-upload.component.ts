import { CommonModule } from '@angular/common';
import { Component, ElementRef, input, output, signal, viewChild } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { GomButtonComponent } from '@gomlibs/ui';

export interface UploadPreview {
  file: File;
  dataUrl: string;
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

  /** Emitted in single mode (maxFiles=1). */
  readonly fileSelected = output<File>();
  /** Emitted in multi mode (maxFiles>1). */
  readonly filesSelected = output<File[]>();

  readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');
  readonly dragging = signal(false);
  readonly error = signal<string | null>(null);
  readonly preview = signal<string | null>(null);
  readonly selectedFile = signal<File | null>(null);
  readonly previews = signal<UploadPreview[]>([]);

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

  clearSelection(): void {
    this.preview.set(null);
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
    const allowedTypes = this.accept().split(',').map((t) => t.trim());
    const maxBytes = this.maxSizeMb() * 1024 * 1024;

    const valid: File[] = [];
    for (const file of toProcess) {
      if (!allowedTypes.includes(file.type)) {
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
        newPreviews.push({ file, dataUrl: reader.result as string });
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

    const allowedTypes = this.accept().split(',').map((t) => t.trim());
    if (!allowedTypes.includes(file.type)) {
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
      this.selectedFile.set(file);
      this.fileSelected.emit(file);
    };
    reader.readAsDataURL(file);
  }
}
