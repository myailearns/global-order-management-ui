import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Observable, catchError, concatMap, from, map, of, toArray } from 'rxjs';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { CategoriesService } from '../../../features/master/categories/categories.service';
import { GroupsService } from '../../../features/product/groups/groups.service';
import { PacksService } from '../../../features/product/packs/packs.service';
import { VariantsService } from '../../../features/product/variants/variants.service';
import { MediaAsset } from '../../../features/saas-platform/media/media-asset.model';
import { MediaAssetService } from '../../../features/saas-platform/media/media-asset.service';
import { MediaPurpose } from '../media-prepare/media-purpose.config';
import { AttachOption, AttachPermissions, AttachResult, AttachTarget, PackImageEntry } from './media-attach.models';

const SEARCH_LIMIT = 100;
const VARIANT_LIMIT = 100;

export function escapeSearchTerm(term: string): string {
  return term.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function toPackImageFormat(format?: string): PackImageEntry['format'] {
  const ext = String(format || '').trim().toLowerCase();
  if (ext === 'png') return 'PNG';
  if (ext === 'webp') return 'WEBP';
  return 'JPEG';
}

@Injectable({ providedIn: 'root' })
export class MediaAttachService {
  private readonly authSession = inject(AuthSessionService);
  private readonly translate = inject(TranslateService);
  private readonly mediaService = inject(MediaAssetService);
  private readonly groupsService = inject(GroupsService);
  private readonly variantsService = inject(VariantsService);
  private readonly categoriesService = inject(CategoriesService);
  private readonly packsService = inject(PacksService);

  permissions(): AttachPermissions {
    const has = (key: string) => this.authSession.hasFeature(key);
    return {
      group: has('group.edit') || has('group.update'),
      variant: has('variant.edit') || has('variant.update'),
      category: has('category.edit'),
      pack: has('pack.edit') || has('pack.update'),
    };
  }

  canAttach(purpose: MediaPurpose): boolean {
    const permissions = this.permissions();
    if (purpose === 'PRODUCT') return permissions.group || permissions.variant;
    if (purpose === 'CATEGORY') return permissions.category;
    return permissions.pack;
  }

  searchGroups(term: string): Observable<AttachOption[]> {
    return this.groupsService
      .listGroups({ page: 1, limit: SEARCH_LIMIT, search: escapeSearchTerm(term) || undefined })
      .pipe(map((res) => res.data.map((group) => ({ value: group._id, label: group.name }))));
  }

  listVariants(groupId: string): Observable<AttachOption[]> {
    return this.variantsService
      .listVariants(groupId, 1, VARIANT_LIMIT)
      .pipe(map((res) => res.data.map((variant) => ({ value: variant._id, label: variant.name }))));
  }

  searchCategories(term: string): Observable<AttachOption[]> {
    return this.categoriesService
      .getCategories(1, SEARCH_LIMIT, undefined, escapeSearchTerm(term) || undefined)
      .pipe(map((res) => res.data.map((category) => ({ value: category._id ?? '', label: category.name }))));
  }

  searchPacks(term: string): Observable<AttachOption[]> {
    return this.packsService
      .listPacks({ page: 1, limit: SEARCH_LIMIT, search: escapeSearchTerm(term) || undefined })
      .pipe(
        map((res) =>
          res.data.map((pack) => ({
            value: pack._id,
            label: pack.name,
            images: (pack.images ?? []).map((image) => ({
              url: image.url,
              mediaType: image.mediaType,
              thumbnailUrl: image.thumbnailUrl,
              format: toPackImageFormat(image.format),
            })),
          })),
        ),
      );
  }

  attach(assets: MediaAsset[], targets: AttachTarget[]): Observable<AttachResult[]> {
    if (assets.length === 0 || targets.length === 0) {
      return of([]);
    }

    return from(targets).pipe(
      concatMap((target) =>
        this.attachToTarget(assets, target).pipe(
          map((): AttachResult => ({ target, ok: true, message: this.successMessage(target, assets) })),
          catchError((error: unknown) =>
            of<AttachResult>({
              target,
              ok: false,
              message: this.translate.instant('media.attach.failed', {
                target: target.name,
                reason: this.errorReason(error),
              }),
            }),
          ),
        ),
      ),
      toArray(),
    );
  }

  private attachToTarget(assets: MediaAsset[], target: AttachTarget): Observable<unknown> {
    const entries = assets.map((asset, index) => ({ mediaAssetId: asset._id, source: 'TENANT' as const, sortOrder: index }));

    switch (target.kind) {
      case 'GROUP':
        return this.mediaService.attachGroupImages(target.id, entries);
      case 'VARIANT':
        return this.mediaService.attachVariantImages(target.id, entries);
      case 'CATEGORY':
        return this.categoriesService.updateCategory(target.id, {
          name: target.name,
          imageAssetId: assets[0]._id,
          imageUrl: assets[0].url,
        });
      case 'PACK':
        return this.packsService.updatePackImages(target.id, [
          ...target.images,
          ...assets.map((asset): PackImageEntry => ({
            url: asset.url,
            mediaType: 'IMAGE',
            format: toPackImageFormat(asset.format),
          })),
        ]);
    }
  }

  private successMessage(target: AttachTarget, assets: MediaAsset[]): string {
    const message = this.translate.instant('media.attach.attached', { target: target.name });
    if (target.kind === 'CATEGORY' && assets.length > 1) {
      return `${message} ${this.translate.instant('media.attach.categorySingle')}`;
    }
    return message;
  }

  private errorReason(error: unknown): string {
    const failure = error as { error?: { message?: string }; message?: string } | null;
    return failure?.error?.message || failure?.message || this.translate.instant('media.prepare.status.failed');
  }
}
