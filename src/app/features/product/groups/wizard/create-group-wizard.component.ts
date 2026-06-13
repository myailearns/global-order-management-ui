import { CommonModule } from '@angular/common';
import { Component, computed, DestroyRef, inject, OnInit, Output, EventEmitter, signal, ViewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
  GomAlertToastService,
  GomButtonComponent,
  GomButtonContentMode,
  GomModalComponent,
  GomSelectOption,
  GomTabContentComponent,
  GomTabsComponent,
  TabItem,
  getButtonContentMode,
  showButtonIcon,
  showButtonText,
} from '@gomlibs/ui';
import { AuthSessionService } from '../../../../core/auth/auth-session.service';
import { MediaAssetService } from '../../../saas-platform/media/media-asset.service';
import { GroupImage, GroupImageEntry } from '../../../saas-platform/media/media-asset.model';
import { ImagePickerComponent, PickedImage } from '../../../../shared/components/image-picker/image-picker.component';
import { RichTextEditorComponent } from '../../../../shared/components/rich-text-editor/rich-text-editor.component';
import {
  Category,
  Field,
  FieldGroup,
  Group,
  GroupPayload,
  GroupsService,
  Unit,
  TaxProfile,
} from '../groups.service';

export interface GroupWizardRowResult {
  rowIndex: number;
  name: string;
  description: string;
  categoryId: string;
  taxProfileId: string;
  fieldGroupId: string;
  fieldValues: Record<string, number>;
  formula: {
    actualPrice: string;
    sellingPrice: string;
    anchorPrice: string;
  };
  baseUnitId: string;
  allowedUnitIds: string[];
  mode?: 'bulk-row' | 'bulk-row-publish';
}

export interface GroupWizardPrefillContext {
  name: string;
  description: string;
  categoryId: string;
  taxProfileId: string;
  fieldGroupId: string;
  fieldValues: Record<string, number>;
  formula: {
    actualPrice: string;
    sellingPrice: string;
    anchorPrice: string;
  };
  baseUnitId: string;
  allowedUnitIds?: string[];
  /** When set, wizard runs in bulk-row mode: no API call, emits rowUpdated */
  bulkRowIndex?: number;
  /** Mode for bulk-row operations: 'bulk-row' for Add More, 'bulk-row-publish' for Publish action */
  mode?: 'bulk-row' | 'bulk-row-publish';
  simplePricing?: {
    baseCostKey: string;
    sellingMarginBase: SellingMarginBase;
    marginPercent: number;
    anchorPercent: number;
    actualExtraKeys: string[];
  };
}

interface GroupWizardField {
  fieldId: string;
  key: string;
  name: string;
  type: 'NUMBER' | 'PERCENTAGE';
  isRequired: boolean;
  defaultValue: number;
  valueFormat?: 'NUMBER' | 'CURRENCY';
  currencyCode?: 'INR' | null;
}

type FormulaTarget = 'sellingPrice' | 'anchorPrice' | 'actualPrice';
type SellingMarginBase = 'actual' | 'buy';

@Component({
  selector: 'app-create-group-wizard',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormControlsModule,
    GomButtonComponent,
    GomTabsComponent,
    GomTabContentComponent,
    GomModalComponent,
    ImagePickerComponent,
    RichTextEditorComponent,
  ],
  templateUrl: './create-group-wizard.component.html',
  styleUrl: './create-group-wizard.component.scss',
})
export class CreateGroupWizardComponent implements OnInit {
  @ViewChild('descEditor') descEditor?: RichTextEditorComponent;

  @Output() groupSaved = new EventEmitter<void>();
  @Output() rowUpdated = new EventEmitter<GroupWizardRowResult>();

  /** Set when opened from bulk-upload (no API call on save) */
  readonly bulkRowIndex = signal<number | null>(null);
  readonly bulkRowMode = signal<'bulk-row' | 'bulk-row-publish' | null>(null);

