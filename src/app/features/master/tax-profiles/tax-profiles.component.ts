import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';

import { GomButtonComponent } from '@gomlibs/ui';
import { GomTableColumn, GomTableComponent, GomTableRow } from '@gomlibs/ui';
import { GomAlertToastService } from '@gomlibs/ui';
import { TaxProfile, TaxProfilesService } from './tax-profiles.service';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { TaxProfilesFormComponent, TaxProfileFormData, TaxProfileFormPayload } from './form/tax-profiles-form.component';

interface TaxProfileRow extends GomTableRow {
  _id: string;
  name: string;
  countryCode: string;
  taxMode: string;
  rate: string;
  inclusive: string;
  status: string;
  updatedAt: string;
  actions: string;
}

@Component({
  selector: 'gom-tax-profiles',
  standalone: true,
  imports: [
    CommonModule,
    GomButtonComponent,
    GomTableComponent,
    TaxProfilesFormComponent,
  ],
  templateUrl: './tax-profiles.component.html',
  styleUrl: './tax-profiles.component.scss',
})
export class TaxProfilesComponent implements OnInit {
  private readonly service = inject(TaxProfilesService);
  private readonly toast = inject(GomAlertToastService);
  private readonly authSession = inject(AuthSessionService);

  readonly loading = signal(false);
  readonly canCreateTaxProfile = computed(() => this.authSession.hasFeature('taxProfile.create'));
  readonly canEditTaxProfile = computed(() => this.authSession.hasFeature('taxProfile.edit'));
  readonly errorMessage = signal<string | null>(null);

  readonly taxProfiles = signal<TaxProfile[]>([]);
  readonly formOpen = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly editingFormData = signal<TaxProfileFormData | null>(null);

  readonly columns: GomTableColumn<TaxProfileRow>[] = [
    { key: 'name', header: 'Tax Profile', sortable: true, filterable: true, width: '14rem' },
    { key: 'countryCode', header: 'Country', sortable: true, width: '8rem' },
    { key: 'taxMode', header: 'Tax Mode', sortable: true, width: '10rem' },
    { key: 'rate', header: 'Rate %', sortable: true, width: '8rem' },
    { key: 'inclusive', header: 'Inclusive', sortable: true, width: '8rem' },
    { key: 'status', header: 'Status', sortable: true, filterable: true, width: '10rem' },
    { key: 'updatedAt', header: 'Updated', sortable: true, width: '10rem' },
    {
      key: 'actions',
      header: 'Actions',
      width: '9rem',
      actionButtons: this.canEditTaxProfile() ? [{ label: 'Edit', actionKey: 'edit', variant: 'secondary' }] : [],
    },
  ];

  readonly rows = computed<TaxProfileRow[]>(() =>
    this.taxProfiles().map((item) => ({
      _id: item._id,
      name: item.name,
      countryCode: item.countryCode,
      taxMode: item.taxMode,
      rate: Number(item.rate).toLocaleString(undefined, { maximumFractionDigits: 2 }),
      inclusive: item.inclusive ? 'YES' : 'NO',
      status: item.status,
      updatedAt: new Date(item.updatedAt).toLocaleDateString(),
      actions: 'Edit',
    }))
  );

  ngOnInit(): void {
    this.loadTaxProfiles();
  }

  loadTaxProfiles(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.service.listTaxProfiles(1, 100).subscribe({
      next: (response) => {
        this.taxProfiles.set(response.data || []);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Failed to load tax profiles.');
        this.loading.set(false);
      },
    });
  }

  openCreate(): void {
    if (!this.canCreateTaxProfile()) {
      return;
    }

    this.editingId.set(null);
    this.editingFormData.set(null);
    this.formOpen.set(true);
  }

  closeForm(): void {
    this.formOpen.set(false);
    this.editingId.set(null);
    this.editingFormData.set(null);
  }

  onRowAction(event: { actionKey: string; row: GomTableRow }): void {
    if (!this.canEditTaxProfile()) {
      return;
    }
    if (event.actionKey !== 'edit') {
      return;
    }

    const id = typeof event.row['_id'] === 'string' ? event.row['_id'] : '';
    const profile = this.taxProfiles().find((item) => item._id === id);
    if (!profile) {
      return;
    }

    this.editingId.set(profile._id);
    this.editingFormData.set({
      name: profile.name,
      countryCode: profile.countryCode || 'IN',
      taxMode: profile.taxMode,
      rate: profile.rate,
      inclusive: profile.inclusive,
      hsnCode: profile.hsnCode || '',
      status: profile.status,
      effectiveFrom: profile.effectiveFrom,
    });
    this.formOpen.set(true);
  }

  onFormSubmit(payload: TaxProfileFormPayload): void {
    const isEdit = !!this.editingId();
    const canProceed = isEdit ? this.canEditTaxProfile() : this.canCreateTaxProfile();
    if (!canProceed) {
      return;
    }

    this.loading.set(true);
    const editingId = this.editingId();
    const request$ = editingId
      ? this.service.updateTaxProfile(editingId, payload)
      : this.service.createTaxProfile(payload);

    request$.subscribe({
      next: () => {
        this.toast.success(editingId ? 'Tax profile updated successfully.' : 'Tax profile created successfully.');
        this.closeForm();
        this.loadTaxProfiles();
      },
      error: (error) => {
        this.toast.error(this.extractApiMessage(error) || 'Failed to save tax profile.');
        this.loading.set(false);
      },
    });
  }

  onFormCancel(): void {
    this.closeForm();
  }

  private extractApiMessage(error: unknown): string {
    const maybeMessage = (error as { error?: { message?: string } })?.error?.message;
    return typeof maybeMessage === 'string' ? maybeMessage : '';
  }
}
