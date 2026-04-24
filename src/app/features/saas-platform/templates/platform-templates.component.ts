import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  GomConfirmationModalComponent, GomAlertToastService,
  GomTableComponent, GomTableColumn, GomTableRow,
  GomButtonComponent,
  GomTabsComponent, GomTabContentComponent, TabItem,
  GomSelectOption,
} from '@gomlibs/ui';
import { CategoriesFormComponent, CategoryFormData } from '../../master/categories';
import { FieldsFormComponent, FieldFormSubmitData, FieldFormData, FieldGroupAssignOption } from '../../master/fields';
import { UnitsFormComponent, UnitFormData, UnitPayload, UnitAssignOption } from '../../master/units';
import { TaxProfilesFormComponent, TaxProfileFormData, TaxProfileFormPayload } from '../../master/tax-profiles';
import { FieldGroupsFormComponent } from '../../master/field-groups';
import { FieldGroup, FieldGroupPayload, PricingField, CategoryOption, ProductGroupUsage } from '../../master/field-groups/field-groups.service';
import { CategoryAssociationsModalComponent, CategoryAssociationsApiProvider } from '../../master/categories/associations/category-associations-modal.component';
import { Category } from '../../master/categories/categories.service';
import {
  TemplateCatalogService,
  TemplateCategory,
  TemplateField,
  TemplateUnit,
  TemplateTaxProfile,
  TemplateFieldGroup,
} from './template-catalog.service';

@Component({
  selector: 'gom-platform-templates',
  standalone: true,
  imports: [
    CommonModule,
    GomConfirmationModalComponent, GomTableComponent, GomButtonComponent,
    GomTabsComponent, GomTabContentComponent,
    CategoriesFormComponent, FieldsFormComponent, UnitsFormComponent,
    TaxProfilesFormComponent, FieldGroupsFormComponent,
    CategoryAssociationsModalComponent,
  ],
  templateUrl: './platform-templates.component.html',
  styleUrl: './platform-templates.component.scss',
})
export class PlatformTemplatesComponent implements OnInit {
  private readonly catalogService = inject(TemplateCatalogService);
  private readonly toast = inject(GomAlertToastService);

  // --- Tabs ---
  readonly tabs: TabItem[] = [
    { id: 'categories', label: 'Categories' },
    { id: 'fields', label: 'Fields' },
    { id: 'field-groups', label: 'Field Groups' },
    { id: 'units', label: 'Units' },
    { id: 'tax-profiles', label: 'Tax Profiles' },
  ];
  activeTab = signal<string | number>('categories');
  loading = signal(false);

  // --- Table column configs ---
  readonly categoryColumns: GomTableColumn<GomTableRow>[] = [
    { key: 'name', header: 'Name', sortable: true, filterable: true },
    { key: 'description', header: 'Description', filterable: true, textMode: 'wrap' },
    { key: 'status', header: 'Status', sortable: true },
    { key: 'actions', header: 'Actions', width: '14rem', actionButtons: [
      { label: 'Manage', actionKey: 'manage', variant: 'secondary', icon: 'ri-links-line' },
      { label: 'Edit', actionKey: 'edit', variant: 'secondary' },
      { label: 'Delete', actionKey: 'delete', variant: 'secondary' },
    ]},
  ];

  readonly fieldColumns: GomTableColumn<GomTableRow>[] = [
    { key: 'name', header: 'Name', sortable: true, filterable: true },
    { key: 'key', header: 'Key', sortable: true, filterable: true },
    { key: 'type', header: 'Type', sortable: true },
    { key: 'defaultValue', header: 'Default' },
    { key: 'status', header: 'Status', sortable: true },
    { key: 'actions', header: 'Actions', width: '10rem', actionButtons: [
      { label: 'Edit', actionKey: 'edit', variant: 'secondary' },
      { label: 'Delete', actionKey: 'delete', variant: 'secondary' },
    ]},
  ];

