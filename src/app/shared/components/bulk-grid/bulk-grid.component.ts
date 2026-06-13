import { CommonModule } from '@angular/common';
import { Component, DestroyRef, ElementRef, EventEmitter, Input, OnChanges, Output, SimpleChanges, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormControlsModule } from '@gomlibs/ui';

import { BulkGridColumn, BulkGridMode, BulkGridRow, BulkGridValidationState } from './bulk-grid.model';

@Component({
  selector: 'app-bulk-grid',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormControlsModule],
  templateUrl: './bulk-grid.component.html',
  styleUrl: './bulk-grid.component.scss',
})
export class BulkGridComponent implements OnChanges {
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly hostElement = inject(ElementRef<HTMLElement>);
  private rowCache: BulkGridRow[] = [];

  @Input({ required: true }) columns: BulkGridColumn[] = [];
  @Input() enableColumnPresets = false;
  @Input() mode: BulkGridMode = 'create';
  @Input() frozenColumnCount = 2;
  @Input() maxRows = 10000;
  @Input() readonly = false;
  @Input() addButtonLabel = 'Add Row';
  @Input() clearButtonLabel = 'Clear Rows';
  @Input() emptyMessage = 'No rows added yet.';
  @Input() optionalColumnsLabel = 'Optional Fields';
  @Input() advancedColumnsLabel = 'Advanced Fields';
  @Input() allowOptionalColumnsToggle = true;
  @Input() rowSecondaryActionLabel = '';
  @Input() rowSecondaryActionIcon = '';
  @Input() rowSecondaryActionTooltip = '';
  @Input() rowTertiaryActionLabel = '';
  @Input() rowTertiaryActionIcon = '';
  @Input() rowTertiaryActionTooltip = '';
  @Input() enableBulkAddInput = false;
  @Input() enableRowSelection = false;

  @Input()
  set initialRows(rows: BulkGridRow[] | null) {
    this.rowCache = (rows ?? []).map((row) => ({ ...row }));
    this.buildRows(this.rowCache);
  }

  @Output() rowsChange = new EventEmitter<BulkGridRow[]>();
  @Output() validationChange = new EventEmitter<BulkGridValidationState>();
  @Output() rowSecondaryAction = new EventEmitter<number>();
  @Output() rowTertiaryAction = new EventEmitter<number>();
  @Output() rowPublishAction = new EventEmitter<number>();
  @Output() selectedRowsChange = new EventEmitter<number[]>();

  readonly form = this.fb.group({
    rows: this.fb.array<FormGroup>([]),
  });
  readonly bulkAddCountControl = new FormControl<string>('1', { nonNullable: true });

  /** Signal-based row count so Angular templates react to changes. */
  readonly rowCount = signal(0);
  readonly selectedRowIndices = signal<Set<number>>(new Set());
  readonly selectedRowCount = computed(() => this.selectedRowIndices().size);
  readonly showOptionalColumns = signal(false);
  readonly showAdvancedColumns = signal(false);
  readonly hasOptionalColumns = computed(() =>
    this.enableColumnPresets
    && this.allowOptionalColumnsToggle
    && this.columns.some((column) => (column.visibility ?? 'default') === 'optional'),
  );
  readonly hasAdvancedColumns = computed(() =>
    this.enableColumnPresets && this.columns.some((column) => (column.visibility ?? 'default') === 'advanced'),
  );
  readonly visibleColumns = computed(() => {
    if (!this.enableColumnPresets) {
      return this.columns;
    }

    return this.columns.filter((column) => {
      const visibility = column.visibility ?? 'default';
      if (visibility === 'default') {
        return true;
      }
      if (visibility === 'optional') {
        return this.showOptionalColumns();
      }

      return this.showAdvancedColumns();
    });
  });

