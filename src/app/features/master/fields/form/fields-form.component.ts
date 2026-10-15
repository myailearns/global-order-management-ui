import { CommonModule } from '@angular/common';
import { Component, DestroyRef, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, inject } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import {
  GomButtonContentMode,
  GomButtonComponent,
  GomInputComponent,
  GomModalComponent,
  GomSelectComponent,
  GomSelectOption,
  getButtonContentMode,
  showButtonIcon,
  showButtonText,
} from '@gomlibs/ui';
import {
  FIELD_CURRENCY_OPTIONS,
  FIELD_DEFAULT_STATUS,
  FIELD_DEFAULT_TYPE,
  FIELD_REQUIRED_OPTIONS,
  FIELD_STATUS_OPTIONS,
  FIELD_TYPE_OPTIONS,
  FIELD_UI_TEXT,
  FIELD_VALUE_FORMAT_OPTIONS,
} from '../fields.constants';
import { FieldCurrencyCode, FieldPayload, FieldStatus, FieldType, FieldValueFormat } from '../fields.service';

export interface FieldGroupAssignOption {
  id: string;
  name: string;
}

export interface FieldFormData {
  name: string;
  key: string;
  type: FieldType;
  valueFormat?: FieldValueFormat;
  currencyCode?: FieldCurrencyCode | null;
  defaultValue: number | string;
  isRequired: boolean;
  status: FieldStatus;
}

export interface FieldFormSubmitData {
  payload: FieldPayload;
  fieldGroupIds: string[];
}

@Component({
  selector: 'gom-fields-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    GomModalComponent,
    GomButtonComponent,
    GomInputComponent,
    GomSelectComponent,
  ],
  templateUrl: './fields-form.component.html',
  styleUrl: './fields-form.component.scss'
})
export class FieldsFormComponent implements OnInit, OnChanges {
  @Input() initialData: FieldFormData | null = null;
  @Input() initialAssignedFieldGroupIds: string[] = [];
  @Input() fieldGroupOptions: FieldGroupAssignOption[] = [];
  @Input() isOpen = false;
  @Output() formSubmit = new EventEmitter<FieldFormSubmitData>();
  @Output() formCancel = new EventEmitter<void>();

