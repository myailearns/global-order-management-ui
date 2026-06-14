import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

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

  readonly configForm = this.fb.group({
    maxAttempts: [3, [Validators.required, Validators.min(1), Validators.max(10)]],
    lockoutMinutes: [15, [Validators.required, Validators.min(5), Validators.max(120)]],
    allowUnlimitedAttempts: [false],
    enableAutoUnlock: [false],
    unlockWindowMinutes: [30, [Validators.required, Validators.min(5), Validators.max(240)]],
  });

  ngOnInit(): void {
    this.loadConfig();
  }

  private loadConfig(): void {
    this.loading.set(true);
    this.service.getTenantConfig()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          const cfg = res.data?.authSecurityConfig;
          if (cfg) {
            this.configForm.patchValue({
              maxAttempts: cfg.maxAttempts,
              lockoutMinutes: cfg.lockoutMinutes,
              allowUnlimitedAttempts: cfg.allowUnlimitedAttempts,
              enableAutoUnlock: cfg.enableAutoUnlock,
              unlockWindowMinutes: cfg.unlockWindowMinutes,
            });
          }
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.errorMessage.set('Failed to load PIN security configuration.');
        },
      });
  }

  save(): void {
    if (!this.canWrite() || !this.configForm.valid) {
      return;
    }

    const raw = this.configForm.getRawValue();
    const payload: Partial<AuthSecurityConfig> = {
      maxAttempts: raw.maxAttempts || 3,
      lockoutMinutes: raw.lockoutMinutes || 15,
      allowUnlimitedAttempts: raw.allowUnlimitedAttempts || false,
      enableAutoUnlock: raw.enableAutoUnlock || false,
      unlockWindowMinutes: raw.unlockWindowMinutes || 30,
    };

    this.saving.set(true);
    this.errorMessage.set(null);

    this.service.updateAuthSecurityConfig(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toast.success('PIN security configuration saved successfully.');
          this.saving.set(false);
        },
        error: (err) => {
          const msg = (err as { error?: { message?: string } })?.error?.message;
          this.errorMessage.set(msg || 'Failed to save PIN security configuration.');
          this.saving.set(false);
        },
      });
  }
}
