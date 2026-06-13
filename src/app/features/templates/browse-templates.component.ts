import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import {
  GomAlertToastService,
  GomButtonComponent,
  GomCardComponent,
  GomModalComponent,
  GomTabContentComponent,
  GomTabsComponent,
  TabItem,
} from '@gomlibs/ui';
import {
  TemplateSubscriptionService,
  AvailableTemplate,
  MySubscription,
  TemplateCategoryPreview,
  BusinessTemplateListItem,
  BusinessTemplatePreviewData,
} from './template-subscription.service';
import { TemplatePreviewModalComponent } from './preview/template-preview-modal.component';

@Component({
  selector: 'gom-browse-templates',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    GomTabsComponent,
    GomTabContentComponent,
    GomButtonComponent,
    GomCardComponent,
    GomModalComponent,
    TemplatePreviewModalComponent,
  ],
  templateUrl: './browse-templates.component.html',
  styleUrl: './browse-templates.component.scss',
})
export class BrowseTemplatesComponent implements OnInit {
  private readonly subscriptionService = inject(TemplateSubscriptionService);
  private readonly toast = inject(GomAlertToastService);

  readonly tabs: TabItem[] = [
    { id: 'business', label: 'Business Types' },
    { id: 'browse', label: 'Individual Categories' },
    { id: 'subscribed', label: 'My Subscriptions' },
  ];

  activeTab = signal<'business' | 'browse' | 'subscribed'>('business');
  loading = signal(false);
  subscribingId = signal<string | null>(null);

  available = signal<AvailableTemplate[]>([]);
  subscriptions = signal<MySubscription[]>([]);
  businessTemplates = signal<BusinessTemplateListItem[]>([]);

  // Business template preview
  showBtPreview = signal(false);
  btPreviewLoading = signal(false);
  btPreviewData = signal<BusinessTemplatePreviewData | null>(null);

  // Category preview modal state
  showPreview = signal(false);
  previewLoading = signal(false);
  previewData = signal<TemplateCategoryPreview | null>(null);

  ngOnInit() {
    this.loadBusinessTemplates();
    this.loadAvailable();
    this.loadSubscriptions();
  }

  switchTab(tab: string | number) {
    this.activeTab.set(tab as 'business' | 'browse' | 'subscribed');
  }

  loadBusinessTemplates() {
    this.subscriptionService.listBusinessTemplates().subscribe({
      next: (res) => this.businessTemplates.set((res.data ?? []).filter((bt) => bt.status === 'ACTIVE')),
      error: () => {},
    });
  }

  subscribeToBusinessTemplate(bt: BusinessTemplateListItem) {
    this.subscribingId.set(bt._id);
    this.subscriptionService.subscribeToBusinessTemplate(bt._id).subscribe({
      next: (res) => {
        const result = res.data;
        const msg = `Subscribed to "${bt.name}" — ${result.subscribed} categories set up, ${result.alreadySubscribed} already existed.`;
        this.toast.success(msg);
        this.subscribingId.set(null);
        this.loadAvailable();
        this.loadSubscriptions();
      },
      error: (err: { error?: { message?: string } }) => {
        this.toast.error(err?.error?.message || 'Failed to subscribe');
        this.subscribingId.set(null);
      },
    });
  }

  openBtPreview(bt: BusinessTemplateListItem) {
    this.btPreviewData.set(null);
    this.btPreviewLoading.set(true);
    this.showBtPreview.set(true);
    this.subscriptionService.previewBusinessTemplate(bt._id).subscribe({
      next: (res) => {
        this.btPreviewData.set(res.data);
        this.btPreviewLoading.set(false);
      },
      error: () => {
        this.toast.error('Failed to load preview');
        this.btPreviewLoading.set(false);
        this.showBtPreview.set(false);
      },
    });
  }

  closeBtPreview() {
    this.showBtPreview.set(false);
  }

  loadAvailable() {
    this.loading.set(true);
    this.subscriptionService.listAvailable().subscribe({
      next: (res) => {
        this.available.set(res.data ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.toast.error('Failed to load available templates');
        this.loading.set(false);
      },
    });
  }

  loadSubscriptions() {
    this.subscriptionService.listMySubscriptions().subscribe({
      next: (res) => this.subscriptions.set(res.data ?? []),
      error: () => this.toast.error('Failed to load subscriptions'),
    });
  }

  subscribe(template: AvailableTemplate) {
    this.subscribingId.set(template._id);
    this.subscriptionService.subscribe(template._id).subscribe({
      next: () => {
        this.toast.success(`Subscribed to "${template.name}" — categories, fields, units and groups have been cloned into your workspace.`);
        this.subscribingId.set(null);
        this.loadAvailable();
        this.loadSubscriptions();
      },
      error: (err) => {
        const message = err?.error?.message || 'Failed to subscribe';
        this.toast.error(message);
        this.subscribingId.set(null);
      },
    });
  }

  unsubscribe(sub: MySubscription) {
    this.subscribingId.set(sub.platformCategoryId._id);
    this.subscriptionService.unsubscribe(sub.platformCategoryId._id).subscribe({
      next: () => {
        this.toast.success('Unsubscribed successfully');
        this.subscribingId.set(null);
        this.loadAvailable();
        this.loadSubscriptions();
      },
      error: () => {
        this.toast.error('Failed to unsubscribe');
        this.subscribingId.set(null);
      },
    });
  }

  openPreview(template: AvailableTemplate) {
    this.previewData.set(null);
    this.previewLoading.set(true);
    this.showPreview.set(true);
    this.subscriptionService.previewTemplate(template._id).subscribe({
      next: (res) => {
        this.previewData.set(res.data);
        this.previewLoading.set(false);
      },
      error: () => {
        this.toast.error('Failed to load template preview');
        this.previewLoading.set(false);
        this.showPreview.set(false);
      },
    });
  }

  closePreview() {
    this.showPreview.set(false);
    this.previewData.set(null);
  }
}
