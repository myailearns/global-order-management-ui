import { CommonModule } from '@angular/common';
import { Component, DestroyRef, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import {
  GomButtonContentMode,
  getButtonContentMode,
  showButtonIcon,
  showButtonText,
} from '@gomlibs/ui';
import {
  GomDynamicFormComponent,
  GomDynamicFormConfig,
  GomDynamicFormFieldConfig,
  GomDynamicFormLoaderService,
} from '@gomlibs/ui';
import { GomButtonComponent, GomSelectComponent, GomSelectOption } from '@gomlibs/ui';
import { GomModalComponent } from '@gomlibs/ui';
import {
  FIELD_DEFAULT_STATUS,
  FIELD_DEFAULT_TYPE,
  FIELD_REQUIRED_OPTIONS,
  FIELD_STATUS_OPTIONS,
  FIELD_TYPE_OPTIONS,
  FIELD_UI_TEXT,
} from '../fields.constants';
import { FieldPayload, FieldStatus, FieldType } from '../fields.service';
import { DEFAULT_FIELDS_FORM_CONFIG } from './fields-form-config.model';

export interface FieldGroupAssignOption {
  id: string;
  name: string;
}

export interface FieldFormData {
  name: string;
  key: string;
  type: FieldType;
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
  imports: [CommonModule, ReactiveFormsModule, TranslateModule, GomModalComponent, GomButtonComponent, GomSelectComponent, GomDynamicFormComponent],
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
  fields: GomDynamicFormFieldConfig[] = [];
  readonly text = FIELD_UI_TEXT;
  readonly submitMode: GomButtonContentMode = getButtonContentMode('primary-action');
  readonly cancelMode: GomButtonContentMode = getButtonContentMode('dismiss');
  readonly defaultStatus = FIELD_DEFAULT_STATUS;
  readonly defaultType = FIELD_DEFAULT_TYPE;
  readonly statusOptions: GomSelectOption[] = [];
  readonly typeOptions: GomSelectOption[] = [];
  readonly requiredOptions: GomSelectOption[] = [];
  readonly selectOptionsBySource: Record<string, GomSelectOption[]> = {
    fieldStatusOptions: this.statusOptions,
    fieldTypeOptions: this.typeOptions,
    fieldRequiredOptions: this.requiredOptions,
  };
  readonly configPath = 'assets/form-config/master/fields-form.json';

  private readonly fb = inject(FormBuilder);
  private readonly dynamicFormLoader = inject(GomDynamicFormLoaderService);
  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);

  private keyAutoSyncEnabled = true;
  private keySyncInitialized = false;
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
    this.loadFormConfig();
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

    const payload: FieldPayload = {
      name: this.getStringValue(raw, 'name').trim(),
      key: this.getStringValue(raw, 'key').trim(),
      type: selectedType,
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
    this.form.reset({
      name: '',
      key: '',
      type: this.defaultType,
      defaultValue: '',
      isRequired: 'false',
      status: this.defaultStatus,
    });
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

  private loadFormConfig(): void {
    this.dynamicFormLoader
      .loadConfig({ type: 'asset', path: this.configPath }, DEFAULT_FIELDS_FORM_CONFIG)
      .subscribe((config) => {
        this.fields = config.fields;
        this.buildFormFromConfig(config);
      });
  }

  private buildFormFromConfig(config: GomDynamicFormConfig): void {
    const initialValues = this.initialData
      ? {
          name: this.initialData.name ?? '',
          key: this.initialData.key ?? '',
          type: this.initialData.type ?? this.defaultType,
          defaultValue: this.initialData.defaultValue ?? 0,
          isRequired: this.initialData.isRequired ? 'true' : 'false',
          status: this.initialData.status ?? this.defaultStatus,
        }
      : {};

    this.form = this.dynamicFormLoader.createFormGroup(
      this.fb,
      config.fields,
      {
        type: this.defaultType,
        defaultValue: '',
        isRequired: 'false',
        status: this.defaultStatus,
      },
      initialValues
    );

    this.setupKeyAutoGeneration();
    this.syncKeyGenerationMode();
  }

  private patchFormFromInitialData(): void {
    if (this.initialData) {
      this.form.patchValue({
        name: this.initialData.name ?? '',
        key: this.initialData.key ?? '',
        type: this.initialData.type ?? this.defaultType,
        defaultValue: this.initialData.defaultValue ?? '',
        isRequired: this.initialData.isRequired ? 'true' : 'false',
        status: this.initialData.status ?? this.defaultStatus,
      });
      this.syncKeyGenerationMode();
      return;
    }

    this.form.reset({
      name: '',
      key: '',
      type: this.defaultType,
      defaultValue: '',
      isRequired: 'false',
      status: this.defaultStatus,
    });
    this.syncKeyGenerationMode();
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

  private setupKeyAutoGeneration(): void {
    if (this.keySyncInitialized) {
      return;
    }

    const nameControl = this.form.get('name');
    const keyControl = this.form.get('key');
    if (!nameControl || !keyControl) {
      return;
    }

    nameControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        if (!this.keyAutoSyncEnabled) {
          return;
        }

        const generatedKey = this.generateFieldKey(typeof value === 'string' ? value : '');
        keyControl.setValue(generatedKey, { emitEvent: false });
      });

    keyControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        const currentKey = typeof value === 'string' ? value.trim() : '';
        const generatedKey = this.generateFieldKey(this.getControlStringValue('name'));

        this.keyAutoSyncEnabled = currentKey.length === 0 || currentKey === generatedKey;
      });

    this.keySyncInitialized = true;
  }

  private syncKeyGenerationMode(): void {
    const keyControl = this.form.get('key');
    if (!keyControl) {
      return;
    }

    if (this.initialData) {
      this.keyAutoSyncEnabled = false;
      return;
    }

    this.keyAutoSyncEnabled = true;
    const generatedKey = this.generateFieldKey(this.getControlStringValue('name'));
    keyControl.setValue(generatedKey, { emitEvent: false });
  }

  private getControlStringValue(controlName: string): string {
    const value = this.form.get(controlName)?.value;
    return typeof value === 'string' ? value : '';
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
