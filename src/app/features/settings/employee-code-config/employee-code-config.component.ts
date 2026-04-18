import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, debounceTime, of, startWith, switchMap } from 'rxjs';

import { GomAlertToastService } from '@gomlibs/ui';
import { FormControlsModule, GomButtonComponent } from '@gomlibs/ui';
import {
  DeliveryService,
  EmployeeCodeConfig,
  EmployeeCodeStrategy,
} from '../../delivery/delivery.service';

@Component({
  selector: 'gom-employee-code-config',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormControlsModule, GomButtonComponent],
  templateUrl: './employee-code-config.component.html',
  styleUrl: './employee-code-config.component.scss',
})
export class EmployeeCodeConfigComponent implements OnInit {
  private readonly service = inject(DeliveryService);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(GomAlertToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly previewCode = signal<string>('');
  readonly errorMessage = signal<string | null>(null);

  readonly strategyOptions = [
    { value: 'DEFAULT_FORMULA', label: 'Default Formula  (Initials + Last 4 of phone)' },
    { value: 'PREFIX_SEQUENCE', label: 'Prefix + Sequence  (e.g. RID-0001, RID-0002…)' },
    { value: 'MANUAL', label: 'Manual  (User enters the code)' },
  ];

  readonly separatorOptions = [
    { value: '-', label: 'Hyphen  (RID-001)' },
    { value: '_', label: 'Underscore  (RID_001)' },
    { value: '', label: 'None  (RID001)' },
  ];

  readonly paddingOptions = [
    { value: '3', label: '3 digits  (001)' },
    { value: '4', label: '4 digits  (0001)' },
    { value: '5', label: '5 digits  (00001)' },
    { value: '6', label: '6 digits  (000001)' },
  ];

  readonly configForm = this.fb.group({
    strategy: ['DEFAULT_FORMULA' as EmployeeCodeStrategy, [Validators.required]],
    prefix: ['RID', [Validators.required]],
    separator: ['-'],
    sequencePadding: ['4'],
    sequenceStart: [1, [Validators.min(1)]],
    allowManualOverride: [false],
  });

  readonly isSequence = computed(
    () => this.configForm.controls.strategy.value === 'PREFIX_SEQUENCE'
  );

  readonly isManual = computed(
    () => this.configForm.controls.strategy.value === 'MANUAL'
  );

  ngOnInit(): void {
    this.loadConfig();
    this.setupPreview();
  }

  private loadConfig(): void {
    this.loading.set(true);
    this.service.getTenantConfig()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          const cfg = res.data?.employeeCodeConfig;
          if (cfg) {
            this.configForm.patchValue({
              strategy: cfg.strategy,
              prefix: cfg.prefix,
              separator: cfg.separator,
              sequencePadding: String(cfg.sequencePadding ?? 4),
              sequenceStart: cfg.sequenceStart ?? 1,
              allowManualOverride: cfg.allowManualOverride,
            });
          }
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
        },
      });
  }

  private setupPreview(): void {
    this.configForm.valueChanges
      .pipe(
        startWith(this.configForm.getRawValue()),
        debounceTime(300),
        switchMap((val) => {
          const strategy = val.strategy as EmployeeCodeStrategy;
          const prefix = String(val.prefix || 'RID').trim();
          const sep = val.separator ?? '-';
          const padding = Number(val.sequencePadding ?? 4);

          if (strategy === 'DEFAULT_FORMULA') {
            const code = `${prefix}${sep}VK8193`;
            this.previewCode.set(code);
            return of(null);
          }

          if (strategy === 'PREFIX_SEQUENCE') {
            const start = Number(val.sequenceStart ?? 1);
            const padded = String(start).padStart(padding, '0');
            this.previewCode.set(`${prefix}${sep}${padded}`);
            return of(null);
          }

          if (strategy === 'MANUAL') {
            this.previewCode.set(`${prefix}${sep}CUSTOM`);
            return of(null);
          }

          return of(null);
        }),
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe();
  }

  save(): void {
    this.configForm.markAllAsTouched();
    if (this.configForm.invalid) return;

    const raw = this.configForm.getRawValue();
    const payload: Partial<EmployeeCodeConfig> = {
      strategy: raw.strategy as EmployeeCodeStrategy,
      prefix: String(raw.prefix || 'RID').trim(),
      separator: raw.separator ?? '-',
      sequencePadding: Number(raw.sequencePadding ?? 4),
      sequenceStart: Number(raw.sequenceStart ?? 1),
      allowManualOverride: Boolean(raw.allowManualOverride),
    };

    this.saving.set(true);
    this.errorMessage.set(null);

    this.service.updateTenantConfig(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toast.success('Employee code configuration saved.');
          this.saving.set(false);
        },
        error: (err) => {
          const msg = (err as { error?: { message?: string } })?.error?.message;
          this.errorMessage.set(msg || 'Failed to save configuration.');
          this.saving.set(false);
        },
      });
  }
}
