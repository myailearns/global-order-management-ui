import { CommonModule } from '@angular/common';
import { Component, HostListener, computed, ElementRef, inject, OnInit, signal, viewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import {
  GomAlertToastService,
  GomButtonComponent,
  GomConfirmationModalComponent,
  GomInputComponent,
  GomModalComponent,
  GomTabsComponent,
  TabItem,
} from '@gomlibs/ui';
import { PageHeadingComponent } from '../page-heading/page-heading.component';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { MediaAssetService } from '../../../features/saas-platform/media/media-asset.service';
import { MediaAsset, MediaType, MediaUsageDetail, StorageSummary } from '../../../features/saas-platform/media/media-asset.model';
import { AttachResult, AttachTarget } from '../media-attach/media-attach.models';
import { MediaAttachService } from '../media-attach/media-attach.service';
import { MediaAttachTargetComponent } from '../media-attach/media-attach-target.component';
import { MediaPrepareComponent } from '../media-prepare/media-prepare.component';
import { MediaPurpose } from '../media-prepare/media-purpose.config';
import { MediaUploadService } from '../media-prepare/media-upload.service';

export type MediaLibraryMode = 'platform' | 'tenant';
export type MediaLibraryTab = MediaPurpose | 'VIDEO';

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
    GomTabsComponent,
    PageHeadingComponent,
    MediaPrepareComponent,
    MediaAttachTargetComponent,
  ],
  templateUrl: './media-library.component.html',
  styleUrl: './media-library.component.scss',
})
export class MediaLibraryComponent implements OnInit {
  private readonly platformTenantId = '__platform__';
  private readonly mediaService = inject(MediaAssetService);
  private readonly toast = inject(GomAlertToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly authSession = inject(AuthSessionService);
  private readonly translate = inject(TranslateService);
  private readonly uploadService = inject(MediaUploadService);
  private readonly attachService = inject(MediaAttachService);

  readonly mode = signal<MediaLibraryMode>('tenant');
  readonly isPlatform = computed(() => this.mode() === 'platform');

  // Permissions
  readonly canListMedia = computed(() => this.authSession.hasFeature('media.list'));
  readonly canUploadMedia = computed(() => this.authSession.hasFeature('media.upload'));
  readonly canDeleteMedia = computed(() => this.authSession.hasFeature('media.delete'));

  readonly tabs: TabItem[] = [
    { id: 'PRODUCT', label: 'media.tabs.products' },
    { id: 'CATEGORY', label: 'media.tabs.categories' },
    { id: 'PACK', label: 'media.tabs.packs' },
    { id: 'VIDEO', label: 'media.tabs.videos' },
  ];

  readonly loading = signal(false);
  readonly activeTab = signal<MediaLibraryTab>('PRODUCT');
  readonly activeMediaType = computed<MediaType>(() => (this.activeTab() === 'VIDEO' ? 'VIDEO' : 'IMAGE'));
  readonly activePurpose = computed<MediaPurpose | null>(() => {
    const tab = this.activeTab();
    return tab === 'VIDEO' ? null : tab;
  });
  readonly assets = signal<MediaAsset[]>([]);
  readonly page = signal(1);
  readonly limit = signal(20);
  readonly total = signal(0);
  readonly totalPages = signal(0);
  readonly search = signal('');

  // Upload queue (videos) and prepared uploads (images)
  readonly uploadModalOpen = signal(false);
  readonly uploadQueue = signal<QueueItem[]>([]);
  readonly uploadProgress = signal<{ current: number; total: number } | null>(null);
  readonly preparedUploading = signal(false);
  readonly attachTargets = signal<AttachTarget[]>([]);
  readonly dragging = signal(false);
  readonly viewportWidth = signal<number>(window.innerWidth);
  readonly isMobileHeader = computed<boolean>(() => this.viewportWidth() <= 768);
  private nextQueueId = 1;

  readonly pendingCount = computed(() => this.uploadQueue().filter((q) => q.status === 'pending').length);
  readonly isUploading = computed(() => this.uploadProgress() !== null || this.preparedUploading());
  readonly hasInvalidNames = computed(() => this.uploadQueue().some((q) => q.status === 'pending' && !q.name.trim()));

  readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('queueFileInput');
  readonly prepare = viewChild(MediaPrepareComponent);

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

  @HostListener('window:resize')
  onWindowResize(): void {
    this.viewportWidth.set(window.innerWidth);
  }

  private readonly VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
  private readonly VIDEO_MAX_SIZE = 50 * 1024 * 1024;

  readonly uploadAccept = this.VIDEO_TYPES.join(',');

  readonly maxSizeMb = 50;

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
    const purpose = this.activePurpose() ?? undefined;
    const list$ = this.isPlatform()
      ? this.mediaService.listPlatformMedia(this.page(), this.limit(), this.search(), this.activeMediaType(), purpose)
      : this.mediaService.listTenantMedia(this.page(), this.limit(), this.search(), this.activeMediaType(), purpose);

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

  onTabChange(tab: string | number): void {
    const next = tab as MediaLibraryTab;
    if (this.activeTab() === next) {
      return;
    }
    this.activeTab.set(next);
    this.page.set(1);
    this.search.set('');
    this.loadMedia();
  }

  // --- Upload Queue ---

  openUploadModal(): void {
    this.uploadQueue.set([]);
    this.uploadProgress.set(null);
    this.preparedUploading.set(false);
    this.attachTargets.set([]);
    this.prepare()?.reset();
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
    const maxSizeMb = Math.floor(this.VIDEO_MAX_SIZE / (1024 * 1024));

    for (const file of files) {
      if (!this.VIDEO_TYPES.includes(file.type)) {
        invalidType++;
        continue;
      }
      if (file.size > this.VIDEO_MAX_SIZE) {
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
          mediaType: 'VIDEO',
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
      this.toast.error(`${tooLarge} video(s) skipped. Max allowed size is ${maxSizeMb} MB.`);
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
      } catch (error: any) {
        this.setQueueItemStatus(item.id, 'failed');
        failed++;
        
        // Show specific error message from backend (e.g., feature limit errors)
        if (error?.error?.message) {
          this.toast.error(error.error.message);
        } else if (error?.message) {
          this.toast.error(error.message);
        }
      }
    }

    this.uploadProgress.set(null);

    if (failed === 0) {
      this.toast.success(`${succeeded} media file(s) uploaded successfully.`);
      this.uploadModalOpen.set(false);
    } else if (succeeded > 0) {
      this.toast.warning(`${succeeded} uploaded successfully, ${failed} failed. Check error messages above.`);
    }
    // If all failed and we already showed specific error messages, don't show generic message

    this.loadMedia();
    if (this.isPlatform()) {
      this.loadStorageSummary();
    }
  }

  purposeLabel(purpose: MediaPurpose | null): string {
    return purpose ? this.translate.instant(`media.purposes.${purpose}`) : '';
  }

  uploadModalTitle(): string {
    const purpose = this.activePurpose();
    return purpose
      ? this.translate.instant('media.library.uploadTitle', { purpose: this.purposeLabel(purpose) })
      : this.translate.instant(this.modalTitle());
  }

  emptyStateText(): string {
    const purpose = this.activePurpose();
    if (purpose) {
      return this.translate.instant('media.library.emptyPurpose', { purpose: this.purposeLabel(purpose).toLowerCase() });
    }
    return this.translate.instant(this.isPlatform() ? 'media.empty' : 'tenantMedia.empty');
  }

  canUploadPrepared(): boolean {
    const prepare = this.prepare();
    return !!prepare && !prepare.isProcessing() && prepare.readyItems().length > 0 && !this.hasInvalidPreparedNames();
  }

  private hasInvalidPreparedNames(): boolean {
    return (this.prepare()?.readyItems() ?? []).some((item) => !item.nameControl.value.trim());
  }

  async uploadPrepared(): Promise<void> {
    const prepare = this.prepare();
    const purpose = this.activePurpose();
    if (!prepare || !purpose || this.isUploading()) return;
    if (prepare.isProcessing()) {
      this.toast.info(this.translate.instant('media.library.processingWait'));
      return;
    }

    this.preparedUploading.set(true);
    try {
      const result = await this.uploadService.uploadReady(prepare, purpose, this.isPlatform());

      if (result.uploaded.length > 0 && !this.isPlatform() && this.attachTargets().length > 0) {
        await this.attachUploaded(result.uploaded.map((entry) => entry.asset));
      }

      if (result.failed === 0) {
        this.toast.success(this.translate.instant('media.library.uploadSuccess', { count: result.uploaded.length }));
        this.uploadModalOpen.set(false);
      } else if (result.uploaded.length > 0) {
        this.toast.warning(
          this.translate.instant('media.library.uploadSummary', { uploaded: result.uploaded.length, failed: result.failed }),
        );
      }
    } finally {
      this.preparedUploading.set(false);
    }

    this.loadMedia();
    if (this.isPlatform()) {
      this.loadStorageSummary();
    }
  }

  private async attachUploaded(assets: MediaAsset[]): Promise<void> {
    const results: AttachResult[] = await firstValueFrom(this.attachService.attach(assets, this.attachTargets()));
    for (const result of results) {
      if (result.ok) {
        this.toast.success(result.message);
      } else {
        this.toast.warning(result.message);
      }
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
    // Platform mode: can delete any asset
    // Tenant mode: can only delete own assets (not shared platform assets) AND must have delete permission
    if (this.isPlatform()) {
      return true;
    }
    return !this.isSharedAsset(asset) && this.canDeleteMedia();
  }
}
