import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

import { GomButtonComponent } from '../../../shared/components/form-controls';
import { GomTableColumn, GomTableComponent, GomTableRow } from '../../../shared/components/table';

interface FieldRow extends GomTableRow {
  name: string;
  code: string;
  type: string;
  status: string;
}

@Component({
  selector: 'gom-fields',
  standalone: true,
  imports: [CommonModule, GomButtonComponent, GomTableComponent],
  templateUrl: './fields.component.html',
  styleUrl: './fields.component.scss',
})
export class FieldsComponent {
  readonly columns: GomTableColumn<FieldRow>[] = [
    { key: 'name', header: 'Field Name', sortable: true, filterable: true, width: '16rem' },
    { key: 'code', header: 'Code', sortable: true, filterable: true, width: '12rem' },
    { key: 'type', header: 'Type', sortable: true, filterable: true, width: '12rem' },
    { key: 'status', header: 'Status', sortable: true, filterable: true, width: '10rem' },
  ];

  readonly rows: FieldRow[] = [];

  onAddField(): void {
    // Placeholder until Fields API wiring is implemented.
  }
}
