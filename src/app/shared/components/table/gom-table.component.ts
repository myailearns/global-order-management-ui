import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnInit,
  OnChanges,
  Output,
  SimpleChanges,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  GomChipTone,
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
import { GomButtonComponent, GomInputComponent, GomSelectComponent, GomSelectOption, GomSwitchComponent } from '../form-controls';
import { GomCardComponent } from '../card';
import { GomChipComponent } from '../chip';
import { GomTableService } from './gom-table.service';

@Component({
  selector: 'gom-lib-table',
  standalone: true,
  imports: [CommonModule, FormsModule, GomInputComponent, GomButtonComponent, GomSelectComponent, GomSwitchComponent, GomCardComponent, GomChipComponent],
  templateUrl: './gom-table.component.html',
  styleUrl: './gom-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.gom-table-mobile-card]': 'mobileCardView',
    '[class.gom-table-mobile-cards-active]': 'isMobileCardsActive',
    '[class.gom-table-mobile-table-active]': 'isMobileTableActive',
  },
})
export class GomTableComponent<T extends GomTableRow = GomTableRow> implements OnInit, OnChanges {
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
  @Input() mobileCardFields: string[] = [];
  @Input() mobileCardClickable = false;

  @Output() queryChange = new EventEmitter<GomTableQuery>();
  @Output() pageChange = new EventEmitter<GomTablePageChangeEvent>();
  @Output() sortChange = new EventEmitter<GomTableSortState>();
  @Output() filterChange = new EventEmitter<Record<string, string>>();
  @Output() columnVisibilityChange = new EventEmitter<string[]>();
  @Output() rowAction = new EventEmitter<{ actionKey: string; row: T }>();
  @Output() rowClick = new EventEmitter<T>();

  displayedRows: T[] = [];
  searchTerm = '';
  filters: Record<string, string> = {};
  sortState: GomTableSortState = { key: '', direction: '' };
  visibleColumnKeys = new Set<string>();
  columnPanelOpen = false;
  filtersVisible = false;
  filteredTotal = 0;
  mobileViewMode: 'cards' | 'table' = 'cards';
  isMobileViewport = false;
  submenuOpenKey: string | null = null;
  submenuPosition: Record<string, string> | null = null;

  private readonly tableService = inject(GomTableService);
  private readonly host = inject(ElementRef<HTMLElement>);

  ngOnInit(): void {
    this.updateViewportMode();
  }

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

  get showMobileViewToggle(): boolean {
    return this.mobileCardView && this.isMobileViewport;
  }

  get isMobileCardsActive(): boolean {
    return this.mobileCardView && this.isMobileViewport && this.mobileViewMode === 'cards';
  }

  get isMobileTableActive(): boolean {
    return this.mobileCardView && this.isMobileViewport && this.mobileViewMode === 'table';
  }

  get visibleColumns(): GomTableColumn<T>[] {
    return this.columns.filter((column) => this.visibleColumnKeys.has(column.key));
  }

  get mobileCardColumns(): GomTableColumn<T>[] {
    if (this.mobileCardFields.length > 0) {
      return this.mobileCardFields
        .map((key) => this.columns.find((column) => column.key === key) ?? null)
        .filter((column): column is GomTableColumn<T> => !!column && !this.hasActionButtons(column));
    }

    return this.visibleColumns.filter((column) => !this.hasActionButtons(column));
  }

  get mobileCardActionColumn(): GomTableColumn<T> | null {
    const visibleActionColumn = this.visibleColumns.find((column) => this.hasActionButtons(column));
    if (visibleActionColumn) {
      return visibleActionColumn;
    }

    return this.columns.find((column) => this.hasActionButtons(column)) ?? null;
  }

  get hasInlineFilters(): boolean {
    return this.filtersVisible && this.visibleColumns.some((column) => column.filterable);
  }

  get pageSizeSelectOptions(): GomSelectOption[] {
    return this.pageSizeOptions.map((option) => ({
      value: String(option),
      label: String(option),
    }));
  }

  get pageSizeModel(): string {
    return String(this.pageSize);
  }

  get totalPages(): number {
    const total = this.dataMode === 'client' ? this.filteredTotal : this.totalItems;
    return Math.max(1, Math.ceil(total / this.pageSize));
  }

  getActionLabel(action: GomTableActionButton<T>, row: T): string {
    return typeof action.label === 'function' ? action.label(row) : action.label;
  }

