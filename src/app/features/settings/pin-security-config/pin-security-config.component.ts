import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { map, startWith } from 'rxjs';

import { FormControlsModule, GomAlertToastService, GomButtonComponent } from '@gomlibs/ui';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { DisableIfNoFeatureDirective } from '../../../shared/directives/disable-if-no-feature.directive';
import {
  AuthSecurityConfig,
  DeliveryService,
} from '../../delivery/delivery.service';

@Component({
  selector: 'gom-pin-security-config',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormControlsModule, GomButtonComponent, DisableIfNoFeatureDirective],
  templateUrl: './pin-security-config.component.html',
  styleUrl: './pin-security-config.component.scss',
})
export class PinSecurityConfigComponent implements OnInit {
  private readonly service = inject(DeliveryService);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(GomAlertToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly authSession = inject(AuthSessionService);

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly canWrite = computed(() => this.authSession.canWrite('tenant-admin'));
  private readonly initialPayloadFingerprint = signal('');

  readonly configForm = this.fb.group({
    maxAttempts: [3, [Validators.required, Validators.min(1), Validators.max(10)]],
    lockoutMinutes: [15, [Validators.required, Validators.min(1), Validators.max(120)]],
    allowUnlimitedAttempts: [true],
    enableAutoUnlock: [{ value: true, disabled: true }],
  });

  private readonly formRawValue = toSignal(
    this.configForm.valueChanges.pipe(
      startWith(this.configForm.getRawValue()),
      map(() => this.configForm.getRawValue())
    ),
    { initialValue: this.configForm.getRawValue() }
  );

  private readonly allowUnlimitedAttemptsValue = toSignal(
    this.configForm.controls.allowUnlimitedAttempts.valueChanges.pipe(
      startWith(this.configForm.controls.allowUnlimitedAttempts.value)
    ),
    { initialValue: this.configForm.controls.allowUnlimitedAttempts.value }
  );
  private readonly enableAutoUnlockValue = toSignal(
    this.configForm.controls.enableAutoUnlock.valueChanges.pipe(
      startWith(this.configForm.controls.enableAutoUnlock.value)
    ),
    { initialValue: this.configForm.controls.enableAutoUnlock.value }
  );

  readonly isUnlimitedAttempts = computed(() => Boolean(this.allowUnlimitedAttemptsValue()));
  readonly isAutoUnlockEnabled = computed(() => Boolean(this.enableAutoUnlockValue()));
  readonly shouldShowAttemptControls = computed(() => !this.isUnlimitedAttempts());
  readonly shouldShowLockoutDuration = computed(() => !this.isUnlimitedAttempts() && this.isAutoUnlockEnabled());
  readonly hasChanges = computed(
    () => this.toPayloadFingerprint(this.buildPayloadFromRaw(this.formRawValue())) !== this.initialPayloadFingerprint()
  );

  ngOnInit(): void {
    this.configForm.controls.allowUnlimitedAttempts.valueChanges
      .pipe(startWith(this.configForm.controls.allowUnlimitedAttempts.value), takeUntilDestroyed(this.destroyRef))
      .subscribe((enabled) => {
        if (enabled) {
          this.configForm.controls.maxAttempts.disable({ emitEvent: false });
          this.configForm.controls.enableAutoUnlock.setValue(true, { emitEvent: false });
          this.configForm.controls.enableAutoUnlock.disable({ emitEvent: false });
          this.configForm.controls.lockoutMinutes.enable({ emitEvent: false });
          return;
        }

        this.configForm.controls.maxAttempts.enable({ emitEvent: false });
        this.configForm.controls.enableAutoUnlock.setValue(true, { emitEvent: false });
        this.configForm.controls.enableAutoUnlock.disable({ emitEvent: false });
        this.configForm.controls.lockoutMinutes.enable({ emitEvent: false });
      });

    this.configForm.controls.enableAutoUnlock.valueChanges
      .pipe(startWith(this.configForm.controls.enableAutoUnlock.value), takeUntilDestroyed(this.destroyRef))
      .subscribe((enabled) => {
        if (this.configForm.controls.allowUnlimitedAttempts.value) {
          this.configForm.controls.lockoutMinutes.enable({ emitEvent: false });
          return;
        }

        const lockout = Number(this.configForm.controls.lockoutMinutes.value);
        if (!Number.isInteger(lockout) || lockout < 1 || lockout > 120) {
          this.configForm.controls.lockoutMinutes.setValue(15, { emitEvent: false });
        }

        this.configForm.controls.lockoutMinutes.enable({ emitEvent: false });
      });

    this.loadConfig();
  }

  private loadConfig(): void {
    this.loading.set(true);
    this.service.getTenantConfig()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          const cfg = res.data?.authSecurityConfig;
          const policy = (cfg as AuthSecurityConfig & { pinPolicy?: Partial<AuthSecurityConfig> } | undefined)?.pinPolicy || cfg || {};

          this.configForm.patchValue({
            maxAttempts: this.normalizeMaxAttempts(policy.maxAttempts),
            lockoutMinutes: this.normalizeLockoutMinutes(policy.lockoutMinutes),
            allowUnlimitedAttempts: Boolean(policy.allowUnlimitedAttempts ?? true),
            enableAutoUnlock: true,
          });

          this.initialPayloadFingerprint.set(
            this.toPayloadFingerprint(this.buildPayloadFromRaw(this.configForm.getRawValue()))
          );

          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.errorMessage.set('Failed to load PIN security configuration.');
        },
      });
  }

  save(): void {
    if (!this.canWrite()) {
      return;
    }

    if (!this.hasChanges()) {
      return;
    }

    if (!this.configForm.valid) {
      this.configForm.markAllAsTouched();
      this.errorMessage.set(this.getValidationMessage());
      return;
    }

    const payload = this.buildPayloadFromRaw(this.configForm.getRawValue());

    this.saving.set(true);
    this.errorMessage.set(null);

    this.service.updateAuthSecurityConfig(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toast.success('PIN security configuration saved successfully.');
          this.initialPayloadFingerprint.set(this.toPayloadFingerprint(payload));
          this.saving.set(false);
        },
        error: (err) => {
          const msg = (err as { error?: { message?: string } })?.error?.message;
          this.errorMessage.set(msg || 'Failed to save PIN security configuration.');
          this.saving.set(false);
        },
      });
  }

  private normalizeMaxAttempts(value: unknown): number {
    const parsed = Number(value);
    if (!Number.isInteger(parsed)) {
      return 3;
    }

    return Math.min(10, Math.max(1, parsed));
  }

  private normalizeLockoutMinutes(value: unknown): number {
    const parsed = Number(value);
    if (!Number.isInteger(parsed)) {
      return 15;
    }

    return Math.min(120, Math.max(1, parsed));
  }

  private buildPayloadFromRaw(raw: {
    maxAttempts?: number | null;
    lockoutMinutes?: number | null;
    allowUnlimitedAttempts?: boolean | null;
    enableAutoUnlock?: boolean | null;
  }): AuthSecurityConfig {
    const allowUnlimitedAttempts = Boolean(raw.allowUnlimitedAttempts);
    const enableAutoUnlock = true;
    const maxAttempts = allowUnlimitedAttempts ? 3 : this.normalizeMaxAttempts(raw.maxAttempts);
    const lockoutMinutes = this.normalizeLockoutMinutes(raw.lockoutMinutes);

    return {
      maxAttempts,
      lockoutMinutes,
      allowUnlimitedAttempts,
      enableAutoUnlock,
      unlockWindowMinutes: lockoutMinutes,
    };
  }

  private toPayloadFingerprint(payload: AuthSecurityConfig): string {
    return JSON.stringify(payload);
  }

  getMaxAttemptsError(): string {
    if (!this.shouldShowAttemptControls()) {
      return '';
    }

    const control = this.configForm.controls.maxAttempts;
    if (!control.touched || !control.invalid) {
      return '';
    }

    if (control.hasError('required')) {
      return 'Maximum PIN attempts is required.';
    }

    return 'Maximum PIN attempts must be between 1 and 10.';
  }

  getLockoutDurationError(): string {
    if (!this.shouldShowLockoutDuration()) {
      return '';
    }

    const control = this.configForm.controls.lockoutMinutes;
    if (!control.touched || !control.invalid) {
      return '';
    }

    if (control.hasError('required')) {
      return 'Lockout duration is required when Auto-Unlock is enabled.';
    }

    return 'Lockout duration must be between 1 and 120 minutes.';
  }

  private getValidationMessage(): string {
    const maxAttemptsError = this.getMaxAttemptsError();
    if (maxAttemptsError) {
      return maxAttemptsError;
    }

    const lockoutError = this.getLockoutDurationError();
    if (lockoutError) {
      return lockoutError;
    }

    return 'Please fix validation errors before saving.';
  }
}
