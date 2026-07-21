import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { debounceTime, startWith } from 'rxjs';

import { FormControlsModule, GomAlertToastService, GomButtonComponent } from '@gomlibs/ui';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { DisableIfNoFeatureDirective } from '../../../shared/directives/disable-if-no-feature.directive';
import { DeliveryService, StaffCodeConfig } from '../../delivery/delivery.service';

@Component({
  selector: 'gom-employee-code-config',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormControlsModule, GomButtonComponent, DisableIfNoFeatureDirective],
  templateUrl: './employee-code-config.component.html',
  styleUrl: './employee-code-config.component.scss',
})
export class EmployeeCodeConfigComponent implements OnInit {
  private readonly service = inject(DeliveryService);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(GomAlertToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly authSession = inject(AuthSessionService);

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly canWrite = computed(() => this.authSession.canWrite('tenant-admin'));

  readonly employeePreview = signal<string>('');
  readonly riderPreview = signal<string>('');

  readonly separatorOptions = [
    { value: '-', label: 'Hyphen  (EMP-0001)' },
    { value: '_', label: 'Underscore  (EMP_0001)' },
    { value: '', label: 'None  (EMP0001)' },
  ];

  readonly paddingOptions = [
    { value: '3', label: '3 digits  (001)' },
    { value: '4', label: '4 digits  (0001)' },
    { value: '5', label: '5 digits  (00001)' },
    { value: '6', label: '6 digits  (000001)' },
  ];

  readonly configForm = this.fb.group({
    employeePrefix: ['EMP', [Validators.required]],
    riderPrefix: ['RID', [Validators.required]],
    separator: ['-'],
    sequencePadding: ['4'],
    allowManualOverride: [false],
  });

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
          const cfg = res.data?.staffCodeConfig;
          if (cfg) {
            this.configForm.patchValue({
              employeePrefix: cfg.employeePrefix || 'EMP',
              riderPrefix: cfg.riderPrefix || 'RID',
              separator: cfg.separator ?? '-',
              sequencePadding: String(cfg.sequencePadding ?? 4),
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
        debounceTime(200),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((val) => {
        const sep = val.separator ?? '-';
        const padding = Number(val.sequencePadding ?? 4);
        const empPrefix = String(val.employeePrefix || 'EMP').trim();
        const ridPrefix = String(val.riderPrefix || 'RID').trim();
        const padded = '1'.padStart(padding, '0');
        this.employeePreview.set(`${empPrefix}${sep}${padded}`);
        this.riderPreview.set(`${ridPrefix}${sep}${padded}`);
      });
  }

  save(): void {
    if (!this.canWrite()) {
      return;
    }

    this.configForm.markAllAsTouched();
    if (this.configForm.invalid) return;

    const raw = this.configForm.getRawValue();
    const payload: Partial<StaffCodeConfig> = {
      employeePrefix: String(raw.employeePrefix || 'EMP').trim(),
      riderPrefix: String(raw.riderPrefix || 'RID').trim(),
      separator: raw.separator ?? '-',
      sequencePadding: Number(raw.sequencePadding ?? 4),
      allowManualOverride: Boolean(raw.allowManualOverride),
    };

    this.saving.set(true);
    this.errorMessage.set(null);

    this.service.updateTenantConfig(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toast.success('Staff code configuration saved.');
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
