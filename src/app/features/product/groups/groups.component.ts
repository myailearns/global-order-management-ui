import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormRecord,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';

import {
  FormControlsModule,
  GomButtonComponent,
  GomSelectOption,
} from '../../../shared/components/form-controls';
import {
  GomButtonContentMode,
  getButtonContentMode,
  showButtonIcon,
  showButtonText,
} from '../../../shared/components/config';
import { GomTableColumn, GomTableComponent, GomTableRow } from '../../../shared/components/table';
import { GomTabsComponent, GomTabContentComponent, TabItem } from '../../../shared/components/tabs';
import { GomModalComponent } from '../../../shared/components/modal';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import {
  Category,
  Field,
  FieldGroup,
  Group,
  GroupPayload,
  GroupsService,
  Unit,
  TaxProfile,
} from './groups.service';

interface GroupRow extends GomTableRow {
  _id: string;
  name: string;
  categoryName: string;
  fieldGroupName: string;
  taxProfileName: string;
  stock: string;
  stockSeverity: 'normal' | 'low' | 'critical';
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
  private readonly router = inject(Router);
  private readonly authSession = inject(AuthSessionService);

  readonly loading = signal(false);
  readonly canWrite = computed(() => this.authSession.canWrite('product'));
  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly groups = signal<Group[]>([]);
  readonly categories = signal<Category[]>([]);
  readonly fields = signal<Field[]>([]);
  readonly fieldGroups = signal<FieldGroup[]>([]);
  readonly units = signal<Unit[]>([]);
  readonly taxProfiles = signal<TaxProfile[]>([]);

  readonly wizardOpen = signal(false);
  readonly currentStep = signal(1);
  readonly editingGroupId = signal<string | null>(null);
  readonly editingQuantity = signal(1);
  readonly selectedFieldGroupIds = signal<string[]>([]);
  readonly selectedExtraFieldIds = signal<string[]>([]);
  readonly formulaTarget = signal<FormulaTarget>('sellingPrice');
  readonly submitMode: GomButtonContentMode = getButtonContentMode('primary-action');
  readonly cancelMode: GomButtonContentMode = getButtonContentMode('dismiss');
  readonly secondaryMode: GomButtonContentMode = getButtonContentMode('secondary-action');

