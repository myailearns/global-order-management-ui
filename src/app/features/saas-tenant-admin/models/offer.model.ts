/**
 * EPIC 1 V1 UI Models for Offer Management
 * Mirrors backend: Offer, Coupon, LoyaltyWallet, LoyaltyLedger
 */

import { OfferStackingMode } from '../offers/constants/offer-program.constants';

export enum OfferType {
  ORDER_DISCOUNT = 'ORDER_DISCOUNT',
  PRODUCT_DISCOUNT = 'PRODUCT_DISCOUNT',
  CATEGORY_DISCOUNT = 'CATEGORY_DISCOUNT',
  PACK_DISCOUNT = 'PACK_DISCOUNT',
  FREE_DELIVERY = 'FREE_DELIVERY',
  BUY_X_GET_Y = 'BUY_X_GET_Y',
}

export enum OfferTriggerType {
  AUTO = 'AUTO',
  COUPON = 'COUPON',
}

export enum OfferStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  EXPIRED = 'EXPIRED',
}

export enum DiscountType {
  PERCENT = 'PERCENT',
  AMOUNT = 'AMOUNT',
  FREE_DELIVERY = 'FREE_DELIVERY',
}

export enum CouponStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  EXPIRED = 'EXPIRED',
}

export enum B1G1RewardType {
  PRODUCT = 'PRODUCT',
  CATEGORY = 'CATEGORY',
  SAME_ITEM = 'SAME_ITEM',
}

export enum B1G1RewardMode {
  SAME_ITEM = 'SAME_ITEM',
  DIFFERENT_ITEM = 'DIFFERENT_ITEM',
}

export enum DeliveryMethod {
  STANDARD = 'STANDARD',
  EXPRESS = 'EXPRESS',
  PREMIUM = 'PREMIUM',
  ECONOMY = 'ECONOMY',
}

export enum DeliveryStackingPolicy {
  STACKABLE_WITH_AUTO = 'STACKABLE_WITH_AUTO',
  STACKABLE_WITH_COUPON = 'STACKABLE_WITH_COUPON',
  STACKABLE_WITH_ALL = 'STACKABLE_WITH_ALL',
  NON_STACKABLE = 'NON_STACKABLE',
}

/**
 * Offer: Tenant-level offer configuration (coupon, B1G1, loyalty campaign)
 */
export interface Offer {
  _id: string;
  tenantId: string;
  name: string;
  description?: string;
  type: OfferType;
  triggerType: OfferTriggerType;
  status: OfferStatus;
  priority: number;
  validFrom?: string;
  validTo?: string;
  
  // Discount-specific fields
  discountType?: DiscountType | 'NONE';
  discountValue?: number;
  maxDiscountCap?: number;
  minOrderValue?: number;
  
  // B1G1-specific fields
  buyQty?: number;
  getQty?: number;
  rewardMode?: B1G1RewardMode;
  rewardVariantIds?: string[];
  maxFreeQtyPerOrder?: number;
  repeatAllowed?: boolean;
  
  // Loyalty-specific fields
  allowCouponWithLoyalty?: boolean;
  loyaltyPointsPerUnit?: number;
  loyaltyMaxEarnPoints?: number;
  loyaltyMinPointsToRedeem?: number;
  loyaltyPointRedemptionValue?: number;
  
  // Delivery-specific fields
  deliveryMinCartValue?: number;
  deliveryMaxChargeCap?: number;
  deliveryMethods?: string[]; // DeliveryMethod[] array
  deliveryPinCodes?: string[];
  deliveryApplicableCategories?: string[];
  deliveryExcludedCategories?: string[];
  deliveryRepeatLimit?: number;
  
  // Applicability scope
  applicableCategoryIds?: string[];
  applicableVariantIds?: string[];
  excludedCategoryIds?: string[];
  excludedVariantIds?: string[];
  applicablePackIds?: string[];
  
  // Usage limits
  usageLimitTotal?: number;
  usedCount?: number;
  usageLimitPerCustomer?: number;
  
  // Coupon association (when triggerType is COUPON)
  couponId?: string;
  coupon?: Coupon;
  
  createdAt: string;
  updatedAt: string;
}

/**
 * Coupon: Code-based offer activation + usage tracking
 */
