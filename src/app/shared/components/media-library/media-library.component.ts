import { CommonModule } from '@angular/common';
import { Component, computed, ElementRef, inject, OnInit, signal, viewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import {
  GomAlertToastService,
  GomButtonComponent,
  GomConfirmationModalComponent,
  GomInputComponent,
  GomModalComponent,
} from '@gomlibs/ui';
import { MediaAssetService } from '../../../features/saas-platform/media/media-asset.service';
import { MediaAsset, MediaType, MediaUsageDetail, StorageSummary } from '../../../features/saas-platform/media/media-asset.model';

export type MediaLibraryMode = 'platform' | 'tenant';

export interface QueueItem {
  id: number;
  file: File;
  dataUrl: string;
  mediaType: MediaType;
  name: string;
  status: 'pending' | 'uploading' | 'done' | 'failed';
}

@Component({
  selector: 'gom-media-library',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    GomButtonComponent,
    GomInputComponent,
    GomModalComponent,
    GomConfirmationModalComponent,
  ],
  templateUrl: './media-library.component.html',
  styleUrl: './media-library.component.scss',
})
export class MediaLibraryComponent implements OnInit {
  private readonly platformTenantId = '__platform__';
  private readonly mediaService = inject(MediaAssetService);
  private readonly toast = inject(GomAlertToastService);
  private readonly route = inject(ActivatedRoute);

  readonly mode = signal<MediaLibraryMode>('tenant');
  readonly isPlatform = computed(() => this.mode() === 'platform');

  readonly loading = signal(false);
  readonly activeMediaType = signal<MediaType>('IMAGE');
  readonly assets = signal<MediaAsset[]>([]);
  readonly page = signal(1);
  readonly limit = signal(20);
  readonly total = signal(0);
  readonly totalPages = signal(0);
  readonly search = signal('');

  // Upload queue
  readonly uploadModalOpen = signal(false);
  readonly uploadQueue = signal<QueueItem[]>([]);
  readonly uploadProgress = signal<{ current: number; total: number } | null>(null);
  readonly dragging = signal(false);
  private nextQueueId = 1;

  readonly pendingCount = computed(() => this.uploadQueue().filter((q) => q.status === 'pending').length);
  readonly isUploading = computed(() => this.uploadProgress() !== null);
  readonly hasInvalidNames = computed(() => this.uploadQueue().some((q) => q.status === 'pending' && !q.name.trim()));

  readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('queueFileInput');

  // Delete
  readonly deleteConfirmOpen = signal(false);
  readonly deletingId = signal<string | null>(null);
  readonly deletingName = signal('');

  // Platform-only: Info / Usage detail modal
  readonly infoModalOpen = signal(false);
  readonly infoLoading = signal(false);
  readonly usageDetail = signal<MediaUsageDetail | null>(null);

  // Platform-only: Storage summary
  readonly storageSummary = signal<StorageSummary | null>(null);
  readonly STORAGE_LIMIT_GB = 15;
  readonly storagePercent = computed(() => {
    const s = this.storageSummary();
    if (!s) return 0;
    return Math.min(100, (s.total.size / (this.STORAGE_LIMIT_GB * 1024 * 1024 * 1024)) * 100);
  });
  readonly storageLevel = computed(() => {
    const pct = this.storagePercent();
    if (pct >= 90) return 'danger';
    if (pct >= 75) return 'warning';
    return 'normal';
  });

  private readonly IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  private readonly VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
  private readonly IMAGE_MAX_SIZE = 5 * 1024 * 1024;
  private readonly VIDEO_MAX_SIZE = 50 * 1024 * 1024;

  readonly uploadAccept = computed(() => (
    this.activeMediaType() === 'VIDEO'
      ? this.VIDEO_TYPES.join(',')
      : this.IMAGE_TYPES.join(',')
  ));

  readonly maxSizeMb = computed(() => (this.activeMediaType() === 'VIDEO' ? 50 : 5));

  // Dynamic labels based on active media type
  readonly modalTitle = computed(() =>
    this.activeMediaType() === 'VIDEO' ? 'media.uploadModal.titleVideo' : 'media.uploadModal.titleImage'
  );

  readonly uploadButtonLabel = computed(() =>
    this.activeMediaType() === 'VIDEO' ? 'media.actions.uploadVideo' : 'media.actions.uploadImage'
  );

  readonly uploadCountLabel = computed(() =>
    this.activeMediaType() === 'VIDEO' ? 'media.uploadQueue.uploadCountVideo' : 'media.uploadQueue.uploadCount'
  );

