/**
 * Category Defaults Models
 * Defines the data structures for category-level default configurations
 */

export interface CategoryDefaults {
  id?: string;
  categoryId: string;
  categoryName: string;
  attributeDefaults: AttributeDefault[];
  priceDefaults: Record<string, any>;
  inventoryDefaults: Record<string, any>;
  complianceDefaults: Record<string, any>;
  metadata: Record<string, any>;
  applicableToSubcategories: boolean;
  templateId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AttributeDefault {
  attributeId: string;
  attributeName: string;
  defaultValue?: any;
  isRequired: boolean;
  dataType: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object';
  validationRules?: ValidationRule[];
  metadata?: Record<string, any>;
}

export interface ValidationRule {
  type: 'required' | 'pattern' | 'min' | 'max' | 'enum' | 'custom';
  value?: any;
  message?: string;
}

export interface PriceDefault {
  priceType: string;
  basePrice?: number;
  markupPercentage?: number;
  discountPercentage?: number;
  taxProfile?: string;
  pricingTemplate?: string;
  currency?: string;
}

export interface InventoryDefault {
  warehouseId?: string;
  minStockLevel: number;
  maxStockLevel: number;
  reorderLevel: number;
  reorderQuantity: number;
  stockUnit: string;
  trackingMethod: 'quantity' | 'serial' | 'batch';
  batchTrackingRequired: boolean;
  expiryTrackingRequired: boolean;
}

export interface ComplianceDefault {
  requiresGSTIN: boolean;
  requiresHSNCode: boolean;
  requiresSACCode: boolean;
  requiresCertification: boolean;
  certificationTypes?: string[];
  requiresLicense: boolean;
  licenseTypes?: string[];
  regulatoryRequirements?: string[];
}

export interface DefaultsSearchFilter {
  search?: string;
  module?: string;
  categoryId?: string;
  applicableToSubcategories?: boolean;
  templateId?: string;
}

export interface CategoryDefaultTemplate {
  id: string;
  name: string;
  description?: string;
  attributeDefaults: AttributeDefault[];
  priceDefaults: Record<string, any>;
  inventoryDefaults: Record<string, any>;
  complianceDefaults: Record<string, any>;
  isPublished: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  previewData?: CategoryDefaults[];
}

export interface CategoryDefaultsExportData {
  version: string;
  exportDate: Date;
  totalCount: number;
  defaults: CategoryDefaults[];
  templates?: CategoryDefaultTemplate[];
}

export interface CategoryDefaultsBulkOperation {
  operationType: 'create' | 'update' | 'delete' | 'apply-template';
  categoryIds: string[];
  templateId?: string;
  defaultsData?: Partial<CategoryDefaults>;
}

export interface CategoryDefaultsQuickCreate {
  categoryId: string;
  categoryName: string;
  templateId: string;
  overrides?: Partial<CategoryDefaults>;
  applicableToSubcategories: boolean;
}

export interface DefaultsChangeLog {
  id: string;
  categoryDefaultsId: string;
  changeType: 'create' | 'update' | 'delete' | 'template-applied';
  changedFields?: {
    [key: string]: {
      oldValue: any;
      newValue: any;
    };
  };
  changedBy: string;
  changedAt: Date;
}

export interface DefaultsAuditEvent {
  id: string;
  eventType: 'view' | 'create' | 'update' | 'delete' | 'export' | 'bulk-operation';
  categoryDefaultsId?: string;
  userId: string;
  details: Record<string, any>;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
}
