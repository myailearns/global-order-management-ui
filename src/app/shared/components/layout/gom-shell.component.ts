import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, HostListener, OnDestroy, computed, inject, OnInit, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { Subscription, filter, firstValueFrom, interval, map, startWith } from 'rxjs';
import {
  GomAlertToastComponent,
  GomAlertToastService,
  GomButtonComponent,
  GomConfirmationModalComponent,
  GomInputComponent,
  GomModalComponent,
  GomSelectComponent,
  GomSelectOption,
} from '@gomlibs/ui';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { AppLanguage, I18nService } from '../../../core/i18n/i18n.service';
import { AppCapability, UserActor } from '../../../core/auth/auth-session.model';
import { environment } from '../../../../environments/environment';
import { AdminNotification, AdminNotificationService } from './admin-notification.service';
import { HeaderSearchService } from './header-search.service';
import { OrdersService } from '../../../features/order/orders/orders.service';
import { CreateOrderCatalogCacheService } from '../../../features/order/new-care-order/create-order-catalog-cache.service';

interface NavItem {
  label: string;
  route: string;
  icon: string;
  translationKey: string;
  section: 'Master Setup' | 'Marketplace' | 'Product Setup' | 'Order Management' | 'Staff Management' | 'Admin App' | 'Settings';
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
    GomButtonComponent,
    GomConfirmationModalComponent,
    GomInputComponent,
    GomModalComponent,
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
  private readonly headerSearch = inject(HeaderSearchService);
  private readonly ordersService = inject(OrdersService);
  private readonly catalogCache = inject(CreateOrderCatalogCacheService);
  private readonly toast = inject(GomAlertToastService);

