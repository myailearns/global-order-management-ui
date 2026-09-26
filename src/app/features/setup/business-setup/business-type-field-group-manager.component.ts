import { Component, DestroyRef, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  GomAlertToastService,
  GomButtonComponent,
  GomModalComponent,
  GomTableColumn,
  GomTableComponent,
  GomTableRow,
} from '@gomlibs/ui';
import {
  BusinessTypeFieldGroup,
  BusinessTypeFieldGroupsService,
} from './business-type-field-groups.service';

interface BusinessTypeFieldGroupRow extends GomTableRow {
  id: string;
  fieldGroup: BusinessTypeFieldGroup;
  name: string;
  version: string;
  fieldsCount: string;
  source: string;
  status: string;
}

@Component({
  selector: 'gom-business-type-field-group-manager',
  standalone: true,
  imports: [TranslateModule, GomButtonComponent, GomModalComponent, GomTableComponent],
  templateUrl: './business-type-field-group-manager.component.html',
  styleUrl: './business-type-field-group-manager.component.scss',
})
export class BusinessTypeFieldGroupManagerComponent implements OnInit {
  private readonly fieldGroupsService = inject(BusinessTypeFieldGroupsService);
  private readonly toast = inject(GomAlertToastService);
  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);

  businessTypeId = input.required<string>();
  businessTypeName = input.required<string>();
  closeManager = output<void>();
  fieldGroupsUpdated = output<void>();

  readonly modalOpen = signal(true);
  readonly loading = signal(false);
  readonly fieldGroups = signal<BusinessTypeFieldGroup[]>([]);
  readonly counts = signal({ all: 0, enabled: 0, disabled: 0 });
  readonly togglingFieldGroupId = signal<string | null>(null);
  readonly errorMessage = signal('');

  readonly modalTitle = computed(() => this.translate.instant(
    'businessSetup.fieldGroupManager.title',
    { businessType: this.businessTypeName() },
  ));

  readonly rows = computed<BusinessTypeFieldGroupRow[]>(() => this.fieldGroups().map((fieldGroup) => ({
    id: fieldGroup.platformFieldGroupId,
    fieldGroup,
    name: fieldGroup.name,
    version: `v${fieldGroup.version}`,
    fieldsCount: String(fieldGroup.fieldsCount),
    source: this.translate.instant('businessSetup.fieldGroupManager.source.platform'),
    status: this.translate.instant(
      fieldGroup.enabled
        ? 'businessSetup.fieldGroupManager.status.enabled'
        : 'businessSetup.fieldGroupManager.status.disabled',
    ),
  })));

  readonly columns: GomTableColumn<BusinessTypeFieldGroupRow>[] = [
    {
      key: 'name',
      header: this.translate.instant('businessSetup.fieldGroupManager.columns.name'),
      sortable: true,
      filterable: true,
    },
    {
      key: 'version',
      header: this.translate.instant('businessSetup.fieldGroupManager.columns.version'),
      sortable: true,
      width: '7rem',
    },
    {
      key: 'fieldsCount',
      header: this.translate.instant('businessSetup.fieldGroupManager.columns.fields'),
      sortable: true,
      width: '8rem',
      cellAlign: 'center',
      headerAlign: 'center',
    },
    {
      key: 'source',
      header: this.translate.instant('businessSetup.fieldGroupManager.columns.source'),
      filterable: true,
      width: '9rem',
    },
    {
      key: 'status',
      header: this.translate.instant('businessSetup.fieldGroupManager.columns.status'),
      sortable: true,
      filterable: true,
      width: '8rem',
      chipTone: (_value, row) => row.fieldGroup.enabled ? 'success' : 'neutral',
    },
    {
      key: 'id',
      header: this.translate.instant('businessSetup.fieldGroupManager.columns.actions'),
      width: '10rem',
      actionButtons: [
        {
          label: (row) => this.translate.instant(
            this.togglingFieldGroupId() === row.id
              ? 'businessSetup.fieldGroupManager.actions.updating'
              : row.fieldGroup.enabled
                ? 'businessSetup.fieldGroupManager.actions.disable'
                : 'businessSetup.fieldGroupManager.actions.enable',
          ),
          icon: (row) => row.fieldGroup.enabled ? 'ri-forbid-line' : 'ri-check-line',
          actionKey: 'toggle',
          variant: 'secondary',
          disabled: () => this.togglingFieldGroupId() !== null,
        },
      ],
    },
  ];

  ngOnInit(): void {
    this.loadFieldGroups();
  }

  loadFieldGroups(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.fieldGroupsService.listFieldGroups(this.businessTypeId())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ data }) => {
          this.fieldGroups.set(data.items || []);
          this.counts.set(data.counts || { all: 0, enabled: 0, disabled: 0 });
          this.loading.set(false);
        },
        error: (error) => {
          this.loading.set(false);
          const message = error?.error?.message
            || this.translate.instant('businessSetup.fieldGroupManager.messages.loadError');
          this.errorMessage.set(message);
          this.toast.error(message);
        },
      });
  }

  onRowAction(event: { actionKey: string; row: BusinessTypeFieldGroupRow }): void {
    if (event.actionKey === 'toggle') {
      this.toggleFieldGroup(event.row.fieldGroup);
    }
  }

  toggleFieldGroup(fieldGroup: BusinessTypeFieldGroup): void {
    if (this.togglingFieldGroupId()) {
      return;
    }

    const enabled = !fieldGroup.enabled;
    this.togglingFieldGroupId.set(fieldGroup.platformFieldGroupId);
    this.fieldGroupsService.updateFieldGroup(
      this.businessTypeId(),
      fieldGroup.platformFieldGroupId,
      { enabled },
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ data }) => {
          this.fieldGroups.set(data.items || []);
          this.counts.set(data.counts || { all: 0, enabled: 0, disabled: 0 });
          this.togglingFieldGroupId.set(null);
          this.toast.success(this.translate.instant(
            enabled
              ? 'businessSetup.fieldGroupManager.messages.enabled'
              : 'businessSetup.fieldGroupManager.messages.disabled',
            { name: fieldGroup.name },
          ));
          this.fieldGroupsUpdated.emit();
        },
        error: (error) => {
          this.togglingFieldGroupId.set(null);
          this.toast.error(
            error?.error?.message
              || this.translate.instant('businessSetup.fieldGroupManager.messages.updateError'),
          );
        },
      });
  }

  close(): void {
    this.modalOpen.set(false);
    this.closeManager.emit();
  }
}
