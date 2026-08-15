import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { CATEGORY_DEFAULT_STATUS, CATEGORY_UI_TEXT } from './categories.constants';
import { CategoriesService, Category } from './categories.service';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { CategoriesListComponent, CategoryAction } from './list/categories-list.component';
import { CategoriesFormComponent, CategoryFormData } from './form/categories-form.component';
import { CategoriesViewComponent } from './view/categories-view.component';
import { CategoryAssociationsModalComponent } from './associations/category-associations-modal.component';
import { CategoryBulkUploadService, CategoryBulkUploadJobStatus, CategoryBulkUploadJobResults } from './bulk-upload/category-bulk-upload.service';
import { GomAlertToastService, GomButtonComponent, GomConfirmationModalComponent, GomModalComponent, GomTableQuery } from '@gomlibs/ui';

@Component({
  selector: 'gom-categories',
  standalone: true,
  imports: [CommonModule, TranslateModule, CategoriesListComponent, CategoriesFormComponent, CategoriesViewComponent, CategoryAssociationsModalComponent, GomConfirmationModalComponent, GomButtonComponent, GomModalComponent],
  templateUrl: './categories.component.html',
  styleUrl: './categories.component.scss'
})
export class CategoriesComponent implements OnInit, OnDestroy {
  private readonly categoriesService = inject(CategoriesService);
  private readonly bulkUploadService = inject(CategoryBulkUploadService);
  private readonly toast = inject(GomAlertToastService);
  private readonly translate = inject(TranslateService);
  private readonly authSession = inject(AuthSessionService);
  private bulkUploadPollTimer: ReturnType<typeof setInterval> | null = null;

  readonly text = CATEGORY_UI_TEXT;
  readonly defaultStatus = CATEGORY_DEFAULT_STATUS;
  readonly canViewCategory = computed(() => this.authSession.hasFeature('category.list'));
  readonly canCreateCategory = computed(() => this.authSession.hasFeature('category.create'));
  readonly canEditCategory = computed(() => this.authSession.hasFeature('category.edit'));
  readonly canDeleteCategory = computed(() => this.authSession.hasFeature('category.delete'));
  readonly categoryCreateLimit = computed(() => this.authSession.getFeatureConfigNumber('category.create', 'max_count'));
  readonly categoryCreateUsed = computed(() => this.categories().length);
  readonly categoryCreateRemaining = computed(() => {
    const limit = this.categoryCreateLimit();
    if (limit === null) {
      return null;
    }

    return Math.max(limit - this.categoryCreateUsed(), 0);
  });
  readonly selectedCategoryFormData = computed<CategoryFormData | null>(() => {
    const category = this.selectedCategory();
    if (!category) {
      return null;
    }

    return {
      name: category.name,
      description: category.description || '',
      imageAssetId: category.imageAssetId ?? null,
      imageUrl: category.imageUrl || '',
      status: category.status || this.defaultStatus,
    };
  });

  categories = signal<Category[]>([]);
  loading = signal(false);
  formOpen = signal(false);
  selectedCategory = signal<Category | null>(null);
  viewOpen = signal(false);
  viewingCategory = signal<Category | null>(null);
  pendingDeleteCategory = signal<Category | null>(null);
  deleteConfirmOpen = signal(false);
  errorMessage = signal<string | null>(null);
  associationsOpen = signal(false);
  associationsCategory = signal<Category | null>(null);

  readonly totalCategories = signal(0);
  readonly categoryTablePageIndex = signal(0);
  readonly categoryTablePageSize = signal(50);
  readonly canLoadAllCategories = signal(false);
  readonly allCategoriesLoaded = signal(false);
  readonly serverSidePaginationCategories = computed(() => this.totalCategories() > 500);
  readonly categoryTableDataMode = computed<'client' | 'server'>(() => (this.serverSidePaginationCategories() && !this.allCategoriesLoaded() ? 'server' : 'client'));

  // Bulk upload/download signals
  readonly templateDownloading = signal(false);
  readonly templateUploading = signal(false);
  
  // Support multiple unacknowledged jobs
  readonly bulkUploadJobs = signal<CategoryBulkUploadJobStatus[]>([]);
  readonly currentViewingJobId = signal<string | null>(null);
  
  readonly showBulkUploadResultModal = signal(false);
  readonly bulkUploadResults = signal<CategoryBulkUploadJobResults | null>(null);
  readonly bulkUploadResultsLoading = signal(false);

