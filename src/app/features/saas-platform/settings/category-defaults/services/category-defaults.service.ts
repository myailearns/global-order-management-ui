import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  CategoryDefaults,
  CategoryDefaultsUpsertPayload,
  PaginatedResponse,
  SuccessResponse,
} from '../models/category-defaults.model';
import { environment } from '../../../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CategoryDefaultsService {
  private readonly apiBaseUrl = `${environment.apiBaseUrl}/category-defaults`;

  constructor(private http: HttpClient) {}

  getCategoryDefaults(): Observable<PaginatedResponse<CategoryDefaults>> {
    return this.http.get<PaginatedResponse<CategoryDefaults>>(this.apiBaseUrl);
  }

  getCategoryDefaultByCategory(categoryId: string): Observable<SuccessResponse<CategoryDefaults>> {
    return this.http.get<SuccessResponse<CategoryDefaults>>(`${this.apiBaseUrl}/${categoryId}`);
  }

  upsertCategoryDefault(categoryId: string, payload: CategoryDefaultsUpsertPayload): Observable<SuccessResponse<CategoryDefaults>> {
    return this.http.put<SuccessResponse<CategoryDefaults>>(`${this.apiBaseUrl}/${categoryId}`, payload);
  }

  deleteCategoryDefault(categoryId: string): Observable<SuccessResponse<null>> {
    return this.http.delete<SuccessResponse<null>>(`${this.apiBaseUrl}/${categoryId}`);
  }
}
