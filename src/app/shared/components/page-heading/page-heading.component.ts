import { CommonModule } from '@angular/common';
import { Component, Input, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { getNavIconForPath, getNavItemForPath } from '../layout/nav.config';

@Component({
  selector: 'gom-page-heading',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './page-heading.component.html',
  styleUrl: './page-heading.component.scss',
})
export class PageHeadingComponent {
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);

  @Input() title = '';
  @Input() iconClass = '';
  @Input() navRoute: string | null = null;
  @Input() headingId: string | null = null;

  get resolvedTitle(): string {
    if (this.title) {
      return this.title;
    }

    const route = this.navRoute || this.router.url;
    const navItem = getNavItemForPath(route);
    if (!navItem) {
      return '';
    }

    const translated = this.translate.instant(navItem.translationKey);
    if (translated && translated !== navItem.translationKey) {
      return translated;
    }

    return navItem.label;
  }

  get resolvedIconClass(): string {
    if (this.iconClass) {
      return this.iconClass;
    }

    const route = this.navRoute || this.router.url;
    return getNavIconForPath(route, '');
  }
}
