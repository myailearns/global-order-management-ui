import { CommonModule, Location } from '@angular/common';
import { Component, computed, DestroyRef, inject, OnInit, signal, ViewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';

import {
  FormControlsModule,
  GomAlertToastService,
  GomButtonComponent,
  GomSelectOption,
} from '@gomlibs/ui';
import { AuthSessionService } from '../../../../core/auth/auth-session.service';
import { BulkGridComponent } from '../../../../shared/components/bulk-grid/bulk-grid.component';
import {
  BulkGridColumn,
  BulkGridRow,
  BulkGridValidationState,
} from '../../../../shared/components/bulk-grid/bulk-grid.model';
import {
  ApiPaginated,
  Category,
  Field,
  FieldGroup,
  Group,
  GroupPayload,
  GroupsService,
  TaxProfile,
  Unit,
} from '../groups.service';
import { CreateGroupWizardComponent, GroupWizardPrefillContext, GroupWizardRowResult } from '../wizard/create-group-wizard.component';
import { VariantsService } from '../../variants/variants.service';

interface BulkRowVariantDraft {
  sku: string;
  quantity: number;
  unitId: string;
  itemType: 'INDIVIDUAL' | 'PACK';
  additionalPrice: number;
  discountType: 'PERCENT' | 'AMOUNT';
  discountValue: number;
}

interface BulkVariantQuickSuggestion {
  label: string;
  quantity: number;
  unitId: string;
  skuSuffix: string;
}

interface BulkSelectableField {
  fieldId: string;
  key: string;
  name: string;
  type: 'NUMBER' | 'PERCENTAGE';
  isRequired: boolean;
  defaultValue: number | null;
}

interface BulkUploadDraftSnapshot {
  version: 1;
  fieldGroupId: string;
  defaults: {
    categoryId: string;
    baseUnitId: string;
    allowedOtherUnitIds: string[];
    taxProfileId: string;
    simpleBaseCostKey: string;
    simpleSellingMarginBase: 'buy' | 'actual';
    simpleMarginPercent: number;
    simpleAnchorPercent: number;
    simpleActualExtraKeys: string[];
    selectedExtraFieldIds: string[];
  };
  rows: BulkGridRow[];
  rowVariants: Record<string, BulkRowVariantDraft[]>;
  lastSavedAt: string;
}

@Component({
  selector: 'gom-bulk-upload-groups',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    FormControlsModule,
    GomButtonComponent,
    BulkGridComponent,
    CreateGroupWizardComponent,
  ],
  templateUrl: './bulk-upload-groups.component.html',
  styleUrl: './bulk-upload-groups.component.scss',
})
export class BulkUploadGroupsComponent implements OnInit {
  @ViewChild(BulkGridComponent) bulkGrid?: BulkGridComponent;
  @ViewChild(CreateGroupWizardComponent) groupWizard?: CreateGroupWizardComponent;

  private static readonly DRAFT_STORAGE_VERSION = 1;
  private static readonly DRAFT_SAVE_DEBOUNCE_MS = 600;