export interface Coupon {
  _id: string;
  tenantId: string;
  offerId: string;
  code: string; // Uppercase unique per tenant
  status: CouponStatus;
  usedCount: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * LoyaltyWallet: Current point balance per customer per tenant
 */
export interface LoyaltyWallet {
  _id: string;
  tenantId: string;
  customerId: string;
  availablePoints: number;
  pendingPoints: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * LoyaltyLedger: Immutable audit log of all loyalty transactions
 */
export interface LoyaltyLedger {
  _id: string;
  tenantId: string;
  customerId: string;
  type: 'EARN' | 'REDEEM' | 'REVERSE_EARN' | 'REVERSE_REDEEM' | 'EXPIRE';
  pointsDelta: number;
  balanceAfter: number;
  referenceType: 'ORDER' | 'RETURN' | 'CANCEL';
  referenceId: string;
  idempotencyKey: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

/**
 * API Request/Response types
 */
export interface CreateOfferRequest {
  name: string;
  description?: string;
  type: OfferType;
  triggerType: OfferTriggerType;
  priority: number;
  validFrom?: string;
  validTo?: string;
  discountType?: Offer['discountType'];
  discountValue?: number;
  maxDiscountCap?: number;
  minOrderValue?: number;
  applicableCategoryIds?: string[];
  applicableVariantIds?: string[];
  excludedCategoryIds?: string[];
  excludedVariantIds?: string[];
  applicablePackIds?: string[];
  buyQty?: number;
  getQty?: number;
  rewardMode?: B1G1RewardMode;
  rewardVariantIds?: string[];
  maxFreeQtyPerOrder?: number;
  repeatAllowed?: boolean;
  usageLimitTotal?: number;
  usageLimitPerCustomer?: number;
  allowCouponWithLoyalty?: boolean;
  loyaltyPointsPerUnit?: number;
  loyaltyMaxEarnPoints?: number;
  loyaltyMinPointsToRedeem?: number;
  loyaltyPointRedemptionValue?: number;
  couponCode?: string; // Optional: create coupon with offer
  
  // Delivery-specific fields (for FREE_DELIVERY offers)
  deliveryMinCartValue?: number;
  deliveryMaxChargeCap?: number;
  deliveryMethods?: string[];
  deliveryPinCodes?: string[];
  deliveryApplicableCategories?: string[];
  deliveryExcludedCategories?: string[];
  deliveryRepeatLimit?: number;
}

export interface UpdateOfferRequest {
  name?: string;
  description?: string;
  priority?: number;
  validFrom?: string;
  validTo?: string;
  status?: OfferStatus;
  discountType?: Offer['discountType'];
  discountValue?: number;
  maxDiscountCap?: number;
  minOrderValue?: number;
  applicableCategoryIds?: string[];
  applicableVariantIds?: string[];
  excludedCategoryIds?: string[];
  excludedVariantIds?: string[];
  applicablePackIds?: string[];
  buyQty?: number;
  getQty?: number;
  rewardMode?: B1G1RewardMode;
  rewardVariantIds?: string[];
  maxFreeQtyPerOrder?: number;
  repeatAllowed?: boolean;
  usageLimitTotal?: number;
  usageLimitPerCustomer?: number;
  allowCouponWithLoyalty?: boolean;
  loyaltyPointsPerUnit?: number;
  loyaltyMaxEarnPoints?: number;
  loyaltyMinPointsToRedeem?: number;
  loyaltyPointRedemptionValue?: number;
  
  // Delivery-specific fields (for FREE_DELIVERY offers)
  deliveryMinCartValue?: number;
  deliveryMaxChargeCap?: number;
  deliveryMethods?: string[];
  deliveryPinCodes?: string[];
  deliveryApplicableCategories?: string[];
  deliveryExcludedCategories?: string[];
  deliveryRepeatLimit?: number;
}

export interface OfferListFilter {
  status?: OfferStatus;
  type?: OfferType;
  triggerType?: OfferTriggerType;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface OfferProgramSettings {
  _id?: string;
  tenantId?: string;
  offerProgramEnabled: boolean;
  autoEnableB1G1: boolean;
  autoEnableCoupon: boolean;
  includeB1G1ItemsInCouponBase: boolean;
  includeB1G1ItemsInAutoOfferBase: boolean;
  enableCouponStacking: boolean;
  enableB1G1Stacking: boolean;
  maxCouponsPerOrder: number;
  showB1G1OnProductCards: boolean;
  showB1G1HomeSection: boolean;
  maxB1G1HomeItems: number | null;
  loyaltyEnabled: boolean;
  enablePointsWithDiscount: boolean;
  enableCouponWithLoyalty: boolean;
  pointsConversion: {
    points: number;
    amount: number;
  };
  redemptionRate: {
    points: number;
    amount: number;
  };
  pointValidity: number;
  autoOrderDiscountApplicationMode: 'BEST_SINGLE_ELIGIBLE_TIER' | 'STACK_ELIGIBLE_TIERS';
  offerStackingMode: OfferStackingMode;
  
  // Delivery offer stacking policies
  deliveryStackingPolicy?: DeliveryStackingPolicy;
  canStackDeliveryWithAuto?: boolean;
  canStackDeliveryWithCoupon?: boolean;
  
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface ApiListResponse<T> {
  success: boolean;
  data: T[];
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
    totalPages: number;
    canLoadAll: boolean;
    tenantPlan?: string;
  };
  message?: string;
}

