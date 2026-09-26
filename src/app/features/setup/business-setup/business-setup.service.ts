import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';

export interface BusinessSetupSection {
  key: 'categories' | 'fields' | 'field-groups' | 'units' | 'tax-profiles';
  label: string;
  count: number;
}

export interface BusinessSetupCategory {
  _id: string;
  name: string;
  description: string;
  status: string;
}

export interface TenantBusinessSetupProfile {
  id: string;
  businessTypeId: string | null;
  name: string;
  code: string;
  description: string;
  icon: string;
  businessCategories: BusinessSetupCategory[];
  businessCategoryLabel: string;
  setupStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'ACTIVE';
  completionPercent: number;
  isPrimary: boolean;
  source: 'assigned' | 'legacy';
  configuredSectionCount: number;
  configuredItemCount: number;
  sections: BusinessSetupSection[];
}

export interface TenantBusinessSetupSummary {
  tenant: {
    accountId: string;
    tenantCode: string;
    accountName: string;
    primaryBusinessType: string;
    completed: boolean;
    completedAt: string | null;
    accountStatus: string;
  };
  items: TenantBusinessSetupProfile[];
}

export interface ApiSuccess<T> {
  success: boolean;
  message?: string;
  data: T;
}

@Injectable({ providedIn: 'root' })
export class BusinessSetupService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiBaseUrl}/tenant-account/business-details/setup-profiles`;

  listProfiles(): Observable<ApiSuccess<TenantBusinessSetupSummary>> {
    return this.http.get<ApiSuccess<TenantBusinessSetupSummary>>(this.url);
  }
}