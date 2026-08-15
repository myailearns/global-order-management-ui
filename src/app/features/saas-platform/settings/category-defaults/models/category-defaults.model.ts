export type GroupType = 'MEASURED' | 'ATTRIBUTE' | 'HYBRID';
export type PricingRefreshMode = 'FIXED' | 'MANUAL_REFRESH' | 'AUTO_REFRESH';
export type ActiveStatus = 'ACTIVE' | 'INACTIVE';

export interface NamedRef {
  _id: string;
  name: string;
}

export interface CategoryDefaults {
  _id: string;
  categoryId: string | NamedRef;
  pricingTemplateId?: string | NamedRef | null;
  attributeSetId?: string | NamedRef | null;
  baseUnitId?: string | NamedRef | null;
  fieldGroupId?: string | NamedRef | null;
  taxProfileId?: string | NamedRef | null;
  groupType?: GroupType | null;
  pricingRefreshMode?: PricingRefreshMode | null;
  status: ActiveStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryDefaultsUpsertPayload {
  pricingTemplateId?: string | null;
  attributeSetId?: string | null;
  baseUnitId?: string | null;
  fieldGroupId?: string | null;
  taxProfileId?: string | null;
  groupType?: GroupType | null;
  pricingRefreshMode?: PricingRefreshMode | null;
  status?: ActiveStatus;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
    totalPages: number;
    canLoadAll: boolean;
  };
}

export interface SuccessResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}
