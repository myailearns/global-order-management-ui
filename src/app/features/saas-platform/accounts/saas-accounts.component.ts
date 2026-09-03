import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { startWith } from 'rxjs';

import { GomAlertToastService } from '@gomlibs/ui';
import { GomAccordionComponent, GomButtonComponent, GomConfirmationModalComponent, GomInputComponent, GomSelectComponent, GomSelectOption, GomTextareaComponent } from '@gomlibs/ui';
import { GomModalComponent } from '@gomlibs/ui';
import { GomTableColumn, GomTableComponent, GomTableQuery, GomTableRow } from '@gomlibs/ui';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { SaasAccountService } from './saas-account.service';
import {
  AccountStatus,
  AuditLogItem,
  BillingDurationCode,
  CreateAccountRequest,
  PaymentContextResponse,
  PaymentMethod,
  PendingVerificationPaymentRecord,
  TenantAccount,
  TenantStorageItem,
  TrialMode,
  UpdateAccountRequest,
} from './saas-account.model';
import { EntitlementsService } from '../entitlements/entitlements.service';
import { PackagePlan, TierFeatureMap } from '../entitlements/entitlements.model';

interface AccountRow extends GomTableRow {
  id: string;
  accountName: string;
  tenantCode: string;
  tenantUrl: string;
  planId: string;
  status: AccountStatus;
  mediaUsage: string;
  trialEndAt: string;
  updatedAt: string;
}

interface PendingPaymentRow extends GomTableRow {
  id: string;
  tenantCode: string;
  accountName: string;
  paymentId: string;
  durationCode: BillingDurationCode;
  amount: string;
  expectedAmount: string;
  matchStatus: string;
  requestedAt: string;
  tierLabel: string;
}

type PendingActionType = 'verify' | 'reject' | 'apply-tier' | 'set-duration';

@Component({
  selector: 'gom-saas-accounts',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TranslateModule,
    GomButtonComponent,
    GomAccordionComponent,
    GomConfirmationModalComponent,
    GomInputComponent,
    GomSelectComponent,
    GomTextareaComponent,
    GomModalComponent,
    GomTableComponent,
  ],
  templateUrl: './saas-accounts.component.html',
  styleUrl: './saas-accounts.component.scss',
})
export class SaasAccountsComponent implements OnInit {
  private readonly draftKey = 'gom.saas.account.draft';
  private readonly service = inject(SaasAccountService);
  private readonly entitlementsService = inject(EntitlementsService);
  private readonly toast = inject(GomAlertToastService);
  private readonly fb = inject(FormBuilder);
  private readonly authSession = inject(AuthSessionService);

  readonly loading = signal(false);
  readonly pendingLoading = signal(false);
  readonly canWrite = computed(() => this.authSession.canWrite('platform-admin'));
  readonly accounts = signal<TenantAccount[]>([]);
  readonly total = signal(0);
  readonly accountTablePageIndex = signal(0);
  readonly accountTablePageSize = signal(50);
  readonly canLoadAllAccounts = signal(false);
  readonly allAccountsLoaded = signal(false);
  readonly serverSidePaginationAccounts = computed(() => this.total() > 500);
  readonly accountTableDataMode = computed<'client' | 'server'>(() => (
    this.serverSidePaginationAccounts() && !this.allAccountsLoaded() ? 'server' : 'client'
  ));
  readonly search = signal('');
  readonly statusFilter = signal('');
  readonly tenantCodeAutoMode = signal(true);
  readonly timezoneSearch = signal('');

  readonly formModalOpen = signal(false);
  readonly createStep = signal<1 | 2>(1);
  readonly isCompletingIncomplete = signal(false);
  readonly statusModalOpen = signal(false);
  readonly trialModalOpen = signal(false);
  readonly auditModalOpen = signal(false);
  readonly deleteAllConfirmOpen = signal(false);
  readonly deleteAllBusy = signal(false);
  readonly deleteConfirmOpen = signal(false);
  readonly deleteBusy = signal(false);
  readonly deleteCandidate = signal<TenantAccount | null>(null);
  readonly editingAccountId = signal<string | null>(null);
  readonly selectedAccount = signal<TenantAccount | null>(null);
  readonly selectedPaymentAccount = signal<TenantAccount | null>(null);
  readonly auditLogs = signal<AuditLogItem[]>([]);
  readonly pendingPayments = signal<PendingVerificationPaymentRecord[]>([]);
  readonly lastBootstrapMessage = signal('');
  readonly storageMap = signal<Record<string, TenantStorageItem>>({});
  readonly paymentModalOpen = signal(false);
  readonly paymentRequestedAt = signal<Date | null>(null);
  readonly paymentTierOptions = signal<GomSelectOption[]>([]);
  readonly paymentTierMaps = signal<TierFeatureMap[]>([]);
  readonly paymentContext = signal<PaymentContextResponse | null>(null);
  readonly paymentDurationOptions = computed<GomSelectOption[]>(() => {
    const selectedTierId = String(this.paymentRequestForm.controls.tierId.value || '').trim();
    const tier = this.paymentTierMaps().find((item) => item._id === selectedTierId) || null;

    if (!tier || !Array.isArray(tier.cyclePricing) || tier.cyclePricing.length === 0) {
      return this.durationCodeOptions;
    }

    const optionMap = new Map(this.durationCodeOptions.map((item) => [String(item.value), item.label]));
    const enabledDurationCodes = tier.cyclePricing
      .filter((cycle) => cycle && cycle.isEnabled)
      .map((cycle) => String(cycle.durationCode || '').trim().toUpperCase())
      .filter((code) => optionMap.has(code));

    if (enabledDurationCodes.length === 0) {
      return [];
    }

    return enabledDurationCodes.map((code) => ({
      value: code,
      label: optionMap.get(code) || code,
    }));
  });
  readonly pendingActionModalOpen = signal(false);
  readonly pendingActionType = signal<PendingActionType | null>(null);
  readonly selectedPendingPayment = signal<PendingVerificationPaymentRecord | null>(null);
  readonly pendingActionTierOptions = signal<GomSelectOption[]>([]);
  readonly paymentActionHint = computed<'RENEWAL' | 'UPGRADE' | 'DOWNGRADE' | 'REACTIVATION'>(() => {
    const context = this.paymentContext();
    if (!context) {
      return 'RENEWAL';
    }

    if (context.currentSubscription.isExpired) {
      return 'REACTIVATION';
    }

    const selectedTierId = String(this.paymentRequestForm.controls.tierId.value || '').trim();
    const currentTierId = String(context.currentSubscription.tierId || '').trim();
    if (!selectedTierId || !currentTierId || selectedTierId === currentTierId) {
      return 'RENEWAL';
    }

    const selectedTier = this.paymentTierMaps().find((item) => item._id === selectedTierId) || null;
    const selectedKey = String(selectedTier?.tierKey || '').trim().toUpperCase();
    const currentKey = String(context.currentSubscription.tierKey || '').trim().toUpperCase();
    const selectedNum = this.extractTierNumber(selectedKey);
    const currentNum = this.extractTierNumber(currentKey);

    if (selectedNum == null || currentNum == null) {
      return 'RENEWAL';
    }

    return selectedNum > currentNum ? 'UPGRADE' : 'DOWNGRADE';
  });

  readonly deleteConfirmMessage = computed(() => {
    const account = this.deleteCandidate();
    if (!account) {
      return 'Delete this SaaS account? Deletion is allowed only when no tenant business data exists.';
    }

    return `Delete SaaS account "${account.accountName}" (${account.tenantCode})? This is allowed only when no tenant business data exists.`;
  });

  readonly statusOptions: GomSelectOption[] = [
    { value: '', label: 'All Statuses' },
    { value: 'TRIAL', label: 'TRIAL' },
    { value: 'TRIAL_ENDED', label: 'TRIAL_ENDED' },
    { value: 'ACTIVE', label: 'ACTIVE' },
    { value: 'SUSPENDED', label: 'SUSPENDED' },
    { value: 'CANCELLED', label: 'CANCELLED' },
  ];

  readonly trialModeOptions: GomSelectOption[] = [
    { value: 'FULL_APP_TRIAL', label: 'FULL_APP_TRIAL' },
    { value: 'PLAN_BASED_TRIAL', label: 'PLAN_BASED_TRIAL' },
    { value: 'NONE', label: 'NONE' },
  ];

  readonly durationCodeOptions: GomSelectOption[] = [
    { value: '1_MONTH', label: '1 Month' },
    { value: '3_MONTHS', label: '3 Months' },
    { value: '6_MONTHS', label: '6 Months' },
    { value: '1_YEAR', label: '1 Year' },
  ];

