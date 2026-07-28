import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  CategoryDefaults,
  CategoryDefaultTemplate,
  DefaultsSearchFilter,
  CategoryDefaultsExportData,
  CategoryDefaultsBulkOperation
} from '../models/category-defaults.model';

@Injectable({
  providedIn: 'root'
})
export class CategoryDefaultsService {
  private apiBaseUrl = '/api/v1/category-defaults';
  private templatesUrl = '/api/v1/category-defaults/templates';

  constructor(private http: HttpClient) {}

  /**
   * Get all category defaults for the current tenant
   */
  getCategoryDefaults(): Observable<CategoryDefaults[]> {
    return this.http.get<CategoryDefaults[]>(this.apiBaseUrl);
  }

  /**
   * Get a specific category defaults by ID
   */
  getCategoryDefaultsById(id: string): Observable<CategoryDefaults> {
    return this.http.get<CategoryDefaults>(`${this.apiBaseUrl}/${id}`);
  }

  /**
   * Get defaults for a specific category
   */
  getDefaultsByCategory(categoryId: string): Observable<CategoryDefaults> {
    return this.http.get<CategoryDefaults>(`${this.apiBaseUrl}/by-category/${categoryId}`);
  }

  /**
   * Create new category defaults
   */
  createCategoryDefaults(defaults: CategoryDefaults): Observable<CategoryDefaults> {
    return this.http.post<CategoryDefaults>(this.apiBaseUrl, defaults);
  }

  /**
   * Update existing category defaults
   */
  updateCategoryDefaults(defaults: CategoryDefaults): Observable<CategoryDefaults> {
    const id = defaults.id;
    return this.http.put<CategoryDefaults>(`${this.apiBaseUrl}/${id}`, defaults);
  }

  /**
   * Delete category defaults
   */
  deleteCategoryDefaults(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiBaseUrl}/${id}`);
  }

  /**
   * Search category defaults with filters
   */
  searchCategoryDefaults(filters: DefaultsSearchFilter): Observable<CategoryDefaults[]> {
    let params = new HttpParams();
    if (filters.search) {
      params = params.set('search', filters.search);
    }
    if (filters.module) {
      params = params.set('module', filters.module);
    }
    if (filters.categoryId) {
      params = params.set('categoryId', filters.categoryId);
    }
    if (filters.applicableToSubcategories !== undefined) {
      params = params.set('applicableToSubcategories', String(filters.applicableToSubcategories));
    }
    if (filters.templateId) {
      params = params.set('templateId', filters.templateId);
    }

    return this.http.get<CategoryDefaults[]>(`${this.apiBaseUrl}/search`, { params });
  }

  /**
   * Get all templates
   */
  getTemplates(): Observable<CategoryDefaultTemplate[]> {
    return this.http.get<CategoryDefaultTemplate[]>(this.templatesUrl);
  }

  /**
   * Get a specific template
   */
  getTemplateById(id: string): Observable<CategoryDefaultTemplate> {
    return this.http.get<CategoryDefaultTemplate>(`${this.templatesUrl}/${id}`);
  }

  /**
   * Create a new template
   */
  createTemplate(template: CategoryDefaultTemplate): Observable<CategoryDefaultTemplate> {
    return this.http.post<CategoryDefaultTemplate>(this.templatesUrl, template);
  }

  /**
   * Update a template
   */
  updateTemplate(template: CategoryDefaultTemplate): Observable<CategoryDefaultTemplate> {
    const id = template.id;
    return this.http.put<CategoryDefaultTemplate>(`${this.templatesUrl}/${id}`, template);
  }

  /**
   * Delete a template
   */
  deleteTemplate(id: string): Observable<void> {
    return this.http.delete<void>(`${this.templatesUrl}/${id}`);
  }

  /**
   * Apply a template to category defaults
   */
  applyTemplate(categoryDefaultsId: string, templateId: string): Observable<CategoryDefaults> {
    return this.http.post<CategoryDefaults>(
      `${this.apiBaseUrl}/${categoryDefaultsId}/apply-template`,
      { templateId }
    );
  }

  /**
   * Apply defaults to multiple categories (bulk operation)
   */
  bulkApplyDefaults(operation: CategoryDefaultsBulkOperation): Observable<any> {
    return this.http.post(`${this.apiBaseUrl}/bulk-apply`, operation);
  }

  /**
   * Export category defaults
   */
  exportDefaults(defaults: CategoryDefaults[]): Observable<Blob> {
    const body: CategoryDefaultsExportData = {
      version: '1.0',
      exportDate: new Date(),
      totalCount: defaults.length,
      defaults
    };

    return this.http.post(`${this.apiBaseUrl}/export`, body, {
      responseType: 'blob'
    });
  }

  /**
   * Import category defaults from file
   */
  importDefaults(file: File): Observable<CategoryDefaultsExportData> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<CategoryDefaultsExportData>(
      `${this.apiBaseUrl}/import`,
      formData
    );
  }

  /**
   * Validate defaults before applying
   */
  validateDefaults(defaults: CategoryDefaults): Observable<{ valid: boolean; errors?: string[] }> {
    return this.http.post<{ valid: boolean; errors?: string[] }>(
      `${this.apiBaseUrl}/validate`,
      defaults
    );
  }

  /**
   * Apply defaults to subcategories
   */
  applyToSubcategories(categoryDefaultsId: string): Observable<any> {
    return this.http.post(
      `${this.apiBaseUrl}/${categoryDefaultsId}/apply-to-subcategories`,
      {}
    );
  }

  /**
   * Get defaults change history
   */
  getChangeHistory(categoryDefaultsId: string): Observable<any[]> {
    return this.http.get<any[]>(
      `${this.apiBaseUrl}/${categoryDefaultsId}/change-history`
    );
  }

  /**
   * Clone existing defaults
   */
  cloneDefaults(sourceId: string, targetCategoryId: string): Observable<CategoryDefaults> {
    return this.http.post<CategoryDefaults>(
      `${this.apiBaseUrl}/${sourceId}/clone`,
      { targetCategoryId }
    );
  }

  /**
   * Get defaults statistics
   */
  getStatistics(): Observable<any> {
    return this.http.get(`${this.apiBaseUrl}/statistics`);
  }

  /**
   * Preview how defaults will affect products
   */
  previewDefaults(defaults: CategoryDefaults): Observable<any> {
    return this.http.post(`${this.apiBaseUrl}/preview`, defaults);
  }
}
