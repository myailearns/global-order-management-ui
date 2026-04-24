import { CommonModule } from '@angular/common';
import { Component, computed, inject, input, model, output, signal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { GomButtonComponent, GomInputComponent, GomModalComponent } from '@gomlibs/ui';
import { MediaAssetService } from '../../../features/saas-platform/media/media-asset.service';
import { MediaAsset } from '../../../features/saas-platform/media/media-asset.model';
import { ImageUploadComponent } from '../image-upload/image-upload.component';

export interface PickedImage {
  asset: MediaAsset;
  source: 'PLATFORM' | 'TENANT';
}

@Component({
  selector: 'gom-image-picker',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    GomButtonComponent,
    GomInputComponent,
    GomModalComponent,
    ImageUploadComponent,
  ],
  templateUrl: './image-picker.component.html',
  styleUrl: './image-picker.component.scss',
})
export class ImagePickerComponent {
  readonly show = model<boolean>(false);
  readonly existingImageIds = input<Set<string>>(new Set());
  readonly canUpload = input<boolean>(false);
  readonly maxImages = input<number>(10);

  readonly imagesSelected = output<PickedImage[]>();

  private readonly mediaService = inject(MediaAssetService);

  // --- State ---
  readonly loading = signal(false);
  readonly search = signal('');
  readonly selectedIds = signal<Set<string>>(new Set());
  readonly uploadPanelOpen = signal(false);
  readonly uploading = signal(false);

  // Tenant images
  readonly tenantAssets = signal<MediaAsset[]>([]);
  readonly tenantPage = signal(1);
  readonly tenantTotalPages = signal(0);
  readonly tenantLoading = signal(false);

  // Platform images
  readonly platformAssets = signal<MediaAsset[]>([]);
  readonly platformPage = signal(1);
  readonly platformTotalPages = signal(0);
  readonly platformLoading = signal(false);

  readonly selectionCount = computed(() => this.selectedIds().size);
  readonly maxUploadFiles = computed(() => this.maxImages() - this.existingImageIds().size - this.selectedIds().size);

  // Track source per asset for selection
  private assetSourceMap = new Map<string, 'PLATFORM' | 'TENANT'>();

  loadAll(): void {
    this.loadTenantImages();
    this.loadPlatformImages();
  }

  loadTenantImages(): void {
    if (!this.canUpload()) return;
    this.tenantLoading.set(true);
    this.mediaService.listTenantMedia(this.tenantPage(), 20, this.search()).subscribe({
      next: (result) => {
        this.tenantAssets.set(result.items);
        this.tenantTotalPages.set(result.meta.totalPages);
        result.items.forEach((a) => this.assetSourceMap.set(a._id, 'TENANT'));
        this.tenantLoading.set(false);
      },
      error: () => this.tenantLoading.set(false),
    });
  }

  loadPlatformImages(): void {
    this.platformLoading.set(true);
    this.mediaService.listPlatformImages(this.platformPage(), 20, this.search()).subscribe({
      next: (result) => {
        this.platformAssets.set(result.items);
        this.platformTotalPages.set(result.meta.totalPages);
        result.items.forEach((a) => this.assetSourceMap.set(a._id, 'PLATFORM'));
        this.platformLoading.set(false);
      },
      error: () => this.platformLoading.set(false),
    });
  }

  onSearchChange(value: string): void {
    this.search.set(value);
    this.tenantPage.set(1);
    this.platformPage.set(1);
    this.loadAll();
  }

  onTenantPageChange(page: number): void {
    if (page < 1 || page > this.tenantTotalPages()) return;
    this.tenantPage.set(page);
    this.loadTenantImages();
  }

  onPlatformPageChange(page: number): void {
    if (page < 1 || page > this.platformTotalPages()) return;
    this.platformPage.set(page);
    this.loadPlatformImages();
  }

  isAlreadyAdded(id: string): boolean {
    return this.existingImageIds().has(id);
  }

  isSelected(id: string): boolean {
    return this.selectedIds().has(id);
  }

  toggleSelect(asset: MediaAsset): void {
    if (this.isAlreadyAdded(asset._id)) return;
    const current = new Set(this.selectedIds());
    if (current.has(asset._id)) {
      current.delete(asset._id);
    } else {
      current.add(asset._id);
    }
    this.selectedIds.set(current);
  }

  toggleUploadPanel(): void {
    this.uploadPanelOpen.update((v) => !v);
  }

  onFilesUploaded(files: File[]): void {
    if (files.length === 0) return;
    this.uploading.set(true);
    let completed = 0;
    let failed = 0;
    const uploaded: MediaAsset[] = [];

    for (const file of files) {
      const name = file.name.replace(/\.[^/.]+$/, '');
      this.mediaService.uploadTenantMedia(file, name).subscribe({
        next: (asset) => {
          uploaded.push(asset);
          this.assetSourceMap.set(asset._id, 'TENANT');
          completed++;
          if (completed + failed === files.length) {
            this.onUploadBatchDone(uploaded, failed);
          }
        },
        error: () => {
          failed++;
          if (completed + failed === files.length) {
            this.onUploadBatchDone(uploaded, failed);
          }
        },
      });
    }
  }

  private onUploadBatchDone(uploaded: MediaAsset[], failed: number): void {
    this.uploading.set(false);
    this.uploadPanelOpen.set(false);
    // Auto-select newly uploaded images
    const current = new Set(this.selectedIds());
    uploaded.forEach((a) => current.add(a._id));
    this.selectedIds.set(current);
    // Refresh tenant list to show new uploads
    this.tenantPage.set(1);
    this.loadTenantImages();
  }

  confirmSelection(): void {
    const ids = this.selectedIds();
    const allAssets = [...this.tenantAssets(), ...this.platformAssets()];
    const picked: PickedImage[] = [];

    for (const asset of allAssets) {
      if (ids.has(asset._id)) {
        picked.push({
          asset,
          source: this.assetSourceMap.get(asset._id) ?? 'PLATFORM',
        });
      }
    }

    this.imagesSelected.emit(picked);
    this.close();
  }

  close(): void {
    this.show.set(false);
    this.reset();
  }

  onModalOpened(): void {
    this.reset();
    this.loadAll();
  }

  onModalClosed(): void {
    this.reset();
  }

  private reset(): void {
    this.selectedIds.set(new Set());
    this.uploadPanelOpen.set(false);
    this.search.set('');
    this.tenantPage.set(1);
    this.platformPage.set(1);
  }
}
