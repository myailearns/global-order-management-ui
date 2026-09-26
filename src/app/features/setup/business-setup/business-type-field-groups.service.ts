import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthSessionService } from '../../../core/auth/auth-session.service';

export interface BusinessTypeFieldGroup {
  platformFieldGroupId: string;
  clonedFieldGroupId: string | null;
  name: string;
  version: number;
  fieldsCount: number;
  platformStatus: string;
  enabled: boolean;
  subscriptionStatus: string;
  enabledAt: string | null;
  disabledAt: string | null;
  clonedFieldGroupStatus: string | null;
}

export interface BusinessTypeFieldGroupsResponse {
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
  items: BusinessTypeFieldGroup[];
}

interface ApiSuccess<T> {
  success: boolean;
  message?: string;
  data: T;
}

@Injectable({ providedIn: 'root' })
export class BusinessTypeFieldGroupsService {
  private readonly http = inject(HttpClient);
  private readonly authSession = inject(AuthSessionService);
  private readonly baseUrl = `${environment.apiBaseUrl}/tenant-account/business-details`;

  private get tenantHeaders(): Record<string, string> {
    return this.authSession.getTenantHeaders();
  }

  listFieldGroups(businessTypeId: string): Observable<ApiSuccess<BusinessTypeFieldGroupsResponse>> {
    return this.http.get<ApiSuccess<BusinessTypeFieldGroupsResponse>>(
      `${this.baseUrl}/setup-profiles/${businessTypeId}/field-groups`,
      { headers: this.tenantHeaders },
    );
  }

  updateFieldGroup(
    businessTypeId: string,
    platformFieldGroupId: string,
    payload: { enabled: boolean },
  ): Observable<ApiSuccess<BusinessTypeFieldGroupsResponse>> {
    return this.http.patch<ApiSuccess<BusinessTypeFieldGroupsResponse>>(
      `${this.baseUrl}/setup-profiles/${businessTypeId}/field-groups/${platformFieldGroupId}`,
      payload,
      { headers: this.tenantHeaders },
    );
  }
}