  readonly fieldGroupColumns: GomTableColumn<GomTableRow>[] = [
    { key: 'name', header: 'Name', sortable: true, filterable: true },
    { key: 'version', header: 'Version' },
    { key: 'fieldsCount', header: 'Fields Count' },
    { key: 'categoriesCount', header: 'Categories' },
    { key: 'actions', header: 'Actions', width: '10rem', actionButtons: [
      { label: 'Edit', actionKey: 'edit', variant: 'secondary' },
      { label: 'Delete', actionKey: 'delete', variant: 'secondary' },
    ]},
  ];

  readonly unitColumns: GomTableColumn<GomTableRow>[] = [
    { key: 'name', header: 'Name', sortable: true, filterable: true },
    { key: 'symbol', header: 'Symbol', sortable: true },
    { key: 'conversionFactor', header: 'Conversion' },
    { key: 'actions', header: 'Actions', width: '10rem', actionButtons: [
      { label: 'Edit', actionKey: 'edit', variant: 'secondary' },
      { label: 'Delete', actionKey: 'delete', variant: 'secondary' },
    ]},
  ];

  readonly taxProfileColumns: GomTableColumn<GomTableRow>[] = [
    { key: 'name', header: 'Name', sortable: true, filterable: true },
    { key: 'countryCode', header: 'Country' },
    { key: 'taxMode', header: 'Mode', sortable: true },
    { key: 'rateDisplay', header: 'Rate' },
    { key: 'inclusiveDisplay', header: 'Inclusive' },
    { key: 'hsnCode', header: 'HSN' },
    { key: 'actions', header: 'Actions', width: '10rem', actionButtons: [
      { label: 'Edit', actionKey: 'edit', variant: 'secondary' },
      { label: 'Delete', actionKey: 'delete', variant: 'secondary' },
    ]},
  ];

  // Categories (shared gom-categories-form)
  categories = signal<TemplateCategory[]>([]);
  categoryFormOpen = signal(false);
  editingCategoryData = signal<CategoryFormData | null>(null);

  // Fields (shared gom-fields-form)
  fields = signal<TemplateField[]>([]);
  fieldFormOpen = signal(false);
  editingFieldData = signal<FieldFormData | null>(null);
  fieldGroupAssignOptions = signal<FieldGroupAssignOption[]>([]);
  initialAssignedFieldGroupIds = signal<string[]>([]);

  // Units (shared gom-units-form)
  units = signal<TemplateUnit[]>([]);
  unitFormOpen = signal(false);
  editingUnitData = signal<UnitFormData | null>(null);
  unitBaseOptions = signal<UnitAssignOption[]>([]);
  categorySelectOptions = signal<GomSelectOption[]>([]);

  // Tax Profiles (shared gom-tax-profiles-form)
  taxProfiles = signal<TemplateTaxProfile[]>([]);
  taxFormOpen = signal(false);
  editingTaxFormData = signal<TaxProfileFormData | null>(null);

  // Field Groups (shared gom-field-groups-form)
  fieldGroups = signal<TemplateFieldGroup[]>([]);
  fieldGroupFormOpen = signal(false);
  editingFieldGroupData = signal<FieldGroup | null>(null);
  fieldGroupFields = signal<PricingField[]>([]);
  fieldGroupCategories = signal<CategoryOption[]>([]);

  // Delete
  deleteConfirmOpen = signal(false);
  pendingDelete = signal<{ type: string; id: string; name: string } | null>(null);

  // Category Associations
  associationsOpen = signal(false);
  associationsCategory = signal<Category | null>(null);
  readonly associationsApiProvider: CategoryAssociationsApiProvider = {
    getAssociations: (id: string) => this.catalogService.getCategoryAssociations(id),
    getAvailableAssociations: (id: string) => this.catalogService.getAvailableCategoryAssociations(id),
    updateAssociations: (id: string, payload: any) => this.catalogService.updateCategoryAssociations(id, payload),
  };

  ngOnInit() {
    this.loadAll();
  }

  // --- Table row getters ---
  get categoryRows(): GomTableRow[] {
    return this.categories().map((c) => ({ ...c, description: c.description || '—' }));
  }

  get fieldRows(): GomTableRow[] {
    return this.fields().map((f) => ({ ...f }));
  }

  get fieldGroupRows(): GomTableRow[] {
    return this.fieldGroups().map((fg) => ({
      ...fg,
      fieldsCount: fg.fields?.length ?? 0,
      categoriesCount: fg.categoryIds?.length ?? 0,
    }));
  }

