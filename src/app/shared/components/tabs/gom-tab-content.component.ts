import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'gom-lib-tab-content',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="gom-tab-content" *ngIf="tabId() === activeTab()">
      <ng-content></ng-content>
    </div>
  `,
  styles: [`
    .gom-tab-content {
      animation: fadeIn 0.2s ease;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(-4px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GomTabContentComponent {
  /**
   * The tab ID this content belongs to
   */
  tabId = input<string | number>();

  /**
   * The currently active tab ID
   */
  activeTab = input<string | number>();
}
