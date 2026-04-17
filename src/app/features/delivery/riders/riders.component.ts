import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, combineLatest, debounceTime, of, startWith, switchMap } from 'rxjs';

import { GomAlertToastService } from '../../../shared/components/alert';
import { FormControlsModule, GomButtonComponent } from '../../../shared/components/form-controls';
import { GomConfirmationModalComponent, GomModalComponent } from '../../../shared/components/modal';
import { GomTableColumn, GomTableComponent, GomTableRow } from '../../../shared/components/table';
import { DeliveryService, EmployeeCodePreview, Rider, RiderPayload, RiderStatus } from '../delivery.service';
import { AuthSessionService } from '../../../core/auth/auth-session.service';

interface RiderRow extends GomTableRow {
  _id: string;
  name: string;
  phone: string;
  employeeCode: string;
  vehicle: string;
  zones: string;
  status: string;
  updatedAt: string;
  actions: string;
}

@Component({
  selector: 'gom-riders',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormControlsModule,
    GomButtonComponent,
    GomTableComponent,
    GomModalComponent,
    GomConfirmationModalComponent,
  ],
  templateUrl: './riders.component.html',
  styleUrl: './riders.component.scss',
})
export class RidersComponent implements OnInit {
  private readonly service = inject(DeliveryService);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(GomAlertToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly authSession = inject(AuthSessionService);

  readonly loading = signal(false);
  readonly canWrite = computed(() => this.authSession.canWrite('delivery'));
  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly riders = signal<Rider[]>([]);
  readonly formOpen = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly statusConfirmOpen = signal(false);
  readonly statusTarget = signal<{
    riderId: string;
    riderName: string;
    action: 'activate' | 'deactivate' | 'return-from-leave' | 'delete' | 'mark-on-leave';
    nextStatus?: RiderStatus;
    leaveFrom?: string | null;
    leaveTill?: string | null;
  } | null>(null);
  readonly statusSaving = signal(false);
  readonly allowManualOverride = signal(false);
  readonly selectedStatus = signal<'ALL' | RiderStatus>('ALL');
  readonly leaveModalOpen = signal(false);

  readonly riderForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    phone: ['', [Validators.required, Validators.minLength(10)]],
    sameAsPhone: [false],
    whatsapp: [''],
    employeeCode: [{ value: '', disabled: true }],
    status: ['ACTIVE' as RiderStatus, [Validators.required]],
    vehicleType: [''],
    vehicleNumber: [''],
    zoneTags: [''],
    notes: [''],
    leaveFrom: [''],
    leaveTill: [''],
  });

  readonly leaveDatesForm = this.fb.group({
    leaveFrom: ['', [Validators.required]],
    leaveTill: [''],
  });

  private readonly riderStatusValue = toSignal(
    this.riderForm.controls.status.valueChanges.pipe(startWith(this.riderForm.controls.status.value)),
    { initialValue: this.riderForm.controls.status.value }
  );

  readonly isOnLeave = computed(() => this.riderStatusValue() === 'ON_LEAVE');

  readonly columns: GomTableColumn<RiderRow>[] = [
    { key: 'name', header: 'Rider', sortable: true, filterable: true, width: '13rem' },
    { key: 'phone', header: 'Phone', sortable: true, width: '10rem' },
    { key: 'employeeCode', header: 'Employee Code', sortable: true, width: '10rem' },
    { key: 'vehicle', header: 'Vehicle', sortable: true, width: '12rem' },
    { key: 'zones', header: 'Zones', sortable: true, width: '14rem' },
    { key: 'status', header: 'Status', sortable: true, filterable: true, width: '9rem' },
    { key: 'updatedAt', header: 'Updated', sortable: true, width: '10rem' },
    {
      key: 'actions',
      header: 'Actions',
      width: '14rem',
      actionButtons: [
        { label: 'Edit', icon: 'ri-edit-line', actionKey: 'edit', variant: 'secondary' },
        {
          label: 'More actions',
          actionKey: 'more-actions',
          icon: 'ri-more-2-line',
          variant: 'secondary',
          subActions: [
            {
              label: 'Mark On Leave',
              actionKey: 'mark-on-leave',
              disabled: (row: RiderRow) => row.status !== 'ACTIVE',
            },
            {
              label: 'Deactivate',
              actionKey: 'deactivate',
              disabled: (row: RiderRow) => row.status !== 'ACTIVE',
            },
            {
              label: 'Return from Leave',
              actionKey: 'return-from-leave',
              disabled: (row: RiderRow) => row.status !== 'ON_LEAVE',
            },
            {
              label: 'Activate',
              actionKey: 'activate',
              disabled: (row: RiderRow) => row.status !== 'INACTIVE',
            },
            {
              label: 'Delete Rider',
              actionKey: 'delete',
              variant: 'danger',
            },
          ],
        },
      ],
    },
  ];

  readonly stats = computed(() => {
    const list = this.riders();
    return {
      total: list.length,
      active: list.filter((item) => item.status === 'ACTIVE').length,
      onLeave: list.filter((item) => item.status === 'ON_LEAVE').length,
      inactive: list.filter((item) => item.status === 'INACTIVE').length,
    };
  });

  readonly filteredRiders = computed(() => {
    const status = this.selectedStatus();

    return this.riders().filter((item) => {
      if (status !== 'ALL' && item.status !== status) {
        return false;
      }

      return true;
    });
  });

  readonly rows = computed<RiderRow[]>(() =>
    this.filteredRiders().map((item) => ({
      _id: item._id,
      name: item.name,
      phone: item.phone,
      employeeCode: item.employeeCode || '-',
      vehicle: [item.vehicleType || '', item.vehicleNumber || ''].filter(Boolean).join(' ') || '-',
      zones: item.zoneTags?.join(', ') || '-',
      status: item.status,
      updatedAt: new Date(item.updatedAt).toLocaleDateString(),
      actions: 'Actions',
    }))
  );

  ngOnInit(): void {
    this.loadTenantConfig();
    this.setupEmployeeCodePreview();
    this.setupWhatsappAutoFill();
    this.loadRiders();
  }

  loadRiders(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.service.listRiders().subscribe({
      next: (response) => {
        this.riders.set(response.data || []);
        this.loading.set(false);
      },
      error: (error) => {
        this.errorMessage.set(this.extractApiMessage(error) || 'Failed to load riders.');
        this.loading.set(false);
      },
    });
  }

  openCreate(): void {
    this.editingId.set(null);
    this.riderForm.reset({
      name: '',
      phone: '',
      sameAsPhone: false,
      whatsapp: '',
      employeeCode: '',
      status: 'ACTIVE',
      vehicleType: '',
      vehicleNumber: '',
      zoneTags: '',
      notes: '',
      leaveFrom: '',
      leaveTill: '',
    });
    if (this.allowManualOverride()) {
      this.riderForm.controls.employeeCode.enable({ emitEvent: false });
    } else {
      this.riderForm.controls.employeeCode.disable({ emitEvent: false });
    }
    this.riderForm.controls.whatsapp.enable({ emitEvent: false });
    this.formOpen.set(true);
  }

  closeForm(): void {
    this.formOpen.set(false);
    this.editingId.set(null);
  }

  applyStatusFilter(status: 'ALL' | RiderStatus): void {
    if (this.selectedStatus() === status) {
      this.selectedStatus.set('ALL');
      return;
    }

    this.selectedStatus.set(status);
  }

  isStatusFilterActive(status: 'ALL' | RiderStatus): boolean {
    return this.selectedStatus() === status;
  }

  onRowAction(event: { actionKey: string; row: GomTableRow }): void {
    if (!this.canWrite()) {
      return;
    }
    const id = typeof event.row['_id'] === 'string' ? event.row['_id'] : '';
    const rider = this.riders().find((item) => item._id === id);
    if (!rider) {
      return;
    }

    if (event.actionKey === 'edit') {
      this.editingId.set(rider._id);
      this.riderForm.reset({
        name: rider.name,
        phone: rider.phone,
        sameAsPhone: Boolean(rider.phone) && rider.whatsapp === rider.phone,
        whatsapp: rider.whatsapp || '',
        employeeCode: rider.employeeCode || '',
        status: rider.status,
        vehicleType: rider.vehicleType || '',
        vehicleNumber: rider.vehicleNumber || '',
        zoneTags: (rider.zoneTags || []).join(', '),
        notes: rider.notes || '',
        leaveFrom: rider.leaveFrom ? new Date(rider.leaveFrom).toISOString().substring(0, 10) : '',
        leaveTill: rider.leaveTill ? new Date(rider.leaveTill).toISOString().substring(0, 10) : '',
      });
      if (this.allowManualOverride()) {
        this.riderForm.controls.employeeCode.enable({ emitEvent: false });
      } else {
        this.riderForm.controls.employeeCode.disable({ emitEvent: false });
      }
      if (Boolean(rider.phone) && rider.whatsapp === rider.phone) {
        this.riderForm.controls.whatsapp.disable({ emitEvent: false });
      } else {
        this.riderForm.controls.whatsapp.enable({ emitEvent: false });
      }
      this.formOpen.set(true);
      return;
    }

    if (event.actionKey === 'mark-on-leave') {
      if (rider.status === 'ACTIVE') {
        this.statusTarget.set({
          riderId: rider._id,
          riderName: rider.name,
          action: 'mark-on-leave',
          nextStatus: 'ON_LEAVE',
        });
        this.leaveDatesForm.reset({ leaveFrom: '', leaveTill: '' });
        this.leaveModalOpen.set(true);
      }

      return;
    }

    if (event.actionKey === 'deactivate') {
      this.statusTarget.set({
        riderId: rider._id,
        riderName: rider.name,
        action: 'deactivate',
        nextStatus: 'INACTIVE',
      });
      this.statusConfirmOpen.set(true);
      return;
    }

    if (event.actionKey === 'return-from-leave') {
      this.statusTarget.set({
        riderId: rider._id,
        riderName: rider.name,
        action: 'return-from-leave',
        nextStatus: 'ACTIVE',
        leaveFrom: rider.leaveFrom ?? null,
        leaveTill: rider.leaveTill ?? null,
      });
      this.statusConfirmOpen.set(true);
      return;
    }

    if (event.actionKey === 'activate') {
      this.statusTarget.set({
        riderId: rider._id,
        riderName: rider.name,
        action: 'activate',
        nextStatus: 'ACTIVE',
      });
      this.statusConfirmOpen.set(true);
      return;
    }

    if (event.actionKey === 'delete') {
      this.statusTarget.set({
        riderId: rider._id,
        riderName: rider.name,
        action: 'delete',
      });
      this.statusConfirmOpen.set(true);
    }
  }

  closeLeaveModal(): void {
    this.leaveModalOpen.set(false);
    this.statusTarget.set(null);
  }

  confirmLeave(): void {
    this.leaveDatesForm.markAllAsTouched();
    if (this.leaveDatesForm.invalid) return;

    const target = this.statusTarget();
    if (!target) { this.closeLeaveModal(); return; }

    const raw = this.leaveDatesForm.getRawValue();
    this.statusSaving.set(true);
    this.service.updateRiderStatus(target.riderId, 'ON_LEAVE', raw.leaveFrom ?? '', raw.leaveTill ?? '').subscribe({
      next: () => {
        this.toast.success(`${target.riderName} marked as On Leave.`);
        this.statusSaving.set(false);
        this.leaveModalOpen.set(false);
        this.statusTarget.set(null);
        this.loadRiders();
      },
      error: (error) => {
        this.toast.error(this.extractApiMessage(error) || 'Failed to mark rider on leave.');
        this.statusSaving.set(false);
      },
    });
  }

  closeStatusConfirm(): void {
    this.statusConfirmOpen.set(false);
    this.statusTarget.set(null);
  }

  confirmStatusChange(): void {
    const target = this.statusTarget();
    if (!target) {
      this.closeStatusConfirm();
      return;
    }

    this.statusSaving.set(true);
    const request$ = target.action === 'delete'
      ? this.service.deleteRider(target.riderId)
      : this.service.updateRiderStatus(target.riderId, target.nextStatus as RiderStatus);

    request$.subscribe({
      next: () => {
        if (target.action === 'delete') {
          this.toast.success(`${target.riderName} deleted successfully.`);
        } else if (target.action === 'deactivate') {
          this.toast.success(`${target.riderName} deactivated.`);
        } else {
          this.toast.success(`${target.riderName} is now active.`);
        }
        this.statusSaving.set(false);
        this.closeStatusConfirm();
        this.loadRiders();
      },
      error: (error) => {
        this.toast.error(this.extractApiMessage(error) || 'Failed to complete rider action.');
        this.statusSaving.set(false);
      },
    });
  }

  getStatusConfirmTitle(): string {
    const target = this.statusTarget();
    if (!target) return 'Confirm Status Change';
    if (target.action === 'delete') return 'Delete Rider';
    if (target.action === 'deactivate') return 'Deactivate Rider';
    if (target.action === 'return-from-leave') return 'Return from Leave';
    return 'Activate Rider';
  }

  getStatusConfirmMessage(): string {
    const target = this.statusTarget();
    if (!target) return 'Do you want to continue?';

    if (target.action === 'delete') {
      return `Delete ${target.riderName}? This action cannot be undone.`;
    }

    if (target.action === 'deactivate') {
      return `Deactivate ${target.riderName}? They will stop receiving new orders.`;
    }

    const fmt = (d: string | null | undefined) =>
      d ? new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : null;

    const from = fmt(target.leaveFrom);
    const till = fmt(target.leaveTill);

    if (from) {
      const period = till
        ? `Leave period: ${from} → ${till}.`
        : `On leave since ${from}.`;
      return `Mark ${target.riderName} as active?\n${period} They will start receiving orders again.`;
    }

    return `Activate ${target.riderName}? They will start receiving orders again.`;
  }

  getStatusConfirmButtonLabel(): string {
    const target = this.statusTarget();
    if (!target) return 'Confirm';
    if (target.action === 'delete') return 'Delete';
    if (target.action === 'deactivate') return 'Deactivate';
    return 'Activate';
  }

  getStatusConfirmVariant(): 'primary' | 'danger' {
    const target = this.statusTarget();
    return target?.action === 'delete' || target?.action === 'deactivate' ? 'danger' : 'primary';
  }

  saveRider(): void {
    this.riderForm.markAllAsTouched();
    if (this.riderForm.invalid) {
      return;
    }

    const raw = this.riderForm.getRawValue();
    const payload: RiderPayload = {
      name: String(raw.name || '').trim(),
      phone: String(raw.phone || '').trim(),
      whatsapp: String(raw.whatsapp || '').trim(),
      employeeCode: String(raw.employeeCode || '').trim(),
      status: (raw.status || 'ACTIVE') as RiderStatus,
      leaveFrom: (raw.status as RiderStatus) === 'ON_LEAVE' ? String(raw.leaveFrom || '').trim() || undefined : undefined,
      leaveTill: (raw.status as RiderStatus) === 'ON_LEAVE' ? String(raw.leaveTill || '').trim() || undefined : undefined,
      vehicleType: String(raw.vehicleType || '').trim(),
      vehicleNumber: String(raw.vehicleNumber || '').trim(),
      zoneTags: String(raw.zoneTags || '')
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      notes: String(raw.notes || '').trim(),
    };

    this.saving.set(true);
    const id = this.editingId();
    const request$ = id ? this.service.updateRider(id, payload) : this.service.createRider(payload);

    request$.subscribe({
      next: () => {
        this.toast.success(id ? 'Rider updated successfully.' : 'Rider created successfully.');
        this.closeForm();
        this.loadRiders();
        this.saving.set(false);
      },
      error: (error) => {
        this.toast.error(this.extractApiMessage(error) || 'Failed to save rider.');
        this.saving.set(false);
      },
    });
  }

  isSaveDisabled(): boolean {
    return this.saving() || this.riderForm.invalid;
  }

  private extractApiMessage(error: unknown): string {
    const maybeMessage = (error as { error?: { message?: string } })?.error?.message;
    return typeof maybeMessage === 'string' ? maybeMessage : '';
  }

  private loadTenantConfig(): void {
    this.service.getTenantConfig()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          const cfg = response.data?.employeeCodeConfig;
          if (cfg?.allowManualOverride) {
            this.allowManualOverride.set(true);
          }
        },
        error: () => {
          // Non-critical — fall back to defaults
        },
      });
  }

  private setupEmployeeCodePreview(): void {
    combineLatest([
      this.riderForm.controls.name.valueChanges.pipe(startWith(this.riderForm.controls.name.value)),
      this.riderForm.controls.phone.valueChanges.pipe(startWith(this.riderForm.controls.phone.value)),
    ])
      .pipe(
        debounceTime(400),
        switchMap(([name, phone]) => {
          if (this.editingId()) return of(null);
          const n = String(name || '').trim();
          const p = String(phone || '').replace(/\D/g, '');
          if (n.length < 2 || p.length < 4) return of(null);
          return this.service.previewEmployeeCode(n, p).pipe(catchError(() => of(null)));
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((result) => {
        if (!result) return;
        const preview: EmployeeCodePreview = result.data;
        if (!this.allowManualOverride()) {
          this.riderForm.controls.employeeCode.setValue(preview.employeeCode, { emitEvent: false });
        }
        if (preview.allowManualOverride && !this.allowManualOverride()) {
          this.allowManualOverride.set(true);
          this.riderForm.controls.employeeCode.enable({ emitEvent: false });
        }
      });
  }

  private setupWhatsappAutoFill(): void {
    this.riderForm.controls.sameAsPhone.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((sameAsPhone) => {
        if (sameAsPhone) {
          const phone = String(this.riderForm.controls.phone.value || '').trim();
          this.riderForm.controls.whatsapp.setValue(phone, { emitEvent: false });
          this.riderForm.controls.whatsapp.disable({ emitEvent: false });
          return;
        }

        this.riderForm.controls.whatsapp.enable({ emitEvent: false });
      });

    this.riderForm.controls.phone.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((phone) => {
        if (!this.riderForm.controls.sameAsPhone.value) {
          return;
        }

        this.riderForm.controls.whatsapp.setValue(String(phone || '').trim(), { emitEvent: false });
      });
  }

}

