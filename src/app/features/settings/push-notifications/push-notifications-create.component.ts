import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { GomAlertToastService, GomButtonComponent, GomInputComponent, GomTextareaComponent } from '@gomlibs/ui';
import { RichTextEditorComponent } from '../../../shared/components/rich-text-editor/rich-text-editor.component';
import {
  CreateNotificationRequest,
  NotificationCampaign,
  NotificationChannel,
  NotificationCenterStore,
  NotificationStatus,
} from './notification-center.store';

interface WizardStep {
  id: number;
  label: string;
}

type AudienceKey = 'All Customers' | 'Customer Group' | 'Custom Segment';

interface AudienceOption {
  key: AudienceKey;
  label: string;
  hint: string;
  recipients: number;
}

@Component({
  selector: 'gom-push-notifications-create',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    GomButtonComponent,
    GomInputComponent,
    GomTextareaComponent,
    RichTextEditorComponent,
  ],
  templateUrl: './push-notifications-create.component.html',
  styleUrl: './push-notifications-create.component.scss',
})
export class PushNotificationsCreateComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(GomAlertToastService);
  private readonly store = inject(NotificationCenterStore);

  readonly steps: WizardStep[] = [
    { id: 1, label: 'Select Channels' },
    { id: 2, label: 'Create Content' },
    { id: 3, label: 'Select Audience' },
    { id: 4, label: 'Schedule' },
    { id: 5, label: 'Review & Send' },
  ];

  readonly currentStep = signal(1);
  readonly activeChannel = signal<NotificationChannel>('Email');
  readonly selectedChannels = signal<NotificationChannel[]>(['Email']);
  readonly showSendConfirm = signal(false);
  readonly showCancelConfirm = signal(false);
  readonly activeJobId = signal<string | null>(null);
  readonly submitting = signal(false);
  readonly sendingCampaign = signal<NotificationCampaign | null>(null);

  // Keep WhatsApp implementation in place, but hide it from the wizard until release-ready.
  readonly channels: NotificationChannel[] = ['Push', 'Email'];
  readonly audienceOptions = signal<AudienceOption[]>([
    { key: 'All Customers', label: 'All Customers', hint: 'Loading customer count...', recipients: 0 },
    { key: 'Customer Group', label: 'Customer Group', hint: 'Loading group count...', recipients: 0 },
    { key: 'Custom Segment', label: 'Custom Segment', hint: 'Saved segment counts will appear here.', recipients: 0 },
  ]);

  readonly scheduleModes = [
    { key: 'Now', label: 'Send Now', hint: 'Notification will be sent immediately after confirmation.' },
    { key: 'Later', label: 'Schedule for Later', hint: 'Choose a specific future date and time to run this notification.' },
  ] as const;

  readonly minScheduleDate = this.toDateInputValue(new Date());

  readonly form = this.fb.group({
    notificationName: ['', [Validators.required, Validators.maxLength(60)]],
    pushTitle: ['', [Validators.maxLength(60)]],
    pushMessage: ['', [Validators.maxLength(160)]],
    emailSubject: ['', [Validators.maxLength(120)]],
    emailBody: ['', [Validators.maxLength(320)]],
    whatsAppTemplate: ['', [Validators.maxLength(80)]],
    whatsAppBody: ['', [Validators.maxLength(320)]],
    audienceType: ['All Customers' as 'All Customers' | 'Customer Group' | 'Custom Segment', [Validators.required]],
    audienceName: ['All Customers', [Validators.required, Validators.maxLength(80)]],
    scheduleMode: ['Now' as 'Now' | 'Later', [Validators.required]],
    scheduleDate: [''],
    scheduleTime: [''],
  });

  readonly activePreview = computed(() => this.activeChannel());
  readonly selectedAudience = computed(() =>
    this.audienceOptions().find((option) => option.key === this.form.controls.audienceType.value) ?? this.audienceOptions()[0],
  );
  readonly recipients = computed(() => this.selectedAudience().recipients);
  readonly reviewChannels = computed(() => this.selectedChannels().join(', '));
  readonly scheduleLabel = computed(() =>
    this.form.controls.scheduleMode.value === 'Later'
      ? this.formatScheduleLabel(this.form.controls.scheduleDate.value || '', this.form.controls.scheduleTime.value || '')
      : 'Immediate',
  );

  constructor() {
    const copyFrom = this.route.snapshot.queryParamMap.get('copyFrom');
    const forceSchedule = this.route.snapshot.queryParamMap.get('forceSchedule') === 'true';

    if (forceSchedule) {
      this.form.controls.scheduleMode.setValue('Later');
      this.currentStep.set(4);
    }

    if (copyFrom) {
      this.prefillFromCampaign(copyFrom, forceSchedule);
    }
  }

  ngOnInit(): void {
    this.loadAudienceCounts();
  }

  goBack(): void {
    this.router.navigate(['/settings/push-notifications']);
  }

  selectStep(stepId: number): void {
    if (stepId < this.currentStep()) {
      this.currentStep.set(stepId);
    }
  }

  next(): void {
    if (!this.validateCurrentStep()) {
      return;
    }

    this.currentStep.update((step) => Math.min(5, step + 1));
  }

  previous(): void {
    this.currentStep.update((step) => Math.max(1, step - 1));
  }

  toggleChannel(channel: NotificationChannel): void {
    this.selectedChannels.update((items) =>
      items.includes(channel) ? items.filter((item) => item !== channel) : [...items, channel],
    );

    if (!this.selectedChannels().includes(this.activeChannel())) {
      this.activeChannel.set(this.selectedChannels()[0] ?? 'Push');
    }
  }

  setActiveChannel(channel: NotificationChannel): void {
    if (this.selectedChannels().includes(channel)) {
      this.activeChannel.set(channel);
    }
  }

  onAudienceSelect(audienceKey: AudienceKey): void {
    this.form.controls.audienceType.setValue(audienceKey);

    if (audienceKey === 'All Customers') {
      this.form.controls.audienceName.setValue('All Customers');
      return;
    }

    this.form.controls.audienceName.setValue('');
  }

  onScheduleDateChanged(dateValue: string): void {
    if (!this.isDateToday(dateValue)) {
      return;
    }

    const current = String(this.form.controls.scheduleTime.value || '').trim();
    const minTime = this.getMinScheduleTime();

    if (current && current < minTime) {
      this.form.controls.scheduleTime.setValue('');
    }
  }

  get scheduleTimeMin(): string | null {
    const dateValue = String(this.form.controls.scheduleDate.value || '').trim();
    if (!this.isDateToday(dateValue)) {
      return null;
    }

    return this.getMinScheduleTime();
  }

  requestSendConfirmation(): void {
    this.showSendConfirm.set(true);
  }

  cancelSendConfirmation(): void {
    this.showSendConfirm.set(false);
  }

  onEmailBodyChanged(value: string): void {
    this.form.controls.emailBody.setValue(String(value || ''));
    this.form.controls.emailBody.markAsDirty();
  }

  async confirmSend(): Promise<void> {
    if (this.submitting()) return;

    this.showSendConfirm.set(false);
    this.submitting.set(true);

    try {
      const request = this.toRequest('Sending');
      const created = await this.store.createCampaign(request);
      this.activeJobId.set(created.campaignId);
      this.currentStep.set(6);

      const latest = await this.store.pollCampaign(created.campaignId, 30000, (campaign) => {
        this.sendingCampaign.set(campaign);
      });
      this.sendingCampaign.set(latest);

      if (latest.status === 'Sent') {
        this.toast.success('Notification sent successfully.');
      } else if (latest.status === 'Failed') {
        this.toast.error(this.deliveryStatusMessage(latest));
      } else if (latest.status === 'Cancelled') {
        this.toast.warning(this.deliveryStatusMessage(latest));
      }
    } catch (error) {
      this.toast.error(this.getErrorMessage(error, 'Unable to queue notification job.'));
    } finally {
      this.submitting.set(false);
    }
  }

  saveDraft(): void {
    if (this.submitting()) return;

    this.submitting.set(true);
    const request = this.toRequest('Draft');
    this.store
      .createCampaign(request)
      .then(() => {
        this.toast.success('Draft saved.');
        this.router.navigate(['/settings/push-notifications']);
      })
      .catch((error) => {
        this.toast.error(this.getErrorMessage(error, 'Unable to save draft.'));
      })
      .finally(() => {
        this.submitting.set(false);
      });
  }

  scheduleNotification(): void {
    if (this.submitting()) return;

    if (this.form.controls.scheduleMode.value !== 'Later') {
      this.toast.error('Choose Schedule for Later before scheduling.');
      return;
    }

    const scheduledAt = this.toScheduleIso(
      this.form.controls.scheduleDate.value || '',
      this.form.controls.scheduleTime.value || '',
    );
    if (!scheduledAt) {
      this.toast.error('Pick a valid schedule date and time.');
      return;
    }

    if (new Date(scheduledAt).getTime() <= Date.now()) {
      this.toast.error('Scheduled time must be in the future.');
      return;
    }

    this.submitting.set(true);
    const request = this.toRequest('Scheduled');
    this.store
      .createCampaign(request)
      .then(() => {
        this.toast.success('Notification scheduled.');
        this.router.navigate(['/settings/push-notifications']);
      })
      .catch((error) => {
        this.toast.error(this.getErrorMessage(error, 'Unable to schedule notification.'));
      })
      .finally(() => {
        this.submitting.set(false);
      });
  }

  cancelWizard(): void {
    this.showCancelConfirm.set(true);
  }

  closeCancelConfirm(): void {
    this.showCancelConfirm.set(false);
  }

  confirmCancel(): void {
    this.showCancelConfirm.set(false);
    this.router.navigate(['/settings/push-notifications']);
  }

  progress(): number {
    return this.sendingCampaign()?.progress ?? 0;
  }

  statusLabel(): string {
    return this.sendingCampaign()?.status ?? 'Sending';
  }

  deliveryStatusMessage(campaign: NotificationCampaign | null): string {
    if (!campaign) {
      return 'Notification status is unavailable.';
    }

    if (campaign.errorMessage) {
      return campaign.errorMessage;
    }

    if (campaign.status === 'Cancelled') {
      return 'Notification job was cancelled.';
    }

    if (campaign.status === 'Failed') {
      return 'Notification job failed.';
    }

    return 'Notification is processing.';
  }

  private prefillFromCampaign(campaignId: string, forceSchedule = false): void {
    this.store
      .getCampaign(campaignId)
      .then((source) => {
        let scheduleMode: 'Now' | 'Later' = 'Now';
        let scheduleDate = '';
        let scheduleTime = '';
        if (forceSchedule || source.schedule !== 'Immediate') {
          scheduleMode = 'Later';
          const parsed = new Date(source.schedule);
          if (!Number.isNaN(parsed.getTime())) {
            scheduleDate = this.toDateInputValue(parsed);
            scheduleTime = this.toTimeValue(parsed);
          }
        }

        this.form.patchValue({
          notificationName: source.title,
          pushTitle: source.title,
          pushMessage: source.content?.pushMessage || source.summary,
          emailSubject: source.content?.emailSubject || source.title,
          emailBody: source.content?.emailBodyHtml || source.summary,
          whatsAppTemplate: source.content?.whatsAppTemplate || source.title,
          whatsAppBody: source.content?.whatsAppBody || source.summary,
          audienceType: source.audience.includes('All') ? 'All Customers' : 'Customer Group',
          audienceName: source.audience,
          scheduleMode,
          scheduleDate,
          scheduleTime,
        });
        this.selectedChannels.set(source.channels);
        this.activeChannel.set(source.channels[0] ?? 'Push');
      })
      .catch(() => {
        this.toast.warning('Unable to load source notification.');
      });
  }

  private loadAudienceCounts(): void {
    this.store
      .getAudienceCounts()
      .then((counts) => {
        this.audienceOptions.set([
          {
            key: 'All Customers',
            label: 'All Customers',
            hint: counts.allCustomers > 0
              ? `${counts.allCustomers.toLocaleString()} customers in your database`
              : 'No active customers found in your tenant yet.',
            recipients: counts.allCustomers,
          },
          {
            key: 'Customer Group',
            label: 'Customer Group',
            hint: counts.customerGroups > 0
              ? `${counts.customerGroups.toLocaleString()} active customer groups available`
              : 'No active customer groups found in your tenant.',
            recipients: counts.customerGroups,
          },
          {
            key: 'Custom Segment',
            label: 'Custom Segment',
            hint: counts.customSegments > 0
              ? `${counts.customSegments.toLocaleString()} saved segments available`
              : 'No saved custom segments available yet.',
            recipients: counts.customSegments,
          },
        ]);
      })
      .catch(() => {
        this.audienceOptions.set([
          { key: 'All Customers', label: 'All Customers', hint: 'Unable to load customer count.', recipients: 0 },
          { key: 'Customer Group', label: 'Customer Group', hint: 'Unable to load group count.', recipients: 0 },
          { key: 'Custom Segment', label: 'Custom Segment', hint: 'Unable to load segment count.', recipients: 0 },
        ]);
      });
  }

  private isChannelInvalid(channel: NotificationChannel): boolean {
    if (channel === 'Push') {
      return !this.form.controls.pushTitle.value || !this.form.controls.pushMessage.value;
    }

    if (channel === 'Email') {
      return !this.form.controls.emailSubject.value || !this.form.controls.emailBody.value;
    }

    if (channel === 'WhatsApp') {
      return !this.form.controls.whatsAppTemplate.value || !this.form.controls.whatsAppBody.value;
    }

    return false;
  }

  private validateCurrentStep(): boolean {
    const step = this.currentStep();

    if (step === 1) {
      return this.validateChannelStep();
    }

    if (step === 2) {
      return this.validateContentStep();
    }

    if (step === 3) {
      return this.validateAudienceStep();
    }

    if (step === 4) {
      return this.validateScheduleStep();
    }

    return true;
  }

  private validateChannelStep(): boolean {
    if (this.selectedChannels().length > 0) {
      return true;
    }

    this.toast.error('Select at least one channel.');
    return false;
  }

  private validateContentStep(): boolean {
    const invalidChannel = this.selectedChannels().find((channel) => this.isChannelInvalid(channel));
    if (!invalidChannel) {
      return true;
    }

    this.toast.error(`Complete the ${invalidChannel} content first.`);
    return false;
  }

  private validateAudienceStep(): boolean {
    if (this.form.controls.audienceType.value && this.form.controls.audienceName.value) {
      return true;
    }

    this.toast.error('Select the audience before continuing.');
    return false;
  }

  private validateScheduleStep(): boolean {
    if (this.form.controls.scheduleMode.value !== 'Later') {
      return true;
    }

    if (!this.form.controls.scheduleDate.value || !this.form.controls.scheduleTime.value) {
      this.toast.error('Pick a schedule date and time.');
      return false;
    }

    const scheduledAt = this.toScheduleIso(
      this.form.controls.scheduleDate.value || '',
      this.form.controls.scheduleTime.value || '',
    );
    if (!scheduledAt) {
      this.toast.error('Pick a valid schedule date and time.');
      return false;
    }

    if (new Date(scheduledAt).getTime() <= Date.now()) {
      this.toast.error('Scheduled time must be in the future.');
      return false;
    }

    return true;
  }

  private toRequest(status: NotificationStatus): CreateNotificationRequest {
    const emailBodyHtml = String(this.form.controls.emailBody.value || '').trim();
    const emailBodyText = this.stripHtml(emailBodyHtml);
    const pushMessage = String(this.form.controls.pushMessage.value || '').trim();
    const whatsAppBody = String(this.form.controls.whatsAppBody.value || '').trim();

    const scheduleAt = this.form.controls.scheduleMode.value === 'Later'
      ? this.toScheduleIso(this.form.controls.scheduleDate.value || '', this.form.controls.scheduleTime.value || '')
      : null;

    return {
      title: this.form.controls.notificationName.value || 'Notification',
      summary: this.toSummarySnippet(pushMessage || emailBodyText || whatsAppBody || 'Campaign summary', 500),
      content: {
        pushMessage,
        emailSubject: String(this.form.controls.emailSubject.value || '').trim(),
        emailBodyHtml,
        emailBodyText,
        whatsAppTemplate: String(this.form.controls.whatsAppTemplate.value || '').trim(),
        whatsAppBody,
      },
      channels: [...this.selectedChannels()],
      audience: this.form.controls.audienceName.value || 'Selected audience',
      recipients: this.recipients(),
      schedule: this.form.controls.scheduleMode.value === 'Later'
        ? this.formatScheduleLabel(this.form.controls.scheduleDate.value || '', this.form.controls.scheduleTime.value || '')
        : 'Immediate',
      scheduleAt,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      status,
    };
  }

  private toScheduleIso(dateText: string, timeText: string): string | null {
    const datePart = String(dateText || '').trim();
    const timePart = String(timeText || '').trim();
    if (!datePart || !timePart) return null;

    const candidate = new Date(`${datePart}T${timePart}:00`);
    if (Number.isNaN(candidate.getTime())) return null;

    return candidate.toISOString();
  }

  private toDateInputValue(date: Date): string {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  private toTimeValue(date: Date): string {
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }

  private isDateToday(dateValue: string): boolean {
    if (!dateValue) return false;
    return dateValue === this.toDateInputValue(new Date());
  }

  private getMinScheduleTime(): string {
    const now = new Date();
    if (now.getSeconds() > 0 || now.getMilliseconds() > 0) {
      now.setMinutes(now.getMinutes() + 1);
    }
    now.setSeconds(0, 0);
    return this.toTimeValue(now);
  }

  private stripHtml(value: string): string {
    const source = String(value || '')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/&nbsp;/gi, ' ');

    let inTag = false;
    let output = '';

    for (const char of source) {
      if (char === '<') {
        inTag = true;
        output += ' ';
        continue;
      }

      if (char === '>') {
        inTag = false;
        output += ' ';
        continue;
      }

      if (!inTag) {
        output += char;
      }
    }

    return output.replace(/\s+/g, ' ').trim();
  }

  private toSummarySnippet(value: string, maxLength: number): string {
    const normalized = this.stripHtml(value);
    if (!normalized) return '';
    if (normalized.length <= maxLength) return normalized;
    return normalized.slice(0, maxLength).trimEnd();
  }

  private getErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      const apiMessage = String(error.error?.message || '').trim();
      if (apiMessage) return apiMessage;
      const firstError = Array.isArray(error.error?.errors) ? String(error.error.errors[0] || '').trim() : '';
      if (firstError) return firstError;
    }

    if (error && typeof error === 'object' && 'message' in error) {
      const messageValue = (error as { message?: unknown }).message;
      if (typeof messageValue === 'string' && messageValue.trim()) {
        return messageValue.trim();
      }
    }

    return fallback;
  }

  private formatScheduleLabel(dateText: string, timeText: string): string {
    const scheduleAt = this.toScheduleIso(dateText, timeText);
    if (!scheduleAt) {
      return `${dateText || 'Choose a date'} ${timeText || 'Choose a time'}`;
    }

    return new Date(scheduleAt).toLocaleString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

}
