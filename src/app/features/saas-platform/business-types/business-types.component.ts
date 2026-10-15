import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  GomAlertToastService,
  GomButtonComponent,
  GomConfirmationModalComponent,
  GomInputComponent,
  GomModalComponent,
  GomSelectComponent,
  GomSelectOption,
  GomTableColumn,
  GomTableComponent,
  GomTableRow,
} from '@gomlibs/ui';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { TemplateCatalogService, BusinessType, BusinessCategory } from '../templates/template-catalog.service';

interface BusinessTypeRow extends GomTableRow {
  id: string;
  name: string;
  businessCategoryName: string;
}

@Component({
  selector: 'gom-business-types',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    GomButtonComponent,
    GomConfirmationModalComponent,
    GomInputComponent,
    GomModalComponent,
    GomSelectComponent,
    GomTableComponent,
  ],
  templateUrl: './business-types.component.html',
  styleUrl: './business-types.component.scss',
})
export class BusinessTypesComponent {
  private readonly catalogService = inject(TemplateCatalogService);
  private readonly toast = inject(GomAlertToastService);
  private readonly authSession = inject(AuthSessionService);
  private readonly fb = inject(FormBuilder);
  private readonly translate = inject(TranslateService);
  private readonly router = inject(Router);

  readonly defaultIcon = 'ri-store-2-line';
  readonly loading = signal(false);
  readonly templateDownloading = signal(false);
  readonly templateUploading = signal(false);
  readonly businessTypes = signal<BusinessType[]>([]);
  readonly categoryOptions = signal<GomSelectOption[]>([]);
  readonly categoryLookup = signal<Record<string, string>>({});
  readonly modalOpen = signal(false);
  readonly deleteConfirmOpen = signal(false);
  readonly editingBusinessType = signal<BusinessType | null>(null);
  readonly pendingDelete = signal<BusinessType | null>(null);
  readonly canWrite = computed(() => this.authSession.canWrite('platform-admin'));
  readonly actionBusy = computed(() => this.loading() || this.templateDownloading() || this.templateUploading());

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required]],
    categoryIds: [[] as string[], [Validators.required]],
  });

  readonly rows = computed<BusinessTypeRow[]>(() =>
    this.businessTypes().map((businessType) => ({
      id: businessType._id,
      name: businessType.name,
      businessCategoryName: this.formatCategoryNames(businessType.businessCategoryIds),
    })),
  );

  readonly columns: GomTableColumn<BusinessTypeRow>[] = [
    {
      key: 'name',
      header: this.translate.instant('businessTypes.table.columns.name'),
      sortable: true,
      filterable: true,
    },
    {
      key: 'businessCategoryName',
      header: this.translate.instant('businessTypes.table.columns.categoryName'),
      sortable: true,
      filterable: true,
      textMode: 'wrap',
    },
    {
      key: 'id',
      header: this.translate.instant('businessTypes.table.columns.actions'),
      width: '18rem',
      actionButtons: [
        {
          label: this.translate.instant('businessTypes.actions.configure'),
          icon: 'ri-settings-4-line',
          actionKey: 'configure',
          variant: 'primary',
        },
        {
          label: this.translate.instant('businessTypes.actions.edit'),
          icon: 'ri-pencil-line',
          actionKey: 'edit',
          variant: 'secondary',
        },
        {
          label: this.translate.instant('businessTypes.actions.delete'),
          icon: 'ri-delete-bin-line',
          actionKey: 'delete',
          variant: 'danger',
        },
      ],
    },
  ];

  constructor() {
    this.loadCategories();
    this.loadBusinessTypes();
  }

  get deleteMessage(): string {
    const target = this.pendingDelete();
    return this.translate.instant('businessTypes.delete.message', {
      name: target?.name || '',
    });
  }

  openCreate(): void {
    if (!this.canWrite()) {
      return;
    }

    this.editingBusinessType.set(null);
    this.form.reset({ name: '', categoryIds: [] });
    this.form.markAsPristine();
    this.form.markAsUntouched();
    this.modalOpen.set(true);
  }

  openImport(): void {
    if (!this.canWrite() || this.templateUploading()) {
      return;
    }

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.xlsx,.xls';
    fileInput.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) {
        return;
      }

      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
      ];
      const fileExtRegex = /\.(xlsx|xls)$/i;
      if (!validTypes.includes(file.type) && !fileExtRegex.exec(file.name)) {
        this.toast.error(this.translate.instant('businessTypes.messages.invalidFileType'));
        return;
      }

      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        this.toast.error(this.translate.instant('businessTypes.messages.fileTooLarge'));
        return;
      }

      this.templateUploading.set(true);
      this.catalogService.uploadBusinessTypeBulkFile(file).subscribe({
        next: (response) => {
          this.templateUploading.set(false);
          const result = response.data;
          if (!response.success || !result) {
            this.toast.error(response.message || this.translate.instant('businessTypes.messages.importError'));
            return;
          }

          if (result.failedCount > 0) {
            this.toast.warning(this.translate.instant('businessTypes.messages.importCompletedWithErrors', {
              created: result.createdCount || 0,
              failed: result.failedCount || 0,
            }));
          } else {
            this.toast.success(this.translate.instant('businessTypes.messages.importCompleted', {
              count: result.createdCount || 0,
            }));
          }

          if (result.createdCount > 0) {
            this.loadBusinessTypes();
          }
        },
        error: (error) => {
          this.templateUploading.set(false);
          this.toast.error(error?.error?.message || this.translate.instant('businessTypes.messages.importError'));
        },
      });
    };

    fileInput.click();
  }

  downloadTemplate(): void {
    if (!this.canWrite() || this.templateDownloading()) {
      return;
    }

    this.templateDownloading.set(true);
    this.catalogService.downloadBusinessTypeTemplate().subscribe({
      next: (blob) => {
        const timestamp = new Date().toISOString().split('T')[0];
        this.triggerFileDownload(blob, `business-types-template-${timestamp}.xlsx`);
        this.toast.success(this.translate.instant('businessTypes.messages.templateDownloaded'));
        this.templateDownloading.set(false);
      },
      error: () => {
        this.templateDownloading.set(false);
        this.toast.error(this.translate.instant('businessTypes.messages.templateDownloadError'));
      },
    });
  }

  onRowAction(event: { actionKey: string; row: BusinessTypeRow }): void {
    const businessType = this.businessTypes().find((item) => item._id === event.row.id);
    if (!businessType) {
      return;
    }

    if (event.actionKey === 'edit') {
      this.openEdit(businessType);
      return;
    }

    if (event.actionKey === 'configure') {
      this.openConfigure(businessType);
      return;
    }

    if (event.actionKey === 'delete') {
      this.requestDelete(businessType);
    }
  }

  save(): void {
    if (!this.canWrite() || this.loading() || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const payload = {
      name: value.name.trim(),
      code: this.buildCode(value.name),
      businessCategoryIds: value.categoryIds,
      icon: this.editingBusinessType()?.icon || this.defaultIcon,
    };

    this.loading.set(true);
    const editing = this.editingBusinessType();
    const request$ = editing
      ? this.catalogService.updateBusinessType(editing._id, {
          name: payload.name,
          businessCategoryIds: payload.businessCategoryIds,
          icon: payload.icon,
        })
      : this.catalogService.createBusinessType(payload);

    request$.subscribe({
      next: () => {
        this.toast.success(this.translate.instant(
          editing ? 'businessTypes.messages.updated' : 'businessTypes.messages.created',
        ));
        this.modalOpen.set(false);
        this.editingBusinessType.set(null);
        this.loadBusinessTypes();
      },
      error: () => {
        this.loading.set(false);
        this.toast.error(this.translate.instant('businessTypes.messages.saveError'));
      },
    });
  }

  closeModal(): void {
    this.modalOpen.set(false);
    this.editingBusinessType.set(null);
    this.form.reset({ name: '', categoryIds: [] });
  }

  confirmDelete(): void {
    const target = this.pendingDelete();
    if (!this.canWrite() || !target) {
      return;
    }

    this.loading.set(true);
    this.catalogService.deleteBusinessType(target._id).subscribe({
      next: () => {
        this.toast.success(this.translate.instant('businessTypes.messages.deleted'));
        this.deleteConfirmOpen.set(false);
        this.pendingDelete.set(null);
        this.loadBusinessTypes();
      },
      error: () => {
        this.loading.set(false);
        this.toast.error(this.translate.instant('businessTypes.messages.deleteError'));
      },
    });
  }

  closeDeleteConfirm(): void {
    this.deleteConfirmOpen.set(false);
    this.pendingDelete.set(null);
  }

  private loadBusinessTypes(): void {
    this.loading.set(true);
    this.catalogService.listBusinessTypes({ page: 1, limit: 5000, sort: 'name', order: 'asc' }).subscribe({
      next: (response) => {
        this.businessTypes.set(response.data ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error(this.translate.instant('businessTypes.messages.loadError'));
      },
    });
  }

  private loadCategories(): void {
    this.catalogService.listBusinessCategories({ page: 1, limit: 5000, sort: 'name', order: 'asc' }).subscribe({
      next: (response) => {
        const categories = response.data ?? [];
        this.categoryOptions.set(categories.map((category) => ({
          value: category._id,
          label: category.name,
        })));
        this.categoryLookup.set(
          categories.reduce<Record<string, string>>((accumulator, category) => {
            accumulator[category._id] = category.name;
            return accumulator;
          }, {}),
        );
      },
      error: () => {
        this.toast.error(this.translate.instant('businessTypes.messages.loadCategoriesError'));
      },
    });
  }

  private openEdit(businessType: BusinessType): void {
    if (!this.canWrite()) {
      return;
    }

    this.editingBusinessType.set(businessType);
    this.form.reset({
      name: businessType.name,
      categoryIds: businessType.businessCategoryIds.map((category) => category._id),
    });
    this.form.markAsPristine();
    this.form.markAsUntouched();
    this.modalOpen.set(true);
  }

  private requestDelete(businessType: BusinessType): void {
    if (!this.canWrite()) {
      return;
    }

    this.pendingDelete.set(businessType);
    this.deleteConfirmOpen.set(true);
  }

  private openConfigure(businessType: BusinessType): void {
    if (!this.canWrite()) {
      return;
    }

    void this.router.navigate(['/settings/business-types', businessType._id, 'configure'], {
      queryParams: { name: businessType.name },
    });
  }

  private formatCategoryNames(categories: BusinessCategory[]): string {
    if (!categories.length) {
      return '—';
    }

    return categories
      .map((category) => this.categoryLookup()[category._id] || category.name)
      .join(', ');
  }

  private buildCode(name: string): string {
    const normalized = String(name || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_');
    const code = normalized.split('_').filter(Boolean).join('_');

    return code || `business_type_${Date.now()}`;
  }

  private triggerFileDownload(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
  }
}