import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { Subscription } from 'rxjs';

import {
  FormControlsModule,
  GomButtonComponent,
  GomModalComponent,
} from '@gomlibs/ui';

import {
  FieldInputUpdatePayload,
  PricingEntity,
  SimplePricingService,
  SimplePricingVariant,
} from '../simple-pricing.service';

export interface SimplePricingEditSavedPayload {
  reason: string;
  sellingPrice?: number;
  groupFieldValues?: Array<{ fieldId: string; value: number }>;
  fieldPayload?: FieldInputUpdatePayload;
}

interface FormulaFieldRow {
  fieldId: string;
  key: string;
  label: string;
  control: FormControl<string>;
}

interface LandedCostRow {
  fieldId: string;
  label: string;
  value: number;
  control: FormControl<string> | null;
}

interface DerivedCostRow {
  variantId: string;
  packSize: string;
  calculationRule: string;
  oldCost: number | null;
  newCost: number | null;
  status: string;
}

@Component({
  selector: 'gom-simple-pricing-edit-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    FormControlsModule,
    GomButtonComponent,
    GomModalComponent,
  ],
  templateUrl: './simple-pricing-edit-modal.component.html',
  styleUrls: ['./simple-pricing-edit-modal.component.scss'],
})
export class SimplePricingEditModalComponent implements OnChanges, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(SimplePricingService);
  private readonly fieldSubscriptions = new Map<string, Subscription>();
  private readonly sellingPriceSubscription: Subscription;
  private derivedVariantsSubscription: Subscription | null = null;

  @Input({ required: true }) entity!: PricingEntity;
  @Input() saving = false;

  @Output() saved = new EventEmitter<SimplePricingEditSavedPayload>();
  @Output() closed = new EventEmitter<void>();

  readonly form = this.fb.nonNullable.group({
    sellingPrice: ['', [Validators.required]],
  });

  readonly formulaFields = signal<FormulaFieldRow[]>([]);
  readonly previewState = signal({ actual: 0, formulaSelling: 0, anchor: 0 });
  readonly desiredSellingPrice = signal(0);
  readonly derivedVariants = signal<SimplePricingVariant[]>([]);
  readonly derivedVariantsLoading = signal(false);

  readonly isGroupEntity = computed(() => {
    const entity = this.entity;
    // Show formula fields if it's a GROUP or if it has resolvedFields (ATTRIBUTE variants)
    return entity?.entityType === 'GROUP' || (entity?.resolvedFields?.length ?? 0) > 0;
  });
  readonly preview = computed(() => this.previewState());

  readonly title = computed(() => {
    return 'Edit Product Pricing';
  });

  readonly groupTypeLabel = computed(() => {
    const groupType = String(this.entity?.groupType || '').toLowerCase();
    if (!groupType) {
      return '';
    }

    return groupType.charAt(0).toUpperCase() + groupType.slice(1);
  });

  readonly skuLabel = computed(() => this.entity?.variant?.sku || 'Not assigned');

  readonly landedCostRows = computed<LandedCostRow[]>(() => {
    const rows = this.formulaFields();
    if (rows.length > 0) {
      return rows.map((row) => {
        const numeric = this.parseDecimalInput(row.control.value);
        return {
          fieldId: row.fieldId,
          label: row.label,
          value: numeric,
          control: row.control,
        };
      });
    }

    const fallbackCost = Number(this.entity?.actualPrice || 0);
    if (fallbackCost <= 0) {
      return [];
    }

    return [{
      fieldId: 'actualPrice',
      label: 'Landed Cost',
      value: fallbackCost,
      control: null,
    }];
  });

  readonly totalCost = computed(() => {
    const costFromFormula = this.preview().actual;
    if (costFromFormula > 0) {
      return costFromFormula;
    }

    const fallback = Number(this.entity?.actualPrice || 0);
    return Math.max(0, fallback);
  });

  readonly resultingNetProfit = computed<number | null>(() => {
    const totalCost = this.totalCost();
    const desired = this.desiredSellingPrice();
    if (!Number.isFinite(desired) || desired <= 0 || totalCost <= 0) {
      return null;
    }

    return desired - totalCost;
  });

  readonly resultingMargin = computed<number | null>(() => {
    const desired = this.desiredSellingPrice();
    const netProfit = this.resultingNetProfit();
    if (netProfit === null || desired <= 0) {
      return null;
    }

    return (netProfit / desired) * 100;
  });

  readonly currentMargin = computed<number | null>(() => {
    const current = this.entity?.affectedProfitPercent;
    if (current === null || current === undefined || !Number.isFinite(current)) {
      return null;
    }

    return Number(current);
  });

  readonly recommendedSellingPrice = computed<number | null>(() => {
    const totalCost = this.totalCost();
    if (totalCost <= 0) {
      return null;
    }

    const configuredProfitPercent = Number(this.entity?.definedProfitPercent ?? 20);
    const targetProfitPercent = Number.isFinite(configuredProfitPercent) ? configuredProfitPercent : 20;
    if (targetProfitPercent < -100) {
      return null;
    }

    const recommended = totalCost * (1 + (targetProfitPercent / 100));
    if (!Number.isFinite(recommended) || recommended <= 0) {
      return null;
    }

    return Math.round(recommended * 100) / 100;
  });

  readonly recommendationSummary = computed(() => {
    const recommended = this.recommendedSellingPrice();
    return recommended === null
      ? 'Recommendation unavailable for this item.'
      : `Recommended Price Suggestion: ${this.formatCurrency(recommended)}`;
  });

  readonly recommendationDetail = computed(() => {
    const recommended = this.recommendedSellingPrice();
    if (recommended === null) {
      return 'Set a valid cost and selling price to calculate recommendation.';
    }

    const totalCost = this.totalCost();
    const targetProfitPercent = Number(this.entity?.definedProfitPercent ?? 20);
    const targetProfit = recommended - totalCost;
    return `Achieves target profit of ${targetProfitPercent.toFixed(1)}% on cost (Profit: ${this.formatCurrency(targetProfit)}).`;
  });

  readonly derivedCostRows = computed<DerivedCostRow[]>(() => {
    const variants = this.derivedVariants();
    if (!variants.length) {
      return [];
    }

    const baseVariantId = this.resolveBaseVariantId(variants);
    const selectedVariantId = this.entity?.variant?._id;
    const totalCost = this.totalCost();

    return variants
      .filter((variant) => variant._id !== baseVariantId)
      .filter((variant) => variant._id !== selectedVariantId)
      .map((variant) => {
        const multiplier = this.resolveVariantMultiplier(variant);
        const oldCost = this.resolveVariantCost(variant);
        const newCost = totalCost > 0 ? this.roundToTwo(totalCost * multiplier) : null;
        const packSize = String(variant.name || '').trim()
          || this.fallbackPackSize(variant)
          || 'Derived Variant';

        return {
          variantId: variant._id,
          packSize,
          calculationRule: `Base Cost × ${multiplier.toFixed(2)}`,
          oldCost,
          newCost,
          status: 'Auto-calculated',
        };
      });
  });

  readonly showDerivedCostingSection = computed(() => {
    const type = this.entity?.groupType;
    return (type === 'MEASURED' || type === 'HYBRID')
      && (this.derivedVariantsLoading() || this.derivedCostRows().length > 0);
  });

  readonly sellingPriceError = computed(() => {
    const control = this.form.controls.sellingPrice;
    if (!control.touched && !control.dirty) {
      return '';
    }

    const parsed = this.parseDecimalInput(control.value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return 'Enter a valid selling price greater than 0';
    }

    return '';
  });

  constructor() {
    this.sellingPriceSubscription = this.form.controls.sellingPrice.valueChanges.subscribe((value) => {
      this.desiredSellingPrice.set(this.parseDecimalInput(value));
    });
  }

  ngOnChanges(): void {
    if (!this.entity) return;
    this.clearFormulaFieldState();
    this.syncDerivedVariantsPreview();
    const initialSellingPrice = this.formatMoneyInput(this.entity.sellingPrice);
    this.form.patchValue(
      { sellingPrice: initialSellingPrice },
      { emitEvent: false }
    );
    this.desiredSellingPrice.set(this.parseDecimalInput(initialSellingPrice));

    if (this.isGroupEntity()) {
      const rows = (this.entity.resolvedFields || []).map((field) => {
        const control = new FormControl(String(field.value ?? 0), {
          nonNullable: true,
          validators: [Validators.required],
        });
        const subscription = control.valueChanges.subscribe(() => this.recalculatePreview());
        this.fieldSubscriptions.set(field.fieldId, subscription);
        return {
          fieldId: field.fieldId,
          key: field.key,
          label: this.humanizeLabel(field.key),
          control,
        };
      });
      this.formulaFields.set(rows);
      this.recalculatePreview();
      return;
    }

    this.formulaFields.set([]);
    this.previewState.set({
      actual: Number(this.entity.actualPrice || 0),
      formulaSelling: Number(this.entity.sellingPrice || 0),
      anchor: Number(this.entity.anchorPrice || 0),
    });
  }

  ngOnDestroy(): void {
    this.sellingPriceSubscription.unsubscribe();
    this.clearFormulaFieldState();
    this.derivedVariantsSubscription?.unsubscribe();
  }

  onClose(): void {
    this.closed.emit();
  }

  onSave(): void {
    this.form.markAllAsTouched();
    const sellingPrice = this.parseDecimalInput(this.form.controls.sellingPrice.value);
    if (this.form.invalid || !Number.isFinite(sellingPrice) || sellingPrice <= 0) {
      return;
    }

    const formulaFieldValues = this.formulaFields().map((row) => ({
      fieldId: row.fieldId,
      key: row.key,
      value: Number(row.control.value || 0),
    }));

    if (this.entity?.entityType === 'VARIANT' && this.entity.variant) {
      const fieldOverrides = formulaFieldValues.reduce((acc, row) => {
        acc[row.key] = row.value;
        return acc;
      }, {} as Record<string, number>);

      this.saved.emit({
        reason: 'Reset to formula price',
        fieldPayload: {
          variantId: this.entity.variant._id,
          quantity: Number(this.entity.variant.quantity || 0),
          unitId: this.entity.variant.unitId,
          additionalPrice: Number(this.entity.variant.additionalPrice || 0),
          pricingMode: 'FORMULA',
          clearOverride: true,
          reason: 'Reset to formula price',
          fieldOverrides,
        },
      });
      return;
    }

    const groupFieldValues = this.isGroupEntity()
      ? formulaFieldValues.map(({ fieldId, value }) => ({ fieldId, value }))
      : [];

    this.saved.emit({
      reason: '',
      sellingPrice,
      groupFieldValues,
    });
  }


  applyRecommendedPrice(): void {
    const recommended = this.recommendedSellingPrice();
    if (recommended === null) {
      return;
    }

    const formatted = this.formatMoneyInput(recommended);
    this.form.controls.sellingPrice.setValue(formatted);
    this.form.controls.sellingPrice.markAsDirty();
    this.form.controls.sellingPrice.markAsTouched();
  }
  private clearFormulaFieldState(): void {
    this.fieldSubscriptions.forEach((subscription) => subscription.unsubscribe());
    this.fieldSubscriptions.clear();
    this.formulaFields.set([]);
  }

  private syncDerivedVariantsPreview(): void {
    this.derivedVariantsSubscription?.unsubscribe();
    this.derivedVariantsSubscription = null;
    this.derivedVariants.set([]);

    const type = this.entity?.groupType;
    if (type !== 'MEASURED' && type !== 'HYBRID') {
      this.derivedVariantsLoading.set(false);
      return;
    }

    const groupId = this.entity?.entityType === 'GROUP'
      ? this.entity.entityId
      : String(this.entity?.group?._id || '').trim();
    if (!groupId) {
      this.derivedVariantsLoading.set(false);
      return;
    }

    this.derivedVariantsLoading.set(true);
    this.derivedVariantsSubscription = this.fetchAllGroupVariants(groupId, 1, []);
  }

  private fetchAllGroupVariants(
    groupId: string,
    page: number,
    collected: SimplePricingVariant[]
  ): Subscription {
    return this.service.listVariantsByGroup(groupId, { page, limit: 100 }).subscribe({
      next: (response) => {
        const currentPageRows = response.data ?? [];
        const nextCollected = [...collected, ...currentPageRows];
        if (response.pagination?.hasMore) {
          this.derivedVariantsSubscription = this.fetchAllGroupVariants(groupId, page + 1, nextCollected);
          return;
        }

        this.derivedVariants.set(nextCollected);
        this.derivedVariantsLoading.set(false);
      },
      error: () => {
        this.derivedVariants.set([]);
        this.derivedVariantsLoading.set(false);
      },
    });
  }

  private resolveBaseVariantId(variants: SimplePricingVariant[]): string | null {
    if (!variants.length) {
      return null;
    }

    const baseCandidate = [...variants].sort((a, b) => {
      const aDelta = Math.abs(this.resolveVariantMultiplier(a) - 1);
      const bDelta = Math.abs(this.resolveVariantMultiplier(b) - 1);
      if (aDelta !== bDelta) {
        return aDelta - bDelta;
      }

      return this.resolveVariantMultiplier(a) - this.resolveVariantMultiplier(b);
    })[0];

    return baseCandidate?._id ?? null;
  }

  private resolveVariantMultiplier(variant: SimplePricingVariant): number {
    const raw = Number(variant.convertedQuantity ?? 0);
    if (Number.isFinite(raw) && raw > 0) {
      return raw;
    }

    return 1;
  }

  private resolveVariantCost(variant: SimplePricingVariant): number | null {
    const raw = variant.effectivePrice?.actualPrice ?? variant.price?.actualPrice;
    if (raw === null || raw === undefined) {
      return null;
    }

    const numeric = Number(raw);
    return Number.isFinite(numeric) ? numeric : null;
  }

  private fallbackPackSize(variant: SimplePricingVariant): string {
    const quantity = Number(variant.quantity || 0);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return '';
    }

    const unit = String(variant.unitId || '').trim();
    return unit ? `${quantity} ${unit}` : String(quantity);
  }

  private roundToTwo(value: number): number {
    return Math.round(value * 100) / 100;
  }

  private recalculatePreview(): void {
    if (!this.entity || !this.isGroupEntity()) {
      return;
    }

    const fieldValues = this.formulaFields().reduce((acc, row) => {
      const numericValue = Number(row.control.value || 0);
      if (Number.isFinite(numericValue)) {
        acc[row.key] = numericValue;
      }
      return acc;
    }, {} as Record<string, number>);

    const actual = this.evaluateFormula(this.entity?.group?.formula?.actualPrice || '', fieldValues);
    const selling = this.evaluateFormula(this.entity?.group?.formula?.sellingPrice || '', {
      ...fieldValues,
      actualPrice: actual,
      actual_price: actual,
    });
    const anchor = this.evaluateFormula(this.entity?.group?.formula?.anchorPrice || '', {
      ...fieldValues,
      actualPrice: actual,
      actual_price: actual,
      sellingPrice: selling,
      selling_price: selling,
    });
    this.previewState.set({
      actual,
      formulaSelling: selling,
      anchor,
    });
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }

  formatPercent(value: number | null): string {
    if (value === null || !Number.isFinite(value)) {
      return '—';
    }

    return `${value.toFixed(1)}%`;
  }

  formatMoneyInput(value: number): string {
    if (!Number.isFinite(value)) {
      return '';
    }

    return (Math.round(value * 100) / 100).toFixed(2);
  }

  private parseDecimalInput(value: string | number | null | undefined): number {
    const normalized = String(value ?? '').trim();
    if (!normalized) {
      return Number.NaN;
    }

    const parseTarget = normalized.includes('.') && normalized.includes(',')
      ? normalized.replaceAll(',', '')
      : normalized.replace(',', '.');
    const parsed = Number(parseTarget);
    return Number.isFinite(parsed) ? parsed : Number.NaN;
  }

  private resolveBaseFieldValue(fieldValues: Record<string, number>): number {
    const baseFieldKey = this.extractBaseFieldKey(this.entity?.group?.formula?.actualPrice || '');
    if (baseFieldKey && Number.isFinite(fieldValues[baseFieldKey])) {
      return Number(fieldValues[baseFieldKey]);
    }

    const fallback = ['buyPrice', 'buy_price', 'basePrice', 'costPrice']
      .map((key) => fieldValues[key])
      .find((value) => Number.isFinite(value));
    return Number(fallback || 0);
  }

  private extractBaseFieldKey(actualPriceFormula: string): string | null {
    const formula = String(actualPriceFormula || '').trim();
    if (!formula) {
      return null;
    }

    const firstPart = formula.split('+').map((part) => part.trim()).find((part) => part.length > 0) || '';
    const keyRegex = /[A-Za-z_]\w*/;
    const match = keyRegex.exec(firstPart);
    return match ? match[0] : null;
  }

  private humanizeLabel(key: string): string {
    const labelByKey: Record<string, string> = {
      buyPrice: 'Purchase Price',
      buy_price: 'Purchase Price',
      transportCost: 'Transport Cost',
      transport_cost: 'Transport Cost',
      packagingCost: 'Packaging Cost',
      packaging_cost: 'Packaging Cost',
      labourCost: 'Labour Cost',
      labour_cost: 'Labour Cost',
      laborCost: 'Labour Cost',
      labor_cost: 'Labour Cost',
    };

    if (labelByKey[key]) {
      return labelByKey[key];
    }

    return String(key || '')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, (match) => match.toUpperCase())
      .trim() || key;
  }

  private evaluateFormula(expression: string, context: Record<string, number>): number {
    const formula = String(expression || '').trim();
    if (!formula) return 0;
    if (!/^[a-zA-Z0-9_+\-*/().%\s]+$/.test(formula)) return 0;

    try {
      const normalized = this.normalizePercentSyntax(formula);
      const numeric = this.evaluateExpression(normalized, context);
      return Number.isFinite(numeric) ? Math.round(numeric * 100) / 100 : 0;
    } catch {
      return 0;
    }
  }

  private normalizePercentSyntax(expression: string): string {
    let result = '';
    let index = 0;

    while (index < expression.length) {
      const char = expression[index];

      if (/\d/.test(char)) {
        let end = index + 1;
        while (end < expression.length && /[\d.]/.test(expression[end])) {
          end += 1;
        }

        let next = end;
        while (next < expression.length && /\s/.test(expression[next])) {
          next += 1;
        }

        const numberText = expression.slice(index, end);
        if (expression[next] === '%') {
          result += `(${numberText}/100)`;
          index = next + 1;
          continue;
        }

        result += numberText;
        index = end;
        continue;
      }

      result += char;
      index += 1;
    }

    return result;
  }

  private evaluateExpression(expression: string, context: Record<string, number>): number {
    let index = 0;

    const parseExpression = (): number => {
      let value = parseTerm();
      while (true) {
        skipWhitespace();
        const operator = expression[index];
        if (operator !== '+' && operator !== '-') {
          break;
        }
        index += 1;
        const nextValue = parseTerm();
        value = operator === '+' ? value + nextValue : value - nextValue;
      }
      return value;
    };

    const parseTerm = (): number => {
      let value = parseFactor();
      while (true) {
        skipWhitespace();
        const operator = expression[index];
        if (operator !== '*' && operator !== '/') {
          break;
        }
        index += 1;
        const nextValue = parseFactor();
        if (operator === '*') {
          value = value * nextValue;
        } else {
          value = nextValue === 0 ? 0 : value / nextValue;
        }
      }
      return value;
    };

    const parseFactor = (): number => {
      skipWhitespace();
      const operator = expression[index];
      if (operator === '+' || operator === '-') {
        index += 1;
        const value = parseFactor();
        return operator === '-' ? -value : value;
      }
      return parsePrimary();
    };

    const parsePrimary = (): number => {
      skipWhitespace();
      const char = expression[index];
      if (char === '(') {
        index += 1;
        const value = parseExpression();
        skipWhitespace();
        if (expression[index] === ')') {
          index += 1;
        }
        return value;
      }

      if (/[a-zA-Z_]/.test(char || '')) {
        let end = index + 1;
        while (end < expression.length && /\w/.test(expression[end])) {
          end += 1;
        }
        const key = expression.slice(index, end);
        index = end;
        return Number(context[key] ?? 0) || 0;
      }

      if (/[0-9.]/.test(char || '')) {
        let end = index + 1;
        while (end < expression.length && /[0-9.]/.test(expression[end])) {
          end += 1;
        }
        const raw = expression.slice(index, end);
        index = end;
        const numeric = Number(raw);
        return Number.isFinite(numeric) ? numeric : 0;
      }

      index += 1;
      return 0;
    };

    const skipWhitespace = (): void => {
      while (index < expression.length && /\s/.test(expression[index])) {
        index += 1;
      }
    };

    const result = parseExpression();
    return Number.isFinite(result) ? result : 0;
  }
}
