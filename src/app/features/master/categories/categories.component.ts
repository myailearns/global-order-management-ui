import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { CATEGORY_DEFAULT_STATUS, CATEGORY_UI_TEXT } from './categories.constants';
import { CategoriesService, Category } from './categories.service';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { CategoriesListComponent, CategoryAction } from './list/categories-list.component';
import { CategoriesFormComponent, CategoryFormData } from './form/categories-form.component';
import { CategoriesViewComponent } from './view/categories-view.component';
import { CategoryAssociationsModalComponent } from './associations/category-associations-modal.component';
import { GomAlertToastService, GomButtonComponent, GomConfirmationModalComponent, GomTableQuery } from '@gomlibs/ui';

@Component({
  selector: 'gom-categories',
  standalone: true,
  imports: [CommonModule, TranslateModule, CategoriesListComponent, CategoriesFormComponent, CategoriesViewComponent, CategoryAssociationsModalComponent, GomConfirmationModalComponent, GomButtonComponent],
  templateUrl: './categories.component.html',
  styleUrl: './categories.component.scss'
})
export class CategoriesComponent implements OnInit {
  private readonly categoriesService = inject(CategoriesService);
  private readonly toast = inject(GomAlertToastService);
  private readonly translate = inject(TranslateService);
  private readonly authSession = inject(AuthSessionService);

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

  ngOnInit() {
    this.loadCategories();
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

  onAssociationsClosed(): void {
    this.associationsOpen.set(false);
    this.associationsCategory.set(null);
  }
}
