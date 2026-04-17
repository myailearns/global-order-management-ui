import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GomAlertToastService } from './gom-alert-toast.service';

@Component({
  selector: 'gom-lib-alert-toast',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './gom-alert-toast.component.html',
  styleUrl: './gom-alert-toast.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GomAlertToastComponent {
  readonly toastService = inject(GomAlertToastService);

  dismiss(): void {
    this.toastService.dismiss();
  }
}