  readonly menuOpen = signal(false);
  readonly desktopNavCollapsed = signal(false);
  readonly currentLanguage = signal<AppLanguage>(this.i18n.currentLanguage());
  readonly currentSession = this.authSession.session;
  readonly pendingPricingCount = signal(0);
  readonly clearLocalCatalogConfirmOpen = signal(false);
  readonly clearingLocalCatalog = signal(false);
  readonly catalogSyncModalOpen = signal(false);
  readonly catalogStorageEnabled = this.catalogCache.activeEnabled;
  readonly catalogLastUpdated = this.catalogCache.activeLastUpdated;
  readonly catalogRefreshing = this.catalogCache.activeRefreshing;

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
  readonly showTopbarSearch = computed(() => this.headerSearch.activeContext() === 'orders-create');
  readonly isCreateOrderRoute = computed(() => {
    const url = this.currentUrl();
    return url.startsWith('/orders/create') || url.startsWith('/orders/new-care-order');
  });
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
    'Staff Management': true,
    'Admin App': true,
    'Settings': true,
  });

  readonly navItems: NavItem[] = [
    { label: 'Categories', route: '/masters/categories', icon: 'ri-price-tag-3-line', translationKey: 'app.navigation.categories', section: 'Master Setup', actor: 'tenant', capability: 'masters', featureKeys: ['category.list', 'category.create', 'category.edit', 'category.delete'] },
    { label: 'Fields', route: '/masters/fields', icon: 'ri-layout-grid-line', translationKey: 'app.navigation.fields', section: 'Master Setup', actor: 'tenant', capability: 'masters', featureKeys: ['field.list', 'field.create', 'field.edit', 'field.delete'] },
    { label: 'Field Groups', route: '/masters/field-groups', icon: 'ri-folders-line', translationKey: 'app.navigation.fieldGroups', section: 'Master Setup', actor: 'tenant', capability: 'masters', featureKeys: ['fieldGroup.list', 'fieldGroup.create', 'fieldGroup.edit', 'fieldGroup.delete'] },
    { label: 'Attributes', route: '/masters/attributes', icon: 'ri-price-tag-3-line', translationKey: 'app.navigation.attributes', section: 'Master Setup', actor: 'tenant', capability: 'masters', featureKeys: ['attribute.list', 'attribute.create', 'attribute.edit', 'attribute.delete'] },
    { label: 'Attribute Sets', route: '/masters/attribute-sets', icon: 'ri-shape-line', translationKey: 'app.navigation.attributeSets', section: 'Master Setup', actor: 'tenant', capability: 'masters', featureKeys: ['attributeSet.list', 'attributeSet.create', 'attributeSet.edit', 'attributeSet.delete'] },
    { label: 'Pricing Templates', route: '/masters/pricing-templates', icon: 'ri-money-dollar-circle-line', translationKey: 'app.navigation.pricingTemplates', section: 'Master Setup', actor: 'tenant', capability: 'masters', featureKeys: ['pricingTemplate.list', 'pricingTemplate.create', 'pricingTemplate.edit', 'pricingTemplate.delete'] },
    { label: 'Units', route: '/masters/units', icon: 'ri-scales-3-line', translationKey: 'app.navigation.units', section: 'Master Setup', actor: 'tenant', capability: 'masters', featureKeys: ['unit.list', 'unit.create', 'unit.edit', 'unit.delete'] },
    { label: 'Tax Profiles', route: '/masters/tax-profiles', icon: 'ri-percent-line', translationKey: 'app.navigation.taxProfiles', section: 'Master Setup', actor: 'tenant', capability: 'masters', featureKeys: ['taxProfile.list', 'taxProfile.create', 'taxProfile.edit'] },
    { label: 'Category Templates', route: '/templates/browse', icon: 'ri-store-2-line', translationKey: 'app.navigation.categoryTemplates', section: 'Marketplace', actor: 'tenant', capability: 'masters', featureKeys: ['template.browse'] },
    { label: 'Group Creation', route: '/product/groups', icon: 'ri-folder-add-line', translationKey: 'app.navigation.groupCreation', section: 'Product Setup', actor: 'tenant', capability: 'product', featureKeys: ['group.list'] },
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
    { label: 'Stock', route: '/product/stock', icon: 'ri-stock-line', translationKey: 'app.navigation.stock', section: 'Product Setup', actor: 'tenant', capability: 'product', featureKeys: ['stock.list'] },
    { label: 'Variants', route: '/product/variants', icon: 'ri-price-tag-3-line', translationKey: 'app.navigation.variants', section: 'Product Setup', actor: 'tenant', capability: 'product', featureKeys: ['variant.list'] },
    { label: 'Packs', route: '/product/packs', icon: 'ri-box-3-line', translationKey: 'app.navigation.packs', section: 'Product Setup', actor: 'tenant', capability: 'product', featureKeys: ['pack.list'] },
    { label: 'Simple Pricing', route: '/pricing/simple', icon: 'ri-money-rupee-circle-line', translationKey: 'app.navigation.simplePricing', section: 'Product Setup', actor: 'tenant', capability: 'product', featureKeys: ['variant.list'] },
    { label: 'Media Library', route: '/product/media', icon: 'ri-image-line', translationKey: 'app.navigation.mediaLibrary', section: 'Product Setup', actor: 'tenant', capability: 'product', featureKeys: ['media.list'] },
    { label: 'Orders', route: '/orders/list', icon: 'ri-file-list-3-line', translationKey: 'app.navigation.orders', section: 'Order Management', actor: 'tenant', capability: 'orders', featureKeys: ['order.list'] },
    { label: 'Customers', route: '/customers/list', icon: 'ri-user-3-line', translationKey: 'app.navigation.customers', section: 'Order Management', actor: 'tenant', capability: 'customers', featureKeys: ['customer.list'] },
    { label: 'Customer Groups', route: '/customers/groups', icon: 'ri-team-line', translationKey: 'app.navigation.customerGroups', section: 'Order Management', actor: 'tenant', capability: 'customer-groups', featureKeys: ['customerGroup.list'] },
    { label: 'Riders', route: '/delivery/riders', icon: 'ri-bike-line', translationKey: 'app.navigation.riders', section: 'Order Management', actor: 'tenant', capability: 'delivery', featureKeys: ['rider.list'] },
    { label: 'Courier Partners', route: '/delivery/courier-partners', icon: 'ri-truck-line', translationKey: 'app.navigation.courierPartners', section: 'Order Management', actor: 'tenant', capability: 'delivery', featureKeys: ['courierPartner.list'] },
    { label: 'Employee Code', route: '/settings/employee-code', icon: 'ri-settings-3-line', translationKey: 'app.navigation.employeeCode', section: 'Settings', actor: 'tenant', capability: 'tenant-admin', featureKeys: ['employeeCode.view', 'employeeCode.config'] },
    { label: 'Serviceable Pincodes', route: '/settings/serviceable-pincodes', icon: 'ri-map-pin-range-line', translationKey: 'app.navigation.serviceablePincodes', section: 'Settings', actor: 'tenant', capability: 'tenant-admin', featureKeys: ['pincode.config'] },
    { label: 'Customer Storefront', route: '/settings/storefront', icon: 'ri-store-line', translationKey: 'app.navigation.storefrontConfig', section: 'Settings', actor: 'tenant', capability: 'tenant-admin', featureKeys: ['storefront.config'] },
    { label: 'Delivery Management', route: '/settings/delivery-management', icon: 'ri-truck-line', translationKey: 'app.navigation.deliveryManagement', section: 'Settings', actor: 'tenant', capability: 'tenant-admin', featureKeys: ['delivery.management'] },
    { label: 'Return & Exchange Policy', route: '/settings/return-policy', icon: 'ri-arrow-go-back-line', translationKey: 'app.navigation.returnPolicy', section: 'Settings', actor: 'tenant', capability: 'tenant-admin', featureKeys: ['returnPolicy.config'] },
    { label: 'PIN Security Policy', route: '/settings/pin-security', icon: 'ri-lock-line', translationKey: 'app.navigation.pinSecurityPolicy', section: 'Settings', actor: 'tenant', capability: 'tenant-admin', featureKeys: ['security.config'] },
    { label: 'Push Notifications', route: '/settings/push-notifications', icon: 'ri-notification-3-line', translationKey: 'app.navigation.pushNotifications', section: 'Settings', actor: 'tenant', capability: 'tenant-admin', featureKeys: ['notification.broadcast'] },
    { label: 'Notification Settings', route: '/settings/notification-settings', icon: 'ri-mail-settings-line', translationKey: 'app.navigation.notificationSettings', section: 'Settings', actor: 'tenant', capability: 'tenant-admin', featureKeys: ['notification.manage'] },
    { label: 'Notification Operations', route: '/settings/notification-ops', icon: 'ri-dashboard-3-line', translationKey: 'app.navigation.notificationOps', section: 'Settings', actor: 'tenant', capability: 'tenant-admin', featureKeys: ['notification.manage'] },
    { label: 'SaaS Accounts', route: '/settings/saas-accounts', icon: 'ri-building-2-line', translationKey: 'app.navigation.saasAccounts', section: 'Settings', actor: 'platform', capability: 'platform-admin' },
    { label: 'SaaS Packages', route: '/settings/saas-packages', icon: 'ri-stack-line', translationKey: 'app.navigation.saasPackages', section: 'Settings', actor: 'platform', capability: 'platform-admin' },
    { label: 'Platform Users', route: '/settings/platform-users', icon: 'ri-user-settings-line', translationKey: 'app.navigation.platformUsers', section: 'Settings', actor: 'platform', capability: 'platform-admin' },
    { label: 'SaaS Features', route: '/settings/saas-features', icon: 'ri-function-line', translationKey: 'app.navigation.saasFeatures', section: 'Settings', actor: 'platform', capability: 'platform-admin' },
    { label: 'Tenant Entitlements', route: '/settings/tenant-entitlements', icon: 'ri-shield-keyhole-line', translationKey: 'app.navigation.tenantEntitlements', section: 'Settings', actor: 'platform', capability: 'platform-admin' },
    { label: 'Platform Tenant Roles', route: '/settings/tenant-roles', icon: 'ri-shield-user-line', translationKey: 'app.navigation.platformTenantRoles', section: 'Settings', actor: 'platform', capability: 'platform-admin' },
    { label: 'Platform Templates', route: '/settings/platform-templates', icon: 'ri-file-copy-2-line', translationKey: 'app.navigation.platformTemplates', section: 'Settings', actor: 'platform', capability: 'platform-admin' },
    { label: 'Business Templates', route: '/settings/business-templates', icon: 'ri-store-2-line', translationKey: 'app.navigation.businessTemplates', section: 'Settings', actor: 'platform', capability: 'platform-admin' },
    { label: 'Platform Media', route: '/settings/platform-media', icon: 'ri-image-line', translationKey: 'app.navigation.platformMedia', section: 'Settings', actor: 'platform', capability: 'platform-admin' },
    { label: 'Tenant Dashboard', route: '/saas-admin/dashboard', icon: 'ri-dashboard-line', translationKey: 'app.navigation.tenantDashboard', section: 'Settings', actor: 'tenant', capability: 'tenant-admin', featureKeys: ['dashboard.view'] },
    { label: 'Tenant Users', route: '/saas-admin/users', icon: 'ri-user-settings-line', translationKey: 'app.navigation.tenantUsers', section: 'Settings', actor: 'tenant', capability: 'tenant-admin', featureKeys: ['user.list'] },
    { label: 'Offers', route: '/saas-admin/offers', icon: 'ri-coupon-2-line', translationKey: 'gom.offers.title', section: 'Settings', actor: 'tenant', capability: 'tenant-admin', featureKeys: ['offer.list'] },
    { label: 'Accounts', route: '/saas-admin/employees', icon: 'ri-id-card-line', translationKey: 'app.navigation.tenantEmployees', section: 'Staff Management', actor: 'tenant', capability: 'tenant-admin', featureKeys: ['tenantAccount.view', 'tenantAccount.add', 'tenantAccount.edit', 'tenantAccount.delete'] },
    { label: 'Roles', route: '/saas-admin/roles', icon: 'ri-shield-check-line', translationKey: 'app.navigation.tenantRoles', section: 'Staff Management', actor: 'tenant', capability: 'tenant-admin', featureKeys: ['tenantRole.view', 'tenantRole.add', 'tenantRole.edit', 'tenantRole.delete'] },
    { label: 'Create Order Settings', route: '/admin-app/create-order-settings', icon: 'ri-settings-3-line', translationKey: 'app.navigation.createOrderSettings', section: 'Admin App', actor: 'tenant', capability: 'orders' },
    { label: 'Billing', route: '/admin-app/billing', icon: 'ri-bill-line', translationKey: 'app.navigation.billing', section: 'Admin App', actor: 'tenant', capability: 'orders' },
    { label: 'Business Details', route: '/admin-app/business-details', icon: 'ri-store-2-line', translationKey: 'app.navigation.businessDetails', section: 'Admin App', actor: 'tenant', capability: 'tenant-admin', featureKeys: ['roles.view', 'roles.edit'] },
    { label: 'Payment Options', route: '/admin-app/payment-options', icon: 'ri-bank-card-line', translationKey: 'app.navigation.paymentOptions', section: 'Admin App', actor: 'tenant', capability: 'orders' },
  ];

  readonly sections = computed<Array<NavItem['section']>>(() => {
    const visibleItems = this.visibleNavItems();
    const orderedSections: Array<NavItem['section']> = ['Master Setup', 'Marketplace', 'Product Setup', 'Order Management', 'Staff Management', 'Admin App', 'Settings'];
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

      // For tenant actors: if nav item declares featureKeys, check ONLY the first feature (the .list permission).
      // This keeps nav visibility in sync with the route guard which enforces the first featureKey.
      // First featureKey should always be the .list permission (e.g., 'category.list', 'group.list', etc.)
      if (item.featureKeys?.length && session.actorType === 'tenant') {
        const listPermission = item.featureKeys[0]; // First featureKey is ALWAYS .list
        return this.authSession.hasFeature(listPermission);
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

  @HostListener('window:keydown', ['$event'])
  onGlobalShortcut(event: KeyboardEvent): void {
    if (!event.altKey || event.ctrlKey || event.metaKey || String(event.key || '').toLowerCase() !== 'n') {
      return;
    }

    const session = this.currentSession();
    if (!session || session.actorType !== 'tenant' || !session.capabilities.includes('orders')) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    this.closeMenu();
    if (!this.isCreateOrderRoute()) {
      void this.router.navigateByUrl('/orders/create');
    }
  }

  get topbarSearchValue(): string {
    return this.headerSearch.value();
  }

  onTopbarSearchChange(value: string): void {
    this.headerSearch.setValue(value);
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

    if (section === 'Staff Management') {
      return 'app.navigation.staffManagement';
    }

    if (section === 'Admin App') {
      return 'app.navigation.adminApp';
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

  openClearLocalCatalogConfirmation(): void {
    this.clearLocalCatalogConfirmOpen.set(true);
  }

  openCatalogSyncModal(): void {
    this.catalogSyncModalOpen.set(true);
  }

  closeCatalogSyncModal(): void {
    if (!this.catalogRefreshing()) {
      this.catalogSyncModalOpen.set(false);
    }
  }

  async resyncCatalog(): Promise<void> {
    await this.catalogCache.refreshActiveCatalog();
  }

  formatCatalogLastUpdated(): string {
    const value = this.catalogLastUpdated();
    if (!value) {
      return 'Catalog has not been synchronized yet.';
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Last update time is unavailable.' : date.toLocaleString();
  }

  cancelClearLocalCatalog(): void {
    if (!this.clearingLocalCatalog()) {
      this.clearLocalCatalogConfirmOpen.set(false);
    }
  }

  async confirmClearLocalCatalog(): Promise<void> {
    if (this.clearingLocalCatalog()) {
      return;
    }

    this.clearingLocalCatalog.set(true);
    try {
      const response = await firstValueFrom(this.ordersService.getTenantConfig());
      const config = response.data;
      const tenantId = String(config?.tenantId || this.currentSession()?.tenantId || '').trim();
      const storeSlug = String(
        config?.storefrontConfig?.storeSlug
        || config?.storefrontShare?.storeSlug
        || config?.tenantId
        || '',
      ).trim().toLowerCase();
      if (!tenantId || !storeSlug) {
        throw new Error('Tenant catalog context is unavailable.');
      }

      await this.catalogCache.clear({ tenantId, storeSlug });
      this.clearLocalCatalogConfirmOpen.set(false);
      this.toast.success('Local Create Order catalog cleared.');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to clear the local catalog.';
      this.toast.error(message);
    } finally {
      this.clearingLocalCatalog.set(false);
    }
  }

  logout(): void {
    this.authSession.logout();
    this.closeMenu();
    void this.router.navigateByUrl('/auth', { replaceUrl: true });
  }
}
