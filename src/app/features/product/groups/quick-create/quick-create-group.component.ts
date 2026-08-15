import { CommonModule } from '@angular/common';
import { Component, DestroyRef, EventEmitter, Output, computed, effect, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { debounceTime, firstValueFrom, merge } from 'rxjs';
import {
  GomAlertToastService,
  GomButtonComponent,
  GomCheckboxComponent,
  GomInputComponent,
  GomModalComponent,
  GomSelectComponent,
  GomSelectOption,
} from '@gomlibs/ui';

import { AuthSessionService } from '../../../../core/auth/auth-session.service';
import { RichTextEditorComponent } from '../../../../shared/components/rich-text-editor/rich-text-editor.component';
import { ImagePickerComponent, PickedImage } from '../../../../shared/components/image-picker/image-picker.component';
import { DisableIfNoFeatureDirective } from '../../../../shared/directives/disable-if-no-feature.directive';
import { MediaAssetService } from '../../../saas-platform/media/media-asset.service';
import { GroupImage, GroupImageEntry } from '../../../saas-platform/media/media-asset.model';
import { AttributesService, AttributeDefinition } from '../../../master/attributes/attributes.service';
import { PricingTemplatesService, PricingTemplate } from '../../../master/pricing-templates/pricing-templates.service';
import { VariantsService, Variant } from '../../variants/variants.service';
import {
  Category,
  Field,
  FieldGroup,
  Group,
  GroupsService,
  PricingRefreshMode,
  TaxProfile,
  Unit,
} from '../groups.service';

export interface QuickCreatePreview {
  mode: string;
  category: { id: string; name: string };
  defaultsApplied: boolean;
  resolved: {
    fieldGroupId: string | null;
    attributeIds?: string[];
    pricingTemplateId: string | null;
    baseUnitId: string | null;
    taxProfileId: string | null;
    groupType: string;
    pricingRefreshMode: string;
  };
  previews: {
    fieldGroup: { id: string; name: string; version: number } | null;
    attributes?: { id: string; name: string }[];
    pricingTemplate: { id: string; name: string; formulaSummary: unknown } | null;
    baseUnit: { id: string; name: string; symbol?: string } | null;
    taxProfile: { id: string; name: string } | null;
  };
  canCreate: boolean;
  missingRequired: string[];
}

interface QuickCreateResponseData {
  group: Group;
  quickCreate: {
    enabled: boolean;
    mode: 'QUICK_CREATE';
    nextStepChecklist: boolean;
  };
}

@Component({
  selector: 'gom-quick-create-group',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DisableIfNoFeatureDirective,
    GomButtonComponent,
    GomCheckboxComponent,
    GomInputComponent,
    GomModalComponent,
    GomSelectComponent,
    RichTextEditorComponent,
    ImagePickerComponent,
  ],
  templateUrl: './quick-create-group.component.html',
  styleUrl: './quick-create-group.component.scss',
})
export class QuickCreateGroupComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly groupsService = inject(GroupsService);
  private readonly attributesService = inject(AttributesService);
  private readonly pricingTemplatesService = inject(PricingTemplatesService);
  private readonly variantsService = inject(VariantsService);
  private readonly mediaService = inject(MediaAssetService);
  private readonly toast = inject(GomAlertToastService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly authSession = inject(AuthSessionService);

  readonly canCreateGroup = computed(() => this.authSession.hasFeature('group.create'));
  readonly submitting = signal(false);
  readonly preview = signal<QuickCreatePreview | null>(null);
  readonly previewLoading = signal(false);
  readonly showModal = signal(false);
  readonly editingGroupId = signal<string | null>(null);
  readonly editingSourceGroup = signal<Group | null>(null);
  readonly editingGroupHasVariants = signal(false);
  readonly editingGroupVariantCount = signal<number>(0);
  readonly cloneSourceGroupId = signal<string | null>(null);
  readonly cloneSourceGroupName = signal<string>('');
  readonly cloneSourceHasVariants = signal(false);
  readonly pickerOpen = signal(false);
  readonly groupImages = signal<GroupImage[]>([]);

  readonly categories = signal<GomSelectOption[]>([]);
  readonly fieldGroups = signal<GomSelectOption[]>([]);
  readonly fieldGroupsData = signal<FieldGroup[]>([]);
  readonly fieldsData = signal<Field[]>([]);
  readonly attributes = signal<GomSelectOption[]>([]);
  readonly attributesData = signal<AttributeDefinition[]>([]);
  readonly pricingTemplates = signal<GomSelectOption[]>([]);
  readonly units = signal<GomSelectOption[]>([]);
  readonly taxProfiles = signal<GomSelectOption[]>([]);
  
  readonly excludedFieldKeys = signal<Set<string>>(new Set());
  readonly showFieldSelection = signal(false);
  readonly selectedAttributeValues = signal<Record<string, string[]>>({});
  private readonly attributeValueControls = new Map<string, FormControl<boolean>>();
  readonly DEFAULT_MAX_IMAGES = 10;
  readonly DEFAULT_MAX_VIDEOS = 1;
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
  readonly existingImageIds = computed(() => new Set(this.groupImages().map((img) => img.mediaAssetId._id)));
  readonly groupImageLimit = computed(() => this.authSession.getFeatureConfigNumber('group.create', 'max_images') ?? this.DEFAULT_MAX_IMAGES);
  readonly groupVideoLimit = computed(() => this.authSession.getFeatureConfigNumber('group.create', 'max_videos') ?? this.DEFAULT_MAX_VIDEOS);
  readonly previewCaptionTrack = 'data:text/vtt;charset=utf-8,WEBVTT%0A';

  readonly groupTypeOptions: GomSelectOption[] = [
    { label: 'Measured (by Weight/Volume)', value: 'MEASURED' },
    { label: 'Attribute (by Color/Size)', value: 'ATTRIBUTE' },
    { label: 'Hybrid (Measured + Attribute)', value: 'HYBRID' },
  ];

  readonly pricingRefreshModeOptions: GomSelectOption[] = [
    { label: 'Auto (Default)', value: '' },
    { label: 'Fixed Price', value: 'FIXED' },
    { label: 'Manual Refresh', value: 'MANUAL_REFRESH' },
    { label: 'Auto Refresh', value: 'AUTO_REFRESH' },
  ];

  readonly quickCreateForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    description: [''],
    categoryId: ['', [Validators.required]],
    groupType: ['MEASURED' as 'MEASURED' | 'ATTRIBUTE' | 'HYBRID', [Validators.required]],
    fieldGroupId: [''],
    attributeIds: [[] as string[]],
    pricingTemplateId: ['', [Validators.required]],
    baseUnitId: [''],
    allowedUnitIds: [[] as string[]],
    taxProfileId: [''],
    pricingRefreshMode: [''],
    status: ['ACTIVE' as 'ACTIVE' | 'INACTIVE'],
    createDefaultVariant: [false],
  });

  // Reactive signals for conditional field display
  readonly groupType$ = toSignal(this.quickCreateForm.controls.groupType.valueChanges, {
    initialValue: 'MEASURED' as 'MEASURED' | 'ATTRIBUTE' | 'HYBRID'
  });

  readonly baseUnitId$ = toSignal(this.quickCreateForm.controls.baseUnitId.valueChanges, {
    initialValue: ''
  });

  readonly attributeIds$ = toSignal(this.quickCreateForm.controls.attributeIds.valueChanges, {
    initialValue: [] as string[],
  });

  readonly showUnits = computed(() => {
    const type = this.groupType$();
    return type === 'MEASURED' || type === 'HYBRID';
  });

  readonly showAttributes = computed(() => {
    const type = this.groupType$();
    return type === 'ATTRIBUTE' || type === 'HYBRID';
  });

  readonly selectedAttributes = computed(() => {
    const selectedAttrIds = new Set(this.attributeIds$());
    const selectedValueMap = this.selectedAttributeValues();

    return this.attributesData()
      .filter((attr) => selectedAttrIds.has(attr._id || ''))
      .map((attr) => ({
        id: attr._id!,
        name: attr.name,
        key: attr.key,
        allowedValues: attr.allowedValues || [],
        selectedValues: selectedValueMap[attr._id!] ?? (attr.allowedValues || []),
      }));
  });

  // Filter out selected base unit from allowed units dropdown options
  readonly allowedUnitsOptions = computed(() => {
    const baseUnitId = this.baseUnitId$();
    if (!baseUnitId) return this.units();
    return this.units().filter(unit => unit.value !== baseUnitId);
  });

  // Get fields from selected field group
  readonly selectedFieldGroupFields = computed(() => {
    const fieldGroupId = this.quickCreateForm.controls.fieldGroupId.value;
    if (!fieldGroupId) return [];
    
    const fieldGroup = this.fieldGroupsData().find(fg => fg._id === fieldGroupId);
    if (!fieldGroup) return [];
    
    const fieldsById = new Map(this.fieldsData().map(f => [f._id, f]));
    
    return fieldGroup.fields
      .map(f => {
        const field = fieldsById.get(f.fieldId);
        if (!field) return null;
        return {
          fieldId: f.fieldId,
          key: field.key,
          name: field.name,
          order: f.order,
          isRequired: f.requiredOverride ?? field.isRequired
        };
      })
      .filter((f): f is NonNullable<typeof f> => f !== null)
      .sort((a, b) => a.order - b.order);
  });

  readonly hasFieldGroupSelected = computed(() => {
    return !!this.quickCreateForm.controls.fieldGroupId.value;
  });

  readonly isEditMode = computed(() => !!this.editingGroupId());
  readonly isCloneMode = computed(() => !this.editingGroupId() && !!this.cloneSourceGroupId());
  readonly copySourceVariantsControl = new FormControl<boolean>(false, { nonNullable: true });
  readonly copySourceVariants$ = toSignal(this.copySourceVariantsControl.valueChanges, { initialValue: false });
  readonly showCopyAllVariantsOption = computed(() => this.isCloneMode() && this.cloneSourceHasVariants());
  readonly showCreateDefaultVariantOption = computed(() => {
    if (!this.isCloneMode()) {
      return true;
    }

    if (!this.cloneSourceHasVariants()) {
      return true;
    }

    return !this.copySourceVariants$();
  });

  // Status change warning signals
  readonly showStatusChangeWarning = signal(false);
  readonly statusChangeDraftCount = signal<number>(0);
  readonly statusChangeConfirmedCount = signal<number>(0);
  readonly statusChangeAffectedVariants = signal<Array<{ id: string; name: string; sku: string }>>([]);
  readonly editingGroupStatus = signal<'ACTIVE' | 'INACTIVE' | null>(null);
  private originalGroupStatus: 'ACTIVE' | 'INACTIVE' | null = null;

  @Output() readonly saved = new EventEmitter<void>();
  @Output() readonly closed = new EventEmitter<void>();

  ngOnInit(): void {
    if (!this.canCreateGroup()) {
      this.toast.error('You do not have permission to create groups');
      return;
    }

    this.loadFormData();
    this.setupPreviewWatchers();
    this.setupBaseUnitAutoSelect();
    this.setupAttributeValueSync();
    this.setupAdvancedOptionValidators();
    this.setupCloneVariantOptions();
  }

  private setupCloneVariantOptions(): void {
    this.copySourceVariantsControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((copyAllVariants) => {
        if (copyAllVariants) {
          this.quickCreateForm.controls.createDefaultVariant.setValue(false, { emitEvent: false });
        }
      });
  }

  private setupAdvancedOptionValidators(): void {
    this.quickCreateForm.controls.taxProfileId.setValidators([Validators.required]);
    this.quickCreateForm.controls.pricingRefreshMode.setValidators([Validators.required]);

    this.quickCreateForm.controls.groupType.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((groupType) => {
        const requiresUnits = groupType === 'MEASURED' || groupType === 'HYBRID';
        const requiresAttributes = groupType === 'ATTRIBUTE' || groupType === 'HYBRID';

        if (requiresUnits) {
          this.quickCreateForm.controls.baseUnitId.setValidators([Validators.required]);
          this.quickCreateForm.controls.allowedUnitIds.setValidators([this.minArrayLengthValidator(1)]);
        } else {
          this.quickCreateForm.controls.baseUnitId.clearValidators();
          this.quickCreateForm.controls.allowedUnitIds.clearValidators();
        }

        if (requiresAttributes) {
          this.quickCreateForm.controls.attributeIds.setValidators([this.minArrayLengthValidator(1)]);
        } else {
          this.quickCreateForm.controls.attributeIds.clearValidators();
        }

        this.quickCreateForm.controls.baseUnitId.updateValueAndValidity({ emitEvent: false });
        this.quickCreateForm.controls.allowedUnitIds.updateValueAndValidity({ emitEvent: false });
        this.quickCreateForm.controls.attributeIds.updateValueAndValidity({ emitEvent: false });
      });

    // Apply once for initial group type value.
    const initialType = this.quickCreateForm.controls.groupType.value;
    const requiresUnitsInitially = initialType === 'MEASURED' || initialType === 'HYBRID';
    const requiresAttributesInitially = initialType === 'ATTRIBUTE' || initialType === 'HYBRID';
    if (requiresUnitsInitially) {
      this.quickCreateForm.controls.baseUnitId.setValidators([Validators.required]);
      this.quickCreateForm.controls.allowedUnitIds.setValidators([this.minArrayLengthValidator(1)]);
    }
    if (requiresAttributesInitially) {
      this.quickCreateForm.controls.attributeIds.setValidators([this.minArrayLengthValidator(1)]);
    }
    this.quickCreateForm.controls.taxProfileId.updateValueAndValidity({ emitEvent: false });
    this.quickCreateForm.controls.pricingRefreshMode.updateValueAndValidity({ emitEvent: false });
    this.quickCreateForm.controls.baseUnitId.updateValueAndValidity({ emitEvent: false });
    this.quickCreateForm.controls.allowedUnitIds.updateValueAndValidity({ emitEvent: false });
    this.quickCreateForm.controls.attributeIds.updateValueAndValidity({ emitEvent: false });
  }

  private minArrayLengthValidator(min: number) {
    return (control: AbstractControl) => {
      const value = control.value;
      if (Array.isArray(value) && value.length >= min) {
        return null;
      }
      return { minArrayLength: { min } };
    };
  }

  private setupAttributeValueSync(): void {
    effect(() => {
      const selectedIds = new Set(this.attributeIds$());
      const attributes = this.attributesData();
      const current = this.selectedAttributeValues();
      const next: Record<string, string[]> = {};

      selectedIds.forEach((attrId) => {
        const attr = attributes.find((item) => item._id === attrId);
        if (!attr?._id) return;

        const allowedValues = attr.allowedValues || [];
        const existingValues = current[attr._id];

        if (!existingValues) {
          next[attr._id] = [...allowedValues];
          return;
        }

        next[attr._id] = existingValues.filter((value) => allowedValues.includes(value));
      });

      if (!this.areValueMapsEqual(current, next)) {
        this.selectedAttributeValues.set(next);
      }

      this.syncAttributeValueControls(next);
    }, { allowSignalWrites: true });
  }

  private syncAttributeValueControls(nextValues: Record<string, string[]>): void {
    const validKeys = new Set<string>();

    Object.entries(nextValues).forEach(([attrId, values]) => {
      const selected = new Set(values);
      const attr = this.attributesData().find((item) => item._id === attrId);
      const allowed = attr?.allowedValues || [];

      allowed.forEach((value) => {
        const control = this.getAttributeValueControl(attrId, value);
        const shouldBeChecked = selected.has(value);
        if (control.value !== shouldBeChecked) {
          control.setValue(shouldBeChecked, { emitEvent: false });
        }
        validKeys.add(`${attrId}::${value}`);
      });
    });

    Array.from(this.attributeValueControls.keys()).forEach((key) => {
      if (!validKeys.has(key)) {
        this.attributeValueControls.delete(key);
      }
    });
  }

  private areValueMapsEqual(a: Record<string, string[]>, b: Record<string, string[]>): boolean {
    const aKeys = Object.keys(a).sort();
    const bKeys = Object.keys(b).sort();

    if (aKeys.length !== bKeys.length) return false;
    for (let i = 0; i < aKeys.length; i += 1) {
      if (aKeys[i] !== bKeys[i]) return false;
    }

    for (const key of aKeys) {
      const aVals = [...(a[key] || [])].sort();
      const bVals = [...(b[key] || [])].sort();
      if (aVals.length !== bVals.length) return false;
      for (let i = 0; i < aVals.length; i += 1) {
        if (aVals[i] !== bVals[i]) return false;
      }
    }

    return true;
  }

  private setupBaseUnitAutoSelect(): void {
    // Auto-add base unit to allowed units when selected
    this.quickCreateForm.controls.baseUnitId.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((baseUnitId) => {
        if (!baseUnitId) return;
        
        const currentAllowedUnits = this.quickCreateForm.controls.allowedUnitIds.value;
        if (!currentAllowedUnits.includes(baseUnitId)) {
          this.quickCreateForm.controls.allowedUnitIds.setValue(
            [...currentAllowedUnits, baseUnitId],
            { emitEvent: false }
          );
        }
      });

    // Ensure base unit always stays in allowed units
    this.quickCreateForm.controls.allowedUnitIds.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((allowedUnits) => {
        const baseUnitId = this.quickCreateForm.controls.baseUnitId.value;
        if (baseUnitId && !allowedUnits.includes(baseUnitId)) {
          this.quickCreateForm.controls.allowedUnitIds.setValue(
            [...allowedUnits, baseUnitId],
            { emitEvent: false }
          );
        }
      });
  }

  openModal(): void {
    this.editingGroupId.set(null);
    this.editingSourceGroup.set(null);
    this.cloneSourceGroupId.set(null);
    this.cloneSourceGroupName.set('');
    this.cloneSourceHasVariants.set(false);
    this.copySourceVariantsControl.setValue(false, { emitEvent: false });
    this.groupImages.set([]);
    
    // Reset variant tracking signals and re-enable all fields for creation
    this.editingGroupHasVariants.set(false);
    this.editingGroupVariantCount.set(0);
    this.removeEditRestrictions();
    
    this.showModal.set(true);
    if (this.categories().length === 0) {
      this.loadFormData();
    }
    this.previewLoadDefaults();
  }

  async openForEdit(existing: Group): Promise<void> {
    const { attributeIds, selectedValues } = this.resolveAttributesFromGroup(existing);
    const resolvedAllowedUnitIds = this.ensureBaseUnitInAllowedUnits(existing.baseUnitId, existing.allowedUnitIds || []);

    this.editingGroupId.set(existing._id);
    this.editingSourceGroup.set(existing);
    this.cloneSourceGroupId.set(null);
    this.cloneSourceGroupName.set('');
    this.cloneSourceHasVariants.set(false);
    this.copySourceVariantsControl.setValue(false, { emitEvent: false });
    this.excludedFieldKeys.set(new Set(existing.excludedFieldKeys || []));
    this.showFieldSelection.set(false);
    this.selectedAttributeValues.set(selectedValues);

    // Check variant count to determine edit restrictions
    try {
      const response = await firstValueFrom(
        this.variantsService.listVariants(existing._id, undefined, 1)
      );
      const variantCount = response.pagination.total;
      this.editingGroupHasVariants.set(variantCount > 0);
      this.editingGroupVariantCount.set(variantCount);
    } catch (err) {
      console.error('Failed to check variant count:', err);
      this.editingGroupHasVariants.set(false);
      this.editingGroupVariantCount.set(0);
    }

    this.quickCreateForm.reset({
      name: existing.name || '',
      description: existing.description || '',
      categoryId: existing.categoryId || '',
      groupType: existing.groupType || 'MEASURED',
      fieldGroupId: existing.fieldGroupId || '',
      attributeIds,
      pricingTemplateId: existing.pricingTemplateId || '',
      baseUnitId: existing.baseUnitId || '',
      allowedUnitIds: resolvedAllowedUnitIds,
      taxProfileId: existing.taxProfileId || '',
      pricingRefreshMode: existing.pricingRefreshMode || '',
      status: existing.status || 'ACTIVE',
      createDefaultVariant: false,
    });

    // Track original status for status change warning
    this.originalGroupStatus = existing.status || 'ACTIVE';

    // Apply edit restrictions if variants exist
    if (this.editingGroupHasVariants()) {
      this.applyEditRestrictions();
    }

    this.loadGroupImages(existing._id);

    this.showModal.set(true);
    if (this.categories().length === 0) {
      this.loadFormData();
    }
    this.previewLoadDefaults();
  }

  openForClone(existing: Group): void {
    const { attributeIds, selectedValues } = this.resolveAttributesFromGroup(existing);
    const resolvedAllowedUnitIds = this.ensureBaseUnitInAllowedUnits(existing.baseUnitId, existing.allowedUnitIds || []);

    this.editingGroupId.set(null);
    this.editingSourceGroup.set(null);
    this.cloneSourceGroupId.set(existing._id);
    this.cloneSourceGroupName.set(existing.name || 'source group');
    this.cloneSourceHasVariants.set(false);
    this.copySourceVariantsControl.setValue(false, { emitEvent: false });
    this.excludedFieldKeys.set(new Set(existing.excludedFieldKeys || []));
    this.showFieldSelection.set(false);
    this.selectedAttributeValues.set(selectedValues);
    
    // Reset variant tracking signals and re-enable all fields for cloning
    this.editingGroupHasVariants.set(false);
    this.editingGroupVariantCount.set(0);
    this.removeEditRestrictions();

    this.quickCreateForm.reset({
      name: existing.name ? `${existing.name} Copy` : '',
      description: existing.description || '',
      categoryId: existing.categoryId || '',
      groupType: existing.groupType || 'MEASURED',
      fieldGroupId: existing.fieldGroupId || '',
      attributeIds,
      pricingTemplateId: existing.pricingTemplateId || '',
      baseUnitId: existing.baseUnitId || '',
      allowedUnitIds: resolvedAllowedUnitIds,
      taxProfileId: existing.taxProfileId || '',
      pricingRefreshMode: existing.pricingRefreshMode || '',
      status: 'ACTIVE',
      createDefaultVariant: false,
    });

    this.loadSourceGroupImagesForClone(existing._id);
    this.loadCloneVariantAvailability(existing._id);

    this.showModal.set(true);
    if (this.categories().length === 0) {
      this.loadFormData();
    }
    this.previewLoadDefaults();
  }

  private applyEditRestrictions(): void {
    // Block immutable fields when variants exist
    this.quickCreateForm.controls.groupType.disable();
    this.quickCreateForm.controls.categoryId.disable();
    this.quickCreateForm.controls.fieldGroupId.disable();
    this.quickCreateForm.controls.pricingTemplateId.disable();
    this.quickCreateForm.controls.baseUnitId.disable();
  }

  private removeEditRestrictions(): void {
    // Re-enable all fields (used when opening for creation or clone)
    this.quickCreateForm.controls.groupType.enable();
    this.quickCreateForm.controls.categoryId.enable();
    this.quickCreateForm.controls.fieldGroupId.enable();
    this.quickCreateForm.controls.pricingTemplateId.enable();
    this.quickCreateForm.controls.baseUnitId.enable();
  }

  private async validateUnitRemoval(): Promise<boolean> {
    const existing = this.editingSourceGroup();
    if (!existing) return true;

    const currentUnits = existing.allowedUnitIds || [];
    const updatedUnits = this.quickCreateForm.controls.allowedUnitIds.value.filter(Boolean);
    const removedUnits = currentUnits.filter(id => !updatedUnits.includes(id));

    if (removedUnits.length === 0) return true; // No units removed

    try {
      // Get all variants to check unit usage
      const response = await firstValueFrom(
        this.variantsService.listVariants(existing._id, undefined, 1000)
      );

      for (const unitId of removedUnits) {
        const variantsUsingUnit = response.data.filter(v => v.unitId === unitId);
        
        if (variantsUsingUnit.length > 0) {
          const allUnits = await firstValueFrom(this.groupsService.listUnits());
          const unit = allUnits.data.find(u => u._id === unitId);
          
          this.toast.error(
            `Cannot remove unit "${unit?.symbol || unit?.name || unitId}": ` +
            `${variantsUsingUnit.length} variant(s) are using it. ` +
            `Please change those variants to a different unit first.`
          );
          return false;
        }
      }
    } catch (err) {
      console.error('Failed to validate unit removal:', err);
      this.toast.error('Failed to validate unit removal. Please try again.');
      return false;
    }

    return true;
  }

  private async validateAxesRemoval(): Promise<boolean> {
    const existing = this.editingSourceGroup();
    if (!existing || !existing.optionAxes) return true;

    const currentAxes = existing.optionAxes;
    const updatedAxes = this.selectedAttributes().map(attr => ({
      key: attr.key,
      label: attr.name,
      values: attr.selectedValues
    }));
    const removedAxes = currentAxes.filter(
      axis => !updatedAxes.find(a => a.key === axis.key)
    );

    if (removedAxes.length === 0) return true; // No axes removed

    try {
      // Get all variants to check axis usage
      const response = await firstValueFrom(
        this.variantsService.listVariants(existing._id, undefined, 1000)
      );

      for (const axis of removedAxes) {
        const variantsUsingAxis = response.data.filter(v =>
          v.optionSelections?.some(sel => sel.key === axis.key)
        );
        
        if (variantsUsingAxis.length > 0) {
          this.toast.error(
            `Cannot remove option "${axis.label}": ` +
            `${variantsUsingAxis.length} variant(s) have selections for it. ` +
            `Please delete those variants first.`
          );
          return false;
        }
      }

      // Also check for key renaming (not allowed)
      for (const existingAxis of currentAxes) {
        const updatedAxis = updatedAxes.find(a => a.label === existingAxis.label);
        if (updatedAxis && updatedAxis.key !== existingAxis.key) {
          this.toast.error(
            `Cannot rename option key "${existingAxis.key}" to "${updatedAxis.key}". ` +
            `This would break variant selections. Create a new option instead.`
          );
          return false;
        }
      }
    } catch (err) {
      console.error('Failed to validate axes removal:', err);
      this.toast.error('Failed to validate option removal. Please try again.');
      return false;
    }

    return true;
  }

  cancel(): void {
    this.showModal.set(false);
    this.pickerOpen.set(false);
    this.preview.set(null);
    this.previewLoading.set(false);
    this.editingGroupHasVariants.set(false);
    this.editingGroupVariantCount.set(0);
    this.editingGroupId.set(null);
    this.editingSourceGroup.set(null);
    this.cloneSourceGroupId.set(null);
    this.cloneSourceGroupName.set('');
    this.cloneSourceHasVariants.set(false);
    this.copySourceVariantsControl.setValue(false, { emitEvent: false });
    this.excludedFieldKeys.set(new Set());
    this.showFieldSelection.set(false);
    this.selectedAttributeValues.set({});
    this.groupImages.set([]);
    this.quickCreateForm.reset({
      name: '',
      description: '',
      categoryId: '',
      groupType: 'MEASURED',
      fieldGroupId: '',
      attributeIds: [],
      pricingTemplateId: '',
      baseUnitId: '',
      allowedUnitIds: [],
      taxProfileId: '',
      pricingRefreshMode: '',
      createDefaultVariant: false,
    });
    this.closed.emit();
  }

  toggleFieldSelection(): void {
    this.showFieldSelection.update(v => !v);
  }

  isFieldSelected(fieldKey: string): boolean {
    return !this.excludedFieldKeys().has(String(fieldKey || '').trim());
  }

  toggleFieldExclusion(fieldKey: string, included: boolean): void {
    const normalized = String(fieldKey || '').trim();
    if (!normalized) return;

    const excluded = new Set(this.excludedFieldKeys());
    if (included) {
      excluded.delete(normalized);
    } else {
      excluded.add(normalized);
    }
    this.excludedFieldKeys.set(excluded);
  }

  toggleAttribute(attrId: string, checked: boolean): void {
    const currentIds = this.attributeIds$();
    
    if (checked) {
      // Add attribute
      if (!currentIds.includes(attrId)) {
        this.quickCreateForm.patchValue({ attributeIds: [...currentIds, attrId] });
      }
    } else {
      // Remove attribute
      this.quickCreateForm.patchValue({ attributeIds: currentIds.filter(id => id !== attrId) });
    }
  }

  isAttributeSelected(attrId: string): boolean {
    return this.attributeIds$().includes(attrId);
  }

  toggleAttributeValue(attrId: string, value: string, checked: boolean): void {
    const current = { ...this.selectedAttributeValues() };
    const selected = new Set(current[attrId] || []);

    if (checked) {
      selected.add(value);
    } else {
      selected.delete(value);
    }

    current[attrId] = Array.from(selected);
    this.selectedAttributeValues.set(current);
  }

  isAttributeValueSelected(attrId: string, value: string): boolean {
    return (this.selectedAttributeValues()[attrId] || []).includes(value);
  }

  getAttributeValueControl(attrId: string, value: string): FormControl<boolean> {
    const key = `${attrId}::${value}`;
    const existing = this.attributeValueControls.get(key);
    if (existing) {
      return existing;
    }

    const control = new FormControl(this.isAttributeValueSelected(attrId, value), { nonNullable: true });
    control.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((nextChecked) => {
      this.toggleAttributeValue(attrId, value, !!nextChecked);
    });
    this.attributeValueControls.set(key, control);

    return control;
  }

  selectAllAttributeValues(attrId: string): void {
    const attr = this.attributesData().find((item) => item._id === attrId);
    if (!attr?._id) return;

    const allowedValues = [...(attr.allowedValues || [])];

    const current = { ...this.selectedAttributeValues() };
    current[attrId] = allowedValues;
    this.selectedAttributeValues.set(current);

    // Keep gom-lib checkbox controls in sync immediately so UI reflects selection instantly.
    allowedValues.forEach((value) => {
      const control = this.getAttributeValueControl(attrId, value);
      if (control.value !== true) {
        control.setValue(true, { emitEvent: false });
      }
    });
  }

  areAllAttributeValuesSelected(attrId: string): boolean {
    const attr = this.attributesData().find((item) => item._id === attrId);
    const allowedValues = attr?.allowedValues || [];
    if (!allowedValues.length) {
      return false;
    }

    const selected = new Set(this.selectedAttributeValues()[attrId] || []);
    return allowedValues.every((value) => selected.has(value));
  }

  trackByFieldId(_index: number, field: { fieldId: string }): string {
    return field.fieldId;
  }

  openPicker(): void {
    if (this.imageCount() >= this.groupImageLimit()) {
      this.toast.error(`Only ${this.groupImageLimit()} media items are allowed per group.`);
      return;
    }
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
      next: () => {
        this.toast.success('Media attached.');
        this.loadGroupImages(editId);
      },
      error: (err) => {
        const msg = err?.error?.message || 'Failed to attach media.';
        this.toast.error(msg);
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
      next: () => {
        this.toast.success('Media removed.');
        this.loadGroupImages(editId);
      },
      error: () => this.toast.error('Failed to remove media.'),
    });
  }

  loadGroupImages(groupId: string): void {
    this.mediaService.getGroupImages(groupId).subscribe({
      next: (images) => this.groupImages.set(images || []),
      error: () => this.groupImages.set([]),
    });
  }

  private loadSourceGroupImagesForClone(groupId: string): void {
    this.mediaService.getGroupImages(groupId).subscribe({
      next: (images) => {
        const copied = (images || []).map((img, index) => ({
          mediaAssetId: img.mediaAssetId,
          source: img.source,
          sortOrder: index,
        }));
        this.groupImages.set(copied);
      },
      error: () => this.groupImages.set([]),
    });
  }

  private loadCloneVariantAvailability(groupId: string): void {
    this.variantsService.listVariants(groupId, 1, 1).subscribe({
      next: (response) => {
        const count = Number(response?.pagination?.total ?? response?.data?.length ?? 0);
        const hasVariants = count > 0;
        this.cloneSourceHasVariants.set(hasVariants);
        if (hasVariants) {
          this.copySourceVariantsControl.setValue(false, { emitEvent: false });
          this.quickCreateForm.controls.createDefaultVariant.setValue(false, { emitEvent: false });
        } else {
          this.copySourceVariantsControl.setValue(false, { emitEvent: false });
        }
      },
      error: () => {
        this.cloneSourceHasVariants.set(false);
        this.copySourceVariantsControl.setValue(false, { emitEvent: false });
      },
    });
  }

  private copyVariantsFromSourceGroup(targetGroupId: string, done: () => void): void {
    const sourceGroupId = this.cloneSourceGroupId();
    if (!this.isCloneMode() || !this.copySourceVariantsControl.value || !sourceGroupId || !this.cloneSourceHasVariants()) {
      done();
      return;
    }

    this.variantsService.listVariants(sourceGroupId, 1, 500).subscribe({
      next: (response) => {
        const sourceVariants = response.data || [];
        if (!sourceVariants.length) {
          done();
          return;
        }

        const variantsPayload = sourceVariants.map((variant: Variant) => ({
          name: variant.name,
          itemType: variant.itemType,
          quantity: variant.quantity,
          unitId: variant.unitId,
          optionSelections: (variant.optionSelections || []).map((opt) => ({
            key: opt.key,
            label: opt.label,
            value: opt.value,
          })),
        }));

        this.variantsService.createVariants({
          groupId: targetGroupId,
          variants: variantsPayload,
        }).subscribe({
          next: () => done(),
          error: () => {
            this.toast.warning('Group cloned, but failed to copy variants.');
            done();
          },
        });
      },
      error: () => {
        this.toast.warning('Group cloned, but failed to read source variants.');
        done();
      },
    });
  }

  async submit(): Promise<void> {
    if (!this.quickCreateForm.valid) {
      this.quickCreateForm.markAllAsTouched();
      this.toast.error('Please fill in required fields');
      return;
    }

    if (this.showAttributes()) {
      const selectedAttributes = this.selectedAttributes();
      const hasEmptyAttributeValues = selectedAttributes.some((attr) => (attr.selectedValues || []).length === 0);
      if (hasEmptyAttributeValues) {
        this.toast.error('Select at least one value for each selected attribute.');
        return;
      }
    }

    const preview = this.preview();
    if (!preview?.canCreate) {
      this.toast.error(`Cannot create group: ${preview?.missingRequired?.join(', ') || 'missing configuration'}`);
      return;
    }

    const name = this.quickCreateForm.controls.name.value.trim();
    const categoryId = this.quickCreateForm.controls.categoryId.value.trim();
    if (!name || !categoryId) {
      this.toast.error('Group name and category are required');
      return;
    }

    this.submitting.set(true);

    const payload = {
      name,
      description: this.quickCreateForm.controls.description.value.trim(),
      categoryId,
      groupType: this.quickCreateForm.controls.groupType.value || 'MEASURED',
      fieldGroupId: this.trimmedOrUndefined(this.quickCreateForm.controls.fieldGroupId.value),
      attributeIds: this.quickCreateForm.controls.attributeIds.value.filter(Boolean),
      pricingTemplateId: this.trimmedOrUndefined(this.quickCreateForm.controls.pricingTemplateId.value),
      baseUnitId: this.trimmedOrUndefined(this.quickCreateForm.controls.baseUnitId.value),
      allowedUnitIds: this.quickCreateForm.controls.allowedUnitIds.value.filter(Boolean),
      taxProfileId: this.trimmedOrUndefined(this.quickCreateForm.controls.taxProfileId.value),
      pricingRefreshMode: this.toPricingRefreshMode(this.quickCreateForm.controls.pricingRefreshMode.value),
      status: this.quickCreateForm.controls.status.value || 'ACTIVE',
      createDefaultVariant: this.quickCreateForm.controls.createDefaultVariant.value,
      excludedFieldKeys: [...this.excludedFieldKeys()],
      optionAxes: this.selectedAttributes()
        .map((attr) => ({
          key: attr.key,
          label: attr.name,
          values: attr.selectedValues,
        }))
        .filter((axis) => axis.values.length > 0),
    };

    const editId = this.editingGroupId();
    const sourceGroup = this.editingSourceGroup();

    // Validate changes if editing group with variants
    if (editId && sourceGroup && this.editingGroupHasVariants()) {
      const unitsValid = await this.validateUnitRemoval();
      if (!unitsValid) {
        this.submitting.set(false);
        return;
      }

      const axesValid = await this.validateAxesRemoval();
      if (!axesValid) {
        this.submitting.set(false);
        return;
      }
    }

    if (editId && sourceGroup) {
      const updatePayload = {
        name,
        description: this.quickCreateForm.controls.description.value.trim(),
        groupType: this.quickCreateForm.controls.groupType.value || sourceGroup.groupType || 'MEASURED',
        categoryId,
        quantity: sourceGroup.quantity || 1,
        fieldGroupId: this.trimmedOrFallback(this.quickCreateForm.controls.fieldGroupId.value, sourceGroup.fieldGroupId),
        customFields: sourceGroup.resolvedFields.map((field) => ({
          fieldId: field.fieldId,
          value: Number(field.value),
        })),
        excludedFieldKeys: [...this.excludedFieldKeys()],
        formula: {
          sellingPrice: sourceGroup.formula?.sellingPrice || '',
          anchorPrice: sourceGroup.formula?.anchorPrice || '',
          actualPrice: sourceGroup.formula?.actualPrice || '',
        },
        pricingRefreshMode: this.toPricingRefreshMode(this.quickCreateForm.controls.pricingRefreshMode.value)
          || sourceGroup.pricingRefreshMode
          || 'AUTO_REFRESH',
        baseUnitId: this.trimmedOrFallback(this.quickCreateForm.controls.baseUnitId.value, sourceGroup.baseUnitId),
        allowedUnitIds: this.ensureBaseUnitInAllowedUnits(
          this.trimmedOrFallback(this.quickCreateForm.controls.baseUnitId.value, sourceGroup.baseUnitId),
          this.quickCreateForm.controls.allowedUnitIds.value.filter(Boolean),
        ),
        taxProfileId: this.trimmedOrUndefined(this.quickCreateForm.controls.taxProfileId.value) || null,
        status: this.quickCreateForm.controls.status.value || sourceGroup.status || 'ACTIVE',
        optionAxes: this.selectedAttributes()
          .map((attr) => ({
            key: attr.key,
            label: attr.name,
            values: attr.selectedValues,
          }))
          .filter((axis) => axis.values.length > 0),
      };

      this.groupsService.updateGroup(editId, updatePayload).subscribe({
        next: () => {
          this.toast.success('Group updated successfully!');
          this.submitting.set(false);
          this.cancel();
          this.saved.emit();
        },
        error: (err) => {
          this.toast.error(`Failed to update group: ${err?.error?.error || err?.error?.message || err.message}`);
          this.submitting.set(false);
        },
      });
      return;
    }

    this.groupsService.quickCreateGroup(payload).subscribe({
      next: (result) => {
        const createdId = (result as unknown as { data?: QuickCreateResponseData })?.data?.group?._id;
        const pendingImages = this.groupImages();

        const finalizeAfterCloneProcessing = () => {
          this.copyVariantsFromSourceGroup(createdId || '', () => {
            this.toast.success('Group created successfully!');
            this.submitting.set(false);
            this.saved.emit();
            this.cancel();
            void this.router.navigate(['/product/groups'], {
              queryParams: createdId ? { completeGroupId: createdId, openCompletion: '1' } : {},
            });
          });
        };

        if (createdId && pendingImages.length > 0) {
          const entries: GroupImageEntry[] = pendingImages.map((img, i) => ({
            mediaAssetId: img.mediaAssetId._id,
            source: img.source,
            sortOrder: i,
          }));

          this.mediaService.attachGroupImages(createdId, entries).subscribe({
            next: () => {
              finalizeAfterCloneProcessing();
            },
            error: () => {
              this.toast.error('Group created but failed to attach media.');
              finalizeAfterCloneProcessing();
            },
          });
          return;
        }

        finalizeAfterCloneProcessing();
      },
      error: (err) => {
        this.toast.error(`Failed to create group: ${err?.error?.error || err.message}`);
        this.submitting.set(false);
      },
    });
  }

  onCategoryChange(): void {
    this.previewLoadDefaults();
  }

  onDescriptionChanged(html: string): void {
    this.quickCreateForm.controls.description.setValue(String(html || ''), { emitEvent: false });
  }

  /**
   * Handle status changes in the form
   * Shows warning if changing from ACTIVE → INACTIVE and group variants are in carts/orders
   * Note: Includes users who added items anonymously and then logged in (cart syncs on login)
   * Does NOT include currently anonymous users (localStorage only until login)
   */
  onGroupStatusChange(newStatus: string): void {
    const groupId = this.editingGroupId();
    if (!groupId) {
      return;
    }

    const originalStatus = this.originalGroupStatus;
    console.log('[GROUP STATUS CHANGE]', { originalStatus, newStatus, groupId });

    // Only warn when changing from ACTIVE → INACTIVE
    if (originalStatus === 'ACTIVE' && newStatus === 'INACTIVE') {
      this.editingGroupStatus.set(newStatus as 'INACTIVE');
      
      // Check if any variants under this group are in logged-in customer carts or orders
      // Includes users who added items before login (carts sync on login)
      // Does NOT include currently anonymous users (localStorage only until login)
      this.groupsService.getGroupOrderStatusBreakdown(groupId).subscribe({
        next: (response) => {
          const draftCount = response.data?.draftCount || 0; // Logged-in customers with items in cart
          const confirmedCount = response.data?.confirmedCount || 0;
          const affectedVariants = response.data?.affectedVariants || [];
          
          console.log('[GROUP STATUS BREAKDOWN]', { draftCount, confirmedCount, affectedVariants });
          
          if (draftCount > 0 || confirmedCount > 0) {
            this.statusChangeDraftCount.set(draftCount);
            this.statusChangeConfirmedCount.set(confirmedCount);
            this.statusChangeAffectedVariants.set(affectedVariants);
            this.showStatusChangeWarning.set(true);
          }
        },
        error: (err) => {
          console.error('[GROUP STATUS CHANGE ERROR]', err);
          this.toast.error('Failed to check group status. Please try again.');
        }
      });
    }
  }

  cancelStatusChange(): void {
    // Revert to original status
    if (this.originalGroupStatus) {
      this.quickCreateForm.controls.status.setValue(this.originalGroupStatus, { emitEvent: false });
    }
    this.showStatusChangeWarning.set(false);
    this.editingGroupStatus.set(null);
  }

  confirmStatusChange(): void {
    // Keep the new status (already set in form)
    this.showStatusChangeWarning.set(false);
    this.editingGroupStatus.set(null);
    this.toast.info('Status will be updated when you save the group');
  }

  previewLoadDefaults(): void {
    const categoryId = this.quickCreateForm.controls.categoryId.value.trim();
    if (!categoryId) {
      this.preview.set(null);
      return;
    }

    this.previewLoading.set(true);

    const payload = {
      categoryId,
      fieldGroupId: this.trimmedOrUndefined(this.quickCreateForm.controls.fieldGroupId.value),
      attributeIds: this.quickCreateForm.controls.attributeIds.value.filter(Boolean),
      pricingTemplateId: this.trimmedOrUndefined(this.quickCreateForm.controls.pricingTemplateId.value),
      baseUnitId: this.trimmedOrUndefined(this.quickCreateForm.controls.baseUnitId.value),
      taxProfileId: this.trimmedOrUndefined(this.quickCreateForm.controls.taxProfileId.value),
      groupType: this.trimmedOrUndefined(this.quickCreateForm.controls.groupType.value),
      pricingRefreshMode: this.toPricingRefreshMode(this.quickCreateForm.controls.pricingRefreshMode.value),
    };

    this.groupsService.previewQuickCreate(payload).subscribe({
      next: (previewData) => {
        const resolvedPreview = previewData as QuickCreatePreview;
        
        // Ensure missingRequired is an array
        if (!Array.isArray(resolvedPreview.missingRequired)) {
          resolvedPreview.missingRequired = [];
        }
        
        // Calculate canCreate if not present
        if (typeof resolvedPreview.canCreate !== 'boolean') {
          resolvedPreview.canCreate = resolvedPreview.missingRequired.length === 0;
        }
        
        this.preview.set(resolvedPreview);

        // Apply category-derived suggestions only when user has not manually selected a value.
        const resolved = resolvedPreview?.resolved;
        if (resolved) {
          const nextPatch: Partial<{
            fieldGroupId: string;
            pricingTemplateId: string;
            baseUnitId: string;
            taxProfileId: string;
            groupType: 'MEASURED' | 'ATTRIBUTE' | 'HYBRID';
            pricingRefreshMode: string;
            attributeIds: string[];
          }> = {};

          // Field group is internal and derived from template/default mapping.
          if (resolved.fieldGroupId) {
            nextPatch.fieldGroupId = String(resolved.fieldGroupId);
          }
          if (!this.quickCreateForm.controls.attributeIds.value.length && resolved.attributeIds?.length) {
            nextPatch.attributeIds = resolved.attributeIds;
          }
          if (!String(this.quickCreateForm.controls.pricingTemplateId.value || '').trim() && resolved.pricingTemplateId) {
            nextPatch.pricingTemplateId = String(resolved.pricingTemplateId);
          }
          if (!String(this.quickCreateForm.controls.baseUnitId.value || '').trim() && resolved.baseUnitId) {
            nextPatch.baseUnitId = String(resolved.baseUnitId);
          }
          if (!String(this.quickCreateForm.controls.taxProfileId.value || '').trim() && resolved.taxProfileId) {
            nextPatch.taxProfileId = String(resolved.taxProfileId);
          }
          if (!this.quickCreateForm.controls.groupType.value && resolved.groupType) {
            const type = String(resolved.groupType).toUpperCase();
            if (type === 'MEASURED' || type === 'ATTRIBUTE' || type === 'HYBRID') {
              nextPatch.groupType = type;
            }
          }
          if (!String(this.quickCreateForm.controls.pricingRefreshMode.value || '').trim() && resolved.pricingRefreshMode) {
            nextPatch.pricingRefreshMode = String(resolved.pricingRefreshMode);
          }

          if (Object.keys(nextPatch).length > 0) {
            this.quickCreateForm.patchValue(nextPatch, { emitEvent: false });
          }
        }

        this.previewLoading.set(false);
      },
      error: (err) => {
        this.toast.error(`Failed to load preview: ${err?.error?.message || err.message}`);
        this.previewLoading.set(false);
      },
    });
  }

  private setupPreviewWatchers(): void {
    merge(
      this.quickCreateForm.controls.categoryId.valueChanges,
      this.quickCreateForm.controls.fieldGroupId.valueChanges,
      this.quickCreateForm.controls.attributeIds.valueChanges,
      this.quickCreateForm.controls.pricingTemplateId.valueChanges,
      this.quickCreateForm.controls.baseUnitId.valueChanges,
      this.quickCreateForm.controls.taxProfileId.valueChanges,
      this.quickCreateForm.controls.groupType.valueChanges,
      this.quickCreateForm.controls.pricingRefreshMode.valueChanges,
    )
      .pipe(debounceTime(150), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (this.showModal()) {
          this.previewLoadDefaults();
        }
      });
  }

  private loadFormData(): void {
    this.groupsService.getCategories().subscribe({
      next: (categories: Category[]) => {
        this.categories.set(categories.map((category) => ({ value: category._id, label: category.name })));
      },
      error: (err) => {
        this.toast.error('Failed to load categories');
        console.error('Error loading categories:', err);
      },
    });

    this.groupsService.getFieldGroups().subscribe({
      next: (fieldGroups: FieldGroup[]) => {
        this.fieldGroupsData.set(fieldGroups);
        this.fieldGroups.set(fieldGroups.map((fieldGroup) => ({ value: fieldGroup._id, label: `${fieldGroup.name} (v${fieldGroup.version})` })));
      },
      error: (err) => {
        this.toast.error('Failed to load field groups');
        console.error('Error loading field groups:', err);
      },
    });

    this.groupsService.listFields().subscribe({
      next: (response) => {
        this.fieldsData.set(response.data);
      },
      error: (err) => {
        this.toast.error('Failed to load fields');
        console.error('Error loading fields:', err);
      },
    });

    this.attributesService.getAttributes({ status: 'ACTIVE', limit: 1000 }).subscribe({
      next: (response: { data: AttributeDefinition[] }) => {
        this.attributesData.set(response.data); // Store full data
        this.attributes.set(response.data.map((attribute: AttributeDefinition) => ({ value: attribute._id || '', label: attribute.name })));

        const editingGroup = this.editingSourceGroup();
        if (editingGroup && this.showModal()) {
          const { attributeIds, selectedValues } = this.resolveAttributesFromGroup(editingGroup);
          if (attributeIds.length > 0) {
            this.quickCreateForm.patchValue({ attributeIds });
            this.selectedAttributeValues.set(selectedValues);
          }
        }
      },
      error: (err: unknown) => {
        this.toast.error('Failed to load attributes');
        console.error('Error loading attributes:', err);
      },
    });

    this.pricingTemplatesService.getPricingTemplates({ status: 'ACTIVE' }).subscribe({
      next: (response: { data: PricingTemplate[] }) => {
        this.pricingTemplates.set(response.data.map((template: PricingTemplate) => ({ value: template._id || '', label: template.name })));
      },
      error: (err: unknown) => {
        this.toast.error('Failed to load pricing templates');
        console.error('Error loading pricing templates:', err);
      },
    });

    this.groupsService.getUnits().subscribe({
      next: (units: Unit[]) => {
        this.units.set(units.map((unit) => ({ value: unit._id, label: unit.symbol ? unit.name + ' (' + unit.symbol + ')' : unit.name })));
      },
      error: (err) => {
        this.toast.error('Failed to load units');
        console.error('Error loading units:', err);
      },
    });

    this.groupsService.getTaxProfiles().subscribe({
      next: (profiles: TaxProfile[]) => {
        this.taxProfiles.set(profiles.map((profile) => ({ value: profile._id, label: profile.name })));
      },
      error: (err) => {
        this.toast.error('Failed to load tax profiles');
        console.error('Error loading tax profiles:', err);
      },
    });
  }

  private trimmedOrUndefined(value: string): string | undefined {
    const normalized = String(value || '').trim();
    return normalized || undefined;
  }

  private trimmedOrFallback(value: string, fallback: string): string {
    const normalized = String(value || '').trim();
    if (normalized) {
      return normalized;
    }

    return String(fallback || '').trim();
  }

  private ensureBaseUnitInAllowedUnits(baseUnitId: string, allowedUnitIds: string[]): string[] {
    const normalizedBase = String(baseUnitId || '').trim();
    const normalized = new Set((allowedUnitIds || []).map((id) => String(id || '').trim()).filter(Boolean));
    if (normalizedBase) {
      normalized.add(normalizedBase);
    }
    return [...normalized];
  }

  private resolveAttributesFromGroup(existing: Group): {
    attributeIds: string[];
    selectedValues: Record<string, string[]>;
  } {
    const byKey = new Map(this.attributesData().map((attr) => [this.normalizeToken(attr.key), attr]));
    const byName = new Map(this.attributesData().map((attr) => [this.normalizeToken(attr.name), attr]));

    const selectedValues: Record<string, string[]> = {};
    const selectedIds: string[] = [];

    (existing.optionAxes || []).forEach((axis) => {
      const axisKey = this.normalizeToken(axis.key);
      const axisLabel = this.normalizeToken(axis.label);
      const matched = byKey.get(axisKey) || byName.get(axisLabel);
      if (!matched?._id) {
        return;
      }

      if (!selectedIds.includes(matched._id)) {
        selectedIds.push(matched._id);
      }

      const allowedValues = matched.allowedValues || [];
      const allowedByNormalized = new Map(
        allowedValues.map((value) => [this.normalizeToken(value), value]),
      );

      const normalizedExistingValues = (axis.values || [])
        .map((value) => allowedByNormalized.get(this.normalizeToken(value)) || null)
        .filter((value): value is string => !!value);

      const values = [...new Set(normalizedExistingValues)];
      selectedValues[matched._id] = values.length ? values : [...(matched.allowedValues || [])];
    });

    return {
      attributeIds: selectedIds,
      selectedValues,
    };
  }

  private normalizeToken(value: string | null | undefined): string {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/[\s_-]+/g, ' ')
      .replace(/\s+/g, ' ');
  }

  private toPricingRefreshMode(value: string): PricingRefreshMode | undefined {
    const normalized = String(value || '').trim();
    if (normalized === 'FIXED' || normalized === 'MANUAL_REFRESH' || normalized === 'AUTO_REFRESH') {
      return normalized;
    }

    return undefined;
  }
}
