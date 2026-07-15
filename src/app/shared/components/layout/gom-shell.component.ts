import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnDestroy, computed, inject, OnInit, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { Subscription, filter, interval, map, startWith } from 'rxjs';
import { GomAlertToastComponent, GomSelectComponent, GomSelectOption } from '@gomlibs/ui';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { AppLanguage, I18nService } from '../../../core/i18n/i18n.service';
import { AppCapability, UserActor } from '../../../core/auth/auth-session.model';
import { environment } from '../../../../environments/environment';
import { AdminNotification, AdminNotificationService } from './admin-notification.service';

interface NavItem {
  label: string;
  route: string;
  icon: string;
  translationKey: string;
  section: 'Master Setup' | 'Marketplace' | 'Product Setup' | 'Order Management' | 'Settings';
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
export class GomShellComponent implements OnInit, OnDestroy {
  private readonly i18n = inject(I18nService);
  private readonly router = inject(Router);
  private readonly authSession = inject(AuthSessionService);
  private readonly http = inject(HttpClient);
  private readonly adminNotifService = inject(AdminNotificationService);

  readonly menuOpen = signal(false);
  readonly desktopNavCollapsed = signal(false);
  readonly currentLanguage = signal<AppLanguage>(this.i18n.currentLanguage());
  readonly currentSession = this.authSession.session;
  readonly pendingPricingCount = signal(0);

