/**
 * Bulk Upload Payload Models
 * Defines the contracts for Create and Update mode payloads
 * These are sent to the API for processing
 */

import { BulkUploadCommonDefaults } from './common-defaults.model';
import { BulkCreateGridRow, BulkUpdateGridRow } from './bulk-grid-row.model';
import { PricingFormula } from './pricing-formula.model';

/**
 * Type for dynamic field values
 */
type DynamicFieldValues = Record<string, string | number | boolean | undefined>;

/**
 * Payload for Create mode bulk upload
 * Sent to API to create multiple new product groups
 */
export interface BulkCreatePayload {
  /**
   * Mode indicator: always 'create' for this payload
   */
  mode: 'create';

  /**
   * Common defaults that apply to all rows
   * Rows inherit these values unless overridden
   */
  commonDefaults: BulkUploadCommonDefaults;

  /**
   * Array of rows to create
   * Each row represents a new product group
   */
  rows: BulkCreatePayloadRow[];

  /**
   * Optional metadata
   */
  metadata?: {
    /**
     * ISO timestamp when upload was initiated
     */
    uploadedAt?: string;

    /**
     * User ID who initiated the upload
     */
    uploadedBy?: string;

    /**
     * Optional batch reference for tracking
     */
    batchReference?: string;
  };
}

/**
 * Single row in Create payload
 * Flattened structure for API consumption
 */
export interface BulkCreatePayloadRow {
  /**
   * Unique row identifier from grid
   */
  rowId?: string;

  /**
   * Required: Name of the product group
   */
  groupName: string;

  /**
   * Optional: External code for integration
   */
  externalCode?: string;

  /**
   * Optional: Category override for this row
   * Uses commonDefaults.categoryId if not provided
   */
  categoryId?: string;

  /**
   * Optional: Tax profile override for this row
   * Uses commonDefaults.taxProfileId if not provided
   */
  taxProfileId?: string;

  /**
   * Optional: Description
   */
  description?: string;

  /**
   * Optional: Whether active (default: true)
   */
  isActive?: boolean;

  /**
   * Optional: Media ID (image/video) for this row
   */
  mediaId?: string;

  /**
   * Optional: Pricing formula override for this row
   * Uses commonDefaults.pricingFormula if not provided
   */
  pricingFormula?: PricingFormula;

  /**
   * Optional: Dynamic field values
   * Only present if field group is set in commonDefaults
   * Maps fieldKey to value in stringified form
   */
  dynamicFieldValues?: DynamicFieldValues;
}

/**
 * Payload for Update mode bulk upload
 * Sent to API to update existing product groups
 */
export interface BulkUpdatePayload {
  /**
   * Mode indicator: always 'update' for this payload
   */
  mode: 'update';

  /**
   * Optional: Field group filter
   * If provided, only updates groups with this field group
   * If not provided, all groups can be updated
   */
  fieldGroupFilter?: string;

  /**
   * Array of rows to update
   * Each row targets an existing product group by external code
   */
  rows: BulkUpdatePayloadRow[];

  /**
   * Optional metadata
   */
  metadata?: {
    /**
     * ISO timestamp when upload was initiated
     */
    uploadedAt?: string;

    /**
     * User ID who initiated the upload
     */
    uploadedBy?: string;

    /**
     * Optional batch reference for tracking
     */
    batchReference?: string;
  };
}

/**
 * Single row in Update payload
 * Flattened structure for API consumption
 */
export interface BulkUpdatePayloadRow {
  /**
   * Unique row identifier from grid
   */
  rowId?: string;

  /**
   * Required: External code to identify the group to update
   */
  externalCode: string;

  /**
   * Optional: New category for this group
   */
  categoryId?: string;

  /**
   * Optional: New tax profile for this group
   */
  taxProfileId?: string;

  /**
   * Optional: Updated description
   */
  description?: string;

  /**
   * Optional: Updated active status
   */
  isActive?: boolean;

  /**
   * Optional: Updated media ID
   */
  mediaId?: string;

  /**
   * Optional: Updated pricing formula
   */
  pricingFormula?: PricingFormula;

  /**
   * Optional: Updated dynamic field values
   * Maps fieldKey to updated value in stringified form
   */
  dynamicFieldValues?: DynamicFieldValues;
}

/**
 * Union type for any bulk upload payload
 */
export type BulkUploadPayload = BulkCreatePayload | BulkUpdatePayload;

/**
 * Type guard to check if payload is Create payload
 */
export function isCreatePayload(payload: BulkUploadPayload): payload is BulkCreatePayload {
  return payload.mode === 'create';
}

/**
 * Type guard to check if payload is Update payload
 */
export function isUpdatePayload(payload: BulkUploadPayload): payload is BulkUpdatePayload {
  return payload.mode === 'update';
}

/**
 * Converts grid row data to create payload row
 */
export function gridRowToCreatePayloadRow(gridRow: BulkCreateGridRow): BulkCreatePayloadRow {
  const dynamicFieldValues: DynamicFieldValues = {};

  if (gridRow.fieldValues) {
    gridRow.fieldValues.forEach((field, key) => {
      const value = field.value ?? undefined;
      dynamicFieldValues[key] = value;
    });
  }

  return {
    rowId: gridRow.rowId,
    groupName: gridRow.groupName,
    externalCode: gridRow.externalCode || undefined,
    categoryId: gridRow.categoryOverride || undefined,
    taxProfileId: gridRow.taxProfileOverride || undefined,
    description: gridRow.description || undefined,
    isActive: gridRow.isActive ?? true,
    mediaId: gridRow.media?.mediaId,
    pricingFormula: gridRow.pricingOverride?.formula || undefined,
    dynamicFieldValues: Object.keys(dynamicFieldValues).length > 0 ? dynamicFieldValues : undefined,
  };
}

/**
 * Converts grid row data to update payload row
 */
export function gridRowToUpdatePayloadRow(gridRow: BulkUpdateGridRow): BulkUpdatePayloadRow {
  const dynamicFieldValues: DynamicFieldValues = {};

  if (gridRow.fieldValues) {
    gridRow.fieldValues.forEach((field, key) => {
      const value = field.value ?? undefined;
      dynamicFieldValues[key] = value;
    });
  }

  return {
    rowId: gridRow.rowId,
    externalCode: gridRow.externalCode,
    categoryId: gridRow.categoryOverride || undefined,
    taxProfileId: gridRow.taxProfileOverride || undefined,
    description: gridRow.description || undefined,
    isActive: gridRow.isActive ?? undefined,
    mediaId: gridRow.media?.mediaId,
    pricingFormula: gridRow.pricingOverride?.formula || undefined,
    dynamicFieldValues: Object.keys(dynamicFieldValues).length > 0 ? dynamicFieldValues : undefined,
  };
}
