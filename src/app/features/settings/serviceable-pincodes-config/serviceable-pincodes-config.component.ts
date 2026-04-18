import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';

import { GomAlertToastService } from '@gomlibs/ui';
import { FormControlsModule, GomButtonComponent } from '@gomlibs/ui';
import {
  DeliveryPincodeConfig,
  DeliveryService,
  NonServiceableSuggestion,
} from '../../delivery/delivery.service';

@Component({
  selector: 'gom-serviceable-pincodes-config',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormControlsModule, GomButtonComponent],
  templateUrl: './serviceable-pincodes-config.component.html',
  styleUrl: './serviceable-pincodes-config.component.scss',
})
export class ServiceablePincodesConfigComponent implements OnInit {
  private readonly service = inject(DeliveryService);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(GomAlertToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly suggestionOptions = [
    { value: 'CALL_COURIER', label: 'Suggest Call Courier' },
    { value: 'CALL_PICKUP', label: 'Suggest Call Pickup' },
  ];

  readonly configForm = this.fb.group({
    enabled: [false],
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
            this.configForm.patchValue({
              enabled: Boolean(cfg.enabled),
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
    const raw = this.configForm.getRawValue();
    const parsedPincodes = this.parsePincodes(String(raw.serviceablePincodesText || ''));

    const invalidPincodes = parsedPincodes.filter((code) => !/^\d{6}$/.test(code));
    if (invalidPincodes.length) {
      this.errorMessage.set('Only valid 6-digit pincodes are allowed.');
      return;
    }

    const payload: Partial<DeliveryPincodeConfig> = {
      enabled: Boolean(raw.enabled),
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