  // Admin in-app notifications
  readonly notifPanelOpen = signal(false);
  readonly unreadNotifCount = signal(0);
  readonly notifications = signal<AdminNotification[]>([]);
  readonly notifLoading = signal(false);
  private pollSub?: Subscription;
  /** -1 = baseline not yet set; avoids beeping on first load */
  private _lastKnownUnreadCount = -1;
  private audioCtx: AudioContext | null = null;
  private audioPrimed = false;
  private readonly primeAudioHandler = () => {
    void this.primeAudioContext();
  };
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
    'Marketplace': true,
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
    { label: 'Category Templates', route: '/templates/browse', icon: 'ri-store-2-line', translationKey: 'app.navigation.categoryTemplates', section: 'Marketplace', actor: 'tenant', capability: 'masters' },
    { label: 'Group Creation', route: '/product/groups', icon: 'ri-folder-add-line', translationKey: 'app.navigation.groupCreation', section: 'Product Setup', actor: 'tenant', capability: 'product' },
    {
      label: 'Product Collections',
      route: '/product/product-collections',
      icon: 'ri-folder-3-line',
      translationKey: 'app.navigation.productCollections',
      section: 'Product Setup',
      actor: 'tenant',
      capability: 'product',
      featureKeys: ['productCollection.list'],
    },
    { label: 'Stock', route: '/product/stock', icon: 'ri-stock-line', translationKey: 'app.navigation.stock', section: 'Product Setup', actor: 'tenant', capability: 'product' },
    { label: 'Variants', route: '/product/variants', icon: 'ri-price-tag-3-line', translationKey: 'app.navigation.variants', section: 'Product Setup', actor: 'tenant', capability: 'product' },
    { label: 'Packs', route: '/product/packs', icon: 'ri-box-3-line', translationKey: 'app.navigation.packs', section: 'Product Setup', actor: 'tenant', capability: 'product' },
    { label: 'Media Library', route: '/product/media', icon: 'ri-image-line', translationKey: 'app.navigation.mediaLibrary', section: 'Product Setup', actor: 'tenant', capability: 'product', featureKeys: ['media.upload'] },
    { label: 'Orders', route: '/orders/list', icon: 'ri-file-list-3-line', translationKey: 'app.navigation.orders', section: 'Order Management', actor: 'tenant', capability: 'orders' },
    { label: 'Customers', route: '/customers/list', icon: 'ri-user-3-line', translationKey: 'app.navigation.customers', section: 'Order Management', actor: 'tenant', capability: 'customers' },
    { label: 'Customer Groups', route: '/customers/groups', icon: 'ri-team-line', translationKey: 'app.navigation.customerGroups', section: 'Order Management', actor: 'tenant', capability: 'customer-groups' },
    { label: 'Riders', route: '/delivery/riders', icon: 'ri-bike-line', translationKey: 'app.navigation.riders', section: 'Order Management', actor: 'tenant', capability: 'delivery' },
    { label: 'Courier Partners', route: '/delivery/courier-partners', icon: 'ri-truck-line', translationKey: 'app.navigation.courierPartners', section: 'Order Management', actor: 'tenant', capability: 'delivery' },
    { label: 'Employee Code', route: '/settings/employee-code', icon: 'ri-settings-3-line', translationKey: 'app.navigation.employeeCode', section: 'Settings', actor: 'tenant', capability: 'tenant-admin' },
    { label: 'Serviceable Pincodes', route: '/settings/serviceable-pincodes', icon: 'ri-map-pin-range-line', translationKey: 'app.navigation.serviceablePincodes', section: 'Settings', actor: 'tenant', capability: 'tenant-admin' },
    { label: 'Customer Storefront', route: '/settings/storefront', icon: 'ri-store-line', translationKey: 'app.navigation.storefrontConfig', section: 'Settings', actor: 'tenant', capability: 'tenant-admin' },
    { label: 'Return & Exchange Policy', route: '/settings/return-policy', icon: 'ri-arrow-go-back-line', translationKey: 'app.navigation.returnPolicy', section: 'Settings', actor: 'tenant', capability: 'tenant-admin' },
    { label: 'PIN Security Policy', route: '/settings/pin-security', icon: 'ri-lock-line', translationKey: 'app.navigation.pinSecurityPolicy', section: 'Settings', actor: 'tenant', capability: 'tenant-admin' },
    { label: 'Push Notifications', route: '/settings/push-notifications', icon: 'ri-notification-3-line', translationKey: 'app.navigation.pushNotifications', section: 'Settings', actor: 'tenant', capability: 'tenant-admin', featureKeys: ['order.list', 'order.create', 'order.update'] },
    { label: 'Notification Settings', route: '/settings/notification-settings', icon: 'ri-mail-settings-line', translationKey: 'app.navigation.notificationSettings', section: 'Settings', actor: 'tenant', capability: 'tenant-admin' },
    { label: 'Notification Operations', route: '/settings/notification-ops', icon: 'ri-dashboard-3-line', translationKey: 'app.navigation.notificationOps', section: 'Settings', actor: 'tenant', capability: 'tenant-admin' },
    { label: 'SaaS Accounts', route: '/settings/saas-accounts', icon: 'ri-building-2-line', translationKey: 'app.navigation.saasAccounts', section: 'Settings', actor: 'platform', capability: 'platform-admin' },
    { label: 'SaaS Packages', route: '/settings/saas-packages', icon: 'ri-stack-line', translationKey: 'app.navigation.saasPackages', section: 'Settings', actor: 'platform', capability: 'platform-admin' },
    { label: 'Platform Users', route: '/settings/platform-users', icon: 'ri-user-settings-line', translationKey: 'app.navigation.platformUsers', section: 'Settings', actor: 'platform', capability: 'platform-admin' },
    { label: 'SaaS Features', route: '/settings/saas-features', icon: 'ri-function-line', translationKey: 'app.navigation.saasFeatures', section: 'Settings', actor: 'platform', capability: 'platform-admin' },
    { label: 'Tenant Entitlements', route: '/settings/tenant-entitlements', icon: 'ri-shield-keyhole-line', translationKey: 'app.navigation.tenantEntitlements', section: 'Settings', actor: 'platform', capability: 'platform-admin' },
    { label: 'Platform Tenant Roles', route: '/settings/tenant-roles', icon: 'ri-shield-user-line', translationKey: 'app.navigation.platformTenantRoles', section: 'Settings', actor: 'platform', capability: 'platform-admin' },
    { label: 'Platform Templates', route: '/settings/platform-templates', icon: 'ri-file-copy-2-line', translationKey: 'app.navigation.platformTemplates', section: 'Settings', actor: 'platform', capability: 'platform-admin' },
    { label: 'Business Templates', route: '/settings/business-templates', icon: 'ri-store-2-line', translationKey: 'app.navigation.businessTemplates', section: 'Settings', actor: 'platform', capability: 'platform-admin' },
    { label: 'Platform Media', route: '/settings/platform-media', icon: 'ri-image-line', translationKey: 'app.navigation.platformMedia', section: 'Settings', actor: 'platform', capability: 'platform-admin' },
    { label: 'Tenant Dashboard', route: '/saas-admin/dashboard', icon: 'ri-dashboard-line', translationKey: 'app.navigation.tenantDashboard', section: 'Settings', actor: 'tenant', capability: 'tenant-admin' },
    { label: 'Tenant Users', route: '/saas-admin/users', icon: 'ri-user-settings-line', translationKey: 'app.navigation.tenantUsers', section: 'Settings', actor: 'tenant', capability: 'tenant-admin' },
    { label: 'Offers', route: '/saas-admin/offers', icon: 'ri-coupon-2-line', translationKey: 'gom.offers.title', section: 'Settings', actor: 'tenant', capability: 'tenant-admin' },
    { label: 'Tenant Employees', route: '/saas-admin/employees', icon: 'ri-id-card-line', translationKey: 'app.navigation.tenantEmployees', section: 'Settings', actor: 'tenant', capability: 'tenant-admin', featureKeys: ['rider.list', 'rider.create', 'rider.update', 'rider.delete'] },
    { label: 'Tenant Roles', route: '/saas-admin/roles', icon: 'ri-shield-check-line', translationKey: 'app.navigation.tenantRoles', section: 'Settings', actor: 'tenant', capability: 'tenant-admin' },
  ];

