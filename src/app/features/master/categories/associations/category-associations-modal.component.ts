import { Component, EventEmitter, inject, Input, OnChanges, Output, signal, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { GomModalComponent, GomButtonComponent, GomTabsComponent, GomTabContentComponent, TabItem } from '@gomlibs/ui';
import { GomAlertToastService } from '@gomlibs/ui';
import { Observable, forkJoin } from 'rxjs';
import {
  AssociationItem,
  AssociationResourceType,
  AvailableAssociationResourceType,
  AvailableAssociations,
  CategoriesService,
  Category,
  CategoryAssociations,
  PaginationMeta,
  UpdateAssociationsPayload,
} from '../categories.service';

interface ApiSuccess<T> { success: boolean; data: T; }

export interface CategoryAssociationsApiProvider {
  getAssociations(id: string): Observable<ApiSuccess<CategoryAssociations>>;
  getAvailableAssociations(id: string): Observable<ApiSuccess<AvailableAssociations>>;
  getAssociationsResource?(id: string, params: { resource: AssociationResourceType; page?: number; limit?: number; search?: string }): Observable<{ success: boolean; data: AssociationItem[]; pagination: PaginationMeta }>;
  getAvailableAssociationsResource?(id: string, params: { resource: AvailableAssociationResourceType; page?: number; limit?: number; search?: string }): Observable<{ success: boolean; data: AssociationItem[]; pagination: PaginationMeta }>;
  updateAssociations(id: string, payload: UpdateAssociationsPayload): Observable<ApiSuccess<CategoryAssociations>>;
}

@Component({
  selector: 'gom-category-associations-modal',
  standalone: true,
  imports: [CommonModule, TranslateModule, GomModalComponent, GomButtonComponent, GomTabsComponent, GomTabContentComponent],
  templateUrl: './category-associations-modal.component.html',
  styleUrl: './category-associations-modal.component.scss',
})
export class CategoryAssociationsModalComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() category: Category | null = null;
  @Input() apiProvider: CategoryAssociationsApiProvider | null = null;
  @Output() closed = new EventEmitter<void>();
  @Output() updated = new EventEmitter<void>();

  private readonly defaultService = inject(CategoriesService);
  private readonly toast = inject(GomAlertToastService);
  private readonly translate = inject(TranslateService);

  private get api(): CategoryAssociationsApiProvider {
    return this.apiProvider || this.defaultService;
  }

  loading = signal(false);
  saving = signal(false);
  activeTab = signal('fieldGroups');

  fieldGroups = signal<AssociationItem[]>([]);
  units = signal<AssociationItem[]>([]);
  groups = signal<AssociationItem[]>([]);

  availableFieldGroups = signal<AssociationItem[]>([]);
  availableUnits = signal<AssociationItem[]>([]);

  readonly fieldGroupsPage = signal(1);
  readonly unitsPage = signal(1);
  readonly groupsPage = signal(1);
  readonly availableFieldGroupsPage = signal(1);
  readonly availableUnitsPage = signal(1);
  readonly associationPageSize = signal(50);

  readonly fieldGroupsPagination = signal<PaginationMeta | null>(null);
  readonly unitsPagination = signal<PaginationMeta | null>(null);
  readonly groupsPagination = signal<PaginationMeta | null>(null);
  readonly availableFieldGroupsPagination = signal<PaginationMeta | null>(null);
  readonly availableUnitsPagination = signal<PaginationMeta | null>(null);

  showAddFieldGroup = signal(false);
  showAddUnit = signal(false);

  readonly tabs: TabItem[] = [
    { id: 'fieldGroups', label: 'categories.associations.tabs.fieldGroups' },
    { id: 'units', label: 'categories.associations.tabs.units' },
    { id: 'groups', label: 'categories.associations.tabs.groups' },
  ];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen && this.category?._id) {
      this.loadAssociations();
    }
  }

  switchTab(tabId: string | number): void {
    this.activeTab.set(String(tabId));
    this.showAddFieldGroup.set(false);
    this.showAddUnit.set(false);
  }

  onClose(): void {
    this.showAddFieldGroup.set(false);
    this.showAddUnit.set(false);
    this.closed.emit();
  }

  loadAssociations(): void {
    if (!this.category?._id) return;
    this.loading.set(true);

    if (this.api.getAssociationsResource) {
      const limit = this.associationPageSize();
      forkJoin({
        fieldGroups: this.api.getAssociationsResource(this.category._id, { resource: 'fieldGroups', page: this.fieldGroupsPage(), limit }),
        units: this.api.getAssociationsResource(this.category._id, { resource: 'units', page: this.unitsPage(), limit }),
        groups: this.api.getAssociationsResource(this.category._id, { resource: 'groups', page: this.groupsPage(), limit }),
      }).subscribe({
        next: (res) => {
          this.fieldGroups.set(res.fieldGroups.data || []);
          this.units.set(res.units.data || []);
          this.groups.set(res.groups.data || []);
          this.fieldGroupsPagination.set(res.fieldGroups.pagination || null);
          this.unitsPagination.set(res.units.pagination || null);
          this.groupsPagination.set(res.groups.pagination || null);
          this.loading.set(false);
        },
        error: () => {
          this.toast.error(this.translate.instant('categories.associations.errorLoad'));
          this.loading.set(false);
        },
      });
      return;
    }

    this.api.getAssociations(this.category._id).subscribe({
      next: (res) => {
        this.fieldGroups.set(res.data.fieldGroups);
        this.units.set(res.data.units);
        this.groups.set(res.data.groups);
        this.loading.set(false);
      },
      error: () => {
        this.toast.error(this.translate.instant('categories.associations.errorLoad'));
        this.loading.set(false);
      },
    });
  }

  toggleAddFieldGroup(): void {
    if (this.showAddFieldGroup()) {
      this.showAddFieldGroup.set(false);
      return;
    }
    this.loadAvailable('fieldGroups');
  }

  toggleAddUnit(): void {
    if (this.showAddUnit()) {
      this.showAddUnit.set(false);
      return;
    }
    this.loadAvailable('units');
  }

  private loadAvailable(type: 'fieldGroups' | 'units'): void {
    if (!this.category?._id) return;
    this.loading.set(true);

    if (this.api.getAvailableAssociationsResource) {
      const page = type === 'fieldGroups' ? this.availableFieldGroupsPage() : this.availableUnitsPage();
      const limit = this.associationPageSize();
      this.api.getAvailableAssociationsResource(this.category._id, { resource: type, page, limit }).subscribe({
        next: (res) => {
          if (type === 'fieldGroups') {
            this.availableFieldGroups.set(res.data || []);
            this.availableFieldGroupsPagination.set(res.pagination || null);
            this.showAddFieldGroup.set(true);
          } else {
            this.availableUnits.set(res.data || []);
            this.availableUnitsPagination.set(res.pagination || null);
            this.showAddUnit.set(true);
          }
          this.loading.set(false);
        },
        error: () => {
          this.toast.error(this.translate.instant('categories.associations.errorLoad'));
          this.loading.set(false);
        },
      });
      return;
    }

    this.api.getAvailableAssociations(this.category._id).subscribe({
      next: (res) => {
        if (type === 'fieldGroups') {
          this.availableFieldGroups.set(res.data.fieldGroups);
          this.showAddFieldGroup.set(true);
        } else {
          this.availableUnits.set(res.data.units);
          this.showAddUnit.set(true);
        }
        this.loading.set(false);
      },
      error: () => {
        this.toast.error(this.translate.instant('categories.associations.errorLoad'));
        this.loading.set(false);
      },
    });
  }

  previousPage(resource: 'fieldGroups' | 'units' | 'groups' | 'availableFieldGroups' | 'availableUnits'): void {
    if (resource === 'fieldGroups' && this.fieldGroupsPage() > 1) {
      this.fieldGroupsPage.update((p) => p - 1);
      this.loadAssociations();
      return;
    }
    if (resource === 'units' && this.unitsPage() > 1) {
      this.unitsPage.update((p) => p - 1);
      this.loadAssociations();
      return;
    }
    if (resource === 'groups' && this.groupsPage() > 1) {
      this.groupsPage.update((p) => p - 1);
      this.loadAssociations();
      return;
    }
    if (resource === 'availableFieldGroups' && this.availableFieldGroupsPage() > 1) {
      this.availableFieldGroupsPage.update((p) => p - 1);
      this.loadAvailable('fieldGroups');
      return;
    }
    if (resource === 'availableUnits' && this.availableUnitsPage() > 1) {
      this.availableUnitsPage.update((p) => p - 1);
      this.loadAvailable('units');
    }
  }

  nextPage(resource: 'fieldGroups' | 'units' | 'groups' | 'availableFieldGroups' | 'availableUnits'): void {
    if (resource === 'fieldGroups' && this.fieldGroupsPagination()?.hasMore) {
      this.fieldGroupsPage.update((p) => p + 1);
      this.loadAssociations();
      return;
    }
    if (resource === 'units' && this.unitsPagination()?.hasMore) {
      this.unitsPage.update((p) => p + 1);
      this.loadAssociations();
      return;
    }
    if (resource === 'groups' && this.groupsPagination()?.hasMore) {
      this.groupsPage.update((p) => p + 1);
      this.loadAssociations();
      return;
    }
    if (resource === 'availableFieldGroups' && this.availableFieldGroupsPagination()?.hasMore) {
      this.availableFieldGroupsPage.update((p) => p + 1);
      this.loadAvailable('fieldGroups');
      return;
    }
    if (resource === 'availableUnits' && this.availableUnitsPagination()?.hasMore) {
      this.availableUnitsPage.update((p) => p + 1);
      this.loadAvailable('units');
    }
  }

  loadAll(resource: 'fieldGroups' | 'units' | 'groups' | 'availableFieldGroups' | 'availableUnits'): void {
    const categoryId = this.category?._id;
    if (!categoryId) {
      return;
    }

    this.loading.set(true);
    const loadAssociated = (key: AssociationResourceType, total: number) => {
      if (!this.api.getAssociationsResource) {
        this.loading.set(false);
        return;
      }
      this.api.getAssociationsResource(categoryId, { resource: key, page: 1, limit: total }).subscribe({
        next: (res) => {
          if (key === 'fieldGroups') {
            this.fieldGroups.set(res.data || []);
            this.fieldGroupsPagination.set({ ...res.pagination, hasMore: false, canLoadAll: false });
          } else if (key === 'units') {
            this.units.set(res.data || []);
            this.unitsPagination.set({ ...res.pagination, hasMore: false, canLoadAll: false });
          } else {
            this.groups.set(res.data || []);
            this.groupsPagination.set({ ...res.pagination, hasMore: false, canLoadAll: false });
          }
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
    };

    const loadAvailable = (key: AvailableAssociationResourceType, total: number) => {
      if (!this.api.getAvailableAssociationsResource) {
        this.loading.set(false);
        return;
      }
      this.api.getAvailableAssociationsResource(categoryId, { resource: key, page: 1, limit: total }).subscribe({
        next: (res) => {
          if (key === 'fieldGroups') {
            this.availableFieldGroups.set(res.data || []);
            this.availableFieldGroupsPagination.set({ ...res.pagination, hasMore: false, canLoadAll: false });
          } else {
            this.availableUnits.set(res.data || []);
            this.availableUnitsPagination.set({ ...res.pagination, hasMore: false, canLoadAll: false });
          }
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
    };

    if (resource === 'fieldGroups' && this.fieldGroupsPagination()) {
      loadAssociated('fieldGroups', this.fieldGroupsPagination()!.total);
      return;
    }
    if (resource === 'units' && this.unitsPagination()) {
      loadAssociated('units', this.unitsPagination()!.total);
      return;
    }
    if (resource === 'groups' && this.groupsPagination()) {
      loadAssociated('groups', this.groupsPagination()!.total);
      return;
    }
    if (resource === 'availableFieldGroups' && this.availableFieldGroupsPagination()) {
      loadAvailable('fieldGroups', this.availableFieldGroupsPagination()!.total);
      return;
    }
    if (resource === 'availableUnits' && this.availableUnitsPagination()) {
      loadAvailable('units', this.availableUnitsPagination()!.total);
      return;
    }

    this.loading.set(false);
  }

  addFieldGroup(item: AssociationItem): void {
    this.patchAssociation({ addFieldGroupIds: [item._id] });
  }

  removeFieldGroup(item: AssociationItem): void {
    this.patchAssociation({ removeFieldGroupIds: [item._id] });
  }

  addUnit(item: AssociationItem): void {
    this.patchAssociation({ addUnitIds: [item._id] });
  }

  removeUnit(item: AssociationItem): void {
    this.patchAssociation({ removeUnitIds: [item._id] });
  }

  private patchAssociation(payload: UpdateAssociationsPayload): void {
    if (!this.category?._id) return;
    this.saving.set(true);

    this.api.updateAssociations(this.category._id, payload).subscribe({
      next: (res) => {
        this.saving.set(false);
        this.showAddFieldGroup.set(false);
        this.showAddUnit.set(false);
        this.loadAssociations();
        this.toast.success(this.translate.instant('categories.associations.updated'));
        this.updated.emit();
      },
      error: (err) => {
        this.toast.error(err?.error?.message || this.translate.instant('categories.associations.errorUpdate'));
        this.saving.set(false);
      },
    });
  }
}
