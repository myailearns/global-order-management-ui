import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import {
  Offer,
  CreateOfferRequest,
  UpdateOfferRequest,
  OfferListFilter,
  OfferProgramSettings,
  ApiResponse,
  ApiListResponse,
} from '../models';

@Injectable({
  providedIn: 'root',
})
export class OfferService {
  private readonly http = inject(HttpClient);
  private readonly authSession = inject(AuthSessionService);
  private readonly apiBaseUrl = `${environment.apiBaseUrl}/offers`;

  private buildTenantHeaders(): Record<string, string> {
    return this.authSession.getTenantHeaders();
  }

  /**
   * List all offers for the applied tenant with filtering/sorting
   */
  listOffers(filter?: OfferListFilter): Observable<Offer[]> {
    const params = this.buildOfferListParams(filter);

    return this.http
      .get<ApiListResponse<Offer>>(this.apiBaseUrl, {
        headers: this.buildTenantHeaders(),
        params,
      })
      .pipe(map((res) => res.data));
  }

  private buildOfferListParams(filter?: OfferListFilter): HttpParams {
    let params = new HttpParams();
    if (!filter) {
      return params;
    }

    const entries: Array<[string, string | number | undefined]> = [
      ['status', filter.status],
      ['type', filter.type],
      ['triggerType', filter.triggerType],
      ['search', filter.search],
      ['page', filter.page],
      ['limit', filter.limit],
      ['sortBy', filter.sortBy],
      ['sortOrder', filter.sortOrder],
    ];

    for (const [key, value] of entries) {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    }

    return params;
  }

  /**
   * Get a single offer by ID
   */
  getOffer(offerId: string): Observable<Offer> {
    return this.http
      .get<ApiResponse<Offer>>(`${this.apiBaseUrl}/${offerId}`, {
        headers: this.buildTenantHeaders(),
      })
      .pipe(map((res) => res.data));
  }

  /**
   * Create a new offer
   */
  createOffer(request: CreateOfferRequest): Observable<Offer> {
    return this.http
      .post<ApiResponse<Offer>>(this.apiBaseUrl, request, {
        headers: this.buildTenantHeaders(),
      })
      .pipe(map((res) => res.data));
  }

  /**
   * Update an existing offer
   */
  updateOffer(offerId: string, request: UpdateOfferRequest): Observable<Offer> {
    return this.http
      .put<ApiResponse<Offer>>(`${this.apiBaseUrl}/${offerId}`, request, {
        headers: this.buildTenantHeaders(),
      })
      .pipe(map((res) => res.data));
  }

  /**
   * Delete an offer
   */
  deleteOffer(offerId: string): Observable<{ message: string }> {
    return this.http
      .delete<ApiResponse<{ message: string }>>(`${this.apiBaseUrl}/${offerId}`, {
        headers: this.buildTenantHeaders(),
      })
      .pipe(map((res) => res.data));
  }

  pauseOffer(offerId: string): Observable<Offer> {
    return this.http
      .post<ApiResponse<Offer>>(`${this.apiBaseUrl}/${offerId}/pause`, {}, {
        headers: this.buildTenantHeaders(),
      })
      .pipe(map((res) => res.data));
  }

  resumeOffer(offerId: string): Observable<Offer> {
    return this.http
      .post<ApiResponse<Offer>>(`${this.apiBaseUrl}/${offerId}/resume`, {}, {
        headers: this.buildTenantHeaders(),
      })
      .pipe(map((res) => res.data));
  }

  activateOffer(offerId: string): Observable<Offer> {
    return this.http
      .post<ApiResponse<Offer>>(`${this.apiBaseUrl}/${offerId}/activate`, {}, {
        headers: this.buildTenantHeaders(),
      })
      .pipe(map((res) => res.data));
  }

  saveDraft(offerId: string): Observable<Offer> {
    return this.http
      .post<ApiResponse<Offer>>(`${this.apiBaseUrl}/${offerId}/draft`, {}, {
        headers: this.buildTenantHeaders(),
      })
      .pipe(map((res) => res.data));
  }

  duplicateOffer(offerId: string): Observable<Offer> {
    return this.http
      .post<ApiResponse<Offer>>(`${this.apiBaseUrl}/${offerId}/duplicate`, {}, {
        headers: this.buildTenantHeaders(),
      })
      .pipe(map((res) => res.data));
  }

  getProgramSettings(): Observable<OfferProgramSettings> {
    return this.http
      .get<ApiResponse<OfferProgramSettings>>(`${this.apiBaseUrl}/settings`, {
        headers: this.buildTenantHeaders(),
      })
      .pipe(map((res) => res.data));
  }

  updateProgramSettings(settings: OfferProgramSettings): Observable<OfferProgramSettings> {
    return this.http
      .put<ApiResponse<OfferProgramSettings>>(`${this.apiBaseUrl}/settings`, settings, {
        headers: this.buildTenantHeaders(),
      })
      .pipe(map((res) => res.data));
  }
}
