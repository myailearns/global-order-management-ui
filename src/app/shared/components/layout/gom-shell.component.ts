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
} from '@gomlibs/ui';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { AppLanguage, I18nService } from '../../../core/i18n/i18n.service';
import { environment } from '../../../../environments/environment';
import { AdminNotification, AdminNotificationService } from './admin-notification.service';
import { HeaderSearchService } from './header-search.service';
import { NAV_ITEMS, NavItem } from './nav.config';
import { OrdersService } from '../../../features/order/orders/orders.service';
import { CreateOrderCatalogCacheService } from '../../../features/order/new-care-order/create-order-catalog-cache.service';

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
  readonly tenantApplicationName = signal('');
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
  readonly profileMenuOpen = signal(false);
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
    { value: 'hi', labelKey: 'app.language.hindi' },
    { value: 'te', labelKey: 'app.language.telugu' },
  ];
  readonly expandedSections = signal<Record<NavItem['section'], boolean>>({
    'Master Setup': true,
    'Marketplace': true,
    'Product Setup': true,
    'Order Management': true,
    'Account Management': true,
    'Admin App': true,
    'Setup': true,
    'Web App': true,
    'Settings': true,
    'Notifications': true,
  });

  readonly navItems: NavItem[] = NAV_ITEMS;

  private readonly standaloneNavOrder: string[] = ['/saas-admin/dashboard', '/saas-admin/offers'];
  private readonly standaloneNavRoutes = new Set<string>(this.standaloneNavOrder);

  readonly standaloneNavItems = computed(() => {
    const routeToItem = new Map(
      this.visibleNavItems()
        .filter((item) => this.standaloneNavRoutes.has(item.route))
        .map((item) => [item.route, item] as const),
    );

    return this.standaloneNavOrder
      .map((route) => routeToItem.get(route))
      .filter((item): item is NavItem => Boolean(item));
  });

  readonly groupedNavItems = computed(() =>
    this.visibleNavItems().filter((item) => !this.standaloneNavRoutes.has(item.route)),
  );

  readonly sections = computed<Array<NavItem['section']>>(() => {
    const visibleItems = this.groupedNavItems();
    const orderedSections: Array<NavItem['section']> = ['Master Setup', 'Marketplace', 'Product Setup', 'Order Management', 'Account Management', 'Admin App', 'Setup', 'Web App', 'Settings', 'Notifications'];
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

  isNavExpanded(): boolean {
    return this.isDesktopViewport() ? !this.desktopNavCollapsed() : this.menuOpen();
  }

  toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  toggleNav(): void {
    if (this.isDesktopViewport()) {
      this.toggleDesktopNav();
      return;
    }

    this.toggleMenu();
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
    this.loadTenantApplicationName();

    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => {
        this.loadPendingPricingCount();
        this.loadTenantApplicationName();
      });

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
    this.profileMenuOpen.set(false);
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

  toggleProfileMenu(): void {
    this.closeNotifPanel();
    this.profileMenuOpen.update((open) => !open);
  }

  closeProfileMenu(): void {
    this.profileMenuOpen.set(false);
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

  loadTenantApplicationName(): void {
    const session = this.authSession.session();
    if (session?.actorType !== 'tenant') {
      this.tenantApplicationName.set('');
      return;
    }

    this.ordersService.getTenantConfig().subscribe({
      next: (response) => {
        const displayName = String(response.data?.storefrontConfig?.storeDisplayName || '').trim();
        this.tenantApplicationName.set(displayName);
      },
      error: () => this.tenantApplicationName.set(''),
    });
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  toggleDesktopNav(): void {
    this.desktopNavCollapsed.update((collapsed) => !collapsed);
  }

  private isDesktopViewport(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }

    return window.matchMedia('(min-width: 768px)').matches;
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
    return this.groupedNavItems().filter((item) => item.section === section);
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

    if (section === 'Account Management') {
      return 'app.navigation.accountManagement';
    }

    if (section === 'Admin App') {
      return 'app.navigation.adminApp';
    }

    if (section === 'Setup') {
      return 'app.navigation.setup';
    }

    if (section === 'Web App') {
      return 'app.navigation.webApp';
    }

    if (section === 'Settings') {
      return 'app.navigation.settings';
    }

    if (section === 'Notifications') {
      return 'app.navigation.notifications';
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

  openProfileSettings(): void {
    this.closeProfileMenu();
    const route = this.currentSession()?.actorType === 'platform' ? '/settings/platform-users' : '/saas-admin/users';
    void this.router.navigateByUrl(route);
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
    this.closeProfileMenu();
    void this.router.navigateByUrl('/auth', { replaceUrl: true });
  }
}
