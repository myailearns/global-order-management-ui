import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Category } from './categories.service';
import { GomButtonComponent } from '../../../shared/components/form-controls';
import { GomTableColumn, GomTableComponent, GomTableRow } from '../../../shared/components/table';

interface CategoryTableRow extends GomTableRow {
  _id?: string;
  name: string;
  description: string;
  status: string;
  actions: string;
}

export interface CategoryAction {
  action: 'edit';
  category: Category;
}

@Component({
  selector: 'gom-categories-list',
  standalone: true,
  imports: [CommonModule, GomTableComponent, GomButtonComponent],
  templateUrl: './categories-list.component.html',
  styleUrl: './categories-list.component.scss'
})
export class CategoriesListComponent {
  @Input() categories: Category[] = [];
  @Input() loading = false;
  @Output() action = new EventEmitter<CategoryAction>();
  @Output() addNew = new EventEmitter<void>();

  readonly columns: GomTableColumn<CategoryTableRow>[] = [
    { key: 'name', header: 'Category Name', sortable: true, filterable: true, width: '18rem' },
    { key: 'description', header: 'Description', filterable: true, textMode: 'wrap' },
    { key: 'status', header: 'Status', sortable: true, filterable: true, width: '10rem' },
    {
      key: 'actions',
      header: 'Actions',
      width: '10rem',
      actionButtons: [{ label: 'Edit', actionKey: 'edit', variant: 'secondary' }],
    },
  ];

  get rows(): CategoryTableRow[] {
    return this.categories.map((category) => ({
      _id: category._id,
      ...category,
      description: category.description || '-',
      status: category.status || 'ACTIVE',
      actions: 'Edit',
    }));
  }

  onEdit(category: Category) {
    this.action.emit({ action: 'edit', category });
  }

  onAddNew() {
    this.addNew.emit();
  }

  onRowAction(event: { actionKey: string; row: GomTableRow }) {
    if (event.actionKey === 'edit') {
      const id = typeof event.row['_id'] === 'string' ? event.row['_id'] : '';
      const name = typeof event.row['name'] === 'string' ? event.row['name'] : '';
      const description = typeof event.row['description'] === 'string' ? event.row['description'] : '';
      const status = event.row['status'] === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';

      this.onEdit({
        _id: id,
        name,
        description,
        status,
      });
    }
  }
}
