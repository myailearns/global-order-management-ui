import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import {
  MediaAsset,
  MediaAssetListResponse,
  MediaAssetResponse,
  MediaUsageDetail,
  MediaUsageResponse,
  StorageSummary,
  StorageSummaryResponse,
  GroupImage,
  GroupImageEntry,
  GroupImagesResponse,
} from './media-asset.model';

@Injectable({ providedIn: 'root' })
export class MediaAssetService {
  private readonly http = inject(HttpClient);
  private readonly authSession = inject(AuthSessionService);
  private readonly platformBaseUrl = `${environment.apiBaseUrl}/platform/templates/media`;
  private readonly tenantMediaUrl = `${environment.apiBaseUrl}/media`;
  private readonly groupsUrl = `${environment.apiBaseUrl}/groups`;

  private get platformHeaders(): HttpHeaders {
    return new HttpHeaders(this.authSession.getPlatformHeaders());
  }

  // --- Platform Admin Media ---

  uploadPlatformMedia(file: File, name: string): Observable<MediaAsset> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', name);
    return this.http
      .post<MediaAssetResponse>(this.platformBaseUrl + '/upload', formData, { headers: this.platformHeaders })
      .pipe(map((res) => res.data));
  }

  listPlatformMedia(page = 1, limit = 20, search = ''): Observable<{ items: MediaAsset[]; meta: MediaAssetListResponse['meta'] }> {
    let params = new HttpParams().set('page', String(page)).set('limit', String(limit));
    if (search) {
      params = params.set('search', search);
    }
    return this.http
      .get<MediaAssetListResponse>(this.platformBaseUrl, { headers: this.platformHeaders, params })
      .pipe(map((res) => ({ items: res.data, meta: res.meta })));
  }

  getPlatformMediaById(id: string): Observable<MediaAsset> {
    return this.http
      .get<MediaAssetResponse>(`${this.platformBaseUrl}/${id}`, { headers: this.platformHeaders })
      .pipe(map((res) => res.data));
  }

  deletePlatformMedia(id: string): Observable<void> {
    return this.http
      .delete<{ success: boolean }>(`${this.platformBaseUrl}/${id}`, { headers: this.platformHeaders })
      .pipe(map(() => undefined));
  }

  getPlatformMediaUsage(id: string): Observable<MediaUsageDetail> {
    return this.http
      .get<MediaUsageResponse>(`${this.platformBaseUrl}/${id}/usage`, { headers: this.platformHeaders })
      .pipe(map((res) => res.data));
  }

  getStorageSummary(): Observable<StorageSummary> {
    return this.http
      .get<StorageSummaryResponse>(`${this.platformBaseUrl}/storage-summary`, { headers: this.platformHeaders })
      .pipe(map((res) => res.data));
  }

  // --- Tenant Media ---

  uploadTenantMedia(file: File, name: string): Observable<MediaAsset> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', name);
    return this.http
      .post<MediaAssetResponse>(this.tenantMediaUrl + '/upload', formData)
      .pipe(map((res) => res.data));
  }

  listTenantMedia(page = 1, limit = 20, search = ''): Observable<{ items: MediaAsset[]; meta: MediaAssetListResponse['meta'] }> {
    let params = new HttpParams().set('page', String(page)).set('limit', String(limit));
    if (search) {
      params = params.set('search', search);
    }
    return this.http
      .get<MediaAssetListResponse>(this.tenantMediaUrl, { params })
      .pipe(map((res) => ({ items: res.data, meta: res.meta })));
  }

  deleteTenantMedia(id: string): Observable<void> {
    return this.http
      .delete<{ success: boolean }>(`${this.tenantMediaUrl}/${id}`)
      .pipe(map(() => undefined));
  }

  // --- Tenant: Platform Images Picker ---

  listPlatformImages(page = 1, limit = 20, search = ''): Observable<{ items: MediaAsset[]; meta: MediaAssetListResponse['meta'] }> {
    let params = new HttpParams().set('page', String(page)).set('limit', String(limit));
    if (search) {
      params = params.set('search', search);
    }
    return this.http
      .get<MediaAssetListResponse>(this.tenantMediaUrl + '/platform', { params })
      .pipe(map((res) => ({ items: res.data, meta: res.meta })));
  }

  // --- Group Images ---

  getGroupImages(groupId: string): Observable<GroupImage[]> {
    return this.http
      .get<GroupImagesResponse>(`${this.groupsUrl}/${groupId}/images`)
      .pipe(map((res) => res.data));
  }

  attachGroupImages(groupId: string, add: GroupImageEntry[]): Observable<void> {
    return this.http
      .patch<{ success: boolean }>(`${this.groupsUrl}/${groupId}/images/attach`, { add })
      .pipe(map(() => undefined));
  }

  detachGroupImages(groupId: string, remove: string[]): Observable<void> {
    return this.http
      .patch<{ success: boolean }>(`${this.groupsUrl}/${groupId}/images/detach`, { remove })
      .pipe(map(() => undefined));
  }
}
