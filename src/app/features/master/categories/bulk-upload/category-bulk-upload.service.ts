import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';

export interface CategoryBulkUploadAcceptedResponse {
  success: boolean;
  message: string;
  data: {
    jobId: string;
    status: string;
    queuedAt: string;
  };
}

export interface CategoryBulkUploadJobStatus {
  jobId: string;
  status: 'QUEUED' | 'VALIDATING' | 'PROCESSING' | 'COMPLETED' | 'COMPLETED_WITH_ERRORS' | 'FAILED';
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
  userAcknowledged: boolean;
  acknowledgedAt: string | null;
}

export interface CategoryBulkUploadAttentionJob {
  hasAttention: boolean;
  reason: 'PROCESSING' | 'UNRESOLVED' | 'NONE';
  job: CategoryBulkUploadJobStatus | null;
  jobs: CategoryBulkUploadJobStatus[]; // Multiple unacknowledged jobs
}

export interface CategoryBulkUploadRowReason {
  code: string;
  message: string;
}

export interface CategoryBulkUploadFailedRow {
  rowId: string;
  rowNumber: number;
  name: string;
  resultType: 'DUPLICATE' | 'INVALID' | 'QUOTA_EXCEEDED' | 'SYSTEM_ERROR';
  resolved: boolean;
  lifecycleStatus: 'ACTIVE' | 'RESOLVED' | 'SUSPENSE';
  reasons: CategoryBulkUploadRowReason[];
  rawPayload: Record<string, string>;
}

export interface CategoryBulkUploadSuccessRow {
  rowId: string;
  rowNumber: number;
  categoryId: string | null;
  name: string;
  description: string;
  resultType: 'SUCCESS';
  rawPayload: Record<string, string>;
}

export interface CategoryBulkUploadJobResults {
  job: CategoryBulkUploadJobStatus;
  successRows: CategoryBulkUploadSuccessRow[];
  failedRows: CategoryBulkUploadFailedRow[];
}

@Injectable({
  providedIn: 'root'
})
export class CategoryBulkUploadService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiBaseUrl}/categories/bulk`;

  /**
   * Download category template Excel file
   */
  downloadTemplate(): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/template`, {
      responseType: 'blob',
      headers: new HttpHeaders({
        'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })
    });
  }

  /**
   * Upload Excel file for bulk category creation (job-based, non-blocking)
   * @param file - Excel file (.xlsx)
   */
  uploadCategories(file: File): Observable<CategoryBulkUploadAcceptedResponse> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<CategoryBulkUploadAcceptedResponse>(`${this.apiUrl}/upload`, formData);
  }

  /**
   * Get job status
   */
  getJobStatus(jobId: string): Observable<{ success: boolean; data: CategoryBulkUploadJobStatus }> {
    return this.http.get<{ success: boolean; data: CategoryBulkUploadJobStatus }>(
      `${this.apiUrl}/jobs/${jobId}/status`
    );
  }

  /**
   * Get job results (success and failed rows)
   */
  getJobResults(jobId: string, filters?: { state?: 'all' | 'unresolved' }): Observable<{ success: boolean; data: CategoryBulkUploadJobResults }> {
    const options = filters?.state ? { params: { state: filters.state } } : {};
    return this.http.get<{ success: boolean; data: CategoryBulkUploadJobResults }>(
      `${this.apiUrl}/jobs/${jobId}/results`,
      options
    );
  }

  /**
   * Get job that needs attention (for notification banner)
   */
  getAttentionJob(): Observable<{ success: boolean; data: CategoryBulkUploadAttentionJob }> {
    return this.http.get<{ success: boolean; data: CategoryBulkUploadAttentionJob }>(
      `${this.apiUrl}/attention`
    );
  }

  /**
   * Acknowledge job (user clicked "I am good")
   */
  acknowledgeJob(jobId: string): Observable<{ success: boolean; data: { jobId: string; userAcknowledged: boolean; acknowledgedAt: string } }> {
    return this.http.post<{ success: boolean; data: { jobId: string; userAcknowledged: boolean; acknowledgedAt: string } }>(
      `${this.apiUrl}/jobs/${jobId}/acknowledge`,
      {}
    );
  }

  /**
   * Trigger file download in browser
   * @param blob - File blob
   * @param filename - Download filename
   */
  triggerFileDownload(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(url);
  }
}