  getActionIcon(action: GomTableActionButton<T>, row: T): string | null {
    if (!action.icon) {
      return null;
    }
    return typeof action.icon === 'function' ? action.icon(row) : action.icon;
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

  onPageSizeSelectChange(value: string): void {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return;
    }

    this.changePageSize(parsed);
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

  getCellTitle(row: T, column: GomTableColumn<T>): string {
    const rawValue = row[column.key];
    if (column.tooltip) {
      return column.tooltip(rawValue, row);
    }
    return this.getCellValue(row, column);
  }

  getCellClass(row: T, column: GomTableColumn<T>): string {
    const rawValue = row[column.key];
    if (column.cellClass) {
      return column.cellClass(rawValue, row);
    }
    return '';
  }

  getChipTone(row: T, column: GomTableColumn<T>): GomChipTone {
    const rawValue = row[column.key];
    if (!column.chipTone) {
      return 'neutral';
    }
    if (typeof column.chipTone === 'function') {
      return column.chipTone(rawValue, row);
    }
    return column.chipTone;
  }

  getCellActionKey(row: T, column: GomTableColumn<T>): string | null {
    if (!column.clickActionKey) {
      return null;
    }
    if (typeof column.clickActionKey === 'function') {
      return column.clickActionKey(row);
    }
    return column.clickActionKey;
  }

  onCellActionClick(event: Event, actionKey: string, row: T): void {
    event.stopPropagation();
    this.triggerRowAction(actionKey, row);
  }

  onCellActionKeydown(event: KeyboardEvent, actionKey: string, row: T): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.onCellActionClick(event, actionKey, row);
    }
  }

  hasActionButtons(column: GomTableColumn<T>): boolean {
    return !!column.actionButtons?.length;
  }

  getActionButtons(column: GomTableColumn<T>): GomTableActionButton<T>[] {
    return column.actionButtons ?? [];
  }

  triggerRowAction(actionKey: string, row: T): void {
    this.submenuOpenKey = null;
    this.submenuPosition = null;
    this.rowAction.emit({ actionKey, row });
  }

  toggleSubmenu(event: Event, action: GomTableActionButton<T>, row: T, rowIndex: number): void {
    event.stopPropagation();
    const key = this.getSubmenuKey(action, row, rowIndex);
    if (this.submenuOpenKey === key) {
      this.submenuOpenKey = null;
      this.submenuPosition = null;
      return;
    }
    const trigger = (event.target as HTMLElement).closest('button') ?? (event.target as HTMLElement);
    const rect = trigger.getBoundingClientRect();
    const estimatedMenuHeight = 180;
    const spaceBelow = window.innerHeight - rect.bottom;
    if (spaceBelow < estimatedMenuHeight) {
      this.submenuPosition = {
        bottom: `${window.innerHeight - rect.top + 4}px`,
        right: `${window.innerWidth - rect.right}px`,
        top: 'auto',
      };
    } else {
      this.submenuPosition = {
        top: `${rect.bottom + 4}px`,
        right: `${window.innerWidth - rect.right}px`,
        bottom: 'auto',
      };
    }
    this.submenuOpenKey = key;
  }

  isSubmenuOpen(action: GomTableActionButton<T>, row: T, rowIndex: number): boolean {
    return this.submenuOpenKey === this.getSubmenuKey(action, row, rowIndex);
  }

  getSubActions(action: GomTableActionButton<T>): GomTableActionButton<T>[] {
    return action.subActions ?? [];
  }

  onSubmenuActionClick(event: Event, actionKey: string, row: T): void {
    event.stopPropagation();
    this.triggerRowAction(actionKey, row);
  }

  onMobileCardClick(row: T): void {
    if (!this.mobileCardClickable) {
      return;
    }

    this.rowClick.emit(row);
  }

  getMobileCardActions(row: T): GomTableActionButton<T>[] {
    const actionColumn = this.mobileCardActionColumn;
    if (!actionColumn?.actionButtons?.length) {
      return [];
    }

    return actionColumn.actionButtons.filter((action) => !action.disabled || !action.disabled(row));
  }

  onMobileCardActionClick(event: Event, actionKey: string, row: T): void {
    event.stopPropagation();
    this.triggerRowAction(actionKey, row);
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

  setMobileViewMode(mode: 'cards' | 'table'): void {
    this.mobileViewMode = mode;
  }

  onMobileViewSwitch(checked: boolean): void {
    this.mobileViewMode = checked ? 'table' : 'cards';
  }

  @HostListener('window:resize')
  onResize(): void {
    this.updateViewportMode();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    if (!this.submenuOpenKey) {
      return;
    }

    if (!this.host.nativeElement.contains(event.target as Node)) {
      this.submenuOpenKey = null;
      this.submenuPosition = null;
    }
  }

  @HostListener('document:keydown', ['$event'])
  onDocumentKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.submenuOpenKey) {
      event.preventDefault();
      this.submenuOpenKey = null;
      this.submenuPosition = null;
    }
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
      this.columns
        .filter((column) => !column.hiddenByDefault)
        .forEach((column) => this.visibleColumnKeys.add(column.key));
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

  private updateViewportMode(): void {
    this.isMobileViewport = typeof window !== 'undefined' && window.matchMedia('(max-width: 48rem)').matches;
  }

  private getSubmenuKey(action: GomTableActionButton<T>, row: T, rowIndex: number): string {
    const rowId = typeof row['_id'] === 'string' || typeof row['_id'] === 'number'
      ? String(row['_id'])
      : String(rowIndex);
    return `${action.actionKey}::${rowId}`;
  }
}
