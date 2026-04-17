import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { startWith } from 'rxjs';

import { GomAlertToastService } from '../../../shared/components/alert';
import { GomButtonComponent, GomInputComponent, GomSelectComponent, GomSelectOption, GomTextareaComponent } from '../../../shared/components/form-controls';
import { GomModalComponent } from '../../../shared/components/modal';
import { GomTableColumn, GomTableComponent, GomTableRow } from '../../../shared/components/table';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { SaasAccountService } from './saas-account.service';
import { AccountStatus, AuditLogItem, CreateAccountRequest, TenantAccount, TrialMode, UpdateAccountRequest } from './saas-account.model';
import { EntitlementsService } from '../entitlements/entitlements.service';

interface AccountRow extends GomTableRow {
  id: string;
  accountName: string;
  tenantCode: string;
  planId: string;
  status: AccountStatus;
  trialEndAt: string;
  updatedAt: string;
}

@Component({
  selector: 'gom-saas-accounts',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TranslateModule,
    GomButtonComponent,
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
  readonly canWrite = computed(() => this.authSession.canWrite('platform-admin'));
  readonly accounts = signal<TenantAccount[]>([]);
  readonly page = signal(1);
  readonly limit = signal(20);
  readonly total = signal(0);
  readonly search = signal('');
  readonly statusFilter = signal('');
  readonly tenantCodeAutoMode = signal(true);
  readonly timezoneSearch = signal('');

  readonly formModalOpen = signal(false);
  readonly statusModalOpen = signal(false);
  readonly trialModalOpen = signal(false);
  readonly auditModalOpen = signal(false);
  readonly editingAccountId = signal<string | null>(null);
  readonly selectedAccount = signal<TenantAccount | null>(null);
  readonly auditLogs = signal<AuditLogItem[]>([]);
  readonly lastBootstrapMessage = signal('');

  readonly statusOptions: GomSelectOption[] = [
    { value: '', label: 'All Statuses' },
    { value: 'TRIAL', label: 'TRIAL' },
    { value: 'ACTIVE', label: 'ACTIVE' },
    { value: 'SUSPENDED', label: 'SUSPENDED' },
    { value: 'CANCELLED', label: 'CANCELLED' },
  ];

  readonly trialModeOptions: GomSelectOption[] = [
    { value: 'FULL_APP_TRIAL', label: 'FULL_APP_TRIAL' },
    { value: 'PLAN_BASED_TRIAL', label: 'PLAN_BASED_TRIAL' },
    { value: 'NONE', label: 'NONE' },
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

  readonly nextStatusOptions = computed<GomSelectOption[]>(() => {
    const account = this.selectedAccount();
    if (!account) {
      return [];
    }

    const transitions: Record<AccountStatus, AccountStatus[]> = {
      TRIAL: ['ACTIVE', 'SUSPENDED', 'CANCELLED'],
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

  readonly rows = computed<AccountRow[]>(() =>
    this.accounts().map((item) => ({
      id: item._id,
      accountName: item.accountName,
      tenantCode: item.tenantCode,
      planId: item.planId,
      status: item.accountStatus,
      trialEndAt: item.trialEndAt ? new Date(item.trialEndAt).toLocaleDateString() : '-',
      updatedAt: new Date(item.updatedAt).toLocaleDateString(),
    })),
  );

  readonly hasRows = computed(() => this.rows().length > 0);

  readonly validationErrors = computed<string[]>(() => {
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
      { key: 'planId', label: 'Plan Id' },
      { key: 'trialMode', label: 'Trial Mode' },
      { key: 'trialDurationDays', label: 'Trial Duration' },
    ];

    controlMap.forEach((entry) => {
      const control = form.get(entry.key);
      if (control && control.invalid && (control.touched || control.dirty)) {
        errors.push(`${entry.label} is invalid or missing.`);
      }
    });

    return errors;
  });

  readonly columns: GomTableColumn<AccountRow>[] = [
    { key: 'accountName', header: 'Account', sortable: true, width: '18rem' },
    { key: 'tenantCode', header: 'Tenant Code', sortable: true, width: '12rem' },
    { key: 'planId', header: 'Plan', sortable: true, width: '10rem' },
    { key: 'status', header: 'Status', width: '10rem' },
    { key: 'trialEndAt', header: 'Trial End', width: '10rem' },
    { key: 'updatedAt', header: 'Updated', width: '10rem' },
    {
      key: 'id',
      header: 'Actions',
      width: '24rem',
      actionButtons: [
        { label: 'View/Edit', icon: 'ri-pencil-line', actionKey: 'edit', variant: 'secondary' },
        { label: 'Change Status', icon: 'ri-refresh-line', actionKey: 'status', variant: 'secondary' },
        { label: 'Extend Trial', icon: 'ri-calendar-event-line', actionKey: 'extend-trial', variant: 'secondary' },
        { label: 'View Audit Log', icon: 'ri-history-line', actionKey: 'audit', variant: 'secondary' },
      ],
    },
  ];

  ngOnInit(): void {
    this.setupTenantCodeAutoGeneration();
    this.loadPlanOptions();
    this.loadAccounts();
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
    this.service.listAccounts(this.page(), this.limit(), this.search(), this.statusFilter()).subscribe({
      next: (response) => {
        this.accounts.set(response.items);
        this.total.set(response.meta.total);
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
    this.page.set(1);
    this.loadAccounts();
  }

  onStatusFilterChange(value: string): void {
    this.statusFilter.set(value);
    this.page.set(1);
    this.loadAccounts();
  }

  onTimezoneSearchChange(value: string): void {
    this.timezoneSearch.set(value.trim());
  }

  openCreate(): void {
    this.editingAccountId.set(null);
    this.configureFirstAdminPasswordValidation(true);
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
      planId: '',
      billingEmail: '',
      supportPhone: '',
      notes: '',
      trialMode: 'PLAN_BASED_TRIAL',
      trialDurationDays: 14,
    });
    this.accountForm.controls.tenantCode.disable();

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
    }
  }

  openEdit(id: string): void {
    this.loading.set(true);
    this.service.getAccountById(id).subscribe({
      next: (account) => {
        this.loading.set(false);
        this.editingAccountId.set(id);
        this.configureFirstAdminPasswordValidation(false);
        this.tenantCodeAutoMode.set(false);
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
          planId: account.planId,
          billingEmail: account.billingEmail || '',
          supportPhone: account.supportPhone || '',
          notes: account.notes || '',
          trialMode: account.trialMode,
          trialDurationDays: account.trialDurationDays,
        });
        this.accountForm.controls.tenantCode.disable();
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
      this.toast.error('Please complete required fields');
      return;
    }

    if (!this.hasPlanOptions()) {
      this.toast.error('Create at least one active package before creating a SaaS account');
      return;
    }

    const raw = this.accountForm.getRawValue();

    const editId = this.editingAccountId();
    this.loading.set(true);

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
        billingEmail: raw.billingEmail || undefined,
        supportPhone: raw.supportPhone || undefined,
        notes: raw.notes || undefined,
      };

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
      legalBusinessName: raw.legalBusinessName || '',
      tenantCode: raw.tenantCode || '',
      primaryContactName: raw.primaryContactName || '',
      primaryContactPhone: raw.primaryContactPhone || '',
      primaryContactEmail: raw.primaryContactEmail || '',
      firstTenantAdminName: raw.firstTenantAdminName || '',
      firstTenantAdminEmail: raw.firstTenantAdminEmail || '',
      firstTenantAdminPassword: raw.firstTenantAdminPassword || '',
      countryCode: raw.countryCode || 'IN',
      currency: raw.currency || 'INR',
      timezone: raw.timezone || 'Asia/Kolkata',
      planId: raw.planId || 'starter',
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
        const bootstrapMessage = bootstrapInfo
          ? `First tenant admin ${bootstrapInfo.fullName} (${bootstrapInfo.email}) created with role ${bootstrapInfo.roleKey}.`
          : 'SaaS account created.';
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
        const options = (activePlans.length ? activePlans : plans).map((plan) => ({
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
    if (isCreateMode) {
      control.setValidators([Validators.required, Validators.minLength(8)]);
    } else {
      control.clearValidators();
      control.setValue('');
    }
    control.updateValueAndValidity({ emitEvent: false });
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
    const normalized = accountName
      .toLowerCase()
      .trim()
      .replaceAll(/[^a-z0-9]+/g, '_')
      .replaceAll(/^_+|_+$/g, '')
      .slice(0, 30);

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