  readonly text = FIELD_UI_TEXT;
  readonly submitMode: GomButtonContentMode = getButtonContentMode('primary-action');
  readonly cancelMode: GomButtonContentMode = getButtonContentMode('dismiss');
  readonly defaultStatus = FIELD_DEFAULT_STATUS;
  readonly defaultType = FIELD_DEFAULT_TYPE;
  private readonly fb = inject(FormBuilder);
  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);
  readonly nameControl = new FormControl<string>('', { nonNullable: true, validators: [Validators.required, Validators.minLength(2)] });
  readonly typeControl = new FormControl<FieldType>(FIELD_DEFAULT_TYPE, { nonNullable: true, validators: [Validators.required] });
  readonly valueFormatControl = new FormControl<FieldValueFormat>('CURRENCY', { nonNullable: true });
  readonly currencyCodeControl = new FormControl<FieldCurrencyCode>('INR', { nonNullable: true });
  readonly defaultValueControl = new FormControl<string>('', { nonNullable: true });
  readonly isRequiredControl = new FormControl<string>('false', { nonNullable: true, validators: [Validators.required] });
  readonly statusControl = new FormControl<FieldStatus>(FIELD_DEFAULT_STATUS, { nonNullable: true, validators: [Validators.required] });
  readonly form: FormGroup = this.fb.group({
    name: this.nameControl,
    type: this.typeControl,
    valueFormat: this.valueFormatControl,
    currencyCode: this.currencyCodeControl,
    defaultValue: this.defaultValueControl,
    isRequired: this.isRequiredControl,
    status: this.statusControl,
  });
  readonly statusOptions: GomSelectOption[] = [];
  readonly typeOptions: GomSelectOption[] = [];
  readonly requiredOptions: GomSelectOption[] = [];
  readonly valueFormatOptions: GomSelectOption[] = [];
  readonly currencyOptions: GomSelectOption[] = [];
  selectedFieldGroupIds: string[] = [];

  constructor() {
    this.rebuildSelectOptions();
    this.translate.onLangChange.subscribe(() => this.rebuildSelectOptions());
  }

  shouldShowIcon(mode: GomButtonContentMode): boolean {
    return showButtonIcon(mode);
  }

  shouldShowText(mode: GomButtonContentMode): boolean {
    return showButtonText(mode);
  }

  ngOnInit(): void {
    this.setupTypeChangeReaction();
    this.patchFormFromInitialData();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen']?.currentValue === true) {
      this.resetFormState();
    }

    if (changes['initialData']) {
      this.patchFormFromInitialData();
    }
  }

  onSubmit(): void {
    if (!this.form.valid) {
      return;
    }

    const raw = this.form.getRawValue() as Record<string, unknown>;
    const selectedType: FieldType = raw['type'] === 'PERCENTAGE' || raw['type'] === 'TEXT' || raw['type'] === 'LONG_TEXT'
      ? raw['type']
      : 'NUMBER';
    const isMetadataType = selectedType === 'TEXT' || selectedType === 'LONG_TEXT';
    const defaultValue = isMetadataType
      ? this.getStringValue(raw, 'defaultValue')
      : this.getNumberValue(raw, 'defaultValue');

    const rawValueFormat = this.getValueFormatValue(raw['valueFormat']);
    const valueFormat: FieldValueFormat = selectedType === 'NUMBER' && rawValueFormat === 'CURRENCY'
      ? 'CURRENCY'
      : 'NUMBER';
    const currencyCode = valueFormat === 'CURRENCY'
      ? this.getCurrencyCodeValue(raw['currencyCode'])
      : null;
    const existingKey = this.initialData?.key?.trim();
    const generatedKey = this.generateFieldKey(this.getStringValue(raw, 'name'));

    const payload: FieldPayload = {
      name: this.getStringValue(raw, 'name').trim(),
      key: existingKey || generatedKey,
      type: selectedType,
      valueFormat,
      currencyCode,
      fieldKind: isMetadataType ? 'METADATA' : 'PRICING',
      defaultValue,
      isRequired: raw['isRequired'] === true || raw['isRequired'] === 'true',
      status: raw['status'] === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
    };

    this.formSubmit.emit({
      payload,
      fieldGroupIds: [...this.selectedFieldGroupIds],
    });
  }

  onCancel(): void {
    this.resetFormValues();
    this.formCancel.emit();
  }

  get fieldGroupSelectOptions(): GomSelectOption[] {
    return this.fieldGroupOptions.map((option) => ({
      value: option.id,
      label: option.name,
    }));
  }

  onFieldGroupSelectionChange(values: string[]): void {
    this.selectedFieldGroupIds = [...values];
  }

  private patchFormFromInitialData(): void {
    if (this.initialData) {
      this.form.patchValue({
        name: this.initialData.name ?? '',
        type: this.initialData.type ?? this.defaultType,
        valueFormat: this.initialData.valueFormat ?? (this.initialData.type === 'NUMBER' ? 'CURRENCY' : 'NUMBER'),
        currencyCode: this.initialData.currencyCode ?? 'INR',
        defaultValue: this.initialData.defaultValue ?? '',
        isRequired: this.initialData.isRequired ? 'true' : 'false',
        status: this.initialData.status ?? this.defaultStatus,
      }, { emitEvent: false });
      this.ensureDependentFieldState(this.initialData.type ?? this.defaultType);
      return;
    }

    this.resetFormValues();
  }

  /**
   * Public method to reset form to empty state for creating a new entry.
   * Scrolls to top and focuses on the first input field.
   */
  resetForNewEntry(): void {
    this.resetFormValues();
    this.selectedFieldGroupIds = [];
    this.form.markAsPristine();
    this.form.markAsUntouched();
    
    // Scroll to top and focus on first field
    setTimeout(() => {
      const modalElement = document.querySelector('.gom-modal__content');
      if (modalElement) {
        modalElement.scrollTop = 0;
      }
      
      // Focus on first input (Field Name)
      const firstInput = document.querySelector('.fields-form input') as HTMLInputElement;
      if (firstInput) {
        firstInput.focus();
      }
    }, 100);
  }

  private resetFormState(): void {
    this.patchFormFromInitialData();
    this.selectedFieldGroupIds = [...this.initialAssignedFieldGroupIds];
    this.form.markAsPristine();
    this.form.markAsUntouched();
  }

  private rebuildSelectOptions(): void {
    this.statusOptions.length = 0;
    this.statusOptions.push(
      ...FIELD_STATUS_OPTIONS.map((option) => ({
        value: option.value,
        label: this.translate.instant(option.label),
      }))
    );

    this.typeOptions.length = 0;
    this.typeOptions.push(
      ...FIELD_TYPE_OPTIONS.map((option) => ({
        value: option.value,
        label: this.translate.instant(option.label),
      }))
    );

    this.requiredOptions.length = 0;
    this.requiredOptions.push(
      ...FIELD_REQUIRED_OPTIONS.map((option) => ({
        value: option.value,
        label: this.translate.instant(option.label),
      }))
    );

    this.valueFormatOptions.length = 0;
    this.valueFormatOptions.push(
      ...FIELD_VALUE_FORMAT_OPTIONS.map((option) => ({
        value: option.value,
        label: this.translate.instant(option.label),
      }))
    );

    this.currencyOptions.length = 0;
    this.currencyOptions.push(
      ...FIELD_CURRENCY_OPTIONS.map((option) => ({
        value: option.value,
        label: this.translate.instant(option.label),
      }))
    );
  }

  private getStringValue(raw: Record<string, unknown>, key: string): string {
    const value = raw[key];
    return typeof value === 'string' ? value : '';
  }

  private getNumberValue(raw: Record<string, unknown>, key: string): number {
    const value = raw[key];
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private getValueFormatValue(rawValue: unknown): FieldValueFormat {
    const extract = (candidate: unknown): string => {
      if (typeof candidate === 'string') {
        return candidate.trim().toUpperCase();
      }
      if (candidate && typeof candidate === 'object') {
        const nestedValue = (candidate as { value?: unknown }).value;
        return typeof nestedValue === 'string' ? nestedValue.trim().toUpperCase() : '';
      }
      return '';
    };

    const normalized = extract(rawValue);
    if (!normalized) {
      return 'NUMBER';
    }

    // This select has only NUMBER/CURRENCY; treat any non-NUMBER selection as CURRENCY.
    return normalized === 'NUMBER' ? 'NUMBER' : 'CURRENCY';
  }

  private setupTypeChangeReaction(): void {
    const typeControl = this.form.get('type');
    const valueFormatControl = this.form.get('valueFormat');
    const currencyCodeControl = this.form.get('currencyCode');
    if (!typeControl || !valueFormatControl) {
      return;
    }

    typeControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((type) => {
        if (type === 'NUMBER') {
          valueFormatControl.setValue('CURRENCY', { emitEvent: false });
          currencyCodeControl?.setValue(this.getCurrencyCodeValue(currencyCodeControl.value), { emitEvent: false });
        } else {
          valueFormatControl.setValue('NUMBER', { emitEvent: false });
          currencyCodeControl?.setValue('INR', { emitEvent: false });
        }
      });
  }

  private getCurrencyCodeValue(rawValue: unknown): FieldCurrencyCode {
    if (typeof rawValue === 'string') {
      return rawValue.trim().toUpperCase() === 'USD' ? 'USD' : 'INR';
    }

    if (rawValue && typeof rawValue === 'object') {
      const nestedValue = (rawValue as { value?: unknown }).value;
      return typeof nestedValue === 'string' && nestedValue.trim().toUpperCase() === 'USD' ? 'USD' : 'INR';
    }

    return 'INR';
  }

  private ensureDependentFieldState(typeValue: unknown): void {
    const selectedType = typeof typeValue === 'string' ? typeValue : this.defaultType;
    if (selectedType !== 'NUMBER') {
      this.form.patchValue({
        valueFormat: 'NUMBER',
        currencyCode: 'INR',
      }, { emitEvent: false });
      return;
    }

    const nextCurrency = this.getCurrencyCodeValue(this.form.get('currencyCode')?.value);
    this.form.patchValue({
      valueFormat: this.getValueFormatValue(this.form.get('valueFormat')?.value),
      currencyCode: nextCurrency,
    }, { emitEvent: false });
  }

  private resetFormValues(): void {
    this.form.reset({
      name: '',
      type: this.defaultType,
      valueFormat: 'CURRENCY',
      currencyCode: 'INR',
      defaultValue: '',
      isRequired: 'false',
      status: this.defaultStatus,
    });
  }

  private generateFieldKey(rawName: string): string {
    const tokens = rawName
      .trim()
      .toLowerCase()
      .split(/[^a-zA-Z0-9]+/)
      .filter((token) => token.length > 0);

    if (tokens.length === 0) {
      return '';
    }

    const [first, ...rest] = tokens;
    const suffix = rest
      .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
      .join('');

    return `${first}${suffix}`;
  }
}
