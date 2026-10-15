import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import { GomAlertToastService } from '@gomlibs/ui';
import { HttpClient } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { CategoryDefaultsService } from './services/category-defaults.service';
import { ActiveStatus, CategoryDefaults, GroupType, PricingRefreshMode } from './models/category-defaults.model';
import { AuthSessionService } from '../../../../core/auth/auth-session.service';
import { environment } from '../../../../../environments/environment';

interface SelectOption {
  _id: string;
  name: string;
  status?: string;
}

interface PaginatedDataResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
    totalPages: number;
    canLoadAll: boolean;
  };
}

@Component({
  selector: 'app-category-defaults',
  templateUrl: './category-defaults.component.html',
  styleUrls: ['./category-defaults.component.scss'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, DatePipe]
})
export class CategoryDefaultsComponent implements OnInit {
  @ViewChild('categoryDefaultsTable') categoryDefaultsTable: any;

  private readonly toastr = inject(GomAlertToastService);
  private readonly fb = inject(FormBuilder);
  private readonly categoryDefaultsService = inject(CategoryDefaultsService);
  private readonly authSession = inject(AuthSessionService);
  private readonly http = inject(HttpClient);

  categoryDefaults: CategoryDefaults[] = [];
  categories: SelectOption[] = [];
  pricingTemplates: SelectOption[] = [];
  attributeSets: SelectOption[] = [];
  fieldGroups: SelectOption[] = [];
  units: SelectOption[] = [];
  taxProfiles: SelectOption[] = [];
  
  selectedCategory: CategoryDefaults | null = null;
  isLoadingDefaults = false;
  isLoadingLookups = false;
  isSaving = false;
  
  showDefaultsModal = false;
  editingMode = false;
  
  // Feature checks
  canViewDefaults = false;
  canEditDefaults = false;
  canManageTemplates = false;

  readonly groupTypeOptions: Array<{ label: string; value: GroupType | '' }> = [
    { label: 'Auto / Not Set', value: '' },
    { label: 'Measured', value: 'MEASURED' },
    { label: 'Attribute', value: 'ATTRIBUTE' },
    { label: 'Hybrid', value: 'HYBRID' },
  ];

  readonly pricingRefreshModeOptions: Array<{ label: string; value: PricingRefreshMode | '' }> = [
    { label: 'Auto / Not Set', value: '' },
    { label: 'Fixed', value: 'FIXED' },
    { label: 'Manual Refresh', value: 'MANUAL_REFRESH' },
    { label: 'Auto Refresh', value: 'AUTO_REFRESH' },
  ];

  readonly statusOptions: Array<{ label: string; value: ActiveStatus }> = [
    { label: 'Active', value: 'ACTIVE' },
    { label: 'Inactive', value: 'INACTIVE' },
  ];

  readonly defaultsForm = this.fb.group({
    categoryId: ['', Validators.required],
    pricingTemplateId: [''],
    attributeSetId: [''],
    baseUnitId: [''],
    fieldGroupId: [''],
    taxProfileId: [''],
    groupType: [''],
    pricingRefreshMode: [''],
    status: ['ACTIVE', Validators.required],
  });

  ngOnInit(): void {
    this.checkEntitlements();
    if (this.canViewDefaults) {
      this.loadCategoryDefaults();
      this.loadLookups();
    }
  }

  checkEntitlements(): void {
    this.canViewDefaults = this.authSession.hasFeature('categoryDefaults.view');
    this.canEditDefaults = this.authSession.hasFeature('categoryDefaults.edit');
    this.canManageTemplates = this.authSession.hasFeature('categoryDefaults.template');
  }

  loadCategoryDefaults(): void {
    this.isLoadingDefaults = true;
    this.categoryDefaultsService.getCategoryDefaults().subscribe({
      next: (response) => {
        this.categoryDefaults = response.data || [];
        this.isLoadingDefaults = false;
      },
      error: () => {
        this.toastr.error('Failed to load category defaults');
        this.isLoadingDefaults = false;
      }
    });
  }

  loadLookups(): void {
    this.isLoadingLookups = true;
    forkJoin({
      categories: this.http.get<PaginatedDataResponse<SelectOption>>(`${environment.apiBaseUrl}/categories?status=ACTIVE&page=1&limit=1000`),
      pricingTemplates: this.http.get<PaginatedDataResponse<SelectOption>>(`${environment.apiBaseUrl}/pricing-templates?status=ACTIVE&page=1&limit=1000`),
      attributeSets: this.http.get<PaginatedDataResponse<SelectOption>>(`${environment.apiBaseUrl}/attribute-sets?status=ACTIVE&page=1&limit=1000`),
      fieldGroups: this.http.get<PaginatedDataResponse<SelectOption>>(`${environment.apiBaseUrl}/field-groups?status=ACTIVE&page=1&limit=1000`),
      units: this.http.get<PaginatedDataResponse<SelectOption>>(`${environment.apiBaseUrl}/units?status=ACTIVE&page=1&limit=1000`),
      taxProfiles: this.http.get<PaginatedDataResponse<SelectOption>>(`${environment.apiBaseUrl}/tax-profiles?status=ACTIVE&page=1&limit=1000`),
    }).subscribe({
      next: (result) => {
        this.categories = result.categories.data || [];
        this.pricingTemplates = result.pricingTemplates.data || [];
        this.attributeSets = result.attributeSets.data || [];
        this.fieldGroups = result.fieldGroups.data || [];
        this.units = result.units.data || [];
        this.taxProfiles = result.taxProfiles.data || [];
        this.isLoadingLookups = false;
      },
      error: () => {
        this.toastr.error('Failed to load default option catalogs');
        this.isLoadingLookups = false;
      }
    });
  }

