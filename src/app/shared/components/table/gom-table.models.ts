export type GomTableRow = Record<string, unknown>;

export type GomTableAlign = 'left' | 'center' | 'right';

export type GomTableTextMode = 'truncate' | 'wrap' | 'expand';

export type GomSortDirection = 'asc' | 'desc' | '';

export type GomTableActionVariant = 'primary' | 'secondary' | 'danger';

export interface GomTableActionButton<T extends GomTableRow = GomTableRow> {
  label: string;
  actionKey: string;
  variant?: GomTableActionVariant;
  disabled?: (row: T) => boolean;
}

export interface GomTableSortState {
  key: string;
  direction: GomSortDirection;
}

export interface GomTableColumn<T extends GomTableRow = GomTableRow> {
  key: keyof T & string;
  header: string;
  sortable?: boolean;
  filterable?: boolean;
  width?: string;
  headerAlign?: GomTableAlign;
  cellAlign?: GomTableAlign;
  textMode?: GomTableTextMode;
  format?: (value: unknown, row: T) => string;
  actionButtons?: GomTableActionButton<T>[];
}

export interface GomTableQuery {
  searchTerm: string;
  sort: GomTableSortState;
  pageIndex: number;
  pageSize: number;
  filters: Record<string, string>;
  visibleColumnKeys: string[];
}

export interface GomTablePageChangeEvent {
  pageIndex: number;
  pageSize: number;
}

export interface GomTableClientResult<T extends GomTableRow = GomTableRow> {
  rows: T[];
  filteredTotal: number;
}
