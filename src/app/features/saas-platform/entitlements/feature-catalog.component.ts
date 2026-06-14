import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslateModule } from '@ngx-translate/core';

import {
  GomAlertToastService,
  GomButtonComponent,
  GomInputComponent,
  GomModalComponent,
  GomSelectComponent,
  GomSelectOption,
  GomSwitchComponent,
  GomTableColumn,
  GomTableComponent,
  GomTableRow,
} from '@gomlibs/ui';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { EntitlementsService } from './entitlements.service';
import { FeatureCatalogItem } from './entitlements.model';

interface FeatureTemplate {
  featureKey: string;
  displayName: string;
  module: string;
  dependencies: string[];
}

// Feature templates embedded directly to avoid HTTP/file loading issues
const FEATURE_TEMPLATES: FeatureTemplate[] = [
  { featureKey: 'category.list', displayName: 'View Categories', module: 'masters', dependencies: [] },
  { featureKey: 'category.create', displayName: 'Create Category', module: 'masters', dependencies: [] },
  { featureKey: 'category.edit', displayName: 'Edit Category', module: 'masters', dependencies: ['category.list'] },
  { featureKey: 'category.delete', displayName: 'Delete Category', module: 'masters', dependencies: ['category.list'] },
  { featureKey: 'field.list', displayName: 'View Fields', module: 'masters', dependencies: [] },
  { featureKey: 'field.create', displayName: 'Create Field', module: 'masters', dependencies: [] },
  { featureKey: 'field.edit', displayName: 'Edit Field', module: 'masters', dependencies: ['field.list'] },
  { featureKey: 'field.delete', displayName: 'Delete Field', module: 'masters', dependencies: ['field.list'] },
  { featureKey: 'field.bulk_create', displayName: 'Bulk Create Fields', module: 'masters', dependencies: ['field.create'] },
  { featureKey: 'fieldGroup.list', displayName: 'View Field Groups', module: 'masters', dependencies: [] },
  { featureKey: 'fieldGroup.create', displayName: 'Create Field Group', module: 'masters', dependencies: [] },
  { featureKey: 'fieldGroup.edit', displayName: 'Edit Field Group', module: 'masters', dependencies: ['fieldGroup.list'] },
  { featureKey: 'fieldGroup.delete', displayName: 'Delete Field Group', module: 'masters', dependencies: ['fieldGroup.list'] },
  { featureKey: 'unit.list', displayName: 'View Units', module: 'masters', dependencies: [] },
  { featureKey: 'unit.create', displayName: 'Create Unit', module: 'masters', dependencies: [] },
  { featureKey: 'unit.edit', displayName: 'Edit Unit', module: 'masters', dependencies: ['unit.list'] },
  { featureKey: 'unit.delete', displayName: 'Delete Unit', module: 'masters', dependencies: ['unit.list'] },
  { featureKey: 'taxProfile.list', displayName: 'View Tax Profiles', module: 'masters', dependencies: [] },
  { featureKey: 'taxProfile.create', displayName: 'Create Tax Profile', module: 'masters', dependencies: [] },
  { featureKey: 'taxProfile.edit', displayName: 'Edit Tax Profile', module: 'masters', dependencies: ['taxProfile.list'] },
  { featureKey: 'taxProfile.delete', displayName: 'Delete Tax Profile', module: 'masters', dependencies: ['taxProfile.list'] },
  { featureKey: 'group.list', displayName: 'View Product Groups', module: 'product', dependencies: [] },
  { featureKey: 'group.create', displayName: 'Create Product Group', module: 'product', dependencies: [] },
  { featureKey: 'group.edit', displayName: 'Edit Product Group', module: 'product', dependencies: ['group.list'] },
  { featureKey: 'group.delete', displayName: 'Delete Product Group', module: 'product', dependencies: ['group.list'] },
  { featureKey: 'group.bulk_create', displayName: 'Bulk Create Product Groups', module: 'product', dependencies: ['group.create'] },
  { featureKey: 'group.bulk_update', displayName: 'Bulk Update Product Groups', module: 'product', dependencies: ['group.edit', 'group.list'] },
  { featureKey: 'variant.list', displayName: 'View Product Variants', module: 'product', dependencies: [] },
  { featureKey: 'variant.create', displayName: 'Create Product Variant', module: 'product', dependencies: [] },
  { featureKey: 'variant.edit', displayName: 'Edit Product Variant', module: 'product', dependencies: ['variant.list'] },
  { featureKey: 'variant.delete', displayName: 'Delete Product Variant', module: 'product', dependencies: ['variant.list'] },
  { featureKey: 'variant.bulk_create', displayName: 'Bulk Create Product Variants', module: 'product', dependencies: ['variant.create'] },
  { featureKey: 'variant.bulk_update', displayName: 'Bulk Update Product Variants', module: 'product', dependencies: ['variant.edit', 'variant.list'] },
  { featureKey: 'pack.list', displayName: 'View Product Packs', module: 'product', dependencies: [] },
  { featureKey: 'pack.create', displayName: 'Create Product Pack', module: 'product', dependencies: [] },
  { featureKey: 'pack.edit', displayName: 'Edit Product Pack', module: 'product', dependencies: ['pack.list'] },
  { featureKey: 'pack.delete', displayName: 'Delete Product Pack', module: 'product', dependencies: ['pack.list'] },
  { featureKey: 'stock.list', displayName: 'View Stock', module: 'product', dependencies: [] },
  { featureKey: 'stock.create', displayName: 'Create Stock Entry', module: 'product', dependencies: [] },
  { featureKey: 'stock.edit', displayName: 'Edit Stock', module: 'product', dependencies: ['stock.list'] },
  { featureKey: 'stock.delete', displayName: 'Delete Stock Entry', module: 'product', dependencies: ['stock.list'] },
  { featureKey: 'stock.bulk_create', displayName: 'Bulk Create Stock Entries', module: 'product', dependencies: ['stock.create'] },
  { featureKey: 'stock.bulk_update', displayName: 'Bulk Update Stock', module: 'product', dependencies: ['stock.edit', 'stock.list'] },
  { featureKey: 'order.list', displayName: 'View Orders', module: 'orders', dependencies: [] },
  { featureKey: 'order.create', displayName: 'Create Order', module: 'orders', dependencies: [] },
  { featureKey: 'order.edit', displayName: 'Edit Order', module: 'orders', dependencies: ['order.list'] },
  { featureKey: 'order.delete', displayName: 'Delete Order', module: 'orders', dependencies: ['order.list'] },
  { featureKey: 'customer.list', displayName: 'View Customers', module: 'customers', dependencies: [] },
  { featureKey: 'customer.create', displayName: 'Create Customer', module: 'customers', dependencies: [] },
  { featureKey: 'customer.edit', displayName: 'Edit Customer', module: 'customers', dependencies: ['customer.list'] },
  { featureKey: 'customer.delete', displayName: 'Delete Customer', module: 'customers', dependencies: ['customer.list'] },
  { featureKey: 'customerGroup.list', displayName: 'View Customer Groups', module: 'customers', dependencies: [] },
  { featureKey: 'customerGroup.create', displayName: 'Create Customer Group', module: 'customers', dependencies: [] },
  { featureKey: 'customerGroup.edit', displayName: 'Edit Customer Group', module: 'customers', dependencies: ['customerGroup.list'] },
  { featureKey: 'customerGroup.delete', displayName: 'Delete Customer Group', module: 'customers', dependencies: ['customerGroup.list'] },
  { featureKey: 'rider.list', displayName: 'View Riders', module: 'delivery', dependencies: [] },
  { featureKey: 'rider.create', displayName: 'Create Rider', module: 'delivery', dependencies: [] },
  { featureKey: 'rider.edit', displayName: 'Edit Rider', module: 'delivery', dependencies: ['rider.list'] },
  { featureKey: 'rider.delete', displayName: 'Delete Rider', module: 'delivery', dependencies: ['rider.list'] },
  { featureKey: 'courierPartner.list', displayName: 'View Courier Partners', module: 'delivery', dependencies: [] },
  { featureKey: 'courierPartner.create', displayName: 'Create Courier Partner', module: 'delivery', dependencies: [] },
  { featureKey: 'courierPartner.edit', displayName: 'Edit Courier Partner', module: 'delivery', dependencies: ['courierPartner.list'] },
  { featureKey: 'courierPartner.delete', displayName: 'Delete Courier Partner', module: 'delivery', dependencies: ['courierPartner.list'] },
  { featureKey: 'employee.list', displayName: 'View Employees', module: 'tenant-admin', dependencies: [] },
  { featureKey: 'employee.create', displayName: 'Create Employee', module: 'tenant-admin', dependencies: [] },
  { featureKey: 'employee.edit', displayName: 'Edit Employee', module: 'tenant-admin', dependencies: ['employee.list'] },
  { featureKey: 'employee.delete', displayName: 'Delete Employee', module: 'tenant-admin', dependencies: ['employee.list'] },
  { featureKey: 'user.list', displayName: 'View Users', module: 'tenant-admin', dependencies: [] },
  { featureKey: 'user.create', displayName: 'Create User', module: 'tenant-admin', dependencies: [] },
  { featureKey: 'user.edit', displayName: 'Edit User', module: 'tenant-admin', dependencies: ['user.list'] },
  { featureKey: 'user.delete', displayName: 'Delete User', module: 'tenant-admin', dependencies: ['user.list'] },
  { featureKey: 'role.list', displayName: 'View Roles', module: 'tenant-admin', dependencies: [] },
  { featureKey: 'role.create', displayName: 'Create Role', module: 'tenant-admin', dependencies: [] },
  { featureKey: 'role.edit', displayName: 'Edit Role', module: 'tenant-admin', dependencies: ['role.list'] },
  { featureKey: 'role.delete', displayName: 'Delete Role', module: 'tenant-admin', dependencies: ['role.list'] },
  { featureKey: 'storefront.share', displayName: 'Share Storefront', module: 'tenant-admin', dependencies: [] },
  { featureKey: 'media.upload', displayName: 'Custom Image Upload', module: 'media', dependencies: [] },
];

