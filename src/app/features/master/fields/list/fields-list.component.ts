import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { GomButtonComponent } from '../../../../shared/components/form-controls';
import { GomTableColumn, GomTableComponent, GomTableRow } from '../../../../shared/components/table';
import {
  FIELD_DEFAULT_STATUS,
  FIELD_UI_TEXT,
} from '../fields.constants';
import { Field } from '../fields.service';

interface FieldTableRow extends GomTableRow {
  _id?: string;
  name: string;
  key: string;
  type: string;
  defaultValue: string;
  isRequired: string;
  usedInFieldGroups: string;
  status: string;
}

export interface FieldAction {
  action: 'view' | 'edit' | 'delete';
  field: Field;
}

@Component({
  selector: 'gom-fields-list',
  standalone: true,
  imports: [CommonModule, TranslateModule, GomTableComponent, GomButtonComponent],
  templateUrl: './fields-list.component.html',
  styleUrl: './fields-list.component.scss'
})
export class FieldsListComponent implements OnChanges {
  @Input() fields: Field[] = [];
  @Input() fieldGroupUsageByFieldId: Record<string, string[]> = {};
  @Input() loading = false;
  @Input() canCreate = true;
  @Input() canEdit = true;
  @Input() canDelete = true;
  @Output() action = new EventEmitter<FieldAction>();
  @Output() addNew = new EventEmitter<void>();

  readonly text = FIELD_UI_TEXT;
  private readonly translate = inject(TranslateService);

  readonly columns: GomTableColumn<FieldTableRow>[] = [
    { key: 'name', header: FIELD_UI_TEXT.nameLabel, sortable: true, filterable: true, width: '14rem' },
    { key: 'key', header: FIELD_UI_TEXT.keyLabel, sortable: true, filterable: true, width: '14rem' },
    { key: 'type', header: FIELD_UI_TEXT.typeLabel, sortable: true, filterable: true, width: '11rem' },
    { key: 'defaultValue', header: FIELD_UI_TEXT.defaultValueLabel, sortable: true, width: '11rem' },
    { key: 'isRequired', header: FIELD_UI_TEXT.isRequiredLabel, sortable: true, filterable: true, width: '11rem' },
    { key: 'usedInFieldGroups', header: FIELD_UI_TEXT.usedInFieldGroupsLabel, sortable: true, filterable: true, width: '18rem', textMode: 'wrap' },
    { key: 'status', header: FIELD_UI_TEXT.statusLabel, sortable: true, filterable: true, width: '11rem' },
    {
      key: 'actions',
      header: FIELD_UI_TEXT.actionsLabel,
      width: '9rem',
      actionButtons: [
        { label: FIELD_UI_TEXT.viewAction, actionKey: 'view', variant: 'secondary' },
        { label: FIELD_UI_TEXT.editAction, actionKey: 'edit', variant: 'secondary' },
        { label: FIELD_UI_TEXT.deleteAction, actionKey: 'delete', variant: 'secondary' },
      ],
    },
  ];

  readonly mobileCardFields: string[] = ['name'];

  constructor() {
    this.translate.onLangChange.subscribe(() => {
      this.rebuildColumns();
    });
    this.rebuildColumns();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['canCreate'] || changes['canEdit'] || changes['canDelete']) {
      this.rebuildColumns();
    }
  }

  get rows(): FieldTableRow[] {
    return this.fields.map((field) => ({
      _id: field._id,
      name: field.name,
      key: field.key,
      type: field.type,
      defaultValue: String(field.defaultValue ?? 0),
      isRequired: field.isRequired ? 'true' : 'false',
      usedInFieldGroups: this.getUsageText(field._id),
      status: field.status || FIELD_DEFAULT_STATUS,
    }));
  }

  onAddNew(): void {
    this.addNew.emit();
  }

  onRowAction(event: { actionKey: string; row: GomTableRow }): void {
    const field = this.mapRowToField(event.row);

    if (event.actionKey === 'view') {
      this.action.emit({ action: 'view', field });
      return;
    }

    if (event.actionKey === 'edit') {
      this.action.emit({ action: 'edit', field });
      return;
    }

    if (event.actionKey === 'delete') {
      this.action.emit({ action: 'delete', field });
    }
  }

  onRowClick(row: GomTableRow): void {
    this.action.emit({ action: 'view', field: this.mapRowToField(row) });
  }

  private mapRowToField(row: GomTableRow): Field {
    const type = this.mapType(row['type']);
    return {
      _id: typeof row['_id'] === 'string' ? row['_id'] : undefined,
      name: typeof row['name'] === 'string' ? row['name'] : '',
      key: typeof row['key'] === 'string' ? row['key'] : '',
      type,
      fieldKind: type === 'TEXT' || type === 'LONG_TEXT' ? 'METADATA' : 'PRICING',
      defaultValue: this.mapDefaultValue(row['defaultValue'], type),
      isRequired: row['isRequired'] === 'true',
      status: row['status'] === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
    };
  }

  private rebuildColumns(): void {
    this.columns[0].header = this.translate.instant(this.text.nameLabel);
    this.columns[1].header = this.translate.instant(this.text.keyLabel);
    this.columns[2].header = this.translate.instant(this.text.typeLabel);
    this.columns[2].format = (value) => this.getTranslatedTypeLabel(value);
    this.columns[3].header = this.translate.instant(this.text.defaultValueLabel);
    this.columns[4].header = this.translate.instant(this.text.isRequiredLabel);
    this.columns[4].format = (value) =>
      value === 'true'
        ? this.translate.instant(this.text.yes)
        : this.translate.instant(this.text.no);
    this.columns[5].header = this.translate.instant(this.text.usedInFieldGroupsLabel);
    this.columns[6].header = this.translate.instant(this.text.statusLabel);
    this.columns[6].format = (value) =>
      value === 'INACTIVE'
        ? this.translate.instant('common.status.inactive')
        : this.translate.instant('common.status.active');
    this.columns[7].header = this.translate.instant(this.text.actionsLabel);
    this.columns[7].actionButtons = [
      { label: this.translate.instant(this.text.viewAction), actionKey: 'view', variant: 'secondary' },
      ...(this.canEdit ? [
        { label: this.translate.instant(this.text.editAction), actionKey: 'edit', variant: 'secondary' as const },
      ] : []),
      ...(this.canDelete ? [
        { label: this.translate.instant(this.text.deleteAction), actionKey: 'delete', variant: 'secondary' as const },
      ] : []),
    ];
  }

  private getUsageText(fieldId?: string): string {
    if (!fieldId) {
      return this.translate.instant(this.text.notUsedInFieldGroups);
    }

    const names = this.fieldGroupUsageByFieldId[fieldId] || [];
    if (!names.length) {
      return this.translate.instant(this.text.notUsedInFieldGroups);
    }

    return names.join(', ');
  }

  private mapType(value: unknown): Field['type'] {
    if (value === 'PERCENTAGE' || value === 'TEXT' || value === 'LONG_TEXT') {
      return value;
    }

    return 'NUMBER';
  }

  private mapDefaultValue(value: unknown, type: Field['type']): number | string {
    if (type === 'TEXT' || type === 'LONG_TEXT') {
      return typeof value === 'string' ? value : '';
    }

    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private getTranslatedTypeLabel(value: unknown): string {
    if (value === 'PERCENTAGE') {
      return this.translate.instant('fields.types.percentage');
    }

    if (value === 'TEXT') {
      return this.translate.instant('fields.types.text');
    }

    if (value === 'LONG_TEXT') {
      return this.translate.instant('fields.types.longText');
    }

    return this.translate.instant('fields.types.number');
  }
}