  private readonly groupsService = inject(GroupsService);
  private readonly variantsService = inject(VariantsService);
  private readonly toast = inject(GomAlertToastService);
  private readonly location = inject(Location);
  private readonly authSession = inject(AuthSessionService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly draftSaveState = signal<'idle' | 'saving' | 'saved' | 'error'>('idle');
  readonly lastDraftSavedAt = signal<Date | null>(null);
  readonly recoverableDraft = signal<BulkUploadDraftSnapshot | null>(null);
  readonly categories = signal<Category[]>([]);
  readonly units = signal<Unit[]>([]);
  readonly taxProfiles = signal<TaxProfile[]>([]);
  readonly fields = signal<Field[]>([]);
  readonly fieldGroups = signal<FieldGroup[]>([]);
  readonly groups = signal<Group[]>([]);

  /** Selected field group for this bulk batch — all rows share the same field group. */
  readonly selectedFieldGroupId = signal<string>('');
  readonly fieldGroupControl = new FormControl<string>('', { nonNullable: true });
  readonly defaultCategoryControl = new FormControl<string>('', { nonNullable: true });
  readonly defaultBaseUnitControl = new FormControl<string>('', { nonNullable: true });
  readonly defaultAllowedOtherUnitIds = signal<string[]>([]);
  readonly defaultTaxProfileControl = new FormControl<string>('', { nonNullable: true });

  readonly simpleBaseCostKey = signal<string>('');
  readonly simpleSellingMarginBase = signal<'buy' | 'actual'>('buy');
  readonly simpleMarginPercent = signal<number>(20);
  readonly simpleAnchorPercent = signal<number>(5);
  readonly simpleActualExtraKeys = signal<string[]>([]);
  readonly simpleBaseCostControl = new FormControl<string>('', { nonNullable: true });
  readonly simpleSellingMarginBaseControl = new FormControl<string>('buy', { nonNullable: true });
  readonly simpleMarginPercentControl = new FormControl<string>('20', { nonNullable: true });
  readonly simpleAnchorPercentControl = new FormControl<string>('5', { nonNullable: true });

  readonly bulkRows = signal<BulkGridRow[]>([]);
  readonly bulkValidation = signal<BulkGridValidationState>({ valid: true, errorCount: 0 });
  readonly showValidationErrorsModal = signal(false);
  readonly rowVariants = signal<Record<string, BulkRowVariantDraft[]>>({});
  readonly showVariantEditor = signal(false);
  readonly variantEditorRowIndex = signal<number>(-1);
  readonly variantDrafts = signal<BulkRowVariantDraft[]>([]);

  readonly variantSkuControl = new FormControl<string>('', { nonNullable: true });
  readonly variantQuantityControl = new FormControl<string>('1', { nonNullable: true });
  readonly variantUnitIdControl = new FormControl<string>('', { nonNullable: true });
  readonly variantItemTypeControl = new FormControl<'INDIVIDUAL' | 'PACK'>('INDIVIDUAL', { nonNullable: true });
  readonly variantAdditionalPriceControl = new FormControl<string>('0', { nonNullable: true });
  readonly variantDiscountTypeControl = new FormControl<'PERCENT' | 'AMOUNT'>('PERCENT', { nonNullable: true });
  readonly variantDiscountValueControl = new FormControl<string>('0', { nonNullable: true });

  /** Keys of non-required fields the user has opted to hide from the grid. */
  readonly hiddenFieldKeys = signal<Set<string>>(new Set());
  /** Optional pricing fields selected beyond the chosen field group definition. */
  readonly selectedExtraFieldIds = signal<string[]>([]);

  readonly canCreate = computed(
    () => (this.authSession.hasFeature('group.bulk_create') || this.authSession.hasFeature('group.create'))
      && (this.groupCreateRemaining() ?? Infinity) > 0,
  );
  readonly groupCreateLimit = computed(() =>
    this.authSession.getFeatureConfigNumber('group.bulk_create', 'max_count')
    ?? this.authSession.getFeatureConfigNumber('group.create', 'max_count'),
  );
  readonly groupCreateUsed = computed(() => this.groups().length);
  readonly groupCreateRemaining = computed(() => {
    const limit = this.groupCreateLimit();
    if (limit !== null) {
      return Math.max(limit - this.groupCreateUsed(), 0);
    }

    return null;
  });

  readonly maxRows = computed(() => {
    const remaining = this.groupCreateRemaining();
    if (remaining !== null) {
      return Math.min(remaining, 5000);
    }

    return 5000;
  });

  readonly fieldGroupOptions = computed<GomSelectOption[]>(() =>
    this.fieldGroups()
      .filter((fg) => fg.status === 'ACTIVE')
      .map((fg) => ({ label: fg.name, value: fg._id })),
  );
  readonly categoryOptions = computed<GomSelectOption[]>(() =>
    this.categories()
      .filter((c) => c.status === 'ACTIVE')
      .map((c) => ({ label: c.name, value: c._id })),
  );
  readonly unitOptions = computed<GomSelectOption[]>(() =>
    this.units()
      .filter((u) => u.status === 'ACTIVE')
      .map((u) => ({ label: `${u.name} (${u.symbol})`, value: u._id })),
  );
  readonly taxOptions = computed<GomSelectOption[]>(() => [
    { label: '— None —', value: '' },
    ...this.taxProfiles()
      .filter((t) => t.status === 'ACTIVE')
      .map((t) => ({ label: `${t.name} (${t.rate}%)`, value: t._id })),
  ]);
  readonly visibleFieldGroupFields = computed<BulkSelectableField[]>(() => {
    const hidden = this.hiddenFieldKeys();
    return this.selectedFieldGroupFields().filter((field) => !hidden.has(field.key));
  });
  readonly availableExtraFields = computed<BulkSelectableField[]>(() => {
    const baseFieldIds = new Set(this.selectedFieldGroupFields().map((field) => field.fieldId));
    return this.fields()
      .filter((field) => field.status === 'ACTIVE' && !baseFieldIds.has(field._id))
      .filter((field): field is Field & { type: 'NUMBER' | 'PERCENTAGE' } => (
        field.fieldKind !== 'METADATA' && (field.type === 'NUMBER' || field.type === 'PERCENTAGE')
      ))
      .map((field) => ({
        fieldId: field._id,
        key: field.key,
        name: field.name,
        type: field.type,
        isRequired: false,
        defaultValue: Number.isFinite(Number(field.defaultValue)) ? Number(field.defaultValue) : 0,
      }));
  });
  readonly selectedBulkFields = computed<BulkSelectableField[]>(() => {
    const selectedExtraIds = new Set(this.selectedExtraFieldIds());
    const extras = this.availableExtraFields().filter((field) => selectedExtraIds.has(field.fieldId));
    return [...this.visibleFieldGroupFields(), ...extras];
  });
  readonly simpleBaseCostOptions = computed<GomSelectOption[]>(() =>
    this.selectedBulkFields().map((field) => ({
      label: `${field.name} (${field.key})`,
      value: field.key,
    })),
  );
  readonly simpleActualExtraOptions = computed(() => {
    const base = this.simpleBaseCostKey();
    return this.selectedBulkFields()
      .filter((field) => field.key !== base)
      .map((field) => ({
        key: field.key,
        name: field.name,
      }));
  });
  readonly simpleGeneratedFormulas = computed(() => this.buildSimplePricingFormulas());

  /** Resolved field definitions for columns based on selected field group. */
  readonly selectedFieldGroupFields = computed<BulkSelectableField[]>(() => {
    const fgId = this.selectedFieldGroupId();
    if (fgId) {
      const fg = this.fieldGroups().find((group) => group._id === fgId);
      if (fg) {
        const allFields = this.fields();
        return fg.fields
          .map((item) => {
            const field = allFields.find((candidate) => candidate._id === item.fieldId);
            if (field) {
              // Only include numeric/percentage fields — text fields don't have editable values in the grid
              if (field.type === 'NUMBER' || field.type === 'PERCENTAGE') {
                return {
                  fieldId: field._id,
                  key: field.key,
                  name: field.name,
                  type: field.type,
                  isRequired: item.requiredOverride ?? field.isRequired,
                  defaultValue: Number.isFinite(Number(item.defaultValue ?? field.defaultValue))
                    ? Number(item.defaultValue ?? field.defaultValue)
                    : 0,
                };
              }
            }

            return null;
          })
          .filter((field): field is NonNullable<typeof field> => field !== null);
      }
    }

    return [];
  });

  readonly columns = computed<BulkGridColumn[]>(() => {
    // Dynamic field value columns — exclude fields the user opted out of (non-required only)
    const hidden = this.hiddenFieldKeys();
    const fieldCols = this.selectedBulkFields()
      .filter((f) => !hidden.has(f.key))
      .map((f) => ({
      key: `field_${f.key}`,
      label: f.name,
      type: 'number' as const,
      required: f.isRequired,
      width: '10rem',
      placeholder: f.defaultValue !== null && f.defaultValue !== undefined ? String(f.defaultValue) : '',
      min: 0,
    }));

    const cols: BulkGridColumn[] = [
      { key: 'group_name', label: 'Group Name', type: 'text', required: true, width: '16rem', placeholder: '' },
      { key: 'margin_percent_override', label: 'Margin %', type: 'number', width: '8rem', min: 0, placeholder: String(this.simpleMarginPercent()) },
      ...fieldCols,
      { key: 'variant_count', label: 'Variants', type: 'text', width: '7rem', readonly: true },
      { key: 'price_preview', label: 'Price Preview (A / S / An)', type: 'text', width: '14rem', readonly: true },
      { key: 'description', label: 'Description', type: 'text', width: '18rem', placeholder: 'Premium aged rice', visibility: 'optional' },
      { key: 'category_id', label: 'Category Override', type: 'select', width: '14rem', options: this.categoryOptions(), visibility: 'optional' },
      { key: 'base_unit_id', label: 'Base Unit Override', type: 'select', width: '14rem', options: this.unitOptions(), visibility: 'optional' },
      { key: 'tax_profile_id', label: 'Tax Override', type: 'select', width: '14rem', options: this.taxOptions(), visibility: 'optional' },
    ];

    return cols;
  });

  readonly validRowCount = computed(() =>
    this.bulkRows().filter((row) => this.isRowValid(row)).length,
  );

  readonly errorRowCount = computed(() => this.bulkRows().length - this.validRowCount());

  private draftSaveTimer: ReturnType<typeof setTimeout> | null = null;
  private applyingPreviewRows = false;

  ngOnInit(): void {
    this.loadLookups();
    this.loadRecoverableDraft();

    this.fieldGroupControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        const nextFieldGroupId = String(value || '').trim();
        if (nextFieldGroupId === this.selectedFieldGroupId()) {
          return;
        }

        this.selectedFieldGroupId.set(nextFieldGroupId);
        this.hiddenFieldKeys.set(new Set());
        this.selectedExtraFieldIds.set([]);
        const availableKeys = new Set(this.selectedBulkFields().map((field) => field.key));
        if (!availableKeys.has(this.simpleBaseCostKey())) {
          const fallback = this.selectedBulkFields()[0]?.key || this.selectedFieldGroupFields()[0]?.key || '';
          this.simpleBaseCostKey.set(fallback);
          this.simpleBaseCostControl.setValue(fallback, { emitEvent: false });
        }
        this.simpleActualExtraKeys.update((keys) => keys.filter((key) => availableKeys.has(key) && key !== this.simpleBaseCostKey()));
        this.bulkGrid?.clearRows();
        this.scheduleDraftSave();
      });

