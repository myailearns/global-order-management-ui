import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';

import {
  GomAlertToastService,
  GomButtonComponent,
  GomCheckboxComponent,
  GomModalComponent,
  GomSelectComponent,
  GomSelectOption,
  GomTableColumn,
  GomTableComponent,
  GomTableQuery,
  GomTableRow,
  GomTextareaComponent,
} from '@gomlibs/ui';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DemoPackageOption, DemoRequestRecord, DemoRequestsService } from './demo-requests.service';

interface DemoRequestRow extends GomTableRow {
  id: string;
  bookingId: string;
  name: string;
  mobileNumber: string;
  businessCategory: string;
  businessType: string;
  connected: string;
  subscribed: string;
  packageName: string;
  tierName: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  actions: string;
}

@Component({
  selector: 'gom-demo-requests',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    GomButtonComponent,
    GomCheckboxComponent,
    GomModalComponent,
    GomSelectComponent,
    GomTableComponent,
    GomTextareaComponent,
  ],
  templateUrl: './demo-requests.component.html',
  styleUrl: './demo-requests.component.scss',
})
export class DemoRequestsComponent {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(DemoRequestsService);
  private readonly toast = inject(GomAlertToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly requests = signal<DemoRequestRecord[]>([]);
  readonly total = signal(0);
  readonly tablePageIndex = signal(0);
  readonly tablePageSize = signal(20);
  readonly packages = signal<DemoPackageOption[]>([]);
  readonly packagePlanId = signal('');
  readonly editOpen = signal(false);
  readonly editingRequest = signal<DemoRequestRecord | null>(null);

  readonly editForm = this.fb.group({
    connected: [false],
    subscribed: [false],
    packagePlanId: [''],
    tierId: [''],
    notes: [''],
  });

  readonly packageOptions = computed<GomSelectOption[]>(() => this.packages().map((item) => ({
    value: item._id,
    label: item.name,
  })));

  readonly tierOptions = computed<GomSelectOption[]>(() => {
    const selectedPackage = this.packages().find((item) => item._id === this.packagePlanId());
    return (selectedPackage?.tiers || []).map((tier) => ({
      value: tier._id,
      label: tier.displayName || tier.tierKey,
    }));
  });

  readonly columns: GomTableColumn<DemoRequestRow>[] = [
    { key: 'bookingId', header: 'Booking ID', sortable: true, width: '14rem' },
    { key: 'name', header: 'Name', sortable: true, width: '12rem' },
    { key: 'mobileNumber', header: 'Mobile', sortable: true, width: '11rem' },
    { key: 'businessCategory', header: 'Category', sortable: true, width: '12rem' },
    { key: 'businessType', header: 'Type', sortable: true, width: '12rem' },
    { key: 'connected', header: 'Connected', sortable: true, width: '10rem' },
    { key: 'subscribed', header: 'Subscribed', sortable: true, width: '10rem' },
    { key: 'packageName', header: 'Package', sortable: true, width: '12rem' },
    { key: 'tierName', header: 'Tier', sortable: true, width: '12rem' },
    { key: 'notes', header: 'Notes', width: '18rem' },
    { key: 'createdAt', header: 'Created', sortable: true, width: '12rem' },
    { key: 'updatedAt', header: 'Updated', sortable: true, width: '12rem' },
    {
      key: 'actions',
      header: 'Actions',
      width: '10rem',
      actionButtons: [
        { label: 'Edit', icon: 'ri-edit-line', actionKey: 'edit', variant: 'secondary' },
      ],
    },
  ];

  readonly requestCount = computed(() => this.total());

  readonly rows = computed<DemoRequestRow[]>(() => this.requests().map((request) => ({
    id: request.bookingId,
    bookingId: request.bookingId,
    name: request.name || '-',
    mobileNumber: request.mobileNumber || '-',
    businessCategory: request.businessCategoryName || '-',
    businessType: request.businessTypeLabel || '-',
    connected: request.connected ? 'Yes' : 'No',
    subscribed: request.subscribed ? 'Yes' : 'No',
    packageName: request.packagePlanName || '-',
    tierName: request.tierName || '-',
    notes: request.notes || '-',
    createdAt: request.createdAt ? new Date(request.createdAt).toLocaleString() : '-',
    updatedAt: request.updatedAt ? new Date(request.updatedAt).toLocaleString() : '-',
    actions: 'Edit',
  })));

  constructor() {
    this.bindFormListeners();
    this.loadRequests();
    this.loadPackages();
  }

  onTableQueryChange(query: GomTableQuery): void {
    this.tablePageIndex.set(query.pageIndex);
    this.tablePageSize.set(query.pageSize);
    this.loadRequestsPage(query.pageIndex + 1, query.pageSize, query.searchTerm?.trim() || undefined);
  }

  onRowAction(event: { actionKey: string; row: GomTableRow }): void {
    if (event.actionKey !== 'edit') {
      return;
    }

    const request = this.requests().find((item) => item.bookingId === event.row['id']);
    if (!request) {
      return;
    }

    this.editingRequest.set(request);
    this.packagePlanId.set(request.packagePlanId || '');
    this.editForm.reset({
      connected: request.connected,
      subscribed: request.subscribed,
      packagePlanId: request.packagePlanId || '',
      tierId: request.tierId || '',
      notes: request.notes || '',
    }, { emitEvent: false });
    this.syncSubscriptionValidators();
    this.editOpen.set(true);
  }

  private loadRequests(): void {
    this.tablePageIndex.set(0);
    this.loadRequestsPage(1, this.tablePageSize());
  }

  private loadRequestsPage(page: number, limit: number, search?: string): void {
    this.loading.set(true);

    this.service.listRequests({ page, limit, search, sort: 'createdAt', order: 'desc' }).subscribe({
      next: (response) => {
        this.requests.set(response.data || []);
        this.total.set(response.pagination?.total || 0);
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.toast.error(String(error?.error?.message || 'Failed to load demo requests'));
      },
    });
  }

  private loadPackages(): void {
    this.service.listPackagesWithTiers().subscribe({
      next: (packages) => this.packages.set(packages || []),
      error: (error) => {
        this.toast.error(String(error?.error?.message || 'Failed to load packages'));
      },
    });
  }

  private bindFormListeners(): void {
    this.editForm.controls.subscribed.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.syncSubscriptionValidators();
    });