  openDefaultsEditor(category?: CategoryDefaults): void {
    if (!this.canEditDefaults) {
      this.toastr.info('You do not have permission to edit category defaults');
      return;
    }

    this.editingMode = !!category;
    if (category) {
      this.selectedCategory = { ...category };
      this.populateForm(category);
    } else {
      this.selectedCategory = null;
      this.defaultsForm.reset({
        categoryId: '',
        pricingTemplateId: '',
        attributeSetId: '',
        baseUnitId: '',
        fieldGroupId: '',
        taxProfileId: '',
        groupType: '',
        pricingRefreshMode: '',
        status: 'ACTIVE',
      });
    }
    this.showDefaultsModal = true;
  }

  saveDefaults(): void {
    if (!this.defaultsForm.valid) {
      this.toastr.error('Please fill in all required fields');
      return;
    }

    this.isSaving = true;
    const formValue = this.defaultsForm.getRawValue();
    const categoryId = String(formValue.categoryId || '').trim();
    const groupTypeRaw = String(formValue.groupType || '').trim();
    const pricingRefreshModeRaw = String(formValue.pricingRefreshMode || '').trim();
    const payload = {
      pricingTemplateId: String(formValue.pricingTemplateId || '').trim() || null,
      attributeSetId: String(formValue.attributeSetId || '').trim() || null,
      baseUnitId: String(formValue.baseUnitId || '').trim() || null,
      fieldGroupId: String(formValue.fieldGroupId || '').trim() || null,
      taxProfileId: String(formValue.taxProfileId || '').trim() || null,
      groupType: (groupTypeRaw ? (groupTypeRaw as GroupType) : null),
      pricingRefreshMode: (pricingRefreshModeRaw ? (pricingRefreshModeRaw as PricingRefreshMode) : null),
      status: (String(formValue.status || 'ACTIVE').trim().toUpperCase() as ActiveStatus),
    };

    this.categoryDefaultsService.upsertCategoryDefault(categoryId, payload).subscribe({
      next: () => {
        this.toastr.success(
          this.editingMode ? 'Defaults updated successfully' : 'Defaults created successfully'
        );
        this.showDefaultsModal = false;
        this.loadCategoryDefaults();
        this.isSaving = false;
      },
      error: () => {
        this.toastr.error('Failed to save defaults');
        this.isSaving = false;
      }
    });
  }

  deleteDefaults(categoryId: string): void {
    if (confirm('Are you sure you want to delete this category defaults configuration?')) {
      this.categoryDefaultsService.deleteCategoryDefault(categoryId).subscribe({
        next: () => {
          this.toastr.success('Defaults deleted successfully');
          this.loadCategoryDefaults();
        },
        error: () => {
          this.toastr.error('Failed to delete defaults');
        }
      });
    }
  }

  private populateForm(defaults: CategoryDefaults): void {
    const categoryId = typeof defaults.categoryId === 'string' ? defaults.categoryId : defaults.categoryId?._id || '';
    const pricingTemplateId = typeof defaults.pricingTemplateId === 'string' ? defaults.pricingTemplateId : defaults.pricingTemplateId?._id || '';
    const attributeSetId = typeof defaults.attributeSetId === 'string' ? defaults.attributeSetId : defaults.attributeSetId?._id || '';
    const baseUnitId = typeof defaults.baseUnitId === 'string' ? defaults.baseUnitId : defaults.baseUnitId?._id || '';
    const fieldGroupId = typeof defaults.fieldGroupId === 'string' ? defaults.fieldGroupId : defaults.fieldGroupId?._id || '';
    const taxProfileId = typeof defaults.taxProfileId === 'string' ? defaults.taxProfileId : defaults.taxProfileId?._id || '';

    this.defaultsForm.patchValue({
      categoryId,
      pricingTemplateId,
      attributeSetId,
      baseUnitId,
      fieldGroupId,
      taxProfileId,
      groupType: defaults.groupType || '',
      pricingRefreshMode: defaults.pricingRefreshMode || '',
      status: defaults.status || 'ACTIVE',
    });
  }

  getCategoryName(item: CategoryDefaults): string {
    return typeof item.categoryId === 'string'
      ? item.categoryId
      : item.categoryId?.name || '-';
  }

  getRefName(value: string | { _id: string; name: string } | null | undefined): string {
    if (!value) {
      return '-';
    }

    return typeof value === 'string' ? value : value.name;
  }
}
