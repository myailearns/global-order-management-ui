import { Component, EventEmitter, inject, Input, OnChanges, Output, signal, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { GomModalComponent, GomButtonComponent, GomTabsComponent, GomTabContentComponent, TabItem } from '@gomlibs/ui';
import { GomAlertToastService } from '@gomlibs/ui';
import { Observable } from 'rxjs';
import {
  AssociationItem,
  AvailableAssociations,
  CategoriesService,
  Category,
  CategoryAssociations,
  UpdateAssociationsPayload,
} from '../categories.service';

interface ApiSuccess<T> { success: boolean; data: T; }

export interface CategoryAssociationsApiProvider {
  getAssociations(id: string): Observable<ApiSuccess<CategoryAssociations>>;
  getAvailableAssociations(id: string): Observable<ApiSuccess<AvailableAssociations>>;
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
        this.fieldGroups.set(res.data.fieldGroups);
        this.units.set(res.data.units);
        this.groups.set(res.data.groups);
        this.saving.set(false);
        this.showAddFieldGroup.set(false);
        this.showAddUnit.set(false);
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
