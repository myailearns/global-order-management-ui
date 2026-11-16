import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { GomAlertToastService } from '@gomlibs/ui';
import { MediaAsset } from '../../../features/saas-platform/media/media-asset.model';
import { MediaAssetService } from '../../../features/saas-platform/media/media-asset.service';
import type { MediaPrepareComponent } from './media-prepare.component';
import { MediaPurpose } from './media-purpose.config';

export interface UploadedItem {
  itemId: number;
  asset: MediaAsset;
}

export interface UploadBatchResult {
  uploaded: UploadedItem[];
  failed: number;
  limitReached: boolean;
}

interface ApiFailure {
  error?: { message?: string; errorCode?: string };
  message?: string;
}

const FEATURE_LIMIT_ERROR_CODE = 'FEATURE_LIMIT_EXCEEDED';

@Injectable({ providedIn: 'root' })
export class MediaUploadService {
  private readonly mediaService = inject(MediaAssetService);
  private readonly toast = inject(GomAlertToastService);
  private readonly translate = inject(TranslateService);

  /**
   * Uploads every ready item of the prepare component one by one. The API still enforces the
   * media.upload feature and the plan library limit; on a limit error the remaining files are not sent.
   */
  async uploadReady(prepare: MediaPrepareComponent, purpose: MediaPurpose, platform: boolean): Promise<UploadBatchResult> {
    const pending = prepare.readyItems();
    const uploaded: UploadedItem[] = [];
    let failed = 0;
    let limitReached = false;

    for (const item of pending) {
      if (limitReached) {
        failed++;
        prepare.setUploadStatus(item.id, 'failed', this.translate.instant('media.library.limitStopped'));
        continue;
      }

      const file = item.result?.file;
      if (!file) {
        failed++;
        continue;
      }

      const name = item.nameControl.value.trim() || file.name.replace(/\.[^/.]+$/, '');
      prepare.setUploadStatus(item.id, 'uploading');

      try {
        const asset = await firstValueFrom(
          platform
            ? this.mediaService.uploadPlatformMedia(file, name, purpose)
            : this.mediaService.uploadTenantMedia(file, name, purpose),
        );
        uploaded.push({ itemId: item.id, asset });
        prepare.setUploadStatus(item.id, 'done');
      } catch (error) {
        const failure = error as ApiFailure;
        const message = failure?.error?.message || failure?.message || '';
        failed++;
        prepare.setUploadStatus(item.id, 'failed', message);
        if (failure?.error?.errorCode === FEATURE_LIMIT_ERROR_CODE) {
          limitReached = true;
          this.toast.error(message);
        }
      }
    }

    return { uploaded, failed, limitReached };
  }
}