  constructor() {
    this.rowsArray.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.emitState());
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['mode']) {
      this.applyModeDefaults();
    }

    if ((changes['columns'] && !changes['columns'].firstChange) || changes['mode'] || changes['enableColumnPresets']) {
      this.buildRows(this.rowCache);
    }
  }

  get rowsArray(): FormArray<FormGroup> {
    return this.form.controls.rows;
  }

  addRow(seed?: BulkGridRow, requestedCount?: number | string): void {
    if (this.readonly || this.rowsArray.length >= this.maxRows) {
      return;
    }

    const countToAdd = this.resolveRequestedRowCount(requestedCount);
    const rowsToAdd = Math.min(Math.max(1, countToAdd), this.maxRows - this.rowsArray.length);

    for (let index = 0; index < rowsToAdd; index += 1) {
      this.appendRow(seed);
    }

    this.rowsArray.updateValueAndValidity({ emitEvent: false });
    this.syncRowCount();
    this.emitState();
  }

  addMultipleRows(): void {
    this.addRow();
  }

  updateBulkAddCount(value: string): void {
    this.bulkAddCountControl.setValue(String(this.normalizeRequestedRowCount(value)), { emitEvent: false });
  }

  removeRow(index: number): void {
    if (this.readonly || index < 0 || index >= this.rowsArray.length) {
      return;
    }

    this.rowsArray.removeAt(index, { emitEvent: false });
    this.rowCache.splice(index, 1);
    this.rowsArray.updateValueAndValidity({ emitEvent: false });
    this.syncRowCount();
    this.clearRowSelection();
    this.emitState();
  }

  isRowSelected(index: number): boolean {
    return this.selectedRowIndices().has(index);
  }

  areAllRowsSelected(): boolean {
    return this.rowCount() > 0 && this.selectedRowCount() === this.rowCount();
  }

  toggleRowSelection(index: number, selected: boolean): void {
    if (!this.enableRowSelection || this.readonly || index < 0 || index >= this.rowsArray.length) {
      return;
    }

    const next = new Set(this.selectedRowIndices());
    if (selected) {
      next.add(index);
    } else {
      next.delete(index);
    }
    this.selectedRowIndices.set(next);
    this.emitSelectedRows();
  }

  toggleSelectAllRows(selected: boolean): void {
    if (!this.enableRowSelection || this.readonly) {
      return;
    }

    if (!selected) {
      this.clearRowSelection();
      return;
    }

    const all = new Set<number>();
    for (let i = 0; i < this.rowsArray.length; i += 1) {
      all.add(i);
    }
    this.selectedRowIndices.set(all);
    this.emitSelectedRows();
  }

  onRowSecondaryAction(index: number): void {
    if (this.readonly || (!this.rowSecondaryActionLabel && !this.rowSecondaryActionIcon) || index < 0 || index >= this.rowsArray.length) {
      return;
    }

    this.rowSecondaryAction.emit(index);
  }

  onRowTertiaryAction(index: number): void {
    if (this.readonly || (!this.rowTertiaryActionLabel && !this.rowTertiaryActionIcon) || index < 0 || index >= this.rowsArray.length) {
      return;
    }

    this.rowTertiaryAction.emit(index);
  }

  onRowPublishAction(index: number): void {
    if (this.readonly || index < 0 || index >= this.rowsArray.length) {
      return;
    }

    this.rowPublishAction.emit(index);
  }

  clearRows(): void {
    if (this.readonly) {
      return;
    }

    this.rowsArray.clear({ emitEvent: false });
    this.rowCache = [];
    this.rowsArray.updateValueAndValidity({ emitEvent: false });
    this.syncRowCount();
    this.clearRowSelection();
    this.emitState();
  }

  replaceRows(rows: BulkGridRow[]): void {
    this.buildRows(rows);
  }

  markAllAsTouched(): void {
    this.rowsArray.controls.forEach((group) => group.markAllAsTouched());
    this.emitState();
  }

  getRows(): BulkGridRow[] {
    return this.rowsArray.getRawValue();
  }

  getControl(rowIndex: number, key: string): FormControl {
    return this.rowsArray.at(rowIndex).controls[key] as FormControl;
  }

  hasCellError(rowIndex: number, key: string): boolean {
    const rowControl = this.rowsArray.at(rowIndex);
    if (!rowControl || !this.shouldValidateRow(rowControl)) {
      return false;
    }

    const control = this.getControl(rowIndex, key);
    return control.invalid && (control.touched || control.dirty || rowControl.dirty);
  }

  onCellVerticalNavigation(event: Event, rowIndex: number, columnKey: string, direction: -1 | 1): void {
    if (this.readonly) {
      return;
    }

    const targetRowIndex = rowIndex + direction;
    if (targetRowIndex < 0 || targetRowIndex >= this.rowsArray.length) {
      return;
    }

    const keyboardEvent = event as KeyboardEvent;
    keyboardEvent.preventDefault();
    this.focusCellControl(targetRowIndex, columnKey);
  }

  getColumnWidth(column: BulkGridColumn): string {
    return column.width || '12rem';
  }

  isColumnReadonly(column: BulkGridColumn): boolean {
    return this.readonly || !!column.readonly;
  }

  toggleOptionalColumns(): void {
    if (!this.hasOptionalColumns()) {
      return;
    }

    this.showOptionalColumns.update((value) => !value);
    this.buildRows(this.rowCache);
  }

  toggleAdvancedColumns(): void {
    if (!this.hasAdvancedColumns()) {
      return;
    }

    this.showAdvancedColumns.update((value) => !value);
    this.buildRows(this.rowCache);
  }

  isFrozen(index: number): boolean {
    return index < Math.max(this.frozenColumnCount, 0);
  }

  getStickyLeft(columnIndex: number): string {
    if (!this.isFrozen(columnIndex)) {
      return '0';
    }

    if (columnIndex === 0) {
      return '0';
    }

    const widthParts = this.visibleColumns()
      .slice(0, columnIndex)
      .map((column) => this.getColumnWidth(column));

    return `calc(${widthParts.join(' + ')})`;
  }

  trackColumn(_index: number, column: BulkGridColumn): string {
    return column.key;
  }

  private buildRows(rows: BulkGridRow[]): void {
    this.rowsArray.clear({ emitEvent: false });
    this.rowCache = rows.map((row) => ({ ...row }));
    this.clearRowSelection();

    if (!rows.length) {
      this.rowsArray.updateValueAndValidity({ emitEvent: false });
      this.syncRowCount();
      this.emitState();
      return;
    }

    rows.slice(0, this.maxRows).forEach((row) => {
      this.rowsArray.push(this.createRowGroup(row), { emitEvent: false });
    });

    this.rowsArray.updateValueAndValidity({ emitEvent: false });
    this.syncRowCount();
    this.emitState();
  }

  private createRowGroup(seed?: BulkGridRow): FormGroup {
    const controls: Record<string, FormControl> = {};

    this.visibleColumns().forEach((column) => {
      const validators = [];
      if (column.required) {
        validators.push(Validators.required);
      }
      if (column.type === 'number') {
        if (typeof column.min === 'number') {
          validators.push(Validators.min(column.min));
        }
        if (typeof column.max === 'number') {
          validators.push(Validators.max(column.max));
        }
      }

      const seedValue = seed?.[column.key] ?? (column.type === 'boolean' ? true : null);
      const control = this.fb.control(seedValue, validators);
      if (this.readonly || column.readonly) {
        control.disable({ emitEvent: false });
      }
      controls[column.key] = control;
    });

    return this.fb.group(controls);
  }

  private appendRow(seed?: BulkGridRow): void {
    this.rowCache.push(seed ? { ...seed } : {});
    this.rowsArray.push(this.createRowGroup(seed), { emitEvent: false });
  }

  private focusCellControl(rowIndex: number, columnKey: string): void {
    const selector = `[data-row-index="${rowIndex}"][data-column-key="${columnKey}"]`;
    const cell = this.hostElement.nativeElement.querySelector(selector) as HTMLElement | null;
    if (!cell) {
      return;
    }

    const focusable = cell.querySelector('input, select, textarea, button, [tabindex]:not([tabindex="-1"])') as HTMLElement | null;
    focusable?.focus();
  }

  private resolveRequestedRowCount(requestedCount?: number | string): number {
    if (!this.enableBulkAddInput) {
      return 1;
    }

    if (requestedCount === undefined || requestedCount === null || requestedCount === '') {
      return this.normalizeRequestedRowCount(this.bulkAddCountControl.value);
    }

    return this.normalizeRequestedRowCount(requestedCount);
  }

  private normalizeRequestedRowCount(value: number | string): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return 1;
    }

    return Math.max(1, Math.floor(parsed));
  }

  private shouldValidateRow(row: FormGroup): boolean {
    if (row.dirty || row.touched) {
      return true;
    }

    return Object.values(row.controls).some((control) => this.hasMeaningfulValue(control.value));
  }

  private hasMeaningfulValue(value: unknown): boolean {
    if (value === null || value === undefined) {
      return false;
    }

    if (typeof value === 'string') {
      return value.trim().length > 0;
    }

    if (typeof value === 'number') {
      return Number.isFinite(value) && value !== 0;
    }

    return false;
  }

  private emitState(): void {
    const rows = this.getRows().map((row, index) => {
      const cachedRow = this.rowCache[index];
      if (cachedRow) {
        return {
          ...cachedRow,
          ...row,
        };
      }

      return row;
    });
    this.rowCache = rows;
    const errorCount = this.rowsArray.controls.reduce((sum, row) => {
      if (!this.shouldValidateRow(row)) {
        return sum;
      }

      const rowErrors = Object.values(row.controls).filter((control) => control.invalid).length;
      return sum + rowErrors;
    }, 0);

    this.rowsChange.emit(rows);
    this.validationChange.emit({ valid: errorCount === 0, errorCount });
  }

  private syncRowCount(): void {
    this.rowCount.set(this.rowsArray.length);
  }

  private applyModeDefaults(): void {
    if (!this.enableColumnPresets) {
      this.showOptionalColumns.set(false);
      this.showAdvancedColumns.set(false);
      return;
    }

    const showColumns = this.mode === 'update';
    this.showOptionalColumns.set(showColumns);
    this.showAdvancedColumns.set(showColumns);
  }

  /**
   * Get the list of failed field names for a specific row.
   * Used to display validation error indicator with tooltip.
   */
  getRowErrorFields(rowIndex: number): string[] {
    const rowControl = this.rowsArray.controls[rowIndex];
    if (!rowControl || !this.shouldValidateRow(rowControl)) {
      return [];
    }

    return Object.entries(rowControl.controls)
      .filter(([, control]) => control.invalid)
      .map(([key]) => {
        const column = this.columns.find((c) => c.key === key);
        return column ? column.label : key;
      });
  }

  /**
   * Check if a row has any validation errors.
   */
  rowHasErrors(rowIndex: number): boolean {
    const rowControl = this.rowsArray.controls[rowIndex];
    if (!rowControl) {
      return false;
    }

    if (!this.shouldValidateRow(rowControl)) {
      return false;
    }

    return Object.values(rowControl.controls).some((control) => control.invalid);
  }

  private clearRowSelection(): void {
    this.selectedRowIndices.set(new Set());
    this.emitSelectedRows();
  }

  private emitSelectedRows(): void {
    const selected = [...this.selectedRowIndices()].sort((a, b) => a - b);
    this.selectedRowsChange.emit(selected);
  }
}
