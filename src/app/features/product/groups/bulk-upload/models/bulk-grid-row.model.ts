/**
 * Bulk Grid Row Model
 * Represents a single row of data in the bulk upload grid
 * Used for both Create and Update modes
 */

import { PricingFormula } from './pricing-formula.model';

/**
 * Row-level override for pricing formula
 * Used instead of common defaults formula if provided
 */
export interface RowPricingOverride {
  /**
   * If true, use this formula instead of common defaults
   */
  useOverride: boolean;

  /**
   * The pricing formula to use (when useOverride is true)
   */
  formula?: PricingFormula | null;
}

/**
 * Field value for a dynamic field
 * Field groups define which fields are applicable to a group
 */
export interface FieldValue {
  /**
   * ID of the field
   */
  fieldId: string;

  /**
   * Unique key of the field (for reference)
   */
  fieldKey: string;

  /**
   * Current value of the field
   * Type depends on the field definition
   */
  value: string | number | boolean | null;

  /**
   * Whether this field is required
   * Determined by field group definition
   */
  isRequired: boolean;
}

/**
 * Media reference in a row
 * Can be an image or video
 */
export interface RowMedia {
  /**
   * ID of the media file
   */
  mediaId: string;

  /**
   * Type of media: image or video
   */
  mediaType: 'image' | 'video';

  /**
   * URL or path to the media
   */
  mediaUrl: string;

  /**
   * Original filename
   */
  fileName?: string;

  /**
   * File size in bytes
   */
  fileSizeBytes?: number;
}

/**
 * Grid row data for Create mode
 * Represents a new product group to be created
 */
export interface BulkCreateGridRow {
  /**
   * Unique identifier within the grid (0-based index or UUID)
   * Used for tracking and error reporting
   */
  rowId: string;

  /**
   * Required: Name of the product group
   * Must be unique within the category
   */
  groupName: string;

  /**
   * Optional: External code for the product group
   * Useful for external system integration
   */
  externalCode?: string | null;

  /**
   * Optional: Override the category from common defaults
   * If not provided, uses categoryId from common defaults
   * If common defaults has no category, must be provided
   */
  categoryOverride?: string | null;

  /**
   * Label of the overridden category (for display)
   */
  categoryOverrideLabel?: string;

  /**
   * Optional: Override the tax profile from common defaults
   * If not provided, uses taxProfileId from common defaults
   * If common defaults has no tax profile, must be provided
   */
  taxProfileOverride?: string | null;

  /**
   * Label of the overridden tax profile (for display)
   */
  taxProfileOverrideLabel?: string;

  /**
   * Optional: Description of the product group
   * Internal use only, not shown to customers
   */
  description?: string | null;

  /**
   * Optional: Whether this group is active
   * Inactive groups don't appear in customer app
   * Default: true
   */
  isActive?: boolean;

  /**
   * Optional: Primary media (image or video) for this group
   * Can be set/updated after creation
   */
  media?: RowMedia | null;

  /**
   * Optional: Override pricing formula for this row
   * If not provided, uses formula from common defaults
   */
  pricingOverride?: RowPricingOverride | null;

  /**
   * Optional: Field values for this row
   * Only present if field group is selected in common defaults
   * Maps field key to field value
   */
  fieldValues?: Map<string, FieldValue> | null;

  /**
   * Validation errors for this row (computed at upload time)
   */
  validationErrors?: string[];
}

/**
 * Grid row data for Update mode
 * Represents updates to an existing product group
 */
export interface BulkUpdateGridRow {
  /**
   * Unique identifier within the grid (0-based index or UUID)
   * Used for tracking and error reporting
   */
  rowId: string;

  /**
   * Required: External code to identify the product group to update
   * Used to match against existing groups
   */
  externalCode: string;

  /**
   * Optional: Override the category for this group
   * If provided, updates the group's category
   */
  categoryOverride?: string | null;

  /**
   * Label of the overridden category (for display)
   */
  categoryOverrideLabel?: string;

  /**
   * Optional: Override the tax profile for this group
   * If provided, updates the group's tax profile
   */
  taxProfileOverride?: string | null;

  /**
   * Label of the overridden tax profile (for display)
   */
  taxProfileOverrideLabel?: string;

  /**
   * Optional: Update description of the product group
   */
  description?: string | null;

  /**
   * Optional: Update whether this group is active
   */
  isActive?: boolean | null;

  /**
   * Optional: Update primary media (image or video) for this group
   */
  media?: RowMedia | null;

  /**
   * Optional: Override pricing formula for this row
   * If provided, updates the group's pricing
   */
  pricingOverride?: RowPricingOverride | null;

  /**
   * Optional: Updated field values for this row
   * Only applicable if field group is set on the group
   * Maps field key to updated field value
   */
  fieldValues?: Map<string, FieldValue> | null;

  /**
   * Validation errors for this row (computed at upload time)
   */
  validationErrors?: string[];
}

/**
 * Union type for any grid row
 */
export type BulkGridRow = BulkCreateGridRow | BulkUpdateGridRow;

/**
 * Type guard to check if row is a Create row
 */
export function isCreateRow(row: BulkGridRow): row is BulkCreateGridRow {
  return 'groupName' in row;
}

/**
 * Type guard to check if row is an Update row
 */
export function isUpdateRow(row: BulkGridRow): row is BulkUpdateGridRow {
  return 'externalCode' in row && !('groupName' in row);
}

/**
 * Validates a create row
 * Returns array of validation errors (empty if valid)
 */
export function validateCreateRow(row: BulkCreateGridRow, requireCategoryAndTaxProfile: boolean): string[] {
  const errors: string[] = [];

  // Group name is required
  if (!row.groupName || row.groupName.trim().length === 0) {
    errors.push(`[Row ${row.rowId}] Group name is required`);
  } else if (row.groupName.length < 2) {
    errors.push(`[Row ${row.rowId}] Group name must be at least 2 characters`);
  } else if (row.groupName.length > 100) {
    errors.push(`[Row ${row.rowId}] Group name cannot exceed 100 characters`);
  }

  // External code if provided must be alphanumeric
  if (row.externalCode && !/^[a-zA-Z0-9_-]+$/.test(row.externalCode)) {
    errors.push(`[Row ${row.rowId}] External code must be alphanumeric (letters, numbers, dash, underscore)`);
  }

  // Category must be provided if required and not provided
  if (requireCategoryAndTaxProfile) {
    if (!row.categoryOverride) {
      errors.push(`[Row ${row.rowId}] Category is required`);
    }
  }

  // Tax profile must be provided if required and not provided
  if (requireCategoryAndTaxProfile) {
    if (!row.taxProfileOverride) {
      errors.push(`[Row ${row.rowId}] Tax profile is required`);
    }
  }

  return errors;
}

/**
 * Validates an update row
 * Returns array of validation errors (empty if valid)
 */
export function validateUpdateRow(row: BulkUpdateGridRow): string[] {
  const errors: string[] = [];

  // External code is required
  if (!row.externalCode || row.externalCode.trim().length === 0) {
    errors.push(`[Row ${row.rowId}] External code is required`);
  } else if (!/^[a-zA-Z0-9_-]+$/.test(row.externalCode)) {
    errors.push(`[Row ${row.rowId}] External code must be alphanumeric`);
  }

  return errors;
}
