import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

import { GomChipTone } from '../table/gom-table.models';

@Component({
  selector: 'gom-lib-chip',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './gom-chip.component.html',
  styleUrl: './gom-chip.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GomChipComponent {
  @Input() tone: GomChipTone = 'neutral';
}
