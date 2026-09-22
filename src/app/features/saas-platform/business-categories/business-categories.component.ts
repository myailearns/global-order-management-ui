import { CommonModule } from '@angular/common';
import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  GomAlertToastService,
  GomButtonComponent,
  GomConfirmationModalComponent,
  GomTableColumn,
  GomTableComponent,
  GomTableRow,
} from '@gomlibs/ui';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { CategoryFormData, CategoriesFormComponent } from '../../master/categories';
import {
  TemplateCatalogService,
  BusinessCategory,
  TemplateCategoryBulkUploadJobStatus,
} from '../templates/template-catalog.service';

interface BusinessCategoryRow extends GomTableRow {
  id: string;
  name: string;
}

@Component({
  selector: 'gom-business-categories',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    GomButtonComponent,
    GomConfirmationModalComponent,
    GomTableComponent,
    CategoriesFormComponent,
  ],
  templateUrl: './business-categories.component.html',
  styleUrl: './business-categories.component.scss',
})
export class BusinessCategoriesComponent implements OnDestroy {
  private readonly catalogService = inject(TemplateCatalogService);
  private readonly toast = inject(GomAlertToastService);
  private readonly authSession = inject(AuthSessionService);
  private readonly translate = inject(TranslateService);
  private bulkUploadPollTimer: ReturnType<typeof setInterval> | null = null;

  loading = signal(false);
  templateDownloading = signal(false);
  templateUploading = signal(false);
  categories = signal<BusinessCategory[]>([]);
  categoryFormOpen = signal(false);
  editingCategoryId = signal<string | null>(null);
  editingCategoryData = signal<CategoryFormData | null>(null);
  deleteConfirmOpen = signal(false);
  pendingDelete = signal<BusinessCategory | null>(null);
  readonly canWrite = computed(() => this.authSession.canWrite('platform-admin'));
  readonly actionBusy = computed(() => this.loading() || this.templateDownloading() || this.templateUploading());

  readonly rows = computed<BusinessCategoryRow[]>(() =>
    this.categories().map((category) => ({
      id: category._id,
      name: category.name,
    })),
  );

  readonly columns: GomTableColumn<BusinessCategoryRow>[] = [
    {
      key: 'name',
      header: this.translate.instant('businessCategories.table.columns.name'),
      sortable: true,
      filterable: true,
    },
    {
      key: 'id',
      header: this.translate.instant('businessCategories.table.columns.actions'),
      width: '12rem',
      actionButtons: [
        {
          label: this.translate.instant('businessCategories.actions.edit'),
          icon: 'ri-pencil-line',
          actionKey: 'edit',
          variant: 'secondary',
        },
        {
          label: this.translate.instant('businessCategories.actions.delete'),
          icon: 'ri-delete-bin-line',
          actionKey: 'delete',
          variant: 'danger',
        },
      ],
    },
  ];

  constructor() {
    this.loadCategories();
  }

  ngOnDestroy(): void {
    this.stopBulkUploadPoll();
  }

  openCreate(): void {
    if (!this.canWrite()) {
      return;
    }

    this.editingCategoryId.set(null);
    this.editingCategoryData.set(null);
    this.categoryFormOpen.set(true);
  }

