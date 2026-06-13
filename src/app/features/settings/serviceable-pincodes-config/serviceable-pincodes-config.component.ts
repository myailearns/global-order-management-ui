import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';

import { FormControlsModule, GomAlertToastService, GomButtonComponent } from '@gomlibs/ui';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { DisableIfNoFeatureDirective } from '../../../shared/directives/disable-if-no-feature.directive';
import {
  DeliveryPincodeConfig,
  DeliveryService,
  NonServiceableSuggestion,
  PincodeMode,
} from '../../delivery/delivery.service';

@Component({
  selector: 'gom-serviceable-pincodes-config',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormControlsModule, GomButtonComponent, DisableIfNoFeatureDirective],
  templateUrl: './serviceable-pincodes-config.component.html',
  styleUrl: './serviceable-pincodes-config.component.scss',
})
export class ServiceablePincodesConfigComponent implements OnInit {
  private readonly service = inject(DeliveryService);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(GomAlertToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly authSession = inject(AuthSessionService);

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly canWrite = computed(() => this.authSession.canWrite('tenant-admin'));

  readonly pincodeModeOptions = [
    { value: 'DISABLED', label: 'Disabled — No pincode check, delivery section hidden' },
    { value: 'SERVE_ALL', label: 'Serve All — Accept every pincode, show delivery estimate' },
    { value: 'RESTRICTED', label: 'Restricted — Only deliver to whitelisted pincodes' },
  ];

  readonly suggestionOptions = [
    { value: 'CALL_COURIER', label: 'Suggest Call Courier' },
    { value: 'CALL_PICKUP', label: 'Suggest Call Pickup' },
  ];

  readonly configForm = this.fb.group({
    pincodeMode: ['DISABLED' as PincodeMode],
    nonServiceableSuggestion: ['CALL_COURIER' as NonServiceableSuggestion],
    serviceablePincodesText: [''],
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
          const cfg = res.data?.deliveryPincodeConfig;
          if (cfg) {
            // Resolve legacy: if pincodeMode not set, derive from enabled boolean
            const mode = cfg.pincodeMode || (cfg.enabled ? 'RESTRICTED' : 'DISABLED');
            this.configForm.patchValue({
              pincodeMode: mode,
              nonServiceableSuggestion: cfg.nonServiceableSuggestion || 'CALL_COURIER',
              serviceablePincodesText: (cfg.serviceablePincodes || []).join('\n'),
            });
          }
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.errorMessage.set('Failed to load pincode config.');
        },
      });
  }

  save(): void {
    if (!this.canWrite()) {
      return;
    }

    const raw = this.configForm.getRawValue();
    const parsedPincodes = this.parsePincodes(String(raw.serviceablePincodesText || ''));

    // Allow: 500032, 5000*, 500032:2, 5000*:3
    const invalidPincodes = parsedPincodes.filter((code) => !/^\d{1,6}\*?(:\d{1,3})?$/.test(code));
    if (invalidPincodes.length) {
      this.errorMessage.set('Invalid format. Use: 500032, 5000*, 500032:2, 5000*:3 (pattern:days)');
      return;
    }

    const payload: Partial<DeliveryPincodeConfig> = {
      pincodeMode: (raw.pincodeMode || 'DISABLED') as PincodeMode,
      enabled: raw.pincodeMode === 'RESTRICTED', // keep legacy field in sync
      nonServiceableSuggestion: (raw.nonServiceableSuggestion || 'CALL_COURIER') as NonServiceableSuggestion,
      serviceablePincodes: [...new Set(parsedPincodes)],
    };

    this.saving.set(true);
    this.errorMessage.set(null);

    this.service.updateDeliveryPincodeConfig(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toast.success('Serviceable pincode configuration saved.');
          this.saving.set(false);
        },
        error: (err) => {
          const msg = (err as { error?: { message?: string } })?.error?.message;
          this.errorMessage.set(msg || 'Failed to save pincode configuration.');
          this.saving.set(false);
        },
      });
  }

  private parsePincodes(text: string): string[] {
    return text
      .split(/[,\s]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
}