    this.editForm.controls.packagePlanId.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((value) => {
      this.packagePlanId.set(String(value || '').trim());
      if (this.editForm.controls.subscribed.value) {
        this.editForm.controls.tierId.setValue('', { emitEvent: false });
      }
    });
  }

  private syncSubscriptionValidators(): void {
    const subscribed = Boolean(this.editForm.controls.subscribed.value);
    const packageControl = this.editForm.controls.packagePlanId;
    const tierControl = this.editForm.controls.tierId;

    if (subscribed) {
      packageControl.setValidators([Validators.required]);
      tierControl.setValidators([Validators.required]);
    } else {
      packageControl.clearValidators();
      tierControl.clearValidators();
      packageControl.setValue('', { emitEvent: false });
      tierControl.setValue('', { emitEvent: false });
      this.packagePlanId.set('');
    }

    packageControl.updateValueAndValidity({ emitEvent: false });
    tierControl.updateValueAndValidity({ emitEvent: false });
  }

  closeEditModal(): void {
    this.editOpen.set(false);
    this.editingRequest.set(null);
    this.saving.set(false);
    this.editForm.reset({ connected: false, subscribed: false, packagePlanId: '', tierId: '', notes: '' }, { emitEvent: false });
    this.syncSubscriptionValidators();
  }

  saveRequest(): void {
    const request = this.editingRequest();
    if (!request) {
      return;
    }

    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    const raw = this.editForm.getRawValue();
    const subscribed = Boolean(raw.subscribed);
    const payload = {
      connected: Boolean(raw.connected),
      subscribed,
      packagePlanId: subscribed ? String(raw.packagePlanId || '').trim() : '',
      tierId: subscribed ? String(raw.tierId || '').trim() : '',
      notes: String(raw.notes || '').trim(),
    };

    this.saving.set(true);
    this.service.updateRequest(request.bookingId, payload).subscribe({
      next: (updated) => {
        this.requests.update((items) => items.map((item) => (item.bookingId === updated.bookingId ? updated : item)));
        this.saving.set(false);
        this.closeEditModal();
        this.toast.success('Demo request updated');
      },
      error: (error) => {
        this.saving.set(false);
        this.toast.error(String(error?.error?.message || 'Failed to update demo request'));
      },
    });
  }
}