  readonly searchPlaceholderKey = computed(() =>
    this.activeMediaType() === 'VIDEO' ? 'media.searchPlaceholderVideo' : 'media.searchPlaceholderImage'
  );

  readonly countLabelKey = computed(() =>
    this.activeMediaType() === 'VIDEO' ? 'media.videoCount' : 'media.imageCount'
  );

  readonly infoModalTitleKey = computed(() => {
    const mediaType = this.usageDetail()?.asset?.mediaType;
    return mediaType === 'VIDEO' ? 'media.infoModal.videoTitle' : 'media.infoModal.title';
  });

  readonly dragOrClickLabel = computed(() =>
    this.activeMediaType() === 'VIDEO'
      ? 'media.upload.dragOrClickVideo'
      : 'media.upload.dragOrClickImage'
  );

  readonly hintLabel = computed(() =>
    this.activeMediaType() === 'VIDEO' ? 'media.upload.hintVideo' : 'media.upload.hint'
  );

  // Accessibility: provide a minimal captions track for preview players.
  readonly previewCaptionTrack = 'data:text/vtt;charset=utf-8,WEBVTT%0A';

  ngOnInit(): void {
    const routeMode = this.route.snapshot.data['mode'];
    if (routeMode === 'platform' || routeMode === 'tenant') {
      this.mode.set(routeMode);
    }
    this.loadMedia();
    if (this.isPlatform()) {
      this.loadStorageSummary();
    }
  }

  // --- Media List ---

  loadMedia(): void {
    this.loading.set(true);
    const list$ = this.isPlatform()
      ? this.mediaService.listPlatformMedia(this.page(), this.limit(), this.search(), this.activeMediaType())
      : this.mediaService.listTenantMedia(this.page(), this.limit(), this.search(), this.activeMediaType());

    list$.subscribe({
      next: (result) => {
        this.assets.set(result.items);
        this.total.set(result.meta.total);
        this.totalPages.set(result.meta.totalPages);
        this.loading.set(false);
      },
      error: () => {
        this.toast.error('Failed to load media.');
        this.loading.set(false);
      },
    });
  }

  loadStorageSummary(): void {
    this.mediaService.getStorageSummary().subscribe({
      next: (summary) => this.storageSummary.set(summary),
      error: () => {},
    });
  }

  formatStorage(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }

  onSearchChange(value: string): void {
    this.search.set(value);
    this.page.set(1);
    this.loadMedia();
  }

  onPageChange(newPage: number): void {
    if (newPage < 1 || newPage > this.totalPages()) return;
    this.page.set(newPage);
    this.loadMedia();
  }

  onMediaTypeChange(mediaType: MediaType): void {
    if (this.activeMediaType() === mediaType) {
      return;
    }
    this.activeMediaType.set(mediaType);
    this.page.set(1);
    this.search.set('');
    this.loadMedia();
  }

  // --- Upload Queue ---

  openUploadModal(): void {
    this.uploadQueue.set([]);
    this.uploadProgress.set(null);
    this.nextQueueId = 1;
    this.uploadModalOpen.set(true);
  }

  closeUploadModal(): void {
    if (this.isUploading()) return;
    this.uploadModalOpen.set(false);
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
    if (files?.length) {
      this.addFiles(Array.from(files));
    }
  }

  onDropzoneKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.openFilePicker();
    }
  }

  private addFiles(files: File[]): void {
    let invalidType = 0;
    let tooLarge = 0;
    const active = this.activeMediaType();
    const allowedTypes = active === 'VIDEO' ? this.VIDEO_TYPES : this.IMAGE_TYPES;
    const maxSize = active === 'VIDEO' ? this.VIDEO_MAX_SIZE : this.IMAGE_MAX_SIZE;
    const maxSizeMb = Math.floor(maxSize / (1024 * 1024));

    for (const file of files) {
      if (!allowedTypes.includes(file.type)) {
        invalidType++;
        continue;
      }
      if (file.size > maxSize) {
        tooLarge++;
        continue;
      }

      const reader = new FileReader();
      const id = this.nextQueueId++;
      const name = file.name.replace(/\.[^/.]+$/, '');

      reader.onload = () => {
        const item: QueueItem = {
          id,
          file,
          dataUrl: reader.result as string,
          mediaType: active,
          name,
          status: 'pending',
        };
        this.uploadQueue.update((q) => [...q, item]);
      };
      reader.readAsDataURL(file);
    }
    if (invalidType > 0) {
      this.toast.error(`${invalidType} file(s) skipped due to invalid format.`);
    }
    if (tooLarge > 0) {
      const typeName = active === 'VIDEO' ? 'video' : 'image';
      this.toast.error(`${tooLarge} ${typeName}(s) skipped. Max allowed size is ${maxSizeMb} MB.`);
    }
  }

  removeQueueItem(id: number): void {
    this.uploadQueue.update((q) => q.filter((item) => item.id !== id));
  }

  updateQueueItemName(id: number, name: string): void {
    this.uploadQueue.update((q) => q.map((item) => (item.id === id ? { ...item, name } : item)));
  }

  async uploadAll(): Promise<void> {
    const pending = this.uploadQueue().filter((q) => q.status === 'pending' && q.name.trim());
    if (pending.length === 0) return;

    const total = pending.length;
    let current = 0;
    let succeeded = 0;
    let failed = 0;

    this.uploadProgress.set({ current: 0, total });

    for (const item of pending) {
      current++;
      this.uploadProgress.set({ current, total });
      this.setQueueItemStatus(item.id, 'uploading');

      const upload$ = this.isPlatform()
        ? this.mediaService.uploadPlatformMedia(item.file, item.name.trim())
        : this.mediaService.uploadTenantMedia(item.file, item.name.trim());

      try {
        await firstValueFrom(upload$);
        this.setQueueItemStatus(item.id, 'done');
        succeeded++;
      } catch {
        this.setQueueItemStatus(item.id, 'failed');
        failed++;
      }
    }

    this.uploadProgress.set(null);

    if (failed === 0) {
      this.toast.success(`${succeeded} media file(s) uploaded successfully.`);
      this.uploadModalOpen.set(false);
    } else {
      this.toast.error(`${succeeded} uploaded, ${failed} failed.`);
    }

    this.loadMedia();
    if (this.isPlatform()) {
      this.loadStorageSummary();
    }
  }

  // --- Delete ---

  confirmDelete(asset: MediaAsset): void {
    if (!this.canDeleteAsset(asset)) {
      this.toast.info('Platform shared media is visible here, but only platform admins can delete it.');
      return;
    }
    if (this.isPlatform() && asset.usageCount && asset.usageCount > 0) {
      this.toast.error(`Cannot delete — image is used by ${asset.usageCount} group(s).`);
      return;
    }
    this.deletingId.set(asset._id);
    this.deletingName.set(asset.name);
    this.deleteConfirmOpen.set(true);
  }

  cancelDelete(): void {
    this.deleteConfirmOpen.set(false);
    this.deletingId.set(null);
  }

  executeDelete(): void {
    const id = this.deletingId();
    if (!id) return;

    const delete$ = this.isPlatform()
      ? this.mediaService.deletePlatformMedia(id)
      : this.mediaService.deleteTenantMedia(id);

    delete$.subscribe({
      next: () => {
        this.toast.success('Image deleted.');
        this.deleteConfirmOpen.set(false);
        this.deletingId.set(null);
        this.loadMedia();
        if (this.isPlatform()) {
          this.loadStorageSummary();
        }
      },
      error: (err: { error?: { message?: string } }) => {
        const msg = err?.error?.message || 'Delete failed. Image may be in use.';
        this.toast.error(msg);
        this.deleteConfirmOpen.set(false);
      },
    });
  }

  // --- Platform-only: Info / Usage Detail ---

  openInfoModal(asset: MediaAsset): void {
    this.infoModalOpen.set(true);
    this.infoLoading.set(true);
    this.usageDetail.set(null);

    this.mediaService.getPlatformMediaUsage(asset._id).subscribe({
      next: (detail: MediaUsageDetail) => {
        this.usageDetail.set(detail);
        this.infoLoading.set(false);
      },
      error: () => {
        this.toast.error('Failed to load usage details.');
        this.infoLoading.set(false);
      },
    });
  }

  closeInfoModal(): void {
    this.infoModalOpen.set(false);
    this.usageDetail.set(null);
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  private setQueueItemStatus(id: number, status: QueueItem['status']): void {
    this.uploadQueue.update((q) => q.map((item) => (item.id === id ? { ...item, status } : item)));
  }

  isVideo(asset: MediaAsset | QueueItem): boolean {
    return asset.mediaType === 'VIDEO';
  }

  isSharedAsset(asset: MediaAsset): boolean {
    return asset.tenantId === this.platformTenantId;
  }

  canDeleteAsset(asset: MediaAsset): boolean {
    return this.isPlatform() || !this.isSharedAsset(asset);
  }
}
