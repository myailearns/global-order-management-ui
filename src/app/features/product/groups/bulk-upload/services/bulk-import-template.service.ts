import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';

export interface TemplateRefreshWarning {
  type: string;
  rowNumber: number;
  value: string;
  message: string;
}

// ── Bulk Upload Job ─────────────────────────────────────────────────────────

export interface BulkUploadAcceptedResponse {
  success: boolean;
  message: string;
  data: {
    jobId: string;
    status: string;
    queuedAt: string;
  };
}

export interface BulkUploadJobStatus {
  jobId: string;
  status: 'QUEUED' | 'VALIDATING' | 'PROCESSING' | 'COMPLETED' | 'COMPLETED_WITH_ERRORS' | 'FAILED';
  isTerminal: boolean;
  totals: {
    totalRows: number;
    processedRows: number;
    successRows: number;
    failedRows: number;
    variantWarningRows?: number;
    unresolvedRows: number;
  };
  startedAt: string | null;
  completedAt: string | null;
  errorMessage: string;
}

export interface BulkUploadAttentionJob {
  hasAttention: boolean;
  reason: 'PROCESSING' | 'UNRESOLVED' | 'NONE';
  job: BulkUploadJobStatus | null;
}

export interface BulkUploadRowReason {
  code: string;
  message: string;
}

export interface BulkUploadFailedRow {
  rowId: string;
  rowNumber: number;
  groupName: string;
  inferredGroupType: string | null;
  resultType: 'DUPLICATE' | 'INVALID' | 'QUOTA_EXCEEDED' | 'SYSTEM_ERROR';
  resolved: boolean;
  lifecycleStatus?: 'ACTIVE' | 'RESOLVED' | 'SUSPENSE';
  reasons: BulkUploadRowReason[];
  rawPayload: Record<string, string>;
}

export interface BulkUploadSuccessRow {
  rowId: string;
  rowNumber: number;
  groupId: string | null;
  groupName: string;
  category: string;
  baseUnit: string;
  allowedUnits: string;
  pricingTemplate: string;
  taxProfile: string;
  pricingRefreshMode: string;
  inferredGroupType: string | null;
  resultType: 'SUCCESS';
  variantCount?: number;
  variantNames?: string[];
  createVariantsRequested?: boolean;
  variantFailureCount?: number;
  variantFailureReason?: string;
  rawPayload: Record<string, string>;
}

export interface BulkUploadVariantFailure {
  id: string;
  rowNumber: number;
  groupName: string;
  attemptedVariantLabel: string;
  measuredInput: string;
  failureCode: string;
  failureMessage: string;
  acknowledged: boolean;
}

export interface BulkUploadJobResults {
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
  successRows: BulkUploadSuccessRow[];
  failedRows: BulkUploadFailedRow[];
  variantFailures: BulkUploadVariantFailure[];
}

export interface BulkUploadRetryResponse {
  success: boolean;
  data: {
    rowId: string;
    rowNumber: number;
    resultType: string;
    resolved: boolean;
    reasons: BulkUploadRowReason[];
    groupId: string | null;
    variantRetry?: {
      attempted: number;
      variantCount: number;
      warningCount: number;
    };
  };
}

export interface BulkUploadCloseRowResponse {
  success: boolean;
  data: {
    rowId: string;
    rowNumber: number;
    resolved: boolean;
    resultType?: string;
  };
}

export interface BulkUploadSuspendResponse {
  success: boolean;
  data: {
    jobId: string;
    suspendedRows: number;
    totals: {
      totalRows: number;
      processedRows: number;
      successRows: number;
      failedRows: number;
      unresolvedRows: number;
    };
  };
}

// ── Refresh (existing) ──────────────────────────────────────────────────────

export interface TemplateRefreshResponse {
  success: boolean;
  status: string;
  refreshedAt: string;
  rowCount: number;
  newlyAdded: {
    categories: string[];
    units: string[];
    taxProfiles: string[];
    pricingTemplates: string[];
    attributes: string[];
  };
  masterData: {
    categories: string[];
    units: string[];
    taxProfiles: string[];
    pricingTemplates: string[];
    attributes: string[];
  };
  warnings: TemplateRefreshWarning[];
  hasWarnings: boolean;
  file: string;       // base64-encoded xlsx buffer
  filename: string;
}

