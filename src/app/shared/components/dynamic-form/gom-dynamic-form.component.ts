import { CommonModule } from '@angular/common';
import { Component, Input, computed, inject } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import {
  GomInputComponent,
  GomSelectComponent,
  GomSelectOption,
  GomTextareaComponent,
} from '../form-controls';
import { GomDynamicControlType, GomDynamicFormFieldConfig } from './gom-dynamic-form.models';

@Component({
  selector: 'gom-lib-dynamic-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    GomInputComponent,
    GomSelectComponent,
    GomTextareaComponent,
  ],
  templateUrl: './gom-dynamic-form.component.html',
  styleUrl: './gom-dynamic-form.component.scss',
})
export class GomDynamicFormComponent {
  private readonly translate = inject(TranslateService);

  @Input({ required: true }) form!: FormGroup;
  @Input() fields: GomDynamicFormFieldConfig[] = [];
  @Input() selectOptionsBySource: Record<string, GomSelectOption[]> = {};

  readonly hasFields = computed(() => this.fields.length > 0);

  getErrorText(field: GomDynamicFormFieldConfig): string {
    const control = this.form?.get(field.key);
    if (!control || !control.invalid || !control.touched) {
      return '';
    }

    if (control.errors?.['required'] && field.validationMessages?.required) {
      return this.translate.instant(field.validationMessages.required);
    }

    if (control.errors?.['minlength'] && field.validationMessages?.minlength) {
      return this.translate.instant(field.validationMessages.minlength);
    }

    if (control.errors?.['maxlength'] && field.validationMessages?.maxlength) {
      return this.translate.instant(field.validationMessages.maxlength);
    }

    if (control.errors?.['min'] && field.validationMessages?.min) {
      return this.translate.instant(field.validationMessages.min);
    }

    if (control.errors?.['max'] && field.validationMessages?.max) {
      return this.translate.instant(field.validationMessages.max);
    }

    if (control.errors?.['pattern'] && field.validationMessages?.pattern) {
      return this.translate.instant(field.validationMessages.pattern);
    }

    return '';
  }

  getSelectOptions(field: GomDynamicFormFieldConfig): GomSelectOption[] {
    if (field.optionsSource) {
      return this.selectOptionsBySource[field.optionsSource] ?? [];
    }

    return (field.options ?? []).map((option) => ({
      value: option.value,
      label: this.translate.instant(option.labelKey),
    }));
  }

  isFieldType(field: GomDynamicFormFieldConfig, type: GomDynamicControlType): boolean {
    return field.control === type;
  }
}
