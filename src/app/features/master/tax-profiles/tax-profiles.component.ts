import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';

import {
  GomAlertToastService,
  GomButtonComponent,
  GomTableColumn,
  GomTableComponent,
  GomTableQuery,
  GomTableRow,
} from '@gomlibs/ui';
import { TaxProfile, TaxProfilesService } from './tax-profiles.service';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { TaxProfilesFormComponent, TaxProfileFormData, TaxProfileFormPayload } from './form/tax-profiles-form.component';
import { DisableIfNoFeatureDirective } from '../../../shared/directives/disable-if-no-feature.directive';

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
    DisableIfNoFeatureDirective,
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
  readonly totalTaxProfiles = signal(0);
  readonly taxProfilesTablePageIndex = signal(0);
  readonly taxProfilesTablePageSize = signal(50);
  readonly canLoadAllTaxProfiles = signal(false);
  readonly allTaxProfilesLoaded = signal(false);
  readonly serverSidePaginationTaxProfiles = computed(() => this.totalTaxProfiles() > 500);
  readonly taxProfilesTableDataMode = computed<'client' | 'server'>(() => (this.serverSidePaginationTaxProfiles() && !this.allTaxProfilesLoaded() ? 'server' : 'client'));
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
    this.taxProfilesTablePageIndex.set(0);
    this.allTaxProfilesLoaded.set(false);

    this.loading.set(true);
    this.errorMessage.set(null);

    this.service.listTaxProfiles({ page: 1, limit: this.taxProfilesTablePageSize() }).subscribe({
      next: (response) => {
        const pagination = response.pagination;
        this.totalTaxProfiles.set(pagination.total);
        this.canLoadAllTaxProfiles.set(pagination.canLoadAll);
        this.allTaxProfilesLoaded.set(pagination.total <= 500);

        if (pagination.total <= 500 && pagination.hasMore) {
          this.service.listTaxProfiles({ page: 1, limit: pagination.total }).subscribe({
            next: (allRes) => this.taxProfiles.set(allRes.data || []),
          });
        } else {
          this.taxProfiles.set(response.data || []);
        }

        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Failed to load tax profiles.');
        this.loading.set(false);
      },
    });
  }

  onTaxProfilesTableQueryChange(query: GomTableQuery): void {
    if (this.taxProfilesTableDataMode() !== 'server') {
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    const search = query.searchTerm?.trim();
    const sortBy = query.sort?.key;
    const order = query.sort?.direction as 'asc' | 'desc' | undefined;

    this.service.listTaxProfiles({
      page: query.pageIndex + 1,
      limit: query.pageSize,
      search,
      sortBy,
      order,
    }).subscribe({
      next: (response) => {
        this.allTaxProfilesLoaded.set(false);
        this.taxProfiles.set(response.data ?? []);
        this.totalTaxProfiles.set(response.pagination.total);
        this.canLoadAllTaxProfiles.set(response.pagination.canLoadAll);
        this.taxProfilesTablePageIndex.set(query.pageIndex);
        this.taxProfilesTablePageSize.set(query.pageSize);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  loadAllTaxProfiles(): void {
    this.loading.set(true);
    this.service.listTaxProfiles({ page: 1, limit: this.totalTaxProfiles() }).subscribe({
      next: (response) => {
        this.taxProfiles.set(response.data ?? []);
        this.totalTaxProfiles.set(response.pagination.total);
        this.canLoadAllTaxProfiles.set(false);
        this.allTaxProfilesLoaded.set(true);
        this.taxProfilesTablePageIndex.set(0);
        this.loading.set(false);
      },
      error: () => {
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
