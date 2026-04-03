import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

interface NavItem {
  label: string;
  route: string;
  section: 'Master Setup' | 'Product Setup';
}

@Component({
  selector: 'gom-shell',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './gom-shell.component.html',
  styleUrl: './gom-shell.component.scss',
})
export class GomShellComponent {
  readonly menuOpen = signal(false);

  readonly navItems: NavItem[] = [
    { label: 'Categories', route: '/masters/categories', section: 'Master Setup' },
    { label: 'Fields', route: '/masters/fields', section: 'Master Setup' },
    { label: 'Field Groups', route: '/masters/field-groups', section: 'Master Setup' },
    { label: 'Units', route: '/masters/units', section: 'Master Setup' },
    { label: 'Group Creation', route: '/product/groups', section: 'Product Setup' },
  ];

  readonly sections: Array<NavItem['section']> = ['Master Setup', 'Product Setup'];

  toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  navItemsBySection(section: NavItem['section']): NavItem[] {
    return this.navItems.filter((item) => item.section === section);
  }
}
