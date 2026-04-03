import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

import { GomButtonComponent } from '../../../shared/components/form-controls';
import { GomTableColumn, GomTableComponent, GomTableRow } from '../../../shared/components/table';

interface UnitRow extends GomTableRow {
  name: string;
  symbol: string;
  baseUnit: string;
  status: string;
}

@Component({
  selector: 'gom-units',
  standalone: true,
  imports: [CommonModule, GomButtonComponent, GomTableComponent],
  templateUrl: './units.component.html',
  styleUrl: './units.component.scss',
})
export class UnitsComponent {
  readonly columns: GomTableColumn<UnitRow>[] = [
    { key: 'name', header: 'Unit Name', sortable: true, filterable: true, width: '16rem' },
    { key: 'symbol', header: 'Symbol', sortable: true, filterable: true, width: '10rem' },
    { key: 'baseUnit', header: 'Base Unit', sortable: true, filterable: true, width: '12rem' },
    { key: 'status', header: 'Status', sortable: true, filterable: true, width: '10rem' },
  ];

  readonly rows: UnitRow[] = [];

  onAddUnit(): void {
    // Placeholder until Units API wiring is implemented.
  }
}
