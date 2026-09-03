import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { startWith } from 'rxjs';

import {
  FormControlsModule,
  GomAlertToastService,
  GomButtonComponent,
  GomCardComponent,
  GomChipComponent,
  GomChipTone,
  GomModalComponent,
  GomSwitchComponent,
  GomTableColumn,
  GomTableComponent,
  GomTextareaComponent,
} from '@gomlibs/ui';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { DisableIfNoFeatureDirective } from '../../../shared/directives/disable-if-no-feature.directive';
import {
  DeliveryModeType,
  DeliveryService,
  DeliveryTimeUnit,
  FulfillmentMode,
  GeoDeliveryZone,
  PickupConfig,
  PincodeServiceabilityMode,
  ServiceablePincodeEntry,
  StorefrontConfig,
} from '../../delivery/delivery.service';

@Component({
  selector: 'gom-delivery-management',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormControlsModule,
    DisableIfNoFeatureDirective,
    GomButtonComponent,
    GomCardComponent,
    GomChipComponent,
    GomModalComponent,
    GomSwitchComponent,
    GomTableComponent,
    GomTextareaComponent,
  ],
  templateUrl: './delivery-management.component.html',
  styleUrl: './delivery-management.component.scss',
})
export class DeliveryManagementComponent implements OnInit {
  private readonly service = inject(DeliveryService);
  private readonly authSession = inject(AuthSessionService);

  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(GomAlertToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly canEdit = computed(() => this.authSession.hasFeature('delivery.management'));

  readonly pickupWeekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
  readonly pickupScheduleRows = this.fb.array(this.pickupWeekDays.map(() => this.createPickupScheduleRow()));

  readonly showDeliveryModal = signal(false);
  readonly showPickupModal = signal(false);
  readonly editingPickupIndex = signal<number | null>(null);
  readonly showPincodeModal = signal(false);
  readonly editingPincodeIndex = signal<number | null>(null);
  readonly serviceablePincodes = signal<ServiceablePincodeEntry[]>([]);
  readonly pincodeServiceabilityMode = signal<PincodeServiceabilityMode>('SERVE_ALL');
  readonly deliveryModeType = signal<DeliveryModeType>('PINCODE');
  readonly showGeoZoneModal = signal(false);
  readonly editingGeoZoneIndex = signal<number | null>(null);
  readonly geoDeliveryZones = signal<GeoDeliveryZone[]>([]);
  readonly showCancellationPolicyConfirm = signal(false);
  readonly cancellationPolicyChangedModes = signal<{ delivery: boolean; pickup: boolean }>({ delivery: false, pickup: false });
  readonly cancellationPolicyChangeMessage = computed(() => {
    const modes = this.cancellationPolicyChangedModes();
    if (modes.delivery && modes.pickup) {
      return 'You have changed the cancellation policy settings for both delivery and pickup orders.';
    } else if (modes.delivery) {
      return 'You have changed the cancellation policy settings for delivery orders.';
    } else if (modes.pickup) {
      return 'You have changed the cancellation policy settings for pickup orders.';
    }
    return 'You have changed the cancellation policy settings.';
  });
  readonly initialCancellationPolicies = signal({
    delivery: {
      mode: 'UNLIMITED' as 'UNLIMITED' | 'TIME_BASED' | 'STATUS_BASED' | 'HYBRID' | 'NONE',
      timeValue: 0,
      timeUnit: 'MINUTES' as 'MINUTES' | 'HOURS' | 'DAYS',
      blockedAfterStatus: 'SHIPPED' as 'CONFIRMED' | 'PACKED' | 'ASSIGNED' | 'SHIPPED' | 'DISPATCHED' | 'ATTEMPTED_DELIVERY',
    },
    pickup: {
      mode: 'UNLIMITED' as 'UNLIMITED' | 'TIME_BASED' | 'STATUS_BASED' | 'HYBRID' | 'NONE',
      timeValue: 0,
      timeUnit: 'MINUTES' as 'MINUTES' | 'HOURS' | 'DAYS',
      blockedAfterStatus: 'SHIPPED' as 'CONFIRMED' | 'PACKED' | 'ASSIGNED' | 'SHIPPED' | 'DISPATCHED' | 'ATTEMPTED_DELIVERY',
    },
  });

  private bypassCancellationConfirm = false;

  readonly configForm = this.fb.group({
    fulfillmentMode: ['DELIVERY'],
    deliveryCharge: [0, [Validators.min(0)]],
    deliveryChargeNote: [''],
    estimatedDeliveryTime: [0, [Validators.min(0)]],
    estimatedDeliveryTimeUnit: ['DAYS'],
    minimumOrderValue: [0, [Validators.min(0)]],
    pickupLocations: this.fb.array([this.createPickupLocationGroup()]) as FormArray,
    pickupAdvanceDays: [0, [Validators.min(0), Validators.max(30)]],
    pickupSameDayLeadMinutes: [0, [Validators.min(0), Validators.max(1440)]],
    whatsappNumber: [''],
    cancellationPolicies: this.fb.group({
      delivery: this.fb.group({
        mode: ['UNLIMITED' as 'UNLIMITED' | 'TIME_BASED' | 'STATUS_BASED' | 'HYBRID' | 'NONE'],
        timeValue: [0, [Validators.min(0), Validators.max(365)]],
        timeUnit: ['MINUTES' as 'MINUTES' | 'HOURS' | 'DAYS'],
        blockedAfterStatus: ['SHIPPED' as 'CONFIRMED' | 'PACKED' | 'ASSIGNED' | 'SHIPPED' | 'DISPATCHED' | 'ATTEMPTED_DELIVERY'],
      }),
      pickup: this.fb.group({
        mode: ['UNLIMITED' as 'UNLIMITED' | 'TIME_BASED' | 'STATUS_BASED' | 'HYBRID' | 'NONE'],
        timeValue: [0, [Validators.min(0), Validators.max(365)]],
        timeUnit: ['MINUTES' as 'MINUTES' | 'HOURS' | 'DAYS'],
        blockedAfterStatus: ['SHIPPED' as 'CONFIRMED' | 'PACKED' | 'ASSIGNED' | 'SHIPPED' | 'DISPATCHED' | 'ATTEMPTED_DELIVERY'],
      }),
    }),
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

  readonly fulfillmentOptions = [
    { value: 'DELIVERY', label: 'Delivery Only' },
    { value: 'PICKUP', label: 'Come & Collect Only' },
    { value: 'BOTH', label: 'Both Delivery and Collect' },
  ];
  readonly deliveryModeTypeOptions = [
    { value: 'PINCODE', label: 'Pincode-based' },
    { value: 'GEOGRAPHICAL', label: 'Geographical (radius)' },
  ];
  readonly pincodeServiceabilityOptions = [
    { value: 'SERVE_ALL', label: 'Serve All — Accept every pincode' },
    { value: 'RESTRICTED', label: 'Restricted — Only whitelisted pincodes' },
  ];
  readonly deliveryTimeUnitOptions = [
    { value: 'DAYS', label: 'Days' },
    { value: 'HOURS', label: 'Hours' },
    { value: 'MINUTES', label: 'Minutes' },
  ];
  readonly statusOptions = [
    { value: 'ACTIVE', label: 'Active' },
    { value: 'INACTIVE', label: 'Inactive' },
  ];
  readonly cancellationStatusOptions = [
    { value: 'CONFIRMED', label: 'Confirmed' },
    { value: 'PACKED', label: 'Packed' },
    { value: 'ASSIGNED', label: 'Assigned' },
    { value: 'SHIPPED', label: 'Shipped' },
    { value: 'DISPATCHED', label: 'Dispatched' },
    { value: 'ATTEMPTED_DELIVERY', label: 'Attempted Delivery' },
  ];

  readonly serviceabilityModeControl = this.fb.control<PincodeServiceabilityMode>('SERVE_ALL', { nonNullable: true });
  readonly pincodeForm = this.fb.group({
    pincode: ['', [Validators.required, Validators.pattern(/^\d{1,6}\*?$/)]],
    deliveryChargeOverride: [null as number | null],
    estimatedTimeOverride: [null as number | null],
    estimatedTimeUnit: ['DAYS' as DeliveryTimeUnit],
    active: ['ACTIVE' as 'ACTIVE' | 'INACTIVE'],
  });
  readonly geoZoneForm = this.fb.group({
    label: ['', [Validators.required]],
    address: [''],
    latitude: [null as number | null, [Validators.required]],
    longitude: [null as number | null, [Validators.required]],
    radiusKm: [5, [Validators.required, Validators.min(0.1)]],
    deliveryCharge: [0, [Validators.min(0)]],
    estimatedDeliveryTime: [null as number | null, [Validators.required, Validators.min(0)]],
    estimatedDeliveryTimeUnit: ['DAYS' as DeliveryTimeUnit],
    instructions: [''],
    active: ['ACTIVE' as 'ACTIVE' | 'INACTIVE'],
  });
  readonly deliveryEditorForm = this.fb.group({
    deliveryCharge: [0, [Validators.min(0)]],
    deliveryChargeNote: [''],
    estimatedDeliveryTime: [0, [Validators.min(0)]],
    estimatedDeliveryTimeUnit: ['DAYS' as DeliveryTimeUnit],
    minimumOrderValue: [0, [Validators.min(0)]],
  });
  readonly pickupEditorForm = this.fb.group({
    completeAddress: [''],
    mapUrl: [''],
    pickupInstructions: [''],
    alwaysOpen: [false],
    pickupAdvanceDays: [null as number | null, [Validators.min(0), Validators.max(30)]],
    pickupSameDayLeadMinutes: [null as number | null, [Validators.min(0), Validators.max(1440)]],
  });

  readonly geoZoneTableColumns: GomTableColumn[] = [
    { key: 'label', header: 'Zone Name', width: '10rem' },
    { key: 'address', header: 'Location', format: (value) => value ? String(value) : '—' },
    { key: 'radiusKm', header: 'Radius', width: '6rem', format: (value) => `${value} km` },
    { key: 'deliveryCharge', header: 'Charge', width: '6rem', format: (value) => `₹${value ?? 0}` },
    {
      key: 'estimatedDeliveryTime', header: 'Est. Time', width: '8rem',
      format: (value, row) => this.formatDeliveryTime(value, (row as GeoDeliveryZone).estimatedDeliveryTimeUnit),
    },
    { key: 'active', header: 'Status', width: '7rem', chipTone: (value) => value ? 'success' : 'neutral', format: (value) => value ? 'Active' : 'Inactive' },
    { key: 'actions', header: 'Actions', width: '8rem', actionButtons: [
      { label: 'Edit', actionKey: 'edit', icon: 'ri-edit-line', variant: 'secondary' },
      { label: 'Delete', actionKey: 'delete', icon: 'ri-delete-bin-line', variant: 'danger' },
    ] },
  ];
  readonly pincodeTableColumns: GomTableColumn<ServiceablePincodeEntry>[] = [
    { key: 'pincode', header: 'Pincode', width: '10rem' },
    { key: 'deliveryChargeOverride', header: 'Charge Override', format: (value) => value != null ? `₹${value}` : '— (default)' },
    {
      key: 'estimatedTimeOverride', header: 'Time Override',
      format: (value, row) => value == null ? '— (default)' : this.formatDeliveryTime(value, (row as ServiceablePincodeEntry).estimatedTimeUnit),
    },
    { key: 'active', header: 'Status', width: '8rem', chipTone: (value) => value ? 'success' : 'neutral', format: (value) => value ? 'Active' : 'Inactive' },
    { key: 'actions', header: 'Actions', width: '8rem', actionButtons: [
      { label: 'Edit', actionKey: 'edit', icon: 'ri-edit-line', variant: 'secondary' },
      { label: 'Delete', actionKey: 'delete', icon: 'ri-delete-bin-line', variant: 'danger' },
    ] },
  ];

  ngOnInit(): void {
    this.ensurePickupLocation();
    this.serviceabilityModeControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((mode) => this.pincodeServiceabilityMode.set(mode));
    this.loadConfig();
  }

  private loadConfig(): void {
    this.loading.set(true);
    this.service
      .getTenantConfig()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          const cfg = res.data?.storefrontConfig;
          if (cfg) {
            this.hydrate(cfg);
          }
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.toast.error('Failed to load delivery configuration');
        },
      });
  }

