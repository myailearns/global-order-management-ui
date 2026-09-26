import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthSessionService } from '../../../core/auth/auth-session.service';

export interface BusinessTypeCategory {
  platformCategoryId: string;
  clonedCategoryId: string | null;
  name: string;
  description: string;
  code?: string;
  assignedProducts?: number;
  platformStatus: string;
  enabled: boolean;
  subscriptionStatus: string;
  subscribedAt: string | null;
  unsubscribedAt: string | null;
  clonedCategoryStatus: string | null;
}

export interface BusinessTypeCategoriesResponse {
  businessType: {
    _id: string;
    name: string;
    code: string;
    description: string;
  };
  counts: {
    all: number;
    enabled: number;
    disabled: number;
  };
  items: BusinessTypeCategory[];
}

interface ApiSuccess<T> {
  success: boolean;
  message?: string;
  data: T;
}

@Injectable({ providedIn: 'root' })
export class BusinessTypeCategoriesService {
  private readonly http = inject(HttpClient);
  private readonly authSession = inject(AuthSessionService);
  private readonly baseUrl = `${environment.apiBaseUrl}/tenant-account/business-details`;

  private get tenantHeaders(): Record<string, string> {
    return this.authSession.getTenantHeaders();
  }

  listCategories(businessTypeId: string): Observable<ApiSuccess<BusinessTypeCategoriesResponse>> {
    return this.http.get<ApiSuccess<BusinessTypeCategoriesResponse>>(
      `${this.baseUrl}/setup-profiles/${businessTypeId}/categories`,
      { headers: this.tenantHeaders }
    );
  }

  updateCategory(businessTypeId: string, platformCategoryId: string, payload: { enabled: boolean }): Observable<ApiSuccess<BusinessTypeCategoriesResponse>> {
    return this.http.patch<ApiSuccess<BusinessTypeCategoriesResponse>>(
      `${this.baseUrl}/setup-profiles/${businessTypeId}/categories/${platformCategoryId}`,
      payload,
      { headers: this.tenantHeaders }
    );
  }
}
