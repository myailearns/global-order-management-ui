import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';

import { GomAlertToastService, GomButtonComponent, GomConfirmationModalComponent, GomInputComponent, GomModalComponent, GomSelectComponent, GomTableColumn, GomTableComponent, GomTableQuery, GomTableRow, GomTextareaComponent } from '@gomlibs/ui';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { DisableIfNoFeatureDirective } from '../../../shared/directives/disable-if-no-feature.directive';
import { PRICING_TEMPLATE_DEFAULT_STATUS, PRICING_TEMPLATE_STATUS_OPTIONS, PRICING_TEMPLATE_UI_TEXT } from './pricing-templates.constants';
import { PricingTemplate, PricingTemplatePayload, PricingTemplatesService } from './pricing-templates.service';
import { FieldGroupsService, FieldGroup, PricingField } from '../field-groups/field-groups.service';

interface PricingTemplateRow extends GomTableRow {
  _id: string;
  name: string;
  description: string;
  fieldGroup: string;
  fieldKeys: string;
  status: string;
}

@Component({
  selector: 'gom-pricing-templates',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule, GomButtonComponent, GomTableComponent, GomModalComponent, GomInputComponent, GomSelectComponent, GomTextareaComponent, GomConfirmationModalComponent, DisableIfNoFeatureDirective],
  templateUrl: './pricing-templates.component.html',
  styleUrl: './pricing-templates.component.scss',
})
export class PricingTemplatesComponent implements OnInit, OnDestroy {
  private readonly service = inject(PricingTemplatesService);
  private readonly fieldGroupsService = inject(FieldGroupsService);
  private readonly toast = inject(GomAlertToastService);
  private readonly translate = inject(TranslateService);
  private readonly fb = inject(FormBuilder);
  private readonly authSession = inject(AuthSessionService);
  private readonly formSubscriptions = new Subscription();
  private isRestoringBuilderState = false;

  readonly text = PRICING_TEMPLATE_UI_TEXT;
  readonly statusOptions = computed(() => 
    PRICING_TEMPLATE_STATUS_OPTIONS.map(opt => ({
      ...opt,
      label: this.translate.instant(opt.label)
    }))
  );
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly items = signal<PricingTemplate[]>([]);
  readonly totalItems = signal(0);
  readonly pageIndex = signal(0);
  readonly pageSize = signal(50);
  readonly canLoadAll = signal(false);
  readonly allLoaded = signal(false);
  readonly viewMode = computed<'client' | 'server'>(() => (this.totalItems() > 500 && !this.allLoaded() ? 'server' : 'client'));
  readonly formOpen = signal(false);
  readonly selected = signal<PricingTemplate | null>(null);
  readonly deleteConfirmOpen = signal(false);
  readonly pendingDelete = signal<PricingTemplate | null>(null);
  readonly canCreate = computed(() => this.authSession.hasFeature('pricingTemplate.create'));
  readonly canEdit = computed(() => this.authSession.hasFeature('pricingTemplate.edit'));
  readonly canDelete = computed(() => this.authSession.hasFeature('pricingTemplate.delete'));
  
  // Field groups and fields - Field Group is now REQUIRED
  readonly fieldGroups = signal<FieldGroup[]>([]);
  readonly pricingFields = signal<PricingField[]>([]);
  readonly selectedFieldGroupId = signal<string | null>(null);
  readonly extraCostFieldKeys = signal<string[]>([]); // Selected extra cost fields
  readonly formulasEditMode = signal<boolean>(false); // Toggle for formula editing
  readonly selectedBaseCostField = signal<string>('');
  readonly selectedProfitMarginPercent = signal<number>(0);
  readonly selectedMrpMarkupPercent = signal<number>(0);
  
  readonly fieldGroupOptions = computed(() => 
    this.fieldGroups().map(fg => ({ label: `${fg.name} (v${fg.version})`, value: fg._id }))
  );
  
  readonly availablePricingFields = computed(() => {
    const selectedFGId = this.selectedFieldGroupId();
    if (!selectedFGId) return [];
    
    const selectedFG = this.fieldGroups().find(fg => fg._id === selectedFGId);
    if (!selectedFG) return [];
    
    const fieldIds = new Set(selectedFG.fields.map(f => f.fieldId));
    return this.pricingFields()
      .filter(pf => fieldIds.has(pf._id) && pf.fieldKind === 'PRICING')
      .map(pf => ({ label: pf.name, value: pf.key }));
  });
  