@Injectable({
  providedIn: 'root',
})
export class BulkImportTemplateService {
  private readonly http = inject(HttpClient);
  private readonly groupsUrl = `${environment.apiBaseUrl}/groups`;

  /** Download fresh template as Excel file */
  downloadTemplate(): Observable<Blob> {
    return this.http.post<Blob>(
      `${this.groupsUrl}/bulk-import/template/download`,
      {},
      { responseType: 'blob' as 'json' }
    );
  }

  /** Upload existing template for master data refresh */
  refreshTemplate(file: File): Observable<TemplateRefreshResponse> {
    const formData = new FormData();
    formData.append('templateFile', file);
    return this.http.post<TemplateRefreshResponse>(
      `${this.groupsUrl}/bulk-import/template/refresh`,
      formData
    );
  }

  /** Convert base64 string from refresh response to a Blob and trigger download */
  downloadRefreshedTemplate(base64: string, filename: string): void {
    const byteChars = atob(base64);
    const byteArray = new Uint8Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) {
      byteArray[i] = byteChars.charCodeAt(i);
    }
    const blob = new Blob([byteArray], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    this.triggerFileDownload(blob, filename);
  }

  /** Trigger download of a blob as a file */
  triggerFileDownload(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  // ── Bulk Upload APIs ──────────────────────────────────────────────────────

  /** Upload a filled template for async group creation */
  uploadTemplate(file: File): Observable<BulkUploadAcceptedResponse> {
    const formData = new FormData();
    formData.append('templateFile', file);
    return this.http.post<BulkUploadAcceptedResponse>(
      `${this.groupsUrl}/bulk-import/template/upload`,
      formData
    );
  }

  /** Poll job status by jobId */
  getJobStatus(jobId: string): Observable<{ success: boolean; data: BulkUploadJobStatus }> {
    return this.http.get<{ success: boolean; data: BulkUploadJobStatus }>(
      `${this.groupsUrl}/bulk-import/jobs/${jobId}/status`
    );
  }

  /** Returns latest job that needs UI attention (processing or unresolved). */
  getAttentionJob(): Observable<{ success: boolean; data: BulkUploadAttentionJob }> {
    return this.http.get<{ success: boolean; data: BulkUploadAttentionJob }>(
      `${this.groupsUrl}/bulk-import/jobs/attention`
    );
  }

  /** Fetch job results; pass state='unresolved' to get only unresolved failures */
  getJobResults(jobId: string, state?: 'unresolved' | 'all'): Observable<{ success: boolean; data: BulkUploadJobResults }> {
    const url = `${this.groupsUrl}/bulk-import/jobs/${jobId}/results${state === 'unresolved' ? '?state=unresolved' : ''}`;
    return this.http.get<{ success: boolean; data: BulkUploadJobResults }>(url);
  }

  /** Retry a failed row, optionally patching fields */
  retryRow(jobId: string, rowId: string, patch: Record<string, string>): Observable<BulkUploadRetryResponse> {
    return this.http.post<BulkUploadRetryResponse>(
      `${this.groupsUrl}/bulk-import/jobs/${jobId}/rows/${rowId}/retry`,
      patch
    );
  }

  closeRow(jobId: string, rowId: string, options?: { markSuccess?: boolean }): Observable<BulkUploadCloseRowResponse> {
    return this.http.post<BulkUploadCloseRowResponse>(
      `${this.groupsUrl}/bulk-import/jobs/${jobId}/rows/${rowId}/close`,
      options || {}
    );
  }

  /** Marks remaining unresolved failed rows as accepted for this phase (SUSPENSE). */
  suspendUnresolved(jobId: string): Observable<BulkUploadSuspendResponse> {
    return this.http.post<BulkUploadSuspendResponse>(
      `${this.groupsUrl}/bulk-import/jobs/${jobId}/suspend-unresolved`,
      {}
    );
  }
}