  readonly basicForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    categoryId: ['', [Validators.required]],
    taxProfileId: [''],
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
    { key: 'taxProfileName', header: 'Tax Profile', sortable: true, filterable: true, width: '14rem' },
    {
      key: 'stock',
      header: 'Stock',
      sortable: true,
      width: '10rem',
      cellClass: (_value, row) => {
        if (row.stockSeverity === 'critical') {
          return 'group-stock--critical';
        }
        if (row.stockSeverity === 'low') {
          return 'group-stock--low';
        }
        return 'group-stock--normal';
      },
    },
    { key: 'status', header: 'Status', sortable: true, filterable: true, width: '10rem' },
    { key: 'updatedAt', header: 'Updated', sortable: true, width: '12rem' },
    {
      key: 'actions',
      header: 'Actions',
      width: '20rem',
      actionButtons: [
        { label: 'Edit', actionKey: 'edit', variant: 'secondary' },
        { label: 'Add Stock', actionKey: 'add-stock', variant: 'secondary' },
        { label: 'Add Variant', actionKey: 'add-variant', variant: 'secondary' },
      ],
    },
  ];

  readonly categoryOptions = computed<GomSelectOption[]>(() =>
    this.categories()
      .filter((item) => item.status === 'ACTIVE')
      .map((item) => ({ label: item.name, value: item._id }))
  );

  readonly fieldGroupOptions = computed<GomSelectOption[]>(() =>
    this.getFieldGroupsForCategory(this.basicForm.controls.categoryId.value || '')
      .filter((item) => item.status === 'ACTIVE')
      .map((item) => ({ label: `${item.name} (v${item.version})`, value: item._id }))
  );

  readonly unitOptions = computed<GomSelectOption[]>(() =>
    this.getUnitsForCategory(this.basicForm.controls.categoryId.value || '')
      .filter((item) => item.status === 'ACTIVE')
      .map((item) => ({ label: `${item.name} (${item.symbol})`, value: item._id }))
  );

  readonly taxProfileOptions = computed<GomSelectOption[]>(() =>
    this.taxProfiles()
      .filter((item) => item.status === 'ACTIVE')
      .map((item) => ({
        label: `${item.name} (${item.taxMode === 'GST' ? `${item.rate}% GST` : 'No Tax'})`,
        value: item._id,
      }))
  );

  readonly selectedFieldGroups = computed<FieldGroup[]>(() => {
    const selectedIds = this.selectedFieldGroupIds();
    if (!selectedIds.length) {
      return [];
    }

    const byId = new Map(this.fieldGroups().map((item) => [item._id, item]));
    return selectedIds
      .map((id) => byId.get(id) || null)
      .filter((item): item is FieldGroup => !!item);
  });

  readonly groupFields = computed<GroupWizardField[]>(() => {
    const selectedGroups = this.selectedFieldGroups();
    if (!selectedGroups.length) {
      return [];
    }

    const byId = new Map(this.fields().map((item) => [item._id, item]));
    const merged = new Map<string, GroupWizardField>();

    for (const selected of selectedGroups) {
      for (const item of [...selected.fields].sort((a, b) => a.order - b.order)) {
        const field = byId.get(item.fieldId);
        if (!field || !this.isPricingField(field)) {
          continue;
        }

        if (merged.has(field._id)) {
          continue;
        }

        let resolvedDefaultValue = 0;
        if (typeof field.defaultValue === 'number') {
          resolvedDefaultValue = field.defaultValue;
        }

        if (typeof item.defaultValue === 'number') {
          resolvedDefaultValue = item.defaultValue;
        }

        merged.set(field._id, {
          fieldId: field._id,
          key: field.key,
          name: field.name,
          type: field.type,
          isRequired: typeof item.requiredOverride === 'boolean' ? item.requiredOverride : field.isRequired,
          defaultValue: resolvedDefaultValue,
        });
      }
    }

    return [...merged.values()];
  });

  readonly availableExtraFields = computed<GroupWizardField[]>(() => {
    const baseFieldIds = new Set(this.groupFields().map((item) => item.fieldId));

    return this.fields()
      .filter((item) => item.status === 'ACTIVE' && !baseFieldIds.has(item._id))
      .filter((item) => this.isPricingField(item))
      .map((item) => ({
        fieldId: item._id,
        key: item.key,
        name: item.name,
        type: item.type,
        isRequired: item.isRequired,
        defaultValue: typeof item.defaultValue === 'number' ? item.defaultValue : 0,
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
    const taxProfilesById = new Map(this.taxProfiles().map((item) => [item._id, item.name]));

    return this.groups().map((item) => {
      const availableStock = Number(item.stock?.available ?? 0);
      const reorderLevel = Number(item.stock?.reorderLevel ?? 0);
      let stockSeverity: GroupRow['stockSeverity'] = 'normal';

      if (availableStock === 0) {
        stockSeverity = 'critical';
      } else if (availableStock <= reorderLevel) {
        stockSeverity = 'low';
      }

      return {
        _id: item._id,
        name: item.name,
        categoryName: categoriesById.get(item.categoryId) || '-',
        fieldGroupName: fieldGroupsById.get(item.fieldGroupId) || '-',
        taxProfileName: item.taxProfileId ? (taxProfilesById.get(item.taxProfileId) || 'Unknown') : 'Not mapped',
        stock: availableStock.toLocaleString(),
        stockSeverity,
        status: item.status,
        updatedAt: new Date(item.updatedAt).toLocaleDateString(),
        actions: 'Edit',
      };
    });
  });

  formulaPreview(): { sellingPrice: number | null; anchorPrice: number | null; error: string | null } {
    return this.calculateFormulaPreview();
  }

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
      taxProfiles: this.groupsService.listTaxProfiles(),
    }).subscribe({
      next: (result) => {
        this.groups.set(result.groups.data ?? []);
        this.categories.set(result.categories.data ?? []);
        this.fields.set(result.fields.data ?? []);
        this.fieldGroups.set(result.fieldGroups.data ?? []);
        this.units.set(result.units.data ?? []);
        this.taxProfiles.set(result.taxProfiles.data ?? []);
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
    if (!this.canWrite()) {
      return;
    }
    const groupId = typeof event.row['_id'] === 'string' ? event.row['_id'] : '';
    const existing = this.groups().find((item) => item._id === groupId);
    if (!existing) {
      return;
    }

    if (event.actionKey === 'add-stock') {
      void this.router.navigate(['/product/stock'], {
        queryParams: {
          groupId: existing._id,
          openAdd: '1',
        },
      });
      return;
    }

    if (event.actionKey === 'add-variant') {
      void this.router.navigate(['/product/variants'], {
        queryParams: {
          groupId: existing._id,
        },
      });
      return;
    }

    if (event.actionKey !== 'edit') {
      return;
    }

    this.resetWizard();
    this.editingGroupId.set(existing._id);

    this.basicForm.patchValue({
      name: existing.name,
      categoryId: existing.categoryId,
      taxProfileId: existing.taxProfileId || '',
    });
    this.editingQuantity.set(existing.quantity || 1);

    this.selectedFieldGroupIds.set([existing.fieldGroupId]);
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

  onFieldGroupSelectionChange(ids: string[]): void {
    const cleaned = [...new Set(ids.map((id) => String(id || '').trim()).filter((id) => !!id))];
    this.selectedFieldGroupIds.set(cleaned);
    this.selectionForm.patchValue({ fieldGroupId: cleaned[0] || '' });

    this.selectedExtraFieldIds.set([]);
    this.syncDynamicFields();
  }

  onCategoryChange(categoryId: string): void {
    const selectedFieldGroupId = this.selectionForm.controls.fieldGroupId.value || '';
    const allowedFieldGroups = this.getFieldGroupsForCategory(categoryId)
      .filter((item) => item.status === 'ACTIVE');
    const allowedFieldGroupIds = new Set(allowedFieldGroups.map((item) => item._id));

    const filteredSelectedIds = this.selectedFieldGroupIds().filter((id) => allowedFieldGroupIds.has(id));
    if (filteredSelectedIds.length !== this.selectedFieldGroupIds().length) {
      this.selectedFieldGroupIds.set(filteredSelectedIds);
      this.selectionForm.patchValue({ fieldGroupId: filteredSelectedIds[0] || '' });
      this.selectedExtraFieldIds.set([]);
      this.syncDynamicFields();
    }

    if (selectedFieldGroupId && !allowedFieldGroups.some((item) => item._id === selectedFieldGroupId)) {
      this.selectionForm.patchValue({ fieldGroupId: '' });
      this.selectedFieldGroupIds.set([]);
      this.selectedExtraFieldIds.set([]);
      this.syncDynamicFields();
    }

    if (!this.selectionForm.controls.fieldGroupId.value && allowedFieldGroups.length === 1) {
      this.onFieldGroupSelectionChange([allowedFieldGroups[0]._id]);
    }

    const allowedUnits = this.getUnitsForCategory(categoryId)
      .filter((item) => item.status === 'ACTIVE')
      .map((item) => item._id);
    const allowedUnitSet = new Set(allowedUnits);

    const currentBaseUnit = this.unitsForm.controls.baseUnitId.value || '';
    if (currentBaseUnit && !allowedUnitSet.has(currentBaseUnit)) {
      this.unitsForm.patchValue({ baseUnitId: '' });
    }

    const filteredAllowedUnits = this.allowedUnitIds().filter((id) => allowedUnitSet.has(id));
    if (filteredAllowedUnits.length !== this.allowedUnitIds().length) {
      this.allowedUnitIds.set(filteredAllowedUnits);
    }
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

  getFieldHint(field: GroupWizardField): string {
    if (field.type !== 'PERCENTAGE') {
      return '';
    }

    const percentage = Number(this.getValueControl(field.key).value);
    if (!Number.isFinite(percentage)) {
      return '';
    }

    const numberFields = this.wizardFields().filter((item) => item.type === 'NUMBER' && item.key !== field.key);
    if (!numberFields.length) {
      return '';
    }

    const preferredBase = numberFields.find((item) => ['buyPrice', 'buy_price', 'basePrice', 'costPrice'].includes(item.key));
    const baseField = preferredBase || numberFields[0];
    const baseValue = Number(this.getValueControl(baseField.key).value);

    if (!Number.isFinite(baseValue)) {
      return '';
    }

    const calculated = (baseValue * percentage) / 100;
    return `= ${calculated.toFixed(2)}`;
  }

  getSellingFormulaHint(): string {
    const preview = this.formulaPreview();
    if (preview.error || preview.sellingPrice === null) {
      return '';
    }

    return `Calculated selling price: ${preview.sellingPrice}`;
  }

  getAnchorFormulaHint(): string {
    const preview = this.formulaPreview();
    if (preview.error || preview.anchorPrice === null) {
      return '';
    }

    return `Calculated anchor price: ${preview.anchorPrice}`;
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
    const step = typeof stepId === 'number' ? stepId : Number.parseInt(stepId, 10);
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

  canProceedToNextStep(): boolean {
    return this.isStepValid(this.currentStep());
  }

  canSaveGroup(): boolean {
    return [1, 2, 3, 4, 5].every((step) => this.isStepValid(step));
  }

  shouldShowIcon(mode: GomButtonContentMode): boolean {
    return showButtonIcon(mode);
  }

  shouldShowText(mode: GomButtonContentMode): boolean {
    return showButtonText(mode);
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
    this.editingQuantity.set(1);
    this.selectedFieldGroupIds.set([]);
    this.selectedExtraFieldIds.set([]);
    this.allowedUnitIds.set([]);
    this.formulaTarget.set('sellingPrice');

    this.basicForm.reset({ name: '', categoryId: '', taxProfileId: '' });
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

    const quantity = this.editingGroupId() ? this.editingQuantity() : 1;

    const baseUnitId = String(this.unitsForm.controls.baseUnitId.value || '');
    const allowedUnitIds = new Set(this.allowedUnitIds());
    if (baseUnitId) {
      allowedUnitIds.add(baseUnitId);
    }

    const taxProfileId = String(this.basicForm.controls.taxProfileId.value || '').trim();

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
      taxProfileId,
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

    if (!sellingFormula && !anchorFormula) {
      return { sellingPrice: null, anchorPrice: null, error: null };
    }

    try {
      let selling: number | null = null;
      let anchor: number | null = null;

      if (sellingFormula) {
        selling = this.evaluateExpression(sellingFormula, context);
      }

      if (anchorFormula) {
        if (!Number.isFinite(selling)) {
          return {
            sellingPrice: null,
            anchorPrice: null,
            error: 'Selling price formula is required before anchor price formula.',
          };
        }

        anchor = this.evaluateExpression(anchorFormula, {
          ...context,
          sellingPrice: Number(selling),
        });
      }

      return {
        sellingPrice: Number.isFinite(selling) ? Number(Number(selling).toFixed(2)) : null,
        anchorPrice: Number.isFinite(anchor) ? Number(Number(anchor).toFixed(2)) : null,
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

  private getFieldGroupsForCategory(categoryId: string): FieldGroup[] {
    const normalizedCategoryId = String(categoryId || '').trim();
    const activeFieldGroups = this.fieldGroups().filter((item) => item.status === 'ACTIVE');

    if (!normalizedCategoryId) {
      return activeFieldGroups;
    }

    return activeFieldGroups.filter((fieldGroup) => {
      const mappedCategoryIds = fieldGroup.categoryIds || [];
      if (!mappedCategoryIds.length) {
        return true;
      }

      return mappedCategoryIds.includes(normalizedCategoryId);
    });
  }

  private getUnitsForCategory(categoryId: string): Unit[] {
    const normalizedCategoryId = String(categoryId || '').trim();
    const allUnits = this.units();

    if (!normalizedCategoryId) {
      return allUnits;
    }

    return allUnits.filter((unit) => {
      const mappedCategoryIds = unit.categoryIds || [];
      if (!mappedCategoryIds.length) {
        return true;
      }

      return mappedCategoryIds.includes(normalizedCategoryId);
    });
  }

  private evaluateExpression(expression: string, context: Record<string, number>): number {
    if (!/^[\d\s()+\-*/%._A-Za-z]+$/.test(expression)) {
      throw new Error('Formula contains unsupported characters.');
    }

    const keys = Object.keys(context).sort((a, b) => b.length - a.length);
    let replaced = expression.replace(/(\d+(?:\.\d+)?)\s*%/g, '($1/100)');

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

  private isPricingField(field: Field): field is Field & { type: 'NUMBER' | 'PERCENTAGE' } {
    return (
      field.fieldKind !== 'METADATA'
      && (field.type === 'NUMBER' || field.type === 'PERCENTAGE')
    );
  }
}
