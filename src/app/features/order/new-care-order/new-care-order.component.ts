import { CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, ElementRef, HostListener, ViewChild, computed, effect, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { EMPTY, Observable, catchError, debounceTime, distinctUntilChanged, expand, firstValueFrom, forkJoin, map, of, reduce, switchMap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import jsPDF from 'jspdf';

import {
  FormControlsModule,
  GomAlertToastService,
  GomButtonComponent,
  GomChipComponent,
  GomConfirmationModalComponent,
  GomInputComponent,
  GomModalComponent,
  GomSelectComponent,
  GomSelectOption,
} from '@gomlibs/ui';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { PaymentMethod, PaymentOptionsConfig, PaymentOrderType } from '../../admin-app/payment-options/payment-options.models';
import { PaymentOptionsService } from '../../admin-app/payment-options/payment-options.service';
import { BillOrderType, BillTemplateConfiguration } from '../../admin-app/billing-settings/billing-template.models';
import { BillingTemplateService } from '../../admin-app/billing-settings/billing-template.service';
import { BillPreviewComponent } from '../../admin-app/billing-settings/bill-preview.component';
import { BusinessProfile } from '../../admin-app/business-details/business-details.models';
import { BusinessDetailsService } from '../../admin-app/business-details/business-details.service';
import { HeaderSearchService } from '../../../shared/components/layout/header-search.service';
import { CustomerDetail, CustomerEngagementService } from '../../customer/customer-engagement.service';
import { OfferService } from '../../saas-tenant-admin/services/offer.service';
import { Offer } from '../../saas-tenant-admin/models';

import { CategoriesService, Category } from '../../master/categories';
import {
  CreateDraftPayload,
  Group,
  Order,
  OrdersService,
  PickupConfig,
  ProductsTabCategoryDetail,
  ProductsTabContext,
  ServiceablePincodeEntry,
  TenantDeliveryPincodeConfig,
  Variant,
} from '../orders/orders.service';
import { environment } from '../../../../environments/environment';
import {
  CreateOrderCatalogCacheRecord,
  CreateOrderCatalogCacheService,
  CreateOrderCatalogScope,
} from './create-order-catalog-cache.service';

type PosFieldType = 'RADIO_GROUP' | 'BUTTON_GROUP' | 'CHECKBOX' | 'TEXT' | 'NUMBER' | 'DROPDOWN' | 'DATE' | 'TIME' | 'TEXTAREA';
type PosComponentId = 'CATEGORY_TOOLS' | 'PRODUCT_GRID' | 'CLEAR_ORDER' | 'CUSTOMER' | 'ORDER_TYPE' | 'CART_ITEMS' | 'ORDER_SUMMARY' | 'PLACE_ORDER';

interface PosLayoutFieldOption {
  label: string;
  value: string;
}

interface PosLayoutItemBase {
  type: 'COMPONENT' | 'FIELD';
}

interface PosLayoutComponentItem extends PosLayoutItemBase {
  type: 'COMPONENT';
  component: PosComponentId;
  defaultValue?: string;
}

interface PosLayoutFieldItem extends PosLayoutItemBase {
  type: 'FIELD';
  id: string;
  fieldType: PosFieldType;
  label: string;
  defaultVisible?: boolean;
  defaultValue?: string;
  options?: PosLayoutFieldOption[];
}

type PosLayoutItem = PosLayoutComponentItem | PosLayoutFieldItem;

interface PosLayoutColumn {
  id: string;
  width: number;
  items: PosLayoutItem[];
}

interface PosLayoutRow {
  id: string;
  columns: PosLayoutColumn[];
}

interface PosLayout {
  layoutId: string;
  layoutName: string;
  rows: PosLayoutRow[];
}

interface PosProductVariant extends Variant {
  id?: string;
  displayName?: string;
  groupName?: string;
  categoryId?: string;
  variantLabel?: string;
  quantity?: number;
  unitId?: string;
  unitSymbol?: string;
  images?: Array<{ url?: string }>;
  effectivePrice?: {
    sellingPrice: number;
    anchorPrice: number;
    actualPrice?: number;
  };
}

interface PosProductGroup extends Group {
  id?: string;
  categoryId?: string;
  imageUrl?: string;
  description?: string;
  variants?: PosProductVariant[];
  groupType?: 'MEASURED' | 'ATTRIBUTE' | 'HYBRID';
  baseUnitId?: string;
  allowedUnits?: PosMeasuredUnit[];
}

interface PosMeasuredUnit {
  id: string;
  name: string;
  symbol: string;
  baseUnitId?: string | null;
  conversionFactor: number;
}

interface PosVariantCard {
  group: PosProductGroup;
  variant: PosProductVariant;
}

interface PosCartItem {
  variantId: string;
  groupId: string;
  categoryId?: string;
  groupName: string;
  variantName: string;
  quantity: number;
  unitLabel: string;
  unitPrice: number;
  lineTotal: number;
  imageUrl?: string;
  customMeasured?: boolean;
  measuredQuantity?: number;
  measuredUnitId?: string;
  measuredBaseQuantity?: number;
}

interface OrderCustomer {
  id?: string;
  name: string;
  phone: string;
  email?: string;
}

type CustomerEditorMode = 'SEARCH' | 'CREATE';
type CareOrderType = 'WALK_IN' | 'PICKUP_LATER' | 'HOME_DELIVERY';
type PaymentStatusBucket = 'counter' | 'pickup' | 'delivery';

interface OrderTypeSelection {
  orderType: CareOrderType;
  intakeChannel: string;
  otherIntakeChannel: string;
  paymentStatus: string;
  pickupLocationId: string;
  pickupDateValue: string;
  pickupTimeValue: string;
  deliveryPincode: string;
  deliveryAddress: string;
  deliveryDateTime: string;
}

interface PickupSlot {
  dateValue: string;
  dateLabel: string;
  timeLabel: string;
  value: string;
}

interface StorefrontPickupDefaults {
  pickupAdvanceDays: number;
  pickupSameDayLeadMinutes: number;
}

interface PosOfferToast {
  type: string;
  offerId: string;
  message: string;
  priority: number;
}

interface PosOrderDiscountNudge {
  offerId: string;
  name: string;
  saving?: number;
  gap?: number;
}

interface PosCouponNudge {
  offerId: string;
  code: string;
  eligible: boolean;
  gap: number;
}

interface PosB1g1Nudge {
  offerId: string;
  name: string;
  shortLabel?: string;
  buyQty: number;
  getQty: number;
  applicableVariantIds?: string[];
  applicableCategoryIds?: string[];
  needMoreToUnlock: number;
}

interface PosFreeDeliveryNudge {
  applied: { offerId: string; name: string; minOrderValue?: number } | null;
  next: { offerId: string; name: string; minOrderValue: number; gap: number } | null;
}

interface PosCartNudgeSummary {
  programEnabled: boolean;
  stickyMessage: string | null;
  toasts: PosOfferToast[];
  orderDiscount: { applied: PosOrderDiscountNudge | null; next: PosOrderDiscountNudge | null };
  orderDiscountTiers: Array<{ offerId: string; name: string }>;
  coupons: PosCouponNudge[];
  b1g1: PosB1g1Nudge[];
  freeDelivery: PosFreeDeliveryNudge | null;
}

interface PosOfferCalculatePreview {
  appliedOffers: Array<{ offerId: string; type: string; label: string }>;
  coupon?: {
    code?: string | null;
    codes?: string[];
    rejectedByLimitCodes?: string[];
    maxCouponsPerOrder?: number;
  };
  totals: {
    subtotal: number;
    offerDiscount: number;
    loyaltyDiscount: number;
    deliveryFee: number;
    deliveryDiscount?: number;
    finalPayable: number;
  };
}

interface PosOfferPanelRow {
  title: string;
  detail: string;
}

interface CompletedTransactionSnapshot {
  orderNo: string;
  paymentStatus: PosPaymentStatus;
  orderStatus: PosOrderStatus;
  previewValues: Record<string, string>;
  previewItems: Array<Record<string, string>>;
}

type PosOfferEligibilityTone = 'applied' | 'eligible' | 'locked' | 'info';

interface PosConfiguredOfferRow {
  id: string;
  name: string;
  typeLabel: string;
  statusLabel: string;
  triggerLabel: string;
  couponCode: string;
  canApplyCoupon: boolean;
  couponApplied: boolean;
  stateBadgeLabel: string;
  eligibilityLabel: string;
  eligibilityTone: PosOfferEligibilityTone;
  progressPercent: number | null;
  progressHint: string;
  summary: string;
}

interface PosApiSuccess<T> {
  success: boolean;
  data: T;
}

interface PosCreateOrderConfig {
  paymentStatuses: Record<PaymentStatusBucket, string[]>;
  requireMemberForBilling: boolean;
  orderIntakeChannels: Array<{ name: string; enabled: boolean }>;
}

type MobilePosTab = 'products' | 'cart' | 'account';
type PosShortcutArea = 'search' | 'category' | 'group' | 'products' | 'cart' | 'payment' | 'customer' | 'delivery';
type PaymentMode = PaymentMethod;
type PosPaymentStatus = 'PENDING' | 'PAID';
type PosOrderStatus = 'PAYMENT_PENDING' | 'COMPLETED';
type CreateOrderSubMenuItem = 'ORDERS_HISTORY' | 'HOLDING_ORDERS' | 'SHORTCUTS_LIST';

const POS_LAYOUT: PosLayout = {
  layoutId: 'POS_DEFAULT',
  layoutName: 'Default POS',
  rows: [
    {
      id: 'future-top',
      columns: [],
    },
    {
      id: 'main',
      columns: [
        {
          id: 'categories',
          width: 20,
          items: [
            { type: 'COMPONENT', component: 'CATEGORY_TOOLS' },
          ],
        },
        {
          id: 'products',
          width: 50,
          items: [
            { type: 'COMPONENT', component: 'PRODUCT_GRID' },
          ],
        },
        {
          id: 'cart',
          width: 30,
          items: [
            { type: 'COMPONENT', component: 'CLEAR_ORDER' },
            { type: 'COMPONENT', component: 'CUSTOMER' },
            { type: 'COMPONENT', component: 'ORDER_TYPE', defaultValue: 'WALK_IN' },
            { type: 'COMPONENT', component: 'CART_ITEMS' },
            { type: 'COMPONENT', component: 'ORDER_SUMMARY' },
            { type: 'COMPONENT', component: 'PLACE_ORDER' },
          ],
        },
      ],
    },
    {
      id: 'future-bottom',
      columns: [],
    },
  ],
};

@Component({
  selector: 'gom-new-care-order',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    FormControlsModule,
    GomButtonComponent,
    GomChipComponent,
    GomConfirmationModalComponent,
    GomInputComponent,
    GomModalComponent,
    GomSelectComponent,
    BillPreviewComponent,
  ],
  templateUrl: './new-care-order.component.html',
  styleUrl: './new-care-order.component.scss',
})
export class NewCareOrderComponent implements OnInit, OnDestroy {
  @ViewChild('billPdfTarget') billPdfTarget?: ElementRef<HTMLElement>;
  @ViewChild('billPdfExportTarget') billPdfExportTarget?: ElementRef<HTMLElement>;
  @ViewChild('shortcutsSection') shortcutsSection?: ElementRef<HTMLElement>;

  private static readonly CATEGORY_PANEL_MIN_WIDTH = 180;
  private static readonly CATEGORY_PANEL_MAX_WIDTH = 360;
  private static readonly CATEGORY_RESIZER_WIDTH = 10;
  private static readonly MOBILE_BREAKPOINT_PX = 840;
  private static readonly ORDER_TYPE_SHORTCUT_ARM_MS = 5000;

  private readonly categoriesService = inject(CategoriesService);
  private readonly ordersService = inject(OrdersService);
  private readonly http = inject(HttpClient);
  private readonly customerService = inject(CustomerEngagementService);
  private readonly offerService = inject(OfferService);
  private readonly toast = inject(GomAlertToastService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly headerSearch = inject(HeaderSearchService);
  private readonly catalogCache = inject(CreateOrderCatalogCacheService);
  private readonly authSession = inject(AuthSessionService);
  private readonly paymentOptionsService = inject(PaymentOptionsService);
  private readonly billingTemplateService = inject(BillingTemplateService);
  private readonly businessDetailsService = inject(BusinessDetailsService);

  readonly layout = signal<PosLayout>(POS_LAYOUT);
  readonly categories = signal<Category[]>([]);
  readonly categoriesLoading = signal(false);
  readonly categoriesError = signal<string | null>(null);
  readonly selectedCategoryId = signal<string | null>(null);
  readonly products = signal<PosProductGroup[]>([]);
  readonly productsLoading = signal(false);
  readonly productsLoadingMore = signal(false);
  readonly productsError = signal<string | null>(null);
  readonly productsPage = signal(1);
  readonly productsPageSize = 12;
  readonly productsTotal = signal(0);
  readonly productsHasMore = signal(false);
  readonly productSearch = signal('');
  readonly cartItems = signal<PosCartItem[]>([]);
  readonly clearOrderConfirmOpen = signal(false);
  readonly customerEditorOpen = signal(false);
  readonly customerEditorMode = signal<CustomerEditorMode>('SEARCH');
  readonly customer = signal<OrderCustomer>({ name: 'Walk-in Customer', phone: '' });
  readonly customerSearchResults = signal<CustomerDetail[]>([]);
  readonly customerSearchLoading = signal(false);
  readonly customerSearchAttempted = signal(false);
  readonly customerSearchError = signal<string | null>(null);
  readonly customerCreating = signal(false);
  readonly customerCreateError = signal<string | null>(null);
  readonly orderTypeEditorOpen = signal(false);
  readonly orderType = signal<CareOrderType>('WALK_IN');
  readonly orderNoteModalOpen = signal(false);
  readonly orderStaffNote = signal('');
  readonly orderNoteControl = new FormControl('', { nonNullable: true });
  readonly holdOrderModalOpen = signal(false);
  readonly holdOrderSubmitting = signal(false);
  readonly holdOrderReferenceControl = new FormControl('', { nonNullable: true });
  readonly holdingOrdersModalOpen = signal(false);
  readonly holdingOrdersLoading = signal(false);
  readonly holdingOrdersDeleting = signal(false);
  readonly holdingOrders = signal<Order[]>([]);
  readonly holdingOrdersSearchControl = new FormControl('', { nonNullable: true });
  readonly holdingOrderDeleteTarget = signal<Order | null>(null);
  readonly holdingOrderDeleteConfirmOpen = signal(false);
  readonly switchHoldOrderModalOpen = signal(false);
  readonly switchHoldOrderTarget = signal<Order | null>(null);
  readonly switchHoldReturnToList = signal(false);
  readonly appliedOrderDetails = signal<OrderTypeSelection>({
    orderType: 'WALK_IN',
    intakeChannel: 'Shop Counter',
    otherIntakeChannel: '',
    paymentStatus: 'At Order Time',
    pickupLocationId: '',
    pickupDateValue: '',
    pickupTimeValue: '',
    deliveryPincode: '',
    deliveryAddress: '',
    deliveryDateTime: '',
  });
  readonly createOrderOptions = signal<PosCreateOrderConfig>({
    requireMemberForBilling: false,
    paymentStatuses: {
      pickup: ['At Pickup', 'At Order Time'],
      delivery: ['At Delivery', 'At Order Time'],
      counter: ['Later', 'At Order Time'],
    },
    orderIntakeChannels: [
      { name: 'Shop Counter', enabled: true },
      { name: 'WhatsApp Message', enabled: true },
      { name: 'WhatsApp Business', enabled: true },
      { name: 'Instagram', enabled: true },
      { name: 'On Call', enabled: true },
      { name: 'Other', enabled: true },
    ],
  });
  readonly deliveryPincodeConfig = signal<TenantDeliveryPincodeConfig>({
    enabled: false,
    pincodeMode: 'DISABLED',
    serviceablePincodes: [],
    nonServiceableSuggestion: 'CALL_COURIER',
  });
  readonly storefrontDeliveryCharge = signal(0);
  readonly storefrontPincodeServiceabilityMode = signal<'SERVE_ALL' | 'RESTRICTED'>('SERVE_ALL');
  readonly storefrontServiceablePincodes = signal<ServiceablePincodeEntry[]>([]);
  readonly offersPanelOpen = signal(false);
  readonly offerNudgeSummary = signal<PosCartNudgeSummary | null>(null);
  readonly offerPreview = signal<PosOfferCalculatePreview | null>(null);
  readonly offerInsightsLoading = signal(false);
  readonly appliedCouponCodes = signal<string[]>([]);
  readonly configuredOffers = signal<Offer[]>([]);
  readonly configuredOffersLoading = signal(false);
  readonly configuredOffersLoaded = signal(false);
  readonly draftOrderType = signal<CareOrderType>('WALK_IN');
  readonly draftIntakeChannel = signal('Shop Counter');
  readonly deliveryPincodeState = signal<'EMPTY' | 'INVALID' | 'SERVICEABLE' | 'UNSERVICEABLE'>('EMPTY');
  readonly pickupLocations = signal<PickupConfig[]>([]);
  readonly selectedPickupLocationId = signal('');
  readonly selectedPickupDateValue = signal('');
  readonly storefrontPickupDefaults = signal<StorefrontPickupDefaults>({ pickupAdvanceDays: 0, pickupSameDayLeadMinutes: 0 });
  readonly categoryPanelWidth = signal<number | null>(null);
  readonly categoryResizeActive = signal(false);
  readonly activeMobileTab = signal<MobilePosTab>('products');
  readonly viewportWidth = signal<number>(window.innerWidth);
  readonly selectedGroupId = signal<string>('ALL');
  readonly keyboardSelectedProductIndex = signal(-1);
  readonly selectedCartVariantId = signal<string | null>(null);
  readonly activeShortcutArea = signal<PosShortcutArea>('search');
  readonly selectedPaymentMode = signal<PaymentMode>('CASH');
  readonly selectedCreateOrderSubMenu = signal<CreateOrderSubMenuItem>('ORDERS_HISTORY');
  readonly createOrderSubMenuOpen = signal(false);
  readonly paymentOptions = signal<PaymentOptionsConfig | null>(null);
  readonly paymentUpiModalOpen = signal(false);
  readonly paymentCompleteModalOpen = signal(false);
  readonly selectedUpiAccountId = signal('');
  readonly selectedBankAccountId = signal('');
  readonly paymentProcessedAt = signal<Date | null>(null);
  readonly paymentStatus = signal<PosPaymentStatus>('PENDING');
  readonly orderStatus = signal<PosOrderStatus>('PAYMENT_PENDING');
  readonly billTemplateConfig = signal<BillTemplateConfiguration | null>(null);
  readonly billTemplateName = signal('');
  readonly billTemplateLoading = signal(false);
  readonly billPdfDownloading = signal(false);
  readonly orderSubmitting = signal(false);
  readonly completedTransaction = signal<CompletedTransactionSnapshot | null>(null);
  readonly storeDisplayName = signal('Store');
  readonly businessProfile = signal<BusinessProfile | null>(null);
  readonly isOrderFrozen = computed(() => this.paymentStatus() === 'PAID' && this.orderStatus() === 'COMPLETED');
  readonly availablePaymentMethods = computed<PaymentMode[]>(() => {
    const config = this.paymentOptions();
    if (!config) return [];
    const activeOrderType = this.orderTypeEditorOpen() ? this.draftOrderType() : this.orderType();
    const orderType = this.paymentOrderType(activeOrderType);
    const configuredMethods = config.orderTypeMethods?.[orderType] || [];
    return configuredMethods.filter((method) => {
      if (method === 'UPI') return config.enabledMethods.upi && config.upiAccounts.some((account) => account.active);
      if (method === 'BANK_TRANSFER') return config.enabledMethods.bankTransfer && config.bankAccounts.some((account) => account.active);
      return config.enabledMethods.cash;
    });
  });
  readonly activeUpiAccounts = computed(() => {
    const config = this.paymentOptions();
    if (!config) {
      return [];
    }
    return config.upiAccounts.filter((account) => account.active);
  });
  readonly selectedUpiAccount = computed(() => {
    const accounts = this.activeUpiAccounts();
    const selectedId = String(this.selectedUpiAccountId() || '').trim();
    if (!accounts.length) {
      return null;
    }
    return accounts.find((account) => String(account.id || '').trim() === selectedId) || accounts[0] || null;
  });
  readonly activeBankAccounts = computed(() => {
    const config = this.paymentOptions();
    if (!config) {
      return [];
    }
    return config.bankAccounts.filter((account) => account.active);
  });
  readonly selectedBankAccount = computed(() => {
    const accounts = this.activeBankAccounts();
    const selectedId = String(this.selectedBankAccountId() || '').trim();
    if (!accounts.length) {
      return null;
    }
    return accounts.find((account) => String(account.id || '').trim() === selectedId) || accounts[0] || null;
  });
  readonly billPreviewValues = computed<Record<string, string>>(() => {
    const processedAt = this.paymentProcessedAt() || new Date();
    const selectedUpi = this.selectedUpiAccount();
    const applied = this.appliedOrderDetails();
    const deliveryLocation = this.appliedPickupLocation();
    const customer = this.customer();
    const profile = this.businessProfile();
    const businessName = String(profile?.legalBusinessName || profile?.accountName || this.storeDisplayName() || 'Store').trim();
    const businessAddress = this.formatBusinessAddress(profile) || this.formatPickupAddress(deliveryLocation) || 'Store Address';
    const businessPhone = String(profile?.primaryContactPhone || customer.phone || '-').trim() || '-';
    const businessEmail = String(profile?.supportEmail || profile?.primaryContactEmail || customer.email || '-').trim() || '-';
    const businessGstin = String(profile?.gstin || '-').trim() || '-';
    const businessLogoUrl = String(profile?.logoUrl || '').trim();
    return {
      'business.logoUrl': businessLogoUrl,
      'business.name': businessName,
      'business.address': businessAddress,
      'business.phone': businessPhone,
      'business.email': businessEmail,
      'business.gstin': businessGstin,
      'order.orderNo': `POS-${processedAt.getTime()}`,
      'order.date': processedAt.toLocaleDateString('en-IN'),
      'order.time': processedAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      'order.type': this.orderTypeLabel(),
      'order.status': this.orderStatus(),
      'order.channel': this.appliedIntakeChannelLabel(),
      'order.notes': '-',
      'customer.name': customer.name || 'Walk-in Customer',
      'customer.phone': customer.phone || '-',
      'customer.email': customer.email || '-',
      'customer.address': applied.deliveryAddress || this.formatPickupAddress(deliveryLocation) || '-',
      'delivery.address': applied.deliveryAddress || '-',
      'delivery.phone': customer.phone || '-',
      'delivery.instructions': '-',
      'totals.subtotal': this.formatCurrencyWithPaise(this.cartSubtotal()),
      'totals.discount': `-${this.formatCurrencyWithPaise(this.cartDiscount())}`,
      'totals.tax': this.formatCurrencyWithPaise(this.cartTax()),
      'totals.deliveryCharge': this.formatCurrencyWithPaise(this.deliveryCharge()),
      'totals.grandTotal': this.formatCurrencyWithPaise(this.payableTotal()),
      'payment.method': this.getBillPaymentMethodLabel(selectedUpi?.providerName),
      'payment.status': this.paymentStatus(),
      'payment.amountReceived': this.formatCurrencyWithPaise(this.payableTotal()),
      'payment.change': this.formatCurrencyWithPaise(0),
    };
  });
  readonly billPreviewItems = computed<Array<Record<string, string>>>(() => this.cartItems().map((item) => {
    const taxable = this.round2(item.lineTotal);
    const tax = this.round2(taxable * 0.05);
    const totalWithTax = this.round2(taxable + tax);
    return {
      name: item.variantName || item.groupName,
      hsnSac: '-',
      quantity: String(item.quantity),
      unit: item.unitLabel || '-',
      price: this.formatCurrencyWithPaise(item.unitPrice),
      discount: this.formatCurrencyWithPaise(0),
      taxableValue: this.formatCurrencyWithPaise(taxable),
      cgst: this.formatCurrencyWithPaise(this.round2(tax / 2)),
      sgst: this.formatCurrencyWithPaise(this.round2(tax / 2)),
      igst: '-',
      tax: this.formatCurrencyWithPaise(tax),
      amount: this.formatCurrencyWithPaise(totalWithTax),
    };
  }));
  readonly modalBillPreviewValues = computed<Record<string, string>>(() =>
    this.completedTransaction()?.previewValues || this.billPreviewValues());
  readonly modalBillPreviewItems = computed<Array<Record<string, string>>>(() =>
    this.completedTransaction()?.previewItems || this.billPreviewItems());
  readonly modalPaymentStatus = computed<PosPaymentStatus>(() =>
    this.completedTransaction()?.paymentStatus || this.paymentStatus());
  readonly modalOrderStatus = computed<PosOrderStatus>(() =>
    this.completedTransaction()?.orderStatus || this.orderStatus());
  readonly paymentMethodSelectionEffect = effect(() => {
    const available = this.availablePaymentMethods();
    if (!available.includes(this.selectedPaymentMode())) {
      this.selectedPaymentMode.set(available[0] || 'CASH');
    }
  });
  readonly upiAccountSelectionEffect = effect(() => {
    const accounts = this.activeUpiAccounts();
    const selectedId = String(this.selectedUpiAccountId() || '').trim();
    if (!accounts.length) {
      if (selectedId) {
        this.selectedUpiAccountId.set('');
      }
      return;
    }

    const found = accounts.some((account) => String(account.id || '').trim() === selectedId);
    if (!found) {
      this.selectedUpiAccountId.set(String(accounts[0].id || '').trim());
    }
  });
  readonly bankAccountSelectionEffect = effect(() => {
    const accounts = this.activeBankAccounts();
    const selectedId = String(this.selectedBankAccountId() || '').trim();
    if (!accounts.length) {
      if (selectedId) {
        this.selectedBankAccountId.set('');
      }
      return;
    }

    const found = accounts.some((account) => String(account.id || '').trim() === selectedId);
    if (!found) {
      this.selectedBankAccountId.set(String(accounts[0].id || '').trim());
    }
  });
  readonly canConfigureOrderType = computed(() => this.authSession.hasFeature('delivery.management'));
  readonly productDetailOpen = signal(false);
  readonly offlineStorageEnabled = signal(false);
  readonly catalogRefreshing = signal(false);
  readonly catalogLastUpdated = signal<string | null>(null);
  readonly detailGroup = signal<PosProductGroup | null>(null);
  readonly detailVariant = signal<PosProductVariant | null>(null);
  readonly customQuantityControl = new FormControl<number | null>(null);
  readonly customQuantity = signal(0);
  readonly customUnitId = signal('');
  readonly customMeasuredAmount = signal(0);
  readonly customPreviewBaseQuantity = signal(0);
  readonly customPriceLoading = signal(false);
  readonly customPriceError = signal<string | null>(null);
  readonly detailVariants = computed(() => {
    const variants = this.detailGroup()?.variants || [];
    return [...variants].sort((left, right) =>
      Number(left.convertedQuantity || 0) - Number(right.convertedQuantity || 0));
  });
  readonly customQuantityEnabled = computed(() => {
    const mode = String(this.detailGroup()?.groupType || 'MEASURED').toUpperCase();
    return mode === 'MEASURED' || mode === 'HYBRID';
  });
  readonly detailMeasuredUnits = computed<PosMeasuredUnit[]>(() => {
    const group = this.detailGroup();
    if (group?.allowedUnits?.length) {
      return group.allowedUnits;
    }
    return group ? this.inferMeasuredUnits(group) : [];
  });
  readonly customUnitOptions = computed<GomSelectOption[]>(() => this.detailMeasuredUnits().map((unit) => ({
    value: unit.id,
    label: `${unit.name} (${unit.symbol})`,
  })));
  readonly customQuantityValid = computed(() =>
    this.customQuantity() > 0
    && !!this.customUnitId()
    && this.customPreviewBaseQuantity() > 0
    && this.customMeasuredAmount() > 0
    && !this.customPriceLoading()
    && !this.customPriceError());

  readonly customerSearchControl = new FormControl('', { nonNullable: true });
  readonly customerForm = new FormGroup({
    phone: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/^\d{10}$/)] }),
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.email] }),
  });

  readonly orderTypeForm = new FormGroup({
    intakeChannel: new FormControl('Shop Counter', { nonNullable: true, validators: [Validators.required] }),
    otherIntakeChannel: new FormControl('', { nonNullable: true }),
    paymentStatus: new FormControl('At Order Time', { nonNullable: true, validators: [Validators.required] }),
    pickupLocationId: new FormControl('', { nonNullable: true }),
    pickupDateValue: new FormControl('', { nonNullable: true }),
    pickupTimeValue: new FormControl('', { nonNullable: true }),
    deliveryPincode: new FormControl('', { nonNullable: true }),
    deliveryAddress: new FormControl('', { nonNullable: true }),
    deliveryDateTime: new FormControl('', { nonNullable: true }),
  });

  readonly intakeChannelOptions = computed<GomSelectOption[]>(() => this.createOrderOptions().orderIntakeChannels
    .filter((channel) => channel.enabled)
    .map((channel) => ({ value: channel.name, label: channel.name })));
  readonly paymentStatusOptions = computed<GomSelectOption[]>(() => {
    const bucket = this.getPaymentStatusBucket(this.draftOrderType());
    return this.createOrderOptions().paymentStatuses[bucket].map((status) => ({ value: status, label: status }));
  });
  readonly minimumFulfillmentDateTime = this.toLocalDateTimeInput(new Date());
  readonly selectedDraftPickupLocation = computed<PickupConfig | null>(() => {
    const locations = this.pickupLocations();
    if (!locations.length) {
      return null;
    }

    const selectedId = String(this.selectedPickupLocationId() || '').trim();
    if (!selectedId) {
      return locations[0] || null;
    }

    return locations.find((location) => String(location.locationId || '').trim() === selectedId) || locations[0] || null;
  });
  readonly pickupSlots = computed<PickupSlot[]>(() => {
    if (this.draftOrderType() !== 'PICKUP_LATER') {
      return [];
    }

    const location = this.selectedDraftPickupLocation();
    const defaults = this.storefrontPickupDefaults();
    const advanceDays = location?.pickupAdvanceDays ?? defaults.pickupAdvanceDays ?? 0;
    const sameDayLeadMinutes = location?.pickupSameDayLeadMinutes ?? defaults.pickupSameDayLeadMinutes ?? 0;
    return this.buildPickupSlots(location?.pickupTimingText || '', advanceDays, sameDayLeadMinutes);
  });
  readonly pickupDateOptions = computed<GomSelectOption[]>(() => {
    const labels = new Map<string, string>();
    for (const slot of this.pickupSlots()) {
      if (!labels.has(slot.dateValue)) {
        labels.set(slot.dateValue, slot.dateLabel);
      }
    }

    return [...labels.entries()].map(([value, label]) => ({ value, label }));
  });
  readonly pickupTimeOptions = computed<GomSelectOption[]>(() => {
    const selectedDate = String(this.selectedPickupDateValue() || '').trim();
    if (!selectedDate) {
      return [];
    }

    return this.pickupSlots()
      .filter((slot) => slot.dateValue === selectedDate)
      .map((slot) => ({ value: slot.value, label: slot.timeLabel }));
  });
  readonly pickupWindowHint = computed(() => {
    if (this.draftOrderType() !== 'PICKUP_LATER') {
      return '';
    }

    const location = this.selectedDraftPickupLocation();
    const defaults = this.storefrontPickupDefaults();
    const advanceDays = location?.pickupAdvanceDays ?? defaults.pickupAdvanceDays ?? 0;
    const leadMinutes = location?.pickupSameDayLeadMinutes ?? defaults.pickupSameDayLeadMinutes ?? 0;
    let dayText = 'today only';
    if (advanceDays > 0) {
      const suffix = advanceDays > 1 ? 's' : '';
      dayText = `today + ${advanceDays} day${suffix} ahead`;
    }

    let leadText = '';
    if (leadMinutes > 0) {
      if (leadMinutes < 60) {
        leadText = ` · ${leadMinutes} min notice for same-day`;
      } else {
        leadText = ` · ${(leadMinutes / 60).toFixed(1)} hr notice for same-day`;
      }
    }
    return `Pickup window: ${dayText}${leadText}`;
  });

  readonly searchControl = new FormControl('', { nonNullable: true });

  private readonly syncHeaderSearchEffect = effect(() => {
    if (this.headerSearch.activeContext() !== 'orders-create') {
      return;
    }

    const sharedTerm = this.headerSearch.value();
    if (this.searchControl.value !== sharedTerm) {
      this.searchControl.setValue(sharedTerm, { emitEvent: true });
    }
  });

  readonly visibleCategories = computed(() => this.categories());
  readonly selectedCategory = computed(() => {
    const selectedId = this.selectedCategoryId();
    for (const category of this.categories()) {
      if (category._id === selectedId) {
        return category;
      }
    }

    return null;
  });
  readonly visibleProducts = computed(() => {
    return this.products();
  });
  readonly groupChips = computed(() => {
    return this.visibleProducts()
      .filter((group) => !!group._id)
      .map((group) => ({
        id: String(group._id || ''),
        label: String(group.name || 'Group'),
      }));
  });
  readonly visibleVariantCards = computed<PosVariantCard[]>(() => {
    const selectedGroupId = String(this.selectedGroupId() || 'ALL').trim();
    const cards: PosVariantCard[] = [];

    for (const group of this.visibleProducts()) {
      const groupId = String(group._id || '').trim();
      if (selectedGroupId !== 'ALL' && groupId !== selectedGroupId) {
        continue;
      }

      const variants = Array.isArray(group.variants) ? group.variants : [];
      const sortedVariants = [...variants].sort((left, right) =>
        Number(left.convertedQuantity || 0) - Number(right.convertedQuantity || 0));

      for (const variant of sortedVariants) {
        cards.push({ group, variant });
      }
    }

    return cards;
  });
  readonly productsPanelTitle = computed(() => {
    if (this.productSearch().trim()) {
      return 'Search Results';
    }

    return this.selectedCategory()?.name || 'Grocery Items';
  });
  readonly isMobileViewport = computed(() => this.viewportWidth() <= NewCareOrderComponent.MOBILE_BREAKPOINT_PX);
  readonly bodyGridTemplateColumns = computed(() => {
    if (this.isMobileViewport()) {
      const categoryRailWidth = this.viewportWidth() <= 640 ? 98 : 108;
      return this.activeMobileTab() === 'products' ? `${categoryRailWidth}px minmax(0, 1fr)` : '1fr';
    }

    const categoryPanelWidth = this.categoryPanelWidth();
    if (categoryPanelWidth == null) {
      return 'minmax(220px, 3fr) 10px minmax(440px, 6fr) minmax(280px, 3fr)';
    }

    return `${categoryPanelWidth}px ${NewCareOrderComponent.CATEGORY_RESIZER_WIDTH}px minmax(440px, 2fr) minmax(280px, 1fr)`;
  });

  readonly cartCount = computed(() => this.cartItems().reduce((sum, item) => sum + item.quantity, 0));
  readonly cartDistinctCount = computed(() => this.cartItems().length);
  readonly cartSubtotal = computed(() => this.round2(this.cartItems().reduce((sum, item) => sum + item.lineTotal, 0)));
  readonly cartDiscount = computed(() => {
    const calculated = Number(this.offerPreview()?.totals?.offerDiscount ?? 0);
    if (calculated > 0) {
      return this.round2(calculated);
    }

    return this.round2(Number(this.offerNudgeSummary()?.orderDiscount?.applied?.saving ?? 0));
  });
  readonly cartTax = computed(() => this.round2(this.cartSubtotal() * 0.05));
  readonly cartTotal = computed(() => this.round2(this.cartSubtotal() - this.cartDiscount() + this.cartTax()));
  readonly baseDeliveryCharge = computed(() => {
    if (this.orderType() !== 'HOME_DELIVERY') {
      return 0;
    }

    return this.getDeliveryChargeForPincode(this.appliedOrderDetails().deliveryPincode);
  });
  readonly deliveryCharge = computed(() => {
    if (this.orderType() !== 'HOME_DELIVERY') {
      return 0;
    }

    const freeDeliveryApplied = !!this.offerNudgeSummary()?.freeDelivery?.applied;
    return freeDeliveryApplied ? 0 : this.baseDeliveryCharge();
  });
  readonly payableTotal = computed(() => this.round2(this.cartTotal() + this.deliveryCharge()));
  readonly offerAvailableCount = computed(() => {
    const ids = new Set<string>();
    for (const row of this.offerPreview()?.appliedOffers || []) {
      const offerId = String(row.offerId || '').trim();
      if (offerId) {
        ids.add(offerId);
      }
    }

    const nudge = this.offerNudgeSummary();
    for (const row of nudge?.orderDiscountTiers || []) {
      const offerId = String(row.offerId || '').trim();
      if (offerId) {
        ids.add(offerId);
      }
    }
    for (const row of nudge?.coupons || []) {
      const offerId = String(row.offerId || '').trim();
      if (offerId) {
        ids.add(offerId);
      }
    }
    for (const row of nudge?.b1g1 || []) {
      const offerId = String(row.offerId || '').trim();
      if (offerId) {
        ids.add(offerId);
      }
    }

    const freeDeliveryOfferId = String(nudge?.freeDelivery?.applied?.offerId || nudge?.freeDelivery?.next?.offerId || '').trim();
    if (freeDeliveryOfferId) {
      ids.add(freeDeliveryOfferId);
    }

    return ids.size;
  });
  readonly configuredOffersCount = computed(() => this.configuredOffers().length);
  readonly hasConfiguredOffers = computed(() => this.configuredOffersCount() > 0);
  readonly configuredOfferRows = computed<PosConfiguredOfferRow[]>(() => {
    const appliedOfferIds = new Set((this.offerPreview()?.appliedOffers || [])
      .map((row) => String(row.offerId || '').trim())
      .filter(Boolean));
    const couponByOfferId = new Map<string, PosCouponNudge>();
    for (const coupon of this.offerNudgeSummary()?.coupons || []) {
      const offerId = String(coupon.offerId || '').trim();
      if (offerId && !couponByOfferId.has(offerId)) {
        couponByOfferId.set(offerId, coupon);
      }
    }

    return this.configuredOffers().map((offer) => {
      const offerId = String(offer._id || '').trim();
      const couponNudge = couponByOfferId.get(offerId);
      const couponCode = String(couponNudge?.code || offer.coupon?.code || '').trim().toUpperCase();
      const couponApplied = couponCode ? this.appliedCouponCodes().includes(couponCode) : false;
      const triggerLabel = this.formatOfferTriggerLabel(String(offer.triggerType || ''));
      const typeLabel = this.formatOfferTypeLabel(String(offer.type || ''));
      const eligibility = this.getConfiguredOfferEligibility(offer, appliedOfferIds, couponNudge, couponApplied);
      const progress = this.getConfiguredOfferProgress(offer, couponNudge);

      return {
        id: offerId,
        name: String(offer.name || 'Offer').trim() || 'Offer',
        typeLabel,
        statusLabel: this.formatOfferStatusLabel(String(offer.status || '')),
        triggerLabel,
        couponCode,
        canApplyCoupon: triggerLabel === 'Coupon' && !!couponCode && !!couponNudge?.eligible && !couponApplied,
        couponApplied,
        stateBadgeLabel: this.getOfferStateBadgeLabel(eligibility.tone),
        eligibilityLabel: eligibility.label,
        eligibilityTone: eligibility.tone,
        progressPercent: progress.percent,
        progressHint: progress.hint,
        summary: this.formatConfiguredOfferSummary(offer),
      };
    });
  });
  readonly appliedOfferLabels = computed(() => {
    const labels = (this.offerPreview()?.appliedOffers || [])
      .map((row) => String(row.label || '').trim())
      .filter(Boolean);
    return [...new Set(labels)].slice(0, 3);
  });
  readonly offerSuggestionMessages = computed(() => {
    const messages: string[] = [];
    const sticky = String(this.offerNudgeSummary()?.stickyMessage || '').trim();
    if (sticky) {
      messages.push(sticky);
    }

    const freeDeliveryGap = Number(this.offerNudgeSummary()?.freeDelivery?.next?.gap ?? 0);
    if (freeDeliveryGap > 0) {
      messages.push(`Add ${this.formatCurrency(freeDeliveryGap)} more to unlock free delivery.`);
    }

    for (const coupon of this.offerNudgeSummary()?.coupons || []) {
      const code = String(coupon.code || '').trim();
      if (!code) {
        continue;
      }
      const couponApplied = this.appliedCouponCodes().includes(code.toUpperCase());
      if (couponApplied) {
        messages.push(`Coupon ${code} is applied.`);
        continue;
      }
      if (coupon.eligible) {
        messages.push(`Coupon ${code} is eligible for this cart.`);
      } else if (Number(coupon.gap || 0) > 0) {
        messages.push(`Add ${this.formatCurrency(coupon.gap)} more to apply coupon ${code}.`);
      }
    }

    const unique = [...new Set(messages.map((message) => message.trim()).filter(Boolean))];
    return unique.slice(0, 3);
  });
  readonly offerPanelAppliedRows = computed<PosOfferPanelRow[]>(() => {
    return (this.offerPreview()?.appliedOffers || [])
      .map((row) => ({
        title: String(row.label || row.type || 'Applied Offer').trim(),
        detail: String(row.type || 'AUTO').replaceAll('_', ' '),
      }))
      .filter((row) => !!row.title);
  });
  readonly offerPanelEligibleRows = computed<PosOfferPanelRow[]>(() => {
    const rows: PosOfferPanelRow[] = [];

    const appliedOrderDiscount = this.offerNudgeSummary()?.orderDiscount?.applied;
    if (appliedOrderDiscount?.name) {
      rows.push({
        title: appliedOrderDiscount.name,
        detail: `Order discount applied: save ${this.formatCurrency(Number(appliedOrderDiscount.saving || 0))}`,
      });
    }

    for (const coupon of this.offerNudgeSummary()?.coupons || []) {
      if (coupon.eligible) {
        rows.push({
          title: `Coupon ${coupon.code}`,
          detail: 'Eligible now',
        });
      }
    }

    const freeDeliveryApplied = this.offerNudgeSummary()?.freeDelivery?.applied;
    if (freeDeliveryApplied?.name) {
      rows.push({
        title: freeDeliveryApplied.name,
        detail: 'Free delivery unlocked',
      });
    }

    for (const b1g1 of this.offerNudgeSummary()?.b1g1 || []) {
      if (Number(b1g1.needMoreToUnlock || 0) === 0) {
        rows.push({
          title: b1g1.name || `Buy ${b1g1.buyQty} Get ${b1g1.getQty}`,
          detail: `Buy ${b1g1.buyQty}, Get ${b1g1.getQty} active`,
        });
      }
    }

    return rows;
  });
  readonly offerPanelNeedMoreRows = computed<PosOfferPanelRow[]>(() => {
    const rows: PosOfferPanelRow[] = [];

    const nextOrderDiscount = this.offerNudgeSummary()?.orderDiscount?.next;
    if (nextOrderDiscount?.name && Number(nextOrderDiscount.gap || 0) > 0) {
      rows.push({
        title: nextOrderDiscount.name,
        detail: `Add ${this.formatCurrency(Number(nextOrderDiscount.gap || 0))} more to unlock`,
      });
    }

    for (const coupon of this.offerNudgeSummary()?.coupons || []) {
      if (!coupon.eligible && Number(coupon.gap || 0) > 0) {
        rows.push({
          title: `Coupon ${coupon.code}`,
          detail: `Add ${this.formatCurrency(Number(coupon.gap || 0))} more`,
        });
      }
    }

    const freeDeliveryNext = this.offerNudgeSummary()?.freeDelivery?.next;
    if (freeDeliveryNext?.name && Number(freeDeliveryNext.gap || 0) > 0) {
      rows.push({
        title: freeDeliveryNext.name,
        detail: `Add ${this.formatCurrency(Number(freeDeliveryNext.gap || 0))} more for free delivery`,
      });
    }

    for (const b1g1 of this.offerNudgeSummary()?.b1g1 || []) {
      const needMore = Number(b1g1.needMoreToUnlock || 0);
      if (needMore > 0) {
        rows.push({
          title: b1g1.name || `Buy ${b1g1.buyQty} Get ${b1g1.getQty}`,
          detail: `Add ${needMore} more item(s) to unlock`,
        });
      }
    }

    return rows;
  });
  readonly hasOfferPanelContent = computed(() =>
    this.offerPanelAppliedRows().length > 0
    || this.offerPanelEligibleRows().length > 0
    || this.offerPanelNeedMoreRows().length > 0,
  );
  readonly appliedCouponList = computed(() => this.appliedCouponCodes());
  readonly cartEmpty = computed(() => this.cartItems().length === 0);
  readonly billingMemberMissing = computed(() =>
    this.createOrderOptions().requireMemberForBilling && !this.customer().id,
  );
  readonly cartQuantityByVariantId = computed(() => {
    return this.cartItems().reduce<Record<string, number>>((acc, item) => {
      const key = String(item.variantId || '').trim();
      if (!key) {
        return acc;
      }

      acc[key] = Number(item.quantity || 0);
      return acc;
    }, {});
  });

  readonly fieldValues = signal<Record<string, unknown>>({});
  private categoryResizeOriginLeft = 0;
  private headerSearchActive = false;
  private storeSlug = '';
  private tenantId = '';
  private cachedCategoryDetails: Record<string, ProductsTabCategoryDetail> = {};
  private customPriceRequestSequence = 0;
  private orderTypeShortcutArmedUntil = 0;
  private offerRefreshTimeout: ReturnType<typeof setTimeout> | null = null;
  private offerRefreshRequestSequence = 0;
  private readonly activeCatalogRefreshHandler = () => this.refreshStoredCatalog();

  private readonly closeClearOrderConfirmWhenEmpty = effect(() => {
    if (this.cartEmpty()) {
      this.clearOrderConfirmOpen.set(false);
    }
  });

  private readonly enforceOrderTypeByFeature = effect(() => {
    if (!this.canConfigureOrderType()) {
      this.forceWalkInOrderType();
    }
  });

  private readonly refreshOffersWhenContextChanges = effect(() => {
    this.cartItems();
    this.orderType();
    this.appliedOrderDetails().deliveryPincode;
    this.baseDeliveryCharge();
    this.scheduleOfferInsightsRefresh();
  });

  backToOrders(): void {
    void this.router.navigate(['/orders/list']);
  }

  toggleCreateOrderSubMenu(event?: Event): void {
    event?.stopPropagation();
    this.createOrderSubMenuOpen.set(!this.createOrderSubMenuOpen());
  }

  closeCreateOrderSubMenu(): void {
    this.createOrderSubMenuOpen.set(false);
  }

  onCreateOrderSubMenuSelect(item: CreateOrderSubMenuItem): void {
    this.selectedCreateOrderSubMenu.set(item);
    this.closeCreateOrderSubMenu();

    if (item === 'ORDERS_HISTORY') {
      this.backToOrders();
      return;
    }

    if (item === 'HOLDING_ORDERS') {
      this.openHoldingOrdersModal();
      return;
    }

    this.shortcutsSection?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  openHoldOrderModal(): void {
    if (this.cartEmpty()) {
      this.toast.warning('Add products before holding the order.');
      return;
    }

    this.holdOrderReferenceControl.setValue('');
    this.holdOrderModalOpen.set(true);
  }

  closeHoldOrderModal(): void {
    if (this.holdOrderSubmitting()) {
      return;
    }

    this.holdOrderModalOpen.set(false);
  }

  openHoldingOrdersModal(): void {
    this.holdingOrdersModalOpen.set(true);
    this.loadHoldingOrders();
  }

  closeHoldingOrdersModal(): void {
    if (this.holdingOrdersLoading() || this.holdingOrdersDeleting()) {
      return;
    }

    this.holdingOrdersModalOpen.set(false);
  }

  onCreateOrderSubMenuKeydown(event: KeyboardEvent): void {
    if (String(event.key || '').toUpperCase() === 'ESCAPE') {
      event.preventDefault();
      this.closeCreateOrderSubMenu();
    }
  }

  ngOnInit(): void {
    this.syncViewportState();
    this.syncHeaderSearchState();
    this.catalogCache.registerActiveCatalog(this.activeCatalogRefreshHandler);

    this.searchControl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((value) => {
        const nextSearch = String(value || '').trim();
        this.keyboardSelectedProductIndex.set(-1);
        this.headerSearch.setValue(nextSearch);
        this.productSearch.set(nextSearch);
        this.loadProducts(this.selectedCategoryId(), true);
      });

    this.customerSearchControl.valueChanges
      .pipe(
        map((value) => String(value || '').replace(/\D/g, '').slice(0, 10)),
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((phone) => {
          if (phone !== this.customerSearchControl.value) {
            this.customerSearchControl.setValue(phone, { emitEvent: false });
          }
          this.customerSearchResults.set([]);
          this.customerSearchError.set(null);
          this.customerSearchAttempted.set(phone.length >= 3);
          if (phone.length < 3) {
            this.customerSearchLoading.set(false);
            return of<CustomerDetail[]>([]);
          }

          this.customerSearchLoading.set(true);
          return this.customerService.searchCustomers(phone).pipe(
            map((response) => response.data || []),
            catchError((error: unknown) => {
              this.customerSearchError.set(this.getErrorMessage(error, 'Unable to search customers'));
              return of<CustomerDetail[]>([]);
            }),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((customers) => {
        this.customerSearchResults.set(customers);
        this.customerSearchLoading.set(false);
      });

    this.holdingOrdersSearchControl.valueChanges
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        if (this.holdingOrdersModalOpen()) {
          this.loadHoldingOrders();
        }
      });

    this.orderTypeForm.controls.intakeChannel.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((channel) => {
        this.draftIntakeChannel.set(channel);
        this.updateOrderTypeValidators();
      });

    this.orderTypeForm.controls.deliveryPincode.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => this.validateDeliveryPincode(value));

    this.orderTypeForm.controls.pickupLocationId.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.selectedPickupLocationId.set(String(value || '').trim());
      });

    this.orderTypeForm.controls.pickupDateValue.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.selectedPickupDateValue.set(String(value || '').trim());
        this.onPickupDateChanged();
      });

    this.customQuantityControl.valueChanges
      .pipe(debounceTime(250), takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.customQuantity.set(Number(value || 0));
        this.previewCustomMeasuredPrice();
      });

    this.loadConfiguredOffers();
    this.loadBusinessProfile();
    this.paymentOptionsService.get()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => this.paymentOptions.set(this.normalizePaymentOptions(response.data)),
        error: () => this.paymentOptions.set(null),
      });

    this.ordersService.getTenantConfig()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          const config = response.data;
          const storefront = config?.storefrontConfig as { storeDisplayName?: string } | undefined;
          this.storeDisplayName.set(String(storefront?.storeDisplayName || config?.tenantId || 'Store').trim());
          this.tenantId = String(config?.tenantId || '').trim();
          this.storeSlug = String(
            config?.storefrontConfig?.storeSlug
            || config?.storefrontShare?.storeSlug
            || config?.tenantId
            || '',
          ).trim().toLowerCase();
          this.offlineStorageEnabled.set(config?.createOrderConfig?.enableOfflineStorage === true);
          this.applyCreateOrderOptions(config?.createOrderConfig);
          this.applyDeliveryPincodeConfig(config?.deliveryPincodeConfig, config?.storefrontConfig);
          this.applyPickupLocations(config?.storefrontConfig);
          this.scheduleOfferInsightsRefresh();
          this.catalogCache.activeEnabled.set(this.offlineStorageEnabled());
          this.loadCategories();
        },
        error: () => {
          this.loadCategories();
        },
      });
  }

  ngOnDestroy(): void {
    if (this.offerRefreshTimeout) {
      clearTimeout(this.offerRefreshTimeout);
      this.offerRefreshTimeout = null;
    }

    this.catalogCache.unregisterActiveCatalog(this.activeCatalogRefreshHandler);
    if (this.headerSearchActive) {
      this.headerSearch.deactivate('orders-create');
      this.headerSearchActive = false;
    }
  }

  setMobileTab(tab: MobilePosTab): void {
    this.activeMobileTab.set(tab);
  }

  selectCategory(categoryId: string): void {
    if (!categoryId || categoryId === this.selectedCategoryId()) {
      return;
    }

    this.selectedGroupId.set('ALL');
    this.selectedCategoryId.set(categoryId);
    this.loadProducts(categoryId, true);
  }

  selectGroup(groupId: string): void {
    const normalizedGroupId = String(groupId || 'ALL').trim() || 'ALL';
    this.selectedGroupId.set(normalizedGroupId);
    this.keyboardSelectedProductIndex.set(-1);
  }

  selectCartItem(variantId: string): void {
    const normalizedVariantId = String(variantId || '').trim();
    this.selectedCartVariantId.set(normalizedVariantId || null);
    this.activeShortcutArea.set('cart');
  }

  selectPaymentMode(mode: PaymentMode): void {
    if (!this.ensureOrderEditable('change payment method')) {
      return;
    }

    if (!this.availablePaymentMethods().includes(mode)) {
      return;
    }
    this.selectedPaymentMode.set(mode);
    this.activeShortcutArea.set('payment');
  }

  paymentMethodLabel(method: PaymentMode): string {
    if (method === 'BANK_TRANSFER') return 'BANK TRANSFER';
    return method;
  }

  private paymentOrderType(orderType: CareOrderType): PaymentOrderType {
    if (orderType === 'PICKUP_LATER') return 'pickup';
    if (orderType === 'HOME_DELIVERY') return 'delivery';
    return 'inStore';
  }

  private normalizePaymentOptions(raw: unknown): PaymentOptionsConfig | null {
    if (!raw || typeof raw !== 'object') {
      return null;
    }

    const value = raw as Partial<PaymentOptionsConfig> & {
      enabledMethods?: { upi?: boolean; cash?: boolean; bankTransfer?: boolean };
      orderTypeMethods?: Partial<Record<PaymentOrderType, unknown>>;
    };

    const enabled = value.enabledMethods;
    if (!enabled || typeof enabled !== 'object') {
      return null;
    }

    const normalizeMethodList = (methods: unknown): PaymentMode[] => {
      if (!Array.isArray(methods)) {
        return [];
      }
      return methods.filter((method): method is PaymentMode => (
        method === 'UPI' || method === 'CASH' || method === 'BANK_TRANSFER'
      ));
    };

    const upiAccounts = Array.isArray(value.upiAccounts)
      ? value.upiAccounts.map((account) => ({
        id: String(account.id || ''),
        providerName: String(account.providerName || ''),
        upiId: String(account.upiId || ''),
        qrCodeUrl: String(account.qrCodeUrl || ''),
        active: Boolean(account.active),
      }))
      : [];

    const bankAccounts = Array.isArray(value.bankAccounts)
      ? value.bankAccounts.map((account) => ({
        id: String(account.id || ''),
        bankName: String(account.bankName || ''),
        accountHolderName: String(account.accountHolderName || ''),
        accountNumberLast4: String(account.accountNumberLast4 || ''),
        ifscCode: String(account.ifscCode || ''),
        branchName: String(account.branchName || ''),
        active: Boolean(account.active),
      }))
      : [];

    const orderTypeMethods = {
      inStore: normalizeMethodList(value.orderTypeMethods?.inStore),
      pickup: normalizeMethodList(value.orderTypeMethods?.pickup),
      delivery: normalizeMethodList(value.orderTypeMethods?.delivery),
    };

    return {
      enabledMethods: {
        upi: Boolean(enabled.upi),
        cash: Boolean(enabled.cash),
        bankTransfer: Boolean(enabled.bankTransfer),
      },
      upiAccounts,
      bankAccounts,
      orderTypeMethods,
      updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : null,
    };
  }

  openProductDetail(entry: PosVariantCard): void {
    this.detailGroup.set(entry.group);
    this.detailVariant.set(entry.variant);
    this.initializeCustomQuantity(entry.group);
    this.productDetailOpen.set(true);

    const groupId = String(entry.group._id || entry.group.id || '').trim();
    if (!this.offlineStorageEnabled() && this.storeSlug && groupId && !entry.group.allowedUnits?.length) {
      this.ordersService.getStorefrontGroup(this.storeSlug, groupId)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (detail) => {
            if (!this.productDetailOpen() || String(this.detailGroup()?._id || '') !== groupId) {
              return;
            }
            const enrichedGroup: PosProductGroup = {
              ...entry.group,
              groupType: detail.groupType,
              baseUnitId: detail.baseUnitId,
              allowedUnits: detail.allowedUnits || [],
              description: detail.description || entry.group.description,
            };
            this.detailGroup.set(enrichedGroup);
            this.initializeCustomQuantity(enrichedGroup);
          },
        });
    }
  }

  closeProductDetail(): void {
    this.productDetailOpen.set(false);
    this.detailGroup.set(null);
    this.detailVariant.set(null);
    this.customQuantityControl.setValue(null);
    this.customQuantity.set(0);
    this.customUnitId.set('');
  }

  selectDetailVariant(variant: PosProductVariant): void {
    this.detailVariant.set(variant);
  }

  setCustomUnit(unitId: string): void {
    this.customUnitId.set(String(unitId || '').trim());
    this.previewCustomMeasuredPrice();
  }

  addCustomMeasuredToCart(): void {
    if (!this.ensureOrderEditable('add products')) {
      return;
    }

    const group = this.detailGroup();
    const variant = this.detailVariant();
    const quantity = this.customQuantity();
    const unit = this.detailMeasuredUnits().find((item) => item.id === this.customUnitId());
    const baseQuantity = this.customPreviewBaseQuantity();
    const amount = this.customMeasuredAmount();
    if (!group || !variant || !unit || quantity <= 0 || baseQuantity <= 0 || amount <= 0) {
      this.toast.error('Enter a valid custom quantity and select an allowed unit.');
      return;
    }

    const variantId = String(variant._id || variant.id || '').trim();
    if (!variantId) {
      return;
    }

    this.selectedCartVariantId.set(variantId);
    this.cartItems.update((items) => {
      if (items.some((item) => item.variantId === variantId)) {
        return items.map((item) => item.variantId === variantId
          ? this.rebuildCartItem({
              ...item,
              categoryId: item.categoryId || variant.categoryId || group.categoryId || this.findCategoryIdForVariant(variantId),
              variantName: `${this.formatQuantity(quantity)} ${unit.symbol} ${group.name}`,
              quantity: item.customMeasured ? item.quantity + 1 : 1,
              unitLabel: `${this.formatQuantity(quantity)} ${unit.symbol}`,
              unitPrice: amount,
              customMeasured: true,
              measuredQuantity: quantity,
              measuredUnitId: unit.id,
              measuredBaseQuantity: baseQuantity,
            })
          : item);
      }

      return [...items, this.rebuildCartItem({
        variantId,
        groupId: String(group._id || group.id || ''),
        categoryId: variant.categoryId || group.categoryId || this.findCategoryIdForVariant(variantId),
        groupName: String(group.name || 'Product'),
        variantName: `${this.formatQuantity(quantity)} ${unit.symbol} ${group.name}`,
        quantity: 1,
        unitLabel: `${this.formatQuantity(quantity)} ${unit.symbol}`,
        unitPrice: amount,
        lineTotal: amount,
        imageUrl: this.getVariantImageUrl(group, variant),
        customMeasured: true,
        measuredQuantity: quantity,
        measuredUnitId: unit.id,
        measuredBaseQuantity: baseQuantity,
      })];
    });
    this.closeProductDetail();
  }

  decreaseDetailQuantity(variant: PosProductVariant): void {
    if (!this.ensureOrderEditable('change quantity')) {
      return;
    }

    const variantId = String(variant._id || variant.id || '').trim();
    if (!variantId || this.getVariantCartQuantity(variant) <= 1) {
      return;
    }

    this.decreaseCartItem(variantId);
  }

  increaseDetailQuantity(variant: PosProductVariant): void {
    if (!this.ensureOrderEditable('change quantity')) {
      return;
    }

    const variantId = String(variant._id || variant.id || '').trim();
    if (!variantId) {
      return;
    }

    this.increaseCartItem(variantId);
  }

  getVariantDiscountPercent(variant: PosProductVariant): number {
    const sellingPrice = this.getVariantDisplayPrice(variant);
    const mrpPrice = this.getVariantMrpPrice(variant);
    if (mrpPrice <= 0 || mrpPrice <= sellingPrice) {
      return 0;
    }

    return Math.round(((mrpPrice - sellingPrice) / mrpPrice) * 100);
  }

  retryCategories(): void {
    this.loadCategories();
  }

  retryProducts(): void {
    this.loadProducts(this.selectedCategoryId(), true);
  }

  refreshCatalog(): void {
    if (!this.offlineStorageEnabled() || !this.getCatalogScope() || this.catalogRefreshing()) {
      return;
    }

    void this.refreshStoredCatalog();
  }

  formatCatalogLastUpdated(): string {
    const value = this.catalogLastUpdated();
    if (!value) {
      return 'Not cached';
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Unknown' : date.toLocaleString();
  }

  onProductsScroll(event: Event): void {
    const target = event.target as HTMLElement | null;
    if (!target || this.productsLoading() || this.productsLoadingMore() || !this.productsHasMore()) {
      return;
    }

    const threshold = 120;
    const distanceToBottom = target.scrollHeight - target.scrollTop - target.clientHeight;
    if (distanceToBottom <= threshold) {
      this.loadMoreProducts();
    }
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    if (this.productsLoading() || this.productsLoadingMore() || !this.productsHasMore()) {
      return;
    }

    const threshold = 120;
    const scrolledBottom = window.scrollY + window.innerHeight;
    const pageHeight = document.documentElement.scrollHeight;
    if (pageHeight - scrolledBottom <= threshold) {
      this.loadMoreProducts();
    }
  }

  @HostListener('window:keydown', ['$event'])
  onWindowKeydown(event: KeyboardEvent): void {
    const key = String(event.key || '').toUpperCase();
    if (this.handleOrderTypeShortcut(event)) {
      return;
    }

    if (event.altKey && key === 'N') {
      event.preventDefault();
      event.stopPropagation();
      this.startNewOrder();
      return;
    }

    if (event.altKey && this.handlePosAreaShortcut(event)) {
      return;
    }

    if (key === 'ESCAPE') {
      event.preventDefault();
      this.cancelCurrentAction();
      return;
    }

    if (key === 'F2') {
      event.preventDefault();
      this.focusProductSearch();
      return;
    }

    if (this.handleProductSearchShortcut(event)) {
      return;
    }

    if (this.handleProductAreaActivation(event)) {
      return;
    }

    if (this.handleSelectedCartShortcut(event)) {
      return;
    }

    if (this.handleAreaArrowNavigation(event)) {
      return;
    }

    if (key === 'F8') {
      event.preventDefault();
      this.placeOrder();
      return;
    }

    if (this.handleTransactionCompleteShortcut(event, key)) {
      return;
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.createOrderSubMenuOpen()) {
      return;
    }

    const target = event.target as HTMLElement | null;
    if (!target?.closest('.pos-page-header__menu')) {
      this.closeCreateOrderSubMenu();
    }
  }

  private handleOrderTypeShortcut(event: KeyboardEvent): boolean {
    if (!this.canConfigureOrderType()) {
      this.orderTypeShortcutArmedUntil = 0;
      return false;
    }

    const key = String(event.key || '').toUpperCase();
    const now = Date.now();

    if (event.altKey && key === 'T') {
      event.preventDefault();
      event.stopPropagation();
      if (!this.orderTypeEditorOpen()) {
        this.openOrderTypeEditor();
      }
      this.orderTypeShortcutArmedUntil = now + NewCareOrderComponent.ORDER_TYPE_SHORTCUT_ARM_MS;
      return true;
    }

    if (now > this.orderTypeShortcutArmedUntil) {
      this.orderTypeShortcutArmedUntil = 0;
      return false;
    }

    const shortcutDigit = event.code.startsWith('Digit') ? event.code.slice(5) : key;
    const orderTypeByDigit: Record<string, CareOrderType> = {
      '1': 'WALK_IN',
      '2': 'PICKUP_LATER',
      '3': 'HOME_DELIVERY',
    };
    const nextType = orderTypeByDigit[shortcutDigit];
    if (!nextType) {
      return false;
    }

    event.preventDefault();
    event.stopPropagation();
    if (!this.orderTypeEditorOpen()) {
      this.openOrderTypeEditor();
    }
    this.selectDraftOrderType(nextType);
    this.orderTypeShortcutArmedUntil = 0;
    return true;
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.syncViewportState();
    this.syncHeaderSearchState();
  }

  @HostListener('window:mousemove', ['$event'])
  onWindowMousemove(event: MouseEvent): void {
    if (!this.categoryResizeActive()) {
      return;
    }

    this.applyCategoryPanelWidth(event.clientX - this.categoryResizeOriginLeft);
  }

  @HostListener('window:mouseup')
  onWindowMouseup(): void {
    if (!this.categoryResizeActive()) {
      return;
    }

    this.categoryResizeActive.set(false);
  }

  startCategoryResize(event: MouseEvent): void {
    if (this.isMobileViewport()) {
      return;
    }

    const body = (event.currentTarget as HTMLElement | null)?.parentElement;
    const bodyRect = body?.getBoundingClientRect();
    if (!bodyRect) {
      return;
    }

    event.preventDefault();
    this.categoryResizeOriginLeft = bodyRect.left;
    this.categoryResizeActive.set(true);
    this.applyCategoryPanelWidth(event.clientX - this.categoryResizeOriginLeft);
  }

  resetCategoryPanelWidth(): void {
    this.categoryPanelWidth.set(null);
    this.categoryResizeActive.set(false);
  }

  addProduct(product: PosProductGroup): void {
    if (!this.ensureOrderEditable('add products')) {
      return;
    }

    const variant = this.getPrimaryVariant(product);
    if (!variant) {
      return;
    }

    this.addVariantToCart(product, variant);
  }

  addVariantToCart(product: PosProductGroup, variant: PosProductVariant): void {
    if (!this.ensureOrderEditable('add products')) {
      return;
    }

    if (!variant) {
      return;
    }

    const variantId = String(variant._id || variant.id || '');
    if (!variantId) {
      return;
    }

    this.selectedCartVariantId.set(variantId);

    const unitPrice = this.round2(Number(variant.effectivePrice?.sellingPrice ?? variant.price?.sellingPrice ?? 0));
    const unitLabel = this.getVariantUnitLabel(variant);
    const imageUrl = this.getProductImageUrl(product);

    this.cartItems.update((items) => {
      if (items.some((item) => item.variantId === variantId)) {
        return items.map((item) => item.variantId === variantId
          ? this.rebuildCartItem({
              ...item,
              categoryId: item.categoryId || variant.categoryId || product.categoryId || this.findCategoryIdForVariant(variantId),
              quantity: item.quantity + 1,
            })
          : item);
      }

      return [
        ...items,
        this.rebuildCartItem({
          variantId,
          groupId: String(product._id || ''),
          categoryId: variant.categoryId || product.categoryId || this.findCategoryIdForVariant(variantId),
          groupName: String(product.name || 'Product'),
          variantName: String(variant.name || product.name || 'Product'),
          quantity: 1,
          unitLabel,
          unitPrice,
          lineTotal: unitPrice,
          imageUrl,
        }),
      ];
    });
  }

  increaseCartItem(variantId: string): void {
    if (!this.ensureOrderEditable('change quantity')) {
      return;
    }

    this.cartItems.update((items) => items.map((item) => item.variantId === variantId
      ? this.rebuildCartItem({ ...item, quantity: item.quantity + 1 })
      : item));
  }

  decreaseCartItem(variantId: string): void {
    if (!this.ensureOrderEditable('change quantity')) {
      return;
    }

    this.cartItems.update((items) => items
      .map((item) => {
        if (item.variantId !== variantId) {
          return item;
        }

        const nextQuantity = item.quantity - 1;
        return nextQuantity > 0
          ? this.rebuildCartItem({ ...item, quantity: nextQuantity })
          : { ...item, quantity: 0, lineTotal: 0 };
      })
      .filter((item) => item.quantity > 0));
  }

  removeCartItem(variantId: string): void {
    if (!this.ensureOrderEditable('remove products')) {
      return;
    }

    this.cartItems.update((items) => items.filter((item) => item.variantId !== variantId));
    if (this.selectedCartVariantId() === variantId) {
      this.selectedCartVariantId.set(null);
    }
  }

  openCustomerEditor(): void {
    if (!this.ensureOrderEditable('change customer')) {
      return;
    }

    this.customerEditorMode.set('SEARCH');
    this.customerSearchControl.setValue('', { emitEvent: false });
    this.customerSearchResults.set([]);
    this.customerSearchAttempted.set(false);
    this.customerSearchError.set(null);
    this.customerCreateError.set(null);
    this.customerEditorOpen.set(true);
  }

  selectCustomer(selected: CustomerDetail): void {
    if (!this.ensureOrderEditable('change customer')) {
      return;
    }

    this.customer.set({
      id: selected._id,
      name: selected.name,
      phone: selected.phone,
      email: selected.email,
    });
    this.closeCustomerEditor();
  }

  showCreateCustomer(): void {
    this.customerForm.reset({
      phone: String(this.customerSearchControl.value || '').replace(/\D/g, '').slice(0, 10),
      name: '',
      email: '',
    });
    this.customerCreateError.set(null);
    this.customerEditorMode.set('CREATE');
  }

  createAndSelectCustomer(): void {
    if (!this.ensureOrderEditable('change customer')) {
      return;
    }

    if (this.customerForm.invalid || this.customerCreating()) {
      this.customerForm.markAllAsTouched();
      return;
    }

    const raw = this.customerForm.getRawValue();
    const payload = {
      name: raw.name.trim(),
      phone: raw.phone.replace(/\D/g, ''),
      ...(raw.email.trim() ? { email: raw.email.trim() } : {}),
    };
    this.customerCreating.set(true);
    this.customerCreateError.set(null);
    this.customerService.createCustomer(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.customerCreating.set(false);
          this.selectCustomer(response.data);
          this.toast.success('Customer created and selected.');
        },
        error: (error: unknown) => {
          this.customerCreating.set(false);
          this.customerCreateError.set(this.getErrorMessage(error, 'Unable to create customer'));
        },
      });
  }

  skipCustomerSelection(): void {
    if (!this.ensureOrderEditable('change customer')) {
      return;
    }

    this.customer.set({ name: 'Walk-in Customer', phone: '' });
    this.closeCustomerEditor();
  }

  disconnectCustomer(): void {
    if (!this.ensureOrderEditable('change customer')) {
      return;
    }

    this.customerEditorMode.set('SEARCH');
    this.customer.set({ name: 'Walk-in Customer', phone: '' });
    if (this.customerEditorOpen()) {
      this.closeCustomerEditor();
    }
  }

  backToCustomerSearch(): void {
    this.customerEditorMode.set('SEARCH');
    this.customerCreateError.set(null);
  }

  closeCustomerEditor(): void {
    this.customerEditorOpen.set(false);
    this.customerSearchLoading.set(false);
  }

  openOrderTypeEditor(): void {
    if (!this.ensureOrderEditable('change order type')) {
      return;
    }

    if (!this.canConfigureOrderType()) {
      this.forceWalkInOrderType();
      return;
    }

    const applied = this.appliedOrderDetails();
    this.customerEditorOpen.set(false);
    this.draftOrderType.set(applied.orderType);
    this.orderTypeForm.reset({
      intakeChannel: applied.intakeChannel,
      otherIntakeChannel: applied.otherIntakeChannel,
      paymentStatus: applied.paymentStatus || this.getDefaultPaymentStatus(applied.orderType),
      pickupLocationId: applied.pickupLocationId || this.getDefaultPickupLocationId(),
      pickupDateValue: applied.pickupDateValue,
      pickupTimeValue: applied.pickupTimeValue,
      deliveryPincode: applied.deliveryPincode,
      deliveryAddress: applied.deliveryAddress,
      deliveryDateTime: applied.deliveryDateTime,
    });
    this.draftIntakeChannel.set(applied.intakeChannel);
    this.selectedPickupLocationId.set(String(applied.pickupLocationId || this.getDefaultPickupLocationId()).trim());
    if (applied.orderType === 'PICKUP_LATER') {
      this.initializePickupPickerSelection(applied.pickupDateValue, applied.pickupTimeValue);
    }
    this.validateDeliveryPincode(applied.deliveryPincode);
    this.updateOrderTypeValidators();
    this.orderTypeEditorOpen.set(true);
  }

  closeOrderTypeEditor(): void {
    this.orderTypeEditorOpen.set(false);
  }

  selectDraftOrderType(orderType: CareOrderType): void {
    if (!this.ensureOrderEditable('change order type')) {
      return;
    }

    if (!this.canConfigureOrderType()) {
      this.forceWalkInOrderType();
      return;
    }

    this.draftOrderType.set(orderType);
    this.orderTypeForm.controls.paymentStatus.setValue(this.getDefaultPaymentStatus(orderType));

    if (orderType === 'WALK_IN') {
      const shopCounter = this.getEnabledIntakeChannels()
        .find((channel) => channel.toLowerCase() === 'shop counter');
      this.orderTypeForm.controls.intakeChannel.setValue(shopCounter || this.getEnabledIntakeChannels()[0] || '');
    }

    if (orderType !== 'PICKUP_LATER') {
      this.orderTypeForm.controls.pickupLocationId.setValue('');
      this.orderTypeForm.controls.pickupDateValue.setValue('');
      this.orderTypeForm.controls.pickupTimeValue.setValue('');
      this.selectedPickupDateValue.set('');
    } else if (!this.orderTypeForm.controls.pickupLocationId.value) {
      this.orderTypeForm.controls.pickupLocationId.setValue(this.getDefaultPickupLocationId());
      this.initializePickupPickerSelection();
    } else {
      this.initializePickupPickerSelection();
    }
    if (orderType !== 'HOME_DELIVERY') {
      this.orderTypeForm.patchValue({
        deliveryPincode: '',
        deliveryAddress: '',
        deliveryDateTime: '',
      });
      this.deliveryPincodeState.set('EMPTY');
    }

    this.updateOrderTypeValidators();
  }

  applyOrderType(): void {
    if (!this.ensureOrderEditable('change order type')) {
      return;
    }

    if (!this.canConfigureOrderType()) {
      this.forceWalkInOrderType();
      return;
    }

    this.updateOrderTypeValidators();
    if (this.orderTypeForm.invalid || (this.draftOrderType() === 'HOME_DELIVERY' && this.deliveryPincodeState() !== 'SERVICEABLE')) {
      this.orderTypeForm.markAllAsTouched();
      return;
    }

    const previousType = this.orderType();
    const raw = this.orderTypeForm.getRawValue();
    const applied: OrderTypeSelection = {
      orderType: this.draftOrderType(),
      intakeChannel: raw.intakeChannel,
      otherIntakeChannel: raw.otherIntakeChannel.trim(),
      paymentStatus: raw.paymentStatus,
      pickupLocationId: raw.pickupLocationId,
      pickupDateValue: raw.pickupDateValue,
      pickupTimeValue: raw.pickupTimeValue,
      deliveryPincode: raw.deliveryPincode,
      deliveryAddress: raw.deliveryAddress.trim(),
      deliveryDateTime: raw.deliveryDateTime,
    };
    this.appliedOrderDetails.set(applied);
    this.orderType.set(applied.orderType);
    this.orderTypeEditorOpen.set(false);
    if (applied.orderType === 'WALK_IN' && previousType !== 'WALK_IN') {
      this.toast.success('Order type reset to Walk-in.');
    }
  }

  isOtherIntakeChannel(): boolean {
    return this.draftIntakeChannel().trim().toLowerCase() === 'other';
  }

  showDeliveryDetails(): boolean {
    return this.draftOrderType() === 'HOME_DELIVERY' && this.deliveryPincodeState() === 'SERVICEABLE';
  }

  selectPickupLocation(locationId: string): void {
    if (!this.ensureOrderEditable('change pickup details')) {
      return;
    }

    const normalized = String(locationId || '').trim();
    this.selectedPickupLocationId.set(normalized);
    this.orderTypeForm.controls.pickupLocationId.setValue(normalized);
    this.orderTypeForm.controls.pickupDateValue.setValue('');
    this.orderTypeForm.controls.pickupTimeValue.setValue('');
    this.selectedPickupDateValue.set('');
    this.initializePickupPickerSelection();
  }

  appliedPickupLocation(): PickupConfig | null {
    const locationId = String(this.appliedOrderDetails().pickupLocationId || '').trim();
    const locations = this.pickupLocations();
    if (!locations.length) {
      return null;
    }

    if (!locationId) {
      return locations[0] || null;
    }

    return locations.find((location) => String(location.locationId || '').trim() === locationId) || locations[0] || null;
  }

  formatPickupAddress(location: PickupConfig | null): string {
    if (!location) {
      return 'Pickup location will be shared by store.';
    }

    const parts = [
      String(location.storeAddressLine1 || '').trim(),
      String(location.storeAddressLine2 || '').trim(),
      String(location.city || '').trim(),
      String(location.state || '').trim(),
      String(location.postalCode || '').trim(),
    ].filter(Boolean);
    return parts.join(', ') || 'Pickup location will be shared by store.';
  }

  private formatBusinessAddress(profile: BusinessProfile | null): string {
    if (!profile?.address) {
      return '';
    }

    const address = profile.address;
    return [
      String(address.line1 || '').trim(),
      String(address.line2 || '').trim(),
      String(address.city || '').trim(),
      String(address.state || '').trim(),
      String(address.postalCode || '').trim(),
    ].filter(Boolean).join(', ');
  }

  appliedPickupDateLabel(): string {
    const value = String(this.appliedOrderDetails().pickupDateValue || '').trim();
    if (!value) {
      return '';
    }

    return this.pickupDateOptions().find((option) => option.value === value)?.label || this.formatPickupDateValue(value);
  }

  appliedPickupTimeLabel(): string {
    const value = String(this.appliedOrderDetails().pickupTimeValue || '').trim();
    if (!value) {
      return '';
    }

    return this.pickupTimeOptions().find((option) => option.value === value)?.label || value.replace(/^\d{4}-\d{2}-\d{2}\s+/, '');
  }

  orderTypeLabel(orderType = this.orderType()): string {
    const labels: Record<CareOrderType, string> = {
      WALK_IN: 'Walk-in',
      PICKUP_LATER: 'Pickup Later',
      HOME_DELIVERY: 'Home Delivery',
    };
    return labels[orderType];
  }

  appliedIntakeChannelLabel(): string {
    const applied = this.appliedOrderDetails();
    return applied.intakeChannel.toLowerCase() === 'other'
      ? applied.otherIntakeChannel || 'Other'
      : applied.intakeChannel;
  }

  formatFulfillmentDateTime(value: string): string {
    if (!value) {
      return '';
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString([], {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  }

  deliveryPincodeMessage(): string {
    if (this.deliveryPincodeState() === 'SERVICEABLE') {
      const charge = this.baseDeliveryCharge();
      return `Delivery is available for this pincode. Delivery charge: ${this.formatCurrency(charge)}.`;
    }
    if (this.deliveryPincodeState() === 'INVALID') {
      return 'Enter a valid 6-digit pincode.';
    }
    if (this.deliveryPincodeState() === 'UNSERVICEABLE') {
      return this.deliveryPincodeConfig().nonServiceableSuggestion === 'CALL_PICKUP'
        ? 'Delivery is unavailable. Offer store pickup instead.'
        : 'Delivery is unavailable. Contact a courier for assistance.';
    }
    return '';
  }

  clearOrder(): void {
    if (!this.ensureOrderEditable('clear this order')) {
      return;
    }

    if (!this.cartItems().length) {
      return;
    }

    this.clearOrderConfirmOpen.set(true);
  }

  openOffersPanel(): void {
    if (!this.configuredOffersLoaded() && !this.configuredOffersLoading()) {
      this.loadConfiguredOffers();
    }
    this.offersPanelOpen.set(true);
  }

  applyOfferCoupon(code: string): void {
    if (!this.ensureOrderEditable('change discounts')) {
      return;
    }

    const normalizedCode = String(code || '').trim().toUpperCase();
    if (!normalizedCode) {
      return;
    }

    if (this.appliedCouponCodes().includes(normalizedCode)) {
      return;
    }

    this.appliedCouponCodes.update((codes) => [...new Set([...codes, normalizedCode])]);
    this.scheduleOfferInsightsRefresh();
  }

  removeOfferCoupon(code: string): void {
    if (!this.ensureOrderEditable('change discounts')) {
      return;
    }

    const normalizedCode = String(code || '').trim().toUpperCase();
    if (!normalizedCode) {
      return;
    }

    this.appliedCouponCodes.update((codes) => codes.filter((row) => row !== normalizedCode));
    this.scheduleOfferInsightsRefresh();
  }

  closeOffersPanel(): void {
    this.offersPanelOpen.set(false);
  }

  cancelClearOrder(): void {
    this.clearOrderConfirmOpen.set(false);
  }

  confirmClearOrder(): void {
    if (!this.ensureOrderEditable('clear this order')) {
      return;
    }

    this.resetOrderDraftState();
  }

  openOrderNoteModal(): void {
    if (!this.ensureOrderEditable('update order note')) {
      return;
    }

    this.orderNoteControl.setValue(this.orderStaffNote());
    this.orderNoteModalOpen.set(true);
  }

  closeOrderNoteModal(): void {
    this.orderNoteModalOpen.set(false);
  }

  saveOrderNote(): void {
    const note = String(this.orderNoteControl.value || '').trim();
    this.orderStaffNote.set(note);
    this.orderNoteModalOpen.set(false);
    this.toast.success(note ? 'Order note saved.' : 'Order note cleared.');
  }

  async confirmHoldOrder(): Promise<void> {
    if (this.orderSubmitting() || this.holdOrderSubmitting()) {
      return;
    }

    if (this.isOrderFrozen()) {
      this.toast.warning('Order is completed and frozen. Start a new order to hold another cart.');
      return;
    }

    if (this.cartEmpty()) {
      this.toast.warning('Add products before holding the order.');
      return;
    }

    this.holdOrderSubmitting.set(true);

    try {
      const requireMemberForBilling = this.createOrderOptions().requireMemberForBilling;
      const customerId = await this.resolveCustomerIdForPlacement(requireMemberForBilling);
      if (!customerId) {
        this.toast.warning(requireMemberForBilling
          ? 'Select a customer before holding the order.'
          : 'Unable to resolve a billing member for this order.');
        return;
      }

      const reference = String(this.holdOrderReferenceControl.value || '').trim();
      const success = await this.persistCurrentCartAsHoldOrder(customerId, reference, 'Order held as');
      if (!success) {
        return;
      }
      this.holdOrderModalOpen.set(false);
      this.holdOrderReferenceControl.setValue('');
      this.prepareNextEmptyOrder();
      if (this.holdingOrdersModalOpen()) {
        this.loadHoldingOrders();
      }
    } catch (error: unknown) {
      this.toast.error(this.getErrorMessage(error, 'Failed to hold the order.'));
    } finally {
      this.holdOrderSubmitting.set(false);
    }
  }

  async resumeHoldingOrder(order: Order): Promise<void> {
    if (!order?._id || this.holdingOrdersLoading() || this.holdingOrdersDeleting()) {
      return;
    }

    if (!this.cartEmpty()) {
      this.switchHoldOrderTarget.set(order);
      this.switchHoldReturnToList.set(true);
      this.holdingOrdersModalOpen.set(false);
      setTimeout(() => {
        this.switchHoldOrderModalOpen.set(true);
      }, 0);
      return;
    }

    await this.resumeHoldingOrderDirect(order);
  }

  closeSwitchHoldOrderModal(): void {
    this.switchHoldOrderModalOpen.set(false);
    this.switchHoldOrderTarget.set(null);
    if (this.switchHoldReturnToList()) {
      this.holdingOrdersModalOpen.set(true);
    }
    this.switchHoldReturnToList.set(false);
  }

  async holdCurrentAndResumeSelected(): Promise<void> {
    const target = this.switchHoldOrderTarget();
    if (!target?._id) {
      this.closeSwitchHoldOrderModal();
      return;
    }

    const requireMemberForBilling = this.createOrderOptions().requireMemberForBilling;
    const customerId = await this.resolveCustomerIdForPlacement(requireMemberForBilling);
    if (!customerId) {
      this.toast.warning(requireMemberForBilling
        ? 'Select a customer before holding the current order.'
        : 'Unable to resolve a billing member for this order.');
      return;
    }

    const reference = `Hold while switching to ${target.orderNo}`;
    const success = await this.persistCurrentCartAsHoldOrder(customerId, reference, 'Current order held.');
    if (!success) {
      return;
    }

    this.switchHoldReturnToList.set(false);
    this.switchHoldOrderModalOpen.set(false);
    this.switchHoldOrderTarget.set(null);
    this.prepareNextEmptyOrder();
    await this.resumeHoldingOrderDirect(target);
  }

  async discardCurrentAndResumeSelected(): Promise<void> {
    const target = this.switchHoldOrderTarget();
    if (!target?._id) {
      this.closeSwitchHoldOrderModal();
      return;
    }

    this.resetOrderDraftState();
    this.switchHoldReturnToList.set(false);
    this.switchHoldOrderModalOpen.set(false);
    this.switchHoldOrderTarget.set(null);
    await this.resumeHoldingOrderDirect(target);
  }

  private async resumeHoldingOrderDirect(order: Order): Promise<void> {
    if (!order?._id) {
      return;
    }

    this.holdingOrdersLoading.set(true);

    try {
      const response = await firstValueFrom(this.ordersService.getOrderById(order._id));
      const draft = response.data;
      this.applyHeldDraftOrder(draft);
      await firstValueFrom(this.ordersService.deleteOrder(order._id));
      this.toast.success(`Resumed ${draft.orderNo}.`);
      this.holdingOrders.update((orders) => orders.filter((item) => item._id !== order._id));
      this.holdingOrdersModalOpen.set(false);
    } catch (error: unknown) {
      this.toast.error(this.getErrorMessage(error, 'Failed to resume hold order.'));
    } finally {
      this.holdingOrdersLoading.set(false);
    }
  }

  private async persistCurrentCartAsHoldOrder(customerId: string, reference: string, successPrefix: string): Promise<boolean> {
    try {
      const draftPayload = this.buildCreateDraftPayload(customerId);
      draftPayload.notes = this.buildHoldOrderNotes(reference, draftPayload.notes);
      const draftResponse = await firstValueFrom(this.ordersService.createDraft(draftPayload));
      const draftOrderNo = String(draftResponse.data.orderNo || draftResponse.data.draftId || '').trim();
      this.toast.success(draftOrderNo ? `${successPrefix} ${draftOrderNo}.` : `${successPrefix}`);
      return true;
    } catch (error: unknown) {
      this.toast.error(this.getErrorMessage(error, 'Failed to hold the order.'));
      return false;
    }
  }

  openDeleteHoldingOrderConfirm(order: Order): void {
    this.holdingOrderDeleteTarget.set(order);
    this.holdingOrderDeleteConfirmOpen.set(true);
  }

  closeDeleteHoldingOrderConfirm(): void {
    if (this.holdingOrdersDeleting()) {
      return;
    }

    this.holdingOrderDeleteConfirmOpen.set(false);
    this.holdingOrderDeleteTarget.set(null);
  }

  confirmDeleteHoldingOrder(): void {
    const target = this.holdingOrderDeleteTarget();
    if (!target?._id) {
      this.closeDeleteHoldingOrderConfirm();
      return;
    }

    this.holdingOrdersDeleting.set(true);
    this.ordersService.deleteOrder(target._id).subscribe({
      next: () => {
        this.toast.success('Holding order deleted.');
        this.holdingOrders.update((orders) => orders.filter((order) => order._id !== target._id));
        this.holdingOrdersDeleting.set(false);
        this.closeDeleteHoldingOrderConfirm();
      },
      error: (error) => {
        this.holdingOrdersDeleting.set(false);
        this.toast.error(this.getErrorMessage(error, 'Failed to delete holding order.'));
      },
    });
  }

  loadHoldingOrders(): void {
    const search = String(this.holdingOrdersSearchControl.value || '').trim();
    this.holdingOrdersLoading.set(true);

    this.ordersService.listOrders({
      status: 'DRAFT',
      search: search || undefined,
      limit: 50,
      sortBy: 'createdAt',
      order: 'desc',
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.holdingOrders.set((response.data || []).filter((order) => String(order.status || '').toUpperCase() === 'DRAFT'));
          this.holdingOrdersLoading.set(false);
        },
        error: (error) => {
          this.holdingOrdersLoading.set(false);
          this.toast.error(this.getErrorMessage(error, 'Failed to load holding orders.'));
        },
      });
  }

  placeOrder(): void {
    if (this.orderSubmitting()) {
      return;
    }

    if (this.isOrderFrozen()) {
      this.toast.warning('Order is completed and frozen. Start a new order to continue.');
      return;
    }

    if (this.cartEmpty()) {
      return;
    }

    if (this.billingMemberMissing()) {
      this.openCustomerEditor();
      this.toast.error('Adding a member in billing is mandatory. Select or create a member to continue.');
      return;
    }

    this.openUpiPaymentModal();
  }

  openUpiPaymentModal(): void {
    if (this.selectedPaymentMode() === 'UPI' && !this.activeUpiAccounts().length) {
      this.toast.warning('No active UPI account is configured.');
      return;
    }

    if (this.selectedPaymentMode() === 'BANK_TRANSFER' && !this.activeBankAccounts().length) {
      this.toast.warning('No active bank account is configured.');
      return;
    }

    this.paymentUpiModalOpen.set(true);
  }

  closeUpiPaymentModal(): void {
    this.paymentUpiModalOpen.set(false);
  }

  selectUpiAccount(accountId: string): void {
    this.selectedUpiAccountId.set(String(accountId || '').trim());
  }

  selectBankAccount(accountId: string): void {
    this.selectedBankAccountId.set(String(accountId || '').trim());
  }

  confirmUpiPaymentReceived(): void {
    if (this.orderSubmitting()) {
      return;
    }

    void this.submitOrderAfterPayment('UPI_MANUAL');
  }

  confirmCashPaymentReceived(): void {
    if (this.orderSubmitting()) {
      return;
    }

    void this.submitOrderAfterPayment('CASH');
  }

  confirmBankTransferPaymentReceived(): void {
    if (this.orderSubmitting()) {
      return;
    }

    void this.submitOrderAfterPayment('NET_BANKING');
  }

  closePaymentCompleteModal(): void {
    this.paymentCompleteModalOpen.set(false);
    this.completedTransaction.set(null);
    this.billTemplateConfig.set(null);
    this.billTemplateName.set('');
  }

  onFuturePaymentActionClick(): void {
    // Intentionally empty until print/share actions are implemented.
  }

  startNewOrder(): void {
    if (this.paymentCompleteModalOpen()) {
      this.closePaymentCompleteModal();
      this.toast.success('New order is ready.');
      this.focusProductSearch();
      return;
    }

    this.resetOrderDraftState();
    this.toast.success('Started a new order.');
    this.focusProductSearch();
  }

  async downloadBillPdf(): Promise<void> {
    if (this.billPdfDownloading()) {
      return;
    }

    const config = this.billTemplateConfig();
    if (!config) {
      this.toast.warning('Bill template is not available yet.');
      return;
    }

    this.billPdfDownloading.set(true);
    try {
      const previewElement = this.billPdfExportTarget?.nativeElement || this.billPdfTarget?.nativeElement;
      if (!previewElement) {
        throw new Error('Bill preview is not available for PDF export.');
      }

      const pageFormat: 'a4' | [number, number] = config.page.size === 'A4' ? 'a4' : [80, 220];
      const doc = new jsPDF({
        unit: 'mm',
        format: pageFormat,
      });

      const html2canvasModule = await import('html2canvas');
      const html2canvas = html2canvasModule.default;
      const canvas = await html2canvas(previewElement, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      this.writeCanvasToPdf(doc, canvas, config.page.size === 'A4' ? 8 : 4);

      doc.save(`bill-${Date.now()}.pdf`);
    } catch (error: unknown) {
      this.toast.error(this.getErrorMessage(error, 'Unable to download bill PDF.'));
    } finally {
      this.billPdfDownloading.set(false);
    }
  }

  private writeCanvasToPdf(doc: jsPDF, canvas: HTMLCanvasElement, margin: number): void {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const renderWidth = pageWidth - margin * 2;
    const pageRenderHeight = pageHeight - margin * 2;
    const imageHeight = (canvas.height * renderWidth) / canvas.width;
    const imageData = canvas.toDataURL('image/png');

    if (imageHeight <= pageRenderHeight) {
      doc.addImage(imageData, 'PNG', margin, margin, renderWidth, imageHeight, undefined, 'FAST');
      return;
    }

    let offsetY = 0;
    let remainingHeight = imageHeight;
    doc.addImage(imageData, 'PNG', margin, margin, renderWidth, imageHeight, undefined, 'FAST');
    remainingHeight -= pageRenderHeight;

    while (remainingHeight > 0) {
      offsetY -= pageRenderHeight;
      doc.addPage();
      doc.addImage(imageData, 'PNG', margin, margin + offsetY, renderWidth, imageHeight, undefined, 'FAST');
      remainingHeight -= pageRenderHeight;
    }
  }

  setFieldValue(fieldId: string, value: unknown): void {
    this.fieldValues.update((current) => ({ ...current, [fieldId]: value }));
  }

  getComponentTitle(component: PosComponentId): string {
    const titles: Record<PosComponentId, string> = {
      CATEGORY_TOOLS: 'Categories',
      PRODUCT_GRID: 'Products',
      CLEAR_ORDER: 'Clear Order',
      CUSTOMER: 'Customer',
      ORDER_TYPE: 'Order Type',
      CART_ITEMS: 'Cart Items',
      ORDER_SUMMARY: 'Order Summary',
      PLACE_ORDER: 'Place Order',
    };

    return titles[component];
  }

  getFieldValue(fieldId: string): string {
    return '';
  }

  getProductDisplayPrice(product: PosProductGroup): number {
    const variant = this.getPrimaryVariant(product);
    return Number(variant?.effectivePrice?.sellingPrice ?? variant?.price?.sellingPrice ?? 0);
  }

  getProductUnitLabel(product: PosProductGroup): string {
    const variant = this.getPrimaryVariant(product);
    if (!variant) {
      return 'unit';
    }

    return this.getVariantUnitLabel(variant);
  }

  getProductCartQuantity(product: PosProductGroup): number {
    const variantId = this.getPrimaryVariantId(product);
    if (!variantId) {
      return 0;
    }

    return Number(this.cartQuantityByVariantId()[variantId] || 0);
  }

  getVariantDisplayPrice(variant: PosProductVariant): number {
    return Number(variant.effectivePrice?.sellingPrice ?? variant.price?.sellingPrice ?? 0);
  }

  getVariantMrpPrice(variant: PosProductVariant): number {
    return Number(variant.effectivePrice?.anchorPrice ?? variant.price?.anchorPrice ?? 0);
  }

  getVariantDisplayName(group: PosProductGroup, variant: PosProductVariant): string {
    const displayName = String(variant.displayName || '').trim();
    if (displayName) {
      return displayName;
    }

    const variantName = String(variant.name || '').trim();
    if (variantName) {
      return variantName;
    }

    const quantityLabel = this.getVariantQuantityText(variant);
    const groupName = String(variant.groupName || group.name || 'Product').trim();
    return [quantityLabel, groupName].filter(Boolean).join(' ');
  }

  getVariantCartQuantity(variant: PosProductVariant): number {
    const variantId = String(variant._id || variant.id || '').trim();
    if (!variantId) {
      return 0;
    }

    return Number(this.cartQuantityByVariantId()[variantId] || 0);
  }

  getVariantImageUrl(group: PosProductGroup, variant: PosProductVariant): string {
    const variantImageUrl = String(variant.images?.[0]?.url || '').trim();
    if (variantImageUrl) {
      return variantImageUrl;
    }

    return this.getProductImageUrl(group);
  }

  getCategoryImageUrl(category: Category): string {
    return String(category.imageUrl || '').trim();
  }

  getVariantUnitText(variant: PosProductVariant): string {
    return this.getVariantQuantityText(variant);
  }

  private getVariantQuantityText(variant: PosProductVariant): string {
    const variantLabel = String(variant.variantLabel || '').trim();
    if (variantLabel) {
      return variantLabel;
    }

    const quantity = Number(variant.quantity ?? variant.convertedQuantity ?? 0);
    const unitSymbol = String(variant.unitSymbol || '').trim();
    if (!quantity) {
      return unitSymbol || 'unit';
    }

    const unitSuffix = unitSymbol ? ` ${unitSymbol}` : '';
    return `${this.formatQuantity(quantity)}${unitSuffix}`;
  }

  private loadCategories(): void {
    this.categoriesLoading.set(true);
    this.categoriesError.set(null);

    if (this.storeSlug) {
      if (this.offlineStorageEnabled() && this.getCatalogScope()) {
        void this.loadStoredOrRemoteCatalog();
        return;
      }

      this.ordersService.getStorefrontProductsContext(this.storeSlug)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (context) => this.applyLoadedCategories(this.getContextCategories(context)),
          error: () => this.loadAdminCategories(),
        });
      return;
    }

    this.loadAdminCategories();
  }

  private loadAdminCategories(): void {

    this.categoriesService.getCategories(1, 200, 'ACTIVE').pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        const categories = Array.isArray(response.data) ? response.data : [];
        this.applyLoadedCategories(categories);
      },
      error: (error: unknown) => {
        this.categoriesLoading.set(false);
        this.categoriesError.set(this.getErrorMessage(error, 'Failed to load categories'));
      },
    });
  }

  private applyLoadedCategories(categories: Category[]): void {
    this.categories.set(categories);
    this.categoriesLoading.set(false);

    const selectedId = this.selectedCategoryId();
    if (selectedId && categories.some((category) => category._id === selectedId)) {
      this.loadProducts(selectedId, true);
      return;
    }

    const firstCategory = categories[0] || null;
    this.selectedCategoryId.set(firstCategory?._id || null);
    if (firstCategory?._id) {
      this.loadProducts(firstCategory._id, true);
    } else {
      this.products.set([]);
    }
  }

  private loadMoreProducts(): void {
    this.loadProducts(this.selectedCategoryId(), false);
  }

  private loadProducts(categoryId: string | null, reset = false): void {
    const normalizedSearch = String(this.productSearch() || '').trim();
    const normalizedCategoryId = String(categoryId || '').trim();
    const effectiveCategoryId = normalizedSearch ? '' : normalizedCategoryId;

    if (this.routeStorefrontProductLoad(reset, normalizedSearch, effectiveCategoryId)) {
      return;
    }

    if (!effectiveCategoryId && !normalizedSearch) {
      this.products.set([]);
      this.productsLoading.set(false);
      this.productsLoadingMore.set(false);
      this.productsHasMore.set(false);
      return;
    }

    if (reset) {
      this.products.set([]);
      this.productsPage.set(1);
      this.productsTotal.set(0);
      this.productsHasMore.set(false);
      this.productsLoading.set(true);
      this.productsLoadingMore.set(false);
    } else {
      if (!this.productsHasMore()) {
        return;
      }

      this.productsLoadingMore.set(true);
    }

    this.productsError.set(null);

    const requestPage = this.productsPage();
    const requestToken = requestPage + (reset ? 100000 : 200000) + Date.now();
    this.activeProductsRequestToken = requestToken;

    forkJoin({
      groups: this.ordersService.listGroups({
        categoryId: effectiveCategoryId || undefined,
        search: normalizedSearch || undefined,
        page: requestPage,
        limit: this.productsPageSize,
      }),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ groups }) => {
          if (requestToken !== this.activeProductsRequestToken) {
            return;
          }

          const groupItems = Array.isArray(groups.data) ? groups.data : [];
          const groupIds = groupItems.map((group) => String(group._id || '').trim()).filter(Boolean);

          if (!groupItems.length) {
            if (reset) {
              this.products.set([]);
            }
            this.productsTotal.set(Number(groups.pagination?.total || 0));
            this.productsHasMore.set(Boolean(groups.pagination?.hasMore));
            this.productsLoading.set(false);
            this.productsLoadingMore.set(false);
            this.ensureProductsScrollable();
            return;
          }

          const variantRequests = groupIds.map((groupId) => this.listAllVariantsForGroup(groupId));
          forkJoin(variantRequests).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: (variantsByGroup) => {
              if (requestToken !== this.activeProductsRequestToken) {
                return;
              }

              const variantsByGroupId = new Map<string, PosProductVariant[]>();
              variantsByGroup.forEach((variantItems) => {
                for (const variant of variantItems) {
                  const groupKey = String(variant.groupId || '').trim();
                  if (!groupKey) {
                    continue;
                  }

                  const existing = variantsByGroupId.get(groupKey) || [];
                  existing.push(variant);
                  variantsByGroupId.set(groupKey, existing);
                }
              });

              const pageProducts = groupItems.map((group) => ({
                ...group,
                variants: variantsByGroupId.get(String(group._id || '').trim()) || [],
              }));

              this.products.update((existing) => reset ? pageProducts : [...existing, ...pageProducts]);
              this.productsPage.set(requestPage + 1);
              this.productsTotal.set(Number(groups.pagination?.total || 0));
              this.productsHasMore.set(Boolean(groups.pagination?.hasMore));
              this.productsLoading.set(false);
              this.productsLoadingMore.set(false);
              this.ensureProductsScrollable();
            },
            error: (error: unknown) => {
              if (requestToken !== this.activeProductsRequestToken) {
                return;
              }

              this.productsLoading.set(false);
              this.productsLoadingMore.set(false);
              this.productsError.set(this.getErrorMessage(error, 'Failed to load products'));
            },
          });
        },
        error: (error: unknown) => {
          if (requestToken !== this.activeProductsRequestToken) {
            return;
          }

          this.productsLoading.set(false);
          this.productsLoadingMore.set(false);
          this.productsError.set(this.getErrorMessage(error, 'Failed to load products'));
        },
      });
  }

  private routeStorefrontProductLoad(reset: boolean, search: string, categoryId: string): boolean {
    if (!reset || !this.storeSlug) {
      return false;
    }

    if (search) {
      if (this.offlineStorageEnabled()) {
        this.loadStoredSearchProducts(search);
      } else {
        this.loadStorefrontSearchProducts(search);
      }
      return true;
    }

    if (!categoryId) {
      return false;
    }

    if (this.offlineStorageEnabled()) {
      const cachedDetail = this.cachedCategoryDetails[categoryId];
      if (cachedDetail) {
        this.applyStorefrontCategoryProducts(cachedDetail);
      } else {
        this.products.set([]);
        this.productsTotal.set(0);
        this.productsLoading.set(false);
        this.productsLoadingMore.set(false);
        this.productsHasMore.set(false);
        this.productsError.set('This category is not available in the local catalog. Refresh Catalog to update it.');
      }
      return true;
    }

    this.loadStorefrontCategoryProducts(categoryId);
    return true;
  }

  private activeProductsRequestToken = 0;

  private loadStorefrontCategoryProducts(categoryId: string): void {
    this.products.set([]);
    this.productsPage.set(1);
    this.productsTotal.set(0);
    this.productsHasMore.set(false);
    this.productsLoading.set(true);
    this.productsLoadingMore.set(false);
    this.productsError.set(null);

    const requestToken = Date.now();
    this.activeProductsRequestToken = requestToken;

    this.ordersService.getStorefrontCategoryProducts(this.storeSlug, categoryId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (detail) => {
          if (requestToken !== this.activeProductsRequestToken) {
            return;
          }
          this.applyStorefrontCategoryProducts(detail);
        },
        error: (error: unknown) => {
          if (requestToken !== this.activeProductsRequestToken) {
            return;
          }

          this.productsLoading.set(false);
          this.productsLoadingMore.set(false);
          this.productsError.set(this.getErrorMessage(error, 'Failed to load category products'));
        },
      });
  }

  private async loadStoredOrRemoteCatalog(): Promise<void> {
    const scope = this.getCatalogScope();
    if (!scope) {
      this.loadAdminCategories();
      return;
    }

    try {
      const cached = await this.catalogCache.get(scope);
      if (cached) {
        this.applyCachedCatalog(cached);
        return;
      }

      const record = await this.fetchAndStoreCompleteCatalog(scope);
      this.applyCachedCatalog(record);
    } catch (error: unknown) {
      this.categoriesLoading.set(false);
      this.categoriesError.set(this.getErrorMessage(error, 'Failed to load catalog'));
    }
  }

  private async refreshStoredCatalog(): Promise<void> {
    const scope = this.getCatalogScope();
    if (!scope) {
      return;
    }

    this.catalogRefreshing.set(true);
    this.catalogCache.activeRefreshing.set(true);
    this.categoriesError.set(null);
    this.productsError.set(null);
    try {
      const record = await this.fetchAndStoreCompleteCatalog(scope);
      this.applyCachedCatalog(record);
      this.toast.success('Catalog refreshed successfully.');
    } catch (error: unknown) {
      this.toast.error(this.getErrorMessage(error, 'Failed to refresh catalog'));
    } finally {
      this.catalogRefreshing.set(false);
      this.catalogCache.activeRefreshing.set(false);
    }
  }

  private async fetchAndStoreCompleteCatalog(scope: CreateOrderCatalogScope): Promise<CreateOrderCatalogCacheRecord> {
    const context = await firstValueFrom(this.ordersService.getStorefrontProductsContext(scope.storeSlug));
    const categoryIds = this.getContextCategories(context).map((category) => String(category._id || '')).filter(Boolean);
    const details = categoryIds.length
      ? await firstValueFrom(forkJoin(categoryIds.map((categoryId) =>
          this.ordersService.getStorefrontCategoryProducts(scope.storeSlug, categoryId))))
      : [];
    const categoryDetails = details.reduce<Record<string, ProductsTabCategoryDetail>>((result, detail) => {
      const categoryId = String(detail.category?.id || '').trim();
      if (categoryId) {
        result[categoryId] = detail;
      }
      return result;
    }, {});

    return this.catalogCache.replace(scope, context, categoryDetails);
  }

  private applyCachedCatalog(record: CreateOrderCatalogCacheRecord): void {
    this.cachedCategoryDetails = record.categoryDetails || {};
    this.catalogLastUpdated.set(record.lastUpdated || null);
    this.catalogCache.activeLastUpdated.set(record.lastUpdated || null);
    this.applyLoadedCategories(this.getContextCategories(record.context));
  }

  private getContextCategories(context: ProductsTabContext): Category[] {
    const seen = new Set<string>();
    const categories: Category[] = [];
    const addCategory = (category: { id: string; name: string; imageUrl?: string }) => {
      const id = String(category.id || '').trim();
      if (!id || seen.has(id)) {
        return;
      }

      seen.add(id);
      categories.push({ _id: id, name: category.name, imageUrl: category.imageUrl, status: 'ACTIVE' });
    };

    for (const collection of context.collections || []) {
      for (const category of collection.categories || []) {
        addCategory(category);
      }
    }
    for (const category of context.others?.categories || []) {
      addCategory(category);
    }

    return categories;
  }

  private applyStorefrontCategoryProducts(detail: ProductsTabCategoryDetail): void {
    const variantsByGroupId = new Map<string, PosProductVariant[]>();
    for (const row of detail.variants || []) {
      const groupId = String(row.groupId || '').trim();
      if (!groupId) {
        continue;
      }

      const variants = variantsByGroupId.get(groupId) || [];
      variants.push({
        _id: row.id,
        id: row.id,
        groupId,
        categoryId: detail.category.id,
        name: String(row.name || '').trim(),
        groupName: String(row.groupName || '').trim(),
        displayName: String(row.name || '').trim(),
        quantity: Number(row.quantity || 0),
        unitId: String(row.unitId || '').trim(),
        unitSymbol: String(row.unitSymbol || '').trim(),
        convertedQuantity: Number(row.convertedQuantity || 0),
        effectivePrice: {
          sellingPrice: Number(row.effectivePrice?.sellingPrice || 0),
          anchorPrice: Number(row.effectivePrice?.anchorPrice || 0),
          actualPrice: Number(row.effectivePrice?.actualPrice || 0),
        },
        status: row.status,
        images: row.images || [],
      });
      variantsByGroupId.set(groupId, variants);
    }

    const products: PosProductGroup[] = (detail.groups || []).map((group) => ({
      _id: group.id,
      id: group.id,
      categoryId: detail.category.id,
      name: group.name,
      imageUrl: group.imageUrl,
      groupType: group.groupType,
      baseUnitId: group.baseUnitId,
      allowedUnits: group.allowedUnits || [],
      status: 'ACTIVE',
      variants: variantsByGroupId.get(group.id) || [],
    }));

    this.products.set(products);
    this.productsTotal.set(detail.pagination?.total || detail.variants.length);
    this.productsHasMore.set(false);
    this.productsLoading.set(false);
    this.productsLoadingMore.set(false);
    this.selectedGroupId.set('ALL');
    this.selectFirstSearchResult();
  }

  private loadStoredSearchProducts(search: string): void {
    const normalizedSearch = search.trim().toLowerCase();
    this.productsError.set(null);
    this.productsLoading.set(false);
    this.productsLoadingMore.set(false);
    this.productsHasMore.set(false);
    if (normalizedSearch.length < 2) {
      this.products.set([]);
      this.productsTotal.set(0);
      return;
    }

    const productsByGroupId = new Map<string, PosProductGroup>();
    for (const detail of Object.values(this.cachedCategoryDetails)) {
      const groupsById = new Map((detail.groups || []).map((group) => [group.id, group]));
      for (const row of detail.variants || []) {
        const searchableText = `${row.name || ''} ${row.groupName || ''} ${row.unitSymbol || ''}`.toLowerCase();
        if (!searchableText.includes(normalizedSearch)) {
          continue;
        }

        const groupId = String(row.groupId || '').trim();
        const groupSummary = groupsById.get(groupId);
        const product = productsByGroupId.get(groupId) || {
          _id: groupId,
          id: groupId,
          categoryId: detail.category.id,
          name: row.groupName || groupSummary?.name || 'Product',
          imageUrl: groupSummary?.imageUrl || row.groupImageUrl,
          groupType: groupSummary?.groupType,
          baseUnitId: groupSummary?.baseUnitId,
          allowedUnits: groupSummary?.allowedUnits || [],
          status: 'ACTIVE' as const,
          variants: [],
        };
        product.variants?.push({
          _id: row.id,
          id: row.id,
          groupId,
          categoryId: detail.category.id,
          name: row.name || row.groupName,
          groupName: row.groupName,
          displayName: row.name || row.groupName,
          quantity: row.quantity,
          unitId: row.unitId,
          unitSymbol: row.unitSymbol,
          convertedQuantity: row.convertedQuantity,
          effectivePrice: {
            sellingPrice: Number(row.effectivePrice?.sellingPrice || 0),
            anchorPrice: Number(row.effectivePrice?.anchorPrice || 0),
            actualPrice: Number(row.effectivePrice?.actualPrice || 0),
          },
          status: row.status,
          images: row.images || [],
        });
        productsByGroupId.set(groupId, product);
      }
    }

    const products = Array.from(productsByGroupId.values());
    this.products.set(products);
    this.productsTotal.set(products.reduce((total, product) => total + (product.variants?.length || 0), 0));
    this.selectedGroupId.set('ALL');
    this.selectFirstSearchResult();
  }

  private getCatalogScope(): CreateOrderCatalogScope | null {
    if (!this.tenantId || !this.storeSlug) {
      return null;
    }

    return { tenantId: this.tenantId, storeSlug: this.storeSlug };
  }

  private initializeCustomQuantity(group: PosProductGroup): void {
    const units = group.allowedUnits?.length ? group.allowedUnits : this.inferMeasuredUnits(group);
    const defaultUnit = units.find((unit) => unit.id === group.baseUnitId) || units[0];
    this.customUnitId.set(defaultUnit?.id || '');
    this.customQuantityControl.setValue(null);
    this.customQuantity.set(0);
    this.customMeasuredAmount.set(0);
    this.customPreviewBaseQuantity.set(0);
    this.customPriceLoading.set(false);
    this.customPriceError.set(null);
  }

  private inferMeasuredUnits(group: PosProductGroup): PosMeasuredUnit[] {
    const seen = new Set<string>();
    return (group.variants || []).reduce<PosMeasuredUnit[]>((units, variant) => {
      const id = String(variant.unitId || '').trim();
      if (!id || seen.has(id)) {
        return units;
      }
      seen.add(id);
      const quantity = Number(variant.quantity || 0);
      const convertedQuantity = Number(variant.convertedQuantity || 0);
      const symbol = String(variant.unitSymbol || 'unit').trim();
      units.push({
        id,
        name: symbol,
        symbol,
        baseUnitId: group.baseUnitId || null,
        conversionFactor: quantity > 0 && convertedQuantity > 0 ? quantity / convertedQuantity : 1,
      });
      return units;
    }, []);
  }

  private previewCustomMeasuredPrice(): void {
    const requestSequence = ++this.customPriceRequestSequence;
    const groupId = String(this.detailGroup()?._id || this.detailGroup()?.id || '').trim();
    const quantity = this.customQuantity();
    const unitId = this.customUnitId();
    if (!this.storeSlug || !groupId || !unitId || !Number.isFinite(quantity) || quantity <= 0) {
      this.customMeasuredAmount.set(0);
      this.customPreviewBaseQuantity.set(0);
      this.customPriceLoading.set(false);
      this.customPriceError.set(null);
      return;
    }

    this.customPriceLoading.set(true);
    this.customPriceError.set(null);
    this.ordersService.previewStorefrontGroupPrice(this.storeSlug, groupId, quantity, unitId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (preview) => {
          if (requestSequence !== this.customPriceRequestSequence) {
            return;
          }
          const sellingPrice = Number(preview.sellingPrice || 0);
          this.customMeasuredAmount.set(sellingPrice);
          this.customPreviewBaseQuantity.set(Number(preview.convertedQuantity || 0));
          this.customPriceLoading.set(false);
          this.customPriceError.set(sellingPrice > 0 ? null : 'Calculated selling price must be greater than zero.');
        },
        error: (error: unknown) => {
          if (requestSequence !== this.customPriceRequestSequence) {
            return;
          }
          this.customMeasuredAmount.set(0);
          this.customPreviewBaseQuantity.set(0);
          this.customPriceLoading.set(false);
          this.customPriceError.set(this.getErrorMessage(error, 'Unable to calculate price'));
        },
      });
  }

  private loadStorefrontSearchProducts(search: string): void {
    this.products.set([]);
    this.productsTotal.set(0);
    this.productsHasMore.set(false);
    this.productsLoadingMore.set(false);
    this.productsError.set(null);

    if (search.length < 2) {
      this.productsLoading.set(false);
      return;
    }

    this.productsLoading.set(true);
    const requestToken = Date.now();
    this.activeProductsRequestToken = requestToken;

    this.ordersService.searchStorefrontProducts(this.storeSlug, search)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (results) => {
          if (requestToken !== this.activeProductsRequestToken) {
            return;
          }

          const productsByGroupId = new Map<string, PosProductGroup>();
          for (const item of results.items || []) {
            const groupId = String(item.groupId || '').trim();
            const variantId = String(item.variantId || '').trim();
            if (!groupId || !variantId) {
              continue;
            }

            const product = productsByGroupId.get(groupId) || {
              _id: groupId,
              id: groupId,
              categoryId: item.categoryId,
              name: item.groupName || 'Product',
              imageUrl: item.imageUrl,
              status: 'ACTIVE' as const,
              variants: [],
            };
            product.variants?.push({
              _id: variantId,
              id: variantId,
              groupId,
              categoryId: item.categoryId,
              name: item.variantName || item.groupName || 'Product',
              displayName: item.variantName || item.groupName || 'Product',
              groupName: item.groupName,
              variantLabel: item.variantLabel,
              quantity: 0,
              unitSymbol: item.unitSymbol,
              convertedQuantity: 0,
              effectivePrice: {
                sellingPrice: Number(item.price || 0),
                anchorPrice: 0,
              },
              status: 'ACTIVE',
              images: item.imageUrl ? [{ url: item.imageUrl }] : [],
            });
            productsByGroupId.set(groupId, product);
          }

          this.products.set(Array.from(productsByGroupId.values()));
          this.productsTotal.set(results.pagination?.totalItems || results.items.length);
          this.productsLoading.set(false);
          this.selectedGroupId.set('ALL');
          this.selectFirstSearchResult();
        },
        error: (error: unknown) => {
          if (requestToken !== this.activeProductsRequestToken) {
            return;
          }

          this.productsLoading.set(false);
          this.productsError.set(this.getErrorMessage(error, 'Failed to search products'));
        },
      });
  }

  private listAllVariantsForGroup(groupId: string): Observable<PosProductVariant[]> {
    const normalizedGroupId = String(groupId || '').trim();
    if (!normalizedGroupId) {
      return of([]);
    }

    const limit = 200;
    return this.ordersService.listVariants({ groupId: normalizedGroupId, page: 1, limit }).pipe(
      expand((response) => {
        if (!response.pagination?.hasMore) {
          return EMPTY;
        }

        const nextPage = Number(response.pagination?.page || 1) + 1;
        return this.ordersService.listVariants({ groupId: normalizedGroupId, page: nextPage, limit });
      }),
      map((response) => Array.isArray(response.data) ? response.data as PosProductVariant[] : []),
      reduce((all, pageItems) => {
        if (!pageItems.length) {
          return all;
        }

        return [...all, ...pageItems];
      }, [] as PosProductVariant[]),
      map((items) => {
        const seen = new Set<string>();
        const deduped: PosProductVariant[] = [];
        for (const item of items) {
          const id = String(item._id || item.id || '').trim();
          if (id && seen.has(id)) {
            continue;
          }

          if (id) {
            seen.add(id);
          }
          deduped.push(item);
        }

        return deduped;
      }),
    );
  }

  private getPrimaryVariant(product: PosProductGroup): PosProductVariant | null {
    const variants = Array.isArray(product.variants) ? product.variants : [];
    if (!variants.length) {
      return null;
    }

    return [...variants].sort((left, right) => Number(left.convertedQuantity || 0) - Number(right.convertedQuantity || 0))[0] || null;
  }

  private getPrimaryVariantId(product: PosProductGroup): string | null {
    const variant = this.getPrimaryVariant(product);
    if (!variant) {
      return null;
    }

    const variantId = String(variant._id || variant.id || '').trim();
    return variantId || null;
  }

  private getVariantUnitLabel(variant: PosProductVariant): string {
    const convertedQuantity = Number(variant.convertedQuantity || variant.quantity || 0);
    const unitSymbol = String(variant.unitSymbol || '').trim();
    if (!convertedQuantity) {
      return unitSymbol || 'unit';
    }

    const suffix = unitSymbol ? ` ${unitSymbol}` : '';
    return this.formatQuantity(convertedQuantity) + suffix;
  }

  getProductImageUrl(product: PosProductGroup): string {
    const imageUrl = String(product.imageUrl || '').trim();
    if (imageUrl) {
      return imageUrl;
    }

    const firstVariant = this.getPrimaryVariant(product);
    const variantImageUrl = firstVariant?.images?.[0]?.url;
    return String(variantImageUrl || '').trim();
  }

  private rebuildCartItem(item: PosCartItem): PosCartItem {
    const quantity = Math.max(1, Math.round(Number(item.quantity || 1)));
    const unitPrice = this.round2(Number(item.unitPrice || 0));
    return {
      ...item,
      quantity,
      unitPrice,
      lineTotal: this.round2(quantity * unitPrice),
    };
  }

  private formatQuantity(value: number): string {
    return Number.isInteger(value) ? String(value) : String(this.round2(value));
  }

  private round2(value: number): number {
    return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
  }

  private syncViewportState(): void {
    this.viewportWidth.set(window.innerWidth);
    if (!this.isMobileViewport()) {
      this.activeMobileTab.set('products');
    }
  }

  private syncHeaderSearchState(): void {
    if (!this.headerSearchActive) {
      this.headerSearch.activate('orders-create', 'Search product name or scan barcode...', this.searchControl.value);
      this.headerSearchActive = true;
    }
  }

  private focusProductSearch(): void {
    this.activeShortcutArea.set('search');
    const input = document.querySelector('.gom-shell__topbar-search input') as HTMLInputElement | null;
    input?.focus();
    input?.select();
    this.selectFirstSearchResult();
  }

  private handleProductSearchShortcut(event: KeyboardEvent): boolean {
    if (!this.isProductSearchFocused()) {
      return false;
    }

    if (this.isArrowKey(event.key)) {
      event.preventDefault();
      this.moveProductSelection(event.key === 'ArrowDown' || event.key === 'ArrowRight' ? 1 : -1);
      return true;
    }

    if (event.key !== 'Enter') {
      return false;
    }

    const cards = this.visibleVariantCards();
    if (!cards.length) {
      return true;
    }

    event.preventDefault();
    const selectedIndex = this.getValidProductSelectionIndex(cards.length);
    const entry = cards[selectedIndex];
    if (entry) {
      this.addVariantToCart(entry.group, entry.variant);
    }
    return true;
  }

  private handleSelectedCartShortcut(event: KeyboardEvent): boolean {
    const variantId = this.selectedCartVariantId();
    const productSearchFocused = this.isProductSearchFocused();
    if (!variantId || (this.isEditableElement(event.target) && !productSearchFocused)) {
      return false;
    }

    const isIncreaseShortcut = event.key === '+'
      || event.code === 'NumpadAdd'
      || (event.code === 'Equal' && event.shiftKey);
    if (isIncreaseShortcut) {
      event.preventDefault();
      event.stopPropagation();
      this.increaseCartItem(variantId);
      return true;
    }

    if (event.key === '-' || event.key === '_' || event.code === 'NumpadSubtract') {
      event.preventDefault();
      this.decreaseCartItem(variantId);
      if (!this.cartItems().some((item) => item.variantId === variantId)) {
        this.selectedCartVariantId.set(null);
      }
      return true;
    }

    if (event.key === 'Delete') {
      event.preventDefault();
      this.removeCartItem(variantId);
      return true;
    }

    return false;
  }

  private handlePosAreaShortcut(event: KeyboardEvent): boolean {
    const shortcutActions: Record<string, () => void> = {
      '1': () => this.focusProductSearch(),
      '2': () => this.focusArea('category', '.pos-categories__item--active, .pos-categories__item'),
      '3': () => this.focusArea('group', '.pos-products__chip--active, .pos-products__chip'),
      '4': () => this.activateProductsArea(),
      '5': () => this.activateCartArea(),
      '6': () => this.focusArea('payment', '.pos-cart__pay-mode--active, .pos-cart__pay-mode'),
      '7': () => this.focusArea('customer', '.pos-cart__add-customer'),
      '8': () => this.activateDeliveryArea(),
      '9': () => this.placeOrder(),
      'm': () => this.toggleCreateOrderSubMenu(),
      'h': () => this.openHoldOrderModal(),
      'l': () => this.openHoldingOrdersModal(),
    };
    const shortcutKey = this.resolveAltShortcutKey(event);
    const action = shortcutActions[shortcutKey];
    if (!action) {
      return false;
    }

    event.preventDefault();
    event.stopPropagation();
    action();
    return true;
  }

  private resolveAltShortcutKey(event: KeyboardEvent): string {
    if (event.code.startsWith('Digit')) {
      return event.code.slice(5);
    }

    if (event.code.startsWith('Key')) {
      return event.code.slice(3).toLowerCase();
    }

    return String(event.key || '').toLowerCase();
  }

  private activateProductsArea(): void {
    this.activeShortcutArea.set('products');
    const cardCount = this.visibleVariantCards().length;
    if (!cardCount) {
      return;
    }

    const selectedIndex = this.getValidProductSelectionIndex(cardCount);
    this.keyboardSelectedProductIndex.set(selectedIndex);
    this.focusProductCard(selectedIndex);
  }

  private activateCartArea(): void {
    this.activeShortcutArea.set('cart');
    const selectedId = this.selectedCartVariantId();
    const items = this.cartItems();
    const selectedIndex = Math.max(0, items.findIndex((item) => item.variantId === selectedId));
    const item = items[selectedIndex];
    if (!item) {
      return;
    }

    this.selectedCartVariantId.set(item.variantId);
    this.focusElementAt('.pos-line-item__select', selectedIndex);
  }

  private activateDeliveryArea(): void {
    this.activeShortcutArea.set('delivery');
    this.toast.info('Delivery details are not required for this walk-in order.');
  }

  private handleProductAreaActivation(event: KeyboardEvent): boolean {
    if (this.activeShortcutArea() !== 'products' || event.key !== 'Enter') {
      return false;
    }

    const cards = this.visibleVariantCards();
    if (!cards.length) {
      return true;
    }

    event.preventDefault();
    event.stopPropagation();
    const entry = cards[this.getValidProductSelectionIndex(cards.length)];
    if (entry) {
      if (event.altKey) {
        this.openProductDetail(entry);
      } else {
        this.addVariantToCart(entry.group, entry.variant);
      }
      this.activeShortcutArea.set('products');
    }
    return true;
  }

  private focusArea(area: PosShortcutArea, selector: string): void {
    this.activeShortcutArea.set(area);
    window.setTimeout(() => document.querySelector<HTMLElement>(selector)?.focus());
  }

  private handleAreaArrowNavigation(event: KeyboardEvent): boolean {
    if (!this.isArrowKey(event.key) || this.isProductSearchFocused()) {
      return false;
    }

    const area = this.activeShortcutArea();
    const direction = event.key === 'ArrowDown' || event.key === 'ArrowRight' ? 1 : -1;
    if (area === 'products') {
      event.preventDefault();
      this.moveProductSelection(direction);
      this.focusProductCard(this.keyboardSelectedProductIndex());
      return true;
    }

    const selectors: Partial<Record<PosShortcutArea, string>> = {
      category: '.pos-categories__item',
      group: '.pos-products__chip',
      cart: '.pos-line-item__select',
      payment: '.pos-cart__pay-mode',
      customer: '.pos-cart__add-customer',
    };
    const selector = selectors[area];
    if (!selector) {
      return false;
    }

    event.preventDefault();
    this.moveFocusWithin(selector, direction);
    return true;
  }

  private moveFocusWithin(selector: string, direction: 1 | -1): void {
    const elements = Array.from(document.querySelectorAll<HTMLElement>(selector));
    if (!elements.length) {
      return;
    }

    const currentIndex = elements.indexOf(document.activeElement as HTMLElement);
    let nextIndex = (currentIndex + direction + elements.length) % elements.length;
    if (currentIndex < 0) {
      nextIndex = direction === 1 ? 0 : elements.length - 1;
    }
    elements[nextIndex]?.focus();
  }

  private focusProductCard(index: number): void {
    window.setTimeout(() => {
      const trigger = document.querySelectorAll<HTMLElement>('.pos-product__detail-trigger').item(index);
      trigger?.focus();
      trigger?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    });
  }

  private focusElementAt(selector: string, index: number): void {
    window.setTimeout(() => document.querySelectorAll<HTMLElement>(selector).item(index)?.focus());
  }

  private cancelCurrentAction(): void {
    if (this.createOrderSubMenuOpen()) {
      this.closeCreateOrderSubMenu();
      return;
    }

    if (this.productDetailOpen()) {
      this.closeProductDetail();
      return;
    }
    if (this.orderTypeEditorOpen()) {
      this.closeOrderTypeEditor();
      return;
    }
    if (this.customerEditorOpen()) {
      this.closeCustomerEditor();
      return;
    }
    if (this.clearOrderConfirmOpen()) {
      this.cancelClearOrder();
      return;
    }

    this.backToOrders();
  }

  private handleTransactionCompleteShortcut(event: KeyboardEvent, key: string): boolean {
    if (key !== 'F10' || !this.paymentCompleteModalOpen()) {
      return false;
    }

    event.preventDefault();
    this.startNewOrder();
    return true;
  }

  private isArrowKey(key: string): boolean {
    return key === 'ArrowUp' || key === 'ArrowDown' || key === 'ArrowLeft' || key === 'ArrowRight';
  }

  private moveProductSelection(direction: 1 | -1): void {
    const cardCount = this.visibleVariantCards().length;
    if (!cardCount) {
      this.keyboardSelectedProductIndex.set(-1);
      return;
    }

    const currentIndex = this.keyboardSelectedProductIndex();
    let nextIndex = (currentIndex + direction + cardCount) % cardCount;
    if (currentIndex < 0) {
      nextIndex = direction === 1 ? 0 : cardCount - 1;
    }
    this.keyboardSelectedProductIndex.set(nextIndex);
    window.setTimeout(() => {
      document.querySelectorAll<HTMLElement>('.pos-product').item(nextIndex)
        ?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    });
  }

  private selectFirstSearchResult(): void {
    if (this.productSearch().trim() && this.visibleVariantCards().length) {
      this.keyboardSelectedProductIndex.set(0);
    }
  }

  private getValidProductSelectionIndex(cardCount: number): number {
    const selectedIndex = this.keyboardSelectedProductIndex();
    return selectedIndex >= 0 && selectedIndex < cardCount ? selectedIndex : 0;
  }

  private isProductSearchFocused(): boolean {
    const activeElement = document.activeElement as HTMLElement | null;
    return Boolean(activeElement?.closest('.gom-shell__topbar-search'));
  }

  private isEditableElement(target: EventTarget | null): boolean {
    const element = target as HTMLElement | null;
    return Boolean(element?.closest('input, textarea, select, [contenteditable="true"]'));
  }

  private ensureProductsScrollable(): void {
    window.setTimeout(() => {
      if (this.productsLoading() || this.productsLoadingMore() || !this.productsHasMore()) {
        return;
      }

      const container = document.querySelector('.pos-products__scroll') as HTMLElement | null;
      if (!container) {
        return;
      }

      const isScrollable = container.scrollHeight > container.clientHeight + 8;
      if (!isScrollable) {
        this.loadMoreProducts();
      }
    }, 0);
  }

  private applyCategoryPanelWidth(nextWidth: number): void {
    const clampedWidth = Math.min(
      NewCareOrderComponent.CATEGORY_PANEL_MAX_WIDTH,
      Math.max(NewCareOrderComponent.CATEGORY_PANEL_MIN_WIDTH, Math.round(nextWidth)),
    );

    this.categoryPanelWidth.set(clampedWidth);
  }

  private applyCreateOrderOptions(config?: {
    paymentStatuses?: { pickup?: string[]; delivery?: string[]; counter?: string[] };
    requireMemberForBilling?: boolean;
    orderIntakeChannels?: Array<{ name: string; enabled: boolean }>;
  }): void {
    const current = this.createOrderOptions();
    const normalizeStatuses = (values: string[] | undefined, fallback: string[]) => {
      const normalized = (values || []).map((value) => String(value || '').trim()).filter(Boolean);
      return normalized.length ? [...new Set(normalized)] : fallback;
    };
    const channels = (config?.orderIntakeChannels || [])
      .map((channel) => ({ name: String(channel?.name || '').trim(), enabled: channel?.enabled === true }))
      .filter((channel) => channel.name);

    this.createOrderOptions.set({
      requireMemberForBilling: config?.requireMemberForBilling === true,
      paymentStatuses: {
        pickup: normalizeStatuses(config?.paymentStatuses?.pickup, current.paymentStatuses.pickup),
        delivery: normalizeStatuses(config?.paymentStatuses?.delivery, current.paymentStatuses.delivery),
        counter: normalizeStatuses(config?.paymentStatuses?.counter, current.paymentStatuses.counter),
      },
      orderIntakeChannels: channels.length ? channels : current.orderIntakeChannels,
    });

    const intakeChannel = this.getDefaultIntakeChannel();
    this.appliedOrderDetails.update((details) => ({
      ...details,
      intakeChannel,
      paymentStatus: this.getDefaultPaymentStatus('WALK_IN'),
    }));
    this.orderTypeForm.patchValue({
      intakeChannel,
      paymentStatus: this.getDefaultPaymentStatus('WALK_IN'),
    });
    this.draftIntakeChannel.set(intakeChannel);
  }

  private applyPickupLocations(storefrontConfig?: {
    pickupConfig?: PickupConfig;
    pickupLocations?: PickupConfig[];
    pickupAdvanceDays?: number | null;
    pickupSameDayLeadMinutes?: number | null;
  }): void {
    let configured: PickupConfig[] = [];
    if (Array.isArray(storefrontConfig?.pickupLocations) && storefrontConfig.pickupLocations.length) {
      configured = storefrontConfig.pickupLocations;
    } else if (storefrontConfig?.pickupConfig) {
      configured = [storefrontConfig.pickupConfig];
    }
    const normalized = configured.map((location, index) => this.normalizePickupLocation(location, index));
    this.pickupLocations.set(normalized);
    this.storefrontPickupDefaults.set({
      pickupAdvanceDays: Number(storefrontConfig?.pickupAdvanceDays ?? 0),
      pickupSameDayLeadMinutes: Number(storefrontConfig?.pickupSameDayLeadMinutes ?? 0),
    });

    const defaultPickupLocationId = this.getDefaultPickupLocationId();
    this.appliedOrderDetails.update((details) => ({
      ...details,
      pickupLocationId: details.pickupLocationId || defaultPickupLocationId,
    }));
    if (this.draftOrderType() === 'PICKUP_LATER' && !this.orderTypeForm.controls.pickupLocationId.value) {
      this.orderTypeForm.controls.pickupLocationId.setValue(defaultPickupLocationId);
    }
    if (!this.selectedPickupLocationId()) {
      this.selectedPickupLocationId.set(defaultPickupLocationId);
    }
  }

  private normalizePickupLocation(location: PickupConfig | undefined, index: number): PickupConfig {
    return {
      locationId: String(location?.locationId || (index === 0 ? 'primary' : `location-${index + 1}`)).trim(),
      locationName: String(location?.locationName || (index === 0 ? 'Main Store' : `Pickup Location ${index + 1}`)).trim(),
      storeAddressLine1: String(location?.storeAddressLine1 || '').trim(),
      storeAddressLine2: String(location?.storeAddressLine2 || '').trim(),
      city: String(location?.city || '').trim(),
      state: String(location?.state || '').trim(),
      postalCode: String(location?.postalCode || '').trim(),
      mapUrl: String(location?.mapUrl || '').trim(),
      latitude: location?.latitude ?? null,
      longitude: location?.longitude ?? null,
      pickupInstructions: String(location?.pickupInstructions || '').trim(),
      pickupTimingText: String(location?.pickupTimingText || '').trim(),
      pickupAdvanceDays: location?.pickupAdvanceDays ?? null,
      pickupSameDayLeadMinutes: location?.pickupSameDayLeadMinutes ?? null,
    };
  }

  private getDefaultPickupLocationId(): string {
    return String(this.pickupLocations()[0]?.locationId || '').trim();
  }

  private applyDeliveryPincodeConfig(
    config?: TenantDeliveryPincodeConfig,
    storefrontConfig?: {
      deliveryCharge?: number;
      pincodeServiceabilityMode?: 'SERVE_ALL' | 'RESTRICTED';
      serviceablePincodes?: ServiceablePincodeEntry[];
    },
  ): void {
    const mode = config?.pincodeMode || (config?.enabled ? 'RESTRICTED' : 'DISABLED');
    const storefrontMode = storefrontConfig?.pincodeServiceabilityMode || 'SERVE_ALL';
    const storefrontPincodes = Array.isArray(storefrontConfig?.serviceablePincodes)
      ? storefrontConfig.serviceablePincodes.map((entry) => ({
        ...entry,
        pincode: String(entry?.pincode || '').trim(),
      })).filter((entry) => !!entry.pincode)
      : [];

    this.deliveryPincodeConfig.set({
      enabled: mode === 'RESTRICTED',
      pincodeMode: mode,
      serviceablePincodes: Array.isArray(config?.serviceablePincodes)
        ? config.serviceablePincodes.map((value) => String(value || '').trim()).filter(Boolean)
        : [],
      nonServiceableSuggestion: config?.nonServiceableSuggestion || 'CALL_COURIER',
    });
    this.storefrontDeliveryCharge.set(Math.max(0, Number(storefrontConfig?.deliveryCharge ?? 0)));
    this.storefrontPincodeServiceabilityMode.set(storefrontMode);
    this.storefrontServiceablePincodes.set(storefrontPincodes);
  }

  private getEnabledIntakeChannels(): string[] {
    return this.createOrderOptions().orderIntakeChannels
      .filter((channel) => channel.enabled)
      .map((channel) => channel.name);
  }

  private getDefaultIntakeChannel(): string {
    const channels = this.getEnabledIntakeChannels();
    return channels.find((channel) => channel.toLowerCase() === 'shop counter') || channels[0] || 'Shop Counter';
  }

  private getPaymentStatusBucket(orderType: CareOrderType): PaymentStatusBucket {
    if (orderType === 'PICKUP_LATER') {
      return 'pickup';
    }
    if (orderType === 'HOME_DELIVERY') {
      return 'delivery';
    }
    return 'counter';
  }

  private getPaymentStatuses(orderType: CareOrderType): string[] {
    return this.createOrderOptions().paymentStatuses[this.getPaymentStatusBucket(orderType)];
  }

  private getDefaultPaymentStatus(orderType: CareOrderType): string {
    const statuses = this.getPaymentStatuses(orderType);
    if (orderType === 'WALK_IN') {
      return statuses.find((status) => status.trim().toLowerCase() === 'at order time') || statuses[0] || 'At Order Time';
    }

    return statuses[0] || '';
  }

  private updateOrderTypeValidators(): void {
    const isPickup = this.draftOrderType() === 'PICKUP_LATER';
    const isDelivery = this.draftOrderType() === 'HOME_DELIVERY';
    const isOther = this.isOtherIntakeChannel();
    const controls = this.orderTypeForm.controls;

    controls.otherIntakeChannel.setValidators(isOther ? [Validators.required, Validators.maxLength(80)] : []);
    controls.pickupLocationId.setValidators(isPickup && this.pickupLocations().length > 1 ? [Validators.required] : []);
    controls.pickupDateValue.setValidators(isPickup && this.pickupDateOptions().length ? [Validators.required] : []);
    controls.pickupTimeValue.setValidators(isPickup && this.pickupTimeOptions().length ? [Validators.required] : []);
    controls.deliveryPincode.setValidators(isDelivery ? [Validators.required, Validators.pattern(/^\d{6}$/)] : []);
    controls.deliveryAddress.setValidators(isDelivery && this.deliveryPincodeState() === 'SERVICEABLE'
      ? [Validators.required, Validators.maxLength(300)]
      : []);
    controls.deliveryDateTime.setValidators(isDelivery && this.deliveryPincodeState() === 'SERVICEABLE'
      ? [Validators.required]
      : []);

    controls.otherIntakeChannel.updateValueAndValidity({ emitEvent: false });
    controls.pickupLocationId.updateValueAndValidity({ emitEvent: false });
    controls.pickupDateValue.updateValueAndValidity({ emitEvent: false });
    controls.pickupTimeValue.updateValueAndValidity({ emitEvent: false });
    controls.deliveryPincode.updateValueAndValidity({ emitEvent: false });
    controls.deliveryAddress.updateValueAndValidity({ emitEvent: false });
    controls.deliveryDateTime.updateValueAndValidity({ emitEvent: false });
  }

  private validateDeliveryPincode(value: string): void {
    const pincode = String(value || '').replace(/\D/g, '').slice(0, 6);
    if (pincode !== value) {
      this.orderTypeForm.controls.deliveryPincode.setValue(pincode, { emitEvent: false });
    }
    if (!pincode) {
      this.deliveryPincodeState.set('EMPTY');
    } else if (!/^\d{6}$/.test(pincode)) {
      this.deliveryPincodeState.set('INVALID');
    } else {
      let serviceable = true;
      if (this.storefrontPincodeServiceabilityMode() === 'RESTRICTED') {
        serviceable = !!this.getMatchingServiceablePincodeEntry(pincode);
      } else {
        const config = this.deliveryPincodeConfig();
        serviceable = config.pincodeMode !== 'RESTRICTED'
          || !config.serviceablePincodes.length
          || config.serviceablePincodes.some((pattern) => this.pincodeMatchesPattern(pincode, pattern));
      }
      this.deliveryPincodeState.set(serviceable ? 'SERVICEABLE' : 'UNSERVICEABLE');
    }
    this.updateOrderTypeValidators();
  }

  private getDeliveryChargeForPincode(rawPincode: string): number {
    const pincode = String(rawPincode || '').replace(/\D/g, '').slice(0, 6);
    if (!/^\d{6}$/.test(pincode)) {
      return 0;
    }

    if (this.storefrontPincodeServiceabilityMode() === 'RESTRICTED') {
      const match = this.getMatchingServiceablePincodeEntry(pincode);
      if (!match) {
        return 0;
      }

      const override = Number(match.deliveryChargeOverride);
      if (Number.isFinite(override) && override >= 0) {
        return this.round2(override);
      }
    }

    return this.round2(this.storefrontDeliveryCharge());
  }

  private scheduleOfferInsightsRefresh(): void {
    if (!this.storeSlug) {
      return;
    }

    if (this.offerRefreshTimeout) {
      clearTimeout(this.offerRefreshTimeout);
    }

    this.offerRefreshTimeout = setTimeout(() => {
      this.offerRefreshTimeout = null;
      void this.refreshOfferInsights();
    }, 350);
  }

  private async refreshOfferInsights(): Promise<void> {
    const requestSequence = ++this.offerRefreshRequestSequence;
    const items = this.buildOfferCartItems();
    if (!items.length) {
      this.offerNudgeSummary.set(null);
      this.offerPreview.set(null);
      this.offerInsightsLoading.set(false);
      return;
    }

    const postalCode = this.orderType() === 'HOME_DELIVERY'
      ? String(this.appliedOrderDetails().deliveryPincode || '').trim()
      : '';
    const baseDeliveryFee = this.baseDeliveryCharge();
    const cartTotal = this.cartSubtotal();
    const couponCodes = this.appliedCouponCodes();
    this.offerInsightsLoading.set(true);

    try {
      const result = await firstValueFrom(forkJoin({
        nudge: this.http.post<PosApiSuccess<PosCartNudgeSummary>>(
          `${environment.apiBaseUrl}/storefront/${this.storeSlug}/offers/cart-nudge`,
          {
            cartTotal,
            cartItems: items.map((item) => ({
              variantId: item.variantId,
              qty: item.quantity,
              unitPrice: item.unitPrice,
            })),
            prevCartTotal: null,
            deliveryContext: {
              deliveryFee: baseDeliveryFee,
              deliveryMethod: 'STANDARD',
              postalCode,
            },
          },
        ).pipe(
          map((response) => response?.data || null),
          catchError(() => of<PosCartNudgeSummary | null>(null)),
        ),
        preview: this.http.post<PosApiSuccess<PosOfferCalculatePreview>>(
          `${environment.apiBaseUrl}/storefront/${this.storeSlug}/offers/calculate`,
          {
            items,
            couponCode: couponCodes[0] || undefined,
            couponCodes: couponCodes.length ? couponCodes : undefined,
            deliveryContext: {
              deliveryFee: baseDeliveryFee,
              deliveryMethod: 'STANDARD',
              postalCode,
            },
          },
        ).pipe(
          map((response) => response?.data || null),
          catchError(() => of<PosOfferCalculatePreview | null>(null)),
        ),
      }));

      if (requestSequence !== this.offerRefreshRequestSequence) {
        return;
      }

      this.offerNudgeSummary.set(result.nudge);
      this.offerPreview.set(result.preview);
      const previewCodes = (result.preview?.coupon?.codes || [])
        .map((code) => String(code || '').trim().toUpperCase())
        .filter(Boolean);
      if (previewCodes.length || couponCodes.length) {
        this.appliedCouponCodes.set([...new Set(previewCodes)]);
      }
    } finally {
      if (requestSequence === this.offerRefreshRequestSequence) {
        this.offerInsightsLoading.set(false);
      }
    }
  }

  getB1g1SuggestionForVariant(variantId: string): string {
    const normalizedVariantId = String(variantId || '').trim();
    if (!normalizedVariantId) {
      return '';
    }

    const categoryId = this.findCategoryIdForVariant(normalizedVariantId);
    const nudge = (this.offerNudgeSummary()?.b1g1 || [])
      .filter((row) => this.isB1g1NudgeRelevantToVariant(row, normalizedVariantId, categoryId))
      .sort((left, right) => this.getB1g1NudgeMatchRank(right, normalizedVariantId, categoryId)
        - this.getB1g1NudgeMatchRank(left, normalizedVariantId, categoryId))[0];
    if (!nudge) {
      return '';
    }

    const needMore = Number(nudge.needMoreToUnlock || 0);
    if (needMore > 0) {
      return `Offer: Buy ${nudge.buyQty}, Get ${nudge.getQty}. Add ${needMore} more to unlock.`;
    }

    return `Offer active: Buy ${nudge.buyQty}, Get ${nudge.getQty}.`;
  }

  private findCategoryIdForVariant(variantId: string): string {
    const normalizedVariantId = String(variantId || '').trim();
    if (!normalizedVariantId) {
      return '';
    }

    const cartItem = this.cartItems().find((item) => item.variantId === normalizedVariantId && item.categoryId);
    if (cartItem?.categoryId) {
      return String(cartItem.categoryId).trim();
    }

    for (const detail of Object.values(this.cachedCategoryDetails)) {
      const categoryId = String(detail.category?.id || '').trim();
      if (!categoryId) {
        continue;
      }

      if ((detail.variants || []).some((row) => String(row.id || '').trim() === normalizedVariantId)) {
        return categoryId;
      }
    }

    for (const product of this.products()) {
      const productCategoryId = String(product.categoryId || '').trim();
      if (!productCategoryId) {
        continue;
      }

      if ((product.variants || []).some((variant) => String(variant._id || variant.id || '').trim() === normalizedVariantId)) {
        return productCategoryId;
      }
    }

    return '';
  }

  private isB1g1NudgeRelevantToVariant(nudge: PosB1g1Nudge, variantId: string, categoryId = ''): boolean {
    const normalizedVariantId = String(variantId || '').trim();
    if (!normalizedVariantId) {
      return false;
    }

    const applicableVariantIds = new Set((nudge.applicableVariantIds || []).map((id) => String(id).trim()).filter(Boolean));
    const applicableCategoryIds = new Set((nudge.applicableCategoryIds || []).map((id) => String(id).trim()).filter(Boolean));
    const hasVariantScope = applicableVariantIds.size > 0;
    const hasCategoryScope = applicableCategoryIds.size > 0;

    if (hasVariantScope) {
      return applicableVariantIds.has(normalizedVariantId);
    }

    if (hasCategoryScope) {
      return categoryId ? applicableCategoryIds.has(String(categoryId).trim()) : false;
    }

    return true;
  }

  private getB1g1NudgeMatchRank(nudge: PosB1g1Nudge, variantId: string, categoryId = ''): number {
    const normalizedVariantId = String(variantId || '').trim();
    const normalizedCategoryId = String(categoryId || '').trim();
    const applicableVariantIds = new Set((nudge.applicableVariantIds || []).map((id) => String(id).trim()).filter(Boolean));
    if (applicableVariantIds.has(normalizedVariantId)) {
      return 3;
    }

    const applicableCategoryIds = new Set((nudge.applicableCategoryIds || []).map((id) => String(id).trim()).filter(Boolean));
    if (normalizedCategoryId && applicableCategoryIds.has(normalizedCategoryId)) {
      return 2;
    }

    return 1;
  }

  private getConfiguredOfferEligibility(
    offer: Offer,
    appliedOfferIds: Set<string>,
    couponNudge?: PosCouponNudge,
    couponApplied = false,
  ): { label: string; tone: PosOfferEligibilityTone } {
    const offerId = String(offer._id || '').trim();
    if (appliedOfferIds.has(offerId)) {
      return { label: 'Applied in this cart', tone: 'applied' };
    }

    if (String(offer.triggerType || '').trim().toUpperCase() === 'COUPON') {
      return this.getCouponEligibility(couponNudge, couponApplied);
    }

    const offerType = String(offer.type || '').trim().toUpperCase();
    const offerTypeHandlers: Record<string, (id: string) => { label: string; tone: PosOfferEligibilityTone }> = {
      ORDER_DISCOUNT: (id: string) => this.getOrderDiscountEligibility(id),
      FREE_DELIVERY: (id: string) => this.getFreeDeliveryEligibility(id),
      BUY_X_GET_Y: (id: string) => this.getB1g1Eligibility(id),
    };

    const handler = offerTypeHandlers[offerType];
    if (handler) {
      return handler(offerId);
    }

    return { label: 'Auto-applies when criteria match', tone: 'info' };
  }

  private getCouponEligibility(
    couponNudge?: PosCouponNudge,
    couponApplied = false,
  ): { label: string; tone: PosOfferEligibilityTone } {
    if (couponApplied) {
      return { label: 'Coupon added, recalculating', tone: 'info' };
    }

    if (couponNudge?.eligible) {
      return { label: 'Eligible now', tone: 'eligible' };
    }

    const gap = Number(couponNudge?.gap || 0);
    if (gap > 0) {
      return { label: `Add ${this.formatCurrency(gap)} more to unlock`, tone: 'locked' };
    }

    return { label: 'Not eligible for this cart', tone: 'locked' };
  }

  private getOrderDiscountEligibility(offerId: string): { label: string; tone: PosOfferEligibilityTone } {
    const next = this.offerNudgeSummary()?.orderDiscount?.next;
    if (String(next?.offerId || '').trim() === offerId && Number(next?.gap || 0) > 0) {
      return { label: `Add ${this.formatCurrency(Number(next?.gap || 0))} more to unlock`, tone: 'locked' };
    }

    return { label: 'Auto-applies when criteria match', tone: 'info' };
  }

  private getFreeDeliveryEligibility(offerId: string): { label: string; tone: PosOfferEligibilityTone } {
    const next = this.offerNudgeSummary()?.freeDelivery?.next;
    if (String(next?.offerId || '').trim() === offerId && Number(next?.gap || 0) > 0) {
      return { label: `Add ${this.formatCurrency(Number(next?.gap || 0))} for free delivery`, tone: 'locked' };
    }

    return { label: 'Auto-applies when criteria match', tone: 'info' };
  }

  private getB1g1Eligibility(offerId: string): { label: string; tone: PosOfferEligibilityTone } {
    const b1g1 = (this.offerNudgeSummary()?.b1g1 || []).find((row) => String(row.offerId || '').trim() === offerId);
    const needMore = Number(b1g1?.needMoreToUnlock || 0);
    if (needMore > 0) {
      return { label: `Add ${needMore} more item(s) to unlock`, tone: 'locked' };
    }

    if (b1g1) {
      return { label: 'Eligible now', tone: 'eligible' };
    }

    return { label: 'Auto-applies when criteria match', tone: 'info' };
  }

  private getOfferStateBadgeLabel(tone: PosOfferEligibilityTone): string {
    const labels: Record<PosOfferEligibilityTone, string> = {
      applied: 'Applied',
      eligible: 'Eligible',
      locked: 'Locked',
      info: 'Info',
    };
    return labels[tone];
  }

  private getConfiguredOfferProgress(
    offer: Offer,
    couponNudge?: PosCouponNudge,
  ): { percent: number | null; hint: string } {
    const offerType = String(offer.type || '').trim().toUpperCase();
    const triggerType = String(offer.triggerType || '').trim().toUpperCase();
    const offerId = String(offer._id || '').trim();

    if (triggerType === 'COUPON') {
      return this.getGapProgress(Number(couponNudge?.gap || 0));
    }

    if (offerType === 'ORDER_DISCOUNT') {
      const next = this.offerNudgeSummary()?.orderDiscount?.next;
      if (String(next?.offerId || '').trim() === offerId) {
        return this.getGapProgress(Number(next?.gap || 0));
      }
      return { percent: null, hint: '' };
    }

    if (offerType === 'FREE_DELIVERY') {
      const next = this.offerNudgeSummary()?.freeDelivery?.next;
      if (String(next?.offerId || '').trim() === offerId) {
        return this.getGapProgress(Number(next?.gap || 0));
      }
      return { percent: null, hint: '' };
    }

    if (offerType === 'BUY_X_GET_Y') {
      const b1g1 = (this.offerNudgeSummary()?.b1g1 || []).find((row) => String(row.offerId || '').trim() === offerId);
      const needMore = Number(b1g1?.needMoreToUnlock || 0);
      if (needMore <= 0) {
        return { percent: null, hint: '' };
      }

      const triggerQty = Number(b1g1?.buyQty || offer.buyQty || 0);
      if (!Number.isFinite(triggerQty) || triggerQty <= 0) {
        return { percent: null, hint: '' };
      }

      const progressPercent = this.clampProgress((triggerQty / (triggerQty + needMore)) * 100);
      return {
        percent: progressPercent,
        hint: `${needMore} more item(s) needed`,
      };
    }

    return { percent: null, hint: '' };
  }

  private getGapProgress(gap: number): { percent: number | null; hint: string } {
    if (!Number.isFinite(gap) || gap <= 0) {
      return { percent: null, hint: '' };
    }

    const current = Math.max(0, Number(this.cartSubtotal() || 0));
    const target = current + gap;
    if (target <= 0) {
      return { percent: null, hint: '' };
    }

    return {
      percent: this.clampProgress((current / target) * 100),
      hint: `${this.formatCurrency(gap)} more to unlock`,
    };
  }

  private clampProgress(value: number): number {
    if (!Number.isFinite(value)) {
      return 0;
    }
    return Math.min(100, Math.max(0, Math.round(value)));
  }

  private buildOfferCartItems(): Array<{ variantId: string; quantity: number; unitPrice: number; packId?: string }> {
    return this.cartItems()
      .map((item) => ({
        variantId: String(item.variantId || '').trim(),
        quantity: Number(item.quantity || 0),
        unitPrice: Number(item.unitPrice || 0),
      }))
      .filter((item) => !!item.variantId && Number.isFinite(item.quantity) && item.quantity > 0 && Number.isFinite(item.unitPrice));
  }

  private getMatchingServiceablePincodeEntry(pincode: string): ServiceablePincodeEntry | null {
    const entries = this.storefrontServiceablePincodes().filter((entry) => entry.active !== false);
    if (!entries.length) {
      return null;
    }

    const exact = entries.find((entry) => {
      const pattern = String(entry.pincode || '').trim();
      return !pattern.endsWith('*') && this.pincodeMatchesPattern(pincode, pattern);
    });
    if (exact) {
      return exact;
    }

    const wildcardMatches = entries
      .filter((entry) => {
        const pattern = String(entry.pincode || '').trim();
        return pattern.endsWith('*') && this.pincodeMatchesPattern(pincode, pattern);
      })
      .sort((left, right) => String(right.pincode || '').length - String(left.pincode || '').length);
    return wildcardMatches[0] || null;
  }

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value || 0);
  }

  private loadConfiguredOffers(): void {
    this.configuredOffersLoading.set(true);
    this.offerService.listOffers({ page: 1, limit: 200, sortBy: 'priority', sortOrder: 'asc' })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          const offers = Array.isArray(response?.data) ? response.data : [];
          const configured = offers.filter((offer) => {
            const status = String(offer.status || '').toUpperCase();
            return status === 'ACTIVE' || status === 'PAUSED' || status === 'DRAFT';
          });
          this.configuredOffers.set(configured);
          this.configuredOffersLoading.set(false);
          this.configuredOffersLoaded.set(true);
        },
        error: () => {
          this.configuredOffers.set([]);
          this.configuredOffersLoading.set(false);
          this.configuredOffersLoaded.set(true);
        },
      });
  }

  private loadBusinessProfile(): void {
    this.businessDetailsService.getBusinessDetails()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          const profile = response?.data || null;
          this.businessProfile.set(profile);
          const displayName = String(profile?.legalBusinessName || profile?.accountName || '').trim();
          if (displayName) {
            this.storeDisplayName.set(displayName);
          }
        },
        error: () => {
          this.businessProfile.set(null);
        },
      });
  }

  private formatOfferTypeLabel(value: string): string {
    const normalized = String(value || '').trim().toUpperCase();
    const labels: Record<string, string> = {
      ORDER_DISCOUNT: 'Order Discount',
      PRODUCT_DISCOUNT: 'Product Discount',
      CATEGORY_DISCOUNT: 'Category Discount',
      PACK_DISCOUNT: 'Pack Discount',
      FREE_DELIVERY: 'Free Delivery',
      BUY_X_GET_Y: 'Buy X Get Y',
    };
    return labels[normalized] || normalized || 'Offer';
  }

  private formatOfferStatusLabel(value: string): string {
    const normalized = String(value || '').trim().toUpperCase();
    const labels: Record<string, string> = {
      ACTIVE: 'Active',
      PAUSED: 'Paused',
      DRAFT: 'Draft',
      EXPIRED: 'Expired',
    };
    return labels[normalized] || normalized || 'Unknown';
  }

  private formatOfferTriggerLabel(value: string): string {
    const normalized = String(value || '').trim().toUpperCase();
    if (normalized === 'COUPON') {
      return 'Coupon';
    }
    return 'Auto';
  }

  private loadBillTemplateForCurrentOrderType(orderType: CareOrderType): void {
    const billOrderType = this.toBillOrderType(orderType);
    this.billTemplateLoading.set(true);
    this.billTemplateConfig.set(null);
    this.billTemplateName.set('');

    forkJoin({
      assignments: this.billingTemplateService.listAssignments(),
      templates: this.billingTemplateService.listTemplates(),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ assignments: assignmentResponse, templates: templateResponse }) => {
          const assignments = assignmentResponse?.data?.assignments || [];
          const templates = templateResponse?.data?.templates || [];
          const matched = assignments.find((assignment) => assignment.orderType === billOrderType);

          const preferredDefault = templates.find((template) => template.isDefault && template.isActive)
            || templates.find((template) => template.isDefault)
            || null;

          const assignedTemplate = matched?.templateId
            ? templates.find((template) => template.id === matched.templateId)
            : null;

          const selectedTemplateId = preferredDefault?.id || assignedTemplate?.id || matched?.templateId || '';
          if (!selectedTemplateId) {
            this.billTemplateLoading.set(false);
            this.toast.warning('No bill template is assigned for this order type.');
            return;
          }

          this.billingTemplateService.getTemplate(selectedTemplateId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
              next: (templateResponse) => {
                this.billTemplateConfig.set(templateResponse.data.configuration || null);
                this.billTemplateName.set(String(templateResponse.data.name || '').trim());
                this.billTemplateLoading.set(false);
              },
              error: () => {
                this.billTemplateLoading.set(false);
                this.toast.error('Unable to load assigned bill template.');
              },
            });
        },
        error: () => {
          this.billTemplateLoading.set(false);
          this.toast.error('Unable to load bill template assignments.');
        },
      });
  }

  private toBillOrderType(orderType: CareOrderType): BillOrderType {
    if (orderType === 'HOME_DELIVERY') return 'DELIVERY';
    if (orderType === 'PICKUP_LATER') return 'PICKUP';
    return 'IN_STORE';
  }

  private async submitOrderAfterPayment(paymentMode: 'CASH' | 'UPI_MANUAL' | 'NET_BANKING'): Promise<void> {
    if (this.isOrderFrozen()) {
      this.toast.warning('Order is completed and frozen. Start a new order to continue.');
      return;
    }

    if (this.cartEmpty()) {
      this.toast.warning('Add at least one item before receiving payment.');
      return;
    }

    this.orderSubmitting.set(true);
    try {
      const requireMemberForBilling = this.createOrderOptions().requireMemberForBilling;
      const customerId = await this.resolveCustomerIdForPlacement(requireMemberForBilling);
      if (!customerId) {
        this.toast.warning(requireMemberForBilling
          ? 'Select a customer before receiving payment.'
          : 'Unable to resolve a billing member for this order.');
        return;
      }

      const draftPayload = this.buildCreateDraftPayload(customerId);
      const draftResponse = await firstValueFrom(this.ordersService.createDraft(draftPayload));
      const placedResponse = await firstValueFrom(this.ordersService.placeOrder(draftResponse.data.draftId, {
        paymentMode,
        paymentCollectionStage: 'AT_ORDER',
        paymentReceived: true,
      }));

      const completedAt = new Date();
      const completedOrderType = this.orderType();
      this.paymentProcessedAt.set(completedAt);
      this.paymentStatus.set('PAID');
      this.orderStatus.set('COMPLETED');

      this.completedTransaction.set({
        orderNo: String(placedResponse.data.orderNo || '').trim(),
        paymentStatus: 'PAID',
        orderStatus: 'COMPLETED',
        previewValues: {
          ...this.billPreviewValues(),
          'order.orderNo': String(placedResponse.data.orderNo || '').trim() || this.billPreviewValues()['order.orderNo'],
        },
        previewItems: this.billPreviewItems(),
      });

      this.orderTypeEditorOpen.set(false);
      this.customerEditorOpen.set(false);
      this.clearOrderConfirmOpen.set(false);
      this.offersPanelOpen.set(false);
      this.paymentUpiModalOpen.set(false);
      this.paymentCompleteModalOpen.set(true);

      this.prepareNextEmptyOrder();
      this.loadBillTemplateForCurrentOrderType(completedOrderType);
      this.toast.success(`Order created: ${placedResponse.data.orderNo}`);
    } catch (error: unknown) {
      this.toast.error(this.getErrorMessage(error, 'Failed to create the order after payment.'));
    } finally {
      this.orderSubmitting.set(false);
    }
  }

  private async resolveCustomerIdForPlacement(requireMemberForBilling: boolean): Promise<string> {
    const currentCustomer = this.customer();
    const existingId = String(currentCustomer.id || '').trim();
    if (existingId) {
      return existingId;
    }

    const phone = String(currentCustomer.phone || '').replace(/\D/g, '');
    const name = String(currentCustomer.name || '').trim() || 'Walk-in Customer';

    if (phone.length >= 10) {
      const response = await firstValueFrom(this.ordersService.resolveCustomer(phone, name));
      const resolved = response.data.customer;
      this.customer.set({
        id: resolved._id,
        name: resolved.name,
        phone: resolved.phone,
      });
      return String(resolved._id || '').trim();
    }

    if (requireMemberForBilling) {
      return '';
    }

    const walkInPhone = this.buildWalkInMemberPhone();
    const response = await firstValueFrom(this.ordersService.resolveCustomer(walkInPhone, name));
    const resolved = response.data.customer;
    this.customer.set({
      id: resolved._id,
      name: resolved.name,
      phone: resolved.phone,
    });
    return String(resolved._id || '').trim();
  }

  private buildWalkInMemberPhone(): string {
    const millis = Date.now().toString().slice(-9).padStart(9, '0');
    return `9${millis}`;
  }

  private buildCreateDraftPayload(customerId: string): CreateDraftPayload {
    const applied = this.appliedOrderDetails();
    const intakeChannel = String(applied.intakeChannel || '').trim();
    const orderType = this.orderType();
    const deliveryType: 'PICKUP' | 'DELIVERY' = orderType === 'HOME_DELIVERY' ? 'DELIVERY' : 'PICKUP';
    const items = this.cartItems()
      .map((item) => ({
        variantId: String(item.variantId || '').trim(),
        quantity: Number(item.quantity || 0),
      }))
      .filter((item) => item.variantId && Number.isFinite(item.quantity) && item.quantity > 0);

    const payload: CreateDraftPayload = {
      customerId,
      orderSource: this.resolveOrderSource(intakeChannel),
      deliveryType,
      orderType: this.toApiOrderType(orderType),
      items,
      deliveryCharge: deliveryType === 'DELIVERY' ? this.deliveryCharge() : 0,
      notes: this.buildPlacementNotes(),
    };

    if (deliveryType === 'DELIVERY') {
      const customer = this.customer();
      payload.deliveryAddressText = String(applied.deliveryAddress || '').trim();
      payload.deliveryDetails = {
        deliveryPostalCode: String(applied.deliveryPincode || '').trim(),
        deliveryContactName: String(customer.name || '').trim(),
        deliveryContactPhone: String(customer.phone || '').trim(),
        preferredDeliveryTime: this.normalizeDateTimeForApi(applied.deliveryDateTime),
        deliveryLocationText: String(applied.deliveryAddress || '').trim(),
        deliveryGeoLat: 0,
        deliveryGeoLng: 0,
        provisionalRiderName: '',
        provisionalRiderPhone: '',
      };
    }

    return payload;
  }

  private resolveOrderSource(intakeChannel: string): 'ADMIN_WEB' | 'CUSTOMER_WEB' | 'SOCIAL_DM' | 'SHOP_COUNTER' {
    const normalized = String(intakeChannel || '').trim().toLowerCase();
    if (normalized.includes('shop') || normalized.includes('counter')) {
      return 'SHOP_COUNTER';
    }
    if (normalized.includes('whatsapp') || normalized.includes('instagram') || normalized.includes('social')) {
      return 'SOCIAL_DM';
    }
    if (normalized.includes('customer') || normalized.includes('app') || normalized.includes('web')) {
      return 'CUSTOMER_WEB';
    }
    return 'ADMIN_WEB';
  }

  private toApiOrderType(orderType: CareOrderType): 'WALK_IN_INSTANT' | 'CALL_PICKUP' | 'CALL_DELIVERY' | 'CALL_COURIER' {
    if (orderType === 'PICKUP_LATER') {
      return 'CALL_PICKUP';
    }

    if (orderType === 'HOME_DELIVERY') {
      return this.deliveryPincodeConfig().nonServiceableSuggestion === 'CALL_PICKUP' ? 'CALL_COURIER' : 'CALL_DELIVERY';
    }

    return 'WALK_IN_INSTANT';
  }

  private buildPlacementNotes(): string | undefined {
    const applied = this.appliedOrderDetails();
    const notes = [
      `Order Type: ${this.orderTypeLabel(applied.orderType)}`,
      `Intake Channel: ${this.appliedIntakeChannelLabel()}`,
      `Payment Status: ${applied.paymentStatus}`,
    ];
    const staffNote = String(this.orderStaffNote() || '').trim();
    if (staffNote) {
      notes.push(`Staff Note: ${staffNote}`);
    }
    if (applied.orderType === 'PICKUP_LATER') {
      const pickupDate = this.appliedPickupDateLabel();
      const pickupTime = this.appliedPickupTimeLabel();
      if (pickupDate || pickupTime) {
        const pickupSlot = `${pickupDate} ${pickupTime}`.trim();
        notes.push(`Pickup Slot: ${pickupSlot}`);
      }
    }
    return notes.join(' | ');
  }

  private buildHoldOrderNotes(reference: string, baseNotes?: string): string | undefined {
    const normalizedReference = String(reference || '').trim();
    const notes = [
      String(baseNotes || '').trim(),
      normalizedReference ? `Hold Reference: ${normalizedReference}` : 'Hold Order',
    ].filter(Boolean);

    return notes.length ? notes.join(' | ') : undefined;
  }

  private applyHeldDraftOrder(order: Order): void {
    const customer = typeof order.customerId === 'object' ? order.customerId : null;
    const orderType = this.fromApiOrderType(String(order.orderType || 'WALK_IN_INSTANT'));
    const deliveryDetails = order.deliveryDetails || null;
    const addressSnapshot = order.addressSnapshot || null;
    const customerName = String(customer?.name || addressSnapshot?.name || 'Walk-in Customer').trim() || 'Walk-in Customer';
    const customerPhone = String(customer?.phone || addressSnapshot?.phone || '').trim();
    const deliveryAddress = String(deliveryDetails?.locationText || addressSnapshot?.line1 || '').trim();
    const deliveryPincode = String(deliveryDetails?.postalCode || addressSnapshot?.postalCode || '').trim();
    const deliveryDateTime = String(deliveryDetails?.preferredDeliveryTime || '').trim();

    this.resetOrderDraftState();
    this.customer.set({
      id: typeof customer?._id === 'string' ? customer._id : undefined,
      name: customerName,
      phone: customerPhone,
    });
    this.customerForm.reset({
      name: customerName,
      phone: customerPhone,
      email: '',
    });
    this.customerSearchControl.setValue(customerPhone, { emitEvent: false });

    const cartItems = (order.items || []).map((item) => ({
      variantId: String(item.variantId || '').trim(),
      groupId: String((item as { groupId?: string }).groupId || '').trim(),
      categoryId: String((item as { categoryId?: string }).categoryId || '').trim() || undefined,
      groupName: String(item.groupNameSnapshot || '').trim(),
      variantName: String(item.variantNameSnapshot || '').trim(),
      quantity: Number(item.quantity || 0),
      unitLabel: String(item.unitSnapshot || '').trim(),
      unitPrice: Number(item.priceSnapshot?.sellingPrice || 0),
      lineTotal: Number(item.lineTotal || 0),
      customMeasured: false,
    })).filter((item) => item.variantId && Number.isFinite(item.quantity) && item.quantity > 0);

    this.cartItems.set(cartItems);
    this.appliedCouponCodes.set([]);
    this.orderType.set(orderType);
    this.draftOrderType.set(orderType);
    this.draftIntakeChannel.set(this.resolveIntakeChannelLabel(order.orderSource));
    this.appliedOrderDetails.set({
      orderType,
      intakeChannel: this.resolveIntakeChannelLabel(order.orderSource),
      otherIntakeChannel: '',
      paymentStatus: this.getDefaultPaymentStatus(orderType),
      pickupLocationId: '',
      pickupDateValue: '',
      pickupTimeValue: '',
      deliveryPincode,
      deliveryAddress,
      deliveryDateTime,
    });

    if (orderType === 'HOME_DELIVERY') {
      this.deliveryPincodeState.set(deliveryPincode ? 'SERVICEABLE' : 'EMPTY');
      this.orderTypeForm.patchValue({
        deliveryPincode,
        deliveryAddress,
        deliveryDateTime,
      });
      this.validateDeliveryPincode(deliveryPincode);
    } else {
      this.deliveryPincodeState.set('EMPTY');
      this.orderTypeForm.patchValue({
        deliveryPincode: '',
        deliveryAddress: '',
        deliveryDateTime: '',
      });
    }

    this.orderTypeForm.controls.intakeChannel.setValue(this.resolveIntakeChannelLabel(order.orderSource));
    this.orderTypeForm.controls.paymentStatus.setValue(this.getDefaultPaymentStatus(orderType));
    this.orderTypeForm.controls.otherIntakeChannel.setValue('');
    this.orderTypeForm.controls.pickupLocationId.setValue('');
    this.orderTypeForm.controls.pickupDateValue.setValue('');
    this.orderTypeForm.controls.pickupTimeValue.setValue('');
    this.orderTypeForm.markAsPristine();
    this.orderTypeEditorOpen.set(false);
    this.customerEditorOpen.set(false);
    this.clearOrderConfirmOpen.set(false);
    this.paymentUpiModalOpen.set(false);
    this.paymentCompleteModalOpen.set(false);
    this.paymentProcessedAt.set(null);
    this.paymentStatus.set('PENDING');
    this.orderStatus.set('PAYMENT_PENDING');
    this.completedTransaction.set(null);
    this.billTemplateConfig.set(null);
    this.billTemplateName.set('');
  }

  private resolveIntakeChannelLabel(orderSource: string): string {
    switch (String(orderSource || '').toUpperCase()) {
      case 'SHOP_COUNTER':
        return 'Shop Counter';
      case 'SOCIAL_DM':
        return 'WhatsApp Message';
      case 'CUSTOMER_WEB':
        return 'Customer Web';
      default:
        return 'Admin Web';
    }
  }

  getHeldOrderCustomerName(order: Order): string {
    if (typeof order.customerId === 'object' && order.customerId) {
      return String(order.customerId.name || 'Walk-in Customer').trim() || 'Walk-in Customer';
    }

    return 'Walk-in Customer';
  }

  private fromApiOrderType(orderType: string): CareOrderType {
    switch (String(orderType || '').toUpperCase()) {
      case 'CALL_PICKUP':
        return 'PICKUP_LATER';
      case 'CALL_DELIVERY':
      case 'CALL_COURIER':
        return 'HOME_DELIVERY';
      default:
        return 'WALK_IN';
    }
  }

  private normalizeDateTimeForApi(value: unknown): string {
    if (value instanceof Date) {
      return Number.isFinite(value.getTime()) ? value.toISOString() : '';
    }

    const raw = typeof value === 'string' || typeof value === 'number'
      ? String(value).trim()
      : '';
    if (!raw) {
      return '';
    }

    const parsed = new Date(raw);
    return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : raw;
  }

  private formatCurrencyWithPaise(value: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(value || 0));
  }

  private formatConfiguredOfferSummary(offer: Offer): string {
    const type = String(offer.type || '').toUpperCase();
    if (type === 'BUY_X_GET_Y') {
      const buyQty = Number(offer.buyQty || 0);
      const getQty = Number(offer.getQty || 0);
      if (buyQty > 0 && getQty > 0) {
        return `Buy ${buyQty}, get ${getQty}${offer.rewardMode === 'SAME_ITEM' ? ' (same item)' : ''}`;
      }
      return 'Buy X Get Y offer';
    }

    if (type === 'FREE_DELIVERY') {
      const minCart = Number(offer.deliveryMinCartValue ?? offer.minOrderValue ?? 0);
      return minCart > 0
        ? `Free delivery on orders above ${this.formatCurrency(minCart)}`
        : 'Free delivery offer';
    }

    const discountType = String(offer.discountType || '').toUpperCase();
    const discountValue = Number(offer.discountValue || 0);
    const minOrder = Number(offer.minOrderValue || 0);
    let discountText = 'Discount configured';
    if (discountType === 'AMOUNT' && discountValue > 0) {
      discountText = `${this.formatCurrency(discountValue)} off`;
    } else if (discountType === 'PERCENT' && discountValue > 0) {
      discountText = `${discountValue}% off`;
    }

    if (minOrder > 0) {
      return `${discountText} on orders above ${this.formatCurrency(minOrder)}`;
    }

    return discountText;
  }

  private getBillPaymentMethodLabel(providerName?: string): string {
    if (this.selectedPaymentMode() !== 'UPI') {
      return this.paymentMethodLabel(this.selectedPaymentMode());
    }

    const provider = String(providerName || '').trim();
    return provider ? `UPI - ${provider}` : 'UPI';
  }

  private ensureOrderEditable(action: string): boolean {
    if (!this.isOrderFrozen()) {
      return true;
    }

    this.toast.warning(`Order is completed and frozen. Cannot ${action}.`);
    return false;
  }

  private resetOrderDraftState(): void {
    this.cartItems.set([]);
    this.appliedCouponCodes.set([]);
    this.orderStaffNote.set('');
    this.orderNoteControl.setValue('');
    this.orderNoteModalOpen.set(false);
    this.customer.set({ name: 'Walk-in Customer', phone: '' });
    this.customerForm.reset({ name: '', phone: '', email: '' });
    this.customerSearchControl.setValue('', { emitEvent: false });
    this.customerSearchResults.set([]);
    this.customerSearchAttempted.set(false);
    this.orderType.set('WALK_IN');
    this.appliedOrderDetails.set({
      orderType: 'WALK_IN',
      intakeChannel: this.getDefaultIntakeChannel(),
      otherIntakeChannel: '',
      paymentStatus: this.getDefaultPaymentStatus('WALK_IN'),
      pickupLocationId: '',
      pickupDateValue: '',
      pickupTimeValue: '',
      deliveryPincode: '',
      deliveryAddress: '',
      deliveryDateTime: '',
    });
    this.orderTypeEditorOpen.set(false);
    this.customerEditorOpen.set(false);
    this.clearOrderConfirmOpen.set(false);
    this.paymentUpiModalOpen.set(false);
    this.paymentCompleteModalOpen.set(false);
    this.paymentProcessedAt.set(null);
    this.paymentStatus.set('PENDING');
    this.orderStatus.set('PAYMENT_PENDING');
    this.completedTransaction.set(null);
    this.billTemplateConfig.set(null);
    this.billTemplateName.set('');
  }

  private prepareNextEmptyOrder(): void {
    this.cartItems.set([]);
    this.appliedCouponCodes.set([]);
    this.orderStaffNote.set('');
    this.orderNoteControl.setValue('');
    this.orderNoteModalOpen.set(false);
    this.customer.set({ name: 'Walk-in Customer', phone: '' });
    this.customerForm.reset({ name: '', phone: '', email: '' });
    this.customerSearchControl.setValue('', { emitEvent: false });
    this.customerSearchResults.set([]);
    this.customerSearchAttempted.set(false);
    this.orderType.set('WALK_IN');
    this.appliedOrderDetails.set({
      orderType: 'WALK_IN',
      intakeChannel: this.getDefaultIntakeChannel(),
      otherIntakeChannel: '',
      paymentStatus: this.getDefaultPaymentStatus('WALK_IN'),
      pickupLocationId: '',
      pickupDateValue: '',
      pickupTimeValue: '',
      deliveryPincode: '',
      deliveryAddress: '',
      deliveryDateTime: '',
    });
    this.orderTypeEditorOpen.set(false);
    this.customerEditorOpen.set(false);
    this.clearOrderConfirmOpen.set(false);
    this.paymentUpiModalOpen.set(false);
    this.paymentProcessedAt.set(null);
    this.paymentStatus.set('PENDING');
    this.orderStatus.set('PAYMENT_PENDING');
  }

  private forceWalkInOrderType(): void {
    const defaultIntakeChannel = this.getDefaultIntakeChannel();
    const defaultPaymentStatus = this.getDefaultPaymentStatus('WALK_IN');

    this.orderType.set('WALK_IN');
    this.draftOrderType.set('WALK_IN');
    this.draftIntakeChannel.set(defaultIntakeChannel);
    this.orderTypeEditorOpen.set(false);
    this.deliveryPincodeState.set('EMPTY');

    this.appliedOrderDetails.set({
      orderType: 'WALK_IN',
      intakeChannel: defaultIntakeChannel,
      otherIntakeChannel: '',
      paymentStatus: defaultPaymentStatus,
      pickupLocationId: '',
      pickupDateValue: '',
      pickupTimeValue: '',
      deliveryPincode: '',
      deliveryAddress: '',
      deliveryDateTime: '',
    });

    this.orderTypeForm.reset({
      intakeChannel: defaultIntakeChannel,
      otherIntakeChannel: '',
      paymentStatus: defaultPaymentStatus,
      pickupLocationId: '',
      pickupDateValue: '',
      pickupTimeValue: '',
      deliveryPincode: '',
      deliveryAddress: '',
      deliveryDateTime: '',
    }, { emitEvent: false });

    this.selectedPickupLocationId.set('');
    this.selectedPickupDateValue.set('');
    this.updateOrderTypeValidators();
  }

  private pincodeMatchesPattern(pincode: string, rawPattern: string): boolean {
    const pattern = String(rawPattern || '').split(':')[0].trim();
    return pattern.endsWith('*') ? pincode.startsWith(pattern.slice(0, -1)) : pincode === pattern;
  }

  private onPickupDateChanged(): void {
    const selectedTime = String(this.orderTypeForm.controls.pickupTimeValue.value || '').trim();
    if (!selectedTime) {
      const firstTime = String(this.pickupTimeOptions()[0]?.value || '').trim();
      this.orderTypeForm.controls.pickupTimeValue.setValue(firstTime, { emitEvent: false });
      return;
    }

    const stillValid = this.pickupTimeOptions().some((option) => option.value === selectedTime);
    if (!stillValid) {
      this.orderTypeForm.controls.pickupTimeValue.setValue(String(this.pickupTimeOptions()[0]?.value || '').trim(), { emitEvent: false });
    }
  }

  private initializePickupPickerSelection(preferredDate = '', preferredTime = ''): void {
    const dateOptions = this.pickupDateOptions();
    const dateValue = dateOptions.some((option) => option.value === preferredDate)
      ? preferredDate
      : String(dateOptions[0]?.value || '').trim();
    this.orderTypeForm.controls.pickupDateValue.setValue(dateValue, { emitEvent: false });
    this.selectedPickupDateValue.set(dateValue);

    const timeOptions = this.pickupTimeOptions();
    const timeValue = timeOptions.some((option) => option.value === preferredTime)
      ? preferredTime
      : String(timeOptions[0]?.value || '').trim();
    this.orderTypeForm.controls.pickupTimeValue.setValue(timeValue, { emitEvent: false });
  }

  private buildPickupSlots(pickupTimingText: string, advanceDays = 0, sameDayLeadMinutes = 0): PickupSlot[] {
    const timing = String(pickupTimingText || '').trim();
    if (!timing) {
      return [];
    }

    const now = new Date();
    const isTwentyFourBySeven = /^24\s*x\s*7$/i.test(timing);
    const schedule = isTwentyFourBySeven ? null : this.parsePickupSchedule(timing);
    if (!isTwentyFourBySeven && schedule && !schedule.size) {
      return [];
    }

    const slots: PickupSlot[] = [];
    for (let dayOffset = 0; dayOffset <= advanceDays; dayOffset += 1) {
      slots.push(...this.buildPickupDaySlots(now, dayOffset, schedule, sameDayLeadMinutes));
    }
    return slots;
  }

  private buildPickupDaySlots(
    now: Date,
    dayOffset: number,
    schedule: Map<string, { closed: boolean; open: string; close: string }> | null,
    sameDayLeadMinutes: number,
  ): PickupSlot[] {
    const dayDate = new Date(now);
    dayDate.setHours(0, 0, 0, 0);
    dayDate.setDate(dayDate.getDate() + dayOffset);

    let openTime: Date;
    let closeTime: Date;
    if (schedule === null) {
      openTime = new Date(dayDate);
      closeTime = new Date(dayDate);
      closeTime.setDate(closeTime.getDate() + 1);
    } else {
      const dayCode = this.getDayCode(dayDate);
      const dayWindow = schedule.get(dayCode);
      if (!dayWindow || dayWindow.closed) {
        return [];
      }

      const [openHour, openMinute] = dayWindow.open.split(':').map(Number);
      const [closeHour, closeMinute] = dayWindow.close.split(':').map(Number);
      if (!Number.isFinite(openHour) || !Number.isFinite(closeHour)) {
        return [];
      }

      openTime = new Date(dayDate);
      openTime.setHours(openHour, openMinute, 0, 0);
      closeTime = new Date(dayDate);
      closeTime.setHours(closeHour, closeMinute, 0, 0);
    }

    const earliest = dayOffset === 0
      ? this.roundUpToNextHalfHour(new Date(Math.max(openTime.getTime(), now.getTime() + sameDayLeadMinutes * 60 * 1000)))
      : new Date(openTime);

    const slots: PickupSlot[] = [];
    const dateValue = this.formatDateValue(dayDate);
    const dateLabel = this.formatDateLabel(dayDate, dayOffset);
    let slotTime = new Date(earliest);
    while (slotTime < closeTime) {
      const nextTime = new Date(slotTime);
      nextTime.setMinutes(nextTime.getMinutes() + 30);
      if (nextTime <= closeTime) {
        const timeLabel = `${this.formatTime(slotTime)} - ${this.formatTime(nextTime)}`;
        slots.push({
          dateValue,
          dateLabel,
          timeLabel,
          value: `${dateValue} ${timeLabel}`,
        });
      }
      slotTime = nextTime;
    }
    return slots;
  }

  private parsePickupSchedule(timing: string): Map<string, { closed: boolean; open: string; close: string }> {
    const schedule = new Map<string, { closed: boolean; open: string; close: string }>();
    const parts = timing.split('|').map((part) => part.trim()).filter(Boolean);
    const closedRegex = /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+Closed$/i;
    const windowRegex = /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+([0-2]\d:[0-5]\d)-([0-2]\d:[0-5]\d)$/i;

    for (const part of parts) {
      const closedMatch = closedRegex.exec(part);
      if (closedMatch) {
        schedule.set(closedMatch[1].slice(0, 3), { closed: true, open: '', close: '' });
        continue;
      }

      const windowMatch = windowRegex.exec(part);
      if (!windowMatch) {
        continue;
      }

      schedule.set(windowMatch[1].slice(0, 3), {
        closed: false,
        open: windowMatch[2],
        close: windowMatch[3],
      });
    }

    return schedule;
  }

  private getDayCode(date: Date): string {
    return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()] || 'Mon';
  }

  private roundUpToNextHalfHour(date: Date): Date {
    const next = new Date(date);
    next.setSeconds(0, 0);
    const minutes = next.getMinutes();
    const delta = minutes % 30 === 0 ? 30 : 30 - (minutes % 30);
    next.setMinutes(minutes + delta);
    return next;
  }

  private formatTime(date: Date): string {
    return date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  }

  private formatDateValue(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private formatDateLabel(date: Date, dayOffset: number): string {
    const prettyDate = date.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });
    if (dayOffset === 0) {
      return `Today (${prettyDate})`;
    }
    if (dayOffset === 1) {
      return `Tomorrow (${prettyDate})`;
    }
    return prettyDate;
  }

  private formatPickupDateValue(value: string): string {
    const [year, month, day] = String(value || '').split('-').map(Number);
    const date = Number.isFinite(year) && Number.isFinite(month) && Number.isFinite(day)
      ? new Date(year, month - 1, day)
      : new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return date.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });
  }

  private toLocalDateTimeInput(date: Date): string {
    const offset = date.getTimezoneOffset() * 60_000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
  }

  private getErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      return String(error.error?.message || error.message || fallback);
    }

    if (typeof error === 'object' && error && 'message' in error) {
      return String((error as { message?: string }).message || fallback);
    }

    return fallback;
  }
}
