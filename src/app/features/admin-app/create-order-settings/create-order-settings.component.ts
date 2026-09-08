import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormArray, FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import {
  FormControlsModule,
  GomAccordionComponent,
  GomAlertToastService,
  GomButtonComponent,
  GomInputComponent,
  GomTabContentComponent,
  GomTabsComponent,
  TabItem,
} from '@gomlibs/ui';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { CreateOrderConfig, DeliveryService } from '../../delivery/delivery.service';

@Component({
  selector: 'gom-create-order-settings',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    TranslateModule,
    FormControlsModule,
    GomAccordionComponent,
    GomButtonComponent,
    GomInputComponent,
    GomTabsComponent,
    GomTabContentComponent,
  ],
  templateUrl: './create-order-settings.component.html',
  styleUrl: './create-order-settings.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateOrderSettingsComponent implements OnInit {
  private readonly service = inject(DeliveryService);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(GomAlertToastService);
  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly authSession = inject(AuthSessionService);

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly canEdit = computed(() => this.authSession.hasCapability('orders'));
  readonly tabs: TabItem[] = [
    { id: 'base', label: this.translate.instant('createOrderSettings.tabs.base') },
  ];
  readonly activeTab = signal<'base'>('base');
  readonly paymentStatusExpanded = signal(false);
  readonly orderIntakeExpanded = signal(false);
  readonly selectedOrderType = signal<OrderType>('pickup');
  readonly orderTypes: OrderType[] = ['pickup', 'delivery', 'counter'];

  readonly form = this.fb.nonNullable.group({
    enableOfflineStorage: false,
    requireMemberForBilling: false,
    paymentStatuses: this.fb.nonNullable.group({
      pickup: this.createStatusArray(['At Pickup', 'At Order Time']),
      delivery: this.createStatusArray(['At Delivery', 'At Order Time']),
      counter: this.createStatusArray(['Later', 'At Order Time']),
    }),
    orderIntakeChannels: this.createChannelArray(DEFAULT_ORDER_INTAKE_CHANNELS),
  });

  ngOnInit(): void {
    this.loadSettings();
  }

  switchTab(tabId: string | number): void {
    if (tabId === 'base') {
      this.activeTab.set('base');
    }
  }

  selectOrderType(orderType: OrderType): void {
    this.selectedOrderType.set(orderType);
  }

  paymentStatusControls(orderType = this.selectedOrderType()): FormControl<string>[] {
    return this.form.controls.paymentStatuses.controls[orderType].controls;
  }

  addPaymentStatus(): void {
    const statuses = this.form.controls.paymentStatuses.controls[this.selectedOrderType()];
    if (statuses.length >= 20) {
      return;
    }

    statuses.push(this.createStatusControl(''));
    this.form.markAsDirty();
  }

  removePaymentStatus(index: number): void {
    const statuses = this.form.controls.paymentStatuses.controls[this.selectedOrderType()];
    if (statuses.length <= 1) {
      return;
    }

    statuses.removeAt(index);
    this.form.markAsDirty();
  }

  orderIntakeChannelControls() {
    return this.form.controls.orderIntakeChannels.controls;
  }

  addOrderIntakeChannel(): void {
    const channels = this.form.controls.orderIntakeChannels;
    if (channels.length >= 30) {
      return;
    }

    channels.push(this.createChannelGroup({ name: '', enabled: true }));
    this.form.markAsDirty();
  }

  save(): void {
    if (!this.canEdit() || this.loading() || this.saving()) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMessage.set(this.translate.instant('createOrderSettings.messages.statusRequired'));
      return;
    }

    if (this.hasDuplicateChannelNames()) {
      this.errorMessage.set(this.translate.instant('createOrderSettings.messages.duplicateChannel'));
      return;
    }

    this.saving.set(true);
    this.errorMessage.set(null);

    const config: CreateOrderConfig = {
      enableOfflineStorage: this.form.controls.enableOfflineStorage.value,
      requireMemberForBilling: this.form.controls.requireMemberForBilling.value,
      paymentStatuses: {
        pickup: this.normalizedStatuses('pickup'),
        delivery: this.normalizedStatuses('delivery'),
        counter: this.normalizedStatuses('counter'),
      },
      orderIntakeChannels: this.form.controls.orderIntakeChannels.getRawValue().map((channel) => ({
        name: channel.name.trim(),
        enabled: channel.enabled,
      })),
    };

    this.service
      .updateCreateOrderConfig(config)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.form.markAsPristine();
          this.toast.success(this.translate.instant('createOrderSettings.messages.saved'));
        },
        error: (error) => {
          this.saving.set(false);
          this.errorMessage.set(
            error?.error?.message || this.translate.instant('createOrderSettings.messages.saveError'),
          );
        },
      });
  }

  private loadSettings(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.service
      .getTenantConfig()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          const config = response.data?.createOrderConfig;
          this.form.controls.enableOfflineStorage.setValue(Boolean(config?.enableOfflineStorage));
          this.form.controls.requireMemberForBilling.setValue(Boolean(config?.requireMemberForBilling));
          this.replaceStatuses('pickup', config?.paymentStatuses?.pickup, ['At Pickup', 'At Order Time']);
          this.replaceStatuses('delivery', config?.paymentStatuses?.delivery, ['At Delivery', 'At Order Time']);
          this.replaceStatuses('counter', config?.paymentStatuses?.counter, ['Later', 'At Order Time']);
          this.replaceChannels(config?.orderIntakeChannels);
          this.form.markAsPristine();
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.errorMessage.set(this.translate.instant('createOrderSettings.messages.loadError'));
        },
      });
  }

  private createStatusArray(values: string[]): FormArray<FormControl<string>> {
    return this.fb.nonNullable.array(values.map((value) => this.createStatusControl(value)));
  }

  private createStatusControl(value: string): FormControl<string> {
    return this.fb.nonNullable.control(value, [Validators.required, Validators.maxLength(80)]);
  }

  private replaceStatuses(orderType: OrderType, values: string[] | undefined, defaults: string[]): void {
    const statuses = this.form.controls.paymentStatuses.controls[orderType];
    const resolved = Array.isArray(values) && values.length ? values : defaults;
    statuses.clear();
    resolved.forEach((value) => statuses.push(this.createStatusControl(value)));
  }

  private normalizedStatuses(orderType: OrderType): string[] {
    return this.form.controls.paymentStatuses.controls[orderType].getRawValue().map((value) => value.trim());
  }

  private createChannelArray(values: OrderIntakeChannel[]) {
    return this.fb.nonNullable.array(values.map((value) => this.createChannelGroup(value)));
  }

  private createChannelGroup(value: OrderIntakeChannel) {
    return this.fb.nonNullable.group({
      name: this.fb.nonNullable.control(value.name, [Validators.required, Validators.maxLength(80)]),
      enabled: value.enabled,
    });
  }

  private replaceChannels(values: OrderIntakeChannel[] | undefined): void {
    const channels = this.form.controls.orderIntakeChannels;
    const resolved = Array.isArray(values) && values.length ? values : DEFAULT_ORDER_INTAKE_CHANNELS;
    channels.clear();
    resolved.forEach((value) => channels.push(this.createChannelGroup(value)));
  }

  private hasDuplicateChannelNames(): boolean {
    const names = this.form.controls.orderIntakeChannels.getRawValue()
      .map((channel) => channel.name.trim().toLowerCase());
    return new Set(names).size !== names.length;
  }
}

type OrderType = 'pickup' | 'delivery' | 'counter';

interface OrderIntakeChannel {
  name: string;
  enabled: boolean;
}

const DEFAULT_ORDER_INTAKE_CHANNELS: OrderIntakeChannel[] = [
  { name: 'Shop Counter', enabled: true },
  { name: 'WhatsApp Message', enabled: true },
  { name: 'WhatsApp Business', enabled: true },
  { name: 'Instagram', enabled: true },
  { name: 'On Call', enabled: true },
  { name: 'Other', enabled: true },
];
