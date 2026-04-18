import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { forkJoin } from 'rxjs';

import { GomAlertToastService } from '@gomlibs/ui';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { GomButtonContentMode, getButtonContentMode, showButtonIcon, showButtonText } from '@gomlibs/ui';
import { GomButtonComponent, GomInputComponent, GomSelectComponent, GomSelectOption } from '@gomlibs/ui';
import { GomConfirmationModalComponent, GomModalComponent } from '@gomlibs/ui';
import { GomTableColumn, GomTableComponent, GomTableRow } from '@gomlibs/ui';
import { CategoryOption, FieldGroup, FieldGroupFieldItem, FieldGroupPayload, FieldGroupsService, PricingField, ProductGroupUsage } from './field-groups.service';

interface FieldGroupRow extends GomTableRow {
  _id: string;
  name: string;
  fieldsCount: string;
  version: string;
  status: string;
  actions: string;
}

type FieldGroupStatus = 'ACTIVE' | 'INACTIVE';
type RequiredOverrideOption = 'INHERIT' | 'REQUIRED' | 'OPTIONAL';

type FieldGroupFieldForm = FormGroup<{
  fieldId: FormControl<string>;
  defaultValue: FormControl<string>;
  requiredOverride: FormControl<RequiredOverrideOption>;
}>;

@Component({
  selector: 'gom-field-groups',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    GomButtonComponent,
    GomInputComponent,
    GomSelectComponent,
    GomTableComponent,
    GomModalComponent,
    GomConfirmationModalComponent,
  ],
  templateUrl: './field-groups.component.html',
  styleUrl: './field-groups.component.scss',
})
export class FieldGroupsComponent implements OnInit {
  private readonly fieldGroupsService = inject(FieldGroupsService);
  private readonly toast = inject(GomAlertToastService);
  private readonly translate = inject(TranslateService);
  private readonly fb = inject(FormBuilder);
  private readonly authSession = inject(AuthSessionService);

  readonly addFieldMode: GomButtonContentMode = getButtonContentMode('secondary-action');
  readonly rowDeleteMode: GomButtonContentMode = getButtonContentMode('danger-action');
  readonly submitMode: GomButtonContentMode = getButtonContentMode('primary-action');
  readonly cancelMode: GomButtonContentMode = getButtonContentMode('dismiss');

  readonly columns: GomTableColumn<FieldGroupRow>[] = [
    { key: 'name', header: '', sortable: true, filterable: true, width: '20rem' },
    { key: 'fieldsCount', header: '', sortable: true, width: '10rem' },
    { key: 'version', header: '', sortable: true, width: '8rem' },
    { key: 'status', header: '', sortable: true, filterable: true, width: '10rem' },
    {
      key: 'actions',
      header: '',
      width: '12rem',
      actionButtons: [],
    },
  ];

  readonly statusOptions: GomSelectOption[] = [
    { label: '', value: 'ACTIVE' },
    { label: '', value: 'INACTIVE' },
  ];
  readonly requiredOverrideOptions: GomSelectOption[] = [
    { label: '', value: 'INHERIT' },
    { label: '', value: 'REQUIRED' },
    { label: '', value: 'OPTIONAL' },
  ];

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly canCreateFieldGroup = computed(() => this.authSession.hasFeature('fieldGroup.create'));
  readonly canEditFieldGroup = computed(() => this.authSession.hasFeature('fieldGroup.edit'));
  readonly canDeleteFieldGroup = computed(() => this.authSession.hasFeature('fieldGroup.delete'));
  readonly formOpen = signal(false);
  readonly deleteConfirmOpen = signal(false);
  readonly selectedFieldGroup = signal<FieldGroup | null>(null);
  readonly pendingDeleteFieldGroup = signal<FieldGroup | null>(null);
  readonly fieldItemsVersion = signal(0);
  readonly dragSourceIndex = signal<number | null>(null);
  readonly dragOverIndex = signal<number | null>(null);

