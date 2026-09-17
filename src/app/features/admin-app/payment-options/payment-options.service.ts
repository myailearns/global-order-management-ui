import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { PaymentOptionsResponse, PaymentOptionsUpdate } from './payment-options.models';

@Injectable({ providedIn: 'root' })
export class PaymentOptionsService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiBaseUrl}/tenant-config/payment-options`;

  get(): Observable<PaymentOptionsResponse> {
    return this.http.get<PaymentOptionsResponse>(this.url);
  }

  update(payload: PaymentOptionsUpdate): Observable<PaymentOptionsResponse> {
    return this.http.patch<PaymentOptionsResponse>(this.url, payload);
  }
}
