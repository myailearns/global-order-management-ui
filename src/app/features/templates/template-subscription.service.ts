import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthSessionService } from '../../core/auth/auth-session.service';

export interface AvailableTemplate {
  _id: string;
  name: string;
  description?: string;
  status: string;
  subscriptionStatus: 'ACTIVE' | 'INACTIVE' | null;
  subscribedAt: string | null;
}

export interface MySubscription {
  _id: string;
  tenantId: string;
  platformCategoryId: { _id: string; name: string; description?: string };
  clonedCategoryId: { _id: string; name: string } | null;
  status: string;
  subscribedAt: string;
}

export interface TemplateCategoryPreview {
  category: { _id: string; name: string; description?: string };
  fields: Array<{ _id: string; name: string; key: string; type: string }>;
  fieldGroups: Array<{
    _id: string;
    name: string;
    fields: Array<{ fieldId: string; fieldName: string; fieldKey: string; order: number }>;
  }>;
  units: Array<{ _id: string; name: string; symbol: string }>;
  summary: { fieldCount: number; fieldGroupCount: number; unitCount: number };
}

export interface BusinessTemplateListItem {
  _id: string;
  name: string;
  code: string;
  description: string;
  icon: string;
  categoryIds: Array<{ _id: string; name: string }>;
  status: string;
}

export interface BusinessTemplatePreviewData {
  template: BusinessTemplateListItem;
  categories: Array<{ _id: string; name: string; description?: string }>;
  fieldGroups: Array<{ _id: string; name: string; fields: Array<{ name: string; key: string; type: string }> }>;
  units: Array<{ _id: string; name: string; symbol: string }>;
  taxProfiles: Array<{ _id: string; name: string; rate: number }>;
  summary: { categoryCount: number; fieldGroupCount: number; unitCount: number; taxProfileCount: number };
}

export interface BusinessSubscribeResult {
  businessTemplate: { _id: string; name: string; code: string };
  totalCategories: number;
  subscribed: number;
  alreadySubscribed: number;
  failed: number;
}

interface ApiSuccess<T> {
  success: boolean;
  message?: string;
  data: T;
}

interface ApiPaginated<T> {
  success: boolean;
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

@Injectable({ providedIn: 'root' })
export class TemplateSubscriptionService {
  private readonly http = inject(HttpClient);
  private readonly authSession = inject(AuthSessionService);
  private readonly baseUrl = `${environment.apiBaseUrl}/tenant/templates`;

  private get tenantHeaders(): Record<string, string> {
    return this.authSession.getTenantHeaders();
  }

  listAvailable(): Observable<ApiPaginated<AvailableTemplate>> {
    return this.http.get<ApiPaginated<AvailableTemplate>>(`${this.baseUrl}/available`, { headers: this.tenantHeaders });
  }

  listMySubscriptions(): Observable<ApiPaginated<MySubscription>> {
    return this.http.get<ApiPaginated<MySubscription>>(`${this.baseUrl}/my`, { headers: this.tenantHeaders });
  }

  previewTemplate(platformCategoryId: string): Observable<ApiSuccess<TemplateCategoryPreview>> {
    return this.http.get<ApiSuccess<TemplateCategoryPreview>>(`${this.baseUrl}/preview/${platformCategoryId}`, { headers: this.tenantHeaders });
  }

  subscribe(platformCategoryId: string): Observable<ApiSuccess<unknown>> {
    return this.http.post<ApiSuccess<unknown>>(`${this.baseUrl}/subscribe`, { platformCategoryId }, { headers: this.tenantHeaders });
  }

  unsubscribe(platformCategoryId: string): Observable<ApiSuccess<unknown>> {
    return this.http.post<ApiSuccess<unknown>>(`${this.baseUrl}/unsubscribe/${platformCategoryId}`, {}, { headers: this.tenantHeaders });
  }

  listBusinessTemplates(): Observable<ApiPaginated<BusinessTemplateListItem>> {
    return this.http.get<ApiPaginated<BusinessTemplateListItem>>(`${this.baseUrl}/business-templates`, { headers: this.tenantHeaders });
  }

  previewBusinessTemplate(id: string): Observable<ApiSuccess<BusinessTemplatePreviewData>> {
    return this.http.get<ApiSuccess<BusinessTemplatePreviewData>>(`${this.baseUrl}/business-templates/${id}/preview`, { headers: this.tenantHeaders });
  }

  subscribeToBusinessTemplate(businessTemplateId: string): Observable<ApiSuccess<BusinessSubscribeResult>> {
    return this.http.post<ApiSuccess<BusinessSubscribeResult>>(
      `${this.baseUrl}/subscribe-business`,
      { businessTemplateId },
      { headers: this.tenantHeaders },
    );
  }
}
