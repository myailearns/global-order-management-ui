import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import {
  GomDynamicFormConfig,
  GomDynamicFormConfigSource,
  GomDynamicFormFieldConfig,
} from './gom-dynamic-form.models';

@Injectable({ providedIn: 'root' })
export class GomDynamicFormLoaderService {
  private readonly http = inject(HttpClient);

  loadConfig(source: GomDynamicFormConfigSource, fallback?: GomDynamicFormConfig): Observable<GomDynamicFormConfig> {
    const request = this.http.get<GomDynamicFormConfig>(source.path).pipe(
      map((config) => this.normalizeConfig(config))
    );

    if (!fallback) {
      return request;
    }

    return request.pipe(catchError(() => of(this.normalizeConfig(fallback))));
  }

  createFormGroup(
    fb: FormBuilder,
    fields: GomDynamicFormFieldConfig[],
    defaults: Record<string, unknown> = {},
    initialValues: Record<string, unknown> = {}
  ): FormGroup {
    const controls: Record<string, unknown> = {};

    for (const field of fields) {
      const validators = this.getValidators(field);
      const defaultValue = this.resolveDefaultValue(field, defaults, initialValues);
      controls[field.key] = [defaultValue, validators];
    }

    return fb.group(controls);
  }

  private resolveDefaultValue(
    field: GomDynamicFormFieldConfig,
    defaults: Record<string, unknown>,
    initialValues: Record<string, unknown>
  ): unknown {
    if (Object.prototype.hasOwnProperty.call(initialValues, field.key)) {
      return initialValues[field.key];
    }

    if (Object.prototype.hasOwnProperty.call(defaults, field.key)) {
      return defaults[field.key];
    }

    if (field.defaultValue !== undefined) {
      return field.defaultValue;
    }

    return '';
  }

  private getValidators(field: GomDynamicFormFieldConfig) {
    const validators = [];

    if (field.validators?.required) {
      validators.push(Validators.required);
    }

    if (typeof field.validators?.minLength === 'number') {
      validators.push(Validators.minLength(field.validators.minLength));
    }

    if (typeof field.validators?.maxLength === 'number') {
      validators.push(Validators.maxLength(field.validators.maxLength));
    }

    if (typeof field.validators?.min === 'number') {
      validators.push(Validators.min(field.validators.min));
    }

    if (typeof field.validators?.max === 'number') {
      validators.push(Validators.max(field.validators.max));
    }

    if (field.validators?.pattern) {
      validators.push(Validators.pattern(field.validators.pattern));
    }

    return validators;
  }

  private normalizeConfig(config: GomDynamicFormConfig): GomDynamicFormConfig {
    return {
      fields: Array.isArray(config.fields) ? config.fields : [],
    };
  }
}
