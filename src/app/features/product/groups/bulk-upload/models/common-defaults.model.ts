/**
 * Common Defaults Model
 * Defines the top-level defaults that apply to all rows in bulk upload
 */

import { PricingFormula } from './pricing-formula.model';

/**
 * Business type determines costing logic and field structure
 */
export type BusinessType = 'sales' | 'service';

/**
 * Common defaults apply to all rows in a bulk upload
 * Individual rows can override category and tax profile
 * All other fields are inherited by rows
 */
export interface BulkUploadCommonDefaults {
  /**
   * Optional: Field group to apply to all rows
   * If set, all rows inherit this field structure
   * Rows cannot override this at upload time (set during creation only)
   */
  fieldGroupId?: string | null;

  /**
   * Optional: Default category for all rows
   * Rows can override this per-row using categoryOverride
   */
  categoryId?: string | null;

  /**
   * Label of the category for display purposes
   */
  categoryLabel?: string;

  /**
   * Optional: Default tax profile for all rows
   * Rows can override this per-row using taxProfileOverride
   */
  taxProfileId?: string | null;

  /**
   * Label of the tax profile for display purposes
   */
  taxProfileLabel?: string;

  /**
   * Required: Base unit that all rows must use
   * Cannot be overridden at row level
   */
  baseUnitId: string;

  /**
   * Label of the base unit for display purposes
   */
  baseUnitLabel?: string;

  /**
   * Required: Array of allowed alternate units
   * Rows can use base unit or any of these alternate units
   * Cannot be overridden at row level
   */
  allowedUnitIds: string[];

  /**
   * Labels of allowed units for display purposes
   */
  allowedUnitLabels?: Map<string, string>;

  /**
   * Required: Business type determines costing logic
   * - sales: Standard costing with markup/margin pricing
   * - service: Service-based costing logic
   */
  businessType: BusinessType;

  /**
   * Optional: Pricing formula that applies to all rows
   * Rows can override this per-row using pricingOverride
   */
  pricingFormula?: PricingFormula | null;
}

/**
 * Validates if common defaults are properly configured
 * Returns array of error messages if invalid, empty array if valid
 */
export function validateCommonDefaults(defaults: BulkUploadCommonDefaults): string[] {
  const errors: string[] = [];

  // baseUnitId is required
  if (!defaults.baseUnitId || defaults.baseUnitId.trim().length === 0) {
    errors.push('Base unit is required');
  }

  // allowedUnitIds must have at least one unit
  if (!defaults.allowedUnitIds || defaults.allowedUnitIds.length === 0) {
    errors.push('At least one allowed unit is required');
  }

  // businessType is required and must be valid
  if (!defaults.businessType || !['sales', 'service'].includes(defaults.businessType)) {
    errors.push('Business type must be either "sales" or "service"');
  }

  // Validate category if provided
  if (defaults.categoryId !== null && defaults.categoryId !== undefined) {
    if (typeof defaults.categoryId !== 'string' || defaults.categoryId.trim().length === 0) {
      errors.push('Category ID must be a non-empty string');
    }
  }

  // Validate tax profile if provided
  if (defaults.taxProfileId !== null && defaults.taxProfileId !== undefined) {
    if (typeof defaults.taxProfileId !== 'string' || defaults.taxProfileId.trim().length === 0) {
      errors.push('Tax profile ID must be a non-empty string');
    }
  }

  // Validate field group if provided
  if (defaults.fieldGroupId !== null && defaults.fieldGroupId !== undefined) {
    if (typeof defaults.fieldGroupId !== 'string' || defaults.fieldGroupId.trim().length === 0) {
      errors.push('Field group ID must be a non-empty string');
    }
  }

  return errors;
}

/**
 * Creates a deep clone of common defaults
 */
export function cloneCommonDefaults(defaults: BulkUploadCommonDefaults): BulkUploadCommonDefaults {
  return {
    fieldGroupId: defaults.fieldGroupId,
    categoryId: defaults.categoryId,
    categoryLabel: defaults.categoryLabel,
    taxProfileId: defaults.taxProfileId,
    taxProfileLabel: defaults.taxProfileLabel,
    baseUnitId: defaults.baseUnitId,
    baseUnitLabel: defaults.baseUnitLabel,
    allowedUnitIds: [...defaults.allowedUnitIds],
    allowedUnitLabels: defaults.allowedUnitLabels ? new Map(defaults.allowedUnitLabels) : undefined,
    businessType: defaults.businessType,
    pricingFormula: defaults.pricingFormula ? { ...defaults.pricingFormula } : undefined,
  };
}
