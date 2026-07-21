import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';

import { GomAlertToastService, GomButtonComponent, GomConfirmationModalComponent, GomInputComponent, GomModalComponent, GomSelectComponent, GomSwitchComponent, GomTableColumn, GomTableComponent, GomTableRow, GomTextareaComponent } from '@gomlibs/ui';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { EntitlementsService } from './entitlements.service';
import { FeatureCatalogItem, FeatureConfigOverride, PackagePlan, PostTrialAction, TrialMode } from './entitlements.model';

interface PackageRow extends GomTableRow {
  id: string;
  planId: string;
  name: string;
  tier: string;
  packageType: string;
  status: string;
  tierCount: number;
}

@Component({
  selector: 'gom-package-plans',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    GomButtonComponent,
    GomConfirmationModalComponent,
    GomInputComponent,
    GomSelectComponent,
    GomSwitchComponent,
    GomTextareaComponent,
    GomModalComponent,
    GomTableComponent,
  ],
  templateUrl: './package-plans.component.html',
  styleUrl: './package-plans.component.scss',
})
export class PackagePlansComponent implements OnInit, OnDestroy {
  private static readonly FEATURE_IMPLICIT_CONFIG_KEYS: Record<string, string[]> = {
    'category.create': ['max_images'],
    'group.create': ['max_images', 'max_videos'],
    'pack.create': ['max_images', 'max_videos'],
    'media.upload': ['max_images', 'max_videos'],
  };