  readonly fieldGroups = signal<FieldGroup[]>([]);
  readonly fields = signal<PricingField[]>([]);
  readonly groups = signal<ProductGroupUsage[]>([]);
  readonly categories = signal<CategoryOption[]>([]);

  readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    status: ['ACTIVE' as FieldGroupStatus, [Validators.required]],
    fields: this.fb.array<FieldGroupFieldForm>([]),
  });

  selectedAddFieldIds: string[] = [];
  selectedCategoryIds: string[] = [];
  addFieldSelectCloseToken = 0;
  categorySelectCloseToken = 0;

  readonly rows = computed<FieldGroupRow[]>(() =>
    this.fieldGroups().map((fieldGroup) => ({
      _id: fieldGroup._id,
      name: fieldGroup.name,
      fieldsCount: String(fieldGroup.fields.length),
      version: `v${fieldGroup.version}`,
      status: fieldGroup.status,
      actions: '',
    }))
  );

  readonly selectedFields = computed(() => {
    this.fieldItemsVersion();
    return this.fieldItems.controls.map((control, index) => {
      const fieldId = control.controls.fieldId.value;
      const field = this.fields().find((item) => item._id === fieldId) || null;
      return {
        index,
        fieldId,
        field,
        control,
      };
    });
  });

  readonly availableFieldOptions = computed<GomSelectOption[]>(() => {
    this.fieldItemsVersion();
    const selectedIds = new Set(this.fieldItems.controls.map((control) => control.controls.fieldId.value));

    return this.fields()
      .filter((field) => this.isPricingField(field) && field.status === 'ACTIVE' && !selectedIds.has(field._id))
      .map((field) => ({
        value: field._id,
        label: `${field.name} (${field.key})`,
      }));
  });

  readonly categoryOptions = computed<GomSelectOption[]>(() =>
    this.categories()
      .filter((category) => category.status === 'ACTIVE')
      .map((category) => ({
        value: category._id,
        label: category.name,
      }))
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
    this.translate.onLangChange.subscribe(() => this.rebuildStaticText());
    this.rebuildStaticText();
  }

  ngOnInit(): void {
    this.loadData();
  }

  get fieldItems(): FormArray<FieldGroupFieldForm> {
    return this.form.controls.fields;
  }

  shouldShowIcon(mode: GomButtonContentMode): boolean {
    return showButtonIcon(mode);
  }

  shouldShowText(mode: GomButtonContentMode): boolean {
    return showButtonText(mode);
  }

  onAddFieldGroup(): void {
    if (!this.canCreateFieldGroup()) {
      return;
    }

    this.selectedFieldGroup.set(null);
    this.errorMessage.set(null);
    this.resetForm();
    this.formOpen.set(true);
  }

  onRowAction(event: { actionKey: string; row: GomTableRow }): void {
    const fieldGroupId = typeof event.row['_id'] === 'string' ? event.row['_id'] : '';
    const fieldGroup = this.fieldGroups().find((item) => item._id === fieldGroupId);
    if (!fieldGroup) {
      return;
    }

    if (event.actionKey === 'edit') {
      if (!this.canEditFieldGroup()) {
        return;
      }
      this.openEdit(fieldGroup);
      return;
    }

    if (event.actionKey === 'delete') {
      if (!this.canDeleteFieldGroup()) {
        return;
      }
      this.pendingDeleteFieldGroup.set(fieldGroup);
      this.deleteConfirmOpen.set(true);
    }
  }

  addSelectedField(): void {
    if (!this.selectedAddFieldIds.length) {
      return;
    }

    const existingFieldIds = new Set(this.fieldItems.controls.map((control) => control.controls.fieldId.value));
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

  onAddFieldSelectionChange(values: string[]): void {
    this.selectedAddFieldIds = [...values];
  }

  onMappedCategorySelectionChange(values: string[]): void {
    this.selectedCategoryIds = [...values];
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

  saveFieldGroup(): void {
    const isEdit = !!this.selectedFieldGroup()?._id;
    const canProceed = isEdit ? this.canEditFieldGroup() : this.canCreateFieldGroup();
    if (!canProceed) {
      return;
    }

    if (this.form.invalid || this.fieldItems.length === 0) {
      this.form.markAllAsTouched();
      this.fieldItems.controls.forEach((control) => control.markAllAsTouched());
      if (this.fieldItems.length === 0) {
        this.errorMessage.set(this.translate.instant('fieldGroups.validation.fieldsRequired'));
      }
      return;
    }

    const enteredName = String(this.form.controls.name.value || '').trim().toLowerCase();
    const editingId = this.selectedFieldGroup()?._id || null;
    const hasDuplicateName = this.fieldGroups().some((item) => {
      if (editingId && item._id === editingId) {
        return false;
      }

      return String(item.name || '').trim().toLowerCase() === enteredName;
    });

    if (hasDuplicateName) {
      const duplicateMessage = this.translate.instant('fieldGroups.validation.nameDuplicate');
      this.errorMessage.set(duplicateMessage);
      this.toast.error(duplicateMessage);
      return;
    }

    const payload = this.buildPayload();
    if (!payload) {
      return;
    }

    this.saving.set(true);
    this.errorMessage.set(null);

    const selected = this.selectedFieldGroup();
    const request = selected?._id
      ? this.fieldGroupsService.updateFieldGroup(selected._id, payload)
      : this.fieldGroupsService.createFieldGroup(payload);

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.formOpen.set(false);
        this.selectedFieldGroup.set(null);
        this.toast.success(this.translate.instant(selected ? 'fieldGroups.toast.successUpdate' : 'fieldGroups.toast.successCreate'));
        this.loadData();
      },
      error: (error) => {
        console.error('Error saving field group:', error);
        const apiMessage = this.extractApiMessage(error);
        const message = apiMessage || this.translate.instant('fieldGroups.toast.errorSave');
        this.errorMessage.set(message);
        this.toast.error(message);
        this.saving.set(false);
      },
    });
  }

  closeForm(): void {
    this.formOpen.set(false);
    this.selectedFieldGroup.set(null);
    this.resetForm();
  }

  cancelDelete(): void {
    this.deleteConfirmOpen.set(false);
    this.pendingDeleteFieldGroup.set(null);
  }

  confirmDelete(): void {
    if (!this.canDeleteFieldGroup()) {
      this.cancelDelete();
      return;
    }

    const fieldGroup = this.pendingDeleteFieldGroup();
    if (!fieldGroup?._id) {
      this.cancelDelete();
      return;
    }

    this.loading.set(true);
    this.deleteConfirmOpen.set(false);
    this.errorMessage.set(null);

    this.fieldGroupsService.deleteFieldGroup(fieldGroup._id, true).subscribe({
      next: () => {
        this.pendingDeleteFieldGroup.set(null);
        this.toast.success(this.translate.instant('fieldGroups.toast.successDelete'));
        this.loadData();
      },
      error: (error) => {
        console.error('Error deleting field group:', error);
        const apiMessage = this.extractApiMessage(error);
        const message = apiMessage || this.translate.instant('fieldGroups.toast.errorDelete');
        this.errorMessage.set(message);
        this.toast.error(message);
        this.pendingDeleteFieldGroup.set(null);
        this.loading.set(false);
      },
    });
  }

  getDeleteMessage(): string {
    return this.translate.instant('fieldGroups.deleteConfirm.message', {
      name: this.pendingDeleteFieldGroup()?.name || '',
    });
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

  private loadData(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    forkJoin({
      fieldGroups: this.fieldGroupsService.listFieldGroups(),
      fields: this.fieldGroupsService.listFields(),
      groups: this.fieldGroupsService.listGroups(),
      categories: this.fieldGroupsService.listCategories(),
    }).subscribe({
      next: (result) => {
        this.fieldGroups.set(result.fieldGroups.data ?? []);
        this.fields.set(result.fields.data ?? []);
        this.groups.set(result.groups.data ?? []);
        this.categories.set(result.categories.data ?? []);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading field groups:', error);
        this.errorMessage.set(this.translate.instant('fieldGroups.toast.errorLoad'));
        this.loading.set(false);
      },
    });
  }

  private openEdit(fieldGroup: FieldGroup): void {
    this.selectedFieldGroup.set(fieldGroup);
    this.errorMessage.set(null);
    this.resetForm();

    this.form.patchValue({
      name: fieldGroup.name,
      status: fieldGroup.status,
    });
    this.selectedCategoryIds = [...(fieldGroup.categoryIds || [])];
    this.categorySelectCloseToken += 1;

    [...fieldGroup.fields]
      .sort((a, b) => a.order - b.order)
      .forEach((item) => {
        this.fieldItems.push(this.createFieldItemGroup(item));
      });
    this.bumpFieldItemsVersion();

    this.form.markAsPristine();
    this.form.markAsUntouched();
    this.formOpen.set(true);
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

      return {
        fieldId: control.controls.fieldId.value,
        order: index + 1,
        defaultValue: normalizedDefaultValue,
        requiredOverride: control.controls.requiredOverride.value,
      };
    });

    if (fields.includes(null)) {
      return null;
    }

    return {
      name: String(this.form.controls.name.value || '').trim(),
      status: (this.form.controls.status.value || 'ACTIVE') as FieldGroupStatus,
      categoryIds: [...this.selectedCategoryIds],
      fields: fields.filter((item): item is NonNullable<typeof item> => !!item),
    };
  }

  private isPricingField(field: PricingField): boolean {
    return field.fieldKind !== 'METADATA' && (field.type === 'NUMBER' || field.type === 'PERCENTAGE');
  }

  private extractApiMessage(error: unknown): string {
    const maybeError = error as {
      error?: { message?: string; error?: string };
      message?: string;
    };

    const message = maybeError?.error?.message
      || maybeError?.error?.error
      || maybeError?.message
      || '';

    return typeof message === 'string' ? message.trim() : '';
  }

  private rebuildStaticText(): void {
    this.statusOptions[0].label = this.translate.instant('common.status.active');
    this.statusOptions[1].label = this.translate.instant('common.status.inactive');
    this.requiredOverrideOptions[0].label = this.translate.instant('fieldGroups.required.inherit');
    this.requiredOverrideOptions[1].label = this.translate.instant('fieldGroups.required.required');
    this.requiredOverrideOptions[2].label = this.translate.instant('fieldGroups.required.optional');

    this.columns[0].header = this.translate.instant('fieldGroups.labels.name');
    this.columns[1].header = this.translate.instant('fieldGroups.labels.fields');
    this.columns[2].header = this.translate.instant('fieldGroups.labels.version');
    this.columns[3].header = this.translate.instant('fieldGroups.labels.status');
    this.columns[3].format = (value) =>
      value === 'INACTIVE'
        ? this.translate.instant('common.status.inactive')
        : this.translate.instant('common.status.active');
    this.columns[4].header = this.translate.instant('common.labels.actions');
    const actionButtons: Array<{ label: string; actionKey: string; variant: 'secondary' }> = [];
    if (this.canEditFieldGroup()) {
      actionButtons.push({ label: this.translate.instant('common.actions.edit'), actionKey: 'edit', variant: 'secondary' });
    }
    if (this.canDeleteFieldGroup()) {
      actionButtons.push({ label: this.translate.instant('common.actions.delete'), actionKey: 'delete', variant: 'secondary' });
    }
    this.columns[4].actionButtons = actionButtons;
  }
}
