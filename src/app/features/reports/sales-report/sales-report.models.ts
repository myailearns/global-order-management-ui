export type SalesGroupType = 'MEASURED' | 'ATTRIBUTE' | 'HYBRID';

export interface SalesReportParams {
  from: string;
  to: string;
  timezone: string;
  categoryId?: string;
  search?: string;
}

export interface SalesProfitability {
  revenueExTax: number;
  cost: number;
  profit: number;
  marginPct: number | null;
  definedMarginPct: number | null;
  meetsDefinedMargin: boolean | null;
  linesWithoutCost: number;
}

export interface SalesMetrics {
  orderCount: number;
  quantity: number;
  baseQuantity: number | null;
  revenue: number;
  profitability: SalesProfitability;
}

export interface SalesGroupInfo {
  _id: string;
  name: string;
  groupType: SalesGroupType;
  baseUnit: string | null;
  baseUnitName: string | null;
  categoryId: string | null;
  categoryName: string | null;
}

export interface SalesVariantReport extends SalesMetrics {
  variantId: string;
  name: string;
  sku: string | null;
}

export interface SalesGroupReport {
  group: SalesGroupInfo;
  total: SalesMetrics;
  variants: SalesVariantReport[];
}

export interface SalesQuantityByUnit {
  unit: string;
  unitName: string | null;
  quantity: number;
}

export interface SalesTopProduct {
  groupId: string;
  name: string;
  revenue: number;
}

export interface SalesTopVariant {
  variantId: string;
  name: string;
  groupId: string;
  groupName: string;
  revenue: number;
}

export interface SalesReportSummary extends SalesMetrics {
  groupCount: number;
  groupsWithSales: number;
  quantityByUnit: SalesQuantityByUnit[];
  topProduct: SalesTopProduct | null;
  topVariants: SalesTopVariant[];
}

export interface SalesReport {
  range: { from: string; to: string; timezone: string };
  summary: SalesReportSummary;
  groups: SalesGroupReport[];
}
