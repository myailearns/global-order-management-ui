import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DestroyRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { TranslateModule } from '@ngx-translate/core';

import { GomAlertToastService } from '../../../shared/components/alert';
import { GomButtonComponent, GomInputComponent, GomSelectComponent, GomSelectOption, GomSwitchComponent } from '../../../shared/components/form-controls';
import { GomModalComponent } from '../../../shared/components/modal';
import { GomTableColumn, GomTableComponent, GomTableRow } from '../../../shared/components/table';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { EntitlementsService } from './entitlements.service';
import { FeatureCatalogItem } from './entitlements.model';

interface FeatureTemplate {
  featureKey: string;
  displayName: string;
  module: string;
  dependencies: string[];
}

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
  private readonly http = inject(HttpClient);
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
    uiVisibilityPolicy: ['entitled-only', [Validators.required]],
    status: ['ACTIVE', [Validators.required]],
    isBeta: [false],
  });

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
    this.http.get<FeatureTemplate[]>('/assets/data/features.json').subscribe({
      next: (templates) => {
        this.featureTemplates.set(templates || []);
      },
      error: () => {
        // Silent fail; templates are optional
        this.featureTemplates.set([]);
      },
    });
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
      uiVisibilityPolicy: 'entitled-only',
      status: 'ACTIVE',
      isBeta: false,
    });
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
      uiVisibilityPolicy: item.uiVisibilityPolicy,
      status: item.status,
      isBeta: item.isBeta,
    });
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
