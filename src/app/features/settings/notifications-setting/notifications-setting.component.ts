import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import {
  FormControlsModule,
  GomAlertToastService,
  GomButtonComponent,
  GomModalComponent,
  GomSelectOption,
  GomTabContentComponent,
  GomTabsComponent,
  GomTableColumn,
  GomTableComponent,
  GomTableFilterDefinition,
  GomTableFilterNavigationRow,
  GomTableQuery,
  GomTableRow,
  TabItem,
} from '@gomlibs/ui';
import { firstValueFrom } from 'rxjs';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { NotificationDispatchDto, NotificationDispatchService } from './notification-dispatch.service';
import {
  NotificationChannel,
  NotificationRecipientConfigDto,
  NotificationRecipientConfigPayload,
  NotificationRecipientRoleOption,
  NotificationRecipientUserOption,
  NotificationTemplateDto,
  NotificationTemplateService,
  NotificationTemplateUpsertPayload,
  RecipientType,
  TemplateStatus,
} from './notification-template.service';
import { PageHeadingComponent } from '../../../shared/components/page-heading/page-heading.component';

interface TemplateSeed {
  eventCode: string;
  eventLabel: string;
  category: 'offline' | 'delivery';
}

interface NotificationTemplate {
  id: string;
  templateName: string;
  eventCode: string;
  eventLabel: string;
  channel: NotificationChannel;
  recipientType: RecipientType;
  status: TemplateStatus;
  subject: string;
  body: string;
  systemTemplate: boolean;
  updatedAt: string;
}

interface NotificationTemplateRow extends GomTableRow {
  id: string;
  templateName: string;
  event: string;
  channel: string;
  recipientType: string;
  status: string;
  lastModified: string;
  action: string;
}

interface NotificationSettingRow {
  eventCode: string;
  eventLabel: string;
  eventHint: string;
  enabled: boolean;
  activeChannelCount: number;
  recipientCount: number;
  channels: Record<NotificationChannel, boolean>;
}

interface RecipientConfigDraft {
  eventCode: string;
  includeCustomer: boolean;
  includeAllActiveUsers: boolean;
  roleIds: string[];
  userIds: string[];
  updatedAt?: string | null;
}

interface NotificationDispatchRow {
  id: string;
  channel: string;
  state: string;
  orderNo: string;
  templateKey: string;
  attempts: number;
  maxAttempts: number;
  lastError: string;
  failureCategory: string;
  createdAt: string;
  sentAt: string;
  nextRetryAt: string;
}

const OFFLINE_EVENT_SEEDS: TemplateSeed[] = [
  { eventCode: 'PLACED', eventLabel: 'Order Created', category: 'offline' },
  { eventCode: 'CONFIRMED', eventLabel: 'Order Confirmed', category: 'offline' },
  { eventCode: 'PACKED', eventLabel: 'Order Packed', category: 'offline' },
  { eventCode: 'DELIVERED', eventLabel: 'Order Delivered', category: 'offline' },
  { eventCode: 'CANCELLED', eventLabel: 'Order Cancelled', category: 'offline' },
  { eventCode: 'RETURN_REQUESTED', eventLabel: 'Return Requested', category: 'offline' },
  { eventCode: 'RETURN_APPROVED', eventLabel: 'Return Approved', category: 'offline' },
  { eventCode: 'RETURN_IN_TRANSIT', eventLabel: 'Return In Transit', category: 'offline' },
  { eventCode: 'RETURNED', eventLabel: 'Order Returned', category: 'offline' },
  { eventCode: 'REFUNDED', eventLabel: 'Order Refunded', category: 'offline' },
];

const DELIVERY_EVENT_SEEDS: TemplateSeed[] = [
  { eventCode: 'ASSIGNED', eventLabel: 'Order Assigned', category: 'delivery' },
  { eventCode: 'SHIPPED', eventLabel: 'Order Shipped', category: 'delivery' },
  { eventCode: 'DISPATCHED', eventLabel: 'Order Dispatched', category: 'delivery' },
  { eventCode: 'ATTEMPTED_DELIVERY', eventLabel: 'Attempted Delivery', category: 'delivery' },
];

const CHANNEL_ORDER: NotificationChannel[] = ['IN_APP', 'PUSH', 'EMAIL'];

const DYNAMIC_FIELD_GROUPS: Array<{ title: string; fields: string[] }> = [
  { title: 'Customer Fields', fields: ['{{customer_name}}', '{{customer_phone}}', '{{customer_email}}'] },
  { title: 'Order Fields', fields: ['{{order_number}}', '{{order_amount}}', '{{order_date}}', '{{order_status}}', '{{order_items}}'] },
  { title: 'Business Fields', fields: ['{{business_name}}', '{{store_name}}', '{{store_address}}', '{{store_phone}}'] },
];

