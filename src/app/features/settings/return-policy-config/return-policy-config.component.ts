import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { FormControlsModule, GomAlertToastService, GomButtonComponent } from '@gomlibs/ui';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { DisableIfNoFeatureDirective } from '../../../shared/directives/disable-if-no-feature.directive';
import { DeliveryService, ReturnPolicy } from '../../delivery/delivery.service';

@Component({
  selector: 'gom-return-policy-config',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormControlsModule, GomButtonComponent, DisableIfNoFeatureDirective],
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
  readonly canWrite = computed(() => this.authSession.canWrite('tenant-admin'));

  readonly policyForm = this.fb.group({
    returnsEnabled: [true],
    allowRefund: [true],
    allowExchange: [true],
    returnWindowDays: [7, [Validators.required, Validators.min(0), Validators.max(365)]],
  });

  ngOnInit(): void {
    this.loadPolicy();
  }

  private loadPolicy(): void {
    this.loading.set(true);
    this.service
      .getTenantConfig()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          const policy = res.data?.returnPolicy;
          if (policy) {
            this.policyForm.patchValue({
              returnsEnabled: policy.returnsEnabled !== false,
              allowRefund: policy.allowRefund !== false,
              allowExchange: policy.allowExchange !== false,
              returnWindowDays: policy.returnWindowDays ?? 7,
            });
          }
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.errorMessage.set('Failed to load return policy.');
        },
      });
  }

  save(): void {
    if (!this.canWrite()) {
      return;
    }

    if (this.policyForm.invalid) {
      this.errorMessage.set('Please fix validation errors before saving.');
      return;
    }

    const raw = this.policyForm.getRawValue();

    // Validation: if returns enabled, at least one option must be available
    if (raw.returnsEnabled && !raw.allowRefund && !raw.allowExchange) {
      this.errorMessage.set('Returns are enabled but no request types are allowed. Enable at least Refund or Exchange.');
      return;
    }

    const payload: Partial<ReturnPolicy> = {
      returnsEnabled: raw.returnsEnabled ?? true,
      allowRefund: raw.allowRefund ?? true,
      allowExchange: raw.allowExchange ?? true,
      returnWindowDays: raw.returnWindowDays ?? 7,
    };

    this.saving.set(true);
    this.errorMessage.set(null);

    this.service
      .updateReturnPolicy(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toast.success('Return policy saved.');
          this.saving.set(false);
        },
        error: (err) => {
          const msg = (err as { error?: { message?: string } })?.error?.message;
          this.errorMessage.set(msg || 'Failed to save return policy.');
          this.saving.set(false);
        },
      });
  }
}
