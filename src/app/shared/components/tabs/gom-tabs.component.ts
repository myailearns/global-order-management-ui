import { Component, ChangeDetectionStrategy, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

export interface TabItem {
  id: string | number;
  label: string;
  disabled?: boolean;
}

@Component({
  selector: 'gom-lib-tabs',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './gom-tabs.component.html',
  styleUrl: './gom-tabs.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'gom-tabs',
  },
})
export class GomTabsComponent {
  /**
   * Array of tab items to display
   */
  tabs = input<TabItem[]>([]);

  /**
   * The currently active tab ID
   */
  activeTab = input<string | number>();

  /**
   * Emits when a tab is clicked
   */
  tabChange = output<string | number>();

  /**
   * Get available tabs (non-disabled)
   */
  availableTabs = computed(() => {
    return this.tabs().filter(tab => !tab.disabled);
  });

  /**
   * Handle tab click
   */
  selectTab(tabId: string | number): void {
    this.tabChange.emit(tabId);
  }
}