  get unitRows(): GomTableRow[] {
    return this.units().map((u) => ({ ...u }));
  }

  get taxProfileRows(): GomTableRow[] {
    return this.taxProfiles().map((tp) => ({
      ...tp,
      rateDisplay: `${tp.rate}%`,
      inclusiveDisplay: tp.inclusive ? 'Yes' : 'No',
      hsnCode: tp.hsnCode || '—',
    }));
  }

  // --- Table action handlers ---
  onCategoryAction(event: { actionKey: string; row: GomTableRow }) {
    const cat = this.categories().find((c) => c._id === event.row['_id']);
    if (!cat) return;
    if (event.actionKey === 'edit') this.openCategoryForm(cat);
    if (event.actionKey === 'delete') this.requestDelete('category', cat._id, cat.name);
    if (event.actionKey === 'manage') {
      this.associationsCategory.set({ _id: cat._id, name: cat.name, description: cat.description, status: cat.status });
      this.associationsOpen.set(true);
    }
  }

  onFieldAction(event: { actionKey: string; row: GomTableRow }) {
    const field = this.fields().find((f) => f._id === event.row['_id']);
    if (!field) return;
    if (event.actionKey === 'edit') this.openFieldForm(field);
    if (event.actionKey === 'delete') this.requestDelete('field', field._id, field.name);
  }

  onFieldGroupAction(event: { actionKey: string; row: GomTableRow }) {
    const fg = this.fieldGroups().find((f) => f._id === event.row['_id']);
    if (!fg) return;
    if (event.actionKey === 'edit') this.openFieldGroupForm(fg);
    if (event.actionKey === 'delete') this.requestDelete('field-group', fg._id, fg.name);
  }

  onUnitAction(event: { actionKey: string; row: GomTableRow }) {
    const unit = this.units().find((u) => u._id === event.row['_id']);
    if (!unit) return;
    if (event.actionKey === 'edit') this.openUnitForm(unit);
    if (event.actionKey === 'delete') this.requestDelete('unit', unit._id, unit.name);
  }

  onTaxProfileAction(event: { actionKey: string; row: GomTableRow }) {
    const tp = this.taxProfiles().find((t) => t._id === event.row['_id']);
    if (!tp) return;
    if (event.actionKey === 'edit') this.openTaxForm(tp);
    if (event.actionKey === 'delete') this.requestDelete('tax-profile', tp._id, tp.name);
  }

  loadAll() {
    this.loadCategories();
    this.loadFields();
    this.loadUnits();
    this.loadTaxProfiles();
    this.loadFieldGroups();
  }

  switchTab(tab: string | number) {
    this.activeTab.set(tab);
  }

  // --- Categories (shared form) ---
  loadCategories() {
    this.catalogService.listCategories().subscribe({
      next: (res) => {
        const cats = res.data ?? [];
        this.categories.set(cats);
        this.categorySelectOptions.set(cats.map((c) => ({ label: c.name, value: c._id })));
      },
      error: () => this.toast.error('Failed to load template categories'),
    });
  }

  openCategoryForm(category?: TemplateCategory) {
    this.editingCategoryData.set(category
      ? { name: category.name, description: category.description, status: category.status ?? 'ACTIVE' }
      : null
    );
    this.categoryFormOpen.set(true);
  }

  onCategoryFormSubmit(data: CategoryFormData) {
    const editing = this.editingCategoryData();
    const editingCat = editing ? this.categories().find((c) => c.name === editing.name) : null;
    this.loading.set(true);

    const req$ = editingCat
      ? this.catalogService.updateCategory(editingCat._id, data)
      : this.catalogService.createCategory(data);

    req$.subscribe({
      next: () => {
        this.categoryFormOpen.set(false);
        this.toast.success(editingCat ? 'Category updated' : 'Category created');
        this.loadCategories();
        this.loading.set(false);
      },
      error: () => {
        this.toast.error('Failed to save category');
        this.loading.set(false);
      },
    });
  }

  onCategoryFormCancel() {
    this.categoryFormOpen.set(false);
  }

