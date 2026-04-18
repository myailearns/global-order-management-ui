import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { GomButtonComponent } from '@gomlibs/ui';
import { GomTableColumn, GomTableComponent, GomTableRow } from '@gomlibs/ui';
import { UNIT_DEFAULT_STATUS, UNIT_UI_TEXT } from '../units.constants';
import { Unit } from '../units.service';

interface UnitTableRow extends GomTableRow {
  _id?: string;
  name: string;
  symbol: string;
  baseUnit: string;
  conversionFactor: string;
  status: string;
}

export interface UnitAction {
  action: 'view' | 'edit' | 'delete';
  unit: Unit;
}

@Component({
  selector: 'gom-units-list',
  standalone: true,
  imports: [CommonModule, TranslateModule, GomTableComponent, GomButtonComponent],
  templateUrl: './units-list.component.html',
  styleUrl: './units-list.component.scss',
})
export class UnitsListComponent implements OnChanges {
  @Input() units: Unit[] = [];
  @Input() baseUnitNameById: Record<string, string> = {};
  @Input() loading = false;
  @Input() canCreate = true;
  @Input() canEdit = true;
  @Input() canDelete = true;
  @Output() action = new EventEmitter<UnitAction>();
  @Output() addNew = new EventEmitter<void>();

  readonly text = UNIT_UI_TEXT;
  readonly mobileCardFields: string[] = ['name', 'symbol', 'baseUnit', 'status'];
  private readonly translate = inject(TranslateService);

  readonly columns: GomTableColumn<UnitTableRow>[] = [
    { key: 'name', header: UNIT_UI_TEXT.nameLabel, sortable: true, filterable: true, width: '16rem' },
    { key: 'symbol', header: UNIT_UI_TEXT.symbolLabel, sortable: true, filterable: true, width: '10rem' },
    { key: 'baseUnit', header: UNIT_UI_TEXT.baseUnitLabel, sortable: true, filterable: true, width: '14rem' },
    { key: 'conversionFactor', header: UNIT_UI_TEXT.conversionFactorLabel, sortable: true, width: '12rem' },
    { key: 'status', header: UNIT_UI_TEXT.statusLabel, sortable: true, filterable: true, width: '10rem' },
    {
      key: 'actions',
      header: UNIT_UI_TEXT.actionsLabel,
      width: '9rem',
      actionButtons: [
        { label: UNIT_UI_TEXT.viewAction, actionKey: 'view', variant: 'secondary' },
        { label: UNIT_UI_TEXT.editAction, actionKey: 'edit', variant: 'secondary' },
        { label: UNIT_UI_TEXT.deleteAction, actionKey: 'delete', variant: 'secondary' },
      ],
    },
  ];

  constructor() {
    this.translate.onLangChange.subscribe(() => this.rebuildColumns());
    this.rebuildColumns();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['canCreate'] || changes['canEdit'] || changes['canDelete']) {
      this.rebuildColumns();
    }
  }

  get rows(): UnitTableRow[] {
    return this.units.map((unit) => ({
      _id: unit._id,
      name: unit.name,
      symbol: unit.symbol,
      baseUnit: unit.baseUnitId ? (this.baseUnitNameById[unit.baseUnitId] || UNIT_UI_TEXT.emptyValue) : this.translate.instant(UNIT_UI_TEXT.noBaseUnit),
      conversionFactor: String(unit.conversionFactor ?? 1),
      status: unit.status || UNIT_DEFAULT_STATUS,
    }));
  }

  onAddNew(): void {
    this.addNew.emit();
  }

  onRowAction(event: { actionKey: string; row: GomTableRow }): void {
    const unit = this.mapRowToUnit(event.row);
    if (!unit) {
      return;
    }

    if (event.actionKey === 'view') {
      this.action.emit({ action: 'view', unit });
      return;
    }

    if (event.actionKey === 'edit') {
      this.action.emit({ action: 'edit', unit });
      return;
    }

    if (event.actionKey === 'delete') {
      this.action.emit({ action: 'delete', unit });
    }
  }

  onRowClick(row: GomTableRow): void {
    const unit = this.mapRowToUnit(row);
    if (!unit) {
      return;
    }

    this.action.emit({ action: 'view', unit });
  }

  private mapRowToUnit(row: GomTableRow): Unit | null {
    const id = typeof row['_id'] === 'string' ? row['_id'] : '';
    return this.units.find((unit) => unit._id === id) || null;
  }

  private rebuildColumns(): void {
    this.columns[0].header = this.translate.instant(this.text.nameLabel);
    this.columns[1].header = this.translate.instant(this.text.symbolLabel);
    this.columns[2].header = this.translate.instant(this.text.baseUnitLabel);
    this.columns[3].header = this.translate.instant(this.text.conversionFactorLabel);
    this.columns[4].header = this.translate.instant(this.text.statusLabel);
    this.columns[4].format = (value) =>
      value === 'INACTIVE'
        ? this.translate.instant('common.status.inactive')
        : this.translate.instant('common.status.active');
    this.columns[5].header = this.translate.instant(this.text.actionsLabel);
    this.columns[5].actionButtons = [
      { label: this.translate.instant(this.text.viewAction), actionKey: 'view', variant: 'secondary' },
      ...(this.canEdit ? [
        { label: this.translate.instant(this.text.editAction), actionKey: 'edit', variant: 'secondary' as const },
      ] : []),
      ...(this.canDelete ? [
        { label: this.translate.instant(this.text.deleteAction), actionKey: 'delete', variant: 'secondary' as const },
      ] : []),
    ];
  }
}