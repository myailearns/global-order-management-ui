export interface MediaAsset {
  _id: string;
  tenantId: string;
  name: string;
  publicId: string;
  url: string;
  originalName: string;
  size: number;
  width: number;
  height: number;
  format: string;
  visibility: 'PUBLIC' | 'PRIVATE';
  uploadedBy: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
  usageCount?: number;
}

export interface TenantUsage {
  tenantId: string;
  tenantName: string;
  groupCount: number;
}

export interface MediaUsageDetail {
  asset: MediaAsset;
  totalUsage: number;
  tenants: TenantUsage[];
}

export interface MediaUsageResponse {
  success: boolean;
  data: MediaUsageDetail;
}

export interface StorageBucket {
  size: number;
  count: number;
}

export interface StorageSummary {
  platform: StorageBucket;
  tenants: StorageBucket;
  total: StorageBucket;
}

export interface StorageSummaryResponse {
  success: boolean;
  data: StorageSummary;
}

export interface MediaAssetListResponse {
  success: boolean;
  data: MediaAsset[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface MediaAssetResponse {
  success: boolean;
  data: MediaAsset;
  message?: string;
}

export interface GroupImageEntry {
  mediaAssetId: string;
  source: 'PLATFORM' | 'TENANT';
  sortOrder: number;
}

export interface GroupImage {
  mediaAssetId: MediaAsset;
  source: 'PLATFORM' | 'TENANT';
  sortOrder: number;
}

export interface GroupImagesResponse {
  success: boolean;
  data: GroupImage[];
}
