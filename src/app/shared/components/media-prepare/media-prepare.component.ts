import { CommonModule } from '@angular/common';
import { Component, DestroyRef, ElementRef, computed, effect, inject, input, signal, untracked, viewChild } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { GomAlertToastService, GomButtonComponent, GomChipComponent, GomInputComponent } from '@gomlibs/ui';
import {
  MEDIA_PURPOSE_RULES,
  MediaPurpose,
  PREPARE_ACCEPTED_TYPES,
  PREPARE_OUTPUT_MAX_BYTES,
  PREPARE_SOURCE_MAX_BYTES,
  PREPARE_SOURCE_MAX_MB,
} from './media-purpose.config';
import {
  AdjustMode,
  CropRect,
  ImageProcessingError,
  ProcessedImage,
  clampOffset,
  computeBaseScale,
  computeCropFromViewport,
  isBelowMinimum,
  processImage,
  ratioMatches,
  readImageSize,
} from './image-processor.util';

export type PrepareUploadStatus = 'idle' | 'uploading' | 'done' | 'failed';

export interface PrepareItem {
  id: number;
  nameControl: FormControl<string>;
  source: File;
  sourceUrl: string;
  sourceWidth: number;
  sourceHeight: number;
  matches: boolean;
  lowResolution: boolean;
  mode: AdjustMode;
  state: 'processing' | 'ready' | 'error';
  errorKey?: string;
  result?: ProcessedImage;
  previewUrl?: string;
  uploadStatus: PrepareUploadStatus;
  uploadMessage?: string;
}

interface DragState {
  startX: number;
  startY: number;
  originX: number;
  originY: number;
}

const CROP_VIEW_WIDTH = 280;
const CROP_MAX_ZOOM = 4;
const CROP_ZOOM_STEP = 1.2;
const CROP_KEY_STEP = 12;

/**
 * Selects images for one purpose, checks the ratio, adjusts (fit / fill / manual crop),
 * compresses in the browser and exposes the processed files through `readyItems`.
 */
@Component({
  selector: 'gom-media-prepare',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule, GomButtonComponent, GomChipComponent, GomInputComponent],
  templateUrl: './media-prepare.component.html',
  styleUrl: './media-prepare.component.scss',
})
export class MediaPrepareComponent {
  readonly purpose = input.required<MediaPurpose>();
  readonly disabled = input<boolean>(false);
  readonly showNames = input<boolean>(false);
  readonly maxFiles = input<number | null>(null);

  private readonly toast = inject(GomAlertToastService);
  private readonly translate = inject(TranslateService);

  readonly sourceMaxMb = PREPARE_SOURCE_MAX_MB;
  readonly accept = PREPARE_ACCEPTED_TYPES.join(',');
  readonly cropViewWidth = CROP_VIEW_WIDTH;

  readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');
  readonly rule = computed(() => MEDIA_PURPOSE_RULES[this.purpose()]);
  readonly cropViewHeight = computed(() => Math.round(CROP_VIEW_WIDTH / this.rule().ratio));

  readonly items = signal<PrepareItem[]>([]);
  readonly dragging = signal(false);
  readonly readyItems = computed(() =>
    this.items().filter((item) => item.state === 'ready' && item.uploadStatus !== 'done'),
  );
  readonly isProcessing = computed(() => this.items().some((item) => item.state === 'processing'));
  readonly hasMismatch = computed(() => this.items().some((item) => !item.matches && item.state !== 'error'));

  readonly cropEditingId = signal<number | null>(null);
  readonly cropZoom = signal(1);
  readonly cropOffsetX = signal(0);
  readonly cropOffsetY = signal(0);
  readonly cropItem = computed(() => this.items().find((item) => item.id === this.cropEditingId()) ?? null);
  readonly cropScale = computed(() => {
    const item = this.cropItem();
    if (!item) return 1;
    return computeBaseScale(item.sourceWidth, item.sourceHeight, CROP_VIEW_WIDTH, this.cropViewHeight()) * this.cropZoom();
  });