  ngOnInit() {
    this.loadCategories();
    this.checkForAttentionJob();
  }

  ngOnDestroy() {
    if (this.bulkUploadPollTimer) {
      clearInterval(this.bulkUploadPollTimer);
      this.bulkUploadPollTimer = null;
    }
  }

  loadCategories() {
    if (!this.canViewCategory()) {
      this.categories.set([]);
      this.loading.set(false);
      this.errorMessage.set(null);
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);
    this.categoryTablePageIndex.set(0);
    this.allCategoriesLoaded.set(false);

    this.categoriesService.getCategories(1, this.categoryTablePageSize()).subscribe({
      next: (response) => {
        const pagination = response.pagination;
        this.totalCategories.set(pagination.total);
        this.canLoadAllCategories.set(pagination.canLoadAll);
        this.allCategoriesLoaded.set(pagination.total <= 500);

        if (pagination.total <= 500 && pagination.hasMore) {
          this.categoriesService.getCategories(1, pagination.total).subscribe({
            next: (allRes) => this.categories.set(allRes.data || []),
          });
        } else {
          this.categories.set(response.data || []);
        }
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading categories:', error);
        this.errorMessage.set(this.translate.instant(this.text.errorLoad));
        this.loading.set(false);
      }
    });
  }

  onCategoryTableQueryChange(query: GomTableQuery): void {
    if (this.categoryTableDataMode() !== 'server') {
      return;
    }

    this.loading.set(true);

    const search = query.searchTerm?.trim();
    const sortBy = query.sort?.key;
    const order = query.sort?.direction as 'asc' | 'desc' | undefined;

    this.categoriesService.getCategories(query.pageIndex + 1, query.pageSize, undefined, search, sortBy, order).subscribe({
      next: (res) => {
        this.allCategoriesLoaded.set(false);
        this.categories.set(res.data ?? []);
        this.totalCategories.set(res.pagination.total);
        this.canLoadAllCategories.set(res.pagination.canLoadAll);
        this.categoryTablePageIndex.set(query.pageIndex);
        this.categoryTablePageSize.set(query.pageSize);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  loadAllCategories(): void {
    this.loading.set(true);
    this.categoriesService.getCategories(1, this.totalCategories()).subscribe({
      next: (res) => {
        this.categories.set(res.data ?? []);
        this.totalCategories.set(res.pagination.total);
        this.canLoadAllCategories.set(false);
        this.allCategoriesLoaded.set(true);
        this.categoryTablePageIndex.set(0);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onAddNew() {
    if (!this.canCreateCategory()) {
      return;
    }
    this.onViewClose();
    this.selectedCategory.set(null);
    this.formOpen.set(true);
  }

  onAction(action: CategoryAction) {
    if (action.action === 'view') {
      this.viewingCategory.set(action.category);
      this.viewOpen.set(true);
    }

    if (action.action === 'edit') {
      if (!this.canEditCategory()) {
        return;
      }
      this.onViewClose();
      this.selectedCategory.set(action.category);
      this.formOpen.set(true);
    }

    if (action.action === 'delete') {
      if (!this.canDeleteCategory()) {
        return;
      }
      this.requestDeleteCategory(action.category);
    }

    if (action.action === 'manage') {
      this.associationsCategory.set(action.category);
      this.associationsOpen.set(true);
    }
  }

  private requestDeleteCategory(category: Category): void {
    this.onViewClose();
    this.pendingDeleteCategory.set(category);
    this.deleteConfirmOpen.set(true);
  }

  onViewClose(): void {
    this.viewOpen.set(false);
    this.viewingCategory.set(null);
  }

  onViewEdit(category: Category): void {
    if (!this.canEditCategory()) {
      return;
    }
    this.onViewClose();
    this.selectedCategory.set(category);
    this.formOpen.set(true);
  }

  onViewDelete(category: Category): void {
    if (!this.canDeleteCategory()) {
      return;
    }
    this.onViewClose();
    this.requestDeleteCategory(category);
  }

  onDeleteCancelled(): void {
    this.deleteConfirmOpen.set(false);
    this.pendingDeleteCategory.set(null);
  }

  onDeleteConfirmed(): void {
    if (!this.canDeleteCategory()) {
      this.onDeleteCancelled();
      return;
    }

    const category = this.pendingDeleteCategory();
    if (!category) {
      return;
    }

    if (!category._id) {
      this.errorMessage.set(this.translate.instant(this.text.errorDeleteMissingId));
      this.onDeleteCancelled();
      return;
    }

    this.deleteConfirmOpen.set(false);

    this.loading.set(true);
    this.errorMessage.set(null);

    this.categoriesService.deleteCategory(category._id).subscribe({
      next: () => {
        this.pendingDeleteCategory.set(null);
        this.toast.success(this.translate.instant(this.text.successDelete));
        this.loadCategories();
      },
      error: (error) => {
        console.error('Error deleting category:', error);
        const msg = error?.error?.message || this.translate.instant(this.text.errorDelete);
        this.errorMessage.set(msg);
        this.toast.error(msg);
        this.pendingDeleteCategory.set(null);
        this.loading.set(false);
      },
    });
  }

  onFormSubmit(data: CategoryFormData) {
    const selected = this.selectedCategory();
    const isEdit = !!selected?._id;
    const canProceed = isEdit ? this.canEditCategory() : this.canCreateCategory();
    if (!canProceed) {
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    const request = selected?._id
      ? this.categoriesService.updateCategory(selected._id, data)
      : this.categoriesService.createCategory(data);

    request.subscribe({
      next: () => {
        this.formOpen.set(false);
        this.selectedCategory.set(null);
        this.toast.success(this.translate.instant(isEdit ? this.text.successUpdate : this.text.successCreate));
        this.loadCategories();
      },
      error: (error) => {
        console.error('Error saving category:', error);
        const msg = String(error?.error?.message || this.translate.instant(this.text.errorSave));
        this.errorMessage.set(msg);
        this.toast.error(msg);
        this.loading.set(false);
      }
    });
  }

  getDeleteMessage(): string {
    return this.translate.instant(this.text.deleteMessage, { name: this.pendingDeleteCategory()?.name || '' });
  }

  onFormCancel() {
    this.formOpen.set(false);
    this.selectedCategory.set(null);
  }


  /**
   * Download category bulk upload template (Excel)
   */
  downloadTemplate(): void {
    if (!this.canCreateCategory()) {
      this.toast.warning('You do not have permission to download the template.');
      return;
    }

    this.templateDownloading.set(true);
    this.bulkUploadService.downloadTemplate().subscribe({
      next: (blob) => {
        const timestamp = new Date().toISOString().split('T')[0];
        this.bulkUploadService.triggerFileDownload(blob, `categories-template-${timestamp}.xlsx`);
        this.toast.success('Template downloaded successfully.');
        this.templateDownloading.set(false);
      },
      error: (err) => {
        console.error('Failed to download template:', err);
        this.toast.error('Failed to download template. Please try again.');
        this.templateDownloading.set(false);
      },
    });
  }

  /**
   * Upload categories from Excel file (job-based async processing)
   */
  uploadCategories(): void {
    if (!this.canCreateCategory()) {
      this.toast.warning('You do not have permission to upload categories.');
      return;
    }

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.xlsx,.xls';
    
    fileInput.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) return;

      // Validate file type
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel'
      ];
      const fileExtRegex = /\.(xlsx|xls)$/i;
      if (!validTypes.includes(file.type) && !fileExtRegex.exec(file.name)) {
        this.toast.error('Please upload a valid Excel file (.xlsx or .xls)');
        return;
      }

      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        this.toast.error('File size exceeds 10MB limit. Please upload a smaller file.');
        return;
      }

      this.templateUploading.set(true);
      this.errorMessage.set(null);

      this.bulkUploadService.uploadCategories(file).subscribe({
        next: (response) => {
          this.templateUploading.set(false);
          if (response.success && response.data?.jobId) {
            this.toast.info('Upload accepted. Processing categories...');
            // Polling will add the job to the jobs array
            this.startPollingJobStatus(response.data.jobId);
          } else {
            this.toast.error(response.message || 'Upload failed. Please try again.');
          }
        },
        error: (err) => {
          console.error('Failed to upload categories:', err);
          const errorMsg = err.error?.message || 'Failed to upload categories. Please check the file format and try again.';
          this.toast.error(errorMsg);
          this.errorMessage.set(errorMsg);
          this.templateUploading.set(false);
        },
      });
    };

    fileInput.click();
  }

  /**
   * Check for existing jobs that need attention (on init)
   */
  checkForAttentionJob(): void {
    this.bulkUploadService.getAttentionJob().subscribe({
      next: (response) => {
        if (response.success && response.data?.hasAttention && response.data.jobs) {
          this.bulkUploadJobs.set(response.data.jobs);
          
          // Start polling for any non-terminal jobs
          response.data.jobs.forEach(job => {
            if (!job.isTerminal) {
              this.startPollingJobStatus(job.jobId);
            }
          });
        }
      },
      error: (err) => {
        console.error('Failed to check attention jobs:', err);
      },
    });
  }

  /**
   * Start polling for job status (every 2 seconds)
   */
  startPollingJobStatus(jobId: string): void {
    if (this.bulkUploadPollTimer) {
      clearInterval(this.bulkUploadPollTimer);
    }
    
    this.bulkUploadPollTimer = setInterval(() => {
      this.bulkUploadService.getJobStatus(jobId).subscribe({
        next: (response) => {
          if (response.success && response.data) {
            // Update the specific job in the array
            const jobs = this.bulkUploadJobs();
            const index = jobs.findIndex(j => j.jobId === response.data.jobId);
            
            if (index >= 0) {
              jobs[index] = response.data;
              this.bulkUploadJobs.set([...jobs]);
            } else {
              this.bulkUploadJobs.set([...jobs, response.data]);
            }
            
            // Stop polling if job is terminal
            if (response.data.isTerminal) {
              if (this.bulkUploadPollTimer) {
                clearInterval(this.bulkUploadPollTimer);
                this.bulkUploadPollTimer = null;
              }
              
              // Show success/error toast
              const totals = response.data.totals;
              if (response.data.status === 'COMPLETED') {
                this.toast.success(`Successfully created ${totals?.successRows || 0} categories.`);
                this.loadCategories();
              } else if (response.data.status === 'COMPLETED_WITH_ERRORS') {
                this.toast.warning(`Created ${totals?.successRows || 0} categories. ${totals?.failedRows || 0} failed. Click "View Details" to review.`);
                this.loadCategories();
              } else if (response.data.status === 'FAILED') {
                this.toast.error(response.data.errorMessage || 'Upload failed.');
              }
            }
          }
        },
        error: (err) => {
          console.error('Failed to get job status:', err);
          if (this.bulkUploadPollTimer) {
            clearInterval(this.bulkUploadPollTimer);
            this.bulkUploadPollTimer = null;
          }
        },
      });
    }, 2000); // Poll every 2 seconds
  }

  /**
   * View bulk upload job results
   */
  viewBulkUploadResults(jobId: string): void {
    if (!jobId) return;
    
    this.currentViewingJobId.set(jobId);
    this.showBulkUploadResultModal.set(true);
    this.bulkUploadResultsLoading.set(true);
    
    this.bulkUploadService.getJobResults(jobId).subscribe({
      next: (response) => {
        this.bulkUploadResultsLoading.set(false);
        if (response.success && response.data) {
          this.bulkUploadResults.set(response.data);
        }
      },
      error: (err) => {
        console.error('Failed to load job results:', err);
        this.bulkUploadResultsLoading.set(false);
        this.toast.error('Failed to load job results.');
      },
    });
  }

  /**
   * Acknowledge job (user clicked "I am good")
   */
  acknowledgeBulkUploadJob(): void {
    const jobId = this.currentViewingJobId();
    if (!jobId) return;
    
    this.bulkUploadService.acknowledgeJob(jobId).subscribe({
      next: (response) => {
        if (response.success) {
          this.toast.success('Job acknowledged successfully.');
          
          // Remove job from list
          const jobs = this.bulkUploadJobs().filter(j => j.jobId !== jobId);
          this.bulkUploadJobs.set(jobs);
          
          // Close modal
          this.closeBulkUploadResults();
        }
      },
      error: (err) => {
        console.error('Failed to acknowledge job:', err);
        this.toast.error('Failed to acknowledge job.');
      },
    });
  }

  /**
   * Dismiss notification banner for a specific job
   */
  dismissBulkUploadNotification(jobId: string): void {
    const jobs = this.bulkUploadJobs().filter(j => j.jobId !== jobId);
    this.bulkUploadJobs.set(jobs);
  }

  /**
   * Close job results modal
   */
  closeBulkUploadResults(): void {
    this.showBulkUploadResultModal.set(false);
    this.bulkUploadResults.set(null);
  }

  onAssociationsClosed(): void {
    this.associationsOpen.set(false);
    this.associationsCategory.set(null);
  }
}
