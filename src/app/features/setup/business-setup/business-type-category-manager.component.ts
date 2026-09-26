import { Component, DestroyRef, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  GomAlertToastService,
  GomButtonComponent,
  GomModalComponent,
  GomTableColumn,
  GomTableComponent,
  GomTableRow,
} from '@gomlibs/ui';
import {
  BusinessTypeCategory,
  BusinessTypeCategoriesService,
} from './business-type-categories.service';

interface BusinessTypeCategoryRow extends GomTableRow {
  id: string;
  category: BusinessTypeCategory;
  name: string;
  code: string;
  sourceType: string;
  assignedProducts: string;
  status: string;
}

@Component({
  selector: 'gom-business-type-category-manager',
  standalone: true,
  imports: [TranslateModule, GomButtonComponent, GomModalComponent, GomTableComponent],
  templateUrl: './business-type-category-manager.component.html',
  styleUrl: './business-type-category-manager.component.scss',
})
export class BusinessTypeCategoryManagerComponent implements OnInit {
  private readonly businessTypeCategoriesService = inject(BusinessTypeCategoriesService);
  private readonly toast = inject(GomAlertToastService);
  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);

  businessTypeId = input.required<string>();
  businessTypeName = input.required<string>();
  closeManager = output<void>();
  categoriesUpdated = output<void>();

  readonly modalOpen = signal(true);
  readonly loading = signal(false);
  readonly categories = signal<BusinessTypeCategory[]>([]);
  readonly counts = signal({ all: 0, enabled: 0, disabled: 0 });
  readonly togglingCategoryId = signal<string | null>(null);
  readonly errorMessage = signal('');

  readonly modalTitle = computed(() => this.translate.instant(
    'businessSetup.categoryManager.title',
    { businessType: this.businessTypeName() },
  ));

  readonly rows = computed<BusinessTypeCategoryRow[]>(() =>
    this.categories().map((category) => ({
      id: category.platformCategoryId,
      category,
      name: category.name,
      code: category.code || '—',
      sourceType: this.translate.instant('businessSetup.categoryManager.source.platform'),
      assignedProducts: category.assignedProducts == null ? '—' : String(category.assignedProducts),
      status: this.translate.instant(
        category.enabled
          ? 'businessSetup.categoryManager.status.enabled'
          : 'businessSetup.categoryManager.status.disabled',
      ),
    })),
  );

  readonly columns: GomTableColumn<BusinessTypeCategoryRow>[] = [
    {
      key: 'name',
      header: this.translate.instant('businessSetup.categoryManager.columns.name'),
      sortable: true,
      filterable: true,
      textMode: 'wrap',
    },
    {
      key: 'code',
      header: this.translate.instant('businessSetup.categoryManager.columns.code'),
      sortable: true,
      width: '8rem',
    },
    {
      key: 'sourceType',
      header: this.translate.instant('businessSetup.categoryManager.columns.sourceType'),
      sortable: true,
      filterable: true,
      width: '10rem',
    },
    {
      key: 'assignedProducts',
      header: this.translate.instant('businessSetup.categoryManager.columns.assignedProducts'),
      width: '10rem',
      cellAlign: 'center',
      headerAlign: 'center',
    },
    {
      key: 'status',
      header: this.translate.instant('businessSetup.categoryManager.columns.status'),
      sortable: true,
      filterable: true,
      width: '8rem',
      chipTone: (_value, row) => row.category.enabled ? 'success' : 'neutral',
    },
    {
      key: 'id',
      header: this.translate.instant('businessSetup.categoryManager.columns.actions'),
      width: '10rem',
      actionButtons: [
        {
          label: (row) => this.translate.instant(
            this.togglingCategoryId() === row.id
              ? 'businessSetup.categoryManager.actions.updating'
              : row.category.enabled
                ? 'businessSetup.categoryManager.actions.disable'
                : 'businessSetup.categoryManager.actions.enable',
          ),
          icon: (row) => row.category.enabled ? 'ri-forbid-line' : 'ri-check-line',
          actionKey: 'toggle',
          variant: 'secondary',
          disabled: () => this.togglingCategoryId() !== null,
        },
      ],
    },
  ];

  ngOnInit(): void {
    this.loadCategories();
  }

  loadCategories(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.businessTypeCategoriesService
      .listCategories(this.businessTypeId())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          const data = response.data;
          this.categories.set(data.items || []);
          this.counts.set(data.counts || { all: 0, enabled: 0, disabled: 0 });
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          const message = err?.error?.message
            || this.translate.instant('businessSetup.categoryManager.messages.loadError');
          this.errorMessage.set(message);
          this.toast.error(message);
        },
      });
  }

  onRowAction(event: { actionKey: string; row: BusinessTypeCategoryRow }): void {
    if (event.actionKey === 'toggle') {
      this.toggleCategoryEnabled(event.row.category);
    }
  }

  toggleCategoryEnabled(category: BusinessTypeCategory): void {
    if (this.togglingCategoryId()) return;

    this.togglingCategoryId.set(category.platformCategoryId);
    const newEnabled = !category.enabled;

    this.businessTypeCategoriesService
      .updateCategory(this.businessTypeId(), category.platformCategoryId, { enabled: newEnabled })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          const data = response.data;
          const updatedCategory = data.items.find(
            (c) => c.platformCategoryId === category.platformCategoryId
          );
          if (updatedCategory) {
            this.categories.update((items) => items.map((item) => (
              item.platformCategoryId === updatedCategory.platformCategoryId ? updatedCategory : item
            )));
          }
          this.counts.set(data.counts || { all: 0, enabled: 0, disabled: 0 });
          this.togglingCategoryId.set(null);

          this.toast.success(this.translate.instant(
            newEnabled
              ? 'businessSetup.categoryManager.messages.enabled'
              : 'businessSetup.categoryManager.messages.disabled',
            { name: category.name },
          ));
          this.categoriesUpdated.emit();
        },
        error: (err) => {
          this.togglingCategoryId.set(null);
          const message = err?.error?.message
            || this.translate.instant('businessSetup.categoryManager.messages.updateError');
          this.toast.error(message);
        },
      });
  }

  close(): void {
    this.modalOpen.set(false);
    this.closeManager.emit();
  }
}
