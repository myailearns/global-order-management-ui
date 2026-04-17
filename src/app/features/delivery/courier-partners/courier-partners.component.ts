import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { GomAlertToastService } from '../../../shared/components/alert';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { FormControlsModule, GomButtonComponent } from '../../../shared/components/form-controls';
import { GomConfirmationModalComponent, GomModalComponent } from '../../../shared/components/modal';
import { GomTableColumn, GomTableComponent, GomTableRow } from '../../../shared/components/table';
import { CourierPartner, CourierPartnerPayload, CourierPartnerStatus, DeliveryService } from '../delivery.service';

interface CourierPartnerRow extends GomTableRow {
  _id: string;
  name: string;
  contactPerson: string;
  contactPhone: string;
  supportPhone: string;
  serviceAreas: string;
  status: string;
  updatedAt: string;
  actions: string;
}

@Component({
  selector: 'gom-courier-partners',
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
  templateUrl: './courier-partners.component.html',
  styleUrl: './courier-partners.component.scss',
})
export class CourierPartnersComponent implements OnInit {
  private readonly service = inject(DeliveryService);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(GomAlertToastService);

  readonly loading = signal(false);
  private readonly authSession = inject(AuthSessionService);
  readonly canWrite = computed(() => this.authSession.canWrite('delivery'));

  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly partners = signal<CourierPartner[]>([]);
  readonly formOpen = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly statusConfirmOpen = signal(false);
  readonly statusTarget = signal<{
    partnerId: string;
    partnerName: string;
    action: 'activate' | 'deactivate' | 'delete';
    nextStatus?: CourierPartnerStatus;
  } | null>(null);
  readonly statusSaving = signal(false);
  readonly selectedStatus = signal<'ALL' | CourierPartnerStatus>('ALL');

