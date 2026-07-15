import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { startWith } from 'rxjs';

import {
  FormControlsModule,
  GomAlertToastService,
  GomButtonComponent,
  GomCardComponent,
  GomChipComponent,
  GomChipTone,
  GomModalComponent,
  GomTabContentComponent,
  GomTabsComponent,
  TabItem,
} from '@gomlibs/ui';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { DisableIfNoFeatureDirective } from '../../../shared/directives/disable-if-no-feature.directive';
import {
  BannerImage,
  DeliveryService,
  FulfillmentMode,
  LayoutMode,
  PaymentMethod,
  PickupConfig,
  ProductsTabLayout,
  StorefrontConfig,
  StorefrontShare,
  StorefrontShareEventPayload,
} from '../../delivery/delivery.service';
import { MediaAssetService } from '../../saas-platform/media/media-asset.service';

@Component({
  selector: 'gom-storefront-config',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    FormControlsModule,
    DisableIfNoFeatureDirective,
    GomButtonComponent,
    GomCardComponent,
    GomChipComponent,
    GomModalComponent,
    GomTabsComponent,
    GomTabContentComponent,
  ],
  templateUrl: './storefront-config.component.html',
  styleUrl: './storefront-config.component.scss',
})
export class StorefrontConfigComponent implements OnInit {
  private readonly service = inject(DeliveryService);
  private readonly mediaService = inject(MediaAssetService);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(GomAlertToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly authSession = inject(AuthSessionService);
  private readonly translate = inject(TranslateService);

  readonly pickupWeekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

  readonly pickupScheduleRows = this.fb.array(
    this.pickupWeekDays.map(() => this.createPickupScheduleRow())
  );

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly uploadingBanner = signal<number | null>(null);
  readonly bannerWarnings = signal<Record<number, string>>({});
  readonly uploadingLogo = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly tenantCode = signal('');
  readonly useCustomColors = signal(false);
  readonly canWrite = computed(() => this.authSession.canWrite('tenant-admin'));
  readonly storefrontShare = signal<StorefrontShare | null>(null);
  readonly shareBusy = signal<'copy' | 'whatsapp' | 'download' | null>(null);
  readonly hasStorefrontShareAccess = computed(() => this.authSession.hasFeature('storefront.share'));
  readonly hasProductSetSettingsAccess = computed(() => this.authSession.hasFeature('productCollection.create'));

  readonly tabs = computed<TabItem[]>(() => {
    const items: TabItem[] = [
      { id: 'basic', label: 'Basic Settings' },
      { id: 'branding', label: 'Branding & Content' },
      { id: 'catalog', label: 'Catalog & Banners' },
      { id: 'commerce', label: 'Delivery/Payments' },
    ];

    items.push({ id: 'productSet', label: 'Product Set Settings' });

    return items;
  });

  readonly activeTab = signal<'basic' | 'branding' | 'catalog' | 'commerce' | 'productSet'>('basic');
  readonly showProductsLayoutConfirm = signal(false);
  readonly initialProductsTabLayout = signal<ProductsTabLayout>('LAYOUT_1_CATEGORY_FIRST');

  private shareCenterViewTracked = false;
  private bypassProductsLayoutConfirm = false;

  private readonly defaultTheme = {
    primaryColor: '#0a5d8b',
    secondaryColor: '#fa5c00',
    accentColor: '#fbd03b',
  };

  private readonly BANNER_IDEAL_W = 1500;
  private readonly BANNER_IDEAL_H = 600;
  private readonly BANNER_MIN_W = 1000;
  private readonly BANNER_MIN_H = 400;
  private readonly BANNER_RATIO_MIN = 2.3;
  private readonly BANNER_RATIO_MAX = 2.7;
  private readonly BANNER_SOFT_SIZE_BYTES = 500 * 1024;
  private readonly BANNER_HARD_MAX_SIZE_BYTES = 5 * 1024 * 1024;

  readonly layoutOptions = [
    { value: 'GRID', label: 'Grid (2 columns)' },
    { value: 'GRID3', label: 'Grid (3 columns)' },
    { value: 'LIST', label: 'List (1 column)' },
  ];

  readonly paymentOptions: { value: PaymentMethod; label: string }[] = [
    { value: 'COD', label: 'Cash on Delivery' },
    { value: 'UPI', label: 'UPI' },
    { value: 'CARD', label: 'Credit / Debit Card' },
    { value: 'NET_BANKING', label: 'Net Banking' },
  ];

  readonly fulfillmentOptions = [
    { value: 'DELIVERY', label: 'Delivery Only' },
    { value: 'PICKUP', label: 'Come & Collect Only' },
    { value: 'BOTH', label: 'Both Delivery and Collect' },
  ];

  readonly productsTabLayoutOptions = [
    { value: 'LAYOUT_1_CATEGORY_FIRST', label: 'Layout 1 - Category first' },
    { value: 'LAYOUT_2_COLLECTION_FIRST', label: 'Layout 2 - Collection first' },
  ];

  readonly productsTabLayoutOptionsForTenant = computed(() =>
    this.hasProductSetSettingsAccess()
      ? this.productsTabLayoutOptions
      : [this.productsTabLayoutOptions[0]]
  );

  readonly showDeliveryModal = signal(false);
  readonly showPickupModal = signal(false);
  readonly editingPickupIndex = signal<number | null>(null);

  readonly deliveryEditorForm = this.fb.group({
    deliveryCharge: [0, [Validators.min(0)]],
    deliveryChargeNote: [''],
    estimatedDeliveryDays: [0, [Validators.min(0)]],
    minimumOrderValue: [0, [Validators.min(0)]],
  });

  readonly pickupEditorForm = this.fb.group({
    completeAddress: [''],
    mapUrl: [''],
    pickupInstructions: [''],
    alwaysOpen: [false],
  });

  readonly configForm = this.fb.group({
    enabled: [true],
    logoUrl: [''],
    storeDisplayName: [''],
    storeSlug: ['', [Validators.pattern(/^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/)]],
    primaryColor: [this.defaultTheme.primaryColor],
    secondaryColor: [this.defaultTheme.secondaryColor],
    accentColor: [this.defaultTheme.accentColor],
    layoutMode: ['GRID'],
    productsTabEnabled: [true],
    productsTabLayout: ['LAYOUT_1_CATEGORY_FIRST'],
    b1g1HomeCardsPerRow: [3, [Validators.min(1), Validators.max(8)]],
    catalogInitialCategoryCount: [3, [Validators.min(1), Validators.max(10)]],
    catalogGroupsPerCategoryPage: [10, [Validators.min(2), Validators.max(50)]],
    welcomeMessage: [''],
    footerText: [''],
    whatsappSocial: [''],
    instagramSocial: [''],
    facebookSocial: [''],
    showPacks: [true],
    fulfillmentMode: ['DELIVERY'],
    deliveryCharge: [0, [Validators.min(0)]],
    deliveryChargeNote: [''],
    estimatedDeliveryDays: [0, [Validators.min(0)]],
    pickupLocations: this.fb.array([this.createPickupLocationGroup()]) as FormArray,
    pickupWindowType: ['DAYS'],
    pickupWindowValue: [2, [Validators.min(1), Validators.max(365)]],
    pickupAdvanceDays: [0, [Validators.min(0), Validators.max(30)]],
    pickupSameDayLeadMinutes: [0, [Validators.min(0), Validators.max(1440)]],
    minimumOrderValue: [0, [Validators.min(0)]],
    allowCustomerCancellation: [true],
    cancellationWindowMinutes: [0, [Validators.min(0), Validators.max(10080)]],
    whatsappNumber: [''],
    paymentCOD: [true],
    paymentUPI: [false],
    paymentCARD: [false],
    paymentNET_BANKING: [false],
    banners: this.fb.array([]) as FormArray,
  });

  readonly fulfillmentModeValue = toSignal(
    this.configForm.controls.fulfillmentMode.valueChanges.pipe(
      startWith(this.configForm.controls.fulfillmentMode.value)
    ),
    { initialValue: this.configForm.controls.fulfillmentMode.value }
  );

  readonly selectedFulfillmentMode = computed(() =>
    String(this.fulfillmentModeValue() || 'DELIVERY') as FulfillmentMode
  );

  readonly shouldShowDeliveryFields = computed(() => {
    const mode = this.selectedFulfillmentMode();
    return mode === 'DELIVERY' || mode === 'BOTH';
  });

  readonly shouldShowPickupFields = computed(() => {
    const mode = this.selectedFulfillmentMode();
    return mode === 'PICKUP' || mode === 'BOTH';
  });

  readonly pickupWindowTypeValue = toSignal(
    this.configForm.controls.pickupWindowType.valueChanges.pipe(
      startWith(this.configForm.controls.pickupWindowType.value)
    ),
    { initialValue: this.configForm.controls.pickupWindowType.value }
  );

  readonly isHoursWindow = computed(() => this.pickupWindowTypeValue() === 'HOURS');

  get banners(): FormArray {
    return this.configForm.get('banners') as FormArray;
  }

  get pickupLocations(): FormArray {
    return this.configForm.get('pickupLocations') as FormArray;
  }

  ngOnInit(): void {
    this.loadConfig();
  }

  switchTab(tab: string | number): void {
    if (tab === 'basic' || tab === 'branding' || tab === 'catalog' || tab === 'commerce' || tab === 'productSet') {
      this.activeTab.set(tab);
    }
  }

  resetThemeDefaults(): void {
    if (!this.canWrite()) {
      return;
    }

    this.configForm.patchValue({
      primaryColor: this.defaultTheme.primaryColor,
      secondaryColor: this.defaultTheme.secondaryColor,
      accentColor: this.defaultTheme.accentColor,
    });
    this.useCustomColors.set(false);
  }

  enableCustomColors(): void {
    if (!this.canWrite()) {
      return;
    }

    this.useCustomColors.set(true);
  }

  private loadConfig(): void {
    this.loading.set(true);
    this.service
      .getTenantConfig()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          const tenantId = String(res.data?.tenantId || '').trim().toLowerCase();
          this.tenantCode.set(tenantId);
          this.storefrontShare.set(res.data?.storefrontShare ?? null);
          this.trackShareCenterViewedOnce();

          const cfg = res.data?.storefrontConfig;
          if (cfg) {
            this.patchForm(cfg, tenantId);
          } else {
            this.configForm.patchValue({
              storeDisplayName: '',
              storeSlug: tenantId,
              primaryColor: this.defaultTheme.primaryColor,
              secondaryColor: this.defaultTheme.secondaryColor,
              accentColor: this.defaultTheme.accentColor,
              productsTabEnabled: true,
              productsTabLayout: 'LAYOUT_1_CATEGORY_FIRST',
            });
            this.initialProductsTabLayout.set('LAYOUT_1_CATEGORY_FIRST');
          }
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.errorMessage.set(this.t('storefrontConfig.shareCenter.messages.loadError'));
        },
      });
  }

  private patchForm(cfg: StorefrontConfig, tenantId: string): void {
    const defaultSlug = this.toSlug(cfg.storeSlug || tenantId || '');
    const primary = String(cfg.primaryColor || this.defaultTheme.primaryColor).toLowerCase();
    const secondary = String(cfg.secondaryColor || this.defaultTheme.secondaryColor).toLowerCase();
    const accent = String(cfg.accentColor || this.defaultTheme.accentColor).toLowerCase();
    const hasCustomColors = (
      primary !== this.defaultTheme.primaryColor ||
      secondary !== this.defaultTheme.secondaryColor ||
      accent !== this.defaultTheme.accentColor
    );

    this.useCustomColors.set(hasCustomColors);

    this.configForm.patchValue({
      enabled: this.normalizeBoolean(cfg.enabled, true),
      logoUrl: cfg.logoUrl || '',
      storeDisplayName: cfg.storeDisplayName || '',
      storeSlug: defaultSlug,
      primaryColor: hasCustomColors ? primary : this.defaultTheme.primaryColor,
      secondaryColor: hasCustomColors ? secondary : this.defaultTheme.secondaryColor,
      accentColor: hasCustomColors ? accent : this.defaultTheme.accentColor,
      layoutMode: cfg.layoutMode || 'GRID',
      productsTabEnabled: cfg.productsTabEnabled !== false,
      productsTabLayout: cfg.productsTabLayout || 'LAYOUT_1_CATEGORY_FIRST',
      b1g1HomeCardsPerRow: Number(cfg.b1g1HomeCardsPerRow ?? 3),
      catalogInitialCategoryCount: Number(cfg.catalogInitialCategoryCount ?? 3),
      catalogGroupsPerCategoryPage: Number(cfg.catalogGroupsPerCategoryPage ?? 10),
      welcomeMessage: cfg.welcomeMessage || '',
      footerText: cfg.footerText || '',
      whatsappSocial: cfg.socialLinks?.whatsapp || '',
      instagramSocial: cfg.socialLinks?.instagram || '',
      facebookSocial: cfg.socialLinks?.facebook || '',
      showPacks: this.normalizeBoolean(cfg.showPacks, true),
      fulfillmentMode: cfg.fulfillmentMode || 'DELIVERY',
      deliveryCharge: cfg.deliveryCharge ?? 0,
      deliveryChargeNote: cfg.deliveryChargeNote || '',
      estimatedDeliveryDays: cfg.estimatedDeliveryDays ?? 0,
      minimumOrderValue: cfg.minimumOrderValue ?? 0,
      whatsappNumber: cfg.whatsappNumber || '',
      paymentCOD: (cfg.paymentMethods || []).includes('COD'),
      paymentUPI: (cfg.paymentMethods || []).includes('UPI'),
      paymentCARD: (cfg.paymentMethods || []).includes('CARD'),
      paymentNET_BANKING: (cfg.paymentMethods || []).includes('NET_BANKING'),
      pickupWindowType: cfg.pickupWindowType || 'DAYS',
      pickupWindowValue: cfg.pickupWindowValue ?? 2,
      pickupAdvanceDays: cfg.pickupAdvanceDays ?? 0,
      pickupSameDayLeadMinutes: cfg.pickupSameDayLeadMinutes ?? 0,
      allowCustomerCancellation: cfg.allowCustomerCancellation !== false,
      cancellationWindowMinutes: cfg.cancellationWindowMinutes ?? 0,
    });

    this.initialProductsTabLayout.set(
      cfg.productsTabLayout === 'LAYOUT_2_COLLECTION_FIRST'
        ? 'LAYOUT_2_COLLECTION_FIRST'
        : 'LAYOUT_1_CATEGORY_FIRST'
    );

    // Rebuild banners FormArray
    this.banners.clear();
    for (const banner of cfg.bannerImages || []) {
      this.banners.push(this.createBannerGroup(banner));
    }

    const resolvedPickupLocations = (cfg.pickupLocations?.length)
      ? cfg.pickupLocations
      : [cfg.pickupConfig || {}];
    this.pickupLocations.clear();
    resolvedPickupLocations.forEach((location, index) => {
      this.pickupLocations.push(this.createPickupLocationGroup(this.normalizePickupLocation(location, index)));
    });
    if (!this.pickupLocations.length) {
      this.pickupLocations.push(this.createPickupLocationGroup());
    }

    this.bannerWarnings.set({});
  }

  private normalizePickupLocation(location: Partial<PickupConfig> | undefined, index: number) {
    return {
      locationId: String(location?.locationId || (index === 0 ? 'primary' : `location-${index + 1}`)).trim(),
      locationName: String(location?.locationName || (index === 0 ? 'Main Store' : `Pickup Location ${index + 1}`)).trim(),
      storeAddressLine1: location?.storeAddressLine1 || '',
      storeAddressLine2: location?.storeAddressLine2 || '',
      city: location?.city || '',
      state: location?.state || '',
      postalCode: location?.postalCode || '',
      mapUrl: location?.mapUrl || '',
      latitude: location?.latitude ?? null,
      longitude: location?.longitude ?? null,
      pickupInstructions: location?.pickupInstructions || '',
      pickupTimingText: location?.pickupTimingText || '',
    };
  }

  private createPickupLocationGroup(location?: {
    locationId?: string;
    locationName?: string;
    storeAddressLine1?: string;
    storeAddressLine2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    mapUrl?: string;
    latitude?: number | null;
    longitude?: number | null;
    pickupInstructions?: string;
    pickupTimingText?: string;
  }): FormGroup {
    return this.fb.group({
      locationId: [location?.locationId || ''],
      locationName: [location?.locationName || ''],
      storeAddressLine1: [location?.storeAddressLine1 || ''],
      storeAddressLine2: [location?.storeAddressLine2 || ''],
      city: [location?.city || ''],
      state: [location?.state || ''],
      postalCode: [location?.postalCode || ''],
      mapUrl: [location?.mapUrl || ''],
      latitude: [location?.latitude ?? null],
      longitude: [location?.longitude ?? null],
      pickupInstructions: [location?.pickupInstructions || ''],
      pickupTimingText: [location?.pickupTimingText || ''],
    });
  }

  removePickupLocation(index: number): void {
    if (!this.canWrite() || this.pickupLocations.length <= 1) {
      return;
    }

    this.pickupLocations.removeAt(index);
  }

  setFulfillmentMode(mode: FulfillmentMode): void {
    if (!this.canWrite()) {
      return;
    }

    this.configForm.controls.fulfillmentMode.setValue(mode);
  }

  getFulfillmentChipTone(mode: FulfillmentMode): GomChipTone {
    return this.selectedFulfillmentMode() === mode ? 'info' : 'neutral';
  }

  getPaymentOptionLabel(method: PaymentMethod): string {
    if (method !== 'COD') {
      return this.paymentOptions.find((option) => option.value === method)?.label || method;
    }

    const mode = this.selectedFulfillmentMode();
    if (mode === 'PICKUP') {
      return 'Pay at Pickup';
    }
    if (mode === 'BOTH') {
      return 'Cash on Delivery / Pay at Pickup';
    }
    return 'Cash on Delivery';
  }

  openDeliveryEditor(): void {
    this.deliveryEditorForm.patchValue({
      deliveryCharge: Number(this.configForm.controls.deliveryCharge.value ?? 0),
      deliveryChargeNote: this.configForm.controls.deliveryChargeNote.value || '',
      estimatedDeliveryDays: Number(this.configForm.controls.estimatedDeliveryDays.value ?? 0),
      minimumOrderValue: Number(this.configForm.controls.minimumOrderValue.value ?? 0),
    });
    this.showDeliveryModal.set(true);
  }

  closeDeliveryEditor(): void {
    this.showDeliveryModal.set(false);
  }

  saveDeliveryEditor(): void {
    if (this.deliveryEditorForm.invalid) {
      this.deliveryEditorForm.markAllAsTouched();
      return;
    }

    const raw = this.deliveryEditorForm.getRawValue();
    this.configForm.patchValue({
      deliveryCharge: Number(raw.deliveryCharge ?? 0),
      deliveryChargeNote: raw.deliveryChargeNote || '',
      estimatedDeliveryDays: Number(raw.estimatedDeliveryDays ?? 0),
      minimumOrderValue: Number(raw.minimumOrderValue ?? 0),
    });
    this.showDeliveryModal.set(false);
  }

  openPickupEditor(index?: number): void {
    const targetIndex = typeof index === 'number' ? index : null;
    this.editingPickupIndex.set(targetIndex);
    this.resetPickupScheduleRows();

    if (targetIndex === null) {
      this.pickupEditorForm.patchValue({
        completeAddress: '',
        mapUrl: '',
        pickupInstructions: '',
        alwaysOpen: false,
      });
    } else {
      const locationControl = this.pickupLocations.at(targetIndex) as FormGroup;
      const locationRaw = locationControl.getRawValue();
      this.pickupEditorForm.patchValue({
        completeAddress: this.composeCompleteAddress(locationRaw),
        mapUrl: String(locationRaw.mapUrl || ''),
        pickupInstructions: String(locationRaw.pickupInstructions || ''),
        alwaysOpen: /^24\s*x\s*7$/i.test(String(locationRaw.pickupTimingText || '')),
      });
      if (this.isPickupAlwaysOpen) {
        this.setPickupAlwaysOpen(true);
      }
    }

    this.showPickupModal.set(true);
  }

  closePickupEditor(): void {
    this.showPickupModal.set(false);
    this.editingPickupIndex.set(null);
  }

  savePickupEditor(): void {
    if (this.pickupEditorForm.invalid) {
      this.pickupEditorForm.markAllAsTouched();
      return;
    }

    const raw = this.pickupEditorForm.getRawValue();
    const pickupTimingText = this.buildPickupTimingText();
    const targetIndex = this.editingPickupIndex();
    const resolvedIndex = targetIndex ?? this.pickupLocations.length;
    const normalized = this.normalizePickupLocation(
      {
        storeAddressLine1: String(raw.completeAddress || '').trim(),
        storeAddressLine2: '',
        city: '',
        state: '',
        postalCode: '',
        mapUrl: raw.mapUrl || '',
        latitude: null,
        longitude: null,
        pickupInstructions: raw.pickupInstructions || '',
        pickupTimingText,
      },
      resolvedIndex
    );

    if (targetIndex === null) {
      this.pickupLocations.push(this.createPickupLocationGroup(normalized));
    } else {
      const locationControl = this.pickupLocations.at(targetIndex) as FormGroup;
      locationControl.patchValue(normalized);
    }

    this.showPickupModal.set(false);
    this.editingPickupIndex.set(null);
  }

  getPickupLocationTitle(location: FormGroup, index: number): string {
    const locationName = String(location.get('locationName')?.value || '').trim();
    if (locationName) {
      return locationName;
    }

    return `Pickup Location ${index + 1}`;
  }

  getPickupAddressSummary(location: FormGroup): string {
    const line1 = String(location.get('storeAddressLine1')?.value || '').trim();
    const line2 = String(location.get('storeAddressLine2')?.value || '').trim();
    const city = String(location.get('city')?.value || '').trim();
    const state = String(location.get('state')?.value || '').trim();
    const postalCode = String(location.get('postalCode')?.value || '').trim();

    const parts = [line1, line2, city, state, postalCode].filter((part) => !!part);
    return parts.join(', ') || 'Address details not added yet.';
  }

  canOpenPickupMap(): boolean {
    const mapUrl = String(this.pickupEditorForm.controls.mapUrl.value || '').trim();
    return /^https?:\/\//i.test(mapUrl);
  }

  openPickupMapLink(): void {
    const mapUrl = String(this.pickupEditorForm.controls.mapUrl.value || '').trim();
    if (!/^https?:\/\//i.test(mapUrl)) {
      return;
    }

    window.open(mapUrl, '_blank', 'noopener');
  }

  setPickupAlwaysOpen(checked: boolean): void {
    this.pickupEditorForm.controls.alwaysOpen.setValue(checked);

    this.pickupScheduleRows.controls.forEach((group) => {
      const row = group;
      if (checked) {
        row.patchValue({ enabled: true, open: '00:00', close: '23:59' });
      } else {
        row.patchValue({ enabled: false, open: '09:00', close: '21:00' });
      }
    });
  }

  get isPickupAlwaysOpen(): boolean {
    return !!this.pickupEditorForm.controls.alwaysOpen.value;
  }

  setPickupDayEnabled(index: number, enabled: boolean): void {
    const row = this.pickupScheduleRows.at(index);

    if (this.isPickupAlwaysOpen && !enabled) {
      this.pickupEditorForm.controls.alwaysOpen.setValue(false);
    }

    row.controls['enabled'].setValue(enabled);

    if (!enabled) {
      return;
    }

    const open = String(row.controls['open'].value || '').trim();
    const close = String(row.controls['close'].value || '').trim();
    if (!open) {
      row.controls['open'].setValue('09:00');
    }
    if (!close) {
      row.controls['close'].setValue('21:00');
    }
  }

  isPickupDayEnabled(index: number): boolean {
    const row = this.pickupScheduleRows.at(index);
    return !!row.controls['enabled'].value;
  }

  private createPickupScheduleRow(): FormGroup {
    return this.fb.group({
      enabled: [true],
      open: ['09:00'],
      close: ['21:00'],
    });
  }

  private resetPickupScheduleRows(): void {
    this.pickupEditorForm.controls.alwaysOpen.setValue(false);
    this.pickupScheduleRows.controls.forEach((group) => {
      const row = group;
      row.patchValue({
        enabled: false,
        open: '09:00',
        close: '21:00',
      });
    });
  }

  private buildPickupTimingText(): string {
    if (this.isPickupAlwaysOpen) {
      return '24x7';
    }

    return this.pickupScheduleRows.controls
      .map((group, index) => {
        const row = group;
        const dayLabel = this.pickupWeekDays[index] || 'Mon';
        const enabled = !!row.controls['enabled'].value;
        if (!enabled) {
          return `${dayLabel} Closed`;
        }

        const open = String(row.controls['open'].value || '09:00').trim() || '09:00';
        const close = String(row.controls['close'].value || '21:00').trim() || '21:00';
        return `${dayLabel} ${open}-${close}`;
      })
      .join(' | ');
  }

  private composeCompleteAddress(location: Record<string, unknown>): string {
    const toText = (value: unknown): string => {
      if (typeof value === 'string') {
        return value.trim();
      }
      if (typeof value === 'number') {
        return String(value).trim();
      }
      return '';
    };
    const parts = [
      toText(location['storeAddressLine1']),
      toText(location['storeAddressLine2']),
      toText(location['city']),
      toText(location['state']),
      toText(location['postalCode']),
    ].filter((part) => !!part);

    return parts.join(', ');
  }

  private createBannerGroup(banner?: BannerImage): FormGroup {
    return this.fb.group({
      url: [banner?.url || '', Validators.required],
      text: [banner?.text || ''],
      sortOrder: [banner?.sortOrder ?? this.banners.length],
    });
  }

  addBanner(): void {
    if (!this.canWrite()) {
      return;
    }

    this.banners.push(this.createBannerGroup());
  }

  removeBanner(index: number): void {
    if (!this.canWrite()) {
      return;
    }

    this.banners.removeAt(index);
    this.reindexBannerWarningsAfterRemove(index);
  }

  onBannerInputChange(event: Event, index: number): void {
    if (!this.canWrite()) {
      return;
    }

    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (file) {
      if (file.size > this.BANNER_HARD_MAX_SIZE_BYTES) {
        this.toast.error('Banner file is too large. Maximum allowed size is 5 MB.');
      } else {
        this.onBannerFileSelected(file, index);
      }
    }

    input.value = '';
  }

  onBannerFileSelected(file: File, index: number): void {
    if (!this.canWrite()) {
      return;
    }

    this.inspectBannerImage(file)
      .then((audit) => {
        if (audit.blockReason) {
          this.setBannerWarning(index, audit.blockReason);
          this.toast.error(audit.blockReason);
          return;
        }

        this.setBannerWarning(index, audit.warningReason || null);
        if (audit.warningReason) {
          this.toast.warning(audit.warningReason, 'Banner advice', 5200);
        }

        this.uploadingBanner.set(index);
        this.mediaService
          .uploadTenantMedia(file, file.name)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: (asset) => {
              const group = this.banners.at(index) as FormGroup;
              group.patchValue({ url: asset.url });
              this.uploadingBanner.set(null);
              this.toast.success('Banner image uploaded.');
            },
            error: () => {
              this.uploadingBanner.set(null);
              this.toast.error('Failed to upload image.');
            },
          });
      })
      .catch(() => {
        this.toast.warning('Could not validate banner dimensions. Uploading as-is.', 'Banner advice');
        this.uploadingBanner.set(index);
        this.mediaService
          .uploadTenantMedia(file, file.name)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: (asset) => {
              const group = this.banners.at(index) as FormGroup;
              group.patchValue({ url: asset.url });
              this.uploadingBanner.set(null);
              this.toast.success('Banner image uploaded.');
            },
            error: () => {
              this.uploadingBanner.set(null);
              this.toast.error('Failed to upload image.');
            },
          });
      });
  }

  private setBannerWarning(index: number, message: string | null): void {
    this.bannerWarnings.update((current) => {
      const next = { ...current };
      if (message) {
        next[index] = message;
      } else {
        delete next[index];
      }
      return next;
    });
  }

  private reindexBannerWarningsAfterRemove(removedIndex: number): void {
    const current = this.bannerWarnings();
    const next: Record<number, string> = {};

    for (const [key, value] of Object.entries(current)) {
      const idx = Number(key);
      if (idx < removedIndex) {
        next[idx] = value;
      } else if (idx > removedIndex) {
        next[idx - 1] = value;
      }
    }

    this.bannerWarnings.set(next);
  }

  private inspectBannerImage(file: File): Promise<{ blockReason?: string; warningReason?: string }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(objectUrl);

        const width = img.naturalWidth || 0;
        const height = img.naturalHeight || 0;

        if (width < this.BANNER_MIN_W || height < this.BANNER_MIN_H) {
          resolve({
            blockReason: `Banner is too small (${width}x${height}). Minimum is ${this.BANNER_MIN_W}x${this.BANNER_MIN_H}.`,
          });
          return;
        }

        const ratio = height > 0 ? width / height : 0;
        const isRatioOutsideRange = ratio < this.BANNER_RATIO_MIN || ratio > this.BANNER_RATIO_MAX;

        if (isRatioOutsideRange) {
          resolve({
            warningReason: `Uploaded ratio is ${ratio.toFixed(2)}:1. Best result is 5:2 (~2.50:1), ideal ${this.BANNER_IDEAL_W}x${this.BANNER_IDEAL_H}.`,
          });
          return;
        }

        if (file.size > this.BANNER_SOFT_SIZE_BYTES) {
          resolve({
            warningReason: `Banner file is ${(file.size / 1024).toFixed(0)} KB. For faster mobile loading, target under 500 KB.`,
          });
          return;
        }

        resolve({});
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Failed to read image dimensions'));
      };

      img.src = objectUrl;
    });
  }

  /** Target logo canvas dimensions: 2× header display size (280×68) at 4.1:1 ratio. */
  private readonly LOGO_W = 280;
  private readonly LOGO_H = 68;

  onLogoFileSelected(file: File): void {
    if (!this.canWrite()) {
      return;
    }

    this.uploadingLogo.set(true);
    this._cropAndResizeLogo(file)
      .then((croppedFile) => {
        this.mediaService
          .uploadTenantMedia(croppedFile, croppedFile.name)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: (asset) => {
              this.configForm.patchValue({ logoUrl: asset.url });
              this.uploadingLogo.set(false);
              this.toast.success('Logo uploaded and optimised.');
            },
            error: () => {
              this.uploadingLogo.set(false);
              this.toast.error('Failed to upload logo.');
            },
          });
      })
      .catch(() => {
        // If canvas processing fails (e.g. SVG), upload original as-is
        this.mediaService
          .uploadTenantMedia(file, file.name)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: (asset) => {
              this.configForm.patchValue({ logoUrl: asset.url });
              this.uploadingLogo.set(false);
              this.toast.success('Logo uploaded.');
            },
            error: () => {
              this.uploadingLogo.set(false);
              this.toast.error('Failed to upload logo.');
            },
          });
      });
  }

  onLogoInputChange(event: Event): void {
    if (!this.canWrite()) {
      return;
    }

    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.onLogoFileSelected(file);
    }
    input.value = '';
  }

  /**
   * Center-crops the image to the target aspect ratio then resizes it
   * to LOGO_W × LOGO_H using an offscreen canvas.
   * Returns the result as a PNG File.
   */
  private _cropAndResizeLogo(file: File): Promise<File> {
    // SVG is vector — skip rasterisation, upload as-is
    if (file.type === 'image/svg+xml') return Promise.resolve(file);

    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const targetRatio = this.LOGO_W / this.LOGO_H; // ~4.12
        const srcRatio = img.naturalWidth / img.naturalHeight;

        let sx: number, sy: number, sw: number, sh: number;
        if (srcRatio > targetRatio) {
          // Image is wider than target — crop sides
          sh = img.naturalHeight;
          sw = Math.round(sh * targetRatio);
          sx = Math.round((img.naturalWidth - sw) / 2);
          sy = 0;
        } else {
          // Image is taller than target — crop top/bottom
          sw = img.naturalWidth;
          sh = Math.round(sw / targetRatio);
          sx = 0;
          sy = Math.round((img.naturalHeight - sh) / 2);
        }

        const canvas = document.createElement('canvas');
        canvas.width = this.LOGO_W;
        canvas.height = this.LOGO_H;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Canvas not supported')); return; }
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, this.LOGO_W, this.LOGO_H);

        canvas.toBlob(
          (blob) => {
            if (!blob) { reject(new Error('Canvas toBlob failed')); return; }
            const name = file.name.replace(/\.[^.]+$/, '') + '-logo.png';
            resolve(new File([blob], name, { type: 'image/png' }));
          },
          'image/png'
        );
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image load failed')); };
      img.src = url;
    });
  }

  save(): void {
    if (!this.canWrite()) {
      return;
    }

    if (this.configForm.invalid) {
      this.bypassProductsLayoutConfirm = false;
      this.configForm.markAllAsTouched();
      this.errorMessage.set(this.t('storefrontConfig.shareCenter.messages.validationError'));
      this.toast.error(this.t('storefrontConfig.shareCenter.messages.validationError'));
      return;
    }

    if (
      this.hasProductSetSettingsAccess() &&
      this.hasProductsTabLayoutChanged() &&
      !this.bypassProductsLayoutConfirm
    ) {
      this.showProductsLayoutConfirm.set(true);
      return;
    }

    this.bypassProductsLayoutConfirm = false;

    const raw = this.configForm.getRawValue();
    const resolvedStoreSlug = this.toSlug(raw.storeSlug || this.tenantCode() || '');
    const primaryColor = this.useCustomColors() ? (raw.primaryColor || this.defaultTheme.primaryColor) : this.defaultTheme.primaryColor;
    const secondaryColor = this.useCustomColors() ? (raw.secondaryColor || this.defaultTheme.secondaryColor) : this.defaultTheme.secondaryColor;
    const accentColor = this.useCustomColors() ? (raw.accentColor || this.defaultTheme.accentColor) : this.defaultTheme.accentColor;

    const paymentMethods: PaymentMethod[] = [];
    if (raw.paymentCOD) paymentMethods.push('COD');
    if (raw.paymentUPI) paymentMethods.push('UPI');
    if (raw.paymentCARD) paymentMethods.push('CARD');
    if (raw.paymentNET_BANKING) paymentMethods.push('NET_BANKING');

    const toSafeString = (value: unknown): string => {
      if (typeof value === 'string') {
        return value.trim();
      }
      if (typeof value === 'number' || typeof value === 'boolean') {
        return String(value).trim();
      }
      return '';
    };

    const toNullableNumber = (value: unknown): number | null => {
      if (value === null || value === '') {
        return null;
      }
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    };

    const payload: Partial<StorefrontConfig> = {
      enabled: this.normalizeBoolean(raw.enabled, true),
      logoUrl: raw.logoUrl || '',
      storeDisplayName: raw.storeDisplayName || '',
      storeSlug: resolvedStoreSlug,
      primaryColor,
      secondaryColor,
      accentColor,
      layoutMode: (raw.layoutMode as LayoutMode) || 'GRID',
      productsTabEnabled: this.normalizeBoolean(raw.productsTabEnabled, true),
      productsTabLayout: this.hasProductSetSettingsAccess()
        ? ((raw.productsTabLayout as ProductsTabLayout) || 'LAYOUT_1_CATEGORY_FIRST')
        : 'LAYOUT_1_CATEGORY_FIRST',
      b1g1HomeCardsPerRow: Number(raw.b1g1HomeCardsPerRow ?? 3),
      catalogInitialCategoryCount: Number(raw.catalogInitialCategoryCount ?? 3),
      catalogGroupsPerCategoryPage: Number(raw.catalogGroupsPerCategoryPage ?? 10),
      bannerImages: (raw.banners as { url: string; text: string; sortOrder: number }[]).map((b: { url: string; text: string; sortOrder: number }, i: number) => ({
        url: b.url || '',
        text: b.text || '',
        sortOrder: b.sortOrder ?? i,
      })),
      welcomeMessage: raw.welcomeMessage || '',
      footerText: raw.footerText || '',
      socialLinks: {
        whatsapp: raw.whatsappSocial || '',
        instagram: raw.instagramSocial || '',
        facebook: raw.facebookSocial || '',
      },
      showPacks: this.normalizeBoolean(raw.showPacks, true),
      fulfillmentMode: (raw.fulfillmentMode as FulfillmentMode) || 'DELIVERY',
      deliveryCharge: raw.deliveryCharge ?? 0,
      deliveryChargeNote: raw.deliveryChargeNote || '',
      estimatedDeliveryDays: raw.estimatedDeliveryDays ?? 0,
      pickupLocations: ((raw.pickupLocations as Array<Record<string, unknown>>) || []).map((location, index) => ({
        locationId: toSafeString(location['locationId']) || (index === 0 ? 'primary' : `location-${index + 1}`),
        locationName: toSafeString(location['locationName']) || (index === 0 ? 'Main Store' : `Pickup Location ${index + 1}`),
        storeAddressLine1: toSafeString(location['storeAddressLine1']),
        storeAddressLine2: toSafeString(location['storeAddressLine2']),
        city: toSafeString(location['city']),
        state: toSafeString(location['state']),
        postalCode: toSafeString(location['postalCode']),
        mapUrl: toSafeString(location['mapUrl']),
        latitude: toNullableNumber(location['latitude']),
        longitude: toNullableNumber(location['longitude']),
        pickupInstructions: toSafeString(location['pickupInstructions']),
        pickupTimingText: toSafeString(location['pickupTimingText']),
      })),
      minimumOrderValue: raw.minimumOrderValue ?? 0,
      pickupWindowType: (raw.pickupWindowType as 'DAYS' | 'HOURS') || 'DAYS',
      pickupWindowValue: Math.max(1, Number(raw.pickupWindowValue ?? 2)),
      pickupAdvanceDays: Math.max(0, Number(raw.pickupAdvanceDays ?? 0)),
      pickupSameDayLeadMinutes: Math.max(0, Number(raw.pickupSameDayLeadMinutes ?? 0)),
      allowCustomerCancellation: raw.allowCustomerCancellation !== false,
      cancellationWindowMinutes: Math.max(0, Number(raw.cancellationWindowMinutes ?? 0)),
      whatsappNumber: raw.whatsappNumber || '',
      paymentMethods,
    };

    this.saving.set(true);
    this.errorMessage.set(null);

    this.service
      .updateStorefrontConfig(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          const tenantId = String(res.data?.tenantId || this.tenantCode()).trim().toLowerCase();
          const cfg = res.data?.storefrontConfig;
          this.storefrontShare.set(res.data?.storefrontShare ?? null);
          this.trackShareCenterViewedOnce();
          if (cfg) {
            this.patchForm(cfg, tenantId);
          }
          this.toast.success(this.t('storefrontConfig.shareCenter.messages.saveSuccess'));
          this.saving.set(false);
        },
        error: (err) => {
          this.bypassProductsLayoutConfirm = false;
          const msg = (err as { error?: { message?: string } })?.error?.message;
          this.errorMessage.set(msg || this.t('storefrontConfig.shareCenter.messages.saveError'));
          this.saving.set(false);
        },
      });
  }

  hasProductsTabLayoutChanged(): boolean {
    const value = this.configForm.controls.productsTabLayout.value;
    const current = (value === 'LAYOUT_2_COLLECTION_FIRST'
      ? 'LAYOUT_2_COLLECTION_FIRST'
      : 'LAYOUT_1_CATEGORY_FIRST') as ProductsTabLayout;
    return current !== this.initialProductsTabLayout();
  }

  confirmProductsTabLayoutChange(): void {
    this.showProductsLayoutConfirm.set(false);
    this.bypassProductsLayoutConfirm = true;
    this.save();
  }

  cancelProductsTabLayoutChange(): void {
    this.showProductsLayoutConfirm.set(false);
  }

  copyStorefrontLink(): void {
    const storefrontUrl = String(this.storefrontShare()?.storefrontUrl || '').trim();
    if (!storefrontUrl || !this.hasStorefrontShareAccess()) {
      return;
    }

    this.shareBusy.set('copy');
    this.copyTextToClipboard(storefrontUrl)
      .then(() => {
        this.toast.success(this.t('storefrontConfig.shareCenter.messages.copySuccess'));
        this.trackShareEvent({ action: 'LINK_COPIED', channel: 'clipboard' });
      })
      .catch(() => {
        this.toast.warning(
          this.t('storefrontConfig.shareCenter.messages.copyFallback'),
          this.t('storefrontConfig.shareCenter.messages.manualCopyTitle')
        );
      })
      .finally(() => {
        this.shareBusy.set(null);
      });
  }

  shareOnWhatsApp(): void {
    const share = this.storefrontShare();
    const storefrontUrl = String(share?.storefrontUrl || '').trim();
    if (!storefrontUrl || !this.hasStorefrontShareAccess()) {
      return;
    }

    const storeName = String(this.configForm.controls.storeDisplayName.value || this.tenantCode() || 'our store').trim();
    const message = this.t('storefrontConfig.shareCenter.whatsAppMessage', { storeName, storefrontUrl });
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;

    this.shareBusy.set('whatsapp');
    globalThis.open?.(whatsappUrl, '_blank', 'noopener,noreferrer');
    this.trackShareEvent({ action: 'WHATSAPP_SHARE_INITIATED', channel: 'whatsapp' });
    this.shareBusy.set(null);
  }

  downloadStorefrontQr(): void {
    const share = this.storefrontShare();
    const dataUrl = String(share?.qrPngDataUrl || '').trim();
    if (!dataUrl || !this.hasStorefrontShareAccess()) {
      return;
    }

    this.shareBusy.set('download');
    const anchor = document.createElement('a');
    anchor.href = dataUrl;
    anchor.download = String(share?.qrFileName || `${this.tenantCode() || 'storefront'}-storefront-qr.png`).trim();
    anchor.rel = 'noopener';
    anchor.click();

    this.toast.success(this.t('storefrontConfig.shareCenter.messages.downloadSuccess'));
    this.trackShareEvent({ action: 'QR_DOWNLOADED', channel: 'download' });
    this.shareBusy.set(null);
  }

  private trackShareEvent(payload: StorefrontShareEventPayload): void {
    this.service
      .trackStorefrontShareEvent(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ error: () => {} });
  }

  private trackShareCenterViewedOnce(): void {
    if (this.shareCenterViewTracked || !this.hasStorefrontShareAccess() || !this.storefrontShare()?.storefrontUrl) {
      return;
    }

    this.shareCenterViewTracked = true;
    this.trackShareEvent({ action: 'SHARE_CENTER_VIEWED', channel: 'settings' });
  }

  private copyTextToClipboard(value: string): Promise<void> {
    if (navigator.clipboard?.writeText) {
      return navigator.clipboard.writeText(value);
    }

    globalThis.prompt?.(this.t('storefrontConfig.shareCenter.messages.manualCopyPrompt'), value);
    return Promise.reject(new Error('Clipboard not available'));
  }

  formatPlanDate(value: string | null | undefined): string {
    if (!value) {
      return this.t('storefrontConfig.shareCenter.notSet');
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return this.t('storefrontConfig.shareCenter.notSet');
    }

    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(date);
  }

  private toSlug(value: string): string {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replaceAll(/[^a-z0-9-]/g, '-')
      .replaceAll(/-+/g, '-')
      .replaceAll(/^-|-$/g, '')
      .slice(0, 64);
  }

  private t(key: string, params?: Record<string, string>): string {
    return this.translate.instant(key, params);
  }

  private normalizeBoolean(value: unknown, fallback: boolean): boolean {
    if (value === true || value === false) {
      return value;
    }

    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (normalized === 'true') {
        return true;
      }
      if (normalized === 'false') {
        return false;
      }
    }

    return fallback;
  }
}
