import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';

export type NotificationChannel = 'IN_APP' | 'PUSH' | 'EMAIL';
export type TemplateStatus = 'ACTIVE' | 'INACTIVE';
export type RecipientType = 'Customer' | 'Staff';

export interface NotificationTemplateDto {
  id: string;
  templateName: string;
  eventCode: string;
  eventLabel: string;
  channel: NotificationChannel;
  recipientType: RecipientType;
  status: TemplateStatus;
  subject: string;
  body: string;
  systemTemplate: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ApiSuccess<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface NotificationTemplateUpsertPayload {
  templateName: string;
  eventCode: string;
  eventLabel: string;
  channel: NotificationChannel;
  recipientType: RecipientType;
  status: TemplateStatus;
  subject: string;
  body: string;
}

export interface NotificationRecipientRoleOption {
  id: string;
  roleKey: string;
  name: string;
}

export interface NotificationRecipientUserOption {
  id: string;
  fullName: string;
  email: string;
}

export interface NotificationRecipientOptionsDto {
  roles: NotificationRecipientRoleOption[];
  users: NotificationRecipientUserOption[];
  roleUserIdsByRoleId?: Record<string, string[]>;
}

export interface NotificationRecipientConfigDto {
  eventCode: string;
  includeCustomer: boolean;
  includeAllActiveUsers: boolean;
  roleIds: string[];
  userIds: string[];
  updatedAt?: string | null;
}

export interface NotificationRecipientConfigPayload {
  includeCustomer: boolean;
  includeAllActiveUsers: boolean;
  roleIds: string[];
  userIds: string[];
}

@Injectable({ providedIn: 'root' })
export class NotificationTemplateService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/notification-templates`;

  listTemplates(): Observable<ApiSuccess<{ templates: NotificationTemplateDto[] }>> {
    return this.http.get<ApiSuccess<{ templates: NotificationTemplateDto[] }>>(this.baseUrl);
  }

  initializeDefaults(): Observable<ApiSuccess<{ initialized: boolean; templates: NotificationTemplateDto[] }>> {
    return this.http.post<ApiSuccess<{ initialized: boolean; templates: NotificationTemplateDto[] }>>(
      `${this.baseUrl}/initialize-defaults`,
      {},
    );
  }

  createTemplate(payload: NotificationTemplateUpsertPayload): Observable<ApiSuccess<NotificationTemplateDto>> {
    return this.http.post<ApiSuccess<NotificationTemplateDto>>(this.baseUrl, payload);
  }

  updateTemplate(templateId: string, payload: NotificationTemplateUpsertPayload): Observable<ApiSuccess<NotificationTemplateDto>> {
    return this.http.put<ApiSuccess<NotificationTemplateDto>>(
      `${this.baseUrl}/${encodeURIComponent(templateId)}`,
      payload,
    );
  }

  listRecipientOptions(): Observable<ApiSuccess<NotificationRecipientOptionsDto>> {
    return this.http.get<ApiSuccess<NotificationRecipientOptionsDto>>(
      `${this.baseUrl}/recipient-options`,
    );
  }

  getRecipientConfig(eventCode: string): Observable<ApiSuccess<NotificationRecipientConfigDto>> {
    return this.http.get<ApiSuccess<NotificationRecipientConfigDto>>(
      `${this.baseUrl}/recipient-config/${encodeURIComponent(eventCode)}`,
    );
  }

  saveRecipientConfig(eventCode: string, payload: NotificationRecipientConfigPayload): Observable<ApiSuccess<NotificationRecipientConfigDto>> {
    return this.http.put<ApiSuccess<NotificationRecipientConfigDto>>(
      `${this.baseUrl}/recipient-config/${encodeURIComponent(eventCode)}`,
      payload,
    );
  }
}