import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { GomAlertToastService } from '@gomlibs/ui';
import { GomButtonComponent, GomInputComponent, GomSelectComponent, GomSelectOption, GomTextareaComponent } from '@gomlibs/ui';
import { GomModalComponent } from '@gomlibs/ui';
import { GomTableColumn, GomTableComponent, GomTableRow } from '@gomlibs/ui';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { EntitlementsService } from './entitlements.service';
import { FeatureCatalogItem, PackagePlan } from './entitlements.model';

interface PackageRow extends GomTableRow {
  id: string;
  planId: string;
  name: string;
  tier: string;
  status: string;
  featureCount: number;
}

@Component({
  selector: 'gom-package-plans',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    GomButtonComponent,
    GomInputComponent,
    GomSelectComponent,
    GomTextareaComponent,
    GomModalComponent,
    GomTableComponent,
  ],
  templateUrl: './package-plans.component.html',
  styleUrl: './package-plans.component.scss',
})
export class PackagePlansComponent implements OnInit {
  private readonly service = inject(EntitlementsService);
  private readonly toast = inject(GomAlertToastService);
  private readonly fb = inject(FormBuilder);
  private readonly authSession = inject(AuthSessionService);

  readonly loading = signal(false);
  readonly canWrite = computed(() => this.authSession.canWrite('platform-admin'));
  readonly packages = signal<PackagePlan[]>([]);
  readonly features = signal<FeatureCatalogItem[]>([]);
  readonly modalOpen = signal(false);
  readonly selectedId = signal<string | null>(null);

  readonly form = this.fb.group({
    planId: ['', [Validators.required]],
    name: ['', [Validators.required]],
    description: [''],
    tier: ['STARTER', [Validators.required]],
    status: ['ACTIVE', [Validators.required]],
    featureKeys: this.fb.control<string[]>([]),
  });

  readonly featureOptions = computed<GomSelectOption[]>(() =>
    this.features().map((feature) => ({
      value: feature.featureKey,
      label: `${feature.displayName} (${feature.featureKey})`,
    })),
  );

  readonly rows = computed<PackageRow[]>(() =>
    this.packages().map((item) => ({
      id: item._id,
      planId: item.planId,
      name: item.name,
      tier: item.tier,
      status: item.status,
      featureCount: item.featureKeys.length,
    })),
  );

  readonly columns: GomTableColumn<PackageRow>[] = [
    { key: 'planId', header: 'Plan Id', sortable: true, width: '12rem' },
    { key: 'name', header: 'Name', sortable: true, width: '16rem' },
    { key: 'tier', header: 'Tier', width: '10rem' },
    { key: 'status', header: 'Status', width: '10rem' },
    { key: 'featureCount', header: 'Features', width: '8rem' },
    {
      key: 'id',
      header: 'Actions',
      width: '10rem',
      actionButtons: [{ label: 'Edit', actionKey: 'edit', variant: 'secondary' }],
    },
  ];

  ngOnInit(): void {
    this.load();
    this.loadFeatures();
  }

  loadFeatures(): void {
    this.service.listFeatures().subscribe({
      next: (items) => {
        this.features.set(items);
      },
      error: () => {
        this.features.set([]);
        this.toast.error('Failed to load features');
      },
    });
  }

  load(): void {
    this.loading.set(true);
    this.service.listPackages().subscribe({
      next: (items) => {
        this.packages.set(items);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('Failed to load packages');
      },
    });
  }

  openCreate(): void {
    this.selectedId.set(null);
    this.form.reset({ planId: '', name: '', description: '', tier: 'STARTER', status: 'ACTIVE', featureKeys: [] });
    this.form.controls.planId.enable();
    this.modalOpen.set(true);
  }

  onRowAction(event: { actionKey: string; row: PackageRow }): void {
    if (!this.canWrite()) {
      return;
    }
    if (event.actionKey !== 'edit') {
      return;
    }

    const item = this.packages().find((x) => x._id === event.row.id);
    if (!item) {
      return;
    }

    this.selectedId.set(item._id);
    this.form.patchValue({
      planId: item.planId,
      name: item.name,
      description: item.description || '',
      tier: item.tier,
      status: item.status,
      featureKeys: item.featureKeys,
    });
    this.form.controls.planId.disable();
    this.modalOpen.set(true);
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const payload = {
      planId: String(raw.planId || '').trim().toUpperCase(),
      name: String(raw.name || '').trim(),
      description: String(raw.description || '').trim(),
      tier: String(raw.tier || 'STARTER').trim().toUpperCase(),
      status: String(raw.status || 'ACTIVE').trim().toUpperCase(),
      featureKeys: Array.isArray(raw.featureKeys)
        ? raw.featureKeys.map((value) => String(value).trim().toLowerCase()).filter(Boolean)
        : [],
    } as Partial<PackagePlan> & Pick<PackagePlan, 'planId' | 'name' | 'tier'>;

    const id = this.selectedId();
    this.loading.set(true);

    if (id) {
      this.service.updatePackage(id, payload).subscribe({
        next: () => {
          this.loading.set(false);
          this.modalOpen.set(false);
          this.toast.success('Package updated');
          this.load();
        },
        error: (error) => {
          this.loading.set(false);
          this.toast.error(String(error?.error?.message || 'Failed to update package'));
        },
      });
      return;
    }

    this.service.createPackage(payload).subscribe({
      next: () => {
        this.loading.set(false);
        this.modalOpen.set(false);
        this.toast.success('Package created');
        this.load();
      },
      error: (error) => {
        this.loading.set(false);
        this.toast.error(String(error?.error?.message || 'Failed to create package'));
      },
    });
  }
}
