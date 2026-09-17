import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import {
  ApiSuccess,
  BillTemplate,
  BillTemplateAssignment,
  BillTemplateConfiguration,
} from './billing-template.models';

@Injectable({ providedIn: 'root' })
export class BillingTemplateService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/billing`;

  listTemplates(): Observable<ApiSuccess<{ templates: BillTemplate[] }>> {
    return this.http.get<ApiSuccess<{ templates: BillTemplate[] }>>(`${this.baseUrl}/templates`);
  }

  initializeTemplates(): Observable<ApiSuccess<{ initialized: boolean; templates: BillTemplate[] }>> {
    return this.http.post<ApiSuccess<{ initialized: boolean; templates: BillTemplate[] }>>(
      `${this.baseUrl}/templates/initialize`,
      {},
    );
  }

  getTemplate(templateId: string): Observable<ApiSuccess<BillTemplate>> {
    return this.http.get<ApiSuccess<BillTemplate>>(`${this.baseUrl}/templates/${encodeURIComponent(templateId)}`);
  }

  updateTemplate(
    templateId: string,
    payload: { name: string; description: string; expectedVersion: number; configuration: BillTemplateConfiguration },
  ): Observable<ApiSuccess<BillTemplate>> {
    return this.http.put<ApiSuccess<BillTemplate>>(
      `${this.baseUrl}/templates/${encodeURIComponent(templateId)}`,
      payload,
    );
  }

  useTemplate(templateId: string): Observable<ApiSuccess<BillTemplate>> {
    return this.http.put<ApiSuccess<BillTemplate>>(
      `${this.baseUrl}/templates/${encodeURIComponent(templateId)}/use`,
      {},
    );
  }

  listAssignments(): Observable<ApiSuccess<{ assignments: BillTemplateAssignment[] }>> {
    return this.http.get<ApiSuccess<{ assignments: BillTemplateAssignment[] }>>(
      `${this.baseUrl}/template-assignments`,
    );
  }

  updateAssignments(assignments: BillTemplateAssignment[]): Observable<ApiSuccess<{ assignments: BillTemplateAssignment[] }>> {
    return this.http.put<ApiSuccess<{ assignments: BillTemplateAssignment[] }>>(
      `${this.baseUrl}/template-assignments`,
      { assignments },
    );
  }
}