  readonly sections = computed<Array<NavItem['section']>>(() => {
    const visibleItems = this.visibleNavItems();
    const orderedSections: Array<NavItem['section']> = ['Master Setup', 'Marketplace', 'Product Setup', 'Order Management', 'Settings'];
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

  ngOnInit(): void {
    this.loadPendingPricingCount();

    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => this.loadPendingPricingCount());

    // Poll unread notification count every 30 seconds (tenant only)
    this.pollSub = interval(30_000)
      .pipe(startWith(0))
      .subscribe(() => this.refreshUnreadCount());

    // Prime browser audio permission on first interaction for reliable alert beeps.
    if (typeof window !== 'undefined') {
      window.addEventListener('pointerdown', this.primeAudioHandler, { once: true });
      window.addEventListener('keydown', this.primeAudioHandler, { once: true });
    }
  }

  ngOnDestroy(): void {
    this.pollSub?.unsubscribe();
    if (typeof window !== 'undefined') {
      window.removeEventListener('pointerdown', this.primeAudioHandler);
      window.removeEventListener('keydown', this.primeAudioHandler);
    }
    void this.audioCtx?.close();
    this.audioCtx = null;
  }

  private async primeAudioContext(): Promise<void> {
    try {
      const ctx = this.getOrCreateAudioContext();
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      this.audioPrimed = true;
    } catch {
      // Ignore browser autoplay-policy failures and retry on next interaction.
    }
  }

  private getOrCreateAudioContext(): AudioContext {
    this.audioCtx ??= new AudioContext();
    return this.audioCtx;
  }

  refreshUnreadCount(): void {
    const session = this.authSession.session();
    if (session?.actorType !== 'tenant') return;
    this.adminNotifService.getUnreadCount().subscribe((res) => {
      const newCount = res.data?.count ?? 0;
      const isFirstLoad = this._lastKnownUnreadCount === -1;
      if (!isFirstLoad && newCount > this._lastKnownUnreadCount) {
        this.playNewOrderAlert();
      }
      this._lastKnownUnreadCount = newCount;
      this.unreadNotifCount.set(newCount);
    });
  }

  /**
   * Plays a short double-beep using the Web Audio API.
   * No audio file needed — tones are synthesised in-browser.
   */
  private playNewOrderAlert(): void {
    if (!this.audioPrimed) {
      return;
    }
    try {
      const ctx = this.getOrCreateAudioContext();
      if (ctx.state === 'suspended') {
        return;
      }
      const playTone = (startTime: number, freq: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0.35, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        osc.start(startTime);
        osc.stop(startTime + duration);
      };
      playTone(ctx.currentTime, 880, 0.18);         // first beep  (A5)
      playTone(ctx.currentTime + 0.22, 1046, 0.18); // second beep (C6)
    } catch {
      // Web Audio not available — fail silently
    }
  }

  toggleNotifPanel(): void {
    void this.primeAudioContext();
    if (!this.notifPanelOpen()) {
      this.openNotifPanel();
    } else {
      this.notifPanelOpen.set(false);
    }
  }

  openNotifPanel(): void {
    this.notifPanelOpen.set(true);
    this.notifLoading.set(true);
    this.adminNotifService.listNotifications(1, 20).subscribe((res) => {
      this.notifications.set(res.data ?? []);
      this.notifLoading.set(false);
    });
  }

  closeNotifPanel(): void {
    this.notifPanelOpen.set(false);
  }

  markNotifRead(notif: AdminNotification): void {
    if (notif.readAt) return;
    this.adminNotifService.markAsRead(notif._id).subscribe(() => {
      this.notifications.update((list) =>
        list.map((n) => (n._id === notif._id ? { ...n, readAt: new Date().toISOString() } : n)),
      );
      this.unreadNotifCount.update((c) => Math.max(0, c - 1));
    });
    if (notif.route) {
      void this.router.navigateByUrl(notif.route);
      this.notifPanelOpen.set(false);
    }
  }

  markAllNotifsRead(): void {
    this.adminNotifService.markAllAsRead().subscribe(() => {
      this.notifications.update((list) =>
        list.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })),
      );
      this.unreadNotifCount.set(0);
    });
  }

  loadPendingPricingCount(): void {
    const session = this.authSession.session();
    if (session?.actorType !== 'tenant') return;
    const headers = this.authSession.getTenantHeaders();
    this.http
      .get<{ success: boolean; data: { totalPending: number; groups: Array<{ groupId: string; pendingCount: number }> } }>(
        `${environment.apiBaseUrl}/groups/pricing-refresh-suggestions/pending-groups`,
        { headers }
      )
      .subscribe({
        next: (res) => this.pendingPricingCount.set(Array.isArray(res?.data?.groups) ? res.data.groups.length : 0),
        error: () => this.pendingPricingCount.set(0),
      });
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

    if (section === 'Marketplace') {
      return 'app.navigation.marketplace';
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
