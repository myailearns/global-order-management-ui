export interface BusinessAddress {
  line1: string;
  line2: string;
  city: string;
  state: string;
  countryCode: string;
  postalCode: string;
}

export interface BusinessProfile {
  accountId: string;
  tenantCode: string;
  completed: boolean;
  completedAt: string | null;
  accountStatus: string;
  accountName: string;
  legalBusinessName: string;
  businessType: string;
  businessDescription: string;
  logoUrl: string;
  primaryContactPhone: string;
  primaryContactEmail: string;
  website: string;
  supportEmail: string;
  address: BusinessAddress;
  taxRegistrationType: string;
  gstin: string;
  pan: string;
  brandColor: string;
  brandAccent: string;
  brandTagline: string;
  updatedAt: string;
}

export type BusinessProfileUpdate = Pick<
  BusinessProfile,
  | 'accountName'
  | 'legalBusinessName'
  | 'businessType'
  | 'businessDescription'
  | 'logoUrl'
  | 'primaryContactPhone'
  | 'primaryContactEmail'
  | 'website'
  | 'supportEmail'
  | 'address'
  | 'taxRegistrationType'
  | 'gstin'
  | 'pan'
  | 'brandColor'
  | 'brandAccent'
  | 'brandTagline'
>;

export interface ApiSuccess<T> {
  success: boolean;
  message?: string;
  data: T;
}
