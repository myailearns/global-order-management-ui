import { Component, inject, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { CATEGORY_DEFAULT_STATUS, CATEGORY_STATUS_OPTIONS, CATEGORY_UI_TEXT } from '../categories.constants';
import {
  DEFAULT_CATEGORY_FORM_CONFIG,
} from './categories-form-config.model';
import {
  GomButtonContentMode,
  getButtonContentMode,
  showButtonIcon,
  showButtonText,
} from '../../../../shared/components/config';
import {
  GomButtonComponent,
  GomSelectOption,
} from '../../../../shared/components/form-controls';
import { GomModalComponent } from '../../../../shared/components/modal';
import {
  GomDynamicFormComponent,
  GomDynamicFormConfig,
  GomDynamicFormFieldConfig,
  GomDynamicFormLoaderService,
} from '../../../../shared/components/dynamic-form';

export interface CategoryFormData {
  name: string;
  description?: string;
  status: 'ACTIVE' | 'INACTIVE';
}

@Component({
  selector: 'gom-categories-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule, GomModalComponent, GomButtonComponent, GomDynamicFormComponent],
  templateUrl: './categories-form.component.html',
  styleUrl: './categories-form.component.scss'
})
export class CategoriesFormComponent implements OnInit, OnChanges {
  @Input() initialData: CategoryFormData | null = null;
  @Input() isOpen = false;
  @Output() formSubmit = new EventEmitter<CategoryFormData>();
  @Output() formCancel = new EventEmitter<void>();

  form!: FormGroup;
  fields: GomDynamicFormFieldConfig[] = [];
  readonly text = CATEGORY_UI_TEXT;
  readonly submitMode: GomButtonContentMode = getButtonContentMode('primary-action');
  readonly cancelMode: GomButtonContentMode = getButtonContentMode('dismiss');
  readonly defaultStatus = CATEGORY_DEFAULT_STATUS;
  readonly statusOptions: GomSelectOption[] = [];
  readonly selectOptionsBySource: Record<string, GomSelectOption[]> = {
    categoryStatusOptions: this.statusOptions,
  };
  readonly configPath = 'assets/form-config/master/categories-form.json';
  private readonly fb = inject(FormBuilder);
  private readonly dynamicFormLoader = inject(GomDynamicFormLoaderService);
  private readonly translate = inject(TranslateService);

  constructor() {
    this.rebuildStatusOptions();
    this.translate.onLangChange.subscribe(() => this.rebuildStatusOptions());
  }

  shouldShowIcon(mode: GomButtonContentMode): boolean {
    return showButtonIcon(mode);
  }

  shouldShowText(mode: GomButtonContentMode): boolean {
    return showButtonText(mode);
  }

  ngOnInit() {
    this.loadFormConfig();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.form || Object.keys(this.form.controls).length === 0) {
      return;
    }

    if (changes['isOpen']?.currentValue === true) {
      if (this.initialData) {
        this.form.patchValue({
          name: this.initialData.name ?? '',
          description: this.initialData.description ?? '',
          status: this.initialData.status ?? this.defaultStatus,
        });
      } else {
        this.form.reset({ name: '', description: '', status: this.defaultStatus });
      }
      this.form.markAsPristine();
      this.form.markAsUntouched();
    }

    if (changes['initialData']) {
      if (this.initialData) {
        this.form.patchValue({
          name: this.initialData.name ?? '',
          description: this.initialData.description ?? '',
          status: this.initialData.status ?? this.defaultStatus,
        });
      } else {
        this.form.reset({ name: '', description: '', status: this.defaultStatus });
      }
    }
  }

  onSubmit() {
    if (this.form.valid) {
      this.formSubmit.emit(this.form.value);
    }
  }

  onCancel() {
    this.form.reset({ name: '', description: '', status: this.defaultStatus });
    this.formCancel.emit();
  }

  private rebuildStatusOptions(): void {
    this.statusOptions.length = 0;
    this.statusOptions.push(
      ...CATEGORY_STATUS_OPTIONS.map((option) => ({
        value: option.value,
        label: this.translate.instant(option.label),
      }))
    );
  }

  private loadFormConfig(): void {
    this.dynamicFormLoader
      .loadConfig({ type: 'asset', path: this.configPath }, DEFAULT_CATEGORY_FORM_CONFIG)
      .subscribe((config) => {
        this.fields = config.fields;
        this.buildFormFromConfig(config);
      });
  }

  private buildFormFromConfig(config: GomDynamicFormConfig): void {
    const initialValues = this.initialData
      ? {
          name: this.initialData.name ?? '',
          description: this.initialData.description ?? '',
          status: this.initialData.status ?? this.defaultStatus,
        }
      : {};

    this.form = this.dynamicFormLoader.createFormGroup(
      this.fb,
      config.fields,
      { status: this.defaultStatus },
      initialValues
    );
  }
}