  // All fields from selected field group for extra cost checkboxes
  readonly availableExtraCostFields = computed(() => {
    return this.availablePricingFields();
  });
  
  // Generated formulas (reactive)
  readonly generatedFormulas = computed(() => {
    const baseCostField = this.selectedBaseCostField();
    const profitMargin = this.selectedProfitMarginPercent() || 0;
    const mrpMarkup = this.selectedMrpMarkupPercent() || 0;
    const extraFields = this.extraCostFieldKeys();
    
    if (!baseCostField) {
      return { actualPrice: '', sellingPrice: '', anchorPrice: '', fieldKeys: '' };
    }
    
    // Build actual price formula - matches existing group wizard pattern
    // Formula uses direct field keys, not {{brackets}}
    const actualPriceFormula = [baseCostField, ...extraFields].join(' + ');
    
    // Selling price: actualPrice + profit margin on base cost
    // Example: actualPrice + (buyPrice * 20%)
    const sellingPriceFormula = `actualPrice + (${baseCostField} * ${profitMargin}%)`;
    
    // Anchor price (MRP): sellingPrice with markup multiplier
    // Example: sellingPrice * 1.05 or just sellingPrice if no markup
    const anchorMultiplier = mrpMarkup > 0 
      ? (1 + mrpMarkup / 100).toFixed(4).replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1')
      : '';
    const anchorPriceFormula = anchorMultiplier ? `sellingPrice * ${anchorMultiplier}` : 'sellingPrice';
    
    const allFields = [baseCostField, ...extraFields];
    
    return {
      actualPrice: actualPriceFormula,
      sellingPrice: sellingPriceFormula,
      anchorPrice: anchorPriceFormula,
      fieldKeys: allFields.join(', ')
    };
  });