  importCategories(): void {
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
        this.toast.error(this.translate.instant('businessCategories.messages.invalidFileType'));
        return;
      }

      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        this.toast.error(this.translate.instant('businessCategories.messages.fileTooLarge'));
        return;
      }

      this.templateUploading.set(true);
      this.catalogService.uploadBusinessCategoryBulkFile(file).subscribe({
        next: (response) => {
          this.templateUploading.set(false);
          const jobId = response.data?.jobId;
          if (!response.success || !jobId) {
            this.toast.error(response.message || this.translate.instant('businessCategories.messages.importError'));
            return;
          }

          this.toast.info(this.translate.instant('businessCategories.messages.importAccepted'));
          this.startBulkUploadPoll(jobId);
        },
        error: (error) => {
          this.templateUploading.set(false);
          this.toast.error(error?.error?.message || this.translate.instant('businessCategories.messages.importError'));
        },
      });
    };

    fileInput.click();
  }

  downloadTemplate(): void {
    if (!this.canWrite() || this.templateDownloading()) {
      this.toast.warning(this.translate.instant('businessCategories.messages.downloadNotAllowed'));
      return;
    }

    this.templateDownloading.set(true);
    this.catalogService.downloadBusinessCategoryBulkTemplate().subscribe({
      next: (blob) => {
        const timestamp = new Date().toISOString().split('T')[0];
        this.triggerFileDownload(blob, `business-categories-template-${timestamp}.xlsx`);
        this.toast.success(this.translate.instant('businessCategories.messages.templateDownloaded'));
        this.templateDownloading.set(false);
      },
      error: () => {
        this.templateDownloading.set(false);
        this.toast.error(this.translate.instant('businessCategories.messages.templateDownloadError'));
      },
    });
  }

  onRowAction(event: { actionKey: string; row: BusinessCategoryRow }): void {
    const category = this.categories().find((item) => item._id === event.row.id);
    if (!category) {
      return;
    }

    if (event.actionKey === 'edit') {
      this.openEdit(category);
      return;
    }

    if (event.actionKey === 'delete') {
      this.requestDelete(category);
    }
  }

  onCategoryFormSubmit(data: CategoryFormData): void {
    if (!this.canWrite()) {
      return;
    }

    this.loading.set(true);
    const editingId = this.editingCategoryId();
    const request$ = editingId
      ? this.catalogService.updateBusinessCategory(editingId, data)
      : this.catalogService.createBusinessCategory(data);

    request$.subscribe({
      next: () => {
        this.categoryFormOpen.set(false);
        this.editingCategoryId.set(null);
        this.editingCategoryData.set(null);
        this.toast.success(
          this.translate.instant(
            editingId ? 'businessCategories.messages.updated' : 'businessCategories.messages.created',
          ),
        );
        this.loadCategories();
      },
      error: () => {
        this.loading.set(false);
        this.toast.error(this.translate.instant('businessCategories.messages.saveError'));
      },
    });
  }

  onCategoryFormCancel(): void {
    this.categoryFormOpen.set(false);
    this.editingCategoryId.set(null);
    this.editingCategoryData.set(null);
  }

  closeDeleteConfirm(): void {
    this.deleteConfirmOpen.set(false);
    this.pendingDelete.set(null);
  }

  confirmDelete(): void {
    const category = this.pendingDelete();
    if (!this.canWrite() || !category) {
      return;
    }

    this.loading.set(true);
    this.catalogService.deleteBusinessCategory(category._id).subscribe({
      next: () => {
        this.toast.success(this.translate.instant('businessCategories.messages.deleted'));
        this.closeDeleteConfirm();
        this.loadCategories();
      },
      error: () => {
        this.loading.set(false);
        this.toast.error(this.translate.instant('businessCategories.messages.deleteError'));
      },
    });
  }

  get deleteMessage(): string {
    return this.translate.instant('businessCategories.delete.message', {
      name: this.pendingDelete()?.name ?? '',
    });
  }

  private loadCategories(): void {
    this.loading.set(true);
    this.catalogService.listBusinessCategories({ page: 1, limit: 5000, sort: 'name', order: 'asc' }).subscribe({
      next: (response) => {
        this.categories.set(response.data ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error(this.translate.instant('businessCategories.messages.loadError'));
      },
    });
  }

  private openEdit(category: BusinessCategory): void {
    if (!this.canWrite()) {
      return;
    }

    this.editingCategoryId.set(category._id);
    this.editingCategoryData.set({
      name: category.name,
      description: category.description ?? '',
      status: category.status ?? 'ACTIVE',
    });
    this.categoryFormOpen.set(true);
  }

  private requestDelete(category: BusinessCategory): void {
    if (!this.canWrite()) {
      return;
    }

    this.pendingDelete.set(category);
    this.deleteConfirmOpen.set(true);
  }

  private startBulkUploadPoll(jobId: string): void {
    this.stopBulkUploadPoll();

    const poll = () => {
      this.catalogService.getBusinessCategoryBulkUploadStatus(jobId).subscribe({
        next: (response) => {
          const job = response.data;
          if (job?.isTerminal) {
            this.stopBulkUploadPoll();
            this.handleBulkUploadCompletion(job);
          }
        },
        error: () => {
          this.stopBulkUploadPoll();
          this.toast.error(this.translate.instant('businessCategories.messages.importStatusError'));
        },
      });
    };

    poll();
    this.bulkUploadPollTimer = setInterval(poll, 3000);
  }

  private stopBulkUploadPoll(): void {
    if (this.bulkUploadPollTimer !== null) {
      clearInterval(this.bulkUploadPollTimer);
      this.bulkUploadPollTimer = null;
    }
  }

  private handleBulkUploadCompletion(job: TemplateCategoryBulkUploadJobStatus): void {
    const totals = job.totals;

    if (job.status === 'COMPLETED') {
      this.toast.success(
        this.translate.instant('businessCategories.messages.importCompleted', {
          count: totals?.successRows || 0,
        }),
      );
      this.loadCategories();
      return;
    }

    if (job.status === 'COMPLETED_WITH_ERRORS') {
      this.toast.warning(
        this.translate.instant('businessCategories.messages.importCompletedWithErrors', {
          created: totals?.successRows || 0,
          failed: totals?.failedRows || 0,
        }),
      );
      this.loadCategories();
      return;
    }

    if (job.status === 'FAILED') {
      this.toast.error(job.errorMessage || this.translate.instant('businessCategories.messages.importFailed'));
    }
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