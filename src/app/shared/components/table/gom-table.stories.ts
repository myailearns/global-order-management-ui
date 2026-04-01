import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Meta, StoryObj, moduleMetadata } from '@storybook/angular';

import {
  GomTableColumn,
  GomTableComponent,
  GomTableQuery,
  GomTableRow,
} from './index';

interface ProductRow extends GomTableRow {
  id: number;
  sku: string;
  name: string;
  category: string;
  price: number;
  status: string;
  description: string;
}

const DEMO_ROWS: ProductRow[] = [
  {
    id: 1,
    sku: 'P-1001',
    name: 'Starter Clutch Assembly',
    category: 'Powertrain',
    price: 220.5,
    status: 'ACTIVE',
    description:
      'High durability clutch assembly for heavy duty usage in long-haul commercial operations.',
  },
  {
    id: 2,
    sku: 'P-1002',
    name: 'Fuel Injector Kit',
    category: 'Engine',
    price: 134.99,
    status: 'ACTIVE',
    description: 'Precision injector with low-variance spray profile for optimized fuel efficiency.',
  },
  {
    id: 3,
    sku: 'P-1003',
    name: 'Rear Brake Rotor',
    category: 'Brakes',
    price: 89.75,
    status: 'INACTIVE',
    description: 'Coated rotor for corrosion resistance and reduced vibration under load.',
  },
  {
    id: 4,
    sku: 'P-1004',
    name: 'ABS Sensor Cable',
    category: 'Electronics',
    price: 55.2,
    status: 'ACTIVE',
    description: 'Shielded sensor cable designed for noisy engine bay environments.',
  },
  {
    id: 5,
    sku: 'P-1005',
    name: 'Cabin Air Filter Premium',
    category: 'HVAC',
    price: 24.1,
    status: 'ACTIVE',
    description: 'Dual-layer filtration media with long replacement interval and low pressure drop.',
  },
  {
    id: 6,
    sku: 'P-1006',
    name: 'Torque Converter',
    category: 'Transmission',
    price: 510,
    status: 'ACTIVE',
    description: 'Balanced converter assembly for smooth high-load acceleration performance.',
  },
  {
    id: 7,
    sku: 'P-1007',
    name: 'Ignition Coil Pack',
    category: 'Engine',
    price: 65.4,
    status: 'INACTIVE',
    description: 'Low resistance coil pack for improved spark stability in thermal extremes.',
  },
  {
    id: 8,
    sku: 'P-1008',
    name: 'Steering Rack Seal Set',
    category: 'Steering',
    price: 43.15,
    status: 'ACTIVE',
    description: 'Seal set built for low-friction response and high pressure retention.',
  },
  {
    id: 9,
    sku: 'P-1009',
    name: 'Radiator Core',
    category: 'Cooling',
    price: 279.99,
    status: 'ACTIVE',
    description: 'Lightweight aluminum core with high thermal transfer for high duty cycles.',
  },
  {
    id: 10,
    sku: 'P-1010',
    name: 'Door Harness Main',
    category: 'Electronics',
    price: 119.9,
    status: 'ACTIVE',
    description: 'Pre-loomed harness set with abrasion-resistant sleeve and lock connectors.',
  },
  {
    id: 11,
    sku: 'P-1011',
    name: 'Differential Bearing Kit',
    category: 'Driveline',
    price: 198.25,
    status: 'INACTIVE',
    description: 'Matched bearings and seals tuned for low noise and high axial load.',
  },
  {
    id: 12,
    sku: 'P-1012',
    name: 'Windshield Washer Pump',
    category: 'Body',
    price: 18.99,
    status: 'ACTIVE',
    description: 'Compact pump with anti-backflow valve and low-noise motor profile.',
  },
];

const DEMO_COLUMNS: GomTableColumn<ProductRow>[] = [
  {
    key: 'id',
    header: 'ID',
    sortable: true,
    filterable: true,
    width: '5rem',
    headerAlign: 'right',
    cellAlign: 'right',
  },
  {
    key: 'sku',
    header: 'SKU',
    sortable: true,
    filterable: true,
    width: '8rem',
  },
  {
    key: 'name',
    header: 'Name',
    sortable: true,
    filterable: true,
    width: '14rem',
    textMode: 'wrap',
  },
  {
    key: 'category',
    header: 'Category',
    sortable: true,
    filterable: true,
    width: '10rem',
  },
  {
    key: 'price',
    header: 'Price',
    sortable: true,
    filterable: true,
    headerAlign: 'right',
    cellAlign: 'right',
    format: (value) => `$${Number(value).toFixed(2)}`,
    width: '8rem',
  },
  {
    key: 'status',
    header: 'Status',
    sortable: true,
    filterable: true,
    headerAlign: 'center',
    cellAlign: 'center',
    width: '9rem',
  },
  {
    key: 'description',
    header: 'Description',
    sortable: false,
    filterable: true,
    width: '20rem',
    textMode: 'truncate',
  },
];