  readonly partnerForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    status: ['ACTIVE' as CourierPartnerStatus, [Validators.required]],
    contactPerson: [''],
    contactPhone: [''],
    supportPhone: [''],
    serviceAreas: [''],
    notes: [''],
  });

  readonly columns: GomTableColumn<CourierPartnerRow>[] = [
    { key: 'name', header: 'Courier Partner', sortable: true, filterable: true, width: '13rem' },
    { key: 'contactPerson', header: 'Contact Person', sortable: true, width: '12rem' },
    { key: 'contactPhone', header: 'Contact Phone', sortable: true, width: '10rem' },
    { key: 'supportPhone', header: 'Support Phone', sortable: true, width: '10rem' },
    { key: 'serviceAreas', header: 'Service Areas', sortable: true, width: '14rem' },
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
              label: 'Deactivate',
              actionKey: 'deactivate',
              disabled: (row: CourierPartnerRow) => row.status !== 'ACTIVE',
            },
            {
              label: 'Activate',
              actionKey: 'activate',
              disabled: (row: CourierPartnerRow) => row.status !== 'INACTIVE',
            },
            {
              label: 'Delete Partner',
              actionKey: 'delete',
              variant: 'danger',
            },
          ],
        },
      ],
    },
  ];

  readonly stats = computed(() => {
    const list = this.partners();
    return {
      total: list.length,
      active: list.filter((item) => item.status === 'ACTIVE').length,
      inactive: list.filter((item) => item.status === 'INACTIVE').length,
    };
  });

  readonly filteredPartners = computed(() => {
    const status = this.selectedStatus();

    return this.partners().filter((item) => {
      if (status !== 'ALL' && item.status !== status) {
        return false;
      }

      return true;
    });
  });

  readonly rows = computed<CourierPartnerRow[]>(() =>
    this.filteredPartners().map((item) => ({
      _id: item._id,
      name: item.name,
      contactPerson: item.contactPerson || '-',
      contactPhone: item.contactPhone || '-',
      supportPhone: item.supportPhone || '-',
      serviceAreas: item.serviceAreas?.join(', ') || '-',
      status: item.status,
      updatedAt: new Date(item.updatedAt).toLocaleDateString(),
      actions: 'Actions',
    }))
  );

  ngOnInit(): void {
    this.loadPartners();
  }

  loadPartners(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.service.listCourierPartners().subscribe({
      next: (response) => {
        this.partners.set(response.data || []);
        this.loading.set(false);
      },
      error: (error) => {
        this.errorMessage.set(this.extractApiMessage(error) || 'Failed to load courier partners.');
        this.loading.set(false);
      },
    });
  }

  openCreate(): void {
    this.editingId.set(null);
    this.partnerForm.reset({
      name: '',
      status: 'ACTIVE',
      contactPerson: '',
      contactPhone: '',
      supportPhone: '',
      serviceAreas: '',
      notes: '',
    });
    this.formOpen.set(true);
  }

  closeForm(): void {
    this.formOpen.set(false);
    this.editingId.set(null);
  }

  applyStatusFilter(status: 'ALL' | CourierPartnerStatus): void {
    if (this.selectedStatus() === status) {
      this.selectedStatus.set('ALL');
      return;
    }

    this.selectedStatus.set(status);
  }

  isStatusFilterActive(status: 'ALL' | CourierPartnerStatus): boolean {
    return this.selectedStatus() === status;
  }

  onRowAction(event: { actionKey: string; row: GomTableRow }): void {
    if (!this.canWrite()) {
      return;
    }
    const id = typeof event.row['_id'] === 'string' ? event.row['_id'] : '';
    const partner = this.partners().find((item) => item._id === id);
    if (!partner) {
      return;
    }

    if (event.actionKey === 'edit') {
      this.editingId.set(partner._id);
      this.partnerForm.reset({
        name: partner.name,
        status: partner.status,
        contactPerson: partner.contactPerson || '',
        contactPhone: partner.contactPhone || '',
        supportPhone: partner.supportPhone || '',
        serviceAreas: (partner.serviceAreas || []).join(', '),
        notes: partner.notes || '',
      });
      this.formOpen.set(true);
      return;
    }

    if (event.actionKey === 'deactivate') {
      this.statusTarget.set({
        partnerId: partner._id,
        partnerName: partner.name,
        action: 'deactivate',
        nextStatus: 'INACTIVE',
      });
      this.statusConfirmOpen.set(true);
      return;
    }

    if (event.actionKey === 'activate') {
      this.statusTarget.set({
        partnerId: partner._id,
        partnerName: partner.name,
        action: 'activate',
        nextStatus: 'ACTIVE',
      });
      this.statusConfirmOpen.set(true);
      return;
    }

    if (event.actionKey === 'delete') {
      this.statusTarget.set({
        partnerId: partner._id,
        partnerName: partner.name,
        action: 'delete',
      });
      this.statusConfirmOpen.set(true);
    }
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
      ? this.service.deleteCourierPartner(target.partnerId)
      : this.service.updateCourierPartnerStatus(target.partnerId, target.nextStatus as CourierPartnerStatus);

    request$.subscribe({
      next: () => {
        if (target.action === 'delete') {
          this.toast.success(`${target.partnerName} deleted successfully.`);
        } else if (target.action === 'deactivate') {
          this.toast.success(`${target.partnerName} deactivated.`);
        } else {
          this.toast.success(`${target.partnerName} activated.`);
        }
        this.statusSaving.set(false);
        this.closeStatusConfirm();
        this.loadPartners();
      },
      error: (error) => {
        this.toast.error(this.extractApiMessage(error) || 'Failed to complete courier partner action.');
        this.statusSaving.set(false);
      },
    });
  }

  getStatusConfirmTitle(): string {
    const target = this.statusTarget();
    if (!target) {
      return 'Confirm Status Change';
    }

    if (target.action === 'delete') {
      return 'Delete Courier Partner';
    }

    return target.action === 'deactivate' ? 'Deactivate Courier Partner' : 'Activate Courier Partner';
  }

  getStatusConfirmMessage(): string {
    const target = this.statusTarget();
    if (!target) {
      return 'Do you want to continue?';
    }

    if (target.action === 'delete') {
      return `Delete courier partner ${target.partnerName}? This action cannot be undone.`;
    }

    if (target.action === 'deactivate') {
      return `Are you sure you want to deactivate courier partner ${target.partnerName}?`;
    }

    return `Are you sure you want to activate courier partner ${target.partnerName}?`;
  }

  getStatusConfirmButtonLabel(): string {
    const target = this.statusTarget();
    if (!target) {
      return 'Confirm';
    }

    if (target.action === 'delete') {
      return 'Delete';
    }

    return target.action === 'deactivate' ? 'Deactivate' : 'Activate';
  }

  getStatusConfirmVariant(): 'primary' | 'danger' {
    const target = this.statusTarget();
    return target?.action === 'delete' || target?.action === 'deactivate' ? 'danger' : 'primary';
  }

  savePartner(): void {
    this.partnerForm.markAllAsTouched();
    if (this.partnerForm.invalid) {
      return;
    }

    const raw = this.partnerForm.getRawValue();
    const payload: CourierPartnerPayload = {
      name: String(raw.name || '').trim(),
      status: (raw.status || 'ACTIVE') as CourierPartnerStatus,
      contactPerson: String(raw.contactPerson || '').trim(),
      contactPhone: String(raw.contactPhone || '').trim(),
      supportPhone: String(raw.supportPhone || '').trim(),
      serviceAreas: String(raw.serviceAreas || '')
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      notes: String(raw.notes || '').trim(),
    };

    this.saving.set(true);
    const id = this.editingId();
    const request$ = id ? this.service.updateCourierPartner(id, payload) : this.service.createCourierPartner(payload);

    request$.subscribe({
      next: () => {
        this.toast.success(id ? 'Courier partner updated successfully.' : 'Courier partner created successfully.');
        this.closeForm();
        this.loadPartners();
        this.saving.set(false);
      },
      error: (error) => {
        this.toast.error(this.extractApiMessage(error) || 'Failed to save courier partner.');
        this.saving.set(false);
      },
    });
  }

  isSaveDisabled(): boolean {
    return this.saving() || this.partnerForm.invalid;
  }

  private extractApiMessage(error: unknown): string {
    const maybeMessage = (error as { error?: { message?: string } })?.error?.message;
    return typeof maybeMessage === 'string' ? maybeMessage : '';
  }
}
