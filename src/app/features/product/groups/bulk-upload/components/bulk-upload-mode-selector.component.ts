import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

import { BulkGridMode } from '../../../../../shared/components/bulk-grid/bulk-grid.model';

/**
 * Mode Selection Component
 *
 * Allows user to choose between Create and Update modes for bulk upload.
 * Emits mode changes to parent component.
 *
 * Usage:
 * ```html
 * <app-bulk-upload-mode-selector
 *   (modeSelected)="onModeSelected($event)"
 * />
 * ```
 *
 * @component
 * @standalone true
 */
@Component({
  selector: 'app-bulk-upload-mode-selector',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './bulk-upload-mode-selector.component.html',
  styleUrl: './bulk-upload-mode-selector.component.scss',
})
export class BulkUploadModeSelectorComponent {
  readonly mode = input<BulkGridMode>('create');

  /**
   * Output event when mode is selected
   * Emits the selected mode (create or update)
   */
  readonly modeSelected = output<BulkGridMode>();

  /**
   * Handle mode selection
   * Emits new mode to parent
   */
  onModeSelect(mode: BulkGridMode): void {
    this.modeSelected.emit(mode);
  }

  /**
   * Check if mode option is selected
   */
  isModeSelected(mode: BulkGridMode): boolean {
    return this.mode() === mode;
  }
}
