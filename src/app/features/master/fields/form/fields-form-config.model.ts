import { GomDynamicFormConfig } from '../../../../shared/components/dynamic-form';

export const DEFAULT_FIELDS_FORM_CONFIG: GomDynamicFormConfig = {
  fields: [
    {
      key: 'name',
      control: 'input',
      inputType: 'text',
      labelKey: 'fields.labels.nameRequired',
      placeholderKey: 'fields.placeholders.name',
      validators: {
        required: true,
        minLength: 2,
      },
      validationMessages: {
        required: 'fields.validation.nameRequired',
        minlength: 'fields.validation.nameMin',
      },
    },
    {
      key: 'key',
      control: 'input',
      inputType: 'text',
      labelKey: 'fields.labels.keyRequired',
      placeholderKey: 'fields.placeholders.key',
      validators: {
        required: true,
        minLength: 2,
      },
      validationMessages: {
        required: 'fields.validation.keyRequired',
        minlength: 'fields.validation.keyMin',
      },
    },
    {
      key: 'type',
      control: 'select',
      labelKey: 'fields.labels.type',
      placeholderKey: 'fields.placeholders.type',
      defaultValue: 'NUMBER',
      validators: {
        required: true,
      },
      optionsSource: 'fieldTypeOptions',
    },
    {
      key: 'defaultValue',
      control: 'input',
      inputType: 'text',
      labelKey: 'fields.labels.defaultValue',
      placeholderKey: 'fields.placeholders.defaultValue',
      defaultValue: '',
      validators: {
        required: true,
      },
      validationMessages: {
        required: 'fields.validation.defaultValueRequired',
      },
    },
    {
      key: 'isRequired',
      control: 'select',
      labelKey: 'fields.labels.isRequired',
      placeholderKey: 'fields.placeholders.isRequired',
      defaultValue: 'false',
      validators: {
        required: true,
      },
      optionsSource: 'fieldRequiredOptions',
    },
    {
      key: 'status',
      control: 'select',
      labelKey: 'fields.labels.status',
      placeholderKey: 'fields.placeholders.status',
      defaultValue: 'ACTIVE',
      validators: {
        required: true,
      },
      optionsSource: 'fieldStatusOptions',
    },
  ],
};
