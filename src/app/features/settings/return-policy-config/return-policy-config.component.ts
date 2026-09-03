import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { startWith } from 'rxjs';

import { FormControlsModule, GomAlertToastService, GomButtonComponent, GomTabsComponent, GomTabContentComponent } from '@gomlibs/ui';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { DisableIfNoFeatureDirective } from '../../../shared/directives/disable-if-no-feature.directive';
import { DeliveryService, ReturnPolicy, ReturnWindowUnit, RefundProcessingUnit } from '../../delivery/delivery.service';

@Component({
  selector: 'gom-return-policy-config',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormControlsModule, GomButtonComponent, GomTabsComponent, GomTabContentComponent, DisableIfNoFeatureDirective],
  templateUrl: './return-policy-config.component.html',
  styleUrl: './return-policy-config.component.scss',
})
export class ReturnPolicyConfigComponent implements OnInit {
  private readonly service = inject(DeliveryService);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(GomAlertToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly authSession = inject(AuthSessionService);

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly canEdit = computed(() => this.authSession.hasFeature('returnPolicy.config'));
  
  // Active tab/mode
  readonly activeMode = signal<'delivery' | 'pickup'>('delivery');
  
  // Tenant config to determine enabled modes
  readonly tenantConfig = signal<any>(null);
  readonly fulfillmentMode = computed(() => this.tenantConfig()?.storefrontConfig?.fulfillmentMode || 'DELIVERY');
  readonly deliveryEnabled = computed(() => {
    const mode = this.fulfillmentMode();
    return mode === 'DELIVERY' || mode === 'BOTH';
  });
  readonly pickupEnabled = computed(() => {
    const mode = this.fulfillmentMode();
    return mode === 'PICKUP' || mode === 'BOTH';
  });
  readonly showTabs = computed(() => this.deliveryEnabled() && this.pickupEnabled());
  readonly visibleTabs = computed(() => {
    const tabs = [];
    if (this.deliveryEnabled()) {
      tabs.push({ id: 'delivery', label: 'Delivery Orders' });
    }
    if (this.pickupEnabled()) {
      tabs.push({ id: 'pickup', label: 'Pickup Orders' });
    }
    return tabs;
  });

  // Delivery form
  readonly deliveryForm = this.fb.group({
    returnsEnabled: [false],
    allowRefund: [false],
    allowExchange: [false],
    returnWindowDays: [7, [Validators.required, Validators.min(0), Validators.max(9999)]],
    returnWindowUnit: ['DAYS' as ReturnWindowUnit],
    allowUpiRefund: [true],
    allowBankTransferRefund: [true],
    refundProcessingTime: [7, [Validators.min(0), Validators.max(365)]],
    refundProcessingUnit: ['WORKING_DAYS' as RefundProcessingUnit],
    guidelines: [''],
  });

  // Pickup form
  readonly pickupForm = this.fb.group({
    returnsEnabled: [false],
    allowRefund: [false],
    allowExchange: [false],
    returnWindowDays: [2, [Validators.required, Validators.min(0), Validators.max(9999)]],
    returnWindowUnit: ['DAYS' as ReturnWindowUnit],
    allowUpiRefund: [true],
    allowBankTransferRefund: [false],
    refundProcessingTime: [7, [Validators.min(0), Validators.max(365)]],
    refundProcessingUnit: ['WORKING_DAYS' as RefundProcessingUnit],
    guidelines: [''],
  });

  // Delivery signals for conditional rendering
  readonly deliveryReturnsEnabled = toSignal(
    this.deliveryForm.controls.returnsEnabled.valueChanges.pipe(
      startWith(this.deliveryForm.controls.returnsEnabled.value)
    ),
    { initialValue: this.deliveryForm.controls.returnsEnabled.value }
  );

  readonly deliveryAllowRefund = toSignal(
    this.deliveryForm.controls.allowRefund.valueChanges.pipe(
      startWith(this.deliveryForm.controls.allowRefund.value)
    ),
    { initialValue: this.deliveryForm.controls.allowRefund.value }
  );

  readonly deliveryAllowExchange = toSignal(
    this.deliveryForm.controls.allowExchange.valueChanges.pipe(
      startWith(this.deliveryForm.controls.allowExchange.value)
    ),
    { initialValue: this.deliveryForm.controls.allowExchange.value }
  );

  readonly deliveryHasAnyRequestType = computed(() => this.deliveryAllowRefund() || this.deliveryAllowExchange());

  // Pickup signals for conditional rendering
  readonly pickupReturnsEnabled = toSignal(
    this.pickupForm.controls.returnsEnabled.valueChanges.pipe(
      startWith(this.pickupForm.controls.returnsEnabled.value)
    ),
    { initialValue: this.pickupForm.controls.returnsEnabled.value }
  );

  readonly pickupAllowRefund = toSignal(
    this.pickupForm.controls.allowRefund.valueChanges.pipe(
      startWith(this.pickupForm.controls.allowRefund.value)
    ),
    { initialValue: this.pickupForm.controls.allowRefund.value }
  );

  readonly pickupAllowExchange = toSignal(
    this.pickupForm.controls.allowExchange.valueChanges.pipe(
      startWith(this.pickupForm.controls.allowExchange.value)
    ),
    { initialValue: this.pickupForm.controls.allowExchange.value }
  );

  readonly pickupHasAnyRequestType = computed(() => this.pickupAllowRefund() || this.pickupAllowExchange());

  readonly windowUnitOptions = [
    { value: 'DAYS' as ReturnWindowUnit, label: 'Days' },
    { value: 'HOURS' as ReturnWindowUnit, label: 'Hours' },
    { value: 'MONTHS' as ReturnWindowUnit, label: 'Months' },
  ];

  readonly refundProcessingUnitOptions = [
    { value: 'WORKING_DAYS' as RefundProcessingUnit, label: 'Working Days' },
    { value: 'DAYS' as RefundProcessingUnit, label: 'Days' },
    { value: 'HOURS' as RefundProcessingUnit, label: 'Hours' },
  ];

  ngOnInit(): void {
    this.loadPolicies();
  }
  
  switchMode(mode: string | number): void {
    this.activeMode.set(String(mode) as 'delivery' | 'pickup');
  }

  private loadPolicies(): void {
    this.loading.set(true);
    this.service
      .getTenantConfig()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.tenantConfig.set(res.data);
          const deliveryPolicy = res.data?.deliveryReturnPolicy;
          const pickupPolicy = res.data?.pickupReturnPolicy;
          
          // Load delivery policy
          if (deliveryPolicy) {
            this.deliveryForm.patchValue({
              returnsEnabled: deliveryPolicy.returnsEnabled ?? false,
              allowRefund: deliveryPolicy.allowRefund ?? false,
              allowExchange: deliveryPolicy.allowExchange ?? false,
              returnWindowDays: deliveryPolicy.returnWindowDays ?? 7,
              returnWindowUnit: deliveryPolicy.returnWindowUnit || 'DAYS',
              allowUpiRefund: deliveryPolicy.allowUpiRefund ?? true,
              allowBankTransferRefund: deliveryPolicy.allowBankTransferRefund ?? true,
              refundProcessingTime: deliveryPolicy.refundProcessingTime ?? 7,
              refundProcessingUnit: deliveryPolicy.refundProcessingUnit || 'WORKING_DAYS',
              guidelines: deliveryPolicy.guidelines || '',
            });
          }
          
          // Load pickup policy
          if (pickupPolicy) {
            this.pickupForm.patchValue({
              returnsEnabled: pickupPolicy.returnsEnabled ?? false,
              allowRefund: pickupPolicy.allowRefund ?? false,
              allowExchange: pickupPolicy.allowExchange ?? false,
              returnWindowDays: pickupPolicy.returnWindowDays ?? 2,
              returnWindowUnit: pickupPolicy.returnWindowUnit || 'DAYS',
              allowUpiRefund: pickupPolicy.allowUpiRefund ?? true,
              allowBankTransferRefund: pickupPolicy.allowBankTransferRefund ?? false,
              refundProcessingTime: pickupPolicy.refundProcessingTime ?? 7,
              refundProcessingUnit: pickupPolicy.refundProcessingUnit || 'WORKING_DAYS',
              guidelines: pickupPolicy.guidelines || '',
            });
          }
          
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.errorMessage.set('Failed to load return policies.');
        },
      });
  }

  saveDeliveryPolicy(): void {
    if (!this.canEdit()) {
      return;
    }

    if (this.deliveryForm.invalid) {
      this.errorMessage.set('Please fix validation errors before saving.');
      return;
    }

    const raw = this.deliveryForm.getRawValue();

    // Validation: if returns enabled, at least one option must be available
    if (raw.returnsEnabled && !raw.allowRefund && !raw.allowExchange) {
      this.errorMessage.set('Returns are enabled but no request types are allowed. Enable at least Refund or Exchange.');
      return;
    }

    const payload: Partial<ReturnPolicy> = {
      returnsEnabled: raw.returnsEnabled ?? false,
      allowRefund: raw.allowRefund ?? false,
      allowExchange: raw.allowExchange ?? false,
      returnWindowDays: raw.returnWindowDays ?? 7,
      returnWindowUnit: raw.returnWindowUnit || 'DAYS',
      allowUpiRefund: raw.allowUpiRefund ?? true,
      allowBankTransferRefund: raw.allowBankTransferRefund ?? true,
      refundProcessingTime: raw.refundProcessingTime ?? 7,
      refundProcessingUnit: raw.refundProcessingUnit || 'WORKING_DAYS',
      guidelines: raw.guidelines || '',
    };

    this.saving.set(true);
    this.errorMessage.set(null);

    this.service
      .updateDeliveryReturnPolicy(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toast.success('Delivery return policy saved.');
          this.saving.set(false);
        },
        error: (err) => {
          const msg = (err as { error?: { message?: string } })?.error?.message;
          this.errorMessage.set(msg || 'Failed to save delivery return policy.');
          this.saving.set(false);
        },
      });
  }

  savePickupPolicy(): void {
    if (!this.canEdit()) {
      return;
    }

    if (this.pickupForm.invalid) {
      this.errorMessage.set('Please fix validation errors before saving.');
      return;
    }

    const raw = this.pickupForm.getRawValue();

    // Validation: if returns enabled, at least one option must be available
    if (raw.returnsEnabled && !raw.allowRefund && !raw.allowExchange) {
      this.errorMessage.set('Returns are enabled but no request types are allowed. Enable at least Refund or Exchange.');
      return;
    }

    const payload: Partial<ReturnPolicy> = {
      returnsEnabled: raw.returnsEnabled ?? false,
      allowRefund: raw.allowRefund ?? false,
      allowExchange: raw.allowExchange ?? false,
      returnWindowDays: raw.returnWindowDays ?? 2,
      returnWindowUnit: raw.returnWindowUnit || 'DAYS',
      allowUpiRefund: raw.allowUpiRefund ?? true,
      allowBankTransferRefund: raw.allowBankTransferRefund ?? false,
      refundProcessingTime: raw.refundProcessingTime ?? 7,
      refundProcessingUnit: raw.refundProcessingUnit || 'WORKING_DAYS',
      guidelines: raw.guidelines || '',
    };

    this.saving.set(true);
    this.errorMessage.set(null);

    this.service
      .updatePickupReturnPolicy(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toast.success('Pickup return policy saved.');
          this.saving.set(false);
        },
        error: (err) => {
          const msg = (err as { error?: { message?: string } })?.error?.message;
          this.errorMessage.set(msg || 'Failed to save pickup return policy.');
          this.saving.set(false);
        },
      });
  }
}
