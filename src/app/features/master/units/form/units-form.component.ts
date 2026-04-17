import { CommonModule } from '@angular/common';
import { Component, DestroyRef, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, inject } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { GomButtonContentMode, getButtonContentMode, showButtonIcon, showButtonText } from '../../../../shared/components/config';
import { GomButtonComponent, GomInputComponent, GomSelectComponent, GomSelectOption } from '../../../../shared/components/form-controls';
import { GomModalComponent } from '../../../../shared/components/modal';
import { UNIT_DEFAULT_STATUS, UNIT_STATUS_OPTIONS, UNIT_UI_TEXT } from '../units.constants';
import { UnitPayload, UnitStatus } from '../units.service';

export interface UnitAssignOption {
  id: string;
  name: string;
}

export interface UnitFormData {
  id?: string;
  name: string;
  symbol: string;
  baseUnitId: string | null;
  conversionFactor: number;
  status: UnitStatus;
  categoryIds?: string[];
}

@Component({
  selector: 'gom-units-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule, GomModalComponent, GomButtonComponent, GomInputComponent, GomSelectComponent],
  templateUrl: './units-form.component.html',
  styleUrl: './units-form.component.scss',
})
export class UnitsFormComponent implements OnInit, OnChanges {
  @Input() initialData: UnitFormData | null = null;
  @Input() baseUnitOptions: UnitAssignOption[] = [];
  @Input() categoryOptions: GomSelectOption[] = [];
  @Input() isOpen = false;
  @Output() formSubmit = new EventEmitter<UnitPayload>();
  @Output() formCancel = new EventEmitter<void>();

  readonly text = UNIT_UI_TEXT;
  readonly submitMode: GomButtonContentMode = getButtonContentMode('primary-action');
  readonly cancelMode: GomButtonContentMode = getButtonContentMode('dismiss');
  readonly statusOptions: GomSelectOption[] = [];

  selectedCategoryIds: string[] = [];
  categorySelectCloseToken = 0;

  private readonly fb = inject(FormBuilder);
  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    symbol: ['', [Validators.required, Validators.minLength(1)]],
    baseUnitId: [''],
    conversionFactor: [{ value: '1', disabled: true }, [Validators.required]],
    status: new FormControl<UnitStatus>(UNIT_DEFAULT_STATUS, {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  constructor() {
    this.rebuildStatusOptions();
    this.translate.onLangChange.subscribe(() => this.rebuildStatusOptions());
  }

  ngOnInit(): void {
    this.form.controls.baseUnitId.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((baseUnitId) => {
        if (baseUnitId) {
          this.form.controls.conversionFactor.enable({ emitEvent: false });
          return;
        }

        this.form.controls.conversionFactor.setValue('1', { emitEvent: false });
        this.form.controls.conversionFactor.disable({ emitEvent: false });
      });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen']?.currentValue === true) {
      this.resetFormState();
    }

    if (changes['initialData'] && this.isOpen) {
      this.resetFormState();
    }
  }

  get baseUnitSelectOptions(): GomSelectOption[] {
    return this.baseUnitOptions
      .filter((option) => option.id !== this.initialData?.id)
      .map((option) => ({ value: option.id, label: option.name }));
  }

  get conversionPreview(): string {
    const unitSymbol = String(this.form.controls.symbol.value || '').trim() || '?';
    const baseUnitId = String(this.form.controls.baseUnitId.value || '').trim();

    if (!baseUnitId) {
      return '';
    }

    const baseUnitLabel = this.baseUnitSelectOptions.find((option) => option.value === baseUnitId)?.label || '?';
    const baseUnitSymbol = this.extractUnitSymbol(baseUnitLabel) || baseUnitLabel;

    const rawFactor = Number(this.form.controls.conversionFactor.value || 0);
    if (!Number.isFinite(rawFactor) || rawFactor <= 0) {
      return '';
    }

    return `1 ${unitSymbol} = ${rawFactor} ${baseUnitSymbol}`;
  }

  shouldShowIcon(mode: GomButtonContentMode): boolean {
    return showButtonIcon(mode);
  }

  shouldShowText(mode: GomButtonContentMode): boolean {
    return showButtonText(mode);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const payload: UnitPayload = {
      name: raw.name.trim(),
      symbol: raw.symbol.trim(),
      baseUnitId: raw.baseUnitId || null,
      conversionFactor: raw.baseUnitId ? Number(raw.conversionFactor || 1) : 1,
      status: raw.status,
      categoryIds: [...this.selectedCategoryIds],
    };

    this.formSubmit.emit(payload);
  }

  onCancel(): void {
    this.resetFormState();
    this.formCancel.emit();
  }

  onMappedCategorySelectionChange(ids: string[]): void {
    this.selectedCategoryIds = [...ids];
  }

  onConversionFactorInput(value: string): void {
    // Keep the control in sync with the latest typed value immediately.
    this.form.controls.conversionFactor.setValue(value);
  }

  private resetFormState(): void {
    this.form.reset({
      name: this.initialData?.name ?? '',
      symbol: this.initialData?.symbol ?? '',
      baseUnitId: this.initialData?.baseUnitId ?? '',
      conversionFactor: String(this.initialData?.conversionFactor ?? 1),
      status: this.initialData?.status ?? UNIT_DEFAULT_STATUS,
    });

    if (this.initialData?.baseUnitId) {
      this.form.controls.conversionFactor.enable({ emitEvent: false });
    } else {
      this.form.controls.conversionFactor.setValue('1', { emitEvent: false });
      this.form.controls.conversionFactor.disable({ emitEvent: false });
    }

    this.selectedCategoryIds = [...(this.initialData?.categoryIds ?? [])];
    this.categorySelectCloseToken++;

    this.form.markAsPristine();
    this.form.markAsUntouched();
  }

  private rebuildStatusOptions(): void {
    this.statusOptions.length = 0;
    this.statusOptions.push(
      ...UNIT_STATUS_OPTIONS.map((option) => ({
        value: option.value,
        label: this.translate.instant(option.label),
      }))
    );
  }

  private extractUnitSymbol(label: string): string {
    const match = /\(([^)]+)\)/.exec(label);
    return match ? String(match[1] || '').trim() : '';
  }
}