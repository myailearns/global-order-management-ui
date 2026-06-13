import { CommonModule } from '@angular/common';
import { Component, DestroyRef, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { FormControlsModule, GomButtonComponent } from '@gomlibs/ui';
import { GomButtonContentMode, getButtonContentMode, showButtonIcon, showButtonText } from '@gomlibs/ui';
import { GomModalComponent } from '@gomlibs/ui';

export interface TaxProfileFormData {
  name: string;
  countryCode: string;
  taxMode: string;
  rate: number;
  inclusive: boolean;
  hsnCode?: string;
  status: string;
  effectiveFrom?: string | null;
}

export interface TaxProfileFormPayload {
  name: string;
  countryCode: string;
  taxMode: 'GST' | 'NO_TAX';
  rate: number;
  inclusive: boolean;
  hsnCode: string;
  status: 'ACTIVE' | 'INACTIVE';
  effectiveFrom: string | null;
}

@Component({
  selector: 'gom-tax-profiles-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormControlsModule, GomButtonComponent, GomModalComponent],
  templateUrl: './tax-profiles-form.component.html',
  styleUrl: './tax-profiles-form.component.scss',
})
export class TaxProfilesFormComponent implements OnInit, OnChanges {
  @Input() isOpen = false;
  @Input() initialData: TaxProfileFormData | null = null;
  @Output() formSubmit = new EventEmitter<TaxProfileFormPayload>();
  @Output() formCancel = new EventEmitter<void>();

  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly submitMode: GomButtonContentMode = getButtonContentMode('primary-action');
  readonly cancelMode: GomButtonContentMode = getButtonContentMode('dismiss');

  readonly taxProfileForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    countryCode: ['IN', [Validators.required, Validators.minLength(2), Validators.maxLength(3)]],
    taxMode: ['GST' as 'GST' | 'NO_TAX', [Validators.required]],
    rate: [5, [Validators.required, Validators.min(0)]],
    inclusive: ['NO' as 'YES' | 'NO'],
    hsnCode: [''],
    status: ['ACTIVE' as 'ACTIVE' | 'INACTIVE', [Validators.required]],
    effectiveFrom: [''],
  });

  get isEditing(): boolean {
    return this.initialData !== null;
  }

  ngOnInit(): void {
    this.taxProfileForm.controls.taxMode.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((taxMode) => {
        this.syncRateControl(taxMode || 'GST');
      });

    this.syncRateControl(this.taxProfileForm.controls.taxMode.value || 'GST');
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen']?.currentValue === true) {
      this.resetToInitialData();
    }
  }

  onSubmit(): void {
    this.taxProfileForm.markAllAsTouched();
    if (this.taxProfileForm.invalid) {
      return;
    }

    const raw = this.taxProfileForm.getRawValue();
    const payload: TaxProfileFormPayload = {
      name: String(raw.name || '').trim(),
      countryCode: String(raw.countryCode || 'IN').trim().toUpperCase(),
      taxMode: (raw.taxMode || 'GST') as 'GST' | 'NO_TAX',
      rate: Number(raw.rate || 0),
      inclusive: raw.inclusive === 'YES',
      hsnCode: String(raw.hsnCode || '').trim(),
      status: (raw.status || 'ACTIVE') as 'ACTIVE' | 'INACTIVE',
      effectiveFrom: raw.effectiveFrom ? new Date(raw.effectiveFrom).toISOString() : null,
    };

    this.formSubmit.emit(payload);
  }

  onCancel(): void {
    this.formCancel.emit();
  }

  shouldShowIcon(mode: GomButtonContentMode): boolean {
    return showButtonIcon(mode);
  }

  shouldShowText(mode: GomButtonContentMode): boolean {
    return showButtonText(mode);
  }

  private resetToInitialData(): void {
    const data = this.initialData;
    this.taxProfileForm.reset({
      name: data?.name ?? '',
      countryCode: data?.countryCode ?? 'IN',
      taxMode: (data?.taxMode as 'GST' | 'NO_TAX') ?? 'GST',
      rate: data?.rate ?? 5,
      inclusive: data?.inclusive ? 'YES' : 'NO',
      hsnCode: data?.hsnCode ?? '',
      status: (data?.status as 'ACTIVE' | 'INACTIVE') ?? 'ACTIVE',
      effectiveFrom: this.toDateInput(data?.effectiveFrom),
    });
    this.syncRateControl(this.taxProfileForm.controls.taxMode.value || 'GST');
    this.taxProfileForm.markAsPristine();
    this.taxProfileForm.markAsUntouched();
  }

  private toDateInput(value?: string | null): string {
    if (!value) return '';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '';
    return parsed.toISOString().slice(0, 10);
  }

  private syncRateControl(taxMode: string): void {
    const rateControl = this.taxProfileForm.controls.rate;
    if (taxMode === 'NO_TAX') {
      rateControl.setValue(0, { emitEvent: false });
      rateControl.disable({ emitEvent: false });
      return;
    }
    if (rateControl.disabled) {
      rateControl.enable({ emitEvent: false });
    }
  }
}
