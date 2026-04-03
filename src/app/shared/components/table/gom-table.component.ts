import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  GomSortDirection,
  GomTableActionButton,
  GomTableAlign,
  GomTableColumn,
  GomTablePageChangeEvent,
  GomTableQuery,
  GomTableRow,
  GomTableSortState,
  GomTableTextMode,
} from './gom-table.models';
import { GomButtonComponent, GomInputComponent } from '../form-controls';
import { GomTableService } from './gom-table.service';

@Component({
  selector: 'gom-table',
  standalone: true,
  imports: [CommonModule, FormsModule, GomInputComponent, GomButtonComponent],
  templateUrl: './gom-table.component.html',
  styleUrl: './gom-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.gom-table-mobile-card]': 'mobileCardView',
  },
})
export class GomTableComponent<T extends GomTableRow = GomTableRow> implements OnChanges {
  @Input() columns: GomTableColumn<T>[] = [];
  @Input() rows: T[] = [];
  @Input() loading = false;
  @Input() dataMode: 'client' | 'server' = 'client';
  @Input() totalItems = 0;
  @Input() pageSize = 10;
  @Input() pageIndex = 0;
  @Input() pageSizeOptions: number[] = [5, 10, 20, 50];
  @Input() searchPlaceholder = 'Search...';
  @Input() emptyMessage = 'No records found.';
  @Input() mobileCardView = false;

  @Output() queryChange = new EventEmitter<GomTableQuery>();
  @Output() pageChange = new EventEmitter<GomTablePageChangeEvent>();
  @Output() sortChange = new EventEmitter<GomTableSortState>();
  @Output() filterChange = new EventEmitter<Record<string, string>>();
  @Output() columnVisibilityChange = new EventEmitter<string[]>();
  @Output() rowAction = new EventEmitter<{ actionKey: string; row: T }>();

  displayedRows: T[] = [];
  searchTerm = '';
  filters: Record<string, string> = {};
  sortState: GomTableSortState = { key: '', direction: '' };
  visibleColumnKeys = new Set<string>();
  columnPanelOpen = false;
  filtersVisible = false;
  filteredTotal = 0;

