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
import { BusinessTypeField, BusinessTypeFieldsService } from './business-type-fields.service';

interface BusinessTypeFieldRow extends GomTableRow {
  id: string;
  field: BusinessTypeField;
  name: string;
  key: string;
  type: string;
  fieldKind: string;
  required: string;
  status: string;
}

@Component({
  selector: 'gom-business-type-field-manager',
  standalone: true,
  imports: [TranslateModule, GomButtonComponent, GomModalComponent, GomTableComponent],
  templateUrl: './business-type-field-manager.component.html',
  styleUrl: './business-type-field-manager.component.scss',
})
export class BusinessTypeFieldManagerComponent implements OnInit {
  private readonly fieldsService = inject(BusinessTypeFieldsService);
  private readonly toast = inject(GomAlertToastService);
  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);

  businessTypeId = input.required<string>();
  businessTypeName = input.required<string>();
  closeManager = output<void>();
  fieldsUpdated = output<void>();

  readonly modalOpen = signal(true);
  readonly loading = signal(false);
  readonly fields = signal<BusinessTypeField[]>([]);
  readonly counts = signal({ all: 0, enabled: 0, disabled: 0 });
  readonly togglingFieldId = signal<string | null>(null);
  readonly errorMessage = signal('');

  readonly modalTitle = computed(() => this.translate.instant(
    'businessSetup.fieldManager.title',
    { businessType: this.businessTypeName() },
  ));

  readonly rows = computed<BusinessTypeFieldRow[]>(() => this.fields().map((field) => ({
    id: field.platformFieldId,
    field,
    name: field.name,
    key: field.key,
    type: field.type,
    fieldKind: this.translate.instant(`businessSetup.fieldManager.kind.${field.fieldKind.toLowerCase()}`),
    required: this.translate.instant(
      field.isRequired
        ? 'businessSetup.fieldManager.required.yes'
        : 'businessSetup.fieldManager.required.no',
    ),
    status: this.translate.instant(
      field.enabled
        ? 'businessSetup.fieldManager.status.enabled'
        : 'businessSetup.fieldManager.status.disabled',
    ),
  })));

  readonly columns: GomTableColumn<BusinessTypeFieldRow>[] = [
    {
      key: 'name',
      header: this.translate.instant('businessSetup.fieldManager.columns.name'),
      sortable: true,
      filterable: true,
    },
    {
      key: 'key',
      header: this.translate.instant('businessSetup.fieldManager.columns.key'),
      sortable: true,
      width: '11rem',
    },
    {
      key: 'type',
      header: this.translate.instant('businessSetup.fieldManager.columns.type'),
      sortable: true,
      filterable: true,
      width: '9rem',
    },
    {
      key: 'fieldKind',
      header: this.translate.instant('businessSetup.fieldManager.columns.kind'),
      sortable: true,
      filterable: true,
      width: '9rem',
    },
    {
      key: 'required',
      header: this.translate.instant('businessSetup.fieldManager.columns.required'),
      width: '7rem',
      cellAlign: 'center',
      headerAlign: 'center',
    },
    {
      key: 'status',
      header: this.translate.instant('businessSetup.fieldManager.columns.status'),
      sortable: true,
      filterable: true,
      width: '8rem',
      chipTone: (_value, row) => row.field.enabled ? 'success' : 'neutral',
    },
    {
      key: 'id',
      header: this.translate.instant('businessSetup.fieldManager.columns.actions'),
      width: '10rem',
      actionButtons: [
        {
          label: (row) => this.translate.instant(
            this.togglingFieldId() === row.id
              ? 'businessSetup.fieldManager.actions.updating'
              : row.field.enabled
                ? 'businessSetup.fieldManager.actions.disable'
                : 'businessSetup.fieldManager.actions.enable',
          ),
          icon: (row) => row.field.enabled ? 'ri-forbid-line' : 'ri-check-line',
          actionKey: 'toggle',
          variant: 'secondary',
          disabled: () => this.togglingFieldId() !== null,
        },
      ],
    },
  ];

  ngOnInit(): void {
    this.loadFields();
  }

  loadFields(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.fieldsService.listFields(this.businessTypeId())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ data }) => {
          this.fields.set(data.items || []);
          this.counts.set(data.counts || { all: 0, enabled: 0, disabled: 0 });
          this.loading.set(false);
        },
        error: (error) => {
          this.loading.set(false);
          const message = error?.error?.message
            || this.translate.instant('businessSetup.fieldManager.messages.loadError');
          this.errorMessage.set(message);
          this.toast.error(message);
        },
      });
  }

  onRowAction(event: { actionKey: string; row: BusinessTypeFieldRow }): void {
    if (event.actionKey === 'toggle') {
      this.toggleField(event.row.field);
    }
  }

  toggleField(field: BusinessTypeField): void {
    if (this.togglingFieldId()) {
      return;
    }

    const enabled = !field.enabled;
    this.togglingFieldId.set(field.platformFieldId);
    this.fieldsService.updateField(this.businessTypeId(), field.platformFieldId, { enabled })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ data }) => {
          this.fields.set(data.items || []);
          this.counts.set(data.counts || { all: 0, enabled: 0, disabled: 0 });
          this.togglingFieldId.set(null);
          this.toast.success(this.translate.instant(
            enabled
              ? 'businessSetup.fieldManager.messages.enabled'
              : 'businessSetup.fieldManager.messages.disabled',
            { name: field.name },
          ));
          this.fieldsUpdated.emit();
        },
        error: (error) => {
          this.togglingFieldId.set(null);
          this.toast.error(
            error?.error?.message
              || this.translate.instant('businessSetup.fieldManager.messages.updateError'),
          );
        },
      });
  }

  close(): void {
    this.modalOpen.set(false);
    this.closeManager.emit();
  }
}
