import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { CATEGORY_DEFAULT_STATUS, CATEGORY_UI_TEXT } from '../categories.constants';
import { Category } from '../categories.service';
import { GomButtonComponent } from '@gomlibs/ui';
import { GomTableColumn, GomTableComponent, GomTableRow } from '@gomlibs/ui';

interface CategoryTableRow extends GomTableRow {
  _id?: string;
  name: string;
  description: string;
  status: string;
}

export interface CategoryAction {
  action: 'view' | 'edit' | 'delete' | 'manage';
  category: Category;
}

@Component({
  selector: 'gom-categories-list',
  standalone: true,
  imports: [CommonModule, TranslateModule, GomTableComponent, GomButtonComponent],
  templateUrl: './categories-list.component.html',
  styleUrl: './categories-list.component.scss'
})
export class CategoriesListComponent implements OnChanges {
  @Input() categories: Category[] = [];
  @Input() loading = false;
  @Input() canCreate = true;
  @Input() canEdit = true;
  @Input() canDelete = true;
  @Output() action = new EventEmitter<CategoryAction>();
  @Output() addNew = new EventEmitter<void>();

  readonly text = CATEGORY_UI_TEXT;
  private readonly translate = inject(TranslateService);

  readonly columns: GomTableColumn<CategoryTableRow>[] = [
    { key: 'name', header: CATEGORY_UI_TEXT.nameLabel, sortable: true, filterable: true },
    { key: 'description', header: CATEGORY_UI_TEXT.descriptionLabel, filterable: true, textMode: 'wrap' },
    { key: 'status', header: CATEGORY_UI_TEXT.statusLabel, sortable: true, filterable: true },
    {
      key: 'actions',
      header: CATEGORY_UI_TEXT.actionsLabel,
      width: '16rem',
      actionButtons: [
        { label: CATEGORY_UI_TEXT.viewAction, actionKey: 'view', variant: 'secondary' },
        { label: CATEGORY_UI_TEXT.editAction, actionKey: 'edit', variant: 'secondary' },
        { label: CATEGORY_UI_TEXT.deleteAction, actionKey: 'delete', variant: 'secondary' },
      ],
    },
  ];

  readonly mobileCardFields: string[] = ['name', 'description', 'status'];

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

  get rows(): CategoryTableRow[] {
    return this.categories.map((category) => ({
      _id: category._id,
      ...category,
      description: category.description || CATEGORY_UI_TEXT.emptyValue,
      status: category.status || CATEGORY_DEFAULT_STATUS,
    }));
  }

  onEdit(category: Category) {
    this.action.emit({ action: 'edit', category });
  }

  onDelete(category: Category) {
    this.action.emit({ action: 'delete', category });
  }

  onAddNew() {
    this.addNew.emit();
  }

  onRowAction(event: { actionKey: string; row: GomTableRow }) {
    const category = this.mapRowToCategory(event.row);

    if (event.actionKey === 'view') {
      this.action.emit({ action: 'view', category });
    }

    if (event.actionKey === 'edit') {
      this.onEdit(category);
    }

    if (event.actionKey === 'delete') {
      this.onDelete(category);
    }

    if (event.actionKey === 'manage') {
      this.action.emit({ action: 'manage', category });
    }
  }

  onRowClick(row: GomTableRow): void {
    this.action.emit({ action: 'view', category: this.mapRowToCategory(row) });
  }

  private mapRowToCategory(row: GomTableRow): Category {
    return {
      _id: typeof row['_id'] === 'string' ? row['_id'] : '',
      name: typeof row['name'] === 'string' ? row['name'] : '',
      description: typeof row['description'] === 'string' ? row['description'] : CATEGORY_UI_TEXT.emptyValue,
      status: row['status'] === 'INACTIVE' ? 'INACTIVE' : CATEGORY_DEFAULT_STATUS,
    };
  }

  private rebuildColumns(): void {
    this.columns[0].header = this.translate.instant(this.text.nameLabel);
    this.columns[1].header = this.translate.instant(this.text.descriptionLabel);
    this.columns[2].header = this.translate.instant(this.text.statusLabel);
    this.columns[2].format = (value) =>
      value === 'INACTIVE'
        ? this.translate.instant('common.status.inactive')
        : this.translate.instant('common.status.active');
    this.columns[3].header = this.translate.instant(this.text.actionsLabel);
    this.columns[3].actionButtons = [
      { label: this.translate.instant(this.text.viewAction), actionKey: 'view', variant: 'secondary' },
      ...(this.canEdit ? [
        { label: this.translate.instant('categories.associations.manage'), actionKey: 'manage', variant: 'secondary' as const, icon: 'ri-links-line' },
        { label: this.translate.instant(this.text.editAction), actionKey: 'edit', variant: 'secondary' as const },
      ] : []),
      ...(this.canDelete ? [
        { label: this.translate.instant(this.text.deleteAction), actionKey: 'delete', variant: 'secondary' as const },
      ] : []),
    ];
  }
}