  private readonly tableService = inject(GomTableService);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['columns']) {
      this.initializeVisibleColumns();
    }

    if (this.dataMode === 'client') {
      this.runClientMode();
    } else {
      this.syncServerModeRows();

      if (changes['dataMode']?.firstChange || changes['columns']?.firstChange) {
        this.queryChange.emit(this.buildQuery());
      }
    }
  }

  get visibleColumns(): GomTableColumn<T>[] {
    return this.columns.filter((column) => this.visibleColumnKeys.has(column.key));
  }

  get hasInlineFilters(): boolean {
    return this.filtersVisible && this.visibleColumns.some((column) => column.filterable);
  }

  get totalPages(): number {
    const total = this.dataMode === 'client' ? this.filteredTotal : this.totalItems;
    return Math.max(1, Math.ceil(total / this.pageSize));
  }

  get canGoPrevious(): boolean {
    return this.pageIndex > 0;
  }

  get canGoNext(): boolean {
    return this.pageIndex + 1 < this.totalPages;
  }

  toggleColumnPanel(): void {
    this.columnPanelOpen = !this.columnPanelOpen;
  }

  toggleFilters(): void {
    this.filtersVisible = !this.filtersVisible;
  }

  toggleColumn(columnKey: string): void {
    if (this.visibleColumnKeys.has(columnKey)) {
      if (this.visibleColumnKeys.size === 1) {
        return;
      }
      this.visibleColumnKeys.delete(columnKey);
    } else {
      this.visibleColumnKeys.add(columnKey);
    }

    this.pageIndex = 0;
    this.columnVisibilityChange.emit([...this.visibleColumnKeys]);
    this.refresh();
  }

  setSort(column: GomTableColumn<T>): void {
    if (!column.sortable) {
      return;
    }

    this.sortState = {
      key: column.key,
      direction: this.getNextSortDirection(column.key),
    };

    if (this.sortState.direction === '') {
      this.sortState.key = '';
    }

    this.pageIndex = 0;
    this.sortChange.emit(this.sortState);
    this.refresh();
  }

  setSearchTerm(term: string): void {
    this.searchTerm = term;
    this.pageIndex = 0;
    this.refresh();
  }

  setFilter(columnKey: string, value: string): void {
    this.filters[columnKey] = value;
    this.pageIndex = 0;
    this.filterChange.emit(this.filters);
    this.refresh();
  }

  clearFilter(columnKey: string): void {
    this.filters[columnKey] = '';
    this.pageIndex = 0;
    this.filterChange.emit(this.filters);
    this.refresh();
  }

  changePageSize(nextPageSize: number): void {
    this.pageSize = Number(nextPageSize);
    this.pageIndex = 0;
    this.emitPageChange();
    this.refresh();
  }

  previousPage(): void {
    if (!this.canGoPrevious) {
      return;
    }
    this.pageIndex -= 1;
    this.emitPageChange();
    this.refresh();
  }

  nextPage(): void {
    if (!this.canGoNext) {
      return;
    }
    this.pageIndex += 1;
    this.emitPageChange();
    this.refresh();
  }

  getSortDirection(columnKey: string): GomSortDirection {
    return this.sortState.key === columnKey ? this.sortState.direction : '';
  }

  getHeaderAlign(column: GomTableColumn<T>): GomTableAlign {
    return column.headerAlign ?? 'left';
  }

  getCellAlign(column: GomTableColumn<T>): GomTableAlign {
    return column.cellAlign ?? 'left';
  }

  getTextMode(column: GomTableColumn<T>): GomTableTextMode {
    return column.textMode ?? 'truncate';
  }

  getCellValue(row: T, column: GomTableColumn<T>): string {
    const rawValue = row[column.key];
    if (column.format) {
      return column.format(rawValue, row);
    }
    return this.stringifyCellValue(rawValue);
  }

  hasActionButtons(column: GomTableColumn<T>): boolean {
    return !!column.actionButtons?.length;
  }

  getActionButtons(column: GomTableColumn<T>): GomTableActionButton<T>[] {
    return column.actionButtons ?? [];
  }

  triggerRowAction(actionKey: string, row: T): void {
    this.rowAction.emit({ actionKey, row });
  }

  handleHeaderKeydown(event: KeyboardEvent, column: GomTableColumn<T>): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.setSort(column);
    }
  }

  closeColumnPanel(): void {
    this.columnPanelOpen = false;
  }

  trackByColumn = (_: number, column: GomTableColumn<T>): string => column.key;
  trackByRow = (index: number): number => index;

  private getNextSortDirection(columnKey: string): GomSortDirection {
    const current = this.getSortDirection(columnKey);
    if (current === '') {
      return 'asc';
    }
    if (current === 'asc') {
      return 'desc';
    }
    return '';
  }

  private initializeVisibleColumns(): void {
    if (!this.columns.length) {
      this.visibleColumnKeys.clear();
      return;
    }

    if (this.visibleColumnKeys.size === 0) {
      this.columns.forEach((column) => this.visibleColumnKeys.add(column.key));
      return;
    }

    const available = new Set(this.columns.map((column) => column.key));
    for (const key of this.visibleColumnKeys) {
      if (!available.has(key)) {
        this.visibleColumnKeys.delete(key);
      }
    }

    if (this.visibleColumnKeys.size === 0) {
      this.columns.forEach((column) => this.visibleColumnKeys.add(column.key));
    }
  }

  private refresh(): void {
    if (this.dataMode === 'client') {
      this.runClientMode();
    } else {
      this.syncServerModeRows();
      this.queryChange.emit(this.buildQuery());
    }
  }

  private runClientMode(): void {
    const result = this.tableService.runClientPipeline(this.rows, this.columns, this.buildQuery());
    this.displayedRows = result.rows;
    this.filteredTotal = result.filteredTotal;
  }

  private syncServerModeRows(): void {
    this.displayedRows = this.rows;
    this.filteredTotal = this.totalItems;
  }

  private emitPageChange(): void {
    this.pageChange.emit({ pageIndex: this.pageIndex, pageSize: this.pageSize });
  }

  private buildQuery(): GomTableQuery {
    return {
      searchTerm: this.searchTerm,
      sort: this.sortState,
      pageIndex: this.pageIndex,
      pageSize: this.pageSize,
      filters: this.filters,
      visibleColumnKeys: [...this.visibleColumnKeys],
    };
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