  private readonly service = inject(EntitlementsService);
  private readonly toast = inject(GomAlertToastService);
  private readonly fb = inject(FormBuilder);
  private readonly authSession = inject(AuthSessionService);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);
  private readonly destroy$ = new Subject<void>();

  readonly loading = signal(false);
  readonly canWrite = computed(() => this.authSession.canWrite('platform-admin'));
  readonly packages = signal<PackagePlan[]>([]);
  readonly features = signal<FeatureCatalogItem[]>([]);
  readonly modalOpen = signal(false);
  readonly deleteAllConfirmOpen = signal(false);
  readonly deleteAllBusy = signal(false);
  readonly deletePackageConfirmOpen = signal(false);
  readonly deletePackageBusy = signal(false);
  readonly deleteTarget = signal<PackagePlan | null>(null);
  readonly selectedId = signal<string | null>(null);
  readonly featureKeysSig = signal<string[]>([]);
  private pendingFeatureConfigs: Record<string, FeatureConfigOverride[]> = {};

  // Features that have at least one config key — built from currently selected featureKeys
  readonly selectedFeaturesWithConfigs = signal<FeatureCatalogItem[]>([]);
  readonly selectedFeaturesResolved = computed<FeatureCatalogItem[]>(() => {
    const selectedKeys = [...new Set((this.featureKeysSig()).map((key) => this._normalizeFeatureKey(key)).filter(Boolean))];
    return selectedKeys
      .map((featureKey) => this._toDisplayFeature(featureKey))
      .filter((feature): feature is FeatureCatalogItem => !!feature)
      .sort((left, right) => String(left.displayName || '').localeCompare(String(right.displayName || ''), 'en'));
  });
  readonly configurableSelectedFeatures = computed<FeatureCatalogItem[]>(() => {
    return this.selectedFeaturesResolved()
      .filter((feature) => this._featureConfigKeys(feature).length > 0)
      .sort((left, right) => String(left.displayName || '').localeCompare(String(right.displayName || ''), 'en'));
  });

  // FormGroup holding config overrides per featureKey: { [featureKey]: FormGroup<{[configKey]: FormControl}> }
  readonly configOverridesForm: FormGroup = this.fb.group({});
  readonly selectedFeatureCount = computed(() => this.featureKeysSig().length);
  readonly activeModule = signal<string>('all');
  readonly featureSearch = signal('');
  readonly activeBuilderTab = signal<'features' | 'configs'>('features');

  // Sprint 1: Two-step flow - create form only captures metadata
  readonly form = this.fb.group({
    planId: ['', [Validators.required]],
    name: ['', [Validators.required]],
    description: [''],
    tier: ['STARTER', [Validators.required]],
    packageType: ['BOTH', [Validators.required]],
    status: ['ACTIVE', [Validators.required]],
    trialEnabledDefault: [true],
    defaultTrialMode: ['PLAN_BASED_TRIAL' as TrialMode, [Validators.required]],
    defaultTrialDurationDays: [14, [Validators.required, Validators.min(1), Validators.max(365)]],
    defaultPostTrialAction: ['SUSPEND_PREMIUM_ACCESS' as PostTrialAction, [Validators.required]],
    allowAccountLevelTrialOverride: [true],
    featureKeys: this.fb.control<string[]>([]), // For backward compat with existing packages (edit mode)
  });

  readonly packageTrialModeOptions = [
    { value: 'PLAN_BASED_TRIAL', label: 'Plan Based Trial' },
    { value: 'FULL_APP_TRIAL', label: 'Full App Trial' },
    { value: 'NONE', label: 'No Trial' },
  ];

  readonly postTrialActionOptions = [
    { value: 'SUSPEND_PREMIUM_ACCESS', label: 'Suspend Premium Access' },
    { value: 'DOWNGRADE_TO_TIER', label: 'Downgrade To Tier' },
    { value: 'CONVERT_TO_PAID', label: 'Convert To Paid' },
  ];

  readonly moduleList = computed<string[]>(() =>
    [...new Set(this.features().map((feature) => String(feature.module || '').trim()).filter(Boolean))]
      .sort((left, right) => left.localeCompare(right, 'en')),
  );

  readonly selectedFeatureSet = computed(() =>
    new Set((this.featureKeysSig()).map((key) => String(key || '').trim().toLowerCase())),
  );

  readonly filteredFeatures = computed<FeatureCatalogItem[]>(() => {
    const module = this.activeModule();
    const query = String(this.featureSearch() || '').trim().toLowerCase();

    return this.features()
      .filter((feature) => (module === 'all' ? true : String(feature.module || '').trim() === module))
      .filter((feature) => {
        if (!query) {
          return true;
        }

        const displayName = String(feature.displayName || '').toLowerCase();
        const featureKey = String(feature.featureKey || '').toLowerCase();
        return displayName.includes(query) || featureKey.includes(query);
      })
      .sort((left, right) => String(left.displayName || '').localeCompare(String(right.displayName || ''), 'en'));
  });

  readonly rows = computed<PackageRow[]>(() =>
    this.packages().map((item) => ({
      id: item._id,
      planId: item.planId,
      name: item.name,
      tier: item.tier,
      packageType: item.packageType || 'BOTH',
      status: item.status,
      tierCount: (item.tiers?.length || 0) + (item.featureKeys?.length > 0 ? 1 : 0), // Count tiers + legacy package
    })),
  );

  readonly columns: GomTableColumn<PackageRow>[] = [
    { key: 'planId', header: 'Plan Id', sortable: true, width: '12rem' },
    { key: 'name', header: 'Name', sortable: true, width: '16rem' },
    { key: 'tier', header: 'Tier', width: '10rem' },
    { key: 'packageType', header: 'Package Type', width: '10rem' },
    { key: 'status', header: 'Status', width: '10rem' },
    { key: 'tierCount', header: this.translate.instant('saas.platform.packages.col_tiers'), width: '8rem' },
    {
      key: 'id',
      header: 'Actions',
      width: '15rem',
      actionButtons: [
        {
          label: this.translate.instant('saas.platform.packages.btn_manage_tiers'),
          icon: 'ri-stack-line',
          actionKey: 'manage-tiers',
          variant: 'primary',
        },
        { label: 'Edit', actionKey: 'edit', variant: 'secondary' },
        { label: 'Delete', icon: 'ri-delete-bin-line', actionKey: 'delete', variant: 'danger' },
      ],
    },
  ];

  ngOnInit(): void {
    this.load();
    this.loadFeatures();

    // Whenever featureKeys selection changes, rebuild the config-overrides section
    this.form.controls.featureKeys.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((keys) => {
      this.featureKeysSig.set(keys ?? []);
      this._rebuildConfigOverrides(keys ?? [], this.pendingFeatureConfigs);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  selectModule(module: string): void {
    this.activeModule.set(String(module || '').trim() || 'all');
  }

  setFeatureSearch(query: string): void {
    this.featureSearch.set(String(query || ''));
  }

  setBuilderTab(tab: 'features' | 'configs'): void {
    this.activeBuilderTab.set(tab);
  }

  isFeatureSelected(featureKey: string): boolean {
    return this.selectedFeatureSet().has(String(featureKey || '').trim().toLowerCase());
  }

  toggleFeature(featureKey: string, checked: boolean): void {
    const normalized = String(featureKey || '').trim().toLowerCase();
    const current = this.featureKeysSig();
    const currentSet = new Set(current.map((key) => String(key || '').trim().toLowerCase()).filter(Boolean));

    if (checked) {
      currentSet.add(normalized);
    } else {
      currentSet.delete(normalized);
    }

    const next = [...currentSet];
    this.featureKeysSig.set(next);
    this.form.controls.featureKeys.setValue(next);
  }

  private _isCreateFeature(featureKey: string): boolean {
    return String(featureKey || '').trim().toLowerCase().endsWith('.create');
  }

  private _normalizeFeatureKey(featureKey: string): string {
    return String(featureKey || '').trim().toLowerCase();
  }

  private _findFeatureByKey(featureKey: string): FeatureCatalogItem | null {
    const normalized = this._normalizeFeatureKey(featureKey);
    return this.features().find((feature) => this._normalizeFeatureKey(feature.featureKey) === normalized) ?? null;
  }

  private _toConfigurableFeature(featureKey: string): FeatureCatalogItem | null {
    const normalized = this._normalizeFeatureKey(featureKey);
    const existing = this._findFeatureByKey(normalized);
    if (existing) {
      return existing;
    }

    if (!this._isCreateFeature(normalized)) {
      return null;
    }

    return {
      _id: `synthetic:${normalized}`,
      featureKey: normalized,
      displayName: normalized,
      module: 'custom',
      dependencyKeys: [],
      filters: [{ key: 'max_count', defaultValue: null }],
      planAvailability: [],
      isBeta: false,
      uiVisibilityPolicy: 'entitled-only',
      status: 'ACTIVE',
    };
  }

  private _toDisplayFeature(featureKey: string): FeatureCatalogItem | null {
    const normalized = this._normalizeFeatureKey(featureKey);
    const existing = this._findFeatureByKey(normalized);
    if (existing) {
      return existing;
    }

    if (this._isCreateFeature(normalized)) {
      return this._toConfigurableFeature(normalized);
    }

    return {
      _id: `synthetic:${normalized}`,
      featureKey: normalized,
      displayName: normalized,
      module: 'custom',
      dependencyKeys: [],
      filters: [],
      planAvailability: [],
      isBeta: false,
      uiVisibilityPolicy: 'entitled-only',
      status: 'ACTIVE',
    };
  }

  private _featureConfigKeys(feature: FeatureCatalogItem): string[] {
    const fromCatalog = (feature.filters ?? [])
      .map((filter) => String(filter?.key || '').trim().toLowerCase())
      .filter(Boolean);

    const implicit = PackagePlansComponent.FEATURE_IMPLICIT_CONFIG_KEYS[this._normalizeFeatureKey(feature.featureKey)] ?? [];
    fromCatalog.push(...implicit);

    if (this._isCreateFeature(feature.featureKey) && !fromCatalog.includes('max_count')) {
      fromCatalog.push('max_count');
    }

    return [...new Set(fromCatalog)];
  }

  featureConfigKeys(feature: FeatureCatalogItem): string[] {
    return this._featureConfigKeys(feature);
  }

  isMaxCountConfig(key: string): boolean {
    return String(key || '').trim().toLowerCase() === 'max_count';
  }

  configLabel(feature: FeatureCatalogItem, key: string): string {
    if (this.isMaxCountConfig(key)) {
      return `Max Count (${feature.featureKey})`;
    }

    const normalized = String(key || '').trim().toLowerCase();
    if (normalized === 'max_images') {
      return `Max Images (${feature.featureKey})`;
    }
    if (normalized === 'max_videos') {
      return `Max Videos (${feature.featureKey})`;
    }

    return key;
  }

  getConfigControl(featureKey: string, configKey: string): AbstractControl | null {
    return this.configOverridesForm.get([featureKey, configKey]);
  }

  /** Rebuild configOverridesForm controls to match selected featureKeys that have filters */
  private _rebuildConfigOverrides(selectedKeys: string[], existingConfigs: Record<string, FeatureConfigOverride[]>): void {
    const normalizedSelectedKeys = [...new Set((selectedKeys || []).map((key) => this._normalizeFeatureKey(key)).filter(Boolean))];

    // Remove controls for features no longer selected
    Object.keys(this.configOverridesForm.controls).forEach((featureKey) => {
      if (!normalizedSelectedKeys.includes(this._normalizeFeatureKey(featureKey))) {
        this.configOverridesForm.removeControl(featureKey);
      }
    });

    const withConfigs: FeatureCatalogItem[] = [];

    normalizedSelectedKeys.forEach((featureKey) => {
      const feature = this._toConfigurableFeature(featureKey);
      if (!feature) return;

      const configKeys = this._featureConfigKeys(feature);
      if (!configKeys.length) return;

      withConfigs.push(feature);

      const existingConfigEntries = Object.entries(existingConfigs || {}).find(
        ([key]) => this._normalizeFeatureKey(key) === featureKey,
      )?.[1] || [];

      if (!this.configOverridesForm.contains(featureKey)) {
        const group = this.fb.group({} as Record<string, unknown>);
        configKeys.forEach((configKey) => {
          const filter = feature.filters?.find((entry) => String(entry?.key || '').trim().toLowerCase() === configKey);
          const existing = existingConfigEntries.find((c) => String(c.key || '').trim().toLowerCase() === configKey);
          const value = existing?.value ?? filter?.defaultValue ?? null;

          if (configKey === 'max_count') {
            // Optional: when empty, treat as unlimited. If provided, must be a positive integer.
            group.addControl(configKey, this.fb.control(value, [Validators.pattern(/^[1-9]\d*$/)]));
          } else {
            group.addControl(configKey, this.fb.control(value));
          }
        });
        this.configOverridesForm.addControl(featureKey, group);
      }
    });

    this.selectedFeaturesWithConfigs.set(withConfigs);
  }

  loadFeatures(): void {
    this.service.listFeatures().subscribe({
      next: (items) => {
        this.features.set(items);
        const selectedKeys = this.form.controls.featureKeys.value ?? [];
        if (this.modalOpen() && selectedKeys.length) {
          this._rebuildConfigOverrides(selectedKeys, this.pendingFeatureConfigs);
        }
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

  openDeleteAllConfirm(): void {
    if (!this.canWrite() || this.loading() || this.deleteAllBusy()) {
      return;
    }
    this.deleteAllConfirmOpen.set(true);
  }

  closeDeleteAllConfirm(): void {
    if (this.deleteAllBusy()) {
      return;
    }
    this.deleteAllConfirmOpen.set(false);
  }

  openDeletePackageConfirm(item: PackagePlan): void {
    if (!this.canWrite() || this.loading() || this.deletePackageBusy()) {
      return;
    }
    this.deleteTarget.set(item);
    this.deletePackageConfirmOpen.set(true);
  }

  closeDeletePackageConfirm(): void {
    if (this.deletePackageBusy()) {
      return;
    }
    this.deletePackageConfirmOpen.set(false);
    this.deleteTarget.set(null);
  }

  confirmDeletePackage(): void {
    const target = this.deleteTarget();
    if (!this.canWrite() || !target?._id || this.deletePackageBusy()) {
      return;
    }

    this.deletePackageBusy.set(true);
    this.service.deletePackage(target._id).subscribe({
      next: () => {
        this.deletePackageBusy.set(false);
        this.deletePackageConfirmOpen.set(false);
        this.deleteTarget.set(null);
        this.toast.success('Package deleted successfully');
        this.load();
      },
      error: (error) => {
        this.deletePackageBusy.set(false);
        this.toast.error(String(error?.error?.message || 'Failed to delete package'));
      },
    });
  }

  get deletePackageConfirmMessage(): string {
    const target = this.deleteTarget();
    if (!target) {
      return 'Are you sure you want to delete this package?';
    }
    return `Are you sure you want to delete package ${target.name} (${target.planId})? This action cannot be undone.`;
  }

  confirmDeleteAllPackages(): void {
    if (!this.canWrite() || this.deleteAllBusy()) {
      return;
    }

    this.deleteAllBusy.set(true);
    this.service.deleteAllPackages().subscribe({
      next: (result) => {
        this.deleteAllBusy.set(false);
        this.deleteAllConfirmOpen.set(false);

        if (result.deletedCount === 0) {
          this.toast.info('No packages to delete.');
          return;
        }

        this.toast.success(`Deleted ${result.deletedCount} packages.`);
        this.load();
      },
      error: (error) => {
        this.deleteAllBusy.set(false);
        this.toast.error(String(error?.error?.message || 'Failed to delete all packages'));
      },
    });
  }

  openCreate(): void {
    this.selectedId.set(null);
    this.pendingFeatureConfigs = {};
    this.activeModule.set('all');
    this.featureSearch.set('');
    this.activeBuilderTab.set('features');
    this._rebuildConfigOverrides([], {});
    this.featureKeysSig.set([]);
    this.form.reset({ planId: '', name: '', description: '', tier: 'STARTER', packageType: 'BOTH', status: 'ACTIVE', featureKeys: [] });
    this.form.patchValue({
      trialEnabledDefault: true,
      defaultTrialMode: 'PLAN_BASED_TRIAL',
      defaultTrialDurationDays: 14,
      defaultPostTrialAction: 'SUSPEND_PREMIUM_ACCESS',
      allowAccountLevelTrialOverride: true,
    }, { emitEvent: false });
    // Metadata-first create: planId is auto-generated by backend, tier is configured in Manage Tiers.
    this.form.controls.planId.disable();
    this.form.controls.tier.disable();
    this.modalOpen.set(true);
  }

  onRowAction(event: { actionKey: string; row: PackageRow }): void {
    if (!this.canWrite()) {
      return;
    }

    if (event.actionKey === 'manage-tiers') {
      // Navigate to tier management page for this package
      this.router.navigate(['/saas-platform/packages', event.row.id, 'tiers']);
      return;
    }

    if (event.actionKey === 'delete') {
      const deleteItem = this.packages().find((x) => x._id === event.row.id);
      if (!deleteItem) {
        return;
      }
      this.openDeletePackageConfirm(deleteItem);
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
    this.pendingFeatureConfigs = item.featureConfigs ?? {};
    this._rebuildConfigOverrides([], {});
    this.form.patchValue({
      planId: item.planId,
      name: item.name,
      description: item.description || '',
      tier: item.tier,
      packageType: item.packageType || 'BOTH',
      status: item.status,
      trialEnabledDefault: item.trialEnabledDefault ?? true,
      defaultTrialMode: item.defaultTrialMode || 'PLAN_BASED_TRIAL',
      defaultTrialDurationDays: Number(item.defaultTrialDurationDays ?? 14),
      defaultPostTrialAction: item.defaultPostTrialAction || 'SUSPEND_PREMIUM_ACCESS',
      allowAccountLevelTrialOverride: item.allowAccountLevelTrialOverride ?? true,
      featureKeys: item.featureKeys,
    }, { emitEvent: false });
    this.featureKeysSig.set(item.featureKeys ?? []);
    this.activeModule.set('all');
    this.featureSearch.set('');
    this.activeBuilderTab.set('features');
    // Pre-populate config overrides from saved plan
    this._rebuildConfigOverrides(item.featureKeys, this.pendingFeatureConfigs);
    this.form.controls.planId.disable();
    this.form.controls.tier.enable();
    this.modalOpen.set(true);
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();

    // Build featureConfigs from configOverridesForm
    const featureConfigs: Record<string, FeatureConfigOverride[]> = {};
    this.configurableSelectedFeatures().forEach((feature) => {
      const group = this.configOverridesForm.controls[feature.featureKey] as FormGroup | undefined;
      const configKeys = this._featureConfigKeys(feature);
      if (!group || !configKeys.length) return;

      const entries: FeatureConfigOverride[] = [];
      configKeys.forEach((configKey) => {
        const rawValue = group.get(configKey)?.value;

        if (configKey === 'max_count') {
          const parsed = Number(rawValue);
          if (Number.isFinite(parsed) && parsed > 0) {
            entries.push({ key: 'max_count', value: Math.floor(parsed) });
          }
          return;
        }

        if (rawValue !== undefined && rawValue !== null && String(rawValue).trim() !== '') {
          entries.push({ key: configKey, value: rawValue });
        }
      });

      if (entries.length) {
        featureConfigs[feature.featureKey] = entries;
      }
    });

    const payload = {
      planId: String(raw.planId || '').trim().toUpperCase(),
      name: String(raw.name || '').trim(),
      description: String(raw.description || '').trim(),
      tier: String(raw.tier || 'STARTER').trim().toUpperCase(),
      packageType: String(raw.packageType || 'BOTH').trim().toUpperCase(),
      status: String(raw.status || 'ACTIVE').trim().toUpperCase(),
      trialEnabledDefault: Boolean(raw.trialEnabledDefault),
      defaultTrialMode: String(raw.defaultTrialMode || 'PLAN_BASED_TRIAL').trim().toUpperCase() as TrialMode,
      defaultTrialDurationDays: Number(raw.defaultTrialDurationDays || 14),
      defaultPostTrialAction: String(raw.defaultPostTrialAction || 'SUSPEND_PREMIUM_ACCESS').trim().toUpperCase() as PostTrialAction,
      allowAccountLevelTrialOverride: Boolean(raw.allowAccountLevelTrialOverride),
      featureKeys: Array.isArray(raw.featureKeys)
        ? raw.featureKeys.map((value) => String(value).trim().toLowerCase()).filter(Boolean)
        : [],
      featureConfigs,
    } as Partial<PackagePlan>;

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

    const createPayload = {
      name: payload.name,
      description: payload.description,
      packageType: payload.packageType,
      status: payload.status,
      trialEnabledDefault: payload.trialEnabledDefault,
      defaultTrialMode: payload.defaultTrialMode,
      defaultTrialDurationDays: payload.defaultTrialDurationDays,
      defaultPostTrialAction: payload.defaultPostTrialAction,
      allowAccountLevelTrialOverride: payload.allowAccountLevelTrialOverride,
    } as Partial<PackagePlan> & Pick<PackagePlan, 'name'>;

    this.service.createPackage(createPayload).subscribe({
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
