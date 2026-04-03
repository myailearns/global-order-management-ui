import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormRecord,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { forkJoin } from 'rxjs';

import {
  FormControlsModule,
  GomButtonComponent,
  GomSelectOption,
} from '../../../shared/components/form-controls';
import { GomTableColumn, GomTableComponent, GomTableRow } from '../../../shared/components/table';
import { GomTabsComponent, GomTabContentComponent, TabItem } from '../../../shared/components/tabs';
import { GomModalComponent } from '../../../shared/components/modal';
import {
  Category,
  Field,
  FieldGroup,
  Group,
  GroupPayload,
  GroupsService,
  Unit,
} from './groups.service';

interface GroupRow extends GomTableRow {
  _id: string;
  name: string;
  categoryName: string;
  fieldGroupName: string;
  status: string;
  updatedAt: string;
  actions: string;
}

interface GroupWizardField {
  fieldId: string;
  key: string;
  name: string;
  type: 'NUMBER' | 'PERCENTAGE';
  isRequired: boolean;
  defaultValue: number;
}

type FormulaTarget = 'sellingPrice' | 'anchorPrice';

@Component({
  selector: 'gom-groups',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormControlsModule,
    GomButtonComponent,
    GomTableComponent,
    GomTabsComponent,
    GomTabContentComponent,
    GomModalComponent,
  ],
  templateUrl: './groups.component.html',
  styleUrl: './groups.component.scss',
})
export class GroupsComponent implements OnInit {
  private readonly groupsService = inject(GroupsService);
  private readonly fb = inject(FormBuilder);

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly groups = signal<Group[]>([]);
  readonly categories = signal<Category[]>([]);
  readonly fields = signal<Field[]>([]);
  readonly fieldGroups = signal<FieldGroup[]>([]);
  readonly units = signal<Unit[]>([]);

  readonly wizardOpen = signal(false);
  readonly currentStep = signal(1);
  readonly editingGroupId = signal<string | null>(null);
  readonly selectedExtraFieldIds = signal<string[]>([]);
  readonly formulaTarget = signal<FormulaTarget>('sellingPrice');

