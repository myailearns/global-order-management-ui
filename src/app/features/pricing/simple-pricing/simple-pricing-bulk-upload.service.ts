import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';

export interface SimplePricingBulkJobStatus {
  jobId: string;
  status: 'QUEUED' | 'VALIDATING' | 'PROCESSING' | 'CANCELLING' | 'CANCELLED' | 'COMPLETED' | 'COMPLETED_WITH_ERRORS' | 'FAILED';
  isTerminal: boolean;
  totals: {
    totalRows: number;
    processedRows: number;
    successRows: number;
    failedRows: number;
    unresolvedRows: number;
  };
  startedAt: string | null;
  completedAt: string | null;
  errorMessage: string;
  feedbackAcknowledged?: boolean;
  cancelRequested?: boolean;
  cancelReason?: string;
}

export interface SimplePricingBulkAttentionJob {
  hasAttention: boolean;
  reason: 'PROCESSING' | 'REVIEW' | 'NONE';
  job: SimplePricingBulkJobStatus | null;
  jobs?: SimplePricingBulkJobStatus[];
}

export interface SimplePricingBulkHistoryItem {
  jobId: string;
  status: SimplePricingBulkJobStatus['status'];
  uploadedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  durationMs: number;
  durationLabel: string;
  totals: {
    totalRows: number;
    processedRows: number;
    successRows: number;
    failedRows: number;
    unresolvedRows: number;
  };
  feedbackAcknowledged: boolean;
  cancelRequested: boolean;
  cancelReason: string;
}

export interface SimplePricingBulkHistoryResponse {
  data: SimplePricingBulkHistoryItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
}

export interface SimplePricingBulkFailedRow {
  rowId: string;
  rowNumber: number;
  item: string;
  entityType: 'GROUP' | 'VARIANT';
  resultType: 'INVALID' | 'NOT_FOUND' | 'SYSTEM_ERROR' | 'CANCELED';
  resolved: boolean;
  lifecycleStatus?: 'ACTIVE' | 'RESOLVED' | 'SUSPENSE';
  reasons: Array<{ code: string; message: string }>;
  updates: Record<string, unknown>;
}

export interface SimplePricingBulkSuccessRow {
  rowId: string;
  rowNumber: number;
  item: string;
  entityType: 'GROUP' | 'VARIANT';
  entityId: string;
  resultType: 'SUCCESS';
  lifecycleStatus?: 'ACTIVE' | 'RESOLVED' | 'SUSPENSE';
  updates: Record<string, unknown>;
}

export interface SimplePricingBulkResults {
  job: {
    jobId: string;
    status: string;
    isTerminal: boolean;
    totals: {
      totalRows: number;
      processedRows: number;
      successRows: number;
      failedRows: number;
      unresolvedRows: number;
    };
  };
  successRows: SimplePricingBulkSuccessRow[];
  failedRows: SimplePricingBulkFailedRow[];
}

@Injectable({ providedIn: 'root' })
export class SimplePricingBulkUploadService {
  private readonly http = inject(HttpClient);
  private readonly variantsUrl = `${environment.apiBaseUrl}/variants`;

  uploadTemplate(file: File): Observable<{ success: boolean; data: { jobId: string; status: string; queuedAt: string } }> {
    const formData = new FormData();
    formData.append('templateFile', file);
    return this.http.post<{ success: boolean; data: { jobId: string; status: string; queuedAt: string } }>(
      `${this.variantsUrl}/simple-pricing/template/upload`,
      formData
    );
  }

  getAttentionJob(): Observable<{ success: boolean; data: SimplePricingBulkAttentionJob }> {
    return this.http.get<{ success: boolean; data: SimplePricingBulkAttentionJob }>(
      `${this.variantsUrl}/simple-pricing/jobs/attention`
    );
  }

  getHistoryJobs(page = 1, limit = 25): Observable<{ success: boolean; data: SimplePricingBulkHistoryResponse }> {
    return this.http.get<{ success: boolean; data: SimplePricingBulkHistoryResponse }>(
      `${this.variantsUrl}/simple-pricing/jobs/history?page=${page}&limit=${limit}`
    );
  }

  getJobStatus(jobId: string): Observable<{ success: boolean; data: SimplePricingBulkJobStatus }> {
    return this.http.get<{ success: boolean; data: SimplePricingBulkJobStatus }>(
      `${this.variantsUrl}/simple-pricing/jobs/${jobId}/status`
    );
  }

  getJobResults(jobId: string, state?: 'unresolved' | 'all'): Observable<{ success: boolean; data: SimplePricingBulkResults }> {
    const url = `${this.variantsUrl}/simple-pricing/jobs/${jobId}/results${state === 'unresolved' ? '?state=unresolved' : ''}`;
    return this.http.get<{ success: boolean; data: SimplePricingBulkResults }>(url);
  }

  closeRow(jobId: string, rowId: string): Observable<{ success: boolean; data: { rowId: string; rowNumber: number; resolved: boolean; resultType: string } }> {
    return this.http.post<{ success: boolean; data: { rowId: string; rowNumber: number; resolved: boolean; resultType: string } }>(
      `${this.variantsUrl}/simple-pricing/jobs/${jobId}/rows/${rowId}/close`,
      {}
    );
  }

  suspendUnresolved(jobId: string): Observable<{ success: boolean; data: { jobId: string; suspendedRows: number; totals: any } }> {
    return this.http.post<{ success: boolean; data: { jobId: string; suspendedRows: number; totals: any } }>(
      `${this.variantsUrl}/simple-pricing/jobs/${jobId}/suspend-unresolved`,
      {}
    );
  }

  cancelJob(jobId: string, reason?: string): Observable<{ success: boolean; data: { jobId: string; status: string; totals: any; isTerminal: boolean; message: string } }> {
    return this.http.post<{ success: boolean; data: { jobId: string; status: string; totals: any; isTerminal: boolean; message: string } }>(
      `${this.variantsUrl}/simple-pricing/jobs/${jobId}/cancel`,
      { reason: reason || 'Canceled by user' }
    );
  }
}
