import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { GomButtonComponent, GomModalComponent, GomTableColumn, GomTableComponent, GomTableRow } from '@gomlibs/ui';

import { SimplePricingBulkResults } from '../simple-pricing-bulk-upload.service';

@Component({
  selector: 'gom-simple-pricing-upload-feedback-modal',
  standalone: true,
  imports: [CommonModule, GomModalComponent, GomButtonComponent, GomTableComponent],
  templateUrl: './simple-pricing-upload-feedback-modal.component.html',
  styleUrls: ['./simple-pricing-upload-feedback-modal.component.scss'],
})
export class SimplePricingUploadFeedbackModalComponent {
  @Input({ required: true }) loading = false;
  @Input() results: SimplePricingBulkResults | null = null;
  @Input() showRowActions = true;
  @Input() showAcknowledge = true;

  @Output() closed = new EventEmitter<void>();
  @Output() closeRow = new EventEmitter<string>();
  @Output() acknowledgeAll = new EventEmitter<void>();

  get failedColumns(): GomTableColumn[] {
    const columns: GomTableColumn[] = [
      { key: 'rowNumber', header: 'Row', sortable: true, width: '84px' },
      { key: 'item', header: 'Item', sortable: true },
      { key: 'entityType', header: 'Type', sortable: true, width: '100px' },
      { key: 'reasonSummary', header: 'Reason', sortable: false },
    ];

    if (this.showRowActions) {
      columns.push({
        key: 'actions',
        header: 'Actions',
        width: '120px',
        actionButtons: [
          { actionKey: 'close', label: () => 'Dismiss', icon: 'ri-close-line', variant: 'secondary' },
        ],
      });
    }

    return columns;
  }

  readonly successColumns: GomTableColumn[] = [
    { key: 'rowNumber', header: 'Row', sortable: true, width: '84px' },
    { key: 'item', header: 'Item', sortable: true },
    { key: 'entityType', header: 'Type', sortable: true, width: '100px' },
    { key: 'updatedFields', header: 'Updated Fields', sortable: false },
  ];

  failedRows(): GomTableRow[] {
    return (this.results?.failedRows || []).map((row) => ({
      rowId: row.rowId,
      rowNumber: row.rowNumber,
      item: row.item,
      entityType: row.entityType,
      reasonSummary: (row.reasons || []).map((reason) => reason.message).join(' | '),
    }));
  }

  successRows(): GomTableRow[] {
    return (this.results?.successRows || []).map((row) => ({
      rowNumber: row.rowNumber,
      item: row.item,
      entityType: row.entityType,
      updatedFields: Object.keys(row.updates || {}).join(', '),
    }));
  }

  onFailedRowAction(event: { actionKey: string; row: GomTableRow }): void {
    const rowIdValue = event.row['rowId'];
    const rowId = typeof rowIdValue === 'string' ? rowIdValue : '';
    if (!rowId) return;

    if (event.actionKey === 'close') {
      this.closeRow.emit(rowId);
    }
  }
}