  // Display formulas - keys replaced by human-readable field names for the preview UI
  readonly displayFormulas = computed(() => {
    const raw = this.generatedFormulas();
    const keyToName = new Map(
      this.availablePricingFields().map(f => [f.value, f.label])
    );
    const substitute = (formula: string) =>
      formula.replace(/\b([a-zA-Z_]\w*)\b/g, (match) =>
        keyToName.get(match) ?? match
      );
    return {
      actualPrice: substitute(raw.actualPrice),
      sellingPrice: substitute(raw.sellingPrice),
      anchorPrice: substitute(raw.anchorPrice),
      fieldNames: raw.fieldKeys
        .split(', ')
        .filter(k => k.length > 0)
        .map(k => keyToName.get(k) ?? k)
        .join(', '),
    };
  });

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    description: [''],
    fieldGroupId: ['', [Validators.required]], // REQUIRED - templates must have field group
    // Builder controls
    baseCostField: ['', [Validators.required]],
    profitMarginPercent: [0, [Validators.required, Validators.min(0)]],
    mrpMarkupPercent: [0, [Validators.required, Validators.min(0)]],
    // Formulas - auto-generated but editable
    actualPriceFormula: ['', [Validators.required]],
    sellingPriceFormula: ['', [Validators.required]],
    anchorPriceFormula: ['', [Validators.required]],
    supportedFieldKeys: ['', [Validators.required]],
    status: [PRICING_TEMPLATE_DEFAULT_STATUS as string, [Validators.required]],
  });

  readonly columns: GomTableColumn<PricingTemplateRow>[] = [
    { key: 'name', header: '', sortable: true, filterable: true, width: '14rem' },
    { key: 'description', header: '', sortable: true, width: '14rem', textMode: 'wrap' },
    { key: 'fieldGroup', header: '', sortable: true, width: '14rem' },
    { key: 'fieldKeys', header: '', width: '16rem', textMode: 'wrap' },
    { key: 'status', header: '', sortable: true, width: '10rem' },
    { key: 'id', header: '', width: '10rem', actionButtons: [] },
  ];

  readonly rows = computed<PricingTemplateRow[]>(() =>
    this.items().map((item) => ({
      _id: item._id || '',
      name: item.name,
      description: item.description || '-',
      fieldGroup: item.fieldGroupName ? `${item.fieldGroupName} (v${item.fieldGroupVersion})` : '-',
      fieldKeys: item.supportedFieldKeys?.length ? item.supportedFieldKeys.join(', ') : '-',
      status: item.status,
    }))
  );

  constructor() {
    this.rebuildText();
    this.translate.onLangChange.subscribe(() => {
      this.rebuildText();
      // Trigger statusOptions recomputation on language change
      this.statusOptions();
    });

    this.setupFormulaRegeneration();
  }

  ngOnInit(): void {
    this.load();
    this.loadFieldGroups();
    this.loadPricingFields();
  }

  ngOnDestroy(): void {
    this.formSubscriptions.unsubscribe();
  }

  onAddNew(): void {
    if (!this.canCreate()) return;
    this.selected.set(null);
    this.selectedFieldGroupId.set(null);
    this.extraCostFieldKeys.set([]);
    this.formulasEditMode.set(false);
    this.form.reset({
      name: '',
      description: '',
      fieldGroupId: '',
      baseCostField: '',
      profitMarginPercent: 0,
      mrpMarkupPercent: 0,
      actualPriceFormula: '',
      sellingPriceFormula: '',
      anchorPriceFormula: '',
      supportedFieldKeys: '',
      status: PRICING_TEMPLATE_DEFAULT_STATUS,
    });
    this.formOpen.set(true);
  }

  onQueryChange(query: GomTableQuery): void {
    if (this.viewMode() !== 'server') return;
    this.loading.set(true);
    this.errorMessage.set(null);
    this.service.getPricingTemplates({ page: query.pageIndex + 1, limit: query.pageSize, search: query.searchTerm?.trim(), sortBy: query.sort?.key, order: query.sort?.direction as 'asc' | 'desc' | undefined }).subscribe({
      next: (response) => {
        this.items.set(response.data ?? []);
        this.totalItems.set(response.pagination.total);
        this.pageIndex.set(query.pageIndex);
        this.pageSize.set(query.pageSize);
        this.canLoadAll.set(response.pagination.canLoadAll);
        this.allLoaded.set(false);
        this.loading.set(false);
      },
      error: (error) => this.handleError(error, this.text.errorLoad),
    });
  }

  onAction(event: { actionKey: string; row: GomTableRow }): void {
    const id = event.row['_id'] as string;
    if (!id) return;
    
    const item = this.items().find((row) => row._id === id);
    if (!item) return;

    if (event.actionKey === 'edit') {
      if (!this.canEdit()) return;
      this.isRestoringBuilderState = true;
      this.selected.set(item);
      this.selectedFieldGroupId.set(item.fieldGroupId || null);
      
      // Parse formulas to extract builder values
      // Actual price pattern: "buyPrice + tax + shipping" or just "buyPrice"
      const actualFormula = String(item.actualPriceFormula || '').trim();
      const actualFields = actualFormula.split('+').map(f => f.trim()).filter(Boolean);
      const baseCostField = actualFields[0] || '';
      const extraFields = actualFields.slice(1);
      
      // Selling price pattern: "actualPrice + (buyPrice * 20%)"
      const sellingFormula = String(item.sellingPriceFormula || '').trim();
      const profitRegex = /\(([^)]*?)\s*\*\s*(\d+(?:\.\d+)?)%\)/;
      const profitMatch = profitRegex.exec(sellingFormula);
      const profitMarginPercent = profitMatch ? Number.parseFloat(profitMatch[2]) : 0;
      
      // Anchor price pattern: "sellingPrice * 1.2" or "sellingPrice"
      const anchorFormula = String(item.anchorPriceFormula || '').trim();
      let mrpMarkupPercent = 0;
      if (anchorFormula.includes('*')) {
        const anchorRegex = /sellingPrice\s*\*\s*(\d+(?:\.\d+)?)/;
        const anchorMatch = anchorRegex.exec(anchorFormula);
        if (anchorMatch) {
          const multiplier = Number.parseFloat(anchorMatch[1]);
          mrpMarkupPercent = Math.round((multiplier - 1) * 10000) / 100;
        }
      }
      
      // Set extra cost fields signal FIRST
      this.extraCostFieldKeys.set(extraFields);
      this.selectedBaseCostField.set(baseCostField);
      this.selectedProfitMarginPercent.set(profitMarginPercent);
      this.selectedMrpMarkupPercent.set(mrpMarkupPercent);
      
      // Patch form with extracted values
      this.form.patchValue({
        name: item.name,
        description: item.description,
        fieldGroupId: item.fieldGroupId || '',
        baseCostField: baseCostField,
        profitMarginPercent: profitMarginPercent,
        mrpMarkupPercent: mrpMarkupPercent,
        // Don't set formulas here - let them be generated
        supportedFieldKeys: item.supportedFieldKeys?.join(', ') || '',
        status: item.status,
      });
      this.updateFormulasFromGenerated();
      this.isRestoringBuilderState = false;
      
      this.formOpen.set(true);
      return;
    }

    if (event.actionKey === 'delete') {
      if (!this.canDelete()) return;
      this.pendingDelete.set(item);
      this.deleteConfirmOpen.set(true);
    }
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    
    // Field Group is now required
    if (!raw.fieldGroupId) {
      this.toast.error('Field Group is required');
      return;
    }

    const supportedFieldKeys = raw.supportedFieldKeys.split(',').map((item) => item.trim()).filter(Boolean);
    if (!supportedFieldKeys.length) {
      this.form.controls.supportedFieldKeys.setErrors({ required: true });
      return;
    }

    // Get field group details (required)
    const selectedFG = this.fieldGroups().find(fg => fg._id === raw.fieldGroupId);
    if (!selectedFG) {
      this.toast.error('Invalid field group selected');
      return;
    }

    const payload: PricingTemplatePayload = {
      name: raw.name.trim(),
      description: raw.description.trim(),
      actualPriceFormula: raw.actualPriceFormula.trim(),
      sellingPriceFormula: raw.sellingPriceFormula.trim(),
      anchorPriceFormula: raw.anchorPriceFormula.trim(),
      supportedFieldKeys,
      categoryIds: [], // Removed - categories inherited from field group
      status: raw.status as any,
      fieldGroupId: raw.fieldGroupId,
      fieldGroupName: selectedFG.name,
      fieldGroupVersion: selectedFG.version,
    };

    this.loading.set(true);
    const wasEdit = !!this.selected()?._id;
    const request = wasEdit && this.selected()?._id
      ? this.service.updatePricingTemplate(this.selected()!._id!, payload)
      : this.service.createPricingTemplate(payload);

    request.subscribe({
      next: () => {
        this.formOpen.set(false);
        this.selected.set(null);
        this.toast.success(this.translate.instant(wasEdit ? this.text.successUpdate : this.text.successCreate));
        this.load();
      },
      error: (error) => this.handleError(error, this.text.errorSave),
    });
  }

  cancelForm(): void {
    this.formOpen.set(false);
    this.selected.set(null);
  }

  cancelDelete(): void {
    this.deleteConfirmOpen.set(false);
    this.pendingDelete.set(null);
  }

  onFieldGroupChange(fieldGroupId: string): void {
    if (this.isRestoringBuilderState) {
      return;
    }

    this.selectedFieldGroupId.set(fieldGroupId || null);
    this.extraCostFieldKeys.set([]); // Reset extra cost fields
    this.selectedBaseCostField.set('');
    this.selectedProfitMarginPercent.set(0);
    this.selectedMrpMarkupPercent.set(0);
    // Reset builder controls when field group changes
    this.form.patchValue({ 
      baseCostField: '',
      profitMarginPercent: 0,
      mrpMarkupPercent: 0,
      actualPriceFormula: '',
      sellingPriceFormula: '',
      anchorPriceFormula: '',
      supportedFieldKeys: '',
    });
  }
  
  toggleExtraCostField(fieldKey: string, checked?: boolean): void {
    const current = this.extraCostFieldKeys();
    
    // If checked is provided (from checkbox), use it; otherwise toggle
    const shouldInclude = checked ?? !current.includes(fieldKey);
    
    if (shouldInclude && !current.includes(fieldKey)) {
      this.extraCostFieldKeys.set([...current, fieldKey]);
    } else if (!shouldInclude && current.includes(fieldKey)) {
      this.extraCostFieldKeys.set(current.filter(k => k !== fieldKey));
    }
    
    this.updateFormulasFromGenerated();
  }
  
  selectAllExtraCostFields(): void {
    const allKeys = this.availableExtraCostFields()
      .map(f => f.value)
      .filter(key => key !== this.form.value.baseCostField); // Exclude base cost field
    this.extraCostFieldKeys.set(allKeys);
    this.updateFormulasFromGenerated();
  }
  
  toggleFormulasEditMode(): void {
    this.formulasEditMode.update(v => !v);
  }
  
  updateFormulasFromGenerated(): void {
    const generated = this.generatedFormulas();
    this.form.patchValue({
      actualPriceFormula: generated.actualPrice,
      sellingPriceFormula: generated.sellingPrice,
      anchorPriceFormula: generated.anchorPrice,
      supportedFieldKeys: generated.fieldKeys,
    });
  }

  private setupFormulaRegeneration(): void {
    const baseCostSubscription = this.form.controls.baseCostField.valueChanges.subscribe((value) => {
      this.selectedBaseCostField.set(value || '');

      if (value) {
        this.updateFormulasFromGenerated();
        return;
      }

      this.form.patchValue({
        actualPriceFormula: '',
        sellingPriceFormula: '',
        anchorPriceFormula: '',
        supportedFieldKeys: '',
      });
    });

    const profitMarginSubscription = this.form.controls.profitMarginPercent.valueChanges.subscribe(() => {
      this.selectedProfitMarginPercent.set(Number(this.form.controls.profitMarginPercent.value || 0));

      if (this.form.controls.baseCostField.value) {
        this.updateFormulasFromGenerated();
      }
    });

    const mrpMarkupSubscription = this.form.controls.mrpMarkupPercent.valueChanges.subscribe(() => {
      this.selectedMrpMarkupPercent.set(Number(this.form.controls.mrpMarkupPercent.value || 0));

      if (this.form.controls.baseCostField.value) {
        this.updateFormulasFromGenerated();
      }
    });

    this.formSubscriptions.add(baseCostSubscription);
    this.formSubscriptions.add(profitMarginSubscription);
    this.formSubscriptions.add(mrpMarkupSubscription);
  }

  confirmDelete(): void {
    const item = this.pendingDelete();
    if (!item?._id) {
      this.cancelDelete();
      return;
    }

    this.loading.set(true);
    this.service.deletePricingTemplate(item._id, true).subscribe({
      next: () => {
        this.deleteConfirmOpen.set(false);
        this.pendingDelete.set(null);
        this.toast.success(this.translate.instant(this.text.successDelete));
        this.load();
      },
      error: (error) => this.handleError(error, this.text.errorDelete),
    });
  }

  private loadFieldGroups(): void {
    this.fieldGroupsService.listFieldGroups({ status: 'ACTIVE', limit: 500 }).subscribe({
      next: (response) => {
        this.fieldGroups.set(response.data ?? []);
      },
      error: (error) => {
        console.error('Failed to load field groups:', error);
      },
    });
  }

  private loadPricingFields(): void {
    this.fieldGroupsService.listFields({ status: 'ACTIVE', limit: 500 }).subscribe({
      next: (response) => {
        this.pricingFields.set(response.data ?? []);
      },
      error: (error) => {
        console.error('Failed to load pricing fields:', error);
      },
    });
  }

  private load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.service.getPricingTemplates({ page: 1, limit: 50 }).subscribe({
      next: (response) => {
        this.items.set(response.data ?? []);
        this.totalItems.set(response.pagination.total);
        this.canLoadAll.set(response.pagination.canLoadAll);
        this.allLoaded.set(response.pagination.total <= 500);
        this.loading.set(false);
      },
      error: (error) => this.handleError(error, this.text.errorLoad),
    });
  }

  private handleError(error: unknown, fallbackKey: string): void {
    console.error('Pricing templates error:', error);
    const apiMessage = String((error as { error?: { message?: string } })?.error?.message || '').toLowerCase();
    const message = apiMessage.includes('duplicate') || apiMessage.includes('already exists') || apiMessage.includes('e11000')
      ? 'A pricing template with the same name already exists.'
      : this.translate.instant(fallbackKey);
    this.errorMessage.set(message);
    this.toast.error(message);
    this.loading.set(false);
  }

  private rebuildText(): void {
    this.columns[0].header = this.translate.instant(this.text.nameLabel);
    this.columns[1].header = this.translate.instant(this.text.descriptionLabel);
    this.columns[2].header = 'Field Group'; // New column for field group
    this.columns[3].header = this.translate.instant(this.text.fieldKeysLabel);
    this.columns[4].header = this.translate.instant(this.text.statusLabel);
    this.columns[5].header = this.translate.instant(this.text.actionsLabel);
    this.columns[5].actionButtons = [
      { label: this.translate.instant(this.text.editAction), actionKey: 'edit', variant: 'secondary' },
      { label: this.translate.instant(this.text.deleteAction), actionKey: 'delete', variant: 'secondary' },
    ];
  }
}