  private nextId = 1;
  private reservedCount = 0;
  private queue: Promise<void> = Promise.resolve();
  private drag: DragState | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.revokeAll());

    effect(() => {
      this.purpose();
      untracked(() => this.reprocessAll());
    });
  }

  openFilePicker(): void {
    this.fileInput()?.nativeElement.click();
  }

  onFileInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.addFiles(Array.from(input.files));
    }
    input.value = '';
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(false);
    if (this.disabled()) return;
    const files = event.dataTransfer?.files;
    if (files?.length) {
      this.addFiles(Array.from(files));
    }
  }

  addFiles(files: File[]): void {
    let invalidType = 0;
    let tooLarge = 0;
    let overLimit = false;

    for (const file of files) {
      if (!PREPARE_ACCEPTED_TYPES.includes(file.type)) {
        invalidType++;
        continue;
      }
      if (file.size > PREPARE_SOURCE_MAX_BYTES) {
        tooLarge++;
        continue;
      }
      const max = this.maxFiles();
      if (max !== null && this.reservedCount >= max) {
        overLimit = true;
        continue;
      }
      this.reservedCount++;
      this.enqueue(() => this.readAndProcess(file));
    }

    if (overLimit) {
      const remaining = Math.max((this.maxFiles() ?? 0) - this.reservedCount, 0);
      this.toast.error(this.translate.instant('media.prepare.errors.maxFiles', { max: remaining }));
    }

    if (invalidType > 0) {
      this.toast.error(this.translate.instant('media.prepare.errors.invalidType', { count: invalidType }));
    }
    if (tooLarge > 0) {
      this.toast.error(this.translate.instant('media.prepare.errors.tooLarge', { count: tooLarge, maxSize: PREPARE_SOURCE_MAX_MB }));
    }
  }

  setMode(id: number, mode: AdjustMode): void {
    if (this.disabled()) return;
    if (mode === 'crop') {
      this.openCrop(id);
      return;
    }
    this.cancelCrop();
    this.patch(id, { mode });
    this.enqueue(() => this.runProcess(id));
  }

  applyModeToMismatched(mode: 'fit' | 'fill'): void {
    this.cancelCrop();
    for (const item of this.items()) {
      if (item.matches || item.uploadStatus === 'done') continue;
      this.patch(item.id, { mode });
      this.enqueue(() => this.runProcess(item.id));
    }
  }

  hasInvalidNames(): boolean {
    return this.showNames() && this.readyItems().some((item) => item.nameControl.invalid || !item.nameControl.value.trim());
  }

  removeItem(id: number): void {
    if (this.cropEditingId() === id) this.cancelCrop();
    const item = this.items().find((entry) => entry.id === id);
    if (item) {
      this.revokeItem(item);
      this.reservedCount = Math.max(this.reservedCount - 1, 0);
    }
    this.items.update((list) => list.filter((entry) => entry.id !== id));
  }

  reset(): void {
    this.revokeAll();
    this.cancelCrop();
    this.reservedCount = 0;
    this.items.set([]);
  }

  setUploadStatus(id: number, uploadStatus: PrepareUploadStatus, uploadMessage?: string): void {
    this.patch(id, { uploadStatus, uploadMessage });
  }

  // --- Manual crop ---

  openCrop(id: number): void {
    const item = this.items().find((entry) => entry.id === id);
    if (!item) return;
    const scale = computeBaseScale(item.sourceWidth, item.sourceHeight, CROP_VIEW_WIDTH, this.cropViewHeight());
    this.cropEditingId.set(id);
    this.cropZoom.set(1);
    this.cropOffsetX.set((CROP_VIEW_WIDTH - item.sourceWidth * scale) / 2);
    this.cropOffsetY.set((this.cropViewHeight() - item.sourceHeight * scale) / 2);
  }

  cancelCrop(): void {
    this.cropEditingId.set(null);
    this.drag = null;
  }

  applyCrop(): void {
    const item = this.cropItem();
    if (!item) return;
    const rect: CropRect = computeCropFromViewport(
      item.sourceWidth,
      item.sourceHeight,
      CROP_VIEW_WIDTH,
      this.cropViewHeight(),
      this.cropZoom(),
      this.cropOffsetX(),
      this.cropOffsetY(),
    );
    this.patch(item.id, { mode: 'crop' });
    this.cancelCrop();
    this.enqueue(() => this.runProcess(item.id, rect));
  }

  zoomIn(): void {
    this.setZoom(this.cropZoom() * CROP_ZOOM_STEP);
  }

  zoomOut(): void {
    this.setZoom(this.cropZoom() / CROP_ZOOM_STEP);
  }

  onCropPointerDown(event: PointerEvent): void {
    this.drag = {
      startX: event.clientX,
      startY: event.clientY,
      originX: this.cropOffsetX(),
      originY: this.cropOffsetY(),
    };
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }

  onCropPointerMove(event: PointerEvent): void {
    if (!this.drag) return;
    this.moveCrop(this.drag.originX + (event.clientX - this.drag.startX), this.drag.originY + (event.clientY - this.drag.startY));
  }

  onCropPointerUp(): void {
    this.drag = null;
  }

  onCropKeydown(event: KeyboardEvent): void {
    const step = CROP_KEY_STEP;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [step, 0],
      ArrowRight: [-step, 0],
      ArrowUp: [0, step],
      ArrowDown: [0, -step],
    };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    this.moveCrop(this.cropOffsetX() + move[0], this.cropOffsetY() + move[1]);
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  private moveCrop(x: number, y: number): void {
    const item = this.cropItem();
    if (!item) return;
    const scale = this.cropScale();
    this.cropOffsetX.set(clampOffset(x, CROP_VIEW_WIDTH, item.sourceWidth * scale));
    this.cropOffsetY.set(clampOffset(y, this.cropViewHeight(), item.sourceHeight * scale));
  }

  private setZoom(next: number): void {
    const item = this.cropItem();
    if (!item) return;
    const base = computeBaseScale(item.sourceWidth, item.sourceHeight, CROP_VIEW_WIDTH, this.cropViewHeight());
    const oldScale = this.cropScale();
    const zoom = Math.min(CROP_MAX_ZOOM, Math.max(1, next));
    const newScale = base * zoom;
    const centerX = (CROP_VIEW_WIDTH / 2 - this.cropOffsetX()) / oldScale;
    const centerY = (this.cropViewHeight() / 2 - this.cropOffsetY()) / oldScale;
    this.cropZoom.set(zoom);
    this.cropOffsetX.set(clampOffset(CROP_VIEW_WIDTH / 2 - centerX * newScale, CROP_VIEW_WIDTH, item.sourceWidth * newScale));
    this.cropOffsetY.set(clampOffset(this.cropViewHeight() / 2 - centerY * newScale, this.cropViewHeight(), item.sourceHeight * newScale));
  }

  // --- Processing ---

  private enqueue(task: () => Promise<void>): void {
    this.queue = this.queue.then(task).catch(() => undefined);
  }

  private async readAndProcess(file: File): Promise<void> {
    try {
      const size = await readImageSize(file);
      const rule = this.rule();
      const matches = ratioMatches(size.width, size.height, rule.ratio);
      const id = this.nextId++;
      const item: PrepareItem = {
        id,
        nameControl: new FormControl(file.name.replace(/\.[^/.]+$/, ''), { nonNullable: true, validators: [Validators.required] }),
        source: file,
        sourceUrl: URL.createObjectURL(file),
        sourceWidth: size.width,
        sourceHeight: size.height,
        matches,
        lowResolution: isBelowMinimum(size.width, size.height, rule),
        mode: matches ? 'fill' : 'fit',
        state: 'processing',
        uploadStatus: 'idle',
      };
      this.items.update((list) => [...list, item]);
      await this.runProcess(id);
    } catch {
      this.reservedCount = Math.max(this.reservedCount - 1, 0);
      this.toast.error(this.translate.instant('media.prepare.errors.decode', { name: file.name }));
    }
  }

  private async runProcess(id: number, crop?: CropRect): Promise<void> {
    const item = this.items().find((entry) => entry.id === id);
    if (!item) return;
    this.patch(id, { state: 'processing', errorKey: undefined });
    try {
      const result = await processImage(item.source, this.rule(), item.mode, crop);
      if (result.size > PREPARE_OUTPUT_MAX_BYTES) {
        this.patch(id, { state: 'error', errorKey: 'media.prepare.errors.resultTooLarge' });
        return;
      }
      const current = this.items().find((entry) => entry.id === id);
      if (!current) return;
      if (current.previewUrl) URL.revokeObjectURL(current.previewUrl);
      this.patch(id, { state: 'ready', result, previewUrl: URL.createObjectURL(result.file) });
    } catch (error) {
      const key = error instanceof ImageProcessingError && error.code === 'tooManyPixels'
        ? 'media.prepare.errors.tooManyPixels'
        : 'media.prepare.errors.processFailed';
      this.patch(id, { state: 'error', errorKey: key });
    }
  }

  private reprocessAll(): void {
    for (const item of this.items()) {
      const matches = ratioMatches(item.sourceWidth, item.sourceHeight, this.rule().ratio);
      this.patch(item.id, {
        matches,
        lowResolution: isBelowMinimum(item.sourceWidth, item.sourceHeight, this.rule()),
        mode: matches ? 'fill' : 'fit',
      });
      this.enqueue(() => this.runProcess(item.id));
    }
  }

  private patch(id: number, changes: Partial<PrepareItem>): void {
    this.items.update((list) => list.map((item) => (item.id === id ? { ...item, ...changes } : item)));
  }

  private revokeItem(item: PrepareItem): void {
    URL.revokeObjectURL(item.sourceUrl);
    if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
  }

  private revokeAll(): void {
    this.items().forEach((item) => this.revokeItem(item));
  }
}
