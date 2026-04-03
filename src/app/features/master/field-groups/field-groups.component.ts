import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

import { GomButtonComponent } from '../../../shared/components/form-controls';
import { GomTableColumn, GomTableComponent, GomTableRow } from '../../../shared/components/table';

interface FieldGroupRow extends GomTableRow {
  name: string;
  category: string;
  fieldsCount: string;
  status: string;
}

@Component({
  selector: 'gom-field-groups',
  standalone: true,
  imports: [CommonModule, GomButtonComponent, GomTableComponent],
  templateUrl: './field-groups.component.html',
  styleUrl: './field-groups.component.scss',
})
export class FieldGroupsComponent {
  readonly columns: GomTableColumn<FieldGroupRow>[] = [
    { key: 'name', header: 'Field Group Name', sortable: true, filterable: true, width: '18rem' },
    { key: 'category', header: 'Category', sortable: true, filterable: true, width: '14rem' },
    { key: 'fieldsCount', header: 'Fields', sortable: true, filterable: true, width: '10rem' },
    { key: 'status', header: 'Status', sortable: true, filterable: true, width: '10rem' },
  ];

  readonly rows: FieldGroupRow[] = [];

  onAddFieldGroup(): void {
    // Placeholder until Field Groups API wiring is implemented.
  }
}
