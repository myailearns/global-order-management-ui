import { CommonModule } from '@angular/common';
import { Component, inject, model, OnInit, output, signal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { GomButtonComponent, GomInputComponent, GomModalComponent } from '@gomlibs/ui';
import { MediaAssetService } from '../../../features/saas-platform/media/media-asset.service';
import { MediaAsset } from '../../../features/saas-platform/media/media-asset.model';

@Component({
  selector: 'gom-platform-image-picker',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    GomButtonComponent,
    GomInputComponent,
    GomModalComponent,
  ],
  templateUrl: './platform-image-picker.component.html',
  styleUrl: './platform-image-picker.component.scss',
})
export class PlatformImagePickerComponent implements OnInit {
  readonly show = model<boolean>(false);
  readonly imagesSelected = output<MediaAsset[]>();

  private readonly mediaService = inject(MediaAssetService);

  readonly loading = signal(false);
  readonly assets = signal<MediaAsset[]>([]);
  readonly search = signal('');
  readonly page = signal(1);
  readonly totalPages = signal(0);
  readonly selectedIds = signal<Set<string>>(new Set());

  ngOnInit(): void {
    this.loadImages();
  }

  loadImages(): void {
    this.loading.set(true);
    this.mediaService.listPlatformImages(this.page(), 20, this.search()).subscribe({
      next: (result) => {
        this.assets.set(result.items);
        this.totalPages.set(result.meta.totalPages);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  onSearchChange(value: string): void {
    this.search.set(value);
    this.page.set(1);
    this.loadImages();
  }

  onPageChange(newPage: number): void {
    if (newPage < 1 || newPage > this.totalPages()) return;
    this.page.set(newPage);
    this.loadImages();
  }

  toggleSelect(asset: MediaAsset): void {
    const current = new Set(this.selectedIds());
    if (current.has(asset._id)) {
      current.delete(asset._id);
    } else {
      current.add(asset._id);
    }
    this.selectedIds.set(current);
  }

  isSelected(id: string): boolean {
    return this.selectedIds().has(id);
  }

  confirmSelection(): void {
    const ids = this.selectedIds();
    const selected = this.assets().filter((a) => ids.has(a._id));
    this.imagesSelected.emit(selected);
    this.close();
  }

  close(): void {
    this.show.set(false);
    this.selectedIds.set(new Set());
  }

  onModalClosed(): void {
    this.selectedIds.set(new Set());
  }
}