  private readonly groupsService = inject(GroupsService);
  private readonly mediaService = inject(MediaAssetService);
  private readonly toast = inject(GomAlertToastService);
  private readonly fb = inject(FormBuilder);
  private readonly authSession = inject(AuthSessionService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly groupFieldToggleControls = new Map<string, FormControl<boolean>>();

  // --- Data signals ---
  readonly categories = signal<Category[]>([]);
  readonly fields = signal<Field[]>([]);
  readonly fieldGroups = signal<FieldGroup[]>([]);
  readonly units = signal<Unit[]>([]);
  readonly taxProfiles = signal<TaxProfile[]>([]);
  readonly dataLoading = signal(false);
  readonly dataLoaded = signal(false);

  // --- Wizard state ---
  readonly wizardOpen = signal(false);
  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly currentStep = signal(1);
  readonly editingGroupId = signal<string | null>(null);
  readonly editingQuantity = signal(1);
  readonly selectedFieldGroupIds = signal<string[]>([]);
  readonly hiddenGroupFieldKeys = signal<Set<string>>(new Set());
  readonly selectedExtraFieldIds = signal<string[]>([]);
  readonly formulaTarget = signal<FormulaTarget>('sellingPrice');
  readonly showAdvancedFormulaTools = signal(false);
  readonly simpleBaseCostKey = signal<string>('');
  readonly simpleMarginPercent = signal<number>(20);
  readonly simpleAnchorPercent = signal<number>(5);
  readonly simpleSellingMarginBase = signal<SellingMarginBase>('buy');
  readonly simpleActualExtraKeys = signal<string[]>([]);
  readonly simpleBaseCostControl = new FormControl<string>('', { nonNullable: true });
  readonly simpleSellingMarginBaseControl = new FormControl<string>('buy', { nonNullable: true });
  readonly simpleMarginPercentControl = new FormControl<string>('20', { nonNullable: true });
  readonly simpleAnchorPercentControl = new FormControl<string>('5', { nonNullable: true });
  readonly allowedUnitIds = signal<string[]>([]);

  readonly submitMode: GomButtonContentMode = getButtonContentMode('primary-action');
  readonly cancelMode: GomButtonContentMode = getButtonContentMode('dismiss');
  readonly secondaryMode: GomButtonContentMode = getButtonContentMode('secondary-action');

  // --- Forms ---
  readonly basicForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    description: [''],
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
    actualPrice: ['', [Validators.required]],
  });

  readonly unitsForm = this.fb.group({
    baseUnitId: ['', [Validators.required]],
  });

  // --- Images ---
  readonly DEFAULT_MAX_IMAGES = 10;
  readonly DEFAULT_MAX_VIDEOS = 1;
  readonly groupImages = signal<GroupImage[]>([]);
  readonly pickerOpen = signal(false);
  readonly canUploadOwn = computed(() => {
    const session = this.authSession.session();
    if (session?.actorType !== 'tenant') return false;
    const keys = new Set(
      (session.featureKeys ?? []).map((k: string) => String(k || '').trim().toLowerCase()).filter(Boolean),
    );
    return keys.has('media.upload');
  });
  readonly imageCount = computed(() => this.groupImages().length);
  readonly videoCount = computed(() => this.groupImages().filter((img) => img.mediaAssetId.mediaType === 'VIDEO').length);
  readonly hasVideo = computed(() => this.videoCount() > 0);
  readonly existingImageIds = computed(() => new Set(this.groupImages().map((img) => img.mediaAssetId._id)));
  readonly previewCaptionTrack = 'data:text/vtt;charset=utf-8,WEBVTT%0A';
  readonly groupImageLimit = computed(() => this.authSession.getFeatureConfigNumber('group.create', 'max_images') ?? this.DEFAULT_MAX_IMAGES);
  readonly groupVideoLimit = computed(() => this.authSession.getFeatureConfigNumber('group.create', 'max_videos') ?? this.DEFAULT_MAX_VIDEOS);

  // --- Computed options ---
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
      .map((item) => {
        const taxLabel = item.taxMode === 'GST' ? `${item.rate}% GST` : 'No Tax';
        return { label: `${item.name} (${taxLabel})`, value: item._id };
      })
  );

  readonly selectedFieldGroups = computed<FieldGroup[]>(() => {
    const selectedIds = this.selectedFieldGroupIds();
    if (!selectedIds.length) return [];
    const byId = new Map(this.fieldGroups().map((item) => [item._id, item]));
    return selectedIds.map((id) => byId.get(id) || null).filter((item): item is FieldGroup => !!item);
  });

  readonly groupFields = computed<GroupWizardField[]>(() => {
    const selectedGroups = this.selectedFieldGroups();
    if (!selectedGroups.length) return [];
    const byId = new Map(this.fields().map((item) => [item._id, item]));
    const merged = new Map<string, GroupWizardField>();
    for (const selected of selectedGroups) {
      for (const item of [...selected.fields].sort((a, b) => a.order - b.order)) {
        const field = byId.get(item.fieldId);
        if (!field || !this.isPricingField(field) || merged.has(field._id)) continue;
        let resolvedDefaultValue = 0;
        if (typeof field.defaultValue === 'number') resolvedDefaultValue = field.defaultValue;
        if (typeof item.defaultValue === 'number') resolvedDefaultValue = item.defaultValue;
        merged.set(field._id, {
          fieldId: field._id,
          key: field.key,
          name: field.name,
          type: field.type,
          isRequired: typeof item.requiredOverride === 'boolean' ? item.requiredOverride : field.isRequired,
          defaultValue: resolvedDefaultValue,
          valueFormat: field.valueFormat ?? 'NUMBER',
          currencyCode: field.currencyCode ?? null,
        });
      }
    }
    return [...merged.values()];
  });

  readonly visibleGroupFields = computed<GroupWizardField[]>(() => {
    const hidden = this.hiddenGroupFieldKeys();
    return this.groupFields().filter((item) => !hidden.has(item.key));
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
        valueFormat: item.valueFormat ?? 'NUMBER',
        currencyCode: item.currencyCode ?? null,
      }));
  });

  readonly wizardFields = computed<GroupWizardField[]>(() => {
    const extras = new Set(this.selectedExtraFieldIds());
    const extraFields = this.availableExtraFields().filter((item) => extras.has(item.fieldId));
    return [...this.visibleGroupFields(), ...extraFields];
  });

  readonly formulaTokenFields = computed<string[]>(() => this.wizardFields().map((field) => field.key));
  readonly simpleBaseCostOptions = computed<GomSelectOption[]>(() =>
    this.wizardFields()
      .filter((field) => field.type === 'NUMBER')
      .map((field) => ({ value: field.key, label: `${field.name} (${field.key})` }))
  );
  readonly simpleActualExtraOptions = computed<GroupWizardField[]>(() => {
    const base = this.simpleBaseCostKey();
    return this.wizardFields().filter((field) => field.type === 'NUMBER' && field.key !== base);
  });
  readonly simpleGeneratedFormulas = computed(() => this.buildSimplePricingFormulas());

  readonly wizardTabs = computed<TabItem[]>(() => [
    { id: 1, label: '1. Basic Info' },
    { id: 2, label: '2. Field Group' },
    { id: 3, label: '3. Field Values' },
    { id: 4, label: '4. Pricing Formula' },
    { id: 5, label: '5. Units' },
    { id: 6, label: '6. Images/Videos' },
  ]);

  // Deferred prefill context for after data load
  private pendingPrefill: GroupWizardPrefillContext | null = null;
  private pendingEditGroup: Group | null = null;

  ngOnInit(): void {
    this.loadData();

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

  private loadData(): void {
    if (this.dataLoaded()) return;
    this.dataLoading.set(true);
    forkJoin({
      categories: this.groupsService.listCategories(),
      fields: this.groupsService.listFields(),
      fieldGroups: this.groupsService.listFieldGroups(),
      units: this.groupsService.listUnits(),
      taxProfiles: this.groupsService.listTaxProfiles(),
    }).subscribe({
      next: (result) => {
        this.categories.set(result.categories.data ?? []);
        this.fields.set(result.fields.data ?? []);
        this.fieldGroups.set(result.fieldGroups.data ?? []);
        this.units.set(result.units.data ?? []);
        this.taxProfiles.set(result.taxProfiles.data ?? []);
        this.dataLoading.set(false);
        this.dataLoaded.set(true);
        if (this.pendingPrefill) {
          const ctx = this.pendingPrefill;
          this.pendingPrefill = null;
          this.applyPrefill(ctx);
        } else if (this.pendingEditGroup) {
          const group = this.pendingEditGroup;
          this.pendingEditGroup = null;
          this.applyEdit(group);
        }
      },
      error: () => {
        this.dataLoading.set(false);
        this.toast.error('Failed to load wizard data. Please try again.');
      },
    });
  }

  /** Open wizard in create mode, optionally with prefilled context (from bulk upload) */
  open(prefill?: GroupWizardPrefillContext): void {
    this.resetWizard();
    if (!prefill) {
      this.wizardOpen.set(true);
      return;
    }
    const bulkIdx = typeof prefill.bulkRowIndex === 'number' ? prefill.bulkRowIndex : null;
    this.bulkRowIndex.set(bulkIdx);
    this.bulkRowMode.set(prefill.mode || null);
    if (this.dataLoaded()) {
      this.applyPrefill(prefill);
    } else {
      this.pendingPrefill = prefill;
      this.loadData();
    }
  }

  /** Open wizard in edit mode for an existing group */
  openEdit(group: Group): void {
    this.resetWizard();
    if (this.dataLoaded()) {
      this.applyEdit(group);
    } else {
      this.pendingEditGroup = group;
      this.loadData();
    }
  }

  private applyPrefill(context: GroupWizardPrefillContext): void {
    const categoryId = String(context.categoryId || '').trim();
    const taxProfileId = String(context.taxProfileId || '').trim();
    const fieldGroupId = String(context.fieldGroupId || '').trim();
    const baseUnitId = String(context.baseUnitId || '').trim();

    this.basicForm.patchValue({
      name: String(context.name || '').trim(),
      description: String(context.description || ''),
      categoryId,
      taxProfileId,
    });

    if (categoryId) this.onCategoryChange(categoryId);

    if (fieldGroupId) {
      this.selectedFieldGroupIds.set([fieldGroupId]);
      this.hiddenGroupFieldKeys.set(new Set());
      this.selectionForm.patchValue({ fieldGroupId });

      const selectedGroup = this.fieldGroups().find((item) => item._id === fieldGroupId);
      if (selectedGroup) {
        const selectedKeys = new Set(Object.keys(context.fieldValues || {}));
        const byId = new Map(this.fields().map((item) => [item._id, item]));
        const hidden = new Set<string>();
        for (const fieldRef of selectedGroup.fields) {
          const resolved = byId.get(fieldRef.fieldId);
          if (!resolved || !this.isPricingField(resolved)) {
            continue;
          }
          const isRequired = typeof fieldRef.requiredOverride === 'boolean' ? fieldRef.requiredOverride : resolved.isRequired;
          if (!isRequired && !selectedKeys.has(resolved.key)) {
            hidden.add(resolved.key);
          }
        }
        this.hiddenGroupFieldKeys.set(hidden);
      }

      this.syncDynamicFields();
    }

    Object.entries(context.fieldValues || {}).forEach(([key, value]) => {
      const control = this.valuesForm.get(key) as FormControl<number | null> | null;
      if (control) {
        const parsed = Number(value);
        control.setValue(Number.isFinite(parsed) ? parsed : null);
      }
    });

    this.formulaForm.patchValue({
      sellingPrice: String(context.formula?.sellingPrice || '').trim(),
      anchorPrice: String(context.formula?.anchorPrice || '').trim(),
      actualPrice: String(context.formula?.actualPrice || '').trim(),
    });

    const simple = context.simplePricing;
    if (simple) {
      const marginPercent = Number.isFinite(simple.marginPercent) ? Math.max(simple.marginPercent, 0) : 20;
      const anchorPercent = Number.isFinite(simple.anchorPercent) ? Math.max(simple.anchorPercent, 0) : 5;
      const baseCostKey = String(simple.baseCostKey || '').trim();
      const marginBase: SellingMarginBase = simple.sellingMarginBase === 'actual' ? 'actual' : 'buy';

      this.simpleBaseCostKey.set(baseCostKey);
      this.simpleSellingMarginBase.set(marginBase);
      this.simpleMarginPercent.set(marginPercent);
      this.simpleAnchorPercent.set(anchorPercent);
      this.simpleActualExtraKeys.set(Array.isArray(simple.actualExtraKeys) ? simple.actualExtraKeys : []);

      this.simpleBaseCostControl.setValue(baseCostKey, { emitEvent: false });
      this.simpleSellingMarginBaseControl.setValue(marginBase, { emitEvent: false });
      this.simpleMarginPercentControl.setValue(String(marginPercent), { emitEvent: false });
      this.simpleAnchorPercentControl.setValue(String(anchorPercent), { emitEvent: false });
    }

    this.unitsForm.patchValue({ baseUnitId });
    const prefilledAllowedUnits = Array.isArray(context.allowedUnitIds)
      ? context.allowedUnitIds
        .map((item) => String(item || '').trim())
        .filter(Boolean)
      : [];
    const allowedSet = new Set(prefilledAllowedUnits);
    if (baseUnitId) {
      allowedSet.add(baseUnitId);
    }
    this.allowedUnitIds.set([...allowedSet]);

    this.currentStep.set(1);
    this.wizardOpen.set(true);
    setTimeout(() => this.descEditor?.setContent(String(context.description || '')), 0);
  }

  private applyEdit(existing: Group): void {
    this.editingGroupId.set(existing._id);

    this.basicForm.patchValue({
      name: existing.name,
      description: existing.description || '',
      categoryId: existing.categoryId,
      taxProfileId: existing.taxProfileId || '',
    });
    this.editingQuantity.set(existing.quantity || 1);

    this.selectedFieldGroupIds.set([existing.fieldGroupId]);
    this.selectionForm.patchValue({ fieldGroupId: existing.fieldGroupId });

    const selectedGroup = this.fieldGroups().find((item) => item._id === existing.fieldGroupId);
    const baseIds = new Set((selectedGroup?.fields ?? []).map((item) => item.fieldId));
    this.hiddenGroupFieldKeys.set(new Set(existing.excludedFieldKeys ?? []));

    const extraIds = existing.resolvedFields
      .filter((item) => !baseIds.has(item.fieldId))
      .map((item) => item.fieldId);

    this.selectedExtraFieldIds.set(extraIds);
    this.syncDynamicFields(existing);

    this.formulaForm.patchValue({
      sellingPrice: existing.formula.sellingPrice,
      anchorPrice: existing.formula.anchorPrice,
      actualPrice: existing.formula.actualPrice || existing.formula.sellingPrice,
    });

    this.unitsForm.patchValue({ baseUnitId: existing.baseUnitId });
    this.allowedUnitIds.set([...existing.allowedUnitIds]);

    this.currentStep.set(1);
    this.wizardOpen.set(true);
    this.loadGroupImages(existing._id);
    setTimeout(() => this.descEditor?.setContent(existing.description || ''), 0);
  }

  closeWizard(): void {
    this.wizardOpen.set(false);
  }

  onDescriptionChanged(html: string): void {
    this.basicForm.controls.description.setValue(html);
  }

  onFieldGroupSelectionChange(ids: string[]): void {
    const cleaned = [...new Set(ids.map((id) => String(id || '').trim()).filter((id) => !!id))];
    this.selectedFieldGroupIds.set(cleaned);
    this.hiddenGroupFieldKeys.set(new Set());
    this.selectionForm.patchValue({ fieldGroupId: cleaned[0] || '' });
    this.selectedExtraFieldIds.set([]);
    this.syncDynamicFields();
  }

  onCategoryChange(categoryId: string): void {
    const selectedFieldGroupId = this.selectionForm.controls.fieldGroupId.value || '';
    const allowedFieldGroups = this.getFieldGroupsForCategory(categoryId).filter((item) => item.status === 'ACTIVE');
    const allowedFieldGroupIds = new Set(allowedFieldGroups.map((item) => item._id));

    const filteredSelectedIds = this.selectedFieldGroupIds().filter((id) => allowedFieldGroupIds.has(id));
    if (filteredSelectedIds.length !== this.selectedFieldGroupIds().length) {
      this.selectedFieldGroupIds.set(filteredSelectedIds);
      this.hiddenGroupFieldKeys.set(new Set());
      this.selectionForm.patchValue({ fieldGroupId: filteredSelectedIds[0] || '' });
      this.selectedExtraFieldIds.set([]);
      this.syncDynamicFields();
    }

    if (selectedFieldGroupId && !allowedFieldGroups.some((item) => item._id === selectedFieldGroupId)) {
      this.selectionForm.patchValue({ fieldGroupId: '' });
      this.selectedFieldGroupIds.set([]);
      this.hiddenGroupFieldKeys.set(new Set());
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
    if (checked) current.add(fieldId); else current.delete(fieldId);
    this.selectedExtraFieldIds.set([...current]);
    this.syncDynamicFields();
  }

  isGroupFieldSelected(fieldKey: string): boolean {
    return !this.hiddenGroupFieldKeys().has(String(fieldKey || '').trim());
  }

  toggleGroupFieldSelection(fieldKey: string, checked: boolean): void {
    const normalized = String(fieldKey || '').trim();
    if (!normalized) {
      return;
    }

    const field = this.groupFields().find((item) => item.key === normalized);
    if (!field || field.isRequired) {
      return;
    }

    const hidden = new Set(this.hiddenGroupFieldKeys());
    if (checked) {
      hidden.delete(normalized);
    } else {
      hidden.add(normalized);
    }
    this.hiddenGroupFieldKeys.set(hidden);

    const visibleNumericKeys = new Set(
      this.visibleGroupFields()
        .filter((item) => item.type === 'NUMBER')
        .map((item) => item.key)
    );

    if (!visibleNumericKeys.has(this.simpleBaseCostKey())) {
      const fallback = this.visibleGroupFields().find((item) => item.type === 'NUMBER')?.key || '';
      this.simpleBaseCostKey.set(fallback);
      this.simpleBaseCostControl.setValue(fallback, { emitEvent: false });
    }

    this.simpleActualExtraKeys.update((keys) =>
      keys.filter((key) => visibleNumericKeys.has(key) && key !== this.simpleBaseCostKey())
    );

    this.syncDynamicFields();
    const control = this.groupFieldToggleControls.get(normalized);
    if (control && control.value !== checked) {
      control.setValue(checked, { emitEvent: false });
    }
  }

  getGroupFieldToggleControl(field: GroupWizardField): FormControl<boolean> {
    const key = String(field.key || '').trim();
    let control = this.groupFieldToggleControls.get(key);
    if (!control) {
      control = new FormControl<boolean>(this.isGroupFieldSelected(key), { nonNullable: true });
      this.groupFieldToggleControls.set(key, control);
    }

    const shouldBeChecked = this.isGroupFieldSelected(key);
    if (control.value !== shouldBeChecked) {
      control.setValue(shouldBeChecked, { emitEvent: false });
    }

    if (field.isRequired) {
      control.disable({ emitEvent: false });
    } else {
      control.enable({ emitEvent: false });
    }

    return control;
  }

  toggleAllowedUnit(unitId: string, checked: boolean): void {
    const current = new Set(this.allowedUnitIds());
    if (checked) current.add(unitId); else current.delete(unitId);
    this.allowedUnitIds.set([...current]);
  }

  onBaseUnitChange(unitId: string): void {
    const current = new Set(this.allowedUnitIds());
    if (unitId) current.add(unitId);
    this.allowedUnitIds.set([...current]);
  }

  isAllowedUnitSelected(unitId: string): boolean {
    return this.allowedUnitIds().includes(unitId);
  }

  getValueControl(key: string): FormControl<number | null> {
    return this.valuesForm.get(key) as FormControl<number | null>;
  }

  getFieldHint(field: GroupWizardField): string {
    if (field.type === 'PERCENTAGE') {
      const numberFields = this.wizardFields().filter((item) => item.type === 'NUMBER' && item.key !== field.key);
      if (!numberFields.length) {
        return 'Enter percentage value (without % sign).';
      }

      const percentage = Number(this.getValueControl(field.key).value);
      if (!Number.isFinite(percentage)) {
        return 'Enter percentage value (without % sign).';
      }

      const preferredBase = numberFields.find((item) => ['buyPrice', 'buy_price', 'basePrice', 'costPrice'].includes(item.key));
      const baseField = preferredBase || numberFields[0];
      const baseValue = Number(this.getValueControl(baseField.key).value);
      if (!Number.isFinite(baseValue)) {
        return 'Enter percentage value (without % sign).';
      }

      return `Enter percentage value (without % sign). Example amount = ${((baseValue * percentage) / 100).toFixed(2)}`;
    }

    return field.valueFormat === 'CURRENCY'
      ? 'Amount in ₹ (INR). Example: 49.99'
      : 'Enter numeric value.';
  }

  getFieldPlaceholder(field: GroupWizardField): string {
    if (field.type === 'PERCENTAGE') {
      return `Enter ${field.name} (%)`;
    }

    if (field.valueFormat === 'CURRENCY') {
      return `Enter ${field.name} (₹)`;
    }

    return `Enter ${field.name}`;
  }

  formulaPreview(): { sellingPrice: number | null; anchorPrice: number | null; actualPrice: number | null; error: string | null } {
    return this.calculateFormulaPreview();
  }

  getSellingFormulaHint(): string {
    const preview = this.formulaPreview();
    return preview.error || preview.sellingPrice === null ? '' : `Calculated selling price: ${preview.sellingPrice}`;
  }

  getAnchorFormulaHint(): string {
    const preview = this.formulaPreview();
    return preview.error || preview.anchorPrice === null ? '' : `Calculated anchor price: ${preview.anchorPrice}`;
  }

  getActualFormulaHint(): string {
    const preview = this.formulaPreview();
    return preview.error || preview.actualPrice === null ? '' : `Calculated actual price: ${preview.actualPrice}`;
  }

  setFormulaTarget(target: FormulaTarget): void {
    this.formulaTarget.set(target);
  }

  insertToken(token: string): void {
    this.insertTokenFor(this.formulaTarget(), token);
  }

  insertTokenFor(target: FormulaTarget, token: string): void {
    const control = this.formulaForm.controls[target];
    const current = control.value || '';
    control.setValue(current.trim().length ? `${current} ${token}` : token);
    control.markAsDirty();
    control.markAsTouched();
    this.formulaTarget.set(target);
  }

  clearFormula(target: FormulaTarget): void {
    const control = this.formulaForm.controls[target];
    control.setValue('');
    control.markAsDirty();
    control.markAsTouched();
    this.formulaTarget.set(target);
  }

  toggleAdvancedFormulaTools(): void {
    this.showAdvancedFormulaTools.update((v) => !v);
  }

  onSimpleBaseCostChange(value: string): void {
    const normalized = String(value || '').trim();
    this.simpleBaseCostKey.set(normalized);
    this.simpleActualExtraKeys.update((keys) => keys.filter((key) => key !== normalized));
    this.autoApplySimplePricingBuilder();
  }

  onSimpleMarginPercentChange(value: string): void {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed >= 0) {
      this.simpleMarginPercent.set(parsed);
      this.autoApplySimplePricingBuilder();
    }
  }

  onSimpleAnchorPercentChange(value: string): void {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed >= 0) {
      this.simpleAnchorPercent.set(parsed);
      this.autoApplySimplePricingBuilder();
    }
  }

  onSimpleSellingMarginBaseChange(value: string): void {
    const normalized = String(value || '').trim().toLowerCase();
    this.simpleSellingMarginBase.set(normalized === 'actual' ? 'actual' : 'buy');
    this.autoApplySimplePricingBuilder();
  }

  toggleSimpleActualExtraKey(fieldKey: string, checked: boolean): void {
    const normalized = String(fieldKey || '').trim();
    if (!normalized || normalized === this.simpleBaseCostKey()) return;
    const current = new Set(this.simpleActualExtraKeys());
    if (checked) current.add(normalized); else current.delete(normalized);
    this.simpleActualExtraKeys.set([...current]);
    this.autoApplySimplePricingBuilder();
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
    this.autoApplySimplePricingBuilder();
  }

  isAllSimpleActualExtraSelected(): boolean {
    const options = this.simpleActualExtraOptions();
    if (options.length === 0) return false;
    return options.every((field) => this.isSimpleActualExtraSelected(field.key));
  }

  nextStep(): void {
    const step = this.currentStep();
    if (!this.isStepValid(step)) {
      this.touchStep(step);
      return;
    }
    if (step < 6) this.currentStep.set(step + 1);
  }

  previousStep(): void {
    const step = this.currentStep();
    if (step > 1) this.currentStep.set(step - 1);
  }

  selectStep(stepId: string | number): void {
    const step = typeof stepId === 'number' ? stepId : Number.parseInt(String(stepId), 10);
    const currentStep = this.currentStep();
    if (step < currentStep) {
      this.currentStep.set(step);
      return;
    }
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

  saveGroup(): void {
    if (![1, 2, 3, 4, 5].every((step) => this.isStepValid(step))) {
      this.touchStep(this.currentStep());
      this.errorMessage.set('Please complete all required fields before saving the group.');
      return;
    }

    // --- Bulk-row mode: just emit updated row data back, no API call ---
    const bulkIdx = this.bulkRowIndex();
    if (bulkIdx !== null) {
      const values = this.valuesForm.getRawValue() as Record<string, number | null>;
      const fieldValues: Record<string, number> = {};
      this.wizardFields().forEach((field) => {
        const v = Number(values[field.key]);
        if (Number.isFinite(v)) fieldValues[field.key] = v;
      });
      const baseUnitId = String(this.unitsForm.controls.baseUnitId.value || '').trim();
      const allowed = new Set(this.allowedUnitIds());
      if (baseUnitId) allowed.add(baseUnitId);
      const result: GroupWizardRowResult = {
        rowIndex: bulkIdx,
        name: String(this.basicForm.controls.name.value || '').trim(),
        description: this.basicForm.controls.description.value || '',
        categoryId: String(this.basicForm.controls.categoryId.value || '').trim(),
        taxProfileId: String(this.basicForm.controls.taxProfileId.value || '').trim(),
        fieldGroupId: String(this.selectionForm.controls.fieldGroupId.value || '').trim(),
        fieldValues,
        formula: {
          actualPrice: String(this.formulaForm.controls.actualPrice.value || '').trim(),
          sellingPrice: String(this.formulaForm.controls.sellingPrice.value || '').trim(),
          anchorPrice: String(this.formulaForm.controls.anchorPrice.value || '').trim(),
        },
        baseUnitId,
        allowedUnitIds: [...allowed],
        mode: this.bulkRowMode() || undefined,
      };
      this.rowUpdated.emit(result);
      this.closeWizard();
      return;
    }

    const payload = this.buildPayload();
    if (!payload) return;

    this.saving.set(true);
    this.errorMessage.set(null);

    const editId = this.editingGroupId();
    const request = editId
      ? this.groupsService.updateGroup(editId, payload)
      : this.groupsService.createGroup(payload);

    request.subscribe({
      next: (result) => {
        const pendingImages = this.groupImages();
        const newGroupId = !editId && result?.data?._id ? result.data._id : null;

        if (newGroupId && pendingImages.length > 0) {
          const entries: GroupImageEntry[] = pendingImages.map((img, i) => ({
            mediaAssetId: img.mediaAssetId._id,
            source: img.source,
            sortOrder: i,
          }));
          this.mediaService.attachGroupImages(newGroupId, entries).subscribe({
            next: () => { this.saving.set(false); this.closeWizard(); this.groupSaved.emit(); },
            error: () => {
              this.toast.error('Group saved but failed to attach media.');
              this.saving.set(false);
              this.closeWizard();
              this.groupSaved.emit();
            },
          });
        } else {
          this.saving.set(false);
          this.closeWizard();
          this.groupSaved.emit();
        }
      },
      error: (error) => {
        console.error('Failed to save group', error);
        const apiMessage = error?.error?.message || error?.message || 'Failed to save group. Please check formulas and required fields.';
        this.errorMessage.set(String(apiMessage));
        this.saving.set(false);
      },
    });
  }

  // --- Image Methods ---
  openPicker(): void {
    this.pickerOpen.set(true);
  }

  onImagesSelected(picked: PickedImage[]): void {
    const imageLimit = this.groupImageLimit();
    const remainingImageSlots = Math.max(imageLimit - this.imageCount(), 0);
    if (remainingImageSlots <= 0) {
      this.toast.error(`Only ${imageLimit} media items are allowed per group.`);
      return;
    }

    const videoLimit = this.groupVideoLimit();
    const selectedVideos = picked.filter((p) => p.asset.mediaType === 'VIDEO').length;
    const remainingVideoSlots = Math.max(videoLimit - this.videoCount(), 0);
    if (selectedVideos > remainingVideoSlots) {
      this.toast.error(`Only ${videoLimit} video${videoLimit === 1 ? '' : 's'} are allowed per group.`);
      return;
    }

    const editId = this.editingGroupId();
    if (!editId) {
      const current = this.groupImages();
      const existingIds = new Set(current.map((img) => img.mediaAssetId._id));
      const newImages: GroupImage[] = picked
        .filter((p) => !existingIds.has(p.asset._id))
        .map((p, i) => ({ mediaAssetId: p.asset, source: p.source, sortOrder: current.length + i }));
      const next = [...current, ...newImages].slice(0, imageLimit);
      this.groupImages.set(next);
      if (next.length < current.length + newImages.length) {
        this.toast.error(`Only ${imageLimit} media items are allowed per group.`);
      }
      return;
    }

    const entries: GroupImageEntry[] = picked.map((p, i) => ({
      mediaAssetId: p.asset._id,
      source: p.source,
      sortOrder: this.groupImages().length + i,
    }));

    this.mediaService.attachGroupImages(editId, entries).subscribe({
      next: () => { this.toast.success('Media attached.'); this.loadGroupImages(editId); },
      error: (err: unknown) => {
        const message = (err as { error?: { message?: string } })?.error?.message || 'Failed to attach media.';
        this.toast.error(message);
      },
    });
  }

  removeImage(image: GroupImage): void {
    const editId = this.editingGroupId();
    if (!editId) {
      this.groupImages.set(this.groupImages().filter((img) => img.mediaAssetId._id !== image.mediaAssetId._id));
      return;
    }
    this.mediaService.detachGroupImages(editId, [image.mediaAssetId._id]).subscribe({
      next: () => { this.toast.success('Media removed.'); this.loadGroupImages(editId); },
      error: () => this.toast.error('Failed to remove media.'),
    });
  }

  loadGroupImages(groupId: string): void {
    this.mediaService.getGroupImages(groupId).subscribe({
      next: (images: GroupImage[]) => this.groupImages.set(images || []),
      error: () => this.groupImages.set([]),
    });
  }

  private isStepValid(step: number): boolean {
    if (step === 1) return this.basicForm.valid;
    if (step === 2) return this.selectionForm.valid;
    if (step === 3) return this.valuesForm.valid && this.wizardFields().length > 0;
    if (step === 4) { const preview = this.formulaPreview(); return this.formulaForm.valid && !preview.error; }
    if (step === 5) return this.unitsForm.valid && this.allowedUnitIds().length > 0;
    if (step === 6) return true;
    return false;
  }

  private touchStep(step: number): void {
    if (step === 1) { this.basicForm.markAllAsTouched(); return; }
    if (step === 2) { this.selectionForm.markAllAsTouched(); return; }
    if (step === 3) { this.valuesForm.markAllAsTouched(); return; }
    if (step === 4) { this.formulaForm.markAllAsTouched(); return; }
    if (step === 5) { this.unitsForm.markAllAsTouched(); }
  }

  private syncDynamicFields(existing?: Group): void {
    const nextGroup = new FormRecord<FormControl<number | null>>({});
    const currentValues = this.valuesForm.getRawValue() as Record<string, number | null>;
    const resolvedByKey = new Map((existing?.resolvedFields || []).map((item) => [item.key, item.value]));
    for (const field of this.wizardFields()) {
      const currentValue = Object.prototype.hasOwnProperty.call(currentValues, field.key)
        ? currentValues[field.key]
        : null;
      const initialValue = resolvedByKey.has(field.key)
        ? resolvedByKey.get(field.key)
        : currentValue;
      const parsed = Number(initialValue);
      const normalizedValue = Number.isFinite(parsed) ? parsed : field.defaultValue;
      nextGroup.addControl(field.key, new FormControl<number | null>(normalizedValue, field.isRequired ? [Validators.required] : []));
    }
    this.replaceValuesForm(nextGroup);
    this.tryAutofillFormulas();
  }

  private replaceValuesForm(nextForm: FormRecord<FormControl<number | null>>): void {
    Object.keys(this.valuesForm.controls).forEach((key) => this.valuesForm.removeControl(key));
    Object.entries(nextForm.controls).forEach(([key, control]) => this.valuesForm.addControl(key, control));
  }

  private resetWizard(): void {
    this.currentStep.set(1);
    this.editingGroupId.set(null);
    this.bulkRowIndex.set(null);
    this.editingQuantity.set(1);
    this.selectedFieldGroupIds.set([]);
    this.hiddenGroupFieldKeys.set(new Set());
    this.selectedExtraFieldIds.set([]);
    this.allowedUnitIds.set([]);
    this.formulaTarget.set('sellingPrice');
    this.showAdvancedFormulaTools.set(false);
    this.simpleBaseCostKey.set('');
    this.simpleMarginPercent.set(20);
    this.simpleAnchorPercent.set(5);
    this.simpleSellingMarginBase.set('buy');
    this.simpleActualExtraKeys.set([]);
    this.groupFieldToggleControls.clear();
    this.simpleBaseCostControl.setValue('', { emitEvent: false });
    this.simpleSellingMarginBaseControl.setValue('buy', { emitEvent: false });
    this.simpleMarginPercentControl.setValue('20', { emitEvent: false });
    this.simpleAnchorPercentControl.setValue('5', { emitEvent: false });
    this.errorMessage.set(null);
    this.basicForm.reset({ name: '', description: '', categoryId: '', taxProfileId: '' });
    this.descEditor?.clear();
    this.selectionForm.reset({ fieldGroupId: '' });
    this.formulaForm.reset({ sellingPrice: '', anchorPrice: '', actualPrice: '' });
    this.unitsForm.reset({ baseUnitId: '' });
    this.replaceValuesForm(new FormRecord<FormControl<number | null>>({}));
    this.groupImages.set([]);
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
    if (baseUnitId) allowedUnitIds.add(baseUnitId);
    const taxProfileId = String(this.basicForm.controls.taxProfileId.value || '').trim();

    return {
      name: String(this.basicForm.controls.name.value || '').trim(),
      description: this.basicForm.controls.description.value || '',
      categoryId: String(this.basicForm.controls.categoryId.value || ''),
      quantity,
      fieldGroupId: String(this.selectionForm.controls.fieldGroupId.value || ''),
      customFields,
        excludedFieldKeys: [...this.hiddenGroupFieldKeys()],
      formula: {
        sellingPrice: String(this.formulaForm.controls.sellingPrice.value || '').trim(),
        anchorPrice: String(this.formulaForm.controls.anchorPrice.value || '').trim(),
        actualPrice: String(this.formulaForm.controls.actualPrice.value || '').trim(),
      },
      baseUnitId,
      allowedUnitIds: [...allowedUnitIds],
      taxProfileId,
      status: 'ACTIVE',
    };
  }

  private calculateFormulaPreview(): { sellingPrice: number | null; anchorPrice: number | null; actualPrice: number | null; error: string | null } {
    const rawValues = this.valuesForm.getRawValue() as Record<string, number | null>;
    const context: Record<string, number> = {};

    for (const field of this.wizardFields()) {
      const value = Number(rawValues[field.key]);
      if (!Number.isFinite(value)) {
        return { sellingPrice: null, anchorPrice: null, actualPrice: null, error: `${field.name} has invalid value.` };
      }
      context[field.key] = value;
    }

    const sellingFormula = String(this.formulaForm.controls.sellingPrice.value || '').trim();
    const anchorFormula = String(this.formulaForm.controls.anchorPrice.value || '').trim();
    const actualFormula = String(this.formulaForm.controls.actualPrice.value || '').trim();

    if (!sellingFormula && !anchorFormula && !actualFormula) {
      return { sellingPrice: null, anchorPrice: null, actualPrice: null, error: null };
    }

    try {
      let selling: number | null = null;
      let anchor: number | null = null;
      let actual: number | null = null;

      if (actualFormula) actual = this.evaluateExpression(actualFormula, context);

      if (sellingFormula) {
        selling = this.evaluateExpression(sellingFormula, { ...context, actualPrice: Number(actual ?? 0) });
      }

      if (anchorFormula) {
        if (!Number.isFinite(selling)) {
          return { sellingPrice: null, anchorPrice: null, actualPrice: null, error: 'Selling price formula is required before anchor price formula.' };
        }
        anchor = this.evaluateExpression(anchorFormula, { ...context, actualPrice: Number(actual ?? 0), sellingPrice: Number(selling) });
      }

      return {
        sellingPrice: Number.isFinite(selling) ? Number(Number(selling).toFixed(2)) : null,
        anchorPrice: Number.isFinite(anchor) ? Number(Number(anchor).toFixed(2)) : null,
        actualPrice: Number.isFinite(actual) ? Number(Number(actual).toFixed(2)) : null,
        error: null,
      };
    } catch (error) {
      return { sellingPrice: null, anchorPrice: null, actualPrice: null, error: error instanceof Error ? error.message : 'Invalid formula' };
    }
  }

  private getFieldGroupsForCategory(categoryId: string): FieldGroup[] {
    const normalizedCategoryId = String(categoryId || '').trim();
    const activeFieldGroups = this.fieldGroups().filter((item) => item.status === 'ACTIVE');
    if (!normalizedCategoryId) return activeFieldGroups;
    return activeFieldGroups.filter((fieldGroup) => {
      const mappedCategoryIds = fieldGroup.categoryIds || [];
      return !mappedCategoryIds.length || mappedCategoryIds.includes(normalizedCategoryId);
    });
  }

  private getUnitsForCategory(categoryId: string): Unit[] {
    const normalizedCategoryId = String(categoryId || '').trim();
    const allUnits = this.units();
    if (!normalizedCategoryId) return allUnits;
    return allUnits.filter((unit) => {
      const mappedCategoryIds = unit.categoryIds || [];
      return !mappedCategoryIds.length || mappedCategoryIds.includes(normalizedCategoryId);
    });
  }

  private evaluateExpression(expression: string, context: Record<string, number>): number {
    if (!/^[\d\s()+\-*/%._A-Za-z]+$/.test(expression)) {
      throw new Error('Formula contains unsupported characters.');
    }
    const keys = Object.keys(context).sort((a, b) => b.length - a.length);
    let replaced = expression.replaceAll(/(\d+(?:\.\d+)?)\s*%/g, '($1/100)');
    for (const key of keys) {
      const pattern = new RegExp(String.raw`\b${key}\b`, 'g');
      replaced = replaced.replace(pattern, String(context[key]));
    }
    if (/\b[A-Za-z_]\w*\b/.test(replaced)) {
      throw new Error('Formula uses unknown variables.');
    }
    const result = new Function(`"use strict"; return (${replaced});`)();
    const numeric = Number(result);
    if (!Number.isFinite(numeric)) throw new TypeError('Formula output is invalid.');
    return numeric;
  }

  private isPricingField(field: Field): field is Field & { type: 'NUMBER' | 'PERCENTAGE' } {
    return field.fieldKind !== 'METADATA' && (field.type === 'NUMBER' || field.type === 'PERCENTAGE');
  }

  private getPreferredToken(candidates: string[]): string | null {
    const available = new Set(this.wizardFields().map((field) => String(field.key || '').trim().toLowerCase()));
    return candidates.find((key) => available.has(String(key || '').trim().toLowerCase())) || null;
  }

  private tryAutofillFormulas(): void {
    const selling = String(this.formulaForm.controls.sellingPrice.value || '').trim();
    const anchor = String(this.formulaForm.controls.anchorPrice.value || '').trim();
    const actual = String(this.formulaForm.controls.actualPrice.value || '').trim();
    if (selling || anchor || actual) return;
    this.initializeSimplePricingDefaults();
  }

  private initializeSimplePricingDefaults(): void {
    const numberFields = this.wizardFields().filter((field) => field.type === 'NUMBER');
    const preferredBase = this.getPreferredToken(['buyPrice', 'buyprice', 'costPrice', 'costprice', 'basePrice', 'baseprice']);
    const fallbackBase = numberFields[0]?.key || 'buyPrice';
    const base = preferredBase || fallbackBase;
    this.simpleBaseCostKey.set(base);
    this.simpleBaseCostControl.setValue(base, { emitEvent: false });
    this.simpleSellingMarginBaseControl.setValue(this.simpleSellingMarginBase(), { emitEvent: false });
    this.simpleMarginPercentControl.setValue(String(this.simpleMarginPercent()), { emitEvent: false });
    this.simpleAnchorPercentControl.setValue(String(this.simpleAnchorPercent()), { emitEvent: false });
    this.simpleActualExtraKeys.set(
      numberFields
        .map((field) => field.key)
        .filter((key) => key !== base)
        .filter((key) => ['labourcost', 'laborcost', 'makingcharge', 'transport', 'wastage'].includes(key.toLowerCase()))
    );
    this.autoApplySimplePricingBuilder();
  }

  private autoApplySimplePricingBuilder(): void {
    const formulas = this.simpleGeneratedFormulas();
    this.formulaForm.patchValue({
      actualPrice: formulas.actualPrice,
      sellingPrice: formulas.sellingPrice,
      anchorPrice: formulas.anchorPrice,
    }, { emitEvent: false });
    this.formulaForm.markAsDirty();
    this.formulaTarget.set('sellingPrice');
  }

  private buildSimplePricingFormulas(): { actualPrice: string; sellingPrice: string; anchorPrice: string } {
    const base = String(this.simpleBaseCostKey() || '').trim();
    const numberTokenFallback = this.wizardFields().find((field) => field.type === 'NUMBER')?.key || 'buyPrice';
    const baseToken = base || numberTokenFallback;
    const extras = this.simpleActualExtraKeys().filter((key) => key && key !== baseToken);
    const actualFormula = [baseToken, ...extras].join(' + ');

    const marginPercent = Math.max(0, Number(this.simpleMarginPercent()) || 0);
    const anchorPercent = Math.max(0, Number(this.simpleAnchorPercent()) || 0);
    const marginBaseToken = 'actualPrice';
    const sellingFormula = `actualPrice + (${marginBaseToken} * ${marginPercent}%)`;
    const anchorMultiplier = (1 + anchorPercent / 100).toFixed(4).replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
    const anchorFormula = anchorPercent > 0 ? `sellingPrice * ${anchorMultiplier}` : 'sellingPrice';

    return { actualPrice: actualFormula, sellingPrice: sellingFormula, anchorPrice: anchorFormula };
  }
}
