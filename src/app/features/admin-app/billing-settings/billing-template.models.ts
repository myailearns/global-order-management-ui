export type BillTemplateCode = 'SIMPLE_BILL' | 'DETAILED_BILL' | 'GST_TAX_INVOICE' | 'DELIVERY_BILL';
export type BillOrderType = 'IN_STORE' | 'PICKUP' | 'DELIVERY';
export type BillPageSize = 'THERMAL_80' | 'A4';
export type BillFontSize = 'SMALL' | 'MEDIUM' | 'LARGE';
export type BillAlignment = 'LEFT' | 'CENTER' | 'RIGHT';

export interface BillTemplateField {
  id: string;
  label: string;
  source: string;
  visible: boolean;
  locked?: boolean;
}

export interface BillTemplateSection {
  id: string;
  type: string;
  label: string;
  visible: boolean;
  order: number;
  fields: BillTemplateField[];
}

export interface BillTemplateConfiguration {
  templateCode: BillTemplateCode;
  templateName: string;
  version: number;
  page: { size: BillPageSize; orientation: 'PORTRAIT' };
  formatting: {
    logoPosition: BillAlignment;
    fontSize: BillFontSize;
    accentColor: string;
    compactSpacing: boolean;
  };
  footer: {
    thankYouMessage: string;
    notes: string;
    returnPolicy: string;
  };
  sections: BillTemplateSection[];
}

export interface BillTemplate {
  id: string;
  code: BillTemplateCode;
  name: string;
  description: string;
  configuration: BillTemplateConfiguration;
  isSystemTemplate: boolean;
  isActive: boolean;
  isDefault: boolean;
  version: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface BillTemplateAssignment {
  id?: string;
  orderType: BillOrderType;
  templateId: string;
  updatedAt?: string;
}

export interface ApiSuccess<T> {
  success: boolean;
  message?: string;
  data: T;
}