    [
      this.defaultCategoryControl,
      this.defaultBaseUnitControl,
      this.defaultTaxProfileControl,
    ].forEach((control) => {
      control.valueChanges
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => {
          this.syncDefaultAllowedUnitsWithBaseUnit();
          this.refreshRowPricePreviews();
          this.scheduleDraftSave();
        });
    });

    this.simpleBaseCostControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => this.onSimpleBaseCostChange(value));

    this.simpleSellingMarginBaseControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => this.onSimpleSellingMarginBaseChange(value));

    this.simpleMarginPercentControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => this.onSimpleMarginPercentChange(value));

    this.simpleAnchorPercentControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => this.onSimpleAnchorPercentChange(value));
  }

  private loadLookups(): void {
    this.loading.set(true);
    this.groupsService.listGroups().subscribe({
      next: (res: ApiPaginated<Group>) => this.groups.set(res.data),
    });
    this.groupsService.listCategories().subscribe({
      next: (res: ApiPaginated<Category>) => this.categories.set(res.data),
    });
    this.groupsService.listUnits().subscribe({
      next: (res: ApiPaginated<Unit>) => this.units.set(res.data),
    });
    this.groupsService.listFields().subscribe({
      next: (res: ApiPaginated<Field>) => this.fields.set(res.data),
    });
    this.groupsService.listFieldGroups().subscribe({
      next: (res: ApiPaginated<FieldGroup>) => {
        this.fieldGroups.set(res.data);
        this.ensureDefaultFieldGroupSelection();
      },
    });
    this.groupsService.listTaxProfiles().subscribe({
      next: (res: ApiPaginated<TaxProfile>) => {
        this.taxProfiles.set(res.data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onBulkRowsChange(rows: BulkGridRow[]): void {
    const rowsWithIds = this.ensureRowIds(rows);
    this.pruneRowVariants(rowsWithIds);

    if (this.applyingPreviewRows) {
      this.applyingPreviewRows = false;
      this.bulkRows.set(rowsWithIds);
      this.scheduleDraftSave();
      return;
    }

    const withPreviews = this.applyPricePreviews(rowsWithIds);
    this.bulkRows.set(withPreviews);

    if (JSON.stringify(withPreviews) !== JSON.stringify(rowsWithIds)) {
      this.applyingPreviewRows = true;
      this.bulkGrid?.replaceRows(withPreviews);
      return;
    }

    this.scheduleDraftSave();
  }

  onBulkValidationChange(state: BulkGridValidationState): void {
    this.bulkValidation.set(state);
  }

  closeVariantEditor(): void {
    this.showVariantEditor.set(false);
    this.variantEditorRowIndex.set(-1);
    this.variantDrafts.set([]);
  }

  addVariantDraft(): void {
    const unitId = String(this.variantUnitIdControl.value || '').trim();
    const sku = String(this.variantSkuControl.value || '').trim();
    const quantity = Number(this.variantQuantityControl.value || 0);
    const additionalPrice = Number(this.variantAdditionalPriceControl.value || 0);
    const discountValue = Number(this.variantDiscountValueControl.value || 0);

    if (!unitId) {
      this.toast.warning('Select a unit for the variant.');
      return;
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      this.toast.warning('Variant quantity should be greater than zero.');
      return;
    }

    if (!sku) {
      this.toast.warning('SKU is required for each variant.');
      return;
    }

    const normalizedSku = sku.toUpperCase();
    if (this.variantDrafts().some((item) => item.sku.toUpperCase() === normalizedSku)) {
      this.toast.warning('Duplicate SKU found in this group variants.');
      return;
    }

    const next: BulkRowVariantDraft = {
      sku,
      quantity,
      unitId,
      itemType: this.variantItemTypeControl.value,
      additionalPrice: Number.isFinite(additionalPrice) ? Math.max(additionalPrice, 0) : 0,
      discountType: this.variantDiscountTypeControl.value,
      discountValue: Number.isFinite(discountValue) ? Math.max(discountValue, 0) : 0,
    };

    const updated = [...this.variantDrafts(), next];
    this.variantDrafts.set(updated);
    this.commitVariantDrafts(updated);
    this.variantSkuControl.setValue('', { emitEvent: false });
    this.variantQuantityControl.setValue('1', { emitEvent: false });
    this.variantAdditionalPriceControl.setValue('0', { emitEvent: false });
    this.variantDiscountValueControl.setValue('0', { emitEvent: false });
  }

  removeVariantDraft(index: number): void {
    const current = this.variantDrafts();
    if (index < 0 || index >= current.length) {
      return;
    }

    const updated = [...current];
    updated.splice(index, 1);
    this.variantDrafts.set(updated);
    this.commitVariantDrafts(updated);
  }

  openVariantEditor(index: number): void {
    const rows = this.bulkRows();
    if (index < 0 || index >= rows.length) {
      return;
    }

    const row = rows[index];
    const rowId = this.getRowId(row);
    const variants = [...(this.rowVariants()[rowId] ?? [])];
    this.variantDrafts.set(variants);
    this.variantEditorRowIndex.set(index);

    const baseUnitId = String(row['base_unit_id'] ?? '').trim() || this.defaultBaseUnitControl.value.trim();
    this.variantUnitIdControl.setValue(baseUnitId || '', { emitEvent: false });
    this.variantItemTypeControl.setValue('INDIVIDUAL', { emitEvent: false });
    this.variantDiscountTypeControl.setValue('PERCENT', { emitEvent: false });
    this.variantDiscountValueControl.setValue('0', { emitEvent: false });
    this.variantAdditionalPriceControl.setValue('0', { emitEvent: false });
    this.variantQuantityControl.setValue('1', { emitEvent: false });

    const suggestedSkuBase = String(row['group_name'] ?? '').trim().replace(/\s+/g, '-').toUpperCase() || 'GROUP';
    this.variantSkuControl.setValue(`${suggestedSkuBase}-${variants.length + 1}`, { emitEvent: false });
    this.showVariantEditor.set(true);
  }

  openGroupDetails(index: number): void {
    const rows = this.bulkRows();
    if (index < 0 || index >= rows.length) {
      return;
    }

    const row = rows[index];
    const generated = this.simpleGeneratedFormulas();

    const fieldValues: Record<string, number> = {};
    this.selectedBulkFields().forEach((field) => {
      const raw = row[`field_${field.key}`];
      const fallback = field.defaultValue;
      const parsed = Number(raw ?? fallback);
      fieldValues[field.key] = Number.isFinite(parsed) ? parsed : 0;
    });

    const context: GroupWizardPrefillContext = {
      name: String(row['group_name'] ?? '').trim(),
      description: String(row['description'] ?? '').trim(),
      categoryId: String(row['category_id'] ?? '').trim() || this.defaultCategoryControl.value.trim(),
      taxProfileId: String(row['tax_profile_id'] ?? '').trim() || this.defaultTaxProfileControl.value.trim(),
      fieldGroupId: this.selectedFieldGroupId(),
      fieldValues,
      formula: {
        actualPrice: String(row['formula_actual_price'] ?? '').trim() || generated.actualPrice,
        sellingPrice: String(row['formula_selling_price'] ?? '').trim() || generated.sellingPrice,
        anchorPrice: String(row['formula_anchor_price'] ?? '').trim() || generated.anchorPrice,
      },
      baseUnitId: String(row['base_unit_id'] ?? '').trim() || this.defaultBaseUnitControl.value.trim(),
      allowedUnitIds: this.resolveAllowedUnitIds(String(row['base_unit_id'] ?? '').trim() || this.defaultBaseUnitControl.value.trim()),
      bulkRowIndex: index,
      simplePricing: {
        baseCostKey: this.simpleBaseCostKey(),
        sellingMarginBase: this.simpleSellingMarginBase(),
        marginPercent: this.simpleMarginPercent(),
        anchorPercent: this.simpleAnchorPercent(),
        actualExtraKeys: this.simpleActualExtraKeys(),
      },
    };

    this.groupWizard?.open(context);
  }

  onWizardGroupSaved(): void {
    this.refreshGroups();
    this.toast.success('Group saved from Add More wizard.');
  }

  onWizardRowUpdated(result: GroupWizardRowResult): void {
    const rows = [...this.bulkRows()];
    if (result.rowIndex < 0 || result.rowIndex >= rows.length) {
      return;
    }

    const existing = rows[result.rowIndex];
    const updated: typeof existing = {
      ...existing,
      group_name: result.name || existing['group_name'],
      description: result.description,
      category_id: result.categoryId || existing['category_id'],
      tax_profile_id: result.taxProfileId || existing['tax_profile_id'],
      base_unit_id: result.baseUnitId || existing['base_unit_id'],
      formula_actual_price: result.formula.actualPrice || existing['formula_actual_price'],
      formula_selling_price: result.formula.sellingPrice || existing['formula_selling_price'],
      formula_anchor_price: result.formula.anchorPrice || existing['formula_anchor_price'],
    };

    // Merge field values back
    Object.entries(result.fieldValues).forEach(([key, val]) => {
      updated[`field_${key}`] = val;
    });

    rows[result.rowIndex] = updated;
    const withPreviews = this.applyPricePreviews(rows);
    this.bulkRows.set(withPreviews);
    this.applyingPreviewRows = true;
    this.bulkGrid?.replaceRows(withPreviews);
    this.toast.success('Row updated.');
    this.scheduleDraftSave();

    // If this was a publish-mode edit, attempt to auto-publish the row
    if (result.mode === 'bulk-row-publish') {
      setTimeout(() => {
        this.publishRow(result.rowIndex);
      }, 300);
    }
  }

  async submitBatch(): Promise<void> {
    if (!this.canCreate()) {
      this.toast.warning('You do not have permission to perform this bulk operation.');
      return;
    }

    const rows = this.bulkRows();
    if (!rows.length) {
      this.toast.warning('No rows to submit.');
      return;
    }

    // Filter out completely empty rows
    const nonEmptyRows = rows.filter((row) => !this.isRowEmpty(row));
    const emptyRowCount = rows.length - nonEmptyRows.length;

    if (!nonEmptyRows.length) {
      this.toast.warning('All rows are empty. Add data to at least one row.');
      return;
    }

    if (emptyRowCount > 0) {
      this.toast.info(`Skipping ${emptyRowCount} empty row${this.pluralSuffix(emptyRowCount)}.`);
    }

    await this.createDraftGroups(nonEmptyRows, false);
  }

  restoreSavedDraft(): void {
    const snapshot = this.recoverableDraft();
    if (!snapshot) {
      return;
    }

    this.selectedFieldGroupId.set(snapshot.fieldGroupId);
    this.fieldGroupControl.setValue(snapshot.fieldGroupId, { emitEvent: false });
    this.defaultCategoryControl.setValue(snapshot.defaults.categoryId || '', { emitEvent: false });
    this.defaultBaseUnitControl.setValue(snapshot.defaults.baseUnitId || '', { emitEvent: false });
    this.defaultAllowedOtherUnitIds.set(Array.isArray(snapshot.defaults.allowedOtherUnitIds) ? snapshot.defaults.allowedOtherUnitIds : []);
    this.defaultTaxProfileControl.setValue(snapshot.defaults.taxProfileId || '', { emitEvent: false });
    this.simpleBaseCostControl.setValue(snapshot.defaults.simpleBaseCostKey || '', { emitEvent: false });
    this.simpleSellingMarginBaseControl.setValue(snapshot.defaults.simpleSellingMarginBase === 'actual' ? 'actual' : 'buy', { emitEvent: false });
    this.simpleMarginPercentControl.setValue(String(Number.isFinite(snapshot.defaults.simpleMarginPercent) ? Math.max(snapshot.defaults.simpleMarginPercent, 0) : 20), { emitEvent: false });
    this.simpleAnchorPercentControl.setValue(String(Number.isFinite(snapshot.defaults.simpleAnchorPercent) ? Math.max(snapshot.defaults.simpleAnchorPercent, 0) : 5), { emitEvent: false });
    this.simpleBaseCostKey.set(snapshot.defaults.simpleBaseCostKey || '');
    this.simpleSellingMarginBase.set(snapshot.defaults.simpleSellingMarginBase === 'actual' ? 'actual' : 'buy');
    this.simpleMarginPercent.set(Number.isFinite(snapshot.defaults.simpleMarginPercent) ? Math.max(snapshot.defaults.simpleMarginPercent, 0) : 20);
    this.simpleAnchorPercent.set(Number.isFinite(snapshot.defaults.simpleAnchorPercent) ? Math.max(snapshot.defaults.simpleAnchorPercent, 0) : 5);
    this.simpleActualExtraKeys.set(Array.isArray(snapshot.defaults.simpleActualExtraKeys) ? snapshot.defaults.simpleActualExtraKeys : []);
    this.selectedExtraFieldIds.set(Array.isArray(snapshot.defaults.selectedExtraFieldIds) ? snapshot.defaults.selectedExtraFieldIds : []);
    this.syncDefaultAllowedUnitsWithBaseUnit();
    const restoredRows = this.ensureRowIds(snapshot.rows.map((row) => ({ ...row })));
    this.bulkRows.set(restoredRows);
    this.rowVariants.set(snapshot.rowVariants ?? {});
    this.bulkValidation.set({ valid: true, errorCount: 0 });
    this.recoverableDraft.set(null);
    this.lastDraftSavedAt.set(new Date(snapshot.lastSavedAt));
    this.draftSaveState.set('saved');

    this.bulkGrid?.clearRows();
    this.applyPricePreviews(restoredRows).forEach((row) => this.bulkGrid?.addRow(row));

    this.scheduleDraftSave();
  }

  discardSavedDraft(): void {
    this.recoverableDraft.set(null);
    localStorage.removeItem(this.getDraftStorageKey());
    this.draftSaveState.set('idle');
    this.lastDraftSavedAt.set(null);
  }

  goBack(): void {
    this.persistDraftNow();
    this.location.back();
  }

  quickAddVariantSuggestion(suggestion: BulkVariantQuickSuggestion): void {
    if (!suggestion?.unitId) {
      return;
    }

    this.variantQuantityControl.setValue(String(suggestion.quantity), { emitEvent: false });
    this.variantUnitIdControl.setValue(suggestion.unitId, { emitEvent: false });

    const rowIndex = this.variantEditorRowIndex();
    const row = this.bulkRows()[rowIndex];
    const suggestedSkuBase = String(row?.['group_name'] ?? '').trim().replace(/\s+/g, '-').toUpperCase() || 'GROUP';
    this.variantSkuControl.setValue(`${suggestedSkuBase}-${suggestion.skuSuffix}`, { emitEvent: false });
  }

  variantEditorRowName(): string {
    const index = this.variantEditorRowIndex();
    const row = this.bulkRows()[index];
    return String(row?.['group_name'] ?? '').trim() || `Row ${index + 1}`;
  }

  variantQuickSuggestions(): BulkVariantQuickSuggestion[] {
    const index = this.variantEditorRowIndex();
    const row = this.bulkRows()[index];
    if (!row) {
      return [];
    }

    const unitIds = this.resolveAllowedUnitIds(String(row['base_unit_id'] ?? '').trim() || this.defaultBaseUnitControl.value.trim());
    const suggestions: BulkVariantQuickSuggestion[] = [];

    unitIds.forEach((unitId) => {
      const unit = this.units().find((item) => item._id === unitId);
      if (!unit) {
        return;
      }

      const symbol = String(unit.symbol || '').trim();
      this.quantitiesForUnitSymbol(symbol).forEach((quantity) => {
        const pretty = `${quantity}`;
        const label = `${pretty}${symbol}`;
        const suffix = `${pretty}${symbol}`.replace(/\s+/g, '').toUpperCase();
        suggestions.push({
          label,
          quantity,
          unitId,
          skuSuffix: suffix,
        });
      });
    });

    return suggestions;
  }

  resolveUnitLabel(unitId: string): string {
    const found = this.units().find((item) => item._id === unitId);
    return found ? `${found.name} (${found.symbol})` : unitId;
  }

  private quantitiesForUnitSymbol(symbol: string): number[] {
    const normalized = String(symbol || '').trim().toLowerCase();

    if (normalized === 'g' || normalized === 'gram' || normalized === 'grams' || normalized === 'gm') {
      return [100, 200, 500];
    }

    if (normalized === 'ml' || normalized === 'millilitre' || normalized === 'milliliter') {
      return [100, 200, 500];
    }

    if (normalized === 'kg' || normalized === 'kilogram' || normalized === 'kilo') {
      return [1, 2, 5];
    }

    if (normalized === 'l' || normalized === 'ltr' || normalized === 'lt' || normalized === 'liter' || normalized === 'litre') {
      return [1, 2, 5];
    }

    return [1, 2, 5];
  }

  private ensureRowIds(rows: BulkGridRow[]): BulkGridRow[] {
    return rows.map((row) => {
      const existing = String(row['__bulk_row_id'] ?? '').trim();
      if (existing) {
        return row;
      }

      return {
        ...row,
        __bulk_row_id: this.generateRowId(),
      };
    });
  }

  private generateRowId(): string {
    return `row_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }

  private getRowId(row: BulkGridRow): string {
    const existing = String(row['__bulk_row_id'] ?? '').trim();
    return existing || this.generateRowId();
  }

  private commitVariantDrafts(variants: BulkRowVariantDraft[]): void {
    const rowIndex = this.variantEditorRowIndex();
    const row = this.bulkRows()[rowIndex];
    if (!row) {
      return;
    }

    const rowId = this.getRowId(row);
    const nextMap = { ...this.rowVariants() };
    nextMap[rowId] = variants.map((item) => ({ ...item }));
    this.rowVariants.set(nextMap);
    this.refreshRowPricePreviews();
    this.scheduleDraftSave();
  }

  private pruneRowVariants(rows: BulkGridRow[]): void {
    const validIds = new Set(rows.map((row) => this.getRowId(row)));
    const current = this.rowVariants();
    const next: Record<string, BulkRowVariantDraft[]> = {};
    Object.keys(current).forEach((id) => {
      if (validIds.has(id)) {
        next[id] = current[id];
      }
    });
    this.rowVariants.set(next);
  }

  private hasPublishableVariants(row: BulkGridRow): boolean {
    const variants = this.rowVariants()[this.getRowId(row)] ?? [];
    if (!variants.length) {
      return false;
    }

    const seen = new Set<string>();
    for (const variant of variants) {
      const sku = String(variant.sku || '').trim().toUpperCase();
      if (!sku) {
        return false;
      }
      if (seen.has(sku)) {
        return false;
      }
      seen.add(sku);
    }

    return true;
  }

  private isRowEmpty(row: BulkGridRow): boolean {
    // Check if row has NO data - all fields are empty/whitespace/undefined
    const keyFields = [
      'group_name',
      'category_id',
      'base_unit_id',
      'description',
      'buy_price',
      'formula_actual_price',
      'formula_selling_price',
      'formula_anchor_price',
    ];

    for (const field of keyFields) {
      const value = String(row[field] ?? '').trim();
      if (value) {
        return false; // Found at least one non-empty field
      }
    }

    // Also check custom field group fields
    for (const field of this.selectedBulkFields()) {
      const value = String(row[`field_${field.key}`] ?? '').trim();
      if (value) {
        return false;
      }
    }

    return true; // No data found, row is empty
  }

  private isRowValid(row: BulkGridRow): boolean {
    const resolvedCategory = String(row['category_id'] ?? '').trim() || this.defaultCategoryControl.value.trim();
    const resolvedUnit = String(row['base_unit_id'] ?? '').trim() || this.defaultBaseUnitControl.value.trim();

    return (
      String(row['group_name'] ?? '').trim().length > 0 &&
      resolvedCategory.length > 0 &&
      resolvedUnit.length > 0
    );
  }

  private isRowPublishReady(row: BulkGridRow): boolean {
    if (!this.isRowValid(row)) {
      return false;
    }

    if (!this.hasPublishableVariants(row)) {
      return false;
    }

    const hasRequiredFields = this.selectedFieldGroupFields()
      .filter((field) => field.isRequired)
      .every((field) => {
        const raw = row[`field_${field.key}`];
        const fallback = field.defaultValue;
        const parsed = Number(raw ?? fallback);
        return Number.isFinite(parsed);
      });

    if (!hasRequiredFields) {
      return false;
    }

    const actual = Number(row['actual_price']);
    const selling = Number(row['selling_price']);
    const anchor = Number(row['anchor_price']);

    return Number.isFinite(actual) && Number.isFinite(selling) && Number.isFinite(anchor) && actual > 0 && selling > 0 && anchor > 0;
  }

  private async createDraftGroups(validRows: BulkGridRow[], activate: boolean): Promise<void> {
    const selectedFieldGroupId = this.selectedFieldGroupId().trim();
    if (!selectedFieldGroupId) {
      this.toast.warning('Field group is required for create-mode draft upload.');
      return;
    }

    const createEntries = validRows
      .map((row) => {
        const payload = this.buildCreateDraftPayload(row, selectedFieldGroupId, activate ? 'ACTIVE' : 'INACTIVE');
        return payload ? { row, payload } : null;
      })
      .filter((entry): entry is { row: BulkGridRow; payload: GroupPayload } => entry !== null);
    const payloadDropCount = Math.max(validRows.length - createEntries.length, 0);

    if (!createEntries.length) {
      this.toast.warning('No rows can be uploaded as draft. Ensure Group Name, Category, Base Unit, and required field values are set.');
      return;
    }

    this.saving.set(true);

    const createdIds: string[] = [];
    let failCount = payloadDropCount;

    for (const entry of createEntries) {
      try {
        const created = await firstValueFrom(this.groupsService.createGroup(entry.payload));
        await this.createVariantsForRow(created.data?._id, entry.row);
        createdIds.push('created');
      } catch {
        failCount += 1;
      }
    }

    if (createdIds.length) {
      this.toast.success(
        activate
          ? `Published ${createdIds.length} group${this.pluralSuffix(createdIds.length)} as Active.`
          : `Submitted ${createdIds.length} group draft${this.pluralSuffix(createdIds.length)}. You can publish them later.`,
      );
      this.bulkGrid?.clearRows();
      this.bulkRows.set([]);
      this.rowVariants.set({});
      this.bulkValidation.set({ valid: true, errorCount: 0 });
      this.refreshGroups();
    }

    if (failCount) {
      this.toast.warning(`${failCount} row${this.pluralSuffix(failCount)} failed to save as draft. Fix data and retry.`);
    }

    this.persistDraftNow();
    this.saving.set(false);
  }

  private buildCreateDraftPayload(row: BulkGridRow, fieldGroupId: string, status: 'ACTIVE' | 'INACTIVE'): GroupPayload | null {
    const name = String(row['group_name'] ?? '').trim();
    const categoryId = String(row['category_id'] ?? '').trim() || this.defaultCategoryControl.value.trim();
    const baseUnitId = String(row['base_unit_id'] ?? '').trim() || this.defaultBaseUnitControl.value.trim();
    const taxProfileId = String(row['tax_profile_id'] ?? '').trim() || this.defaultTaxProfileControl.value.trim();
    const description = String(row['description'] ?? '').trim();
    const generatedFormulas = this.simpleGeneratedFormulas();
    const rowMargin = this.resolveRowMarginPercent(row);
      const effectiveFormulas = rowMargin === this.simpleMarginPercent()
        ? generatedFormulas
        : this.buildSimplePricingFormulasForMargin(rowMargin);
    const actualFormula = String(row['formula_actual_price'] ?? '').trim() || effectiveFormulas.actualPrice;
    const sellingFormula = String(row['formula_selling_price'] ?? '').trim() || effectiveFormulas.sellingPrice;
    const anchorFormula = String(row['formula_anchor_price'] ?? '').trim() || effectiveFormulas.anchorPrice;
    if (!name || !categoryId || !baseUnitId || !actualFormula || !sellingFormula || !anchorFormula) {
      return null;
    }

    const customFields = this.selectedBulkFields().map((field) => {
      const raw = row[`field_${field.key}`];
      const fallback = field.defaultValue;
      const resolved = raw ?? fallback;
      const parsed = Number(resolved);

      if (!Number.isFinite(parsed)) {
        return null;
      }

      return {
        fieldId: field.fieldId,
        value: parsed,
      };
    });

    if (customFields.includes(null)) {
      return null;
    }

    return {
      name,
      description,
      categoryId,
      quantity: 1,
      fieldGroupId,
      customFields: customFields.filter((item): item is { fieldId: string; value: number } => item !== null),
      excludedFieldKeys: [...this.hiddenFieldKeys()],
      formula: {
        sellingPrice: sellingFormula,
        anchorPrice: anchorFormula,
        actualPrice: actualFormula,
      },
      baseUnitId,
      allowedUnitIds: this.resolveAllowedUnitIds(baseUnitId),
      taxProfileId: taxProfileId || null,
      status,
    };
  }

  async publishRow(rowIndex: number): Promise<void> {
    const rows = this.bulkRows();
    if (rowIndex < 0 || rowIndex >= rows.length) {
      this.toast.warning('Invalid row index.');
      return;
    }

    const row = rows[rowIndex];
    if (!this.hasPublishableVariants(row)) {
      this.toast.warning('Add at least one variant with unique SKU before publish.');
      this.openVariantEditor(rowIndex);
      return;
    }

    if (this.isRowPublishReady(row)) {
      await this.publishRowDirectly(row, rowIndex);
    } else {
      this.openRowDetailsForPublish(rowIndex);
    }
  }

  private async publishRowDirectly(row: BulkGridRow, rowIndex: number): Promise<void> {
    const selectedFieldGroupId = this.selectedFieldGroupId().trim();
    if (!selectedFieldGroupId) {
      this.toast.warning('Field group is required to publish.');
      return;
    }

    const payload = this.buildCreateDraftPayload(row, selectedFieldGroupId, 'ACTIVE');
    if (!payload) {
      this.toast.warning('Cannot create payload from row data.');
      return;
    }

    this.saving.set(true);
    try {
      const created = await firstValueFrom(this.groupsService.createGroup(payload));
      await this.createVariantsForRow(created.data?._id, row);
      this.toast.success('Group published successfully.');
      const updated = [...this.bulkRows()];
      const removedRow = updated[rowIndex];
      updated.splice(rowIndex, 1);
      this.bulkRows.set(updated);
      const removedRowId = removedRow ? this.getRowId(removedRow) : '';
      if (removedRowId) {
        const nextVariants = { ...this.rowVariants() };
        delete nextVariants[removedRowId];
        this.rowVariants.set(nextVariants);
      }
      this.bulkGrid?.replaceRows(updated);
      this.refreshGroups();
    } catch (err) {
      this.toast.error('Failed to publish group.');
    } finally {
      this.saving.set(false);
    }
  }

  private async createVariantsForRow(groupId: string | undefined, row: BulkGridRow): Promise<void> {
    const normalizedGroupId = String(groupId || '').trim();
    if (!normalizedGroupId) {
      return;
    }

    const variants = this.rowVariants()[this.getRowId(row)] ?? [];
    if (!variants.length) {
      return;
    }

    await firstValueFrom(this.variantsService.createVariants({
      groupId: normalizedGroupId,
      variants: variants.map((variant) => {
        const payloadVariant: {
          itemType: 'INDIVIDUAL' | 'PACK';
          quantity: number;
          unitId: string;
          additionalPrice?: number;
          pricingMode?: 'FORMULA' | 'OVERRIDE';
          discountType?: 'PERCENT' | 'AMOUNT';
          discountValue?: number;
          reason?: string;
        } = {
          itemType: variant.itemType,
          quantity: variant.quantity,
          unitId: variant.unitId,
          additionalPrice: variant.additionalPrice,
          pricingMode: variant.discountValue > 0 ? 'OVERRIDE' : 'FORMULA',
        };

        if (variant.discountValue > 0) {
          payloadVariant.discountType = variant.discountType;
          payloadVariant.discountValue = variant.discountValue;
          payloadVariant.reason = `SKU:${variant.sku}`;
        }

        return payloadVariant;
      }),
    }));
  }

  private openRowDetailsForPublish(rowIndex: number): void {
    const row = this.bulkRows()[rowIndex];
    if (!row) {
      return;
    }

    const categoryId = String(row['category_id'] ?? '').trim() || this.defaultCategoryControl.value.trim();
    const baseUnitId = String(row['base_unit_id'] ?? '').trim() || this.defaultBaseUnitControl.value.trim();
    const context: GroupWizardPrefillContext = {
      bulkRowIndex: rowIndex,
      mode: 'bulk-row-publish',
      name: String(row['group_name'] ?? '').trim(),
      description: String(row['description'] ?? '').trim(),
      categoryId: categoryId,
      baseUnitId: baseUnitId,
      fieldGroupId: this.selectedFieldGroupId(),
      taxProfileId: String(row['tax_profile_id'] ?? '').trim() || this.defaultTaxProfileControl.value.trim(),
      fieldValues: {},
      formula: {
        actualPrice: String(row['formula_actual_price'] ?? '').trim(),
        sellingPrice: String(row['formula_selling_price'] ?? '').trim(),
        anchorPrice: String(row['formula_anchor_price'] ?? '').trim(),
      },
      simplePricing: {
        baseCostKey: this.simpleBaseCostKey(),
        sellingMarginBase: this.simpleSellingMarginBase(),
        marginPercent: this.simpleMarginPercent(),
        anchorPercent: this.simpleAnchorPercent(),
        actualExtraKeys: this.simpleActualExtraKeys(),
      },
      allowedUnitIds: this.defaultAllowedOtherUnitIds(),
    };

    this.selectedBulkFields().forEach((field) => {
      const raw = row[`field_${field.key}`];
      if (raw !== undefined && raw !== null) {
        const parsed = Number(raw);
        if (Number.isFinite(parsed)) {
          context.fieldValues![field.key] = parsed;
        }
      }
    });

    this.groupWizard?.open(context);
  }

  private refreshGroups(): void {
    this.groupsService.listGroups().subscribe({
      next: (res: ApiPaginated<Group>) => this.groups.set(res.data),
    });
  }

  private loadRecoverableDraft(): void {
    try {
      const raw = localStorage.getItem(this.getDraftStorageKey());
      if (!raw) {
        return;
      }

      const parsed = JSON.parse(raw) as BulkUploadDraftSnapshot;
      if (parsed.version !== BulkUploadGroupsComponent.DRAFT_STORAGE_VERSION) {
        return;
      }

      if (!this.hasSnapshotContent(parsed)) {
        return;
      }

      this.recoverableDraft.set({
        version: BulkUploadGroupsComponent.DRAFT_STORAGE_VERSION,
        fieldGroupId: String(parsed.fieldGroupId || ''),
        defaults: {
          categoryId: String(parsed.defaults?.categoryId || ''),
          baseUnitId: String(parsed.defaults?.baseUnitId || ''),
          allowedOtherUnitIds: Array.isArray(parsed.defaults?.allowedOtherUnitIds)
            ? parsed.defaults.allowedOtherUnitIds
              .filter((item: unknown): item is string => typeof item === 'string')
              .map((item) => item.trim())
              .filter(Boolean)
            : [],
          taxProfileId: String(parsed.defaults?.taxProfileId || ''),
          simpleBaseCostKey: String(parsed.defaults?.simpleBaseCostKey || ''),
          simpleSellingMarginBase: parsed.defaults?.simpleSellingMarginBase === 'actual' ? 'actual' : 'buy',
          simpleMarginPercent: Number(parsed.defaults?.simpleMarginPercent ?? 20),
          simpleAnchorPercent: Number(parsed.defaults?.simpleAnchorPercent ?? 5),
          simpleActualExtraKeys: Array.isArray(parsed.defaults?.simpleActualExtraKeys)
            ? parsed.defaults.simpleActualExtraKeys
              .filter((item: unknown): item is string => typeof item === 'string')
              .map((item) => item.trim())
              .filter(Boolean)
            : [],
          selectedExtraFieldIds: Array.isArray(parsed.defaults?.selectedExtraFieldIds)
            ? parsed.defaults.selectedExtraFieldIds
              .filter((item: unknown): item is string => typeof item === 'string')
              .map((item) => item.trim())
              .filter(Boolean)
            : [],
        },
        rows: (parsed.rows || []).map((row) => ({ ...row })),
        rowVariants: typeof parsed.rowVariants === 'object' && parsed.rowVariants ? parsed.rowVariants : {},
        lastSavedAt: parsed.lastSavedAt,
      });
    } catch {
      this.recoverableDraft.set(null);
    }
  }

  private scheduleDraftSave(): void {
    if (this.draftSaveTimer) {
      clearTimeout(this.draftSaveTimer);
    }

    this.draftSaveState.set('saving');
    this.draftSaveTimer = setTimeout(() => {
      this.persistDraftNow();
    }, BulkUploadGroupsComponent.DRAFT_SAVE_DEBOUNCE_MS);
  }

  private persistDraftNow(): void {
    try {
      const rows = this.bulkRows();
      if (!this.hasDraftContent(rows)) {
        localStorage.removeItem(this.getDraftStorageKey());
        this.lastDraftSavedAt.set(null);
        this.draftSaveState.set('idle');
        return;
      }

      const snapshot: BulkUploadDraftSnapshot = {
        version: BulkUploadGroupsComponent.DRAFT_STORAGE_VERSION,
        fieldGroupId: this.selectedFieldGroupId(),
        defaults: {
          categoryId: this.defaultCategoryControl.value,
          baseUnitId: this.defaultBaseUnitControl.value,
          allowedOtherUnitIds: this.defaultAllowedOtherUnitIds(),
          taxProfileId: this.defaultTaxProfileControl.value,
          simpleBaseCostKey: this.simpleBaseCostKey(),
          simpleSellingMarginBase: this.simpleSellingMarginBase(),
          simpleMarginPercent: this.simpleMarginPercent(),
          simpleAnchorPercent: this.simpleAnchorPercent(),
          simpleActualExtraKeys: this.simpleActualExtraKeys(),
          selectedExtraFieldIds: this.selectedExtraFieldIds(),
        },
        rows: rows.map((row) => ({ ...row })),
        rowVariants: this.rowVariants(),
        lastSavedAt: new Date().toISOString(),
      };

      localStorage.setItem(this.getDraftStorageKey(), JSON.stringify(snapshot));
      this.lastDraftSavedAt.set(new Date(snapshot.lastSavedAt));
      this.draftSaveState.set('saved');
    } catch {
      this.draftSaveState.set('error');
    }
  }

  private hasDraftContent(rows: BulkGridRow[]): boolean {
    const hasRows = Array.isArray(rows) && rows.length > 0;
    const hasFieldGroup = this.selectedFieldGroupId().trim().length > 0;
    const hasCommonDefaults =
      this.defaultCategoryControl.value.trim().length > 0
      || this.defaultBaseUnitControl.value.trim().length > 0
      || this.defaultTaxProfileControl.value.trim().length > 0
      || this.defaultAllowedOtherUnitIds().length > 0
      || this.simpleBaseCostKey().trim().length > 0
      || this.simpleSellingMarginBase() !== 'buy'
      || this.simpleMarginPercent() !== 20
      || this.simpleAnchorPercent() !== 5
      || this.simpleActualExtraKeys().length > 0
      || this.selectedExtraFieldIds().length > 0;

    const hasVariantDrafts = Object.keys(this.rowVariants()).length > 0;

    return hasRows || hasFieldGroup || hasCommonDefaults || hasVariantDrafts;
  }

  private hasSnapshotContent(snapshot: BulkUploadDraftSnapshot): boolean {
    const hasRows = Array.isArray(snapshot.rows) && snapshot.rows.length > 0;
    const hasFieldGroup = String(snapshot.fieldGroupId || '').trim().length > 0;
    const hasCommonDefaults =
      String(snapshot.defaults?.categoryId || '').trim().length > 0
      || String(snapshot.defaults?.baseUnitId || '').trim().length > 0
      || String(snapshot.defaults?.taxProfileId || '').trim().length > 0
      || (Array.isArray(snapshot.defaults?.allowedOtherUnitIds) && snapshot.defaults.allowedOtherUnitIds.length > 0)
      || String(snapshot.defaults?.simpleBaseCostKey || '').trim().length > 0
      || snapshot.defaults?.simpleSellingMarginBase === 'actual'
      || Number(snapshot.defaults?.simpleMarginPercent ?? 20) !== 20
      || Number(snapshot.defaults?.simpleAnchorPercent ?? 5) !== 5
      || (Array.isArray(snapshot.defaults?.simpleActualExtraKeys) && snapshot.defaults.simpleActualExtraKeys.length > 0)
      || (Array.isArray(snapshot.defaults?.selectedExtraFieldIds) && snapshot.defaults.selectedExtraFieldIds.length > 0);

    const hasVariantDrafts = !!snapshot.rowVariants && Object.keys(snapshot.rowVariants).length > 0;

    return hasRows || hasFieldGroup || hasCommonDefaults || hasVariantDrafts;
  }

  private getDraftStorageKey(): string {
    const session = this.authSession.session();
    const actor = session?.actorType || 'tenant';
    const tenantId = session?.tenantId || 'default';
    const userId = session?.userId || 'anonymous';

    return `gom.bulk-upload.groups.draft.${actor}.${tenantId}.${userId}`;
  }

  private pluralSuffix(count: number): string {
    return count === 1 ? '' : 's';
  }

  private ensureDefaultFieldGroupSelection(): void {
    if (this.selectedFieldGroupId() || this.fieldGroupControl.value) {
      return;
    }

    const firstActive = this.fieldGroups().find((group) => group.status === 'ACTIVE');
    if (!firstActive) {
      return;
    }

    this.fieldGroupControl.setValue(firstActive._id);
  }

  isFieldVisible(key: string): boolean {
    return !this.hiddenFieldKeys().has(key);
  }

  toggleFieldVisibility(key: string, checked: boolean): void {
    const current = new Set(this.hiddenFieldKeys());
    if (checked) {
      current.delete(key);
    } else {
      current.add(key);
    }
    this.hiddenFieldKeys.set(current);

    const visibleKeys = new Set(this.selectedBulkFields().map((field) => field.key));
    if (!visibleKeys.has(this.simpleBaseCostKey())) {
      const fallback = this.selectedBulkFields()[0]?.key || this.selectedFieldGroupFields()[0]?.key || '';
      this.simpleBaseCostKey.set(fallback);
      this.simpleBaseCostControl.setValue(fallback, { emitEvent: false });
    }
    this.simpleActualExtraKeys.update((keys) => keys.filter((extraKey) => visibleKeys.has(extraKey) && extraKey !== this.simpleBaseCostKey()));
    this.refreshRowPricePreviews();
    this.scheduleDraftSave();
  }

  isExtraFieldSelected(fieldId: string): boolean {
    return this.selectedExtraFieldIds().includes(fieldId);
  }

  toggleExtraField(fieldId: string, checked: boolean): void {
    const normalized = String(fieldId || '').trim();
    if (!normalized) {
      return;
    }

    const selected = new Set(this.selectedExtraFieldIds());
    if (checked) {
      selected.add(normalized);
    } else {
      selected.delete(normalized);
    }
    this.selectedExtraFieldIds.set([...selected]);

    const visibleKeys = new Set(this.selectedBulkFields().map((field) => field.key));
    if (!visibleKeys.has(this.simpleBaseCostKey())) {
      const fallback = this.selectedBulkFields()[0]?.key || this.selectedFieldGroupFields()[0]?.key || '';
      this.simpleBaseCostKey.set(fallback);
      this.simpleBaseCostControl.setValue(fallback, { emitEvent: false });
    }
    this.simpleActualExtraKeys.update((keys) => keys.filter((extraKey) => visibleKeys.has(extraKey) && extraKey !== this.simpleBaseCostKey()));

    this.refreshRowPricePreviews();
    this.scheduleDraftSave();
  }

  toggleDefaultAllowedOtherUnit(unitId: string, checked: boolean): void {
    const normalized = String(unitId || '').trim();
    const baseUnitId = String(this.defaultBaseUnitControl.value || '').trim();
    if (!normalized || normalized === baseUnitId) {
      return;
    }

    const current = new Set(this.defaultAllowedOtherUnitIds());
    if (checked) {
      current.add(normalized);
    } else {
      current.delete(normalized);
    }

    this.defaultAllowedOtherUnitIds.set([...current]);
    this.scheduleDraftSave();
  }

  isDefaultAllowedOtherUnitSelected(unitId: string): boolean {
    return this.defaultAllowedOtherUnitIds().includes(String(unitId || '').trim());
  }

  private syncDefaultAllowedUnitsWithBaseUnit(): void {
    const baseUnitId = String(this.defaultBaseUnitControl.value || '').trim();
    const validIds = new Set(this.unitOptions().map((option) => String(option.value || '').trim()));
    const next = this.defaultAllowedOtherUnitIds().filter((id) => id !== baseUnitId && validIds.has(id));

    if (next.length !== this.defaultAllowedOtherUnitIds().length) {
      this.defaultAllowedOtherUnitIds.set(next);
    }
  }

  private resolveAllowedUnitIds(baseUnitId: string): string[] {
    const normalizedBase = String(baseUnitId || '').trim();
    const next = new Set<string>();

    if (normalizedBase) {
      next.add(normalizedBase);
    }

    this.defaultAllowedOtherUnitIds().forEach((id) => {
      const normalized = String(id || '').trim();
      if (normalized && normalized !== normalizedBase) {
        next.add(normalized);
      }
    });

    return [...next];
  }

  private refreshRowPricePreviews(): void {
    const rows = this.bulkRows();
    if (!rows.length) {
      return;
    }

    const withPreviews = this.applyPricePreviews(rows);
    this.bulkRows.set(withPreviews);
    this.applyingPreviewRows = true;
    this.bulkGrid?.replaceRows(withPreviews);
  }

  private resolveRowMarginPercent(row: BulkGridRow): number {
    const raw = row['margin_percent_override'];
    if (raw !== null && raw !== undefined && raw !== '') {
      const parsed = Number(raw);
      if (Number.isFinite(parsed) && parsed >= 0) {
        return parsed;
      }
    }

    return this.simpleMarginPercent();
  }

  private applyPricePreviews(rows: BulkGridRow[]): BulkGridRow[] {
    const generated = this.simpleGeneratedFormulas();

    return rows.map((row) => {
      const rowMargin = this.resolveRowMarginPercent(row);
      const rowFormulas = rowMargin === this.simpleMarginPercent()
        ? generated
        : this.buildSimplePricingFormulasForMargin(rowMargin);

      const formulas = {
        actual: String(row['formula_actual_price'] ?? '').trim() || rowFormulas.actualPrice,
        selling: String(row['formula_selling_price'] ?? '').trim() || rowFormulas.sellingPrice,
        anchor: String(row['formula_anchor_price'] ?? '').trim() || rowFormulas.anchorPrice,
      };

      const context = this.buildFormulaContext(row);
      const actual = this.evaluateFormula(formulas.actual, context);
      const selling = this.evaluateFormula(formulas.selling, {
        ...context,
        actualPrice: actual,
        actual_price: actual,
      });
      const anchor = this.evaluateFormula(formulas.anchor, {
        ...context,
        actualPrice: actual,
        actual_price: actual,
        sellingPrice: selling,
        selling_price: selling,
      });

      return {
        ...row,
        actual_price: actual,
        selling_price: selling,
        anchor_price: anchor,
        variant_count: String((this.rowVariants()[this.getRowId(row)] ?? []).length),
        price_preview: `A ${actual} | S ${selling} | An ${anchor}`,
      };
    });
  }

  private buildFormulaContext(row: BulkGridRow): Record<string, number> {
    const context: Record<string, number> = {
      actualPrice: Number(row['actual_price'] ?? 0) || 0,
      sellingPrice: Number(row['selling_price'] ?? 0) || 0,
      anchorPrice: Number(row['anchor_price'] ?? 0) || 0,
    };

    this.selectedBulkFields().forEach((field) => {
      const raw = row[`field_${field.key}`];
      const fallback = field.defaultValue;
      const resolved = raw ?? fallback;
      const parsed = Number(resolved);
      if (Number.isFinite(parsed)) {
        context[field.key] = parsed;
      }
    });

    return context;
  }

  private evaluateFormula(expression: string, context: Record<string, number>): number {
    const formula = String(expression || '').trim();
    if (!formula) {
      return 0;
    }

    const isSafe = /^[a-zA-Z0-9_+\-*/().%\s]+$/.test(formula);
    if (!isSafe) {
      return 0;
    }

    try {
      const keys = Object.keys(context);
      const values = keys.map((key) => Number(context[key]) || 0);
      const normalizedFormula = formula.replace(/(\d+(?:\.\d+)?)\s*%/g, '($1/100)');
      const evaluator = new Function(...keys, `return (${normalizedFormula});`) as (...args: number[]) => number;
      const output = evaluator(...values);
      const numeric = Number(output);
      if (!Number.isFinite(numeric)) {
        return 0;
      }

      return Math.round(numeric * 100) / 100;
    } catch {
      return 0;
    }
  }

  onSimpleBaseCostChange(value: string): void {
    const normalized = String(value || '').trim();
    this.simpleBaseCostKey.set(normalized);
    this.simpleActualExtraKeys.update((keys) => keys.filter((key) => key !== normalized));
    this.refreshRowPricePreviews();
    this.scheduleDraftSave();
  }

  onSimpleMarginPercentChange(value: string): void {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed >= 0) {
      this.simpleMarginPercent.set(parsed);
      this.refreshRowPricePreviews();
      this.scheduleDraftSave();
    }
  }

  onSimpleAnchorPercentChange(value: string): void {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed >= 0) {
      this.simpleAnchorPercent.set(parsed);
      this.refreshRowPricePreviews();
      this.scheduleDraftSave();
    }
  }

  onSimpleSellingMarginBaseChange(value: string): void {
    const normalized = String(value || '').trim().toLowerCase();
    this.simpleSellingMarginBase.set(normalized === 'actual' ? 'actual' : 'buy');
    this.refreshRowPricePreviews();
    this.scheduleDraftSave();
  }

  toggleSimpleActualExtraKey(fieldKey: string, checked: boolean): void {
    const normalized = String(fieldKey || '').trim();
    if (!normalized || normalized === this.simpleBaseCostKey()) {
      return;
    }
    const current = new Set(this.simpleActualExtraKeys());
    if (checked) {
      current.add(normalized);
    } else {
      current.delete(normalized);
    }
    this.simpleActualExtraKeys.set([...current]);
    this.refreshRowPricePreviews();
    this.scheduleDraftSave();
  }

  isSimpleActualExtraSelected(fieldKey: string): boolean {
    return this.simpleActualExtraKeys().includes(String(fieldKey || '').trim());
  }

  toggleAllSimpleActualExtraKeys(selectAll: boolean): void {
    if (selectAll) {
      const allKeys = this.simpleActualExtraOptions()
        .map((field) => field.key)
        .filter((key) => key !== this.simpleBaseCostKey());
      this.simpleActualExtraKeys.set(allKeys);
    } else {
      this.simpleActualExtraKeys.set([]);
    }
    this.refreshRowPricePreviews();
    this.scheduleDraftSave();
  }

  isAllSimpleActualExtraSelected(): boolean {
    const options = this.simpleActualExtraOptions();
    if (options.length === 0) return false;
    return options.every((field) => this.isSimpleActualExtraSelected(field.key));
  }

  private buildSimplePricingFormulas(): { actualPrice: string; sellingPrice: string; anchorPrice: string } {
    return this.buildSimplePricingFormulasForMargin(this.simpleMarginPercent());
  }

  private buildSimplePricingFormulasForMargin(marginPercent: number): { actualPrice: string; sellingPrice: string; anchorPrice: string } {
    const base = String(this.simpleBaseCostKey() || '').trim();
    const numberTokenFallback = this.selectedFieldGroupFields().find((field) => field.type === 'NUMBER')?.key || 'buyPrice';
    const baseToken = base || numberTokenFallback;
    const extras = this.simpleActualExtraKeys().filter((key) => key && key !== baseToken);

    const actualParts = [baseToken, ...extras];
    const actualFormula = actualParts.join(' + ');

    const margin = Math.max(0, Number(marginPercent) || 0);
    const anchorPercent = Math.max(0, Number(this.simpleAnchorPercent()) || 0);
    const marginBaseToken = 'actualPrice';
    const sellingFormula = `actualPrice + (${marginBaseToken} * ${margin}%)`;
    const anchorMultiplier = (1 + (anchorPercent / 100)).toFixed(4).replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
    const anchorFormula = anchorPercent > 0 ? `sellingPrice * ${anchorMultiplier}` : 'sellingPrice';

    return {
      actualPrice: actualFormula,
      sellingPrice: sellingFormula,
      anchorPrice: anchorFormula,
    };
  }
}
