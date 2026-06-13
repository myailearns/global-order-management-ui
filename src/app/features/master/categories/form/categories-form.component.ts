import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { CATEGORY_DEFAULT_STATUS, CATEGORY_STATUS_OPTIONS, CATEGORY_UI_TEXT } from '../categories.constants';
import {
  DEFAULT_CATEGORY_FORM_CONFIG,
} from './categories-form-config.model';
import {
  GomButtonContentMode,
  GomButtonComponent,
  GomDynamicFormConfig,
  GomDynamicFormComponent,
  GomDynamicFormFieldConfig,
  GomDynamicFormLoaderService,
  GomModalComponent,
  GomSelectOption,
  getButtonContentMode,
  showButtonIcon,
  showButtonText,
} from '@gomlibs/ui';
import { AuthSessionService } from '../../../../core/auth/auth-session.service';
import { ImagePickerComponent, PickedImage } from '../../../../shared/components/image-picker/image-picker.component';

export interface CategoryFormData {
  name: string;
  description?: string;
  imageAssetId?: string | null;
  imageUrl?: string;
  status: 'ACTIVE' | 'INACTIVE';
}

@Component({
  selector: 'gom-categories-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule, GomModalComponent, GomButtonComponent, GomDynamicFormComponent, ImagePickerComponent],
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
  readonly emptyImageIds = new Set<string>();
  readonly pickerOpen = signal(false);
  readonly canUploadOwn = computed(() => {
    const session = this.authSession.session();
    if (session?.actorType !== 'tenant') return false;
    const keys = new Set(
      (session.featureKeys ?? []).map((key: string) => String(key || '').trim().toLowerCase()).filter(Boolean),
    );
    return keys.has('media.upload');
  });
  readonly categoryImageLimit = computed(() => this.authSession.getFeatureConfigNumber('category.create', 'max_images') ?? 1);
  readonly configPath = 'assets/form-config/master/categories-form.json';
  private readonly fb = inject(FormBuilder);
  private readonly dynamicFormLoader = inject(GomDynamicFormLoaderService);
  private readonly translate = inject(TranslateService);
  private readonly authSession = inject(AuthSessionService);

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
          imageAssetId: this.initialData.imageAssetId ?? null,
          imageUrl: this.initialData.imageUrl ?? '',
          status: this.initialData.status ?? this.defaultStatus,
        });
      } else {
        this.form.reset({ name: '', description: '', imageAssetId: null, imageUrl: '', status: this.defaultStatus });
      }
      this.form.markAsPristine();
      this.form.markAsUntouched();
    }

    if (changes['initialData']) {
      if (this.initialData) {
        this.form.patchValue({
          name: this.initialData.name ?? '',
          description: this.initialData.description ?? '',
          imageAssetId: this.initialData.imageAssetId ?? null,
          imageUrl: this.initialData.imageUrl ?? '',
          status: this.initialData.status ?? this.defaultStatus,
        });
      } else {
        this.form.reset({ name: '', description: '', imageAssetId: null, imageUrl: '', status: this.defaultStatus });
      }
    }
  }

  onSubmit() {
    if (this.form.valid) {
      const raw = this.form.getRawValue() as {
        name?: string;
        description?: string;
        imageAssetId?: string | null;
        imageUrl?: string;
        status?: 'ACTIVE' | 'INACTIVE';
      };

      this.formSubmit.emit({
        name: (raw.name ?? '').trim(),
        description: raw.description ?? '',
        imageAssetId: raw.imageAssetId ?? null,
        imageUrl: raw.imageUrl ?? '',
        status: raw.status ?? this.defaultStatus,
      });
    }
  }

  onCancel() {
    this.form.reset({ name: '', description: '', imageAssetId: null, imageUrl: '', status: this.defaultStatus });
    this.pickerOpen.set(false);
    this.formCancel.emit();
  }

  openImagePicker(): void {
    this.pickerOpen.set(true);
  }

  clearImage(): void {
    this.form.patchValue({ imageAssetId: null, imageUrl: '' });
  }

  onImagesSelected(picked: PickedImage[]): void {
    const selected = picked[0];
    if (!selected) {
      return;
    }
    this.form.patchValue({
      imageAssetId: selected.asset._id,
      imageUrl: selected.asset.url,
    });
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
          imageAssetId: this.initialData.imageAssetId ?? null,
          imageUrl: this.initialData.imageUrl ?? '',
          status: this.initialData.status ?? this.defaultStatus,
        }
      : {};

    this.form = this.dynamicFormLoader.createFormGroup(
      this.fb,
      config.fields,
      { status: this.defaultStatus },
      initialValues
    );

    if (!this.form.contains('imageAssetId')) {
      this.form.addControl('imageAssetId', this.fb.control(initialValues.imageAssetId ?? null));
    }
    if (!this.form.contains('imageUrl')) {
      this.form.addControl('imageUrl', this.fb.control(initialValues.imageUrl ?? ''));
    }
  }
}
