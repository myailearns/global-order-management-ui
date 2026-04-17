export type GomDynamicControlType = 'input' | 'textarea' | 'select';

export interface GomDynamicFormOptionConfig {
  value: string;
  labelKey: string;
}

export interface GomDynamicFormValidatorsConfig {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
}

export interface GomDynamicFormValidationMessagesConfig {
  required?: string;
  minlength?: string;
  maxlength?: string;
  min?: string;
  max?: string;
  pattern?: string;
}

export interface GomDynamicFormFieldConfig {
  key: string;
  control: GomDynamicControlType;
  inputType?: 'text' | 'email' | 'number' | 'search' | 'password';
  labelKey: string;
  placeholderKey?: string;
  rows?: number;
  defaultValue?: string | number | boolean;
  validators?: GomDynamicFormValidatorsConfig;
  validationMessages?: GomDynamicFormValidationMessagesConfig;
  optionsSource?: string;
  options?: GomDynamicFormOptionConfig[];
}

export interface GomDynamicFormConfig {
  fields: GomDynamicFormFieldConfig[];
}

export interface GomDynamicFormConfigSource {
  type: 'asset' | 'api';
  path: string;
}
