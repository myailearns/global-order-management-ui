import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthSessionService } from '../../../core/auth/auth-session.service';

export interface BusinessTypeField {
  platformFieldId: string;
  clonedFieldId: string | null;
  name: string;
  key: string;
  type: 'NUMBER' | 'PERCENTAGE' | 'TEXT' | 'LONG_TEXT';
  fieldKind: 'PRICING' | 'METADATA';
  isRequired: boolean;
  platformStatus: string;
  enabled: boolean;
  subscriptionStatus: string;
  enabledAt: string | null;
  disabledAt: string | null;
  clonedFieldStatus: string | null;
}

export interface BusinessTypeFieldsResponse {
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
  items: BusinessTypeField[];
}

interface ApiSuccess<T> {
  success: boolean;
  message?: string;
  data: T;
}

@Injectable({ providedIn: 'root' })
export class BusinessTypeFieldsService {
  private readonly http = inject(HttpClient);
  private readonly authSession = inject(AuthSessionService);
  private readonly baseUrl = `${environment.apiBaseUrl}/tenant-account/business-details`;

  private get tenantHeaders(): Record<string, string> {
    return this.authSession.getTenantHeaders();
  }

  listFields(businessTypeId: string): Observable<ApiSuccess<BusinessTypeFieldsResponse>> {
    return this.http.get<ApiSuccess<BusinessTypeFieldsResponse>>(
      `${this.baseUrl}/setup-profiles/${businessTypeId}/fields`,
      { headers: this.tenantHeaders },
    );
  }

  updateField(
    businessTypeId: string,
    platformFieldId: string,
    payload: { enabled: boolean },
  ): Observable<ApiSuccess<BusinessTypeFieldsResponse>> {
    return this.http.patch<ApiSuccess<BusinessTypeFieldsResponse>>(
      `${this.baseUrl}/setup-profiles/${businessTypeId}/fields/${platformFieldId}`,
      payload,
      { headers: this.tenantHeaders },
    );
  }
}