  save(applyToExisting?: boolean): void {
    if (!this.canEdit()) {
      return;
    }

    if (this.configForm.invalid) {
      this.bypassCancellationConfirm = false;
      this.configForm.markAllAsTouched();
      this.toast.error('Please fill all required fields correctly');
      return;
    }

    // Check for cancellation policy changes first
    if (this.hasCancellationPolicyChanged() && !this.bypassCancellationConfirm) {
      this.showCancellationPolicyConfirm.set(true);
      return;
    }

    this.bypassCancellationConfirm = false;

    const raw = this.configForm.getRawValue();

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
      fulfillmentMode: (raw.fulfillmentMode as FulfillmentMode) || 'DELIVERY',
      deliveryCharge: raw.deliveryCharge ?? 0,
      deliveryChargeNote: raw.deliveryChargeNote || '',
      estimatedDeliveryTime: raw.estimatedDeliveryTime ?? 0,
      estimatedDeliveryTimeUnit: (raw.estimatedDeliveryTimeUnit as DeliveryTimeUnit) || 'DAYS',
      deliveryModeType: this.deliveryModeType(),
      pincodeServiceabilityMode: this.pincodeServiceabilityMode(),
      serviceablePincodes: this.serviceablePincodes(),
      geoDeliveryZones: this.geoDeliveryZones(),
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
        pickupAdvanceDays: toNullableNumber(location['pickupAdvanceDays']),
        pickupSameDayLeadMinutes: toNullableNumber(location['pickupSameDayLeadMinutes']),
      })),
      minimumOrderValue: raw.minimumOrderValue ?? 0,
      pickupAdvanceDays: Math.max(0, Number(raw.pickupAdvanceDays ?? 0)),
      pickupSameDayLeadMinutes: Math.max(0, Number(raw.pickupSameDayLeadMinutes ?? 0)),
      whatsappNumber: raw.whatsappNumber || '',
      cancellationPolicies: {
        delivery: {
          mode: (raw.cancellationPolicies?.delivery?.mode as 'UNLIMITED' | 'TIME_BASED' | 'STATUS_BASED' | 'HYBRID' | 'NONE') ?? 'UNLIMITED',
          timeValue: Math.max(0, Number(raw.cancellationPolicies?.delivery?.timeValue ?? 0)),
          timeUnit: (raw.cancellationPolicies?.delivery?.timeUnit as 'MINUTES' | 'HOURS' | 'DAYS') ?? 'MINUTES',
          blockedAfterStatus: (raw.cancellationPolicies?.delivery?.blockedAfterStatus as 'CONFIRMED' | 'PACKED' | 'ASSIGNED' | 'SHIPPED' | 'DISPATCHED' | 'ATTEMPTED_DELIVERY') ?? 'SHIPPED',
        },
        pickup: {
          mode: (raw.cancellationPolicies?.pickup?.mode as 'UNLIMITED' | 'TIME_BASED' | 'STATUS_BASED' | 'HYBRID' | 'NONE') ?? 'UNLIMITED',
          timeValue: Math.max(0, Number(raw.cancellationPolicies?.pickup?.timeValue ?? 0)),
          timeUnit: (raw.cancellationPolicies?.pickup?.timeUnit as 'MINUTES' | 'HOURS' | 'DAYS') ?? 'MINUTES',
          blockedAfterStatus: (raw.cancellationPolicies?.pickup?.blockedAfterStatus as 'CONFIRMED' | 'PACKED' | 'ASSIGNED' | 'SHIPPED' | 'DISPATCHED' | 'ATTEMPTED_DELIVERY') ?? 'SHIPPED',
        },
      },
      applyDeliveryPolicyToExisting: this.cancellationPolicyChangedModes().delivery && (applyToExisting ?? false),
      applyPickupPolicyToExisting: this.cancellationPolicyChangedModes().pickup && (applyToExisting ?? false),
    };

    this.saving.set(true);

    this.service
      .updateStorefrontConfig(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          const cfg = res.data?.storefrontConfig;
          if (cfg) {
            this.hydrate(cfg);
          }
          this.toast.success('Delivery settings saved successfully');
          this.saving.set(false);
        },
        error: (err) => {
          this.bypassCancellationConfirm = false;
          const msg = (err as { error?: { message?: string } })?.error?.message;
          this.toast.error(msg || 'Failed to save delivery settings');
          this.saving.set(false);
        },
      });
  }

  hasCancellationPolicyChanged(): boolean {
    const current = this.configForm.getRawValue();
    const initial = this.initialCancellationPolicies();
    
    const deliveryChanged = (
      current.cancellationPolicies?.delivery?.mode !== initial.delivery.mode ||
      current.cancellationPolicies?.delivery?.timeValue !== initial.delivery.timeValue ||
      current.cancellationPolicies?.delivery?.timeUnit !== initial.delivery.timeUnit ||
      current.cancellationPolicies?.delivery?.blockedAfterStatus !== initial.delivery.blockedAfterStatus
    );

    const pickupChanged = (
      current.cancellationPolicies?.pickup?.mode !== initial.pickup.mode ||
      current.cancellationPolicies?.pickup?.timeValue !== initial.pickup.timeValue ||
      current.cancellationPolicies?.pickup?.timeUnit !== initial.pickup.timeUnit ||
      current.cancellationPolicies?.pickup?.blockedAfterStatus !== initial.pickup.blockedAfterStatus
    );
    
    this.cancellationPolicyChangedModes.set({ delivery: deliveryChanged, pickup: pickupChanged });
    
    return deliveryChanged || pickupChanged;
  }

  confirmCancellationPolicyChange(applyToExisting: boolean): void {
    this.showCancellationPolicyConfirm.set(false);
    this.bypassCancellationConfirm = true;
    this.save(applyToExisting);
  }

  cancelCancellationPolicyChange(): void {
    this.showCancellationPolicyConfirm.set(false);
  }

  getSelectedApplyScope(): boolean {
    const radio = document.querySelector('input[name="applyScope"]:checked') as HTMLInputElement;
    return radio?.value === 'all';
  }

  get pickupLocations(): FormArray {
    return this.configForm.get('pickupLocations') as FormArray;
  }

  get shouldShowDeliveryFields(): boolean {
    const mode = this.selectedFulfillmentMode();
    return mode === 'DELIVERY' || mode === 'BOTH';
  }

  get shouldShowPickupFields(): boolean {
    const mode = this.selectedFulfillmentMode();
    return mode === 'PICKUP' || mode === 'BOTH';
  }

  private hydrate(config: StorefrontConfig): void {
    this.deliveryModeType.set(config.deliveryModeType || 'PINCODE');
    const serviceabilityMode = config.pincodeServiceabilityMode || 'SERVE_ALL';
    this.pincodeServiceabilityMode.set(serviceabilityMode);
    this.serviceabilityModeControl.setValue(serviceabilityMode, { emitEvent: false });
    this.serviceablePincodes.set(config.serviceablePincodes || []);
    this.geoDeliveryZones.set(config.geoDeliveryZones || []);

    this.configForm.patchValue({
      fulfillmentMode: config.fulfillmentMode || 'DELIVERY',
      deliveryCharge: config.deliveryCharge ?? 0,
      deliveryChargeNote: config.deliveryChargeNote || '',
      estimatedDeliveryTime: config.estimatedDeliveryTime ?? config.estimatedDeliveryDays ?? 0,
      estimatedDeliveryTimeUnit: config.estimatedDeliveryTimeUnit || 'DAYS',
      minimumOrderValue: config.minimumOrderValue ?? 0,
      pickupAdvanceDays: config.pickupAdvanceDays ?? 0,
      pickupSameDayLeadMinutes: config.pickupSameDayLeadMinutes ?? 0,
      whatsappNumber: config.whatsappNumber || '',
      cancellationPolicies: {
        delivery: {
          mode: config.cancellationPolicies?.delivery?.mode ?? 'UNLIMITED',
          timeValue: config.cancellationPolicies?.delivery?.timeValue ?? 0,
          timeUnit: config.cancellationPolicies?.delivery?.timeUnit ?? 'MINUTES',
          blockedAfterStatus: config.cancellationPolicies?.delivery?.blockedAfterStatus ?? 'SHIPPED',
        },
        pickup: {
          mode: config.cancellationPolicies?.pickup?.mode ?? 'UNLIMITED',
          timeValue: config.cancellationPolicies?.pickup?.timeValue ?? 0,
          timeUnit: config.cancellationPolicies?.pickup?.timeUnit ?? 'MINUTES',
          blockedAfterStatus: config.cancellationPolicies?.pickup?.blockedAfterStatus ?? 'SHIPPED',
        },
      },
    });

   // Store initial cancellation policies for change detection
    this.initialCancellationPolicies.set({
      delivery: {
        mode: config.cancellationPolicies?.delivery?.mode ?? 'UNLIMITED',
        timeValue: config.cancellationPolicies?.delivery?.timeValue ?? 0,
        timeUnit: config.cancellationPolicies?.delivery?.timeUnit ?? 'MINUTES',
        blockedAfterStatus: config.cancellationPolicies?.delivery?.blockedAfterStatus ?? 'SHIPPED',
      },
      pickup: {
        mode: config.cancellationPolicies?.pickup?.mode ?? 'UNLIMITED',
        timeValue: config.cancellationPolicies?.pickup?.timeValue ?? 0,
        timeUnit: config.cancellationPolicies?.pickup?.timeUnit ?? 'MINUTES',
        blockedAfterStatus: config.cancellationPolicies?.pickup?.blockedAfterStatus ?? 'SHIPPED',
      },
    });

    const locations = config.pickupLocations?.length ? config.pickupLocations : [config.pickupConfig || {}];
    this.pickupLocations.clear();
    locations.forEach((location, index) => this.pickupLocations.push(this.createPickupLocationGroup(this.normalizePickupLocation(location, index))));
    this.ensurePickupLocation();
  }

  setFulfillmentMode(mode: FulfillmentMode): void {
    if (this.canEdit()) this.configForm.get('fulfillmentMode')?.setValue(mode);
  }

  getFulfillmentChipTone(mode: FulfillmentMode): GomChipTone {
    return this.selectedFulfillmentMode() === mode ? 'info' : 'neutral';
  }

  setDeliveryModeType(mode: DeliveryModeType): void {
    if (this.canEdit()) this.deliveryModeType.set(mode);
  }

  openDeliveryEditor(): void {
    this.deliveryEditorForm.patchValue({
      deliveryCharge: Number(this.configForm.get('deliveryCharge')?.value ?? 0),
      deliveryChargeNote: this.configForm.get('deliveryChargeNote')?.value || '',
      estimatedDeliveryTime: Number(this.configForm.get('estimatedDeliveryTime')?.value ?? 0),
      estimatedDeliveryTimeUnit: (this.configForm.get('estimatedDeliveryTimeUnit')?.value || 'DAYS') as DeliveryTimeUnit,
      minimumOrderValue: Number(this.configForm.get('minimumOrderValue')?.value ?? 0),
    });
    this.showDeliveryModal.set(true);
  }

  closeDeliveryEditor(): void { this.showDeliveryModal.set(false); }

  saveDeliveryEditor(): void {
    if (this.deliveryEditorForm.invalid) {
      this.deliveryEditorForm.markAllAsTouched();
      return;
    }
    const value = this.deliveryEditorForm.getRawValue();
    this.configForm.patchValue({
      deliveryCharge: Number(value.deliveryCharge ?? 0),
      deliveryChargeNote: value.deliveryChargeNote || '',
      estimatedDeliveryTime: Number(value.estimatedDeliveryTime ?? 0),
      estimatedDeliveryTimeUnit: value.estimatedDeliveryTimeUnit || 'DAYS',
      minimumOrderValue: Number(value.minimumOrderValue ?? 0),
    });
    this.showDeliveryModal.set(false);
  }

  openAddPincode(): void {
    this.pincodeForm.reset({ active: 'ACTIVE', deliveryChargeOverride: null, estimatedTimeOverride: null, estimatedTimeUnit: 'DAYS' });
    this.editingPincodeIndex.set(null);
    this.showPincodeModal.set(true);
  }

  openEditPincode(index: number): void {
    const entry = this.serviceablePincodes()[index];
    if (!entry) return;
    this.pincodeForm.patchValue({ ...entry, active: entry.active ? 'ACTIVE' : 'INACTIVE' });
    this.editingPincodeIndex.set(index);
    this.showPincodeModal.set(true);
  }

  savePincode(): void {
    this.pincodeForm.markAllAsTouched();
    if (this.pincodeForm.invalid) return;
    const value = this.pincodeForm.getRawValue();
    const entry: ServiceablePincodeEntry = {
      pincode: value.pincode || '',
      deliveryChargeOverride: value.deliveryChargeOverride,
      estimatedTimeOverride: value.estimatedTimeOverride,
      estimatedTimeUnit: value.estimatedTimeUnit || 'DAYS',
      active: value.active === 'ACTIVE',
    };
    const entries = [...this.serviceablePincodes()];
    const index = this.editingPincodeIndex();
    if (index !== null) {
      entries[index] = entry;
    } else if (entries.some((item) => item.pincode === entry.pincode)) {
      this.toast.error(`Pincode ${entry.pincode} already exists.`);
      return;
    } else {
      entries.push(entry);
    }
    this.serviceablePincodes.set(entries);
    this.showPincodeModal.set(false);
    this.toast.info(index !== null ? 'Pincode updated. Click Save to persist changes.' : 'Pincode added. Click Save to persist changes.');
  }

  onPincodeRowAction(event: { actionKey: string; row: Record<string, unknown> }): void {
    const index = this.serviceablePincodes().indexOf(event.row as ServiceablePincodeEntry);
    if (event.actionKey === 'edit') this.openEditPincode(index);
    if (event.actionKey === 'delete') this.removePincode(index);
  }

  private removePincode(index: number): void {
    if (!this.canEdit()) return;
    this.serviceablePincodes.set(this.serviceablePincodes().filter((_, itemIndex) => itemIndex !== index));
    this.toast.info('Pincode removed. Click Save to persist changes.');
  }

  openAddGeoZone(): void {
    this.geoZoneForm.reset({ active: 'ACTIVE', radiusKm: 5, deliveryCharge: 0, latitude: null, longitude: null, estimatedDeliveryTime: null, estimatedDeliveryTimeUnit: 'DAYS' });
    this.editingGeoZoneIndex.set(null);
    this.showGeoZoneModal.set(true);
  }

  openEditGeoZone(index: number): void {
    const zone = this.geoDeliveryZones()[index];
    if (!zone) return;
    this.geoZoneForm.patchValue({ ...zone, active: zone.active ? 'ACTIVE' : 'INACTIVE' });
    this.editingGeoZoneIndex.set(index);
    this.showGeoZoneModal.set(true);
  }

  saveGeoZone(): void {
    this.geoZoneForm.markAllAsTouched();
    if (this.geoZoneForm.invalid) return;
    const value = this.geoZoneForm.getRawValue();
    const zones = [...this.geoDeliveryZones()];
    const index = this.editingGeoZoneIndex();
    const zone: GeoDeliveryZone = {
      zoneId: index === null ? `zone-${Date.now()}` : zones[index].zoneId,
      label: value.label || '', address: value.address || '', latitude: value.latitude!, longitude: value.longitude!,
      radiusKm: value.radiusKm!, deliveryCharge: value.deliveryCharge ?? 0,
      estimatedDeliveryTime: value.estimatedDeliveryTime,
      estimatedDeliveryTimeUnit: value.estimatedDeliveryTimeUnit || 'DAYS',
      instructions: value.instructions || '', active: value.active === 'ACTIVE',
    };
    if (index === null) zones.push(zone); else zones[index] = zone;
    this.geoDeliveryZones.set(zones);
    this.showGeoZoneModal.set(false);
    this.toast.info(index !== null ? 'Zone updated. Click Save to persist changes.' : 'Zone added. Click Save to persist changes.');
  }

  onGeoZoneRowAction(event: { actionKey: string; row: Record<string, unknown> }): void {
    const index = this.geoDeliveryZones().indexOf(event.row as GeoDeliveryZone);
    if (event.actionKey === 'edit') this.openEditGeoZone(index);
    if (event.actionKey === 'delete') this.removeGeoZone(index);
  }

  private removeGeoZone(index: number): void {
    if (!this.canEdit()) return;
    this.geoDeliveryZones.set(this.geoDeliveryZones().filter((_, itemIndex) => itemIndex !== index));
    this.toast.info('Zone removed. Click Save to persist changes.');
  }

  openPickupEditor(index?: number): void {
    const targetIndex = typeof index === 'number' ? index : null;
    this.editingPickupIndex.set(targetIndex);
    this.resetPickupScheduleRows();
    if (targetIndex === null) {
      this.pickupEditorForm.reset({ completeAddress: '', mapUrl: '', pickupInstructions: '', alwaysOpen: false, pickupAdvanceDays: null, pickupSameDayLeadMinutes: null });
    } else {
      const location = (this.pickupLocations.at(targetIndex) as FormGroup).getRawValue();
      this.pickupEditorForm.patchValue({
        completeAddress: this.composeCompleteAddress(location), mapUrl: String(location.mapUrl || ''),
        pickupInstructions: String(location.pickupInstructions || ''), alwaysOpen: /^24\s*x\s*7$/i.test(String(location.pickupTimingText || '')),
        pickupAdvanceDays: location.pickupAdvanceDays ?? null, pickupSameDayLeadMinutes: location.pickupSameDayLeadMinutes ?? null,
      });
      if (this.isPickupAlwaysOpen) this.setPickupAlwaysOpen(true);
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
    const value = this.pickupEditorForm.getRawValue();
    const targetIndex = this.editingPickupIndex();
    const index = targetIndex ?? this.pickupLocations.length;
    const existing = targetIndex === null ? undefined : (this.pickupLocations.at(targetIndex) as FormGroup).getRawValue();
    const location = this.normalizePickupLocation({
      locationId: existing?.locationId, locationName: existing?.locationName,
      storeAddressLine1: String(value.completeAddress || '').trim(), mapUrl: value.mapUrl || '',
      pickupInstructions: value.pickupInstructions || '', pickupTimingText: this.buildPickupTimingText(),
      pickupAdvanceDays: value.pickupAdvanceDays == null ? null : Number(value.pickupAdvanceDays),
      pickupSameDayLeadMinutes: value.pickupSameDayLeadMinutes == null ? null : Number(value.pickupSameDayLeadMinutes),
    }, index);
    if (targetIndex === null) this.pickupLocations.push(this.createPickupLocationGroup(location));
    else (this.pickupLocations.at(targetIndex) as FormGroup).patchValue(location);
    this.closePickupEditor();
  }

  removePickupLocation(index: number): void {
    if (this.canEdit() && this.pickupLocations.length > 1) this.pickupLocations.removeAt(index);
  }

  getPickupLocationTitle(location: FormGroup, index: number): string {
    return String(location.get('locationName')?.value || '').trim() || `Pickup Location ${index + 1}`;
  }

  getPickupAddressSummary(location: FormGroup): string {
    const fields = ['storeAddressLine1', 'storeAddressLine2', 'city', 'state', 'postalCode'];
    return fields.map((field) => String(location.get(field)?.value || '').trim()).filter(Boolean).join(', ') || 'Address details not added yet.';
  }

  canOpenPickupMap(): boolean { return /^https?:\/\//i.test(String(this.pickupEditorForm.controls.mapUrl.value || '').trim()); }

  openPickupMapLink(): void {
    const url = String(this.pickupEditorForm.controls.mapUrl.value || '').trim();
    if (/^https?:\/\//i.test(url)) window.open(url, '_blank', 'noopener');
  }

  setPickupAlwaysOpen(checked: boolean): void {
    this.pickupEditorForm.controls.alwaysOpen.setValue(checked);
    this.pickupScheduleRows.controls.forEach((row) => row.patchValue(checked
      ? { enabled: true, open: '00:00', close: '23:59' }
      : { enabled: false, open: '09:00', close: '21:00' }));
  }

  get isPickupAlwaysOpen(): boolean { return !!this.pickupEditorForm.controls.alwaysOpen.value; }

  setPickupDayEnabled(index: number, enabled: boolean): void {
    const row = this.pickupScheduleRows.at(index);
    if (this.isPickupAlwaysOpen && !enabled) this.pickupEditorForm.controls.alwaysOpen.setValue(false);
    row.controls['enabled'].setValue(enabled);
    if (enabled) row.patchValue({ open: row.controls['open'].value || '09:00', close: row.controls['close'].value || '21:00' });
  }

  isPickupDayEnabled(index: number): boolean { return !!this.pickupScheduleRows.at(index).controls['enabled'].value; }

  private ensurePickupLocation(): void {
    if (this.pickupLocations && !this.pickupLocations.length) this.pickupLocations.push(this.createPickupLocationGroup());
  }

  private createPickupLocationGroup(location?: Partial<PickupConfig>): FormGroup {
    return this.fb.group({
      locationId: [location?.locationId || ''], locationName: [location?.locationName || ''],
      storeAddressLine1: [location?.storeAddressLine1 || ''], storeAddressLine2: [location?.storeAddressLine2 || ''],
      city: [location?.city || ''], state: [location?.state || ''], postalCode: [location?.postalCode || ''],
      mapUrl: [location?.mapUrl || ''], latitude: [location?.latitude ?? null], longitude: [location?.longitude ?? null],
      pickupInstructions: [location?.pickupInstructions || ''], pickupTimingText: [location?.pickupTimingText || ''],
      pickupAdvanceDays: [location?.pickupAdvanceDays ?? null], pickupSameDayLeadMinutes: [location?.pickupSameDayLeadMinutes ?? null],
    });
  }

  private normalizePickupLocation(location: Partial<PickupConfig> | undefined, index: number): PickupConfig {
    return {
      locationId: String(location?.locationId || (index === 0 ? 'primary' : `location-${index + 1}`)).trim(),
      locationName: String(location?.locationName || (index === 0 ? 'Main Store' : `Pickup Location ${index + 1}`)).trim(),
      storeAddressLine1: location?.storeAddressLine1 || '', storeAddressLine2: location?.storeAddressLine2 || '',
      city: location?.city || '', state: location?.state || '', postalCode: location?.postalCode || '', mapUrl: location?.mapUrl || '',
      latitude: location?.latitude ?? null, longitude: location?.longitude ?? null, pickupInstructions: location?.pickupInstructions || '',
      pickupTimingText: location?.pickupTimingText || '', pickupAdvanceDays: location?.pickupAdvanceDays ?? null,
      pickupSameDayLeadMinutes: location?.pickupSameDayLeadMinutes ?? null,
    };
  }

  private createPickupScheduleRow(): FormGroup {
    return this.fb.group({ enabled: [true], open: ['09:00'], close: ['21:00'] });
  }

  private resetPickupScheduleRows(): void {
    this.pickupEditorForm.controls.alwaysOpen.setValue(false);
    this.pickupScheduleRows.controls.forEach((row) => row.patchValue({ enabled: false, open: '09:00', close: '21:00' }));
  }

  private buildPickupTimingText(): string {
    if (this.isPickupAlwaysOpen) return '24x7';
    return this.pickupScheduleRows.controls.map((row, index) => row.controls['enabled'].value
      ? `${this.pickupWeekDays[index]} ${row.controls['open'].value || '09:00'}-${row.controls['close'].value || '21:00'}`
      : `${this.pickupWeekDays[index]} Closed`).join(' | ');
  }

  private composeCompleteAddress(location: Record<string, unknown>): string {
    return ['storeAddressLine1', 'storeAddressLine2', 'city', 'state', 'postalCode']
      .map((field) => String(location[field] || '').trim()).filter(Boolean).join(', ');
  }

  private formatDeliveryTime(value: unknown, unit: DeliveryTimeUnit | undefined): string {
    if (value == null) return '—';
    const labels: Record<DeliveryTimeUnit, string> = { DAYS: 'day(s)', HOURS: 'hr(s)', MINUTES: 'min(s)' };
    return `${value} ${labels[unit || 'DAYS']}`;
  }
}
