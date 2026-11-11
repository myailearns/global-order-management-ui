import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { ApiSuccess } from '../../product/stock/stock.service';
import { SalesReport, SalesReportParams } from './sales-report.models';

@Injectable({ providedIn: 'root' })
export class SalesReportService {
  private readonly http = inject(HttpClient);
  private readonly authSession = inject(AuthSessionService);
  private readonly baseUrl = `${environment.apiBaseUrl}/reports/sales`;

  getReport(params: SalesReportParams): Observable<SalesReport> {
    return this.http
      .get<ApiSuccess<SalesReport>>(`${this.baseUrl}/groups`, {
        params: this.toHttpParams(params),
        headers: this.authSession.getTenantHeaders(),
      })
      .pipe(map((response) => response.data));
  }

  exportReport(params: SalesReportParams): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/export`, {
      params: this.toHttpParams(params),
      headers: this.authSession.getTenantHeaders(),
      responseType: 'blob',
    });
  }

  private toHttpParams(params: SalesReportParams): HttpParams {
    let httpParams = new HttpParams().set('from', params.from).set('to', params.to).set('timezone', params.timezone);
    if (params.categoryId) {
      httpParams = httpParams.set('categoryId', params.categoryId);
    }
    if (params.search) {
      httpParams = httpParams.set('search', params.search);
    }
    return httpParams;
  }
}
