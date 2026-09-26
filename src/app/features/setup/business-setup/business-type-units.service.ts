import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthSessionService } from '../../../core/auth/auth-session.service';

export interface BusinessTypeUnit {
  platformUnitId: string;
  clonedUnitId: string | null;
  name: string;
  symbol: string;
  baseUnitName: string;
  baseUnitSymbol: string;
  conversionFactor: number;
  platformStatus: string;
  enabled: boolean;
  subscriptionStatus: string;
  enabledAt: string | null;
  disabledAt: string | null;
  clonedUnitStatus: string | null;
}

export interface BusinessTypeUnitsResponse {
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
  items: BusinessTypeUnit[];
}

interface ApiSuccess<T> {
  success: boolean;
  message?: string;
  data: T;
}

@Injectable({ providedIn: 'root' })
export class BusinessTypeUnitsService {
  private readonly http = inject(HttpClient);
  private readonly authSession = inject(AuthSessionService);
  private readonly baseUrl = `${environment.apiBaseUrl}/tenant-account/business-details`;

  private get tenantHeaders(): Record<string, string> {
    return this.authSession.getTenantHeaders();
  }

  listUnits(businessTypeId: string): Observable<ApiSuccess<BusinessTypeUnitsResponse>> {
    return this.http.get<ApiSuccess<BusinessTypeUnitsResponse>>(
      `${this.baseUrl}/setup-profiles/${businessTypeId}/units`,
      { headers: this.tenantHeaders },
    );
  }

  updateUnit(
    businessTypeId: string,
    platformUnitId: string,
    payload: { enabled: boolean },
  ): Observable<ApiSuccess<BusinessTypeUnitsResponse>> {
    return this.http.patch<ApiSuccess<BusinessTypeUnitsResponse>>(
      `${this.baseUrl}/setup-profiles/${businessTypeId}/units/${platformUnitId}`,
      payload,
      { headers: this.tenantHeaders },
    );
  }
}