const EVENT_HINTS: Record<string, string> = {
  PLACED: 'Notify when a new order is placed.',
  CONFIRMED: 'Notify when order confirmation is completed.',
  PACKED: 'Notify when order packing is completed.',
  ASSIGNED: 'Notify when order is assigned for delivery.',
  SHIPPED: 'Notify when order is shipped.',
  DISPATCHED: 'Notify when order is dispatched.',
  ATTEMPTED_DELIVERY: 'Notify when delivery is attempted.',
  DELIVERED: 'Notify when order is delivered.',
  CANCELLED: 'Notify when order is cancelled.',
  RETURN_REQUESTED: 'Notify when a return is requested.',
  RETURN_APPROVED: 'Notify when a return request is approved.',
  RETURN_IN_TRANSIT: 'Notify when return is in transit.',
  RETURNED: 'Notify when order is returned.',
  REFUNDED: 'Notify when refund is processed.',
};

@Component({
  selector: 'gom-notifications-setting',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormControlsModule,
    PageHeadingComponent,
    GomTabsComponent,
    GomTabContentComponent,
    GomTableComponent,
    GomButtonComponent,
    GomModalComponent,
  ],
  templateUrl: './notifications-setting.component.html',
  styleUrl: './notifications-setting.component.scss',
})
export class NotificationsSettingComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(GomAlertToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly authSession = inject(AuthSessionService);
  private readonly templateService = inject(NotificationTemplateService);
  private readonly dispatchService = inject(NotificationDispatchService);

  readonly tabs: TabItem[] = [
    { id: 'templates', label: 'Notification Templates' },
    { id: 'settings', label: 'Notification Settings' },
  ];

  readonly channels: NotificationChannel[] = ['IN_APP', 'PUSH', 'EMAIL'];
  readonly filterDefinitions: GomTableFilterDefinition<NotificationTemplateRow>[] = [
    {
      key: 'channel',
      label: 'Channel',
      type: 'multi-select',
      placement: 'both',
      options: [
        { label: 'In-App', value: 'In-App' },
        { label: 'Push', value: 'Push' },
        { label: 'Email', value: 'Email' },
      ],
      mobileControl: 'chips',
    },
    {
      key: 'event',
      label: 'Event',
      type: 'multi-select',
      placement: 'both',
      optionSource: 'rows',
      searchable: true,
      mobileControl: 'checkboxes',
    },
    {
      key: 'status',
      label: 'Status',
      type: 'multi-select',
      placement: 'both',
      options: [
        { label: 'Active', value: 'Active' },
        { label: 'Inactive', value: 'Inactive' },
      ],
      mobileControl: 'chips',
    },
  ];
  readonly filterNavigationRows: GomTableFilterNavigationRow<NotificationTemplateRow>[] = [
    {
      key: 'event',
      label: 'Event',
      showCounts: true,
      options: [],
    },
  ];

  readonly columns: GomTableColumn<NotificationTemplateRow>[] = [
    { key: 'templateName', header: 'Template Name', sortable: true, width: '18rem' },
    { key: 'event', header: 'Event', sortable: true, width: '10rem', filterable: true },
    { key: 'channel', header: 'Channel', sortable: true, width: '9rem', filterable: true },
    { key: 'recipientType', header: 'Recipient Type', sortable: true, width: '9rem' },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      width: '8rem',
      chipTone: (value) => this.toNormalizedString(value).toLowerCase() === 'active' ? 'success' : 'neutral',
    },
    { key: 'lastModified', header: 'Last Modified', sortable: true, width: '9rem' },
    {
      key: 'action',
      header: 'Action',
      width: '10rem',
      actionButtons: [
        {
          label: 'Edit',
          icon: 'ri-edit-line',
          actionKey: 'edit',
          variant: 'secondary',
        },
        {
          label: 'Preview',
          icon: 'ri-eye-line',
          actionKey: 'preview',
          variant: 'secondary',
        },
      ],
    },
  ];

  readonly editorOpen = signal(false);
  readonly selectedTemplateId = signal<string | null>(null);
  readonly previewOpen = signal(false);
  readonly previewTemplate = signal<NotificationTemplate | null>(null);
  readonly settingsEditorOpen = signal(false);
  readonly settingsBusy = signal(false);
  readonly recipientOptionsLoading = signal(false);
  readonly recipientConfigLoading = signal(false);
  readonly selectedSettingEventCode = signal<string | null>(null);
  readonly settingsChannelDraft = signal<Record<NotificationChannel, boolean>>({ IN_APP: false, PUSH: false, EMAIL: false });
  readonly settingsEventEnabledDraft = signal(false);
  readonly settingsIncludeCustomerDraft = signal(true);
  readonly settingsIncludeAllUsersDraft = signal(false);
  readonly settingsRoleIdsDraft = signal<string[]>([]);
  readonly settingsUserIdsDraft = signal<string[]>([]);
  readonly recipientRoleOptions = signal<NotificationRecipientRoleOption[]>([]);
  readonly recipientUserOptions = signal<NotificationRecipientUserOption[]>([]);
  readonly roleUserIdsByRoleId = signal<Record<string, string[]>>({});
  readonly recipientConfigsByEvent = signal<Record<string, RecipientConfigDraft>>({});
  readonly diagnosticsOpen = signal(false);
  readonly diagnosticsLoading = signal(false);
  readonly diagnosticsEventCode = signal<string | null>(null);
  readonly diagnosticsEventLabel = signal<string>('');
  readonly diagnosticsError = signal<string | null>(null);
  readonly diagnosticsRows = signal<NotificationDispatchRow[]>([]);
  readonly loading = signal(false);
  readonly initializingDefaults = signal(false);
  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly tableQuery = signal<GomTableQuery>({
    searchTerm: '',
    sort: { key: '', direction: '' },
    pageIndex: 0,
    pageSize: 20,
    filters: {},
    visibleColumnKeys: [],
    advancedFilters: {},
    globalSearchScope: 'all',
  });

  readonly channelOptions: GomSelectOption[] = [
    { label: 'In-App', value: 'IN_APP' },
    { label: 'Push', value: 'PUSH' },
    { label: 'Email', value: 'EMAIL' },
  ];
  readonly recipientOptions: GomSelectOption[] = [
    { label: 'Customer', value: 'Customer' },
    { label: 'Staff', value: 'Staff' },
  ];
  readonly statusOptions: GomSelectOption[] = [
    { label: 'Active', value: 'ACTIVE' },
    { label: 'Inactive', value: 'INACTIVE' },
  ];

  readonly editForm = this.fb.group({
    templateName: ['', [Validators.required, Validators.maxLength(120)]],
    eventCode: ['', [Validators.required]],
    channel: ['EMAIL' as NotificationChannel, [Validators.required]],
    recipientType: ['Customer' as RecipientType, [Validators.required]],
    status: ['ACTIVE' as TemplateStatus, [Validators.required]],
    subject: ['', [Validators.maxLength(180)]],
    body: ['', [Validators.required, Validators.maxLength(5000)]],
  });

  readonly dynamicFieldGroups = DYNAMIC_FIELD_GROUPS;

  readonly activeTab = signal<'templates' | 'settings'>('templates');
  readonly hasDeliveryFeature = computed(() => this.authSession.hasFeature('delivery.management'));
  readonly allTemplates = signal<NotificationTemplate[]>([]);

  readonly visibleTemplates = computed(() => {
    const hasDelivery = this.hasDeliveryFeature();
    const blockedStatuses = hasDelivery ? new Set<string>() : new Set(DELIVERY_EVENT_SEEDS.map((seed) => seed.eventCode));

    return this.allTemplates().filter((template) => !blockedStatuses.has(template.eventCode));
  });

  readonly templateRows = computed<NotificationTemplateRow[]>(() =>
    [...this.visibleTemplates()]
      .sort((left, right) => this.compareTemplateOrder(left, right))
      .map((template) => ({
        id: template.id,
        templateName: template.templateName,
        event: template.eventLabel,
        channel: this.channelLabel(template.channel),
        recipientType: template.recipientType,
        status: template.status === 'ACTIVE' ? 'Active' : 'Inactive',
        lastModified: this.formatDate(template.updatedAt),
        action: 'Actions',
      })),
  );

  readonly hasVisibleTemplates = computed(() => this.visibleTemplates().length > 0);
  readonly settingsRows = computed<NotificationSettingRow[]>(() => {
    const templates = this.visibleTemplates();

    return this.getEventSeeds().map((seed) => {
      const eventTemplates = templates.filter((template) => template.eventCode === seed.eventCode);
      const activeTemplates = eventTemplates.filter((template) => template.status === 'ACTIVE');
      const activeChannels = new Set(activeTemplates.map((template) => template.channel));

      return {
        eventCode: seed.eventCode,
        eventLabel: seed.eventLabel,
        eventHint: EVENT_HINTS[seed.eventCode] || 'Configure notifications for this event.',
        enabled: activeTemplates.length > 0,
        activeChannelCount: activeChannels.size,
        recipientCount: this.recipientCountForEvent(seed.eventCode),
        channels: {
          IN_APP: activeChannels.has('IN_APP'),
          PUSH: activeChannels.has('PUSH'),
          EMAIL: activeChannels.has('EMAIL'),
        },
      };
    });
  });
  readonly selectedSettingRow = computed(() => {
    const selectedCode = this.selectedSettingEventCode();
    if (!selectedCode) {
      return null;
    }

    return this.settingsRows().find((row) => row.eventCode === selectedCode) || null;
  });
  readonly recipientRoleSelectOptions = computed<GomSelectOption[]>(() =>
    this.recipientRoleOptions().map((role) => ({
      label: role.name || role.roleKey || 'Role',
      value: role.id,
    })),
  );
  readonly recipientUserSelectOptions = computed<GomSelectOption[]>(() => {
    const roleIds = this.settingsRoleIdsDraft();
    const roleUserMap = this.roleUserIdsByRoleId();
    const eligibleByRole = roleIds.length ? this.collectUserIdsByRoles(roleIds, roleUserMap) : null;

    return this.recipientUserOptions()
      .filter((user) => !eligibleByRole || eligibleByRole.has(user.id))
      .map((user) => {
        const email = String(user.email || '').trim();
        const fullName = String(user.fullName || '').trim() || email || 'User';
        return {
          label: email ? `${fullName} (${email})` : fullName,
          value: user.id,
        };
      });
  });
  readonly selectedRecipientDraftCount = computed(() => {
    return this.estimateRecipientCount({
      includeCustomer: this.settingsIncludeCustomerDraft(),
      includeAllActiveUsers: this.settingsIncludeAllUsersDraft(),
      roleIds: this.settingsRoleIdsDraft(),
      userIds: this.settingsUserIdsDraft(),
    });
  });
  readonly editEventLabel = computed(() => {
    const eventCode = String(this.editForm.controls.eventCode.value || '');
    const seed = this.getEventSeeds().find((item) => item.eventCode === eventCode);
    return seed?.eventLabel || 'Order Event';
  });
  readonly eventOptions = computed<GomSelectOption[]>(() =>
    this.getEventSeeds().map((seed) => ({ label: seed.eventLabel, value: seed.eventCode })),
  );

  constructor() {
    this.syncFilterNavOptions();
  }

  ngOnInit(): void {
    this.loadTemplates();
    this.loadRecipientOptions();
  }

  switchTab(tabId: string | number): void {
    const tab = String(tabId);
    if (tab === 'templates' || tab === 'settings') {
      this.activeTab.set(tab);
    }
  }

  onTableQueryChange(query: GomTableQuery): void {
    this.tableQuery.set(query);
  }

  createDefaultTemplates(): void {
    if (this.initializingDefaults()) {
      return;
    }

    this.initializingDefaults.set(true);
    this.errorMessage.set(null);

    this.templateService.initializeDefaults().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        const templates = this.mapTemplates(response.data.templates || []);
        this.allTemplates.set(templates);
        this.syncFilterNavOptions();
        this.initializingDefaults.set(false);
        this.toast.success(response.data.initialized ? 'Default notification templates created.' : 'Templates are already initialized.');
      },
      error: (error) => {
        this.initializingDefaults.set(false);
        this.errorMessage.set(this.apiMessage(error, 'Unable to create default templates.'));
      },
    });
  }

  openCreateTemplate(): void {
    const eventSeeds = this.getEventSeeds();
    const firstEvent = eventSeeds[0];
    if (!firstEvent) {
      return;
    }

    this.selectedTemplateId.set(null);
    this.editForm.reset({
      templateName: `${firstEvent.eventLabel} - Customer Email`,
      eventCode: firstEvent.eventCode,
      channel: 'EMAIL',
      recipientType: 'Customer',
      status: 'ACTIVE',
      subject: `Update on your order {{order_number}}`,
      body: this.defaultBody(firstEvent.eventLabel, 'EMAIL', 'Customer'),
    });
    this.editorOpen.set(true);
  }

  onTemplateRowAction(event: { actionKey: string; row: NotificationTemplateRow }): void {
    if (event.actionKey === 'edit') {
      this.openEditor(event.row.id);
      return;
    }

    if (event.actionKey === 'preview') {
      const template = this.visibleTemplates().find((item) => item.id === event.row.id) || null;
      this.previewTemplate.set(template);
      this.previewOpen.set(true);
    }
  }

  closeEditor(): void {
    this.editorOpen.set(false);
    this.selectedTemplateId.set(null);
  }

  saveTemplate(): void {
    if (this.saving()) {
      return;
    }

    this.editForm.controls.templateName.markAsTouched();
    this.editForm.controls.channel.markAsTouched();
    this.editForm.controls.recipientType.markAsTouched();
    this.editForm.controls.status.markAsTouched();
    this.editForm.controls.body.markAsTouched();

    if (this.editForm.invalid) {
      return;
    }

    const raw = this.editForm.getRawValue();
    const eventCode = String(raw.eventCode || '');
    const seed = this.getEventSeeds().find((item) => item.eventCode === eventCode);
    const eventLabel = seed?.eventLabel || eventCode;

    const existingId = this.selectedTemplateId();
    const payload: NotificationTemplateUpsertPayload = {
      templateName: String(raw.templateName || '').trim(),
      eventCode,
      eventLabel,
      channel: this.normalizeChannel(raw.channel),
      recipientType: this.normalizeRecipient(raw.recipientType),
      status: this.normalizeStatus(raw.status),
      subject: String(raw.subject || '').trim(),
      body: String(raw.body || '').trim(),
    };

    this.saving.set(true);
    this.errorMessage.set(null);

    const request$ = existingId
      ? this.templateService.updateTemplate(existingId, payload)
      : this.templateService.createTemplate(payload);

    request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        const nextTemplate = this.mapTemplate(response.data);
        if (!nextTemplate) {
          this.saving.set(false);
          this.errorMessage.set('Unexpected template response from server.');
          return;
        }

        if (existingId) {
          this.allTemplates.update((list) => list.map((item) => (item.id === existingId ? nextTemplate : item)));
        } else {
          this.allTemplates.update((list) => [nextTemplate, ...list]);
        }

        this.syncFilterNavOptions();
        this.editorOpen.set(false);
        this.selectedTemplateId.set(null);
        this.saving.set(false);
        this.toast.success(existingId ? 'Template updated.' : 'Template created.');
      },
      error: (error) => {
        this.saving.set(false);
        this.errorMessage.set(this.apiMessage(error, existingId ? 'Unable to update template.' : 'Unable to create template.'));
      },
    });
  }

  insertDynamicField(token: string): void {
    const current = String(this.editForm.controls.body.value || '').trimEnd();
    const space = current ? '\n' : '';
    this.editForm.controls.body.setValue(`${current}${space}${token}`);
    this.editForm.controls.body.markAsDirty();
  }

  closePreview(): void {
    this.previewOpen.set(false);
    this.previewTemplate.set(null);
  }

  toggleSettingRow(eventCode: string, checked: boolean): void {
    this.applyEventEnabledState(eventCode, checked).catch(() => undefined);
  }

  openSettingsEditor(row: NotificationSettingRow): void {
    this.selectedSettingEventCode.set(row.eventCode);
    this.settingsEventEnabledDraft.set(row.enabled);
    this.settingsChannelDraft.set({ ...row.channels });
    this.applyRecipientConfigDraft(this.recipientConfigsByEvent()[row.eventCode]);
    this.settingsEditorOpen.set(true);

    this.loadRecipientConfig(row.eventCode).catch(() => undefined);
  }

  openDiagnostics(row: NotificationSettingRow): void {
    if (this.diagnosticsLoading()) {
      return;
    }

    this.diagnosticsEventCode.set(row.eventCode);
    this.diagnosticsEventLabel.set(row.eventLabel);
    this.diagnosticsOpen.set(true);
    this.loadDiagnostics(row.eventCode);
  }

  closeDiagnostics(): void {
    if (this.diagnosticsLoading()) {
      return;
    }

    this.diagnosticsOpen.set(false);
    this.diagnosticsEventCode.set(null);
    this.diagnosticsEventLabel.set('');
    this.diagnosticsError.set(null);
    this.diagnosticsRows.set([]);
  }

  closeSettingsEditor(): void {
    if (this.settingsBusy()) {
      return;
    }

    this.settingsEditorOpen.set(false);
    this.selectedSettingEventCode.set(null);
  }

  setSettingsIncludeCustomer(value: boolean): void {
    this.settingsIncludeCustomerDraft.set(Boolean(value));
  }

  setSettingsIncludeAllUsers(value: boolean): void {
    this.settingsIncludeAllUsersDraft.set(Boolean(value));
  }

  setSettingsRoleIds(values: unknown): void {
    const normalized = Array.isArray(values)
      ? [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))]
      : [];
    this.settingsRoleIdsDraft.set(normalized);

    const allowedUserIds = normalized.length
      ? this.collectUserIdsByRoles(normalized, this.roleUserIdsByRoleId())
      : null;

    if (allowedUserIds) {
      this.settingsUserIdsDraft.update((current) => current.filter((id) => allowedUserIds.has(id)));
    }
  }

  setSettingsUserIds(values: unknown): void {
    const normalized = Array.isArray(values)
      ? [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))]
      : [];
    this.settingsUserIdsDraft.set(normalized);
  }

  setSettingsEventEnabled(value: boolean): void {
    this.settingsEventEnabledDraft.set(value);

    if (!value) {
      this.settingsChannelDraft.set({ IN_APP: false, PUSH: false, EMAIL: false });
      return;
    }

    const channels = this.settingsChannelDraft();
    if (!channels.IN_APP && !channels.PUSH && !channels.EMAIL) {
      this.settingsChannelDraft.set({ ...channels, IN_APP: true });
    }
  }

  setSettingsChannel(channel: NotificationChannel, value: boolean): void {
    const next = { ...this.settingsChannelDraft(), [channel]: value };
    this.settingsChannelDraft.set(next);

    const hasAnyEnabled = next.IN_APP || next.PUSH || next.EMAIL;
    this.settingsEventEnabledDraft.set(hasAnyEnabled);
  }

  saveSettingsEditor(): void {
    this.persistSettingsEditor().catch(() => undefined);
  }

  private openEditor(templateId: string): void {
    const template = this.visibleTemplates().find((item) => item.id === templateId);
    if (!template) {
      return;
    }

    this.selectedTemplateId.set(template.id);
    this.editForm.reset({
      templateName: template.templateName,
      eventCode: template.eventCode,
      channel: template.channel,
      recipientType: template.recipientType,
      status: template.status,
      subject: template.subject,
      body: template.body,
    });
    this.editorOpen.set(true);
  }

  private getEventSeeds(): TemplateSeed[] {
    return this.hasDeliveryFeature() ? [...OFFLINE_EVENT_SEEDS, ...DELIVERY_EVENT_SEEDS] : [...OFFLINE_EVENT_SEEDS];
  }

  private async applyEventEnabledState(eventCode: string, enabled: boolean): Promise<void> {
    if (this.settingsBusy() || this.loading()) {
      return;
    }

    this.settingsBusy.set(true);
    this.errorMessage.set(null);

    try {
      const eventTemplates = this.visibleTemplates().filter((template) => template.eventCode === eventCode);
      if (!eventTemplates.length) {
        this.settingsBusy.set(false);
        return;
      }

      const targetStatus: TemplateStatus = enabled ? 'ACTIVE' : 'INACTIVE';
      const updates = eventTemplates.map((template) => this.updateTemplateStatus(template, targetStatus));
      const updatedTemplates = await Promise.all(updates);
      const updatedMap = new Map(updatedTemplates.map((item) => [item.id, item]));

      this.allTemplates.update((templates) => templates.map((template) => updatedMap.get(template.id) || template));
      this.syncFilterNavOptions();
      this.toast.success(enabled ? 'Notifications enabled for this status.' : 'Notifications disabled for this status.');
    } catch (error) {
      this.errorMessage.set(this.apiMessage(error, 'Unable to update notification status.'));
    } finally {
      this.settingsBusy.set(false);
    }
  }

  private async persistSettingsEditor(): Promise<void> {
    if (this.settingsBusy()) {
      return;
    }

    const eventCode = this.selectedSettingEventCode();
    if (!eventCode) {
      return;
    }

    const channelDraft = this.settingsChannelDraft();
    const enabled = this.settingsEventEnabledDraft();
    const desiredStatusByChannel: Record<NotificationChannel, TemplateStatus> = {
      IN_APP: enabled && channelDraft.IN_APP ? 'ACTIVE' : 'INACTIVE',
      PUSH: enabled && channelDraft.PUSH ? 'ACTIVE' : 'INACTIVE',
      EMAIL: enabled && channelDraft.EMAIL ? 'ACTIVE' : 'INACTIVE',
    };
    const recipientPayload: NotificationRecipientConfigPayload = {
      includeCustomer: this.settingsIncludeCustomerDraft(),
      includeAllActiveUsers: this.settingsIncludeAllUsersDraft(),
      roleIds: this.settingsRoleIdsDraft(),
      userIds: this.settingsUserIdsDraft(),
    };

    this.settingsBusy.set(true);
    this.errorMessage.set(null);

    try {
      const eventTemplates = this.visibleTemplates().filter((template) => template.eventCode === eventCode);
      const updates = eventTemplates.map((template) => this.updateTemplateStatus(template, desiredStatusByChannel[template.channel]));
      const [updatedTemplates, savedRecipientConfig] = await Promise.all([
        Promise.all(updates),
        firstValueFrom(this.templateService.saveRecipientConfig(eventCode, recipientPayload)),
      ]);
      const updatedMap = new Map(updatedTemplates.map((item) => [item.id, item]));

      this.allTemplates.update((templates) => templates.map((template) => updatedMap.get(template.id) || template));
      this.recipientConfigsByEvent.update((current) => ({
        ...current,
        [eventCode]: this.toRecipientConfigDraft(savedRecipientConfig.data, eventCode),
      }));
      this.syncFilterNavOptions();
      this.settingsEditorOpen.set(false);
      this.selectedSettingEventCode.set(null);
      this.toast.success('Notification settings updated.');
    } catch (error) {
      this.errorMessage.set(this.apiMessage(error, 'Unable to save notification settings.'));
    } finally {
      this.settingsBusy.set(false);
    }
  }

  private async updateTemplateStatus(template: NotificationTemplate, status: TemplateStatus): Promise<NotificationTemplate> {
    if (template.status === status) {
      return template;
    }

    const payload: NotificationTemplateUpsertPayload = {
      templateName: template.templateName,
      eventCode: template.eventCode,
      eventLabel: template.eventLabel,
      channel: template.channel,
      recipientType: template.recipientType,
      status,
      subject: template.subject,
      body: template.body,
    };

    const response = await firstValueFrom(this.templateService.updateTemplate(template.id, payload));
    const updated = this.mapTemplate(response.data);
    if (!updated) {
      throw new Error('Unexpected template response from server.');
    }

    return updated;
  }

  private defaultBody(eventLabel: string, channel: NotificationChannel, recipientType: RecipientType): string {
    if (channel === 'EMAIL') {
      return [
        'Hi {{customer_name}},',
        '',
        `Your order {{order_number}} is now ${eventLabel.toLowerCase()}.`,
        'Order amount: {{order_amount}}',
        'Current status: {{order_status}}',
        '',
        'Thank you,',
        '{{business_name}}',
      ].join('\n');
    }

    if (channel === 'PUSH') {
      return `Order {{order_number}} ${eventLabel.toLowerCase()}. Tap to view details.`;
    }

    if (recipientType === 'Staff') {
      return `Staff alert: Order {{order_number}} changed to ${eventLabel.toLowerCase()}.`;
    }

    return `Order {{order_number}} updated: ${eventLabel}.`;
  }

  private channelLabel(channel: NotificationChannel): string {
    if (channel === 'IN_APP') return 'In-App';
    if (channel === 'PUSH') return 'Push';
    return 'Email';
  }

  private normalizeChannel(value: unknown): NotificationChannel {
    const normalized = this.toNormalizedString(value).toUpperCase();
    if (normalized === 'IN_APP') return 'IN_APP';
    if (normalized === 'PUSH') return 'PUSH';
    return 'EMAIL';
  }

  private normalizeRecipient(value: unknown): RecipientType {
    return this.toNormalizedString(value).toLowerCase() === 'staff' ? 'Staff' : 'Customer';
  }

  private normalizeStatus(value: unknown): TemplateStatus {
    return this.toNormalizedString(value).toUpperCase() === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';
  }

  private toNormalizedString(value: unknown): string {
    if (typeof value === 'string') {
      return value;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }

    return '';
  }

  private syncFilterNavOptions(): void {
    const eventOptions = this.templateRows()
      .map((row) => row.event)
      .filter((value, index, list) => list.indexOf(value) === index)
      .map((eventLabel) => ({ label: eventLabel, value: eventLabel }));

    this.filterNavigationRows[0].options = eventOptions;
  }

  private recipientCountForEvent(eventCode: string): number {
    const config = this.recipientConfigsByEvent()[eventCode];
    if (!config) {
      return 1;
    }

    return this.estimateRecipientCount(config);
  }

  private estimateRecipientCount(config: {
    includeCustomer: boolean;
    includeAllActiveUsers: boolean;
    roleIds: string[];
    userIds: string[];
  }): number {
    const staffUserIds = new Set<string>();

    if (config.includeAllActiveUsers) {
      this.addUserIdsToSet(
        staffUserIds,
        this.recipientUserOptions().map((user) => user.id),
      );
    }

    const roleMapped = this.collectUserIdsByRoles(config.roleIds || [], this.roleUserIdsByRoleId());
    this.addUserIdsToSet(staffUserIds, [...roleMapped]);

    this.addUserIdsToSet(staffUserIds, config.userIds || []);

    return staffUserIds.size + (config.includeCustomer ? 1 : 0);
  }

  private addUserIdsToSet(target: Set<string>, userIds: unknown[]): void {
    for (const userId of userIds || []) {
      const safeUserId = this.toSafeId(userId);
      if (safeUserId) {
        target.add(safeUserId);
      }
    }
  }

  private toSafeId(value: unknown): string {
    if (typeof value === 'string') {
      return value.trim();
    }

    if (typeof value === 'number') {
      return String(value).trim();
    }

    return '';
  }

  private async loadRecipientOptions(): Promise<void> {
    if (this.recipientOptionsLoading() || this.recipientRoleOptions().length || this.recipientUserOptions().length) {
      return;
    }

    this.recipientOptionsLoading.set(true);
    try {
      const response = await firstValueFrom(this.templateService.listRecipientOptions());
      this.recipientRoleOptions.set(Array.isArray(response.data?.roles) ? response.data.roles : []);
      this.recipientUserOptions.set(Array.isArray(response.data?.users) ? response.data.users : []);
      this.roleUserIdsByRoleId.set(this.normalizeRoleUserMap(response.data?.roleUserIdsByRoleId));
    } catch (error) {
      this.errorMessage.set(this.apiMessage(error, 'Unable to load recipient options.'));
    } finally {
      this.recipientOptionsLoading.set(false);
    }
  }

  private normalizeRoleUserMap(value: unknown): Record<string, string[]> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }

    const map = value as Record<string, unknown>;
    const normalized: Record<string, string[]> = {};

    for (const [roleId, userIds] of Object.entries(map)) {
      const safeRoleId = String(roleId || '').trim();
      if (!safeRoleId) {
        continue;
      }

      const nextUserIds = Array.isArray(userIds)
        ? [...new Set(userIds.map((item) => String(item || '').trim()).filter(Boolean))]
        : [];
      normalized[safeRoleId] = nextUserIds;
    }

    return normalized;
  }

  private collectUserIdsByRoles(roleIds: string[], roleUserMap: Record<string, string[]>): Set<string> {
    const userIdSet = new Set<string>();

    for (const roleId of roleIds) {
      const mappedUserIds = roleUserMap[roleId] || [];
      for (const userId of mappedUserIds) {
        userIdSet.add(String(userId));
      }
    }

    return userIdSet;
  }

  private async loadRecipientConfig(eventCode: string): Promise<void> {
    if (!eventCode || this.recipientConfigLoading()) {
      return;
    }

    this.recipientConfigLoading.set(true);
    try {
      const response = await firstValueFrom(this.templateService.getRecipientConfig(eventCode));
      const draft = this.toRecipientConfigDraft(response.data, eventCode);
      this.recipientConfigsByEvent.update((current) => ({
        ...current,
        [eventCode]: draft,
      }));

      if (this.selectedSettingEventCode() === eventCode) {
        this.applyRecipientConfigDraft(draft);
      }
    } catch (error) {
      this.errorMessage.set(this.apiMessage(error, 'Unable to load recipient settings.'));
    } finally {
      this.recipientConfigLoading.set(false);
    }
  }

  private toRecipientConfigDraft(value: NotificationRecipientConfigDto | null | undefined, eventCode: string): RecipientConfigDraft {
    return {
      eventCode: String(value?.eventCode || eventCode || '').trim().toUpperCase(),
      includeCustomer: value?.includeCustomer !== false,
      includeAllActiveUsers: Boolean(value?.includeAllActiveUsers),
      roleIds: Array.isArray(value?.roleIds) ? [...new Set(value.roleIds.map((id) => String(id || '').trim()).filter(Boolean))] : [],
      userIds: Array.isArray(value?.userIds) ? [...new Set(value.userIds.map((id) => String(id || '').trim()).filter(Boolean))] : [],
      updatedAt: value?.updatedAt || null,
    };
  }

  private applyRecipientConfigDraft(config: RecipientConfigDraft | null | undefined): void {
    const fallback = config || {
      eventCode: String(this.selectedSettingEventCode() || ''),
      includeCustomer: true,
      includeAllActiveUsers: false,
      roleIds: [],
      userIds: [],
      updatedAt: null,
    };

    this.settingsIncludeCustomerDraft.set(Boolean(fallback.includeCustomer));
    this.settingsIncludeAllUsersDraft.set(Boolean(fallback.includeAllActiveUsers));
    this.settingsRoleIdsDraft.set(Array.isArray(fallback.roleIds) ? fallback.roleIds : []);
    this.settingsUserIdsDraft.set(Array.isArray(fallback.userIds) ? fallback.userIds : []);
  }

  private formatDate(isoDate: string): string {
    const date = new Date(isoDate);
    if (Number.isNaN(date.getTime())) {
      return '-';
    }

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  private compareTemplateOrder(left: NotificationTemplate, right: NotificationTemplate): number {
    const eventDiff = this.eventOrderIndex(left.eventCode) - this.eventOrderIndex(right.eventCode);
    if (eventDiff !== 0) {
      return eventDiff;
    }

    const channelDiff = this.channelOrderIndex(left.channel) - this.channelOrderIndex(right.channel);
    if (channelDiff !== 0) {
      return channelDiff;
    }

    const recipientDiff = left.recipientType.localeCompare(right.recipientType);
    if (recipientDiff !== 0) {
      return recipientDiff;
    }

    return left.templateName.localeCompare(right.templateName);
  }

  private eventOrderIndex(eventCode: string): number {
    const allEventCodes = this.getEventSeeds().map((seed) => seed.eventCode);
    const index = allEventCodes.indexOf(String(eventCode || '').toUpperCase());
    return index === -1 ? Number.MAX_SAFE_INTEGER : index;
  }

  private channelOrderIndex(channel: NotificationChannel): number {
    const index = CHANNEL_ORDER.indexOf(channel);
    return index === -1 ? Number.MAX_SAFE_INTEGER : index;
  }

  private loadTemplates(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.templateService.listTemplates().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        const templates = this.mapTemplates(response.data.templates || []);
        this.allTemplates.set(templates);
        this.syncFilterNavOptions();
        this.preloadRecipientConfigs().catch(() => undefined);
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(this.apiMessage(error, 'Unable to load templates.'));
      },
    });
  }

  private mapTemplates(items: NotificationTemplateDto[]): NotificationTemplate[] {
    return Array.isArray(items)
      ? items
        .map((item) => this.mapTemplate(item))
        .filter((item): item is NotificationTemplate => item !== null)
      : [];
  }

  private mapTemplate(item: NotificationTemplateDto | null | undefined): NotificationTemplate | null {
    if (!item?.id) {
      return null;
    }

    return {
      id: String(item.id),
      templateName: String(item.templateName || '').trim(),
      eventCode: String(item.eventCode || '').trim().toUpperCase(),
      eventLabel: String(item.eventLabel || '').trim() || 'Order Event',
      channel: this.normalizeChannel(item.channel),
      recipientType: this.normalizeRecipient(item.recipientType),
      status: this.normalizeStatus(item.status),
      subject: String(item.subject || ''),
      body: String(item.body || ''),
      systemTemplate: Boolean(item.systemTemplate),
      updatedAt: String(item.updatedAt || item.createdAt || new Date().toISOString()),
    };
  }

  private apiMessage(error: unknown, fallback: string): string {
    const candidate = error as { error?: { message?: string } };
    return String(candidate?.error?.message || fallback);
  }

  private loadDiagnostics(eventCode: string): void {
    this.diagnosticsLoading.set(true);
    this.diagnosticsError.set(null);

    this.dispatchService.listDispatches({ toStatus: eventCode, limit: 10, page: 1 }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        this.diagnosticsRows.set((response.data || []).map((item) => this.mapDispatchRow(item)));
        this.diagnosticsLoading.set(false);
      },
      error: (error) => {
        this.diagnosticsLoading.set(false);
        this.diagnosticsError.set(this.apiMessage(error, 'Unable to load delivery diagnostics.'));
      },
    });
  }

  private mapDispatchRow(item: NotificationDispatchDto): NotificationDispatchRow {
    return {
      id: String(item._id),
      channel: String(item.channel || ''),
      state: String(item.state || ''),
      orderNo: String(item.orderNo || ''),
      templateKey: String(item.templateKey || ''),
      attempts: Number(item.attempts || 0),
      maxAttempts: Number(item.maxAttempts || 0),
      lastError: String(item.lastError || ''),
      failureCategory: String(item.failureCategory || ''),
      createdAt: String(item.createdAt || ''),
      sentAt: String(item.sentAt || ''),
      nextRetryAt: String(item.nextRetryAt || ''),
    };
  }

  private async preloadRecipientConfigs(): Promise<void> {
    const eventCodes = this.getEventSeeds().map((seed) => seed.eventCode);
    if (!eventCodes.length) {
      return;
    }

    const entries = await Promise.all(
      eventCodes.map(async (eventCode) => {
        try {
          const response = await firstValueFrom(this.templateService.getRecipientConfig(eventCode));
          return [eventCode, this.toRecipientConfigDraft(response.data, eventCode)] as const;
        } catch {
          return [eventCode, this.toRecipientConfigDraft(null, eventCode)] as const;
        }
      }),
    );

    this.recipientConfigsByEvent.set(
      entries.reduce<Record<string, RecipientConfigDraft>>((acc, [eventCode, config]) => {
        acc[eventCode] = config;
        return acc;
      }, {}),
    );
  }
}
