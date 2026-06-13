import { CommonModule } from '@angular/common';
import { Component, computed, EventEmitter, inject, input, Input, OnChanges, Output, signal, SimpleChanges } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { GomButtonContentMode, getButtonContentMode, showButtonIcon, showButtonText } from '@gomlibs/ui';
import { GomButtonComponent, GomInputComponent, GomSelectComponent, GomSelectOption } from '@gomlibs/ui';
import { GomModalComponent } from '@gomlibs/ui';
import {
  CategoryOption,
  FieldGroup,
  FieldGroupFieldItem,
  FieldGroupPayload,
  PricingField,
  ProductGroupUsage,
} from '../field-groups.service';

type RequiredOverrideOption = 'INHERIT' | 'REQUIRED' | 'OPTIONAL';

type FieldGroupFieldForm = FormGroup<{
  fieldId: FormControl<string>;
  defaultValue: FormControl<string>;
  requiredOverride: FormControl<RequiredOverrideOption>;
}>;

@Component({
  selector: 'gom-field-groups-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    GomButtonComponent,
    GomInputComponent,
    GomSelectComponent,
    GomModalComponent,
  ],
  templateUrl: './field-groups-form.component.html',
  styleUrl: './field-groups-form.component.scss',
})
export class FieldGroupsFormComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() initialData: FieldGroup | null = null;
  readonly fields = input<PricingField[]>([]);
  readonly categories = input<CategoryOption[]>([]);
  readonly groups = input<ProductGroupUsage[]>([]);
  @Output() formSubmit = new EventEmitter<FieldGroupPayload>();
  @Output() formCancel = new EventEmitter<void>();

  private readonly fb = inject(FormBuilder);
  private readonly translate = inject(TranslateService);

  readonly addFieldMode: GomButtonContentMode = getButtonContentMode('secondary-action');
  readonly rowDeleteMode: GomButtonContentMode = getButtonContentMode('danger-action');
  readonly submitMode: GomButtonContentMode = getButtonContentMode('primary-action');
  readonly cancelMode: GomButtonContentMode = getButtonContentMode('dismiss');

  readonly errorMessage = signal<string | null>(null);
  readonly fieldItemsVersion = signal(0);
  readonly dragSourceIndex = signal<number | null>(null);
  readonly dragOverIndex = signal<number | null>(null);

  readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    status: ['ACTIVE' as 'ACTIVE' | 'INACTIVE', [Validators.required]],
    fields: this.fb.array<FieldGroupFieldForm>([]),
  });

  selectedAddFieldIds: string[] = [];
  selectedCategoryIds: string[] = [];
  addFieldSelectCloseToken = 0;
  categorySelectCloseToken = 0;

  readonly statusOptions: GomSelectOption[] = [
    { label: '', value: 'ACTIVE' },
    { label: '', value: 'INACTIVE' },
  ];

  readonly requiredOverrideOptions: GomSelectOption[] = [
    { label: '', value: 'INHERIT' },
    { label: '', value: 'REQUIRED' },
    { label: '', value: 'OPTIONAL' },
  ];

  readonly selectedFields = computed(() => {
    this.fieldItemsVersion();
    const allFields = this.fields();
    return this.fieldItems.controls.map((control, index) => {
      const fieldId = control.controls.fieldId.value;
      const field = allFields.find((item) => item._id === fieldId) || null;
      return { index, fieldId, field, control };
    });
  });

  readonly availableFieldOptions = computed<GomSelectOption[]>(() => {
    this.fieldItemsVersion();
    const allFields = this.fields();
    const selectedIds = new Set(this.fieldItems.controls.map((control) => control.controls.fieldId.value));

    return allFields
      .filter((field) => this.isPricingField(field) && field.status === 'ACTIVE' && !selectedIds.has(field._id))
      .map((field) => ({ value: field._id, label: `${field.name} (${field.key})` }));
  });

  readonly categoryOptions = computed<GomSelectOption[]>(() =>
    this.categories()
      .filter((category) => category.status === 'ACTIVE')
      .map((category) => ({ value: category._id, label: category.name }))
  );

  readonly fieldUsageById = computed(() => {
    const usage = new Map<string, string[]>();

    for (const group of this.groups()) {
      for (const resolvedField of group.resolvedFields || []) {
        const fieldId = String(resolvedField.fieldId);
        if (!usage.has(fieldId)) {
          usage.set(fieldId, []);
        }

        const groupNames = usage.get(fieldId) || [];
        if (!groupNames.includes(group.name)) {
          groupNames.push(group.name);
        }
      }
    }

    return usage;
  });

  constructor() {
    this.rebuildStaticText();
    this.translate.onLangChange.subscribe(() => this.rebuildStaticText());
  }

  get fieldItems(): FormArray<FieldGroupFieldForm> {
    return this.form.controls.fields;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen']?.currentValue === true) {
      this.resetForm();
      if (this.initialData) {
        this.patchFromFieldGroup(this.initialData);
      }
    }
  }

  shouldShowIcon(mode: GomButtonContentMode): boolean {
    return showButtonIcon(mode);
  }

  shouldShowText(mode: GomButtonContentMode): boolean {
    return showButtonText(mode);
  }

  onAddFieldSelectionChange(values: string[]): void {
    this.selectedAddFieldIds = [...values];
  }

  onMappedCategorySelectionChange(values: string[]): void {
    this.selectedCategoryIds = [...values];
  }

  addSelectedField(): void {
    if (!this.selectedAddFieldIds.length) {
      return;
    }

    const existingFieldIds = new Set(this.fieldItems.controls.map((c) => c.controls.fieldId.value));
    let addedCount = 0;

    for (const fieldId of this.selectedAddFieldIds) {
      if (existingFieldIds.has(fieldId)) {
        continue;
      }

      const field = this.fields().find((item) => item._id === fieldId);
      if (!field) {
        continue;
      }

      this.fieldItems.push(this.createFieldItemGroup({
        fieldId,
        order: this.fieldItems.length + 1,
        defaultValue: null,
      }));
      existingFieldIds.add(fieldId);
      addedCount += 1;
    }

    if (!addedCount) {
      return;
    }

    this.bumpFieldItemsVersion();
    this.selectedAddFieldIds = [];
    this.addFieldSelectCloseToken += 1;
  }

  removeField(index: number): void {
    this.fieldItems.removeAt(index);
    this.bumpFieldItemsVersion();
  }

  onFieldDragStart(index: number, event: DragEvent): void {
    this.dragSourceIndex.set(index);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', String(index));
    }
  }

  onFieldDragOver(index: number, event: DragEvent): void {
    event.preventDefault();
    if (this.dragSourceIndex() === null || this.dragSourceIndex() === index) {
      return;
    }

    this.dragOverIndex.set(index);
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  onFieldDrop(targetIndex: number, event: DragEvent): void {
    event.preventDefault();
    const sourceIndex = this.dragSourceIndex();
    this.clearDragState();

    if (sourceIndex === null || sourceIndex === targetIndex) {
      return;
    }

    this.reorderField(sourceIndex, targetIndex);
  }

  onFieldDragEnd(): void {
    this.clearDragState();
  }

  onSubmit(): void {
    if (this.form.invalid || this.fieldItems.length === 0) {
      this.form.markAllAsTouched();
      this.fieldItems.controls.forEach((c) => c.markAllAsTouched());
      if (this.fieldItems.length === 0) {
        this.errorMessage.set(this.translate.instant('fieldGroups.validation.fieldsRequired'));
      }
      return;
    }

    const payload = this.buildPayload();
    if (!payload) {
      return;
    }

    this.formSubmit.emit(payload);
  }

  onCancel(): void {
    this.formCancel.emit();
  }

  formatMasterDefault(field: PricingField | null): string {
    if (!field) {
      return '-';
    }

    return typeof field.defaultValue === 'number'
      ? String(field.defaultValue)
      : '-';
  }

  getFieldUsageText(fieldId: string): string {
    const groupNames = this.fieldUsageById().get(fieldId) || [];
    if (!groupNames.length) {
      return this.translate.instant('fieldGroups.labels.notUsed');
    }

    return groupNames.join(', ');
  }

  private patchFromFieldGroup(fg: FieldGroup): void {
    this.form.patchValue({
      name: fg.name,
      status: fg.status,
    });
    this.selectedCategoryIds = [...(fg.categoryIds || [])];
    this.categorySelectCloseToken += 1;

    [...fg.fields]
      .sort((a, b) => a.order - b.order)
      .forEach((item) => {
        this.fieldItems.push(this.createFieldItemGroup(item));
      });
    this.bumpFieldItemsVersion();

    this.form.markAsPristine();
    this.form.markAsUntouched();
  }

  private createFieldItemGroup(item?: Partial<FieldGroupFieldItem>): FieldGroupFieldForm {
    let requiredOverride: RequiredOverrideOption = 'INHERIT';
    if (item?.requiredOverride === true) {
      requiredOverride = 'REQUIRED';
    } else if (item?.requiredOverride === false) {
      requiredOverride = 'OPTIONAL';
    }

    return this.fb.group({
      fieldId: this.fb.nonNullable.control(item?.fieldId || '', [Validators.required]),
      defaultValue: this.fb.nonNullable.control(
        typeof item?.defaultValue === 'number' ? String(item.defaultValue) : '',
        []
      ),
      requiredOverride: this.fb.nonNullable.control(requiredOverride),
    });
  }

  private resetForm(): void {
    this.form.reset({
      name: '',
      status: 'ACTIVE',
    });
    this.selectedAddFieldIds = [];
    this.selectedCategoryIds = [];
    this.addFieldSelectCloseToken += 1;
    this.categorySelectCloseToken += 1;
    this.errorMessage.set(null);

    while (this.fieldItems.length > 0) {
      this.fieldItems.removeAt(0);
    }
    this.bumpFieldItemsVersion();
  }

  private bumpFieldItemsVersion(): void {
    this.fieldItemsVersion.update((value) => value + 1);
  }

  private reorderField(sourceIndex: number, targetIndex: number): void {
    const sourceControl = this.fieldItems.at(sourceIndex);
    this.fieldItems.removeAt(sourceIndex);

    const nextIndex = sourceIndex < targetIndex ? targetIndex - 1 : targetIndex;
    this.fieldItems.insert(nextIndex, sourceControl);
    this.bumpFieldItemsVersion();
  }

  private clearDragState(): void {
    this.dragSourceIndex.set(null);
    this.dragOverIndex.set(null);
  }

  private buildPayload(): FieldGroupPayload | null {
    const fields = this.fieldItems.controls.map((control, index) => {
      const rawValue = control.controls.defaultValue.value.trim();
      const normalizedDefaultValue = rawValue === '' ? null : Number(rawValue);

      if (rawValue !== '' && !Number.isFinite(normalizedDefaultValue)) {
        this.errorMessage.set(this.translate.instant('fieldGroups.validation.defaultValueInvalid'));
        return null;
      }

      const overrideStr = control.controls.requiredOverride.value;
      const requiredOverride = overrideStr === 'REQUIRED' ? true : overrideStr === 'OPTIONAL' ? false : null;

      return {
        fieldId: control.controls.fieldId.value,
        order: index + 1,
        defaultValue: normalizedDefaultValue,
        requiredOverride,
      };
    });

    if (fields.includes(null)) {
      return null;
    }

    return {
      name: String(this.form.controls.name.value || '').trim(),
      status: (this.form.controls.status.value || 'ACTIVE') as 'ACTIVE' | 'INACTIVE',
      categoryIds: [...this.selectedCategoryIds],
      fields: fields.filter((item): item is NonNullable<typeof item> => !!item),
    };
  }

  private isPricingField(field: PricingField): boolean {
    return field.fieldKind !== 'METADATA' && (field.type === 'NUMBER' || field.type === 'PERCENTAGE');
  }

  private rebuildStaticText(): void {
    this.statusOptions[0].label = this.translate.instant('common.status.active');
    this.statusOptions[1].label = this.translate.instant('common.status.inactive');
    this.requiredOverrideOptions[0].label = this.translate.instant('fieldGroups.required.inherit');
    this.requiredOverrideOptions[1].label = this.translate.instant('fieldGroups.required.required');
    this.requiredOverrideOptions[2].label = this.translate.instant('fieldGroups.required.optional');
  }
}