@Component({
  selector: 'gom-table-client-story',
  standalone: true,
  imports: [CommonModule, GomTableComponent],
  template: `
    <gom-table
      [columns]="columns"
      [rows]="rows"
      dataMode="client"
      [pageSize]="5"
      [pageSizeOptions]="[5, 10, 20]"
    ></gom-table>
  `,
})
class ClientStoryComponent {
  columns = DEMO_COLUMNS;
  rows = DEMO_ROWS;
}

@Component({
  selector: 'gom-table-server-story',
  standalone: true,
  imports: [CommonModule, GomTableComponent],
  template: `
    <gom-table
      [columns]="columns"
      [rows]="rows"
      [loading]="loading"
      dataMode="server"
      [pageIndex]="pageIndex"
      [pageSize]="pageSize"
      [totalItems]="totalItems"
      [pageSizeOptions]="[5, 10, 20]"
      (queryChange)="handleQueryChange($event)"
    ></gom-table>
  `,
})
class ServerStoryComponent {
  columns = DEMO_COLUMNS;
  rows: ProductRow[] = [];
  loading = false;
  totalItems = DEMO_ROWS.length;
  pageIndex = 0;
  pageSize = 5;

  constructor() {
    this.fetch({
      searchTerm: '',
      sort: { key: '', direction: '' },
      pageIndex: this.pageIndex,
      pageSize: this.pageSize,
      filters: {},
      visibleColumnKeys: this.columns.map((column) => column.key),
    });
  }

  handleQueryChange(query: GomTableQuery): void {
    this.pageIndex = query.pageIndex;
    this.pageSize = query.pageSize;
    this.fetch(query);
  }

  private fetch(query: GomTableQuery): void {
    this.loading = true;

    globalThis.setTimeout(() => {
      let working = [...DEMO_ROWS];

      const normalizedSearch = query.searchTerm.trim().toLowerCase();
      if (normalizedSearch) {
        working = working.filter((row) =>
          Object.values(row).some((value) =>
            this.stringifyValue(value).toLowerCase().includes(normalizedSearch)
          )
        );
      }

      for (const [key, value] of Object.entries(query.filters)) {
        const normalizedFilter = value.trim().toLowerCase();
        if (normalizedFilter) {
          working = working.filter((row) =>
            this.stringifyValue(row[key]).toLowerCase().includes(normalizedFilter)
          );
        }
      }

      if (query.sort.key && query.sort.direction) {
        const sortFactor = query.sort.direction === 'asc' ? 1 : -1;
        working.sort((left, right) => {
          const leftValue = this.stringifyValue(left[query.sort.key]).toLowerCase();
          const rightValue = this.stringifyValue(right[query.sort.key]).toLowerCase();
          if (leftValue < rightValue) {
            return -1 * sortFactor;
          }
          if (leftValue > rightValue) {
            return 1 * sortFactor;
          }
          return 0;
        });
      }

      this.totalItems = working.length;

      const start = query.pageIndex * query.pageSize;
      this.rows = working.slice(start, start + query.pageSize);

      this.loading = false;
    }, 450);
  }

  private stringifyValue(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    if (value instanceof Date) {
      return value.toISOString();
    }
    return JSON.stringify(value);
  }
}

const meta: Meta<any> = {
  title: 'Shared/Table/GomTable',
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<any>;

export const ClientSide: Story = {
  decorators: [
    moduleMetadata({
      imports: [ClientStoryComponent],
    }),
  ],
  render: () => ({
    template: '<gom-table-client-story />',
  }),
};

export const ServerSide: Story = {
  decorators: [
    moduleMetadata({
      imports: [ServerStoryComponent],
    }),
  ],
  render: () => ({
    template: '<gom-table-server-story />',
  }),
};
