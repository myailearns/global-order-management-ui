import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { ApiSuccess, BusinessProfile, BusinessProfileUpdate } from './business-details.models';

@Injectable({ providedIn: 'root' })
export class BusinessDetailsService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiBaseUrl}/tenant-account/business-details`;

  getBusinessDetails(): Observable<ApiSuccess<BusinessProfile>> {
    return this.http.get<ApiSuccess<BusinessProfile>>(this.url);
  }

  updateBusinessDetails(payload: BusinessProfileUpdate): Observable<ApiSuccess<BusinessProfile>> {
    return this.http.patch<ApiSuccess<BusinessProfile>>(this.url, payload);
  }
}
