import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import {
  GomAlertToastService,
  GomButtonComponent,
  GomTableBulkAction,
  GomTableBulkActionEvent,
  GomTableColumn,
  GomTableComponent,
  GomTableRow,
} from '@gomlibs/ui';
import {
  BusinessTypeConfigItem,
  BusinessTypeConfigItemsResponse,
  BusinessTypeConfigSection,
  BusinessTypeConfigSectionKey,
  BusinessTypeConfigurationSummary,
  TemplateCatalogService,
} from '../templates/template-catalog.service';

interface ConfigRow extends GomTableRow {
  _id: string;
  name: string;
  detail: string;
  status: string;
  attachedStatus: string;
  attached: boolean;
}

@Component({
  selector: 'gom-business-type-configure',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslateModule, GomButtonComponent, GomTableComponent],
  templateUrl: './business-type-configure.component.html',
  styleUrl: './business-type-configure.component.scss',
})
export class BusinessTypeConfigureComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly catalogService = inject(TemplateCatalogService);
  private readonly toast = inject(GomAlertToastService);

  readonly businessTypeId = computed(() => this.route.snapshot.paramMap.get('businessTypeId') || '');
  readonly loading = signal(false);
  readonly sectionLoading = signal(false);
  readonly bulkActionBusyKey = signal<string | null>(null);
  readonly summary = signal<BusinessTypeConfigurationSummary | null>(null);
  readonly activeSection = signal<BusinessTypeConfigSectionKey>('categories');
  readonly sectionData = signal<BusinessTypeConfigItemsResponse | null>(null);
  readonly selectedRows = signal<ConfigRow[]>([]);

  readonly businessTypeName = computed(() => this.summary()?.businessType.name || this.route.snapshot.queryParamMap.get('name') || '');
  readonly businessCategoryNames = computed(() => (this.summary()?.businessType.businessCategories || []).map((category) => category.name).join(', '));
  readonly sectionCards = computed<BusinessTypeConfigSection[]>(() => this.summary()?.sections || []);
  readonly selectedSectionCard = computed(() => this.sectionCards().find((section) => section.key === this.activeSection()) || null);
  readonly selectedCount = computed(() => this.selectedRows().length);

  readonly bulkActions: GomTableBulkAction<ConfigRow>[] = [
    {
      actionKey: 'attach-selected',
      label: 'Attach selected',
      icon: 'ri-link',
      variant: 'primary',
      visible: (rows) => rows.some((row) => !row.attached),
      disabled: (rows) => !rows.some((row) => !row.attached),
    },
    {
      actionKey: 'detach-selected',
      label: 'Detach selected',
      icon: 'ri-link-unlink',
      variant: 'secondary',
      visible: (rows) => rows.some((row) => row.attached),
      disabled: (rows) => !rows.some((row) => row.attached),
    },
  ];

  readonly columns = computed<GomTableColumn<ConfigRow>[]>(() => [
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      filterable: true,
      textMode: 'wrap',
    },
    {
      key: 'detail',
      header: 'Details',
      textMode: 'wrap',
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
    },
    {
      key: 'attachedStatus',
      header: 'Attachment',
      sortable: true,
      chipTone: (value) => (typeof value === 'string' && value.toUpperCase() === 'ATTACHED' ? 'success' : 'neutral'),
    },
    {
      key: '_id',
      header: 'Actions',
      width: '12rem',
      actionButtons: [
        {
          label: (row) => row.attached ? 'Detach' : 'Attach',
          icon: (row) => row.attached ? 'ri-link-unlink' : 'ri-link',
          actionKey: 'toggle-attach',
          variant: 'secondary',
        },
      ],
    },
  ]);

  readonly rows = computed<ConfigRow[]>(() => {
    const items = this.sectionData()?.items || [];
    return items.map((item) => ({
      _id: item._id,
      name: item.name,
      detail: this.buildDetail(item),
      status: item.status,
      attachedStatus: item.attached ? 'ATTACHED' : 'AVAILABLE',
      attached: item.attached,
    }));
  });

  constructor() {
    this.loadSummary();
    this.loadSection(this.activeSection());
  }

  selectSection(section: BusinessTypeConfigSectionKey): void {
    if (this.activeSection() === section && this.sectionData()) {
      return;
    }

    this.activeSection.set(section);
    this.selectedRows.set([]);
    this.loadSection(section);
  }

  onSelectedRowsChange(rows: ConfigRow[]): void {
    this.selectedRows.set(rows);
  }

  onBulkAction(event: GomTableBulkActionEvent<ConfigRow>): void {
    const attachedRows = event.selectedRows.filter((row) => row.attached);
    const availableRows = event.selectedRows.filter((row) => !row.attached);

    if (event.actionKey === 'attach-selected' && availableRows.length) {
      this.updateAssignments({ addIds: availableRows.map((row) => row._id) }, 'attach-selected');
      return;
    }

    if (event.actionKey === 'detach-selected' && attachedRows.length) {
      this.updateAssignments({ removeIds: attachedRows.map((row) => row._id) }, 'detach-selected');
    }
  }

  onRowAction(event: { actionKey: string; row: ConfigRow }): void {
    if (event.actionKey !== 'toggle-attach') {
      return;
    }

    if (event.row.attached) {
      this.updateAssignments({ removeIds: [event.row._id] }, 'toggle-attach');
      return;
    }

    this.updateAssignments({ addIds: [event.row._id] }, 'toggle-attach');
  }

  private loadSummary(): void {
    const businessTypeId = this.businessTypeId();
    if (!businessTypeId) {
      return;
    }

    this.loading.set(true);
    this.catalogService.getBusinessTypeConfiguration(businessTypeId).subscribe({
      next: (response) => {
        this.summary.set(response.data || null);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('Failed to load business type configuration.');
      },
    });
  }

  private loadSection(section: BusinessTypeConfigSectionKey): void {
    const businessTypeId = this.businessTypeId();
    if (!businessTypeId) {
      return;
    }

    this.sectionLoading.set(true);
    this.catalogService.listBusinessTypeConfigItems(businessTypeId, section).subscribe({
      next: (response) => {
        this.sectionData.set(response.data || null);
        this.sectionLoading.set(false);
      },
      error: () => {
        this.sectionLoading.set(false);
        this.toast.error('Failed to load configuration items.');
      },
    });
  }

  private updateAssignments(payload: { addIds?: string[]; removeIds?: string[] }, busyKey: string): void {
    const businessTypeId = this.businessTypeId();
    if (!businessTypeId) {
      return;
    }

    this.bulkActionBusyKey.set(busyKey);
    this.catalogService.updateBusinessTypeConfigItems(businessTypeId, this.activeSection(), payload).subscribe({
      next: () => {
        this.bulkActionBusyKey.set(null);
        this.selectedRows.set([]);
        this.loadSummary();
        this.loadSection(this.activeSection());
        this.toast.success('Business type configuration updated.');
      },
      error: (error) => {
        this.bulkActionBusyKey.set(null);
        this.toast.error(error?.error?.message || 'Failed to update business type configuration.');
      },
    });
  }

  private buildDetail(item: BusinessTypeConfigItem): string {
    switch (this.activeSection()) {
      case 'categories':
        return item.description || '—';
      case 'fields':
        return [item.key, item.type].filter(Boolean).join(' • ') || '—';
      case 'field-groups':
        return `${item.fieldCount || 0} fields • ${item.categoryCount || 0} categories`;
      case 'units':
        return [item.symbol, item.conversionFactor ? `x${item.conversionFactor}` : ''].filter(Boolean).join(' • ') || '—';
      case 'tax-profiles':
        return [`${item.countryCode || ''}`, item.taxMode || '', item.rate !== undefined ? `${item.rate}%` : ''].filter(Boolean).join(' • ') || '—';
      default:
        return '—';
    }
  }
}