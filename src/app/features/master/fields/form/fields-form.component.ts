import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, inject } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

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

  form!: FormGroup;
  readonly text = FIELD_UI_TEXT;
  readonly submitMode: GomButtonContentMode = getButtonContentMode('primary-action');
  readonly cancelMode: GomButtonContentMode = getButtonContentMode('dismiss');
  readonly defaultStatus = FIELD_DEFAULT_STATUS;
  readonly defaultType = FIELD_DEFAULT_TYPE;
  readonly statusOptions: GomSelectOption[] = [];
  readonly typeOptions: GomSelectOption[] = [];
  readonly requiredOptions: GomSelectOption[] = [];
  readonly currencyOptions: GomSelectOption[] = [];

  private readonly fb = inject(FormBuilder);
  private readonly translate = inject(TranslateService);
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
    this.buildForm();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.form || Object.keys(this.form.controls).length === 0) {
      return;
    }

    if (changes['isOpen']?.currentValue === true) {
      this.resetFormState();
    }

    if (changes['initialData']) {
      this.patchFormFromInitialData();
    }
  }

  onSubmit(): void {
    if (!this.form.valid) {
      this.form.markAllAsTouched();
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

    const valueFormat: FieldValueFormat = selectedType === 'NUMBER' ? 'CURRENCY' : 'NUMBER';
    const currencyCode: FieldCurrencyCode | null = selectedType === 'NUMBER'
      ? this.getCurrencyCodeValue(raw['currencyCode'])
      : null;
    const generatedKey = this.generateFieldKey(this.getStringValue(raw, 'name'));
    const key = this.initialData?.key?.trim() || generatedKey;

    const payload: FieldPayload = {
      name: this.getStringValue(raw, 'name').trim(),
      key,
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
    this.resetFormToDefaults();
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

  get nameControl(): FormControl {
    return this.form.get('name') as FormControl;
  }

  get typeControl(): FormControl {
    return this.form.get('type') as FormControl;
  }

  get currencyCodeControl(): FormControl {
    return this.form.get('currencyCode') as FormControl;
  }

  get defaultValueControl(): FormControl {
    return this.form.get('defaultValue') as FormControl;
  }

  get isRequiredControl(): FormControl {
    return this.form.get('isRequired') as FormControl;
  }

  get statusControl(): FormControl {
    return this.form.get('status') as FormControl;
  }

  get defaultValueInputType(): 'number' | 'text' {
    return this.isMetadataType(this.typeControl.value) ? 'text' : 'number';
  }

  get showCurrencyCode(): boolean {
    return this.typeControl.value === 'NUMBER';
  }

  private patchFormFromInitialData(): void {
    if (this.initialData) {
      this.form.patchValue({
        name: this.initialData.name ?? '',
        type: this.initialData.type ?? this.defaultType,
        currencyCode: this.initialData.currencyCode ?? 'INR',
        defaultValue: this.initialData.defaultValue ?? '',
        isRequired: this.initialData.isRequired ? 'true' : 'false',
        status: this.initialData.status ?? this.defaultStatus,
      });
      this.syncFieldVisibility();
      return;
    }

    this.resetFormToDefaults();
  }

  /**
   * Public method to reset form to empty state for creating a new entry.
   * Scrolls to top and focuses on the first input field.
   */
  resetForNewEntry(): void {
    this.resetFormToDefaults();
    this.selectedFieldGroupIds = [];
    this.form.markAsPristine();
    this.form.markAsUntouched();
    
    // Scroll to top and focus on first field
    setTimeout(() => {
      const modalElement = document.querySelector('.gom-modal__content');
      if (modalElement) {
        modalElement.scrollTop = 0;
      }
      
      const firstInput = document.querySelector('.fields-form input') as HTMLInputElement | null;
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

    this.currencyOptions.length = 0;
    this.currencyOptions.push(
      ...FIELD_CURRENCY_OPTIONS.map((option) => ({
        value: option.value,
        label: this.translate.instant(option.label),
      }))
    );
  }

  fieldError(control: FormControl, type: 'name' | 'type' | 'currencyCode' | 'isRequired' | 'status'): string {
    if (!control.touched || control.valid) {
      return '';
    }

    if (type === 'name') {
      if (control.hasError('required')) {
        return this.translate.instant('fields.validation.nameRequired');
      }
      if (control.hasError('minlength')) {
        return this.translate.instant('fields.validation.nameMin');
      }
    }

    if (control.hasError('required')) {
      switch (type) {
        case 'type':
          return this.translate.instant('fields.placeholders.type');
        case 'currencyCode':
          return this.translate.instant('fields.placeholders.currencyCode');
        case 'isRequired':
          return this.translate.instant('fields.placeholders.isRequired');
        case 'status':
          return this.translate.instant('fields.placeholders.status');
        default:
          return '';
      }
    }

    return '';
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

  private getCurrencyCodeValue(rawValue: unknown): FieldCurrencyCode {
    return rawValue === 'USD' ? 'USD' : 'INR';
  }

  private buildForm(): void {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      type: [this.defaultType, [Validators.required]],
      currencyCode: ['INR', [Validators.required]],
      defaultValue: [''],
      isRequired: ['false', [Validators.required]],
      status: [this.defaultStatus, [Validators.required]],
    });

    this.typeControl.valueChanges.subscribe(() => this.syncFieldVisibility());
    this.resetFormState();
  }

  private syncFieldVisibility(): void {
    const selectedType = this.typeControl.value as string;
    if (selectedType !== 'NUMBER') {
      this.currencyCodeControl.setValue('INR', { emitEvent: false });
    }
  }

  private resetFormToDefaults(): void {
    this.form.reset({
      name: '',
      type: this.defaultType,
      currencyCode: 'INR',
      defaultValue: '',
      isRequired: 'false',
      status: this.defaultStatus,
    });
    this.syncFieldVisibility();
  }

  private isMetadataType(value: unknown): boolean {
    return value === 'TEXT' || value === 'LONG_TEXT';
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
