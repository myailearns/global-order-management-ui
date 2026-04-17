import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { filter, map, startWith } from 'rxjs';
import { GomAlertToastComponent } from '../alert';
import { GomSelectComponent, GomSelectOption } from '../form-controls';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { AppLanguage, I18nService } from '../../../core/i18n/i18n.service';
import { AppCapability, UserActor } from '../../../core/auth/auth-session.model';

interface NavItem {
  label: string;
  route: string;
  icon: string;
  translationKey: string;
  section: 'Master Setup' | 'Product Setup' | 'Order Management' | 'Settings';
  actor: UserActor;
  capability?: AppCapability;
  /** If provided, the nav item is shown only when session has at least one of these feature keys. */
  featureKeys?: string[];
}

@Component({
  selector: 'gom-lib-shell',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    TranslateModule,
    GomAlertToastComponent,
    GomSelectComponent,
  ],
  templateUrl: './gom-shell.component.html',
  styleUrl: './gom-shell.component.scss',
})
export class GomShellComponent {
  private readonly i18n = inject(I18nService);
  private readonly router = inject(Router);
  private readonly authSession = inject(AuthSessionService);

  readonly menuOpen = signal(false);
  readonly desktopNavCollapsed = signal(false);
  readonly currentLanguage = signal<AppLanguage>(this.i18n.currentLanguage());
  readonly currentSession = this.authSession.session;
  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map(() => this.router.url),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );
  readonly isAuthRoute = computed(() => this.currentUrl().startsWith('/auth'));
  readonly languageOptions: Array<{ value: AppLanguage; labelKey: string }> = [
    { value: 'en', labelKey: 'app.language.english' },
    { value: 'te', labelKey: 'app.language.telugu' },
    { value: 'hi', labelKey: 'app.language.hindi' },
  ];
  readonly expandedSections = signal<Record<NavItem['section'], boolean>>({
    'Master Setup': true,
    'Product Setup': true,
    'Order Management': true,
    'Settings': true,
  });

  readonly navItems: NavItem[] = [
    { label: 'Categories', route: '/masters/categories', icon: 'ri-price-tag-3-line', translationKey: 'app.navigation.categories', section: 'Master Setup', actor: 'tenant', capability: 'masters', featureKeys: ['category.list', 'category.create', 'category.edit', 'category.delete'] },
    { label: 'Fields', route: '/masters/fields', icon: 'ri-layout-grid-line', translationKey: 'app.navigation.fields', section: 'Master Setup', actor: 'tenant', capability: 'masters', featureKeys: ['field.list', 'field.create', 'field.edit', 'field.delete'] },
    { label: 'Field Groups', route: '/masters/field-groups', icon: 'ri-folders-line', translationKey: 'app.navigation.fieldGroups', section: 'Master Setup', actor: 'tenant', capability: 'masters', featureKeys: ['fieldGroup.list', 'fieldGroup.create', 'fieldGroup.edit', 'fieldGroup.delete'] },
    { label: 'Units', route: '/masters/units', icon: 'ri-scales-3-line', translationKey: 'app.navigation.units', section: 'Master Setup', actor: 'tenant', capability: 'masters', featureKeys: ['unit.list', 'unit.create', 'unit.edit', 'unit.delete'] },
    { label: 'Tax Profiles', route: '/masters/tax-profiles', icon: 'ri-percent-line', translationKey: 'app.navigation.taxProfiles', section: 'Master Setup', actor: 'tenant', capability: 'masters', featureKeys: ['taxProfile.list', 'taxProfile.create', 'taxProfile.edit'] },
    { label: 'Group Creation', route: '/product/groups', icon: 'ri-folder-add-line', translationKey: 'app.navigation.groupCreation', section: 'Product Setup', actor: 'tenant', capability: 'product' },
    { label: 'Stock', route: '/product/stock', icon: 'ri-stock-line', translationKey: 'app.navigation.stock', section: 'Product Setup', actor: 'tenant', capability: 'product' },
    { label: 'Variants', route: '/product/variants', icon: 'ri-price-tag-3-line', translationKey: 'app.navigation.variants', section: 'Product Setup', actor: 'tenant', capability: 'product' },
    { label: 'Packs', route: '/product/packs', icon: 'ri-box-3-line', translationKey: 'app.navigation.packs', section: 'Product Setup', actor: 'tenant', capability: 'product' },
    { label: 'Orders', route: '/orders/list', icon: 'ri-file-list-3-line', translationKey: 'app.navigation.orders', section: 'Order Management', actor: 'tenant', capability: 'orders' },
    { label: 'Customers', route: '/customers/list', icon: 'ri-user-3-line', translationKey: 'app.navigation.customers', section: 'Order Management', actor: 'tenant', capability: 'customers' },
    { label: 'Customer Groups', route: '/customers/groups', icon: 'ri-team-line', translationKey: 'app.navigation.customerGroups', section: 'Order Management', actor: 'tenant', capability: 'customer-groups' },
    { label: 'Riders', route: '/delivery/riders', icon: 'ri-bike-line', translationKey: 'app.navigation.riders', section: 'Order Management', actor: 'tenant', capability: 'delivery' },
    { label: 'Courier Partners', route: '/delivery/courier-partners', icon: 'ri-truck-line', translationKey: 'app.navigation.courierPartners', section: 'Order Management', actor: 'tenant', capability: 'delivery' },
    { label: 'Employee Code', route: '/settings/employee-code', icon: 'ri-settings-3-line', translationKey: 'app.navigation.employeeCode', section: 'Settings', actor: 'tenant', capability: 'settings-core' },
    { label: 'Serviceable Pincodes', route: '/settings/serviceable-pincodes', icon: 'ri-map-pin-range-line', translationKey: 'app.navigation.serviceablePincodes', section: 'Settings', actor: 'tenant', capability: 'settings-core' },
    { label: 'SaaS Accounts', route: '/settings/saas-accounts', icon: 'ri-building-2-line', translationKey: 'app.navigation.saasAccounts', section: 'Settings', actor: 'platform', capability: 'platform-admin' },
    { label: 'SaaS Packages', route: '/settings/saas-packages', icon: 'ri-stack-line', translationKey: 'app.navigation.saasPackages', section: 'Settings', actor: 'platform', capability: 'platform-admin' },
    { label: 'SaaS Features', route: '/settings/saas-features', icon: 'ri-function-line', translationKey: 'app.navigation.saasFeatures', section: 'Settings', actor: 'platform', capability: 'platform-admin' },
    { label: 'Tenant Entitlements', route: '/settings/tenant-entitlements', icon: 'ri-shield-keyhole-line', translationKey: 'app.navigation.tenantEntitlements', section: 'Settings', actor: 'platform', capability: 'platform-admin' },
    { label: 'Platform Tenant Roles', route: '/settings/tenant-roles', icon: 'ri-shield-user-line', translationKey: 'app.navigation.platformTenantRoles', section: 'Settings', actor: 'platform', capability: 'platform-admin' },
    { label: 'Tenant Dashboard', route: '/saas-admin/dashboard', icon: 'ri-dashboard-line', translationKey: 'app.navigation.tenantDashboard', section: 'Settings', actor: 'tenant', capability: 'tenant-admin' },
    { label: 'Tenant Users', route: '/saas-admin/users', icon: 'ri-user-settings-line', translationKey: 'app.navigation.tenantUsers', section: 'Settings', actor: 'tenant', capability: 'tenant-admin' },
    { label: 'Tenant Employees', route: '/saas-admin/employees', icon: 'ri-id-card-line', translationKey: 'app.navigation.tenantEmployees', section: 'Settings', actor: 'tenant', capability: 'tenant-admin' },
    { label: 'Tenant Roles', route: '/saas-admin/roles', icon: 'ri-shield-check-line', translationKey: 'app.navigation.tenantRoles', section: 'Settings', actor: 'tenant', capability: 'tenant-admin' },
  ];

  readonly sections = computed<Array<NavItem['section']>>(() => {
    const visibleItems = this.visibleNavItems();
    const orderedSections: Array<NavItem['section']> = ['Master Setup', 'Product Setup', 'Order Management', 'Settings'];
    return orderedSections.filter((section) => visibleItems.some((item) => item.section === section));
  });

  readonly visibleNavItems = computed(() => {
    const session = this.currentSession();
    if (!session) {
      return [];
    }

    return this.navItems.filter((item) => {
      if (item.actor !== session.actorType) {
        return false;
      }

      if (item.capability && !session.capabilities.includes(item.capability)) {
        return false;
      }

      // For tenant actors: if nav item declares featureKeys, require at least one to be present.
      if (item.featureKeys?.length && session.actorType === 'tenant') {
        const sessionKeys = new Set(
          Array.isArray(session.featureKeys)
            ? session.featureKeys.map((k) => String(k || '').trim().toLowerCase()).filter(Boolean)
            : [],
        );
        return item.featureKeys.some((k) => sessionKeys.has(k.toLowerCase()));
      }

      return true;
    });
  });

  get languageSelectOptions(): GomSelectOption[] {
    return this.languageOptions.map((option) => ({
      value: option.value,
      label: this.i18n.instant(option.labelKey),
    }));
  }

  toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  toggleDesktopNav(): void {
    this.desktopNavCollapsed.update((collapsed) => !collapsed);
  }

  toggleSection(section: NavItem['section']): void {
    this.expandedSections.update((current) => ({
      ...current,
      [section]: !current[section],
    }));
  }

  isSectionExpanded(section: NavItem['section']): boolean {
    return this.expandedSections()[section];
  }

  navItemsBySection(section: NavItem['section']): NavItem[] {
    return this.visibleNavItems().filter((item) => item.section === section);
  }

  getSectionTranslationKey(section: NavItem['section']): string {
    if (section === 'Master Setup') {
      return 'app.navigation.masterSetup';
    }

    if (section === 'Product Setup') {
      return 'app.navigation.productSetup';
    }

    if (section === 'Settings') {
      return 'app.navigation.settings';
    }

    return 'app.navigation.orderManagement';
  }

  changeLanguage(lang: string): void {
    if (lang !== 'en' && lang !== 'te' && lang !== 'hi') {
      return;
    }

    this.i18n.useLanguage(lang);
    this.currentLanguage.set(lang);
  }

  logout(): void {
    this.authSession.logout();
    this.closeMenu();
    void this.router.navigateByUrl('/auth', { replaceUrl: true });
  }
}