  readonly basicForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    categoryId: ['', [Validators.required]],
    quantity: [1, [Validators.required, Validators.min(0.0001)]],
  });

  readonly selectionForm = this.fb.group({
    fieldGroupId: ['', [Validators.required]],
  });

  readonly valuesForm = new FormRecord<FormControl<number | null>>({});

  readonly formulaForm = this.fb.group({
    sellingPrice: ['', [Validators.required]],
    anchorPrice: ['', [Validators.required]],
  });

  readonly unitsForm = this.fb.group({
    baseUnitId: ['', [Validators.required]],
  });

  readonly allowedUnitIds = signal<string[]>([]);

  readonly columns: GomTableColumn<GroupRow>[] = [
    { key: 'name', header: 'Group Name', sortable: true, filterable: true, width: '16rem' },
    { key: 'categoryName', header: 'Category', sortable: true, filterable: true, width: '12rem' },
    { key: 'fieldGroupName', header: 'Field Group', sortable: true, filterable: true, width: '14rem' },
    { key: 'status', header: 'Status', sortable: true, filterable: true, width: '10rem' },
    { key: 'updatedAt', header: 'Updated', sortable: true, width: '12rem' },
    {
      key: 'actions',
      header: 'Actions',
      width: '10rem',
      actionButtons: [{ label: 'Edit', actionKey: 'edit', variant: 'secondary' }],
    },
  ];

  readonly categoryOptions = computed<GomSelectOption[]>(() =>
    this.categories()
      .filter((item) => item.status === 'ACTIVE')
      .map((item) => ({ label: item.name, value: item._id }))
  );

  readonly fieldGroupOptions = computed<GomSelectOption[]>(() =>
    this.fieldGroups()
      .filter((item) => item.status === 'ACTIVE')
      .map((item) => ({ label: `${item.name} (v${item.version})`, value: item._id }))
  );

  readonly unitOptions = computed<GomSelectOption[]>(() =>
    this.units()
      .filter((item) => item.status === 'ACTIVE')
      .map((item) => ({ label: `${item.name} (${item.symbol})`, value: item._id }))
  );

  readonly selectedFieldGroup = computed(() =>
    this.fieldGroups().find((item) => item._id === this.selectionForm.controls.fieldGroupId.value) || null
  );

  readonly groupFields = computed<GroupWizardField[]>(() => {
    const selected = this.selectedFieldGroup();
    if (!selected) {
      return [];
    }

    const byId = new Map(this.fields().map((item) => [item._id, item]));

    return [...selected.fields]
      .sort((a, b) => a.order - b.order)
      .map((item) => byId.get(item.fieldId))
      .filter((item): item is Field => !!item)
      .map((item) => ({
        fieldId: item._id,
        key: item.key,
        name: item.name,
        type: item.type,
        isRequired: item.isRequired,
        defaultValue: item.defaultValue,
      }));
  });

  readonly availableExtraFields = computed<GroupWizardField[]>(() => {
    const baseFieldIds = new Set(this.groupFields().map((item) => item.fieldId));

    return this.fields()
      .filter((item) => item.status === 'ACTIVE' && !baseFieldIds.has(item._id))
      .map((item) => ({
        fieldId: item._id,
        key: item.key,
        name: item.name,
        type: item.type,
        isRequired: item.isRequired,
        defaultValue: item.defaultValue,
      }));
  });

  readonly wizardFields = computed<GroupWizardField[]>(() => {
    const extras = new Set(this.selectedExtraFieldIds());
    const extraFields = this.availableExtraFields().filter((item) => extras.has(item.fieldId));
    return [...this.groupFields(), ...extraFields];
  });

  readonly rows = computed<GroupRow[]>(() => {
    const categoriesById = new Map(this.categories().map((item) => [item._id, item.name]));
    const fieldGroupsById = new Map(this.fieldGroups().map((item) => [item._id, item.name]));

    return this.groups().map((item) => ({
      _id: item._id,
      name: item.name,
      categoryName: categoriesById.get(item.categoryId) || '-',
      fieldGroupName: fieldGroupsById.get(item.fieldGroupId) || '-',
      status: item.status,
      updatedAt: new Date(item.updatedAt).toLocaleDateString(),
      actions: 'Edit',
    }));
  });

  readonly formulaPreview = computed(() => this.calculateFormulaPreview());

  readonly wizardTabs = computed<TabItem[]>(() => [
    { id: 1, label: '1. Basic Info' },
    { id: 2, label: '2. Field Group' },
    { id: 3, label: '3. Field Values' },
    { id: 4, label: '4. Pricing Formula' },
    { id: 5, label: '5. Units' },
  ]);

  ngOnInit(): void {
    this.loadInitialData();
  }

  loadInitialData(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    forkJoin({
      groups: this.groupsService.listGroups(),
      categories: this.groupsService.listCategories(),
      fields: this.groupsService.listFields(),
      fieldGroups: this.groupsService.listFieldGroups(),
      units: this.groupsService.listUnits(),
    }).subscribe({
      next: (result) => {
        this.groups.set(result.groups.data ?? []);
        this.categories.set(result.categories.data ?? []);
        this.fields.set(result.fields.data ?? []);
        this.fieldGroups.set(result.fieldGroups.data ?? []);
        this.units.set(result.units.data ?? []);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Failed to load group setup data', error);
        this.errorMessage.set('Failed to load group setup data. Please refresh and try again.');
        this.loading.set(false);
      },
    });
  }

  openCreateWizard(): void {
    this.resetWizard();
    this.wizardOpen.set(true);
  }

  closeWizard(): void {
    this.wizardOpen.set(false);
  }

  onRowAction(event: { actionKey: string; row: GomTableRow }): void {
    if (event.actionKey !== 'edit') {
      return;
    }

    const groupId = typeof event.row['_id'] === 'string' ? event.row['_id'] : '';
    const existing = this.groups().find((item) => item._id === groupId);
    if (!existing) {
      return;
    }

    this.resetWizard();
    this.editingGroupId.set(existing._id);

    this.basicForm.patchValue({
      name: existing.name,
      categoryId: existing.categoryId,
      quantity: existing.quantity,
    });

    this.selectionForm.patchValue({ fieldGroupId: existing.fieldGroupId });

    const selectedGroup = this.fieldGroups().find((item) => item._id === existing.fieldGroupId);
    const baseIds = new Set((selectedGroup?.fields ?? []).map((item) => item.fieldId));
    const extraIds = existing.resolvedFields
      .filter((item) => !baseIds.has(item.fieldId))
      .map((item) => item.fieldId);

    this.selectedExtraFieldIds.set(extraIds);
    this.syncDynamicFields(existing);

    this.formulaForm.patchValue({
      sellingPrice: existing.formula.sellingPrice,
      anchorPrice: existing.formula.anchorPrice,
    });

    this.unitsForm.patchValue({ baseUnitId: existing.baseUnitId });
    this.allowedUnitIds.set([...existing.allowedUnitIds]);

    this.currentStep.set(1);
    this.wizardOpen.set(true);
  }

  onFieldGroupChange(): void {
    this.selectedExtraFieldIds.set([]);
    this.syncDynamicFields();
  }

  toggleExtraField(fieldId: string, checked: boolean): void {
    const current = new Set(this.selectedExtraFieldIds());
    if (checked) {
      current.add(fieldId);
    } else {
      current.delete(fieldId);
    }
    this.selectedExtraFieldIds.set([...current]);
    this.syncDynamicFields();
  }

  toggleAllowedUnit(unitId: string, checked: boolean): void {
    const current = new Set(this.allowedUnitIds());
    if (checked) {
      current.add(unitId);
    } else {
      current.delete(unitId);
    }
    this.allowedUnitIds.set([...current]);
  }

  onBaseUnitChange(unitId: string): void {
    const current = new Set(this.allowedUnitIds());
    if (unitId) {
      current.add(unitId);
    }
    this.allowedUnitIds.set([...current]);
  }

  isAllowedUnitSelected(unitId: string): boolean {
    return this.allowedUnitIds().includes(unitId);
  }

  getValueControl(key: string): FormControl<number | null> {
    return this.valuesForm.get(key) as FormControl<number | null>;
  }

  setFormulaTarget(target: FormulaTarget): void {
    this.formulaTarget.set(target);
  }

  insertToken(token: string): void {
    const target = this.formulaTarget();
    const control = this.formulaForm.controls[target];
    const current = control.value || '';
    const next = current.trim().length ? `${current} ${token}` : token;
    control.setValue(next);
    control.markAsDirty();
  }

  nextStep(): void {
    const step = this.currentStep();

    if (!this.isStepValid(step)) {
      this.touchStep(step);
      return;
    }

    if (step < 5) {
      this.currentStep.set(step + 1);
    }
  }

  previousStep(): void {
    const step = this.currentStep();
    if (step > 1) {
      this.currentStep.set(step - 1);
    }
  }

  selectStep(stepId: string | number): void {
    const step = typeof stepId === 'number' ? stepId : parseInt(stepId as string, 10);
    const currentStep = this.currentStep();

    // Allow jumping backwards without validation
    if (step < currentStep) {
      this.currentStep.set(step);
      return;
    }

    // For moving forward, validate all intermediate steps
    if (step > currentStep) {
      for (let i = currentStep; i < step; i++) {
        if (!this.isStepValid(i)) {
          this.touchStep(i);
          return;
        }
      }
    }

    this.currentStep.set(step);
  }

  saveGroup(): void {
    if (![1, 2, 3, 4, 5].every((step) => this.isStepValid(step))) {
      this.touchStep(this.currentStep());
      this.errorMessage.set('Please complete all required fields before saving the group.');
      return;
    }

    const payload = this.buildPayload();
    if (!payload) {
      return;
    }

    this.saving.set(true);
    this.errorMessage.set(null);

    const editId = this.editingGroupId();
    const request = editId
      ? this.groupsService.updateGroup(editId, payload)
      : this.groupsService.createGroup(payload);

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.closeWizard();
        this.loadInitialData();
      },
      error: (error) => {
        console.error('Failed to save group', error);
        this.errorMessage.set('Failed to save group. Please check formulas and required fields.');
        this.saving.set(false);
      },
    });
  }

  private isStepValid(step: number): boolean {
    if (step === 1) {
      return this.basicForm.valid;
    }

    if (step === 2) {
      return this.selectionForm.valid;
    }

    if (step === 3) {
      return this.valuesForm.valid && this.wizardFields().length > 0;
    }

    if (step === 4) {
      const preview = this.formulaPreview();
      return this.formulaForm.valid && !preview.error;
    }

    if (step === 5) {
      return this.unitsForm.valid && this.allowedUnitIds().length > 0;
    }

    return false;
  }

  private touchStep(step: number): void {
    if (step === 1) {
      this.basicForm.markAllAsTouched();
      return;
    }

    if (step === 2) {
      this.selectionForm.markAllAsTouched();
      return;
    }

    if (step === 3) {
      this.valuesForm.markAllAsTouched();
      return;
    }

    if (step === 4) {
      this.formulaForm.markAllAsTouched();
      return;
    }

    if (step === 5) {
      this.unitsForm.markAllAsTouched();
    }
  }

  private syncDynamicFields(existing?: Group): void {
    const nextGroup = new FormRecord<FormControl<number | null>>({});

    const resolvedByKey = new Map((existing?.resolvedFields || []).map((item) => [item.key, item.value]));

    for (const field of this.wizardFields()) {
      const initialValue = resolvedByKey.has(field.key)
        ? resolvedByKey.get(field.key)
        : field.defaultValue;
      const normalizedValue = typeof initialValue === 'number' ? initialValue : field.defaultValue;

      nextGroup.addControl(
        field.key,
        new FormControl<number | null>(normalizedValue, field.isRequired ? [Validators.required] : [])
      );
    }

    this.replaceValuesForm(nextGroup);
  }

  private replaceValuesForm(nextForm: FormRecord<FormControl<number | null>>): void {
    Object.keys(this.valuesForm.controls).forEach((key) => {
      this.valuesForm.removeControl(key);
    });

    Object.entries(nextForm.controls).forEach(([key, control]) => {
      this.valuesForm.addControl(key, control);
    });
  }

  private resetWizard(): void {
    this.currentStep.set(1);
    this.editingGroupId.set(null);
    this.selectedExtraFieldIds.set([]);
    this.allowedUnitIds.set([]);
    this.formulaTarget.set('sellingPrice');

    this.basicForm.reset({ name: '', categoryId: '', quantity: 1 });
    this.selectionForm.reset({ fieldGroupId: '' });
    this.formulaForm.reset({ sellingPrice: '', anchorPrice: '' });
    this.unitsForm.reset({ baseUnitId: '' });
    this.replaceValuesForm(new FormRecord<FormControl<number | null>>({}));
  }

  private buildPayload(): GroupPayload | null {
    const values = this.valuesForm.getRawValue() as Record<string, number | null>;
    const customFields = this.wizardFields().map((field) => ({
      fieldId: field.fieldId,
      value: Number(values[field.key]),
    }));

    const quantity = Number(this.basicForm.controls.quantity.value);

    if (!Number.isFinite(quantity) || quantity <= 0) {
      this.errorMessage.set('Quantity must be greater than zero.');
      return null;
    }

    const baseUnitId = String(this.unitsForm.controls.baseUnitId.value || '');
    const allowedUnitIds = new Set(this.allowedUnitIds());
    if (baseUnitId) {
      allowedUnitIds.add(baseUnitId);
    }

    return {
      name: String(this.basicForm.controls.name.value || '').trim(),
      categoryId: String(this.basicForm.controls.categoryId.value || ''),
      quantity,
      fieldGroupId: String(this.selectionForm.controls.fieldGroupId.value || ''),
      customFields,
      formula: {
        sellingPrice: String(this.formulaForm.controls.sellingPrice.value || '').trim(),
        anchorPrice: String(this.formulaForm.controls.anchorPrice.value || '').trim(),
      },
      baseUnitId,
      allowedUnitIds: [...allowedUnitIds],
      status: 'ACTIVE',
    };
  }

  private calculateFormulaPreview(): { sellingPrice: number | null; anchorPrice: number | null; error: string | null } {
    const rawValues = this.valuesForm.getRawValue() as Record<string, number | null>;
    const context: Record<string, number> = {};

    for (const field of this.wizardFields()) {
      const value = Number(rawValues[field.key]);
      if (!Number.isFinite(value)) {
        return { sellingPrice: null, anchorPrice: null, error: `${field.name} has invalid value.` };
      }
      context[field.key] = value;
    }

    const sellingFormula = String(this.formulaForm.controls.sellingPrice.value || '').trim();
    const anchorFormula = String(this.formulaForm.controls.anchorPrice.value || '').trim();

    if (!sellingFormula || !anchorFormula) {
      return { sellingPrice: null, anchorPrice: null, error: null };
    }

    try {
      const selling = this.evaluateExpression(sellingFormula, context);
      const anchor = this.evaluateExpression(anchorFormula, {
        ...context,
        sellingPrice: selling,
      });

      return {
        sellingPrice: Number(selling.toFixed(2)),
        anchorPrice: Number(anchor.toFixed(2)),
        error: null,
      };
    } catch (error) {
      return {
        sellingPrice: null,
        anchorPrice: null,
        error: error instanceof Error ? error.message : 'Invalid formula',
      };
    }
  }

  private evaluateExpression(expression: string, context: Record<string, number>): number {
    if (!/^[\d\s()+\-*/._A-Za-z]+$/.test(expression)) {
      throw new Error('Formula contains unsupported characters.');
    }

    const keys = Object.keys(context).sort((a, b) => b.length - a.length);
    let replaced = expression;

    for (const key of keys) {
      const value = context[key];
      const pattern = new RegExp(String.raw`\b${key}\b`, 'g');
      replaced = replaced.replace(pattern, String(value));
    }

    if (/\b[A-Za-z_]\w*\b/.test(replaced)) {
      throw new Error('Formula uses unknown variables.');
    }

    const result = new Function(`"use strict"; return (${replaced});`)();
    const numeric = Number(result);

    if (!Number.isFinite(numeric)) {
      throw new TypeError('Formula output is invalid.');
    }

    return numeric;
  }
}
