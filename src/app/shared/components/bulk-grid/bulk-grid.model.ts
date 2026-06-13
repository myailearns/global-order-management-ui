export type BulkGridCellType = 'text' | 'number' | 'select' | 'boolean';
export type BulkGridColumnVisibility = 'default' | 'optional' | 'advanced';
export type BulkGridMode = 'create' | 'update';

export interface BulkGridOption {
  label: string;
  value: string;
}

export interface BulkGridColumn {
  key: string;
  label: string;
  type: BulkGridCellType;
  readonly?: boolean;
  visibility?: BulkGridColumnVisibility;
  required?: boolean;
  options?: BulkGridOption[];
  min?: number;
  max?: number;
  width?: string;
  placeholder?: string;
}

export type BulkGridRow = Record<string, string | number | boolean | null>;

export interface BulkGridValidationState {
  valid: boolean;
  errorCount: number;
}