  readonly paymentMethodOptions: GomSelectOption[] = [
    { value: 'UPI', label: 'UPI' },
    { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
    { value: 'CHEQUE', label: 'Cheque' },
    { value: 'OTHER', label: 'Other' },
  ];

  readonly timezoneOptions: GomSelectOption[] = this.buildTimezoneOptions();
  readonly filteredTimezoneOptions = computed<GomSelectOption[]>(() => {
    const query = this.timezoneSearch().trim().toLowerCase();
    if (!query) {
      return this.timezoneOptions;
    }

    return this.timezoneOptions.filter((option) => option.label.toLowerCase().includes(query));
  });
  readonly planOptions = signal<GomSelectOption[]>([]);
  readonly hasPlanOptions = computed(() => this.planOptions().length > 0);
  readonly packagePlans = signal<PackagePlan[]>([]);
  readonly packageOptions = signal<GomSelectOption[]>([]);
  readonly tierOptions = signal<GomSelectOption[]>([]);
  readonly currentTiers = signal<TierFeatureMap[]>([]);
  readonly selectedTier = signal<TierFeatureMap | null>(null);
  readonly tierAllowsTrialOverride = signal(true);
  readonly tierAllowsFullFeatureTrial = signal(true);

  readonly createTrialModeOptions = computed<GomSelectOption[]>(() => {
    const base = [
      { value: 'PLAN_BASED_TRIAL', label: 'PLAN_BASED_TRIAL' },
      { value: 'FULL_APP_TRIAL', label: 'FULL_APP_TRIAL' },
      { value: 'NONE', label: 'NONE' },
    ];

    const selectedPackageId = String(this.accountForm.controls.packageId.value || '').trim();
    const selectedPackage = this.packagePlans().find((item) => item._id === selectedPackageId) || null;
    const selectedTier = this.selectedTier();
    const configuredDefaultMode = String(
      selectedTier?.defaultTrialMode || selectedPackage?.defaultTrialMode || 'PLAN_BASED_TRIAL',
    ).trim().toUpperCase() as TrialMode;

    if (this.tierAllowsFullFeatureTrial() || configuredDefaultMode === 'FULL_APP_TRIAL') {
      return base;
    }

    return base.filter((item) => item.value !== 'FULL_APP_TRIAL');
  });

  readonly nextStatusOptions = computed<GomSelectOption[]>(() => {
    const account = this.selectedAccount();
    if (!account) {
      return [];
    }

    const transitions: Record<AccountStatus, AccountStatus[]> = {
      INCOMPLETE: ['TRIAL', 'ACTIVE', 'CANCELLED'],
      TRIAL: ['TRIAL_ENDED', 'ACTIVE', 'SUSPENDED', 'CANCELLED'],
      TRIAL_ENDED: ['ACTIVE', 'SUSPENDED', 'CANCELLED'],
      ACTIVE: ['SUSPENDED', 'CANCELLED'],
      SUSPENDED: ['ACTIVE', 'CANCELLED'],
      CANCELLED: [],
    };

    return transitions[account.accountStatus].map((status) => ({ value: status, label: status }));
  });

  readonly accountForm = this.fb.group({
    accountName: ['', [Validators.required]],
    legalBusinessName: ['', [Validators.required]],
    tenantCode: ['', [Validators.required, Validators.pattern(/^[a-z0-9_]{1,30}$/)]],
    primaryContactName: ['', [Validators.required]],
    primaryContactPhone: ['', [Validators.required]],
    primaryContactEmail: ['', [Validators.required, Validators.email]],
    firstTenantAdminName: ['', [Validators.required]],
    firstTenantAdminEmail: ['', [Validators.required, Validators.email]],
    firstTenantAdminPassword: ['', [Validators.required, Validators.minLength(8)]],
    countryCode: ['IN', [Validators.required]],
    currency: ['INR', [Validators.required]],
    timezone: ['Asia/Kolkata', [Validators.required]],
    packageId: ['', [Validators.required]],
    tierId: ['', [Validators.required]],
    planId: ['', [Validators.required]],
    billingEmail: [''],
    supportPhone: [''],
    notes: [''],
    trialMode: ['PLAN_BASED_TRIAL' as TrialMode, [Validators.required]],
    trialDurationDays: [14, [Validators.required, Validators.min(1), Validators.max(365)]],
  });

  readonly statusForm = this.fb.group({
    status: ['', [Validators.required]],
    reason: [''],
  });

  readonly trialForm = this.fb.group({
    extensionDays: [7, [Validators.required, Validators.min(1), Validators.max(365)]],
    reason: [''],
  });

  readonly pendingVerifyForm = this.fb.group({
    reason: [''],
    overrideReason: [''],
  });

  readonly pendingRejectForm = this.fb.group({
    reason: ['', [Validators.required]],
  });

  readonly pendingApplyTierForm = this.fb.group({
    tierId: ['', [Validators.required]],
    reason: [''],
  });

  readonly pendingSetDurationForm = this.fb.group({
    durationCode: ['1_MONTH' as BillingDurationCode, [Validators.required]],
    reason: [''],
  });

  readonly paymentRequestForm = this.fb.group({
    paymentId: ['', [Validators.required]],
    referenceNumber: [''],
    tierId: ['', [Validators.required]],
    durationCode: ['1_MONTH' as BillingDurationCode, [Validators.required]],
    paidAmount: [0, [Validators.required, Validators.min(0)]],
    manualDiscountPercent: [0, [Validators.min(0), Validators.max(100)]],
    manualDiscountReason: [''],
    paymentMethod: ['UPI' as PaymentMethod, [Validators.required]],
    paymentProof: [''],
  });

  readonly rows = computed<AccountRow[]>(() => {
    const storage = this.storageMap();
    return this.accounts().map((item) => {
      const s = storage[item.tenantCode];
      return {
        id: item._id,
        accountName: item.accountName,
        tenantCode: item.tenantCode,
        tenantUrl: `${globalThis.location.origin}/login/${item.tenantCode}`,
        planId: item.planId,
        status: item.accountStatus,
        mediaUsage: s ? `${s.count} images · ${this.formatBytes(s.size)}` : '—',
        trialEndAt: item.trialEndAt ? new Date(item.trialEndAt).toLocaleDateString() : '-',
        updatedAt: new Date(item.updatedAt).toLocaleDateString(),
      };
    });
  });

  readonly hasRows = computed(() => this.rows().length > 0);

  readonly pendingRows = computed<PendingPaymentRow[]>(() => {
    return this.pendingPayments().map((item) => {
      const accountName = typeof item.accountId === 'object' ? (item.accountId.accountName || '-') : '-';
      const tenantCode = typeof item.accountId === 'object' ? (item.accountId.tenantCode || item.tenantId) : item.tenantId;
      const tierLabel = typeof item.tierId === 'object'
        ? (item.tierId.displayName ? `${item.tierId.displayName} (${item.tierId.tierKey || ''})` : (item.tierId.tierKey || '-'))
        : '-';

      return {
        id: item._id,
        tenantCode,
        accountName,
        paymentId: item.paymentId,
        durationCode: item.durationCode,
        amount: `${item.currency} ${Number(item.amount || 0).toFixed(2)}`,
        expectedAmount: `${item.currency} ${Number(item.expectedAmountAtRequest || 0).toFixed(2)}`,
        matchStatus: item.amountMatchStatus || 'MATCH',
        requestedAt: item.requestedAt ? new Date(item.requestedAt).toLocaleString() : '-',
        tierLabel,
      };
    });
  });

  readonly paymentValidationErrors = computed<string[]>(() => this.getPaymentFormErrors(false));
  readonly pendingActionValidationErrors = computed<string[]>(() => this.getPendingActionErrors(false));
  readonly pendingActionTitle = computed(() => {
    const type = this.pendingActionType();
    if (type === 'verify') {
      return 'Verify Payment';
    }
    if (type === 'reject') {
      return 'Reject Payment';
    }
    if (type === 'apply-tier') {
      return 'Apply Tier';
    }
    if (type === 'set-duration') {
      return 'Set Duration';
    }
    return 'Pending Payment Action';
  });

  readonly validationErrors = computed<string[]>(() => this.getAccountFormErrors(false));

  readonly columns: GomTableColumn<AccountRow>[] = [
    { key: 'accountName', header: 'Account', sortable: true, width: '18rem' },
    { key: 'tenantCode', header: 'Tenant Code', sortable: true, width: '12rem' },
    { key: 'tenantUrl', header: 'Tenant URL', width: '20rem' },
    { key: 'planId', header: 'Plan', sortable: true, width: '10rem' },
    { key: 'status', header: 'Status', width: '10rem' },
    { key: 'mediaUsage', header: 'Media Storage', width: '14rem' },
    { key: 'trialEndAt', header: 'Trial End', width: '10rem' },
    { key: 'updatedAt', header: 'Updated', width: '10rem' },
    {
      key: 'id',
      header: 'Actions',
      width: '24rem',
      actionButtons: [
        { label: 'View/Edit', icon: 'ri-pencil-line', actionKey: 'edit', variant: 'secondary' },
        { label: 'Record Payment', icon: 'ri-bank-card-line', actionKey: 'record-payment', variant: 'secondary' },
        { label: 'Change Status', icon: 'ri-refresh-line', actionKey: 'status', variant: 'secondary' },
        { label: 'Extend Trial', icon: 'ri-calendar-event-line', actionKey: 'extend-trial', variant: 'secondary' },
        { label: 'View Audit Log', icon: 'ri-history-line', actionKey: 'audit', variant: 'secondary' },
        { label: 'Delete', icon: 'ri-delete-bin-line', actionKey: 'delete', variant: 'danger' },
      ],
    },
  ];

  readonly pendingColumns: GomTableColumn<PendingPaymentRow>[] = [
    { key: 'tenantCode', header: 'Tenant', width: '10rem' },
    { key: 'accountName', header: 'Account', width: '14rem' },
    { key: 'paymentId', header: 'Payment ID', width: '12rem' },
    { key: 'durationCode', header: 'Duration', width: '9rem' },
    { key: 'amount', header: 'Paid Amount', width: '10rem' },
    { key: 'expectedAmount', header: 'Expected', width: '10rem' },
    { key: 'matchStatus', header: 'Match', width: '8rem' },
    { key: 'tierLabel', header: 'Tier', width: '14rem' },
    { key: 'requestedAt', header: 'Requested At', width: '14rem' },
    {
      key: 'id',
      header: 'Actions',
      width: '28rem',
      actionButtons: [
        { label: 'Verify', icon: 'ri-checkbox-circle-line', actionKey: 'verify-payment', variant: 'secondary' },
        { label: 'Reject', icon: 'ri-close-circle-line', actionKey: 'reject-payment', variant: 'danger' },
        { label: 'Apply Tier', icon: 'ri-stack-line', actionKey: 'apply-tier', variant: 'secondary' },
        { label: 'Set Duration', icon: 'ri-time-line', actionKey: 'set-duration', variant: 'secondary' },
      ],
    },
  ];

  ngOnInit(): void {
    this.setupTenantCodeAutoGeneration();
    this.setupPaymentPricingListeners();
    this.loadPlanOptions();
    this.setupCreateFlowListeners();
    this.loadAccounts();
    this.loadTenantStorage();
    this.loadPendingVerification();
  }

  toggleTenantCodeInputMode(): void {
    if (this.editingAccountId()) {
      return;
    }

    const nextAutoMode = !this.tenantCodeAutoMode();
    this.tenantCodeAutoMode.set(nextAutoMode);

    if (nextAutoMode) {
      const nextCode = this.generateTenantCode(this.accountForm.controls.accountName.value || '');
      this.accountForm.controls.tenantCode.setValue(nextCode);
      this.accountForm.controls.tenantCode.disable();
      return;
    }

    this.accountForm.controls.tenantCode.enable();
    this.accountForm.controls.tenantCode.markAsTouched();
  }

  loadAccounts(): void {
    this.loading.set(true);
    this.accountTablePageIndex.set(0);
    this.allAccountsLoaded.set(false);

    this.service.listAccounts({
      page: 1,
      limit: this.accountTablePageSize(),
      search: this.search(),
      status: this.statusFilter(),
    }).subscribe({
      next: (response) => {
        const pagination = response.pagination;
        this.total.set(pagination.total);
        this.canLoadAllAccounts.set(pagination.canLoadAll && pagination.total <= 5000);
        this.allAccountsLoaded.set(pagination.total <= 500);

        if (pagination.total <= 500 && pagination.hasMore) {
          this.service.listAccounts({
            page: 1,
            limit: pagination.total,
            search: this.search(),
            status: this.statusFilter(),
          }).subscribe({
            next: (allRes) => this.accounts.set(allRes.data || []),
          });
        } else {
          this.accounts.set(response.data || []);
        }
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.toast.error(String(error?.error?.message || 'Failed to load SaaS accounts'));
      },
    });
  }

  onSearchChange(value: string): void {
    this.search.set(value.trim());
    this.loadAccounts();
  }

  loadTenantStorage(): void {
    this.service.getPerTenantStorage().subscribe({
      next: (items) => {
        const map: Record<string, TenantStorageItem> = {};
        for (const item of items) {
          map[item.tenantCode] = item;
        }
        this.storageMap.set(map);
      },
      error: () => { /* silent — column shows dash */ },
    });
  }

  formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  onStatusFilterChange(value: string): void {
    this.statusFilter.set(value);
    this.loadAccounts();
  }

  onAccountsTableQueryChange(query: GomTableQuery): void {
    if (this.accountTableDataMode() !== 'server') {
      return;
    }

    this.loading.set(true);
    this.service.listAccounts({
      page: query.pageIndex + 1,
      limit: query.pageSize,
      search: query.searchTerm?.trim() || this.search() || undefined,
      status: this.statusFilter() || undefined,
      sortBy: query.sort?.key || undefined,
      order: (query.sort?.direction as 'asc' | 'desc' | undefined),
    }).subscribe({
      next: (res) => {
        this.allAccountsLoaded.set(false);
        this.accounts.set(res.data || []);
        this.total.set(res.pagination.total);
        this.canLoadAllAccounts.set(res.pagination.canLoadAll && res.pagination.total <= 5000);
        this.accountTablePageIndex.set(query.pageIndex);
        this.accountTablePageSize.set(query.pageSize);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  loadAllAccounts(): void {
    if (this.total() > 5000) {
      return;
    }

    this.loading.set(true);
    this.service.listAccounts({
      page: 1,
      limit: this.total(),
      search: this.search(),
      status: this.statusFilter(),
    }).subscribe({
      next: (res) => {
        this.accounts.set(res.data || []);
        this.total.set(res.pagination.total);
        this.canLoadAllAccounts.set(false);
        this.allAccountsLoaded.set(true);
        this.accountTablePageIndex.set(0);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onTimezoneSearchChange(value: string): void {
    this.timezoneSearch.set(value.trim());
  }

  openDeleteAllConfirm(): void {
    if (!this.canWrite()) {
      return;
    }

    this.deleteAllConfirmOpen.set(true);
  }

  closeDeleteAllConfirm(): void {
    if (this.deleteAllBusy()) {
      return;
    }

    this.deleteAllConfirmOpen.set(false);
  }

  confirmDeleteAllAccounts(): void {
    if (this.deleteAllBusy()) {
      return;
    }

    this.deleteAllBusy.set(true);
    this.service.deleteAllAccounts().subscribe({
      next: (result) => {
        this.deleteAllBusy.set(false);
        this.deleteAllConfirmOpen.set(false);
        this.selectedAccount.set(null);
        this.auditLogs.set([]);
        this.lastBootstrapMessage.set('');
        this.storageMap.set({});
        const deletedCount = result.deletedCount || 0;
        const pluralSuffix = deletedCount === 1 ? '' : 's';
        const deleteMessage = deletedCount > 0
          ? `Deleted ${deletedCount} SaaS account${pluralSuffix} and cleared bootstrap tenant records.`
          : 'No SaaS accounts to delete.';
        this.toast.success(
          deleteMessage,
        );
        this.loadAccounts();
        this.loadTenantStorage();
      },
      error: (error) => {
        this.deleteAllBusy.set(false);
        this.toast.error(String(error?.error?.message || 'Failed to delete SaaS accounts'));
      },
    });
  }

  openDeleteConfirm(account: TenantAccount): void {
    if (!this.canWrite()) {
      return;
    }

    this.deleteCandidate.set(account);
    this.deleteConfirmOpen.set(true);
  }

  closeDeleteConfirm(): void {
    if (this.deleteBusy()) {
      return;
    }

    this.deleteConfirmOpen.set(false);
    this.deleteCandidate.set(null);
  }

  confirmDeleteAccount(): void {
    const account = this.deleteCandidate();
    if (!account || this.deleteBusy()) {
      return;
    }

    this.deleteBusy.set(true);
    this.service.deleteAccount(account._id).subscribe({
      next: () => {
        this.deleteBusy.set(false);
        this.deleteConfirmOpen.set(false);
        this.deleteCandidate.set(null);
        if (this.selectedAccount()?._id === account._id) {
          this.selectedAccount.set(null);
        }
        this.toast.success(`SaaS account ${account.accountName} deleted`);
        this.loadAccounts();
        this.loadTenantStorage();
      },
      error: (error) => {
        this.deleteBusy.set(false);
        this.toast.error(String(error?.error?.message || 'Failed to delete SaaS account'));
      },
    });
  }

  cancelForm(): void {
    this.formModalOpen.set(false);
    this.isCompletingIncomplete.set(false);
    this.editingAccountId.set(null);
    this.createStep.set(1);
  }

  openCreate(): void {
    this.editingAccountId.set(null);
    this.isCompletingIncomplete.set(false);
    this.createStep.set(1);
    this.configureFirstAdminPasswordValidation(true);
    this.configureCreateModeValidators();
    this.accountForm.enable();
    this.tenantCodeAutoMode.set(true);
    this.accountForm.reset({
      accountName: '',
      legalBusinessName: '',
      tenantCode: 'tenant',
      primaryContactName: '',
      primaryContactPhone: '',
      primaryContactEmail: '',
      firstTenantAdminName: '',
      firstTenantAdminEmail: '',
      firstTenantAdminPassword: '',
      countryCode: 'IN',
      currency: 'INR',
      timezone: 'Asia/Kolkata',
      packageId: '',
      tierId: '',
      planId: '',
      billingEmail: '',
      supportPhone: '',
      notes: '',
      trialMode: 'PLAN_BASED_TRIAL',
      trialDurationDays: 14,
    });
    this.accountForm.controls.tenantCode.disable();
    this.accountForm.controls.currency.disable();
    this.accountForm.controls.timezone.disable();
    this.accountForm.controls.planId.disable();
    this.accountForm.controls.trialMode.enable({ emitEvent: false });
    this.accountForm.controls.trialDurationDays.enable({ emitEvent: false });
    this.tierOptions.set([]);
    this.currentTiers.set([]);
    this.selectedTier.set(null);
    this.tierAllowsTrialOverride.set(true);
    this.tierAllowsFullFeatureTrial.set(true);

    const availablePlans = this.planOptions();
    if (availablePlans.length > 0) {
      this.accountForm.controls.planId.setValue(availablePlans[0].value);
    }

    this.formModalOpen.set(true);
    this.loadDraftIfPresent();
  }

  onTableAction(event: { actionKey: string; row: AccountRow }): void {
    if (!this.canWrite()) {
      return;
    }
    const account = this.accounts().find((item) => item._id === event.row.id);
    if (!account) {
      return;
    }

    if (event.actionKey === 'edit') {
      this.openEdit(account._id);
      return;
    }

    if (event.actionKey === 'status') {
      this.selectedAccount.set(account);
      const nextStatus = this.nextStatusOptions()[0]?.value || '';
      this.statusForm.reset({ status: nextStatus, reason: '' });
      this.statusModalOpen.set(true);
      return;
    }

    if (event.actionKey === 'record-payment') {
      this.openPaymentRequest(account);
      return;
    }

    if (event.actionKey === 'extend-trial') {
      if (!['TRIAL', 'SUSPENDED'].includes(account.accountStatus)) {
        this.toast.warning('Trial can be granted only for TRIAL or SUSPENDED accounts.');
        return;
      }
      this.selectedAccount.set(account);
      this.trialForm.reset({ extensionDays: 7, reason: '' });
      this.trialModalOpen.set(true);
      return;
    }

    if (event.actionKey === 'audit') {
      this.openAudit(account._id);
      return;
    }

    if (event.actionKey === 'delete') {
      this.openDeleteConfirm(account);
    }
  }

  onPendingTableAction(event: { actionKey: string; row: PendingPaymentRow }): void {
    if (!this.canWrite()) {
      return;
    }

    const payment = this.pendingPayments().find((item) => item._id === event.row.id);
    if (!payment) {
      return;
    }

    if (event.actionKey === 'verify-payment') {
      this.openPendingVerify(payment);
      return;
    }
    if (event.actionKey === 'reject-payment') {
      this.openPendingReject(payment);
      return;
    }
    if (event.actionKey === 'apply-tier') {
      this.openPendingApplyTier(payment);
      return;
    }
    if (event.actionKey === 'set-duration') {
      this.openPendingSetDuration(payment);
    }
  }

  openEdit(id: string): void {
    this.loading.set(true);
    this.service.getAccountById(id).subscribe({
      next: (account) => {
        this.loading.set(false);
        this.accountForm.enable();
        this.editingAccountId.set(id);
        this.tenantCodeAutoMode.set(false);

        const isIncomplete = account.accountStatus === 'INCOMPLETE';
        this.isCompletingIncomplete.set(isIncomplete);
        this.configureFirstAdminPasswordValidation(isIncomplete);

        if (isIncomplete) {
          // Completing step 2 of an INCOMPLETE account — use create-mode validators
          this.configureCreateModeValidators();
          this.createStep.set(2);
          this.accountForm.controls.planId.disable();
        } else {
          // Editing TRIAL/ACTIVE account - start at step 1, allow navigation to step 2
          this.configureEditModeValidators();
          this.createStep.set(1);
        }

        this.accountForm.patchValue({
          accountName: account.accountName,
          legalBusinessName: account.legalBusinessName,
          tenantCode: account.tenantCode,
          primaryContactName: account.primaryContactName,
          primaryContactPhone: account.primaryContactPhone,
          primaryContactEmail: account.primaryContactEmail,
          firstTenantAdminName: '',
          firstTenantAdminEmail: '',
          firstTenantAdminPassword: '',
          countryCode: account.countryCode,
          currency: account.currency,
          timezone: account.timezone,
          packageId: account.packageId || '',
          tierId: account.tierId || '',
          planId: account.planId,
          billingEmail: account.billingEmail || '',
          supportPhone: account.supportPhone || '',
          notes: account.notes || '',
          trialMode: account.trialMode,
          trialDurationDays: account.trialDurationDays,
        });
        this.accountForm.controls.tenantCode.disable();

        // For INCOMPLETE accounts, auto-select planId
        if (isIncomplete) {
          const availablePlans = this.planOptions();
          if (availablePlans.length > 0) {
            this.accountForm.controls.planId.setValue(availablePlans[0].value);
          }
        }

        // Fetch existing first admin user details for all account types
        this.service.getAccountFirstAdmin(id).subscribe({
          next: (admin) => {
            if (admin) {
              this.accountForm.patchValue({
                firstTenantAdminName: admin.fullName,
                firstTenantAdminEmail: admin.email,
                // Password not sent from backend for security, leave empty
                firstTenantAdminPassword: '',
              });
            }
          },
          error: (err) => {
            console.error('Failed to load first admin:', err);
            // Continue even if admin fetch fails
          },
        });

        this.formModalOpen.set(true);
      },
      error: (error) => {
        this.loading.set(false);
        this.toast.error(String(error?.error?.message || 'Failed to fetch account'));
      },
    });
  }

  saveAccount(): void {
    if (this.accountForm.invalid) {
      this.accountForm.markAllAsTouched();
      const errors = this.getAccountFormErrors(true);
      this.toast.error(errors[0] || 'Please complete required fields');
      return;
    }

    if (!this.hasPlanOptions()) {
      this.toast.error('Create at least one active package before creating a SaaS account');
      return;
    }

    const raw = this.accountForm.getRawValue();

    const editId = this.editingAccountId();
    this.loading.set(true);

    if (editId && this.isCompletingIncomplete()) {
      // Completing an INCOMPLETE account — call the dedicated complete endpoint
      const completePayload = {
        planId: raw.planId || '',
        packageId: raw.packageId || '',
        tierId: raw.tierId || '',
        tierKey: this.selectedTier()?.tierKey || undefined,
        trialMode: (raw.trialMode || 'PLAN_BASED_TRIAL') as string,
        trialDurationDays: Number(raw.trialDurationDays || 14),
        firstTenantAdminName: String(raw.firstTenantAdminName || '').trim(),
        firstTenantAdminEmail: String(raw.firstTenantAdminEmail || '').trim(),
        firstTenantAdminPassword: String(raw.firstTenantAdminPassword || ''),
      };
      this.service.completeIncompleteAccount(editId, completePayload).subscribe({
        next: () => {
          this.loading.set(false);
          this.formModalOpen.set(false);
          this.isCompletingIncomplete.set(false);
          this.toast.success('Account activated as TRIAL');
          this.clearDraft();
          this.loadAccounts();
        },
        error: (error) => {
          this.loading.set(false);
          this.toast.error(String(error?.error?.message || 'Failed to complete account'));
        },
      });
      return;
    }

    if (editId) {
      const updatePayload: UpdateAccountRequest = {
        accountName: raw.accountName || undefined,
        legalBusinessName: raw.legalBusinessName || undefined,
        primaryContactName: raw.primaryContactName || undefined,
        primaryContactPhone: raw.primaryContactPhone || undefined,
        primaryContactEmail: raw.primaryContactEmail || undefined,
        countryCode: raw.countryCode || undefined,
        currency: raw.currency || undefined,
        timezone: raw.timezone || undefined,
        planId: raw.planId || undefined,
        packageId: raw.packageId || undefined,
        tierId: raw.tierId || undefined,
        tierKey: this.selectedTier()?.tierKey || undefined,
        billingEmail: raw.billingEmail || undefined,
        supportPhone: raw.supportPhone || undefined,
        notes: raw.notes || undefined,
      };

      // If on Step 2, include admin fields for updating tenant admin
      if (this.createStep() === 2) {
        const adminName = String(raw.firstTenantAdminName || '').trim();
        const adminEmail = String(raw.firstTenantAdminEmail || '').trim();
        const adminPassword = String(raw.firstTenantAdminPassword || '').trim();

        if (adminName) {
          updatePayload.firstTenantAdminName = adminName;
        }
        if (adminEmail) {
          updatePayload.firstTenantAdminEmail = adminEmail;
        }
        // Only include password if provided (optional for updates)
        if (adminPassword) {
          updatePayload.firstTenantAdminPassword = adminPassword;
        }
      }

      this.service.updateAccount(editId, updatePayload).subscribe({
        next: () => {
          this.loading.set(false);
          this.formModalOpen.set(false);
          this.toast.success('SaaS account updated');
          this.clearDraft();
          this.loadAccounts();
        },
        error: (error) => {
          this.loading.set(false);
          this.toast.error(String(error?.error?.message || 'Failed to update account'));
        },
      });
      return;
    }

    const createPayload: CreateAccountRequest = {
      accountName: raw.accountName || '',
      primaryContactPhone: raw.primaryContactPhone || '',
      primaryContactEmail: raw.primaryContactEmail || '',
      firstTenantAdminName: raw.firstTenantAdminName || '',
      firstTenantAdminEmail: raw.firstTenantAdminEmail || '',
      firstTenantAdminPassword: raw.firstTenantAdminPassword || '',
      countryCode: raw.countryCode || 'IN',
      packageId: raw.packageId || '',
      tierId: raw.tierId || '',
      legalBusinessName: raw.legalBusinessName || raw.accountName || '',
      primaryContactName: raw.primaryContactName || raw.accountName || '',
      tenantCode: raw.tenantCode || undefined,
      currency: raw.currency || undefined,
      timezone: raw.timezone || undefined,
      planId: raw.planId || undefined,
      trialMode: (raw.trialMode || 'PLAN_BASED_TRIAL') as TrialMode,
      trialDurationDays: Number(raw.trialDurationDays || 14),
      billingEmail: raw.billingEmail || undefined,
      supportPhone: raw.supportPhone || undefined,
      notes: raw.notes || undefined,
    };

    this.service.createAccount(createPayload).subscribe({
      next: (result) => {
        this.loading.set(false);
        this.formModalOpen.set(false);
        const bootstrapInfo = result.tenantAdminBootstrap;
        const tenantUrl = `${globalThis.location.origin}/login/${result.account.tenantCode}`;
        const bootstrapMessage = bootstrapInfo
          ? `First tenant admin ${bootstrapInfo.fullName} (${bootstrapInfo.email}) created with role ${bootstrapInfo.roleKey}.\nTenant URL: ${tenantUrl}`
          : `SaaS account created.\nTenant URL: ${tenantUrl}`;
        this.lastBootstrapMessage.set(bootstrapMessage);
        this.toast.success(bootstrapMessage);
        this.clearDraft();
        this.loadAccounts();
      },
      error: (error) => {
        this.loading.set(false);
        this.toast.error(String(error?.error?.message || 'Failed to create account'));
      },
    });
  }

  saveDraft(): void {
    if (this.editingAccountId()) {
      this.toast.info('Save Draft is available only for new account creation.');
      return;
    }

    localStorage.setItem(
      this.draftKey,
      JSON.stringify({
        form: this.accountForm.getRawValue(),
        tenantCodeManual: !this.tenantCodeAutoMode(),
      }),
    );
    this.toast.success('Draft saved locally.');
  }

  private loadDraftIfPresent(): void {
    if (this.editingAccountId()) {
      return;
    }

    const raw = localStorage.getItem(this.draftKey);
    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const source = (parsed['form'] as Record<string, unknown> | undefined) || parsed;

      const draftManualValue = parsed['tenantCodeManual'];
      const tenantCodeManual = typeof draftManualValue === 'boolean'
        ? draftManualValue
        : this.toStringValue(source['tenantCode']).length > 0;

      this.tenantCodeAutoMode.set(!tenantCodeManual);
      if (tenantCodeManual) {
        this.accountForm.controls.tenantCode.enable();
      } else {
        this.accountForm.controls.tenantCode.disable();
      }

      this.accountForm.patchValue({
        accountName: this.toStringValue(source['accountName']),
        legalBusinessName: this.toStringValue(source['legalBusinessName']),
        tenantCode: this.toStringValue(source['tenantCode']),
        primaryContactName: this.toStringValue(source['primaryContactName']),
        primaryContactPhone: this.toStringValue(source['primaryContactPhone']),
        primaryContactEmail: this.toStringValue(source['primaryContactEmail']),
        firstTenantAdminName: this.toStringValue(source['firstTenantAdminName']),
        firstTenantAdminEmail: this.toStringValue(source['firstTenantAdminEmail']),
        firstTenantAdminPassword: this.toStringValue(source['firstTenantAdminPassword']),
        countryCode: this.toStringValue(source['countryCode'], 'IN'),
        currency: this.toStringValue(source['currency'], 'INR'),
        timezone: this.toStringValue(source['timezone'], 'Asia/Kolkata'),
        planId: this.toStringValue(source['planId'], this.planOptions()[0]?.value || ''),
        billingEmail: this.toStringValue(source['billingEmail']),
        supportPhone: this.toStringValue(source['supportPhone']),
        notes: this.toStringValue(source['notes']),
        trialMode: (this.toStringValue(source['trialMode'], 'PLAN_BASED_TRIAL') as TrialMode),
        trialDurationDays: Number(source['trialDurationDays'] || 14),
      });
      this.toast.info('Loaded saved draft.');
    } catch {
      localStorage.removeItem(this.draftKey);
    }
  }

  private clearDraft(): void {
    localStorage.removeItem(this.draftKey);
  }

  private getAccountFormErrors(includeUntouched: boolean): string[] {
    const errors: string[] = [];
    const form = this.accountForm;
    const controlMap: Array<{ key: keyof typeof form.controls; label: string }> = [
      { key: 'accountName', label: 'Account Name' },
      { key: 'legalBusinessName', label: 'Legal Business Name' },
      { key: 'tenantCode', label: 'Tenant Code' },
      { key: 'primaryContactName', label: 'Primary Contact Name' },
      { key: 'primaryContactPhone', label: 'Primary Contact Phone' },
      { key: 'primaryContactEmail', label: 'Primary Contact Email' },
      { key: 'firstTenantAdminName', label: 'First Tenant Admin Name' },
      { key: 'firstTenantAdminEmail', label: 'First Tenant Admin Email' },
      { key: 'firstTenantAdminPassword', label: 'First Tenant Admin Password' },
      { key: 'countryCode', label: 'Country Code' },
      { key: 'currency', label: 'Currency' },
      { key: 'timezone', label: 'Timezone' },
      { key: 'packageId', label: 'Package' },
      { key: 'tierId', label: 'Tier' },
      { key: 'planId', label: 'Plan' },
      { key: 'trialMode', label: 'Trial Mode' },
      { key: 'trialDurationDays', label: 'Trial Duration' },
    ];

    controlMap.forEach((entry) => {
      const control = form.controls[entry.key];
      if (!control || control.disabled || !control.invalid) {
        return;
      }

      if (!includeUntouched && !control.touched && !control.dirty) {
        return;
      }

      if (control.hasError('required')) {
        errors.push(`${entry.label} is required.`);
        return;
      }

      if (control.hasError('email')) {
        errors.push(`${entry.label} must be a valid email address.`);
        return;
      }

      if (control.hasError('pattern') && entry.key === 'tenantCode') {
        errors.push('Tenant Code can use only lowercase letters, numbers, and underscores.');
        return;
      }

      if (control.hasError('minlength') && entry.key === 'firstTenantAdminPassword') {
        errors.push('First Tenant Admin Password must be at least 8 characters.');
        return;
      }

      if (control.hasError('min') && entry.key === 'trialDurationDays') {
        errors.push('Trial Duration must be at least 1 day.');
        return;
      }

      if (control.hasError('max') && entry.key === 'trialDurationDays') {
        errors.push('Trial Duration cannot exceed 365 days.');
        return;
      }

      errors.push(`${entry.label} is invalid.`);
    });

    return errors;
  }

  private setupTenantCodeAutoGeneration(): void {
    this.accountForm.controls.accountName.valueChanges
      .pipe(startWith(this.accountForm.controls.accountName.value))
      .subscribe((value) => {
        if (!this.tenantCodeAutoMode() || this.editingAccountId()) {
          return;
        }

        const generatedCode = this.generateTenantCode(value || '');
        this.accountForm.controls.tenantCode.setValue(generatedCode, { emitEvent: false });
      });
  }

  private loadPlanOptions(): void {
    this.entitlementsService.listPackages(1, 200).subscribe({
      next: (plans) => {
        const activePlans = plans.filter((plan) => plan.status === 'ACTIVE');
        const effectivePlans = activePlans.length ? activePlans : plans;
        this.packagePlans.set(effectivePlans);
        this.packageOptions.set(effectivePlans.map((plan) => ({
          value: plan._id,
          label: `${plan.name} (${plan.planId})`,
        })));
        const options = effectivePlans.map((plan) => ({
          value: plan.planId,
          label: `${plan.name} (${plan.planId})`,
        }));

        if (options.length === 0) {
          return;
        }

        this.planOptions.set(options);

        const currentPlanId = this.accountForm.controls.planId.value || '';
        const hasCurrent = options.some((option) => option.value === currentPlanId);
        if (!hasCurrent) {
          this.accountForm.controls.planId.setValue(options[0].value);
        }
      },
      error: () => {
        this.planOptions.set([]);
      },
    });
  }

  private configureFirstAdminPasswordValidation(isCreateMode: boolean): void {
    const control = this.accountForm.controls.firstTenantAdminPassword;
    const nameControl = this.accountForm.controls.firstTenantAdminName;
    const emailControl = this.accountForm.controls.firstTenantAdminEmail;
    if (isCreateMode) {
      nameControl.setValidators([Validators.required]);
      emailControl.setValidators([Validators.required, Validators.email]);
      control.setValidators([Validators.required, Validators.minLength(8)]);
    } else {
      nameControl.clearValidators();
      emailControl.clearValidators();
      nameControl.setValue('');
      emailControl.setValue('');
      control.clearValidators();
      control.setValue('');
    }
    nameControl.updateValueAndValidity({ emitEvent: false });
    emailControl.updateValueAndValidity({ emitEvent: false });
    control.updateValueAndValidity({ emitEvent: false });
  }

  private configureCreateModeValidators(): void {
    this.accountForm.controls.legalBusinessName.clearValidators();
    this.accountForm.controls.tenantCode.clearValidators();
    this.accountForm.controls.primaryContactName.clearValidators();
    this.accountForm.controls.currency.clearValidators();
    this.accountForm.controls.timezone.clearValidators();
    this.accountForm.controls.planId.clearValidators();

    this.accountForm.controls.packageId.setValidators([Validators.required]);
    this.accountForm.controls.tierId.setValidators([Validators.required]);

    this.accountForm.controls.legalBusinessName.updateValueAndValidity({ emitEvent: false });
    this.accountForm.controls.tenantCode.updateValueAndValidity({ emitEvent: false });
    this.accountForm.controls.primaryContactName.updateValueAndValidity({ emitEvent: false });
    this.accountForm.controls.currency.updateValueAndValidity({ emitEvent: false });
    this.accountForm.controls.timezone.updateValueAndValidity({ emitEvent: false });
    this.accountForm.controls.planId.updateValueAndValidity({ emitEvent: false });
    this.accountForm.controls.packageId.updateValueAndValidity({ emitEvent: false });
    this.accountForm.controls.tierId.updateValueAndValidity({ emitEvent: false });
  }

  private configureEditModeValidators(): void {
    this.accountForm.controls.legalBusinessName.setValidators([Validators.required]);
    this.accountForm.controls.primaryContactName.setValidators([Validators.required]);
    this.accountForm.controls.currency.setValidators([Validators.required]);
    this.accountForm.controls.timezone.setValidators([Validators.required]);
    this.accountForm.controls.planId.setValidators([Validators.required]);
    this.accountForm.controls.tenantCode.setValidators([Validators.required, Validators.pattern(/^[a-z0-9_]{1,30}$/)]);

    this.accountForm.controls.packageId.clearValidators();
    this.accountForm.controls.tierId.clearValidators();

    this.accountForm.controls.legalBusinessName.updateValueAndValidity({ emitEvent: false });
    this.accountForm.controls.tenantCode.updateValueAndValidity({ emitEvent: false });
    this.accountForm.controls.primaryContactName.updateValueAndValidity({ emitEvent: false });
    this.accountForm.controls.currency.updateValueAndValidity({ emitEvent: false });
    this.accountForm.controls.timezone.updateValueAndValidity({ emitEvent: false });
    this.accountForm.controls.planId.updateValueAndValidity({ emitEvent: false });
    this.accountForm.controls.packageId.updateValueAndValidity({ emitEvent: false });
    this.accountForm.controls.tierId.updateValueAndValidity({ emitEvent: false });
  }

  saveAndContinueStep1(): void {
    const requiredControls = [
      this.accountForm.controls.accountName,
      this.accountForm.controls.primaryContactPhone,
      this.accountForm.controls.primaryContactEmail,
      this.accountForm.controls.countryCode,
    ];

    requiredControls.forEach((control) => control.markAsTouched());
    const hasInvalid = requiredControls.some((control) => control.invalid);
    if (hasInvalid) {
      this.toast.error('Please complete Step 1 fields before continuing');
      return;
    }

    const accountName = String(this.accountForm.controls.accountName.value || '').trim();
    this.accountForm.controls.legalBusinessName.setValue(accountName, { emitEvent: false });
    this.accountForm.controls.primaryContactName.setValue(accountName, { emitEvent: false });

    if (!this.accountForm.controls.packageId.value && this.packageOptions().length > 0) {
      this.accountForm.controls.packageId.setValue(this.packageOptions()[0].value);
    }

    // If already editing an account, just move to step 2 without creating duplicate
    if (this.editingAccountId()) {
      this.configureFirstAdminPasswordValidation(true);
      this.createStep.set(2);
      return;
    }

    // Save incomplete account to DB so it appears in the list even if modal is closed
    const incompletePayload = {
      accountName,
      primaryContactPhone: String(this.accountForm.controls.primaryContactPhone.value || '').trim(),
      primaryContactEmail: String(this.accountForm.controls.primaryContactEmail.value || '').trim(),
      countryCode: String(this.accountForm.controls.countryCode.value || 'IN').trim(),
    };

    this.loading.set(true);
    this.service.createIncompleteAccount(incompletePayload).subscribe({
      next: (saved) => {
        this.loading.set(false);
        this.editingAccountId.set(saved._id);
        this.isCompletingIncomplete.set(true);
        this.configureFirstAdminPasswordValidation(true);
        this.toast.info('Step 1 saved. Complete Step 2 to activate account.');
        this.createStep.set(2);
        this.loadAccounts();
      },
      error: (error) => {
        this.loading.set(false);
        this.toast.error(String(error?.error?.message || 'Failed to save Step 1'));
      },
    });
  }

  backToStep1(): void {
    this.createStep.set(1);
  }

  private setupCreateFlowListeners(): void {
    this.accountForm.controls.packageId.valueChanges.subscribe((packageId) => {
      this.loadTiersForPackage(String(packageId || ''));
    });

    this.accountForm.controls.tierId.valueChanges.subscribe((tierId) => {
      this.applyTierDefaults(String(tierId || ''));
    });
  }

  private loadTiersForPackage(packageId: string): void {
    const normalizedPackageId = String(packageId || '').trim();
    if (!normalizedPackageId) {
      this.currentTiers.set([]);
      this.tierOptions.set([]);
      this.accountForm.controls.tierId.setValue('');
      this.selectedTier.set(null);
      return;
    }

    const selectedPackage = this.packagePlans().find((item) => item._id === normalizedPackageId);
    if (selectedPackage?.planId) {
      this.accountForm.controls.planId.setValue(String(selectedPackage.planId).trim().toUpperCase(), { emitEvent: false });
    }

    this.entitlementsService.listPackageTiers(normalizedPackageId, 1, 200).subscribe({
      next: (result) => {
        const tiers = Array.isArray(result.items) ? result.items : [];
        this.currentTiers.set(tiers);
        this.tierOptions.set(tiers.map((tier) => ({
          value: tier._id,
          label: tier.displayName ? `${tier.displayName} (${tier.tierKey})` : tier.tierKey,
        })));

        if (!tiers.length) {
          this.accountForm.controls.tierId.setValue('', { emitEvent: false });
          this.selectedTier.set(null);
          return;
        }

        const currentTierId = String(this.accountForm.controls.tierId.value || '').trim();
        if (currentTierId && tiers.some((item) => item._id === currentTierId)) {
          // Tier already selected, but ensure defaults are reapplied in case tier data changed
          this.applyTierDefaults(currentTierId);
          return;
        }

        // Auto-select first tier and trigger applyTierDefaults via value change event
        this.accountForm.controls.tierId.setValue(tiers[0]._id, { emitEvent: true });
      },
      error: () => {
        this.currentTiers.set([]);
        this.tierOptions.set([]);
        this.accountForm.controls.tierId.setValue('', { emitEvent: false });
      },
    });
  }

  private applyTierDefaults(tierId: string): void {
    const tier = this.currentTiers().find((item) => item._id === tierId) || null;
    const selectedPackageId = String(this.accountForm.controls.packageId.value || '').trim();
    const selectedPackage = this.packagePlans().find((item) => item._id === selectedPackageId);
    this.selectedTier.set(tier);
    if (!tier) {
      // If tier is not selected/available, fallback to package defaults.
      const packageMode = String(selectedPackage?.defaultTrialMode || 'PLAN_BASED_TRIAL').trim().toUpperCase() as TrialMode;
      const packageDuration = Number(selectedPackage?.defaultTrialDurationDays ?? 14);
      this.accountForm.controls.trialMode.setValue(packageMode, { emitEvent: false });
      this.accountForm.controls.trialDurationDays.setValue(packageDuration, { emitEvent: false });
      return;
    }

    const allowCustom = tier.allowCustomTrialDays !== false;
    this.tierAllowsTrialOverride.set(allowCustom);

    // Priority order mirrors backend provisioning: tier defaults -> package defaults -> hardcoded fallback.
    const defaultMode = String(tier.defaultTrialMode || selectedPackage?.defaultTrialMode || 'PLAN_BASED_TRIAL')
      .trim()
      .toUpperCase() as TrialMode;
    const defaultDuration = Number(
      tier.defaultTrialDurationDays ?? selectedPackage?.defaultTrialDurationDays ?? 14,
    );
    const allowFull = tier.allowFullFeatureTrial === true || defaultMode === 'FULL_APP_TRIAL';
    this.tierAllowsFullFeatureTrial.set(allowFull);
    const normalizedMode: TrialMode = allowFull ? defaultMode : (defaultMode === 'NONE' ? 'NONE' : 'PLAN_BASED_TRIAL');

    // Apply tier's trial policy to form
    this.accountForm.controls.trialMode.setValue(normalizedMode, { emitEvent: false });
    this.accountForm.controls.trialDurationDays.setValue(defaultDuration, { emitEvent: false });

    // Enable/disable based on tier's override policy
    if (allowCustom) {
      this.accountForm.controls.trialMode.enable({ emitEvent: false });
      this.accountForm.controls.trialDurationDays.enable({ emitEvent: false });
      return;
    }

    this.accountForm.controls.trialMode.disable({ emitEvent: false });
    this.accountForm.controls.trialDurationDays.disable({ emitEvent: false });
  }

  private buildTimezoneOptions(): GomSelectOption[] {
    const intlWithSupportedValues = globalThis.Intl as unknown as {
      supportedValuesOf?: (key: string) => string[];
    };

    const fromIntl = intlWithSupportedValues.supportedValuesOf?.('timeZone') || [];
    const fallback = ['UTC', 'Asia/Kolkata', 'Asia/Dubai', 'Europe/London', 'America/New_York', 'America/Los_Angeles'];
    const zones = fromIntl.length ? fromIntl : fallback;

    return zones.map((zone) => ({ value: zone, label: zone }));
  }

  private generateTenantCode(accountName: string): string {
    let normalized = accountName
      .toLowerCase()
      .trim()
      .replaceAll(/[^a-z0-9]+/g, '_')
      .slice(0, 30);

    while (normalized.startsWith('_')) {
      normalized = normalized.slice(1);
    }

    while (normalized.endsWith('_')) {
      normalized = normalized.slice(0, -1);
    }

    return normalized || 'tenant';
  }

  private toStringValue(value: unknown, fallback = ''): string {
    if (typeof value === 'string') {
      return value;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }

    return fallback;
  }

  private openPendingVerify(payment: PendingVerificationPaymentRecord): void {
    this.selectedPendingPayment.set(payment);
    this.pendingActionType.set('verify');
    this.pendingVerifyForm.reset({ reason: '', overrideReason: '' });
    this.pendingActionModalOpen.set(true);
  }

  private openPendingReject(payment: PendingVerificationPaymentRecord): void {
    this.selectedPendingPayment.set(payment);
    this.pendingActionType.set('reject');
    this.pendingRejectForm.reset({ reason: '' });
    this.pendingActionModalOpen.set(true);
  }

  private openPendingApplyTier(payment: PendingVerificationPaymentRecord): void {
    this.selectedPendingPayment.set(payment);
    this.pendingActionType.set('apply-tier');
    this.pendingActionTierOptions.set([]);
    this.pendingApplyTierForm.reset({ tierId: '', reason: '' });

    const packageId = String((payment as { packageId?: string }).packageId || '').trim();
    if (!packageId) {
      this.toast.error('Cannot load tier options for this payment. Missing package reference.');
      return;
    }

    this.loading.set(true);
    this.entitlementsService.listPackageTiers(packageId, 1, 200).subscribe({
      next: (result) => {
        this.loading.set(false);
        const tiers = Array.isArray(result.items) ? result.items : [];
        this.pendingActionTierOptions.set(tiers.map((tier) => ({
          value: tier._id,
          label: tier.displayName ? `${tier.displayName} (${tier.tierKey})` : tier.tierKey,
        })));

        const currentTierId = typeof payment.tierId === 'object' ? String(payment.tierId._id || '') : '';
        const selectedTierId = tiers.some((tier) => tier._id === currentTierId)
          ? currentTierId
          : (tiers[0]?._id || '');
        this.pendingApplyTierForm.controls.tierId.setValue(selectedTierId);
        this.pendingActionModalOpen.set(true);
      },
      error: (error) => {
        this.loading.set(false);
        this.toast.error(String(error?.error?.message || 'Failed to load tier options'));
      },
    });
  }

  private openPendingSetDuration(payment: PendingVerificationPaymentRecord): void {
    this.selectedPendingPayment.set(payment);
    this.pendingActionType.set('set-duration');
    this.pendingSetDurationForm.reset({ durationCode: payment.durationCode, reason: '' });
    this.pendingActionModalOpen.set(true);
  }

  closePendingActionModal(): void {
    if (this.loading()) {
      return;
    }
    this.pendingActionModalOpen.set(false);
    this.pendingActionType.set(null);
    this.selectedPendingPayment.set(null);
    this.pendingActionTierOptions.set([]);
  }

  savePendingAction(): void {
    const payment = this.selectedPendingPayment();
    const action = this.pendingActionType();
    if (!payment || !action) {
      return;
    }

    const errors = this.getPendingActionErrors(true);
    if (errors.length > 0) {
      this.toast.error(errors[0]);
      return;
    }

    this.loading.set(true);
    if (action === 'verify') {
      const verifyPayload = {
        reason: String(this.pendingVerifyForm.controls.reason.value || '').trim() || undefined,
        overrideReason: String(this.pendingVerifyForm.controls.overrideReason.value || '').trim() || undefined,
      };
      this.service.verifyPayment(payment._id, verifyPayload).subscribe({
        next: () => {
          this.loading.set(false);
          this.closePendingActionModal();
          this.toast.success('Payment verified');
          this.loadPendingVerification();
          this.loadAccounts();
        },
        error: (error) => {
          this.loading.set(false);
          this.toast.error(String(error?.error?.message || 'Failed to verify payment'));
        },
      });
      return;
    }

    if (action === 'reject') {
      const rejectPayload = {
        reason: String(this.pendingRejectForm.controls.reason.value || '').trim(),
      };
      this.service.rejectPayment(payment._id, rejectPayload).subscribe({
        next: () => {
          this.loading.set(false);
          this.closePendingActionModal();
          this.toast.success('Payment rejected');
          this.loadPendingVerification();
        },
        error: (error) => {
          this.loading.set(false);
          this.toast.error(String(error?.error?.message || 'Failed to reject payment'));
        },
      });
      return;
    }

    if (action === 'apply-tier') {
      const applyTierPayload = {
        tierId: String(this.pendingApplyTierForm.controls.tierId.value || '').trim(),
        reason: String(this.pendingApplyTierForm.controls.reason.value || '').trim() || undefined,
      };
      this.service.applyPaymentTier(payment._id, applyTierPayload).subscribe({
        next: () => {
          this.loading.set(false);
          this.closePendingActionModal();
          this.toast.success('Payment tier updated');
          this.loadPendingVerification();
        },
        error: (error) => {
          this.loading.set(false);
          this.toast.error(String(error?.error?.message || 'Failed to update payment tier'));
        },
      });
      return;
    }

    const durationPayload = {
      durationCode: this.pendingSetDurationForm.controls.durationCode.value as BillingDurationCode,
      reason: String(this.pendingSetDurationForm.controls.reason.value || '').trim() || undefined,
    };
    this.service.setPaymentDuration(payment._id, durationPayload).subscribe({
      next: () => {
        this.loading.set(false);
        this.closePendingActionModal();
        this.toast.success('Payment duration updated');
        this.loadPendingVerification();
      },
      error: (error) => {
        this.loading.set(false);
        this.toast.error(String(error?.error?.message || 'Failed to update payment duration'));
      },
    });
  }

  private getPendingActionErrors(includeUntouched: boolean): string[] {
    const action = this.pendingActionType();
    const errors: string[] = [];

    if (action === 'reject') {
      const control = this.pendingRejectForm.controls.reason;
      if (control.invalid && (includeUntouched || control.touched || control.dirty)) {
        errors.push('Reason is required to reject payment.');
      }
      return errors;
    }

    if (action === 'apply-tier') {
      const control = this.pendingApplyTierForm.controls.tierId;
      if (control.invalid && (includeUntouched || control.touched || control.dirty)) {
        errors.push('Tier selection is required.');
      }
      return errors;
    }

    if (action === 'set-duration') {
      const control = this.pendingSetDurationForm.controls.durationCode;
      if (control.invalid && (includeUntouched || control.touched || control.dirty)) {
        errors.push('Duration selection is required.');
      }
      return errors;
    }

    return errors;
  }

  openPaymentRequest(account: TenantAccount): void {
    this.selectedPaymentAccount.set(account);
    this.paymentRequestedAt.set(new Date());
    this.paymentTierOptions.set([]);
    this.paymentTierMaps.set([]);
    this.paymentContext.set(null);
    this.paymentRequestForm.reset({
      paymentId: '',
      referenceNumber: '',
      tierId: account.tierId || '',
      durationCode: '1_MONTH',
      paidAmount: 0,
      manualDiscountPercent: 0,
      manualDiscountReason: '',
      paymentMethod: 'UPI',
      paymentProof: '',
    });

    const packageId = String(account.packageId || '').trim();
    if (packageId) {
      this.loading.set(true);
      this.entitlementsService.listPackageTiers(packageId, 1, 200).subscribe({
        next: (result) => {
          this.loading.set(false);
          const tiers = Array.isArray(result.items) ? result.items : [];
          this.paymentTierMaps.set(tiers);
          this.paymentTierOptions.set(tiers.map((tier) => ({
            value: tier._id,
            label: tier.displayName ? `${tier.displayName} (${tier.tierKey})` : tier.tierKey,
          })));

          const currentTierId = String(this.paymentRequestForm.controls.tierId.value || '').trim();
          const selectedTierId = tiers.some((tier) => tier._id === currentTierId)
            ? currentTierId
            : (tiers[0]?._id || '');

          this.paymentRequestForm.controls.tierId.setValue(selectedTierId, { emitEvent: false });
          this.syncPaymentDurationForSelectedTier();
          this.syncPaymentDefaultPaidAmount();
        },
        error: (error) => {
          this.loading.set(false);
          this.toast.error(String(error?.error?.message || 'Failed to load pricing tiers for payment'));
          this.paymentTierMaps.set([]);
          this.paymentTierOptions.set([]);
        },
      });
    }

    this.service.getPaymentContext(account._id).subscribe({
      next: (context) => {
        this.paymentContext.set(context);
      },
      error: () => {
        this.paymentContext.set(null);
      },
    });

    this.paymentModalOpen.set(true);
  }

  cancelPaymentRequest(): void {
    this.paymentModalOpen.set(false);
    this.selectedPaymentAccount.set(null);
    this.paymentRequestedAt.set(null);
    this.paymentTierMaps.set([]);
    this.paymentTierOptions.set([]);
    this.paymentContext.set(null);
  }

  savePaymentRequest(): void {
    const account = this.selectedPaymentAccount();
    if (!account) {
      return;
    }

    if (this.paymentRequestForm.invalid) {
      this.paymentRequestForm.markAllAsTouched();
      const errors = this.getPaymentFormErrors(true);
      this.toast.error(errors[0] || 'Please complete required payment fields');
      return;
    }

    const pricing = this.getPaymentPricingPreview();
    if (!pricing) {
      this.toast.error('Selected tier does not have an enabled pricing cycle for the chosen duration');
      return;
    }

    const raw = this.paymentRequestForm.getRawValue();
    const selectedTier = this.paymentTierMaps().find((item) => item._id === String(raw.tierId || '').trim()) || null;
    const discountPercent = Number(raw.manualDiscountPercent || 0);
    const discountReason = String(raw.manualDiscountReason || '').trim();

    if (discountPercent > 0 && !discountReason) {
      this.toast.error('Discount reason is required when additional discount is greater than 0');
      return;
    }

    const requestPayload = {
      paymentId: String(raw.paymentId || '').trim(),
      referenceNumber: String(raw.referenceNumber || '').trim(),
      durationCode: raw.durationCode as BillingDurationCode,
      paymentMethod: raw.paymentMethod as PaymentMethod,
      packageId: selectedTier?.packageId || account.packageId || undefined,
      tierId: String(raw.tierId || '').trim(),
      paidAmount: Number(raw.paidAmount || 0),
      manualDiscountPercent: discountPercent,
      manualDiscountReason: discountPercent > 0 ? discountReason : undefined,
    };

    this.loading.set(true);
    this.service.requestPayment(account._id, requestPayload).subscribe({
      next: () => {
        const paymentProof = String(raw.paymentProof || '').trim();
        if (!paymentProof) {
          this.loading.set(false);
          this.paymentModalOpen.set(false);
          this.selectedPaymentAccount.set(null);
          this.paymentRequestedAt.set(null);
          this.paymentTierMaps.set([]);
          this.paymentTierOptions.set([]);
          this.paymentContext.set(null);
          this.toast.success('Payment request created');
          this.loadPendingVerification();
          return;
        }

        this.service.uploadPaymentProof(account._id, {
          paymentId: requestPayload.paymentId,
          paymentProof,
          referenceNumber: requestPayload.referenceNumber,
        }).subscribe({
          next: () => {
            this.loading.set(false);
            this.paymentModalOpen.set(false);
            this.selectedPaymentAccount.set(null);
            this.paymentRequestedAt.set(null);
            this.paymentTierMaps.set([]);
            this.paymentTierOptions.set([]);
            this.paymentContext.set(null);
            this.toast.success('Payment request and proof submitted');
            this.loadPendingVerification();
          },
          error: (error) => {
            this.loading.set(false);
            this.toast.error(String(error?.error?.message || 'Payment request created but proof upload failed'));
            this.loadPendingVerification();
          },
        });
      },
      error: (error) => {
        this.loading.set(false);
        const message = String(error?.error?.message || 'Failed to create payment request');
        if (message.toLowerCase().includes('mapped to a valid package and tier')) {
          this.toast.error('This account is missing package/tier mapping. Open View/Edit and complete package/tier selection, then retry payment request.');
          return;
        }
        this.toast.error(message);
      },
    });
  }

  private loadPendingVerification(): void {
    this.pendingLoading.set(true);
    this.service.listPendingVerification({ page: 1, limit: 100 }).subscribe({
      next: (result) => {
        this.pendingLoading.set(false);
        this.pendingPayments.set(result.items || []);
      },
      error: () => {
        this.pendingLoading.set(false);
        this.pendingPayments.set([]);
      },
    });
  }

  private getPaymentFormErrors(includeUntouched: boolean): string[] {
    const errors: string[] = [];
    const form = this.paymentRequestForm;
    const controlMap: Array<{ key: keyof typeof form.controls; label: string }> = [
      { key: 'paymentId', label: 'Payment ID' },
      { key: 'tierId', label: 'Tier' },
      { key: 'durationCode', label: 'Duration' },
      { key: 'paidAmount', label: 'Paid Amount' },
      { key: 'manualDiscountPercent', label: 'Additional Discount (%)' },
      { key: 'paymentMethod', label: 'Payment Method' },
    ];

    controlMap.forEach((entry) => {
      const control = form.controls[entry.key];
      if (!control || !control.invalid) {
        return;
      }
      if (!includeUntouched && !control.touched && !control.dirty) {
        return;
      }
      if (control.hasError('required')) {
        errors.push(`${entry.label} is required.`);
        return;
      }
      if (control.hasError('min') && entry.key === 'paidAmount') {
        errors.push('Paid Amount must be zero or greater.');
        return;
      }
      if (control.hasError('min') && entry.key === 'manualDiscountPercent') {
        errors.push('Additional Discount (%) cannot be less than 0.');
        return;
      }
      if (control.hasError('max') && entry.key === 'manualDiscountPercent') {
        errors.push('Additional Discount (%) cannot exceed 100.');
        return;
      }
      errors.push(`${entry.label} is invalid.`);
    });

    const discountPercentControl = form.controls.manualDiscountPercent;
    const discountReasonControl = form.controls.manualDiscountReason;
    const discountPercent = Number(discountPercentControl.value || 0);
    if (discountPercent > 0) {
      const reason = String(discountReasonControl.value || '').trim();
      const shouldValidateReason = includeUntouched || discountReasonControl.touched || discountReasonControl.dirty;
      if (!reason && shouldValidateReason) {
        errors.push('Discount Reason is required when Additional Discount (%) is greater than 0.');
      }
    }

    if (this.paymentTierOptions().length === 0) {
      errors.push('No active tier is available for this account package.');
    }

    if (this.paymentDurationOptions().length === 0) {
      errors.push('No enabled payment durations are configured for the selected tier.');
    }

    const pricing = this.getPaymentPricingPreview();
    if (!pricing) {
      errors.push('Selected duration is not enabled for the selected tier.');
    }

    return errors;
  }

  getPaymentPricingPreview(): {
    currency: string;
    baseAmount: number;
    tierDiscountPercent: number;
    tierDiscountAmount: number;
    tierFinalAmount: number;
    manualDiscountPercent: number;
    manualDiscountAmount: number;
    expectedAmount: number;
    paidAmount: number;
    difference: number;
    amountMatchStatus: 'MATCH' | 'UNDERPAID' | 'OVERPAID';
  } | null {
    const account = this.selectedPaymentAccount();
    const raw = this.paymentRequestForm.getRawValue();
    const selectedTierId = String(raw.tierId || '').trim();
    const durationCode = String(raw.durationCode || '').trim().toUpperCase();
    const tier = this.paymentTierMaps().find((item) => item._id === selectedTierId) || null;

    if (!tier) {
      return null;
    }

    const cycle = (tier.cyclePricing || []).find((item) => String(item.durationCode || '').trim().toUpperCase() === durationCode);
    if (!cycle || cycle.isEnabled === false) {
      return null;
    }

    const baseAmount = this.roundCurrency(Number(cycle.baseAmount ?? cycle.finalAmount ?? 0));
    const tierFinalAmount = this.roundCurrency(Number(cycle.finalAmount ?? baseAmount));
    const tierDiscountPercent = this.roundCurrency(Number(cycle.discountPercent ?? 0));
    const tierDiscountAmount = this.roundCurrency(Math.max(baseAmount - tierFinalAmount, 0));

    const manualDiscountPercent = Math.min(100, Math.max(0, this.roundCurrency(Number(raw.manualDiscountPercent || 0))));
    const manualDiscountAmount = this.roundCurrency((tierFinalAmount * manualDiscountPercent) / 100);
    const expectedAmount = this.roundCurrency(Math.max(tierFinalAmount - manualDiscountAmount, 0));

    const paidAmount = this.roundCurrency(Number(raw.paidAmount || 0));
    const difference = this.roundCurrency(paidAmount - expectedAmount);

    let amountMatchStatus: 'MATCH' | 'UNDERPAID' | 'OVERPAID' = 'MATCH';
    if (difference < 0) {
      amountMatchStatus = 'UNDERPAID';
    } else if (difference > 0) {
      amountMatchStatus = 'OVERPAID';
    }

    return {
      currency: String(tier.currency || account?.currency || 'INR').trim().toUpperCase(),
      baseAmount,
      tierDiscountPercent,
      tierDiscountAmount,
      tierFinalAmount,
      manualDiscountPercent,
      manualDiscountAmount,
      expectedAmount,
      paidAmount,
      difference,
      amountMatchStatus,
    };
  }

  getPaymentMatchBadgeClass(): string {
    const pricing = this.getPaymentPricingPreview();
    if (!pricing) {
      return 'saas-accounts__match-badge saas-accounts__match-badge--neutral';
    }

    if (pricing.amountMatchStatus === 'MATCH') {
      return 'saas-accounts__match-badge saas-accounts__match-badge--ok';
    }

    return 'saas-accounts__match-badge saas-accounts__match-badge--warn';
  }

  getPaymentDifferenceLabel(): string {
    const pricing = this.getPaymentPricingPreview();
    if (!pricing) {
      return 'Difference';
    }

    if (pricing.amountMatchStatus === 'UNDERPAID') {
      return 'Underpaid By';
    }

    if (pricing.amountMatchStatus === 'OVERPAID') {
      return 'Overpaid By';
    }

    return 'Difference';
  }

  getPaymentDifferenceAmount(): number {
    const pricing = this.getPaymentPricingPreview();
    if (!pricing) {
      return 0;
    }

    return Math.abs(pricing.difference);
  }

  private roundCurrency(value: number): number {
    return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
  }

  getCurrentSubscriptionStatusLabel(): string {
    const context = this.paymentContext();
    if (!context?.currentSubscription?.subscriptionEndAt) {
      return 'NO_END_DATE';
    }

    return context.currentSubscription.isExpired ? 'EXPIRED_ON' : 'ACTIVE_UNTIL';
  }

  getCurrentSubscriptionStatusChipClass(): string {
    const context = this.paymentContext();
    if (!context?.currentSubscription?.subscriptionEndAt) {
      return 'saas-accounts__status-chip saas-accounts__status-chip--neutral';
    }

    return context.currentSubscription.isExpired
      ? 'saas-accounts__status-chip saas-accounts__status-chip--danger'
      : 'saas-accounts__status-chip saas-accounts__status-chip--ok';
  }

  getCurrentSubscriptionDaysLabel(): string {
    const context = this.paymentContext();
    if (!context?.currentSubscription?.subscriptionEndAt) {
      return 'No subscription end date available';
    }

    const delta = Number(context.currentSubscription.daysDelta || 0);
    if (context.currentSubscription.isExpired) {
      return `${Math.abs(delta)} day(s) expired`;
    }
    return `${Math.max(delta, 0)} day(s) remaining`;
  }

  getPriceDeltaAgainstPrevious(): number {
    const pricing = this.getPaymentPricingPreview();
    const previousExpected = Number(this.paymentContext()?.previousPayment?.expectedAmountAtRequest || 0);
    if (!pricing || !previousExpected) {
      return 0;
    }

    return this.roundCurrency(pricing.expectedAmount - previousExpected);
  }

  getPaymentActionHintChipClass(): string {
    const hint = this.paymentActionHint();
    if (hint === 'UPGRADE') {
      return 'saas-accounts__status-chip saas-accounts__status-chip--info';
    }
    if (hint === 'DOWNGRADE') {
      return 'saas-accounts__status-chip saas-accounts__status-chip--warn';
    }
    if (hint === 'REACTIVATION') {
      return 'saas-accounts__status-chip saas-accounts__status-chip--danger';
    }
    return 'saas-accounts__status-chip saas-accounts__status-chip--ok';
  }

  private extractTierNumber(tierKey: string): number | null {
    const match = /^TIER_(\d{1,2})$/i.exec(String(tierKey || '').trim());
    if (!match) {
      return null;
    }
    return Number(match[1]);
  }

  private setupPaymentPricingListeners(): void {
    this.paymentRequestForm.controls.tierId.valueChanges.subscribe(() => {
      this.syncPaymentDurationForSelectedTier();
      this.syncPaymentDefaultPaidAmount();
    });

    this.paymentRequestForm.controls.durationCode.valueChanges.subscribe(() => {
      this.syncPaymentDefaultPaidAmount();
    });

    this.paymentRequestForm.controls.manualDiscountPercent.valueChanges.subscribe(() => {
      this.syncPaymentDefaultPaidAmount();
    });
  }

  private syncPaymentDurationForSelectedTier(): void {
    const options = this.paymentDurationOptions();
    const currentDurationCode = String(this.paymentRequestForm.controls.durationCode.value || '').trim().toUpperCase();
    const hasCurrent = options.some((item) => String(item.value || '').trim().toUpperCase() === currentDurationCode);

    if (hasCurrent) {
      return;
    }

    this.paymentRequestForm.controls.durationCode.setValue((options[0]?.value as BillingDurationCode) || ('' as BillingDurationCode), { emitEvent: false });
  }

  private syncPaymentDefaultPaidAmount(): void {
    const paidAmountControl = this.paymentRequestForm.controls.paidAmount;
    if (paidAmountControl.dirty) {
      return;
    }

    const pricing = this.getPaymentPricingPreview();
    if (!pricing) {
      return;
    }

    paidAmountControl.setValue(pricing.expectedAmount, { emitEvent: false });
  }

  saveStatusTransition(): void {
    const account = this.selectedAccount();
    if (!account || this.statusForm.invalid) {
      return;
    }

    const nextStatus = this.statusForm.controls.status.value as AccountStatus;
    const reason = this.statusForm.controls.reason.value || '';

    this.loading.set(true);
    this.service.updateStatus(account._id, nextStatus, reason).subscribe({
      next: () => {
        this.loading.set(false);
        this.statusModalOpen.set(false);
        this.toast.success('Account status updated');
        this.loadAccounts();
      },
      error: (error) => {
        this.loading.set(false);
        this.toast.error(String(error?.error?.message || 'Failed to update status'));
      },
    });
  }

  saveTrialExtension(): void {
    const account = this.selectedAccount();
    if (!account || this.trialForm.invalid) {
      return;
    }

    const extensionDays = Number(this.trialForm.controls.extensionDays.value || 0);
    const reason = this.trialForm.controls.reason.value || '';

    this.loading.set(true);
    this.service.extendTrial(account._id, extensionDays, reason).subscribe({
      next: () => {
        this.loading.set(false);
        this.trialModalOpen.set(false);
        this.toast.success('Trial extended successfully');
        this.loadAccounts();
      },
      error: (error) => {
        this.loading.set(false);
        this.toast.error(String(error?.error?.message || 'Failed to extend trial'));
      },
    });
  }

  openAudit(accountId: string): void {
    this.loading.set(true);
    this.service.getAuditLog(accountId).subscribe({
      next: (response) => {
        this.loading.set(false);
        this.auditLogs.set(response.items);
        this.auditModalOpen.set(true);
      },
      error: (error) => {
        this.loading.set(false);
        this.toast.error(String(error?.error?.message || 'Failed to load audit log'));
      },
    });
  }
}
