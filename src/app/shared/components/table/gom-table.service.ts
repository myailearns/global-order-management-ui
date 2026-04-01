import { Injectable } from '@angular/core';

import {
  GomTableClientResult,
  GomTableColumn,
  GomTableQuery,
  GomTableRow,
} from './gom-table.models';

@Injectable({
  providedIn: 'root',
})
export class GomTableService {
  runClientPipeline<T extends GomTableRow>(
    rows: T[],
    columns: GomTableColumn<T>[],
    query: GomTableQuery
  ): GomTableClientResult<T> {
    const searched = this.applySearch(rows, columns, query.searchTerm, query.visibleColumnKeys);
    const filtered = this.applyFilters(searched, query.filters);
    const sorted = this.applySort(filtered, query.sort);
    const paged = this.applyPagination(sorted, query.pageIndex, query.pageSize);

    return {
      rows: paged,
      filteredTotal: sorted.length,
    };
  }

  private applySearch<T extends GomTableRow>(
    rows: T[],
    columns: GomTableColumn<T>[],
    searchTerm: string,
    visibleColumnKeys: string[]
  ): T[] {
    const normalized = searchTerm.trim().toLowerCase();
    if (!normalized) {
      return rows;
    }

    const activeKeys = columns
      .map((column) => column.key)
      .filter((key) => visibleColumnKeys.includes(key));

    return rows.filter((row) =>
      activeKeys.some((key) => this.stringifyCellValue(row[key]).toLowerCase().includes(normalized))
    );
  }

  private applyFilters<T extends GomTableRow>(
    rows: T[],
    filters: Record<string, string>
  ): T[] {
    const filterEntries = Object.entries(filters).filter(([, value]) => value.trim() !== '');
    if (!filterEntries.length) {
      return rows;
    }

    return rows.filter((row) =>
      filterEntries.every(([key, filterValue]) => {
        const cellText = this.stringifyCellValue(row[key]).toLowerCase();
        return cellText.includes(filterValue.trim().toLowerCase());
      })
    );
  }

  private applySort<T extends GomTableRow>(rows: T[], sort: GomTableQuery['sort']): T[] {
    if (!sort.key || !sort.direction) {
      return rows;
    }

    const directionFactor = sort.direction === 'asc' ? 1 : -1;

    return [...rows].sort((first, second) => {
      const firstValue = first[sort.key];
      const secondValue = second[sort.key];

      const firstNumeric = Number(firstValue);
      const secondNumeric = Number(secondValue);

      const bothNumeric = Number.isFinite(firstNumeric) && Number.isFinite(secondNumeric);

      if (bothNumeric) {
        return (firstNumeric - secondNumeric) * directionFactor;
      }

      const firstText = this.stringifyCellValue(firstValue).toLowerCase();
      const secondText = this.stringifyCellValue(secondValue).toLowerCase();

      if (firstText < secondText) {
        return -1 * directionFactor;
      }
      if (firstText > secondText) {
        return 1 * directionFactor;
      }
      return 0;
    });
  }

  private applyPagination<T extends GomTableRow>(rows: T[], pageIndex: number, pageSize: number): T[] {
    const start = pageIndex * pageSize;
    return rows.slice(start, start + pageSize);
  }

  private stringifyCellValue(value: unknown): string {
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
