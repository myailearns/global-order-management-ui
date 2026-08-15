import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { Subscription } from 'rxjs';

import {
  FormControlsModule,
  GomButtonComponent,
} from '@gomlibs/ui';

import {
  FieldInputUpdatePayload,
  PricingEntity,
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

@Component({
  selector: 'gom-simple-pricing-edit-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    FormControlsModule,
    GomButtonComponent,
  ],
  templateUrl: './simple-pricing-edit-modal.component.html',
  styleUrls: ['./simple-pricing-edit-modal.component.scss'],
})
export class SimplePricingEditModalComponent implements OnChanges, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly fieldSubscriptions = new Map<string, Subscription>();

  @Input({ required: true }) entity!: PricingEntity;
  @Input() saving = false;

  @Output() saved = new EventEmitter<SimplePricingEditSavedPayload>();
  @Output() closed = new EventEmitter<void>();

  readonly form = this.fb.nonNullable.group({
    sellingPrice: [0, [Validators.required, Validators.min(0)]],
  });

  readonly formulaFields = signal<FormulaFieldRow[]>([]);
  readonly previewState = signal({ actual: 0, selling: 0, anchor: 0, profit: 0 });

  readonly isGroupEntity = computed(() => {
    const entity = this.entity;
    // Show formula fields if it's a GROUP or if it has resolvedFields (ATTRIBUTE variants)
    return entity?.entityType === 'GROUP' || (entity?.resolvedFields?.length ?? 0) > 0;
  });
  readonly preview = computed(() => this.previewState());

  readonly title = computed(() => {
    const name = this.entity?.displayName || 'Item';
    return `Edit Price - ${name}`;
  });

  ngOnChanges(): void {
    if (!this.entity) return;
    this.clearFormulaFieldState();
    this.form.patchValue(
      { sellingPrice: Number(this.entity.sellingPrice || 0) },
      { emitEvent: false }
    );

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
    this.previewState.set({ actual: 0, selling: Number(this.entity.sellingPrice || 0), anchor: Number(this.entity.anchorPrice || 0), profit: Number(this.entity.affectedProfitPercent || 0) });
  }

  ngOnDestroy(): void {
    this.clearFormulaFieldState();
  }

  onClose(): void {
    this.closed.emit();
  }

  onDialogKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.onClose();
    }
  }


  onSave(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }

    const sellingPrice = Number(this.form.controls.sellingPrice.value || 0);

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

  private clearFormulaFieldState(): void {
    this.fieldSubscriptions.forEach((subscription) => subscription.unsubscribe());
    this.fieldSubscriptions.clear();
    this.formulaFields.set([]);
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
    const baseFieldValue = this.resolveBaseFieldValue(fieldValues);
    let profit = 0;

    if (baseFieldValue > 0) {
      profit = Math.round(((selling - actual) / baseFieldValue) * 1000) / 10;
    } else if (actual > 0) {
      profit = Math.round(((selling - actual) / actual) * 1000) / 10;
    }

    this.previewState.set({
      actual,
      selling,
      anchor,
      profit,
    });
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