interface FeatureRow extends GomTableRow {
  id: string;
  featureKey: string;
  displayName: string;
  module: string;
  dependencies: string;
  plans: string;
  beta: string;
  status: string;
}

const FILTER_KEY_PATTERN = /^[a-z0-9._-]{2,80}$/;
const POSITIVE_INTEGER_PATTERN = /^[1-9]\d*$/;
const OPTIONAL_POSITIVE_INTEGER_PATTERN = /^$|^[1-9]\d*$/;

@Component({
  selector: 'gom-feature-catalog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    GomButtonComponent,
    GomInputComponent,
    GomSelectComponent,
    GomSwitchComponent,
    GomModalComponent,
    GomTableComponent,
  ],
  templateUrl: './feature-catalog.component.html',
  styleUrl: './feature-catalog.component.scss',
})
export class FeatureCatalogComponent implements OnInit {
  private readonly service = inject(EntitlementsService);
  private readonly toast = inject(GomAlertToastService);
  private readonly fb = inject(FormBuilder);
  private readonly authSession = inject(AuthSessionService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(false);
  readonly canWrite = computed(() => this.authSession.canWrite('platform-admin'));
  readonly features = signal<FeatureCatalogItem[]>([]);
  readonly modalOpen = signal(false);
  readonly selectedId = signal<string | null>(null);
  readonly featureTemplates = signal<FeatureTemplate[]>([]);

  readonly featureKeyOptions = computed<GomSelectOption[]>(() =>
    this.featureTemplates().map((template) => ({
      value: template.featureKey,
      label: `${template.featureKey} - ${template.displayName}`,
    })),
  );

  readonly form = this.fb.group({
    featureKey: ['', [Validators.required, Validators.pattern(/^[a-z0-9._-]{3,80}$/)]],
    displayName: ['', [Validators.required]],
    module: ['', [Validators.required]],
    dependencyKeys: this.fb.control<string[]>([]),
    filters: this.fb.array<FormGroup>([]),
    uiVisibilityPolicy: ['entitled-only', [Validators.required]],
    status: ['ACTIVE', [Validators.required]],
    isBeta: [false],
  });

  get filtersArray(): FormArray<FormGroup> {
    return this.form.controls.filters;
  }

  readonly dependencyOptions = computed<GomSelectOption[]>(() => {
    return this.featureTemplates()
      .map((template) => ({
        value: template.featureKey,
        label: `${template.displayName} (${template.featureKey})`,
      }));
  });

  readonly rows = computed<FeatureRow[]>(() =>
    this.features().map((item) => ({
      id: item._id,
      featureKey: item.featureKey,
      displayName: item.displayName,
      module: item.module,
      dependencies: item.dependencyKeys.join(', ') || '-',
      plans: item.planAvailability.join(', '),
      beta: item.isBeta ? 'Yes' : 'No',
      status: item.status,
    })),
  );

  readonly columns: GomTableColumn<FeatureRow>[] = [
    { key: 'featureKey', header: 'Feature Key', sortable: true, width: '14rem' },
    { key: 'displayName', header: 'Display Name', sortable: true, width: '14rem' },
    { key: 'module', header: 'Module', sortable: true, width: '10rem' },
    { key: 'dependencies', header: 'Dependencies', width: '14rem' },
    { key: 'plans', header: 'Plans', width: '12rem' },
    { key: 'beta', header: 'Beta', width: '7rem' },
    { key: 'status', header: 'Status', width: '9rem' },
    {
      key: 'id',
      header: 'Actions',
      width: '8rem',
      actionButtons: [{ label: 'Edit', actionKey: 'edit', variant: 'secondary' }],
    },
  ];

  ngOnInit(): void {
    this.load();
    this.loadFeatureTemplates();

    // Auto-lowercase featureKey as user types so the pattern validator never silently rejects.
    this.form.controls.featureKey.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        const lower = String(value || '').toLowerCase();
        if (lower !== value) {
          this.form.controls.featureKey.setValue(lower, { emitEvent: false });
        }
      });
  }

  private loadFeatureTemplates(): void {
    // Load from embedded constant - no HTTP needed
    this.featureTemplates.set(FEATURE_TEMPLATES);
    // eslint-disable-next-line no-console
    console.log(`Loaded ${FEATURE_TEMPLATES.length} feature templates from embedded constant`);
  }

  onFeatureTemplateSelect(featureKey: string): void {
    const template = this.featureTemplates().find((t) => t.featureKey === featureKey);
    if (!template) {
      return;
    }

    this.form.patchValue({
      featureKey: template.featureKey.toLowerCase(),
      displayName: template.displayName,
      module: template.module,
      dependencyKeys: template.dependencies,
    });

    if (template.featureKey.endsWith('.create') && this.filtersArray.length === 0) {
      this.addFilterRow({ key: 'max_count' });
    }
  }

  addFilterRow(item?: { key?: string; defaultValue?: string | number | boolean | null }): void {
    this.filtersArray.push(
      this.fb.group({
        key: [String(item?.key || '').trim().toLowerCase(), [Validators.required, Validators.pattern(FILTER_KEY_PATTERN)]],
        // Optional: blank means no default limit; provided value must be a positive integer.
        defaultValue: [String(item?.defaultValue ?? ''), [Validators.pattern(OPTIONAL_POSITIVE_INTEGER_PATTERN)]],
      }),
    );
  }

  removeFilterRow(index: number): void {
    this.filtersArray.removeAt(index);
  }

  private setFilterRows(items: Array<{ key: string; defaultValue: string | number | boolean | null }>): void {
    while (this.filtersArray.length > 0) {
      this.filtersArray.removeAt(0);
    }

    items.forEach((item) => {
      this.addFilterRow({ key: item.key, defaultValue: item.defaultValue });
    });
  }

  load(): void {
    this.loading.set(true);
    this.service.listFeatures().subscribe({
      next: (items) => {
        this.features.set(items);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('Failed to load feature catalog');
      },
    });
  }

  openCreate(): void {
    this.selectedId.set(null);
    this.form.reset({
      featureKey: '',
      displayName: '',
      module: '',
      dependencyKeys: [],
      filters: [],
      uiVisibilityPolicy: 'entitled-only',
      status: 'ACTIVE',
      isBeta: false,
    });
    this.setFilterRows([]);
    this.form.controls.featureKey.enable();
    this.modalOpen.set(true);
  }

  onRowAction(event: { actionKey: string; row: FeatureRow }): void {
    if (!this.canWrite()) {
      return;
    }
    if (event.actionKey !== 'edit') {
      return;
    }

    const item = this.features().find((x) => x._id === event.row.id);
    if (!item) {
      return;
    }

    this.selectedId.set(item._id);
    this.form.patchValue({
      featureKey: item.featureKey,
      displayName: item.displayName,
      module: item.module,
      dependencyKeys: item.dependencyKeys,
      filters: [],
      uiVisibilityPolicy: item.uiVisibilityPolicy,
      status: item.status,
      isBeta: item.isBeta,
    });
    this.setFilterRows(item.filters || []);
    this.form.controls.featureKey.disable();
    this.modalOpen.set(true);
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const payload = {
      featureKey: String(raw.featureKey || '').trim().toLowerCase(),
      displayName: String(raw.displayName || '').trim(),
      module: String(raw.module || '').trim(),
      dependencyKeys: Array.isArray(raw.dependencyKeys)
        ? raw.dependencyKeys.map((value) => String(value).trim().toLowerCase()).filter(Boolean)
        : [],
      filters: this.filtersArray.controls
        .map((group) => ({
          key: String(group.controls['key'].value || '').trim().toLowerCase(),
          defaultValue: Number(group.controls['defaultValue'].value),
        }))
        .filter((item) => FILTER_KEY_PATTERN.test(item.key) && Number.isFinite(item.defaultValue) && item.defaultValue > 0),
      uiVisibilityPolicy: String(raw.uiVisibilityPolicy || 'entitled-only'),
      status: String(raw.status || 'ACTIVE').toUpperCase(),
      isBeta: !!raw.isBeta,
    } as Partial<FeatureCatalogItem> & Pick<FeatureCatalogItem, 'featureKey' | 'displayName' | 'module'>;

    const id = this.selectedId();
    this.loading.set(true);

    if (id) {
      this.service.updateFeature(id, payload).subscribe({
        next: () => {
          this.loading.set(false);
          this.modalOpen.set(false);
          this.toast.success('Feature updated');
          this.load();
        },
        error: (error) => {
          this.loading.set(false);
          this.toast.error(String(error?.error?.message || 'Failed to update feature'));
        },
      });
      return;
    }

    this.service.createFeature(payload).subscribe({
      next: () => {
        this.loading.set(false);
        this.modalOpen.set(false);
        this.toast.success('Feature created');
        this.load();
      },
      error: (error) => {
        this.loading.set(false);
        this.toast.error(String(error?.error?.message || 'Failed to create feature'));
      },
    });
  }
}