  // --- Fields (shared form) ---
  loadFields() {
    this.catalogService.listFields().subscribe({
      next: (res) => this.fields.set(res.data ?? []),
      error: () => this.toast.error('Failed to load template fields'),
    });
  }

  openFieldForm(field?: TemplateField) {
    this.editingFieldData.set(field
      ? {
          name: field.name,
          key: field.key,
          type: field.type as FieldFormData['type'],
          defaultValue: field.defaultValue,
          isRequired: field.isRequired ?? false,
          status: (field.status ?? 'ACTIVE') as FieldFormData['status'],
        }
      : null
    );
    this.initialAssignedFieldGroupIds.set(
      this.fieldGroups()
        .filter((fg) => field && fg.fields?.some((f: any) => (f._id ?? f) === field._id))
        .map((fg) => fg._id)
    );
    this.fieldFormOpen.set(true);
  }

  onFieldFormSubmit(data: FieldFormSubmitData) {
    const editing = this.editingFieldData();
    const editingField = editing ? this.fields().find((f) => f.key === editing.key) : null;
    this.loading.set(true);

    const req$ = editingField
      ? this.catalogService.updateField(editingField._id, data.payload)
      : this.catalogService.createField(data.payload);

    req$.subscribe({
      next: () => {
        this.fieldFormOpen.set(false);
        this.toast.success(editingField ? 'Field updated' : 'Field created');
        this.loadFields();
        this.loading.set(false);
      },
      error: () => {
        this.toast.error('Failed to save field');
        this.loading.set(false);
      },
    });
  }

  onFieldFormCancel() {
    this.fieldFormOpen.set(false);
  }

  // --- Units (shared form) ---
  loadUnits() {
    this.catalogService.listUnits().subscribe({
      next: (res) => {
        const unitList = res.data ?? [];
        this.units.set(unitList);
        this.unitBaseOptions.set(unitList.map((u) => ({ id: u._id, name: u.name })));
      },
      error: () => this.toast.error('Failed to load template units'),
    });
  }

  openUnitForm(unit?: TemplateUnit) {
    this.editingUnitData.set(unit
      ? {
          id: unit._id,
          name: unit.name,
          symbol: unit.symbol,
          baseUnitId: unit.baseUnitId ?? null,
          conversionFactor: unit.conversionFactor ?? 1,
          status: (unit.status ?? 'ACTIVE') as UnitFormData['status'],
          categoryIds: unit.categoryIds ?? [],
        }
      : null
    );
    this.unitFormOpen.set(true);
  }

  onUnitFormSubmit(payload: UnitPayload) {
    const editing = this.editingUnitData();
    this.loading.set(true);

    const req$ = editing?.id
      ? this.catalogService.updateUnit(editing.id, payload)
      : this.catalogService.createUnit(payload);

    req$.subscribe({
      next: () => {
        this.unitFormOpen.set(false);
        this.toast.success(editing?.id ? 'Unit updated' : 'Unit created');
        this.loadUnits();
        this.loading.set(false);
      },
      error: () => {
        this.toast.error('Failed to save unit');
        this.loading.set(false);
      },
    });
  }

  onUnitFormCancel() {
    this.unitFormOpen.set(false);
  }

  // --- Tax Profiles (shared gom-tax-profiles-form) ---
  loadTaxProfiles() {
    this.catalogService.listTaxProfiles().subscribe({
      next: (res) => this.taxProfiles.set(res.data ?? []),
      error: () => this.toast.error('Failed to load template tax profiles'),
    });
  }

  openTaxForm(tp?: TemplateTaxProfile) {
    this.editingTaxFormData.set(tp
      ? {
          name: tp.name,
          countryCode: tp.countryCode,
          taxMode: tp.taxMode,
          rate: tp.rate,
          inclusive: tp.inclusive,
          hsnCode: tp.hsnCode,
          status: tp.status,
        }
      : null
    );
    this.taxFormOpen.set(true);
  }

