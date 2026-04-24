import { CommonModule } from '@angular/common';
import { Component, computed, ElementRef, inject, OnInit, signal, viewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import {
  GomAlertToastService,
  GomButtonComponent,
  GomConfirmationModalComponent,
  GomInputComponent,
  GomModalComponent,
} from '@gomlibs/ui';
import { MediaAssetService } from '../../../features/saas-platform/media/media-asset.service';
import { MediaAsset, MediaUsageDetail, StorageSummary } from '../../../features/saas-platform/media/media-asset.model';

export type MediaLibraryMode = 'platform' | 'tenant';

export interface QueueItem {
  id: number;
  file: File;
  dataUrl: string;
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
  private readonly mediaService = inject(MediaAssetService);
  private readonly toast = inject(GomAlertToastService);
  private readonly route = inject(ActivatedRoute);

  readonly mode = signal<MediaLibraryMode>('tenant');
  readonly isPlatform = computed(() => this.mode() === 'platform');

  readonly loading = signal(false);
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

  private readonly ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  private readonly MAX_SIZE = 5 * 1024 * 1024;

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
      ? this.mediaService.listPlatformMedia(this.page(), this.limit(), this.search())
      : this.mediaService.listTenantMedia(this.page(), this.limit(), this.search());

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

  private addFiles(files: File[]): void {
    let skipped = 0;
    for (const file of files) {
      if (!this.ALLOWED_TYPES.includes(file.type)) { skipped++; continue; }
      if (file.size > this.MAX_SIZE) { skipped++; continue; }

      const reader = new FileReader();
      const id = this.nextQueueId++;
      const name = file.name.replace(/\.[^/.]+$/, '');

      reader.onload = () => {
        const item: QueueItem = { id, file, dataUrl: reader.result as string, name, status: 'pending' };
        this.uploadQueue.update((q) => [...q, item]);
      };
      reader.readAsDataURL(file);
    }
    if (skipped > 0) {
      this.toast.error(`${skipped} file(s) skipped (invalid type or too large).`);
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
      this.uploadQueue.update((q) => q.map((qi) => (qi.id === item.id ? { ...qi, status: 'uploading' as const } : qi)));

      const upload$ = this.isPlatform()
        ? this.mediaService.uploadPlatformMedia(item.file, item.name.trim())
        : this.mediaService.uploadTenantMedia(item.file, item.name.trim());

      try {
        await new Promise<void>((resolve) => {
          upload$.subscribe({
            next: () => {
              this.uploadQueue.update((q) => q.map((qi) => (qi.id === item.id ? { ...qi, status: 'done' as const } : qi)));
              succeeded++;
              resolve();
            },
            error: () => {
              this.uploadQueue.update((q) => q.map((qi) => (qi.id === item.id ? { ...qi, status: 'failed' as const } : qi)));
              failed++;
              resolve();
            },
          });
        });
      } catch {
        failed++;
      }
    }

    this.uploadProgress.set(null);

    if (failed === 0) {
      this.toast.success(`${succeeded} image(s) uploaded successfully.`);
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
}
