/**
 * Pricing Formula Model
 * Defines the contract for pricing calculation formulas in bulk upload
 */

/**
 * Supported pricing formula types
 */
export type PricingFormulaType = 'markup' | 'margin' | 'custom';

/**
 * Pricing formula configuration
 * Used in both common defaults and per-row overrides
 */
export interface PricingFormula {
  /**
   * Type of pricing formula
   * - markup: Price = Cost * (1 + markup%)
   * - margin: Price = Cost / (1 - margin%)
   * - custom: Custom formula (future enhancement)
   */
  type: PricingFormulaType;

  /**
   * Markup percentage (for markup type)
   * Example: 50 means 50% markup
   */
  markupPercent?: number;

  /**
   * Margin percentage (for margin type)
   * Example: 30 means 30% margin
   */
  marginPercent?: number;

  /**
   * Custom formula expression (for future custom type)
   * Example: "cost * 1.5 + base_fee"
   */
  customExpression?: string;

  /**
   * Optional description/label for this formula
   */
  label?: string;
}

/**
 * Validates if a pricing formula is properly configured
 * Returns true if formula is valid, false otherwise
 */
export function isValidPricingFormula(formula: PricingFormula | null | undefined): boolean {
  if (!formula) {
    return false;
  }

  switch (formula.type) {
    case 'markup':
      return formula.markupPercent !== null && formula.markupPercent !== undefined && formula.markupPercent >= 0;
    case 'margin':
      return formula.marginPercent !== null && formula.marginPercent !== undefined && formula.marginPercent >= 0 && formula.marginPercent < 100;
    case 'custom':
      return !!formula.customExpression && formula.customExpression.trim().length > 0;
    default:
      return false;
  }
}

/**
 * Creates a pricing formula copy with deep cloning
 */
export function clonePricingFormula(formula: PricingFormula): PricingFormula {
  return {
    type: formula.type,
    markupPercent: formula.markupPercent,
    marginPercent: formula.marginPercent,
    customExpression: formula.customExpression,
    label: formula.label,
  };
}