  onTaxFormSubmit(payload: TaxProfileFormPayload) {
    const editing = this.editingTaxFormData();
    const editingTp = editing ? this.taxProfiles().find((t) => t.name === editing.name) : null;
    this.loading.set(true);

    const req$ = editingTp
      ? this.catalogService.updateTaxProfile(editingTp._id, payload)
      : this.catalogService.createTaxProfile(payload);

    req$.subscribe({
      next: () => {
        this.taxFormOpen.set(false);
        this.toast.success(editingTp ? 'Tax profile updated' : 'Tax profile created');
        this.loadTaxProfiles();
        this.loading.set(false);
      },
      error: () => {
        this.toast.error('Failed to save tax profile');
        this.loading.set(false);
      },
    });
  }

  onTaxFormCancel() {
    this.taxFormOpen.set(false);
  }

  // --- Field Groups (shared gom-field-groups-form) ---
  loadFieldGroups() {
    this.catalogService.listFieldGroups().subscribe({
      next: (res) => {
        const fgs = res.data ?? [];
        this.fieldGroups.set(fgs);
        this.fieldGroupAssignOptions.set(fgs.map((fg) => ({ id: fg._id, name: fg.name })));
      },
      error: () => this.toast.error('Failed to load template field groups'),
    });
  }

  openFieldGroupForm(fg?: TemplateFieldGroup) {
    this.editingFieldGroupData.set(fg ? fg as unknown as FieldGroup : null);
    this.fieldGroupFields.set(this.fields() as unknown as PricingField[]);
    this.fieldGroupCategories.set(
      this.categories().map((c) => ({ _id: c._id, name: c.name, status: c.status as 'ACTIVE' | 'INACTIVE' }))
    );
    this.fieldGroupFormOpen.set(true);
  }

  onFieldGroupFormSubmit(payload: FieldGroupPayload) {
    const editing = this.editingFieldGroupData();
    this.loading.set(true);

    const req$ = editing?._id
      ? this.catalogService.updateFieldGroup(editing._id, payload as any)
      : this.catalogService.createFieldGroup(payload as any);

    req$.subscribe({
      next: () => {
        this.fieldGroupFormOpen.set(false);
        this.toast.success(editing ? 'Field group updated' : 'Field group created');
        this.loadFieldGroups();
        this.loading.set(false);
      },
      error: () => {
        this.toast.error('Failed to save field group');
        this.loading.set(false);
      },
    });
  }

  onFieldGroupFormCancel() {
    this.fieldGroupFormOpen.set(false);
  }

  // --- Delete ---
  requestDelete(type: string, id: string, name: string) {
    this.pendingDelete.set({ type, id, name });
    this.deleteConfirmOpen.set(true);
  }

  onDeleteConfirmed() {
    const pending = this.pendingDelete();
    if (!pending) return;

    this.loading.set(true);
    let req$;

    switch (pending.type) {
      case 'category':
        req$ = this.catalogService.deleteCategory(pending.id);
        break;
      case 'field':
        req$ = this.catalogService.deleteField(pending.id);
        break;
      case 'unit':
        req$ = this.catalogService.deleteUnit(pending.id);
        break;
      case 'tax-profile':
        req$ = this.catalogService.deleteTaxProfile(pending.id);
        break;
      case 'field-group':
        req$ = this.catalogService.deleteFieldGroup(pending.id);
        break;
      default:
        return;
    }

    req$.subscribe({
      next: () => {
        this.deleteConfirmOpen.set(false);
        this.pendingDelete.set(null);
        this.toast.success('Deleted successfully');
        this.loadAll();
        this.loading.set(false);
      },
      error: (err: any) => {
        this.toast.error(err?.error?.message || 'Failed to delete');
        this.deleteConfirmOpen.set(false);
        this.pendingDelete.set(null);
        this.loading.set(false);
      },
    });
  }

  onDeleteCancelled() {
    this.deleteConfirmOpen.set(false);
    this.pendingDelete.set(null);
  }

  onAssociationsClosed() {
    this.associationsOpen.set(false);
    this.associationsCategory.set(null);
  }

  closeAllForms() {
    this.categoryFormOpen.set(false);
    this.fieldFormOpen.set(false);
    this.fieldGroupFormOpen.set(false);
    this.unitFormOpen.set(false);
    this.taxFormOpen.set(false);
  }
}
