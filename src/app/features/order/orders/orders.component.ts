import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal, ViewChild } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import {
  GomAlertToastService,
  GomButtonComponent,
  GomChipComponent,
  GomChipTone,
  GomConfirmationModalComponent,
  GomInputComponent,
  GomModalComponent,
  GomSelectComponent,
  GomSelectOption,
  GomTableColumn,
  GomTableComponent,
  GomTableBulkAction,
  GomTableBulkActionEvent,
  GomTableFilterDefinition,
  GomTableFilterNavigationRow,
  GomTableFilterValue,
  GomTableMobileCardConfig,
  GomTableQuery,
  GomTableRow,
} from '@gomlibs/ui';
import { forkJoin } from 'rxjs';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { DisableIfNoFeatureDirective } from '../../../shared/directives/disable-if-no-feature.directive';
import { CourierPartner, Order, OrderAttentionCounts, OrderItem, OrderRating, OrdersService, ReturnRequest, Rider, UpdateOrderEditableFieldsPayload, Variant } from './orders.service';

interface OrderRow extends GomTableRow {
  _id: string;
  orderNo: string;
  customer: string;
  customerName: string;
  source: string;
  mobileSource: string;
  deliveryType: string;
  orderType: string;
  status: string;
  rawStatus: string;
  paymentStatus: string;
  mobilePayment: string;
  discount: string;
  couponsUsed: string;
  profit: string;
  total: string;
  rawTotal: number;
  createdAt: string;
  mobileCreatedAt: string;
  rawCreatedAt: string;
  deliveryDelayedFilter: string;
  assignedRiderName: string;
  itemCount: string;
  actions: string;
}

@Component({
  selector: 'gom-orders',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DisableIfNoFeatureDirective,
    GomButtonComponent,
    GomInputComponent,
    GomSelectComponent,
    GomChipComponent,
    GomModalComponent,
    GomTableComponent,
    GomConfirmationModalComponent,
  ],
  templateUrl: './orders.component.html',
  styleUrl: './orders.component.scss',
})
export class OrdersComponent implements OnInit {
  private readonly service = inject(OrdersService);
  private readonly toast = inject(GomAlertToastService);
  private readonly router = inject(Router);
  private readonly authSession = inject(AuthSessionService);

  @ViewChild(GomTableComponent) private orderTable!: GomTableComponent<OrderRow>;

  readonly loading = signal(false);
  readonly canListOrders = computed(() => this.authSession.hasFeature('order.list'));
  readonly canViewOrder = computed(() => this.authSession.hasFeature('order.view'));
  readonly canCreateOrder = computed(() => this.authSession.hasFeature('order.create'));
  readonly canUpdateOrder = computed(() => this.authSession.hasFeature('order.update'));
  readonly canDeleteOrder = computed(() => this.authSession.hasFeature('order.delete'));
  readonly canManageDelivery = computed(() => this.authSession.hasFeature('delivery.management'));
  readonly deleting = signal(false);
  readonly kpiDateRange = signal<string>('all');
  readonly kpiCounts = signal<Record<string, number>>({});
  readonly kpiAttention = signal<OrderAttentionCounts>({ paymentPending: 0, awaitingConfirmation: 0, returnRequests: 0, deliveryDelayed: 0 });
  readonly kpiLoading = signal(false);
  readonly customDateFrom = signal('');
  readonly customDateTo = signal('');
  readonly errorMessage = signal<string | null>(null);
  readonly deleteModalOpen = signal(false);

  readonly deleteTarget = signal<Order | null>(null);
  readonly transitionModalOpen = signal(false);
  readonly transitionBusy = signal(false);
  readonly transitionTarget = signal<{ order: Order; nextStatus: string; reason: string } | null>(null);
  readonly bulkStatusModalOpen = signal(false);
  readonly bulkActionBusyKey = signal<string | null>(null);
  readonly selectedOrderRows = signal<OrderRow[]>([]);
  readonly bulkStatusForm = new FormGroup({
    status: new FormControl(''),
    reason: new FormControl(''),
  });

  readonly assignRiderModalOpen = signal(false);
  readonly assignRiderBusy = signal(false);
  readonly assignRiderOrderTarget = signal<Order | null>(null);
  readonly assignRiderForm = new FormGroup({
    riderId: new FormControl(''),
  });

  readonly dispatchModalOpen = signal(false);
  readonly dispatchBusy = signal(false);
  readonly dispatchOrderTarget = signal<Order | null>(null);
  readonly dispatchForm = new FormGroup({
    courierPartnerId: new FormControl(''),
    trackingNumber: new FormControl(''),
    awbNumber: new FormControl(''),
    consignmentNote: new FormControl(''),
    estimatedDeliveryDate: new FormControl(''),
  });

  readonly viewOrderModalOpen = signal(false);
  readonly viewOrderLoading = signal(false);
  readonly viewOrderTarget = signal<Order | null>(null);
  readonly viewOrderRating = signal<OrderRating | null>(null);
  readonly viewOrderRatingLoading = signal(false);
  readonly viewOrderReturnRequest = signal<ReturnRequest | null>(null);
  readonly viewOrderReturnLoading = signal(false);
  
  // Computed properties for return request details
  readonly returnRequestItems = computed(() => {
    const returnReq = this.viewOrderReturnRequest();
    const order = this.viewOrderTarget();
    if (!returnReq || !order || !returnReq.items || !order.items) {
      return [];
    }

    return returnReq.items
      .map((returnItem) => {
        const orderItem = order.items?.find((oi) => oi._id === returnItem.orderItemId);
        if (!orderItem) {
          return null;
        }

        return {
          orderItemId: returnItem.orderItemId,
          groupName: orderItem.groupNameSnapshot,
          variantName: orderItem.variantNameSnapshot,
          quantity: returnItem.quantity,
          unit: orderItem.unitSnapshot,
          reason: returnItem.reason || '-',
          action: returnItem.action || 'REFUND',
          sellingPrice: orderItem.priceSnapshot.sellingPrice,
          lineTotal: orderItem.priceSnapshot.sellingPrice * returnItem.quantity,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  });

  readonly totalReturnRefundAmount = computed(() => {
    return this.returnRequestItems()
      .filter(item => item.action === 'REFUND')
      .reduce((sum, item) => sum + item.lineTotal, 0);
  });
  
  readonly statusHistoryModalOpen = signal(false);
  readonly statusHistoryLoading = signal(false);
  readonly statusHistoryTarget = signal<Order | null>(null);
  readonly editOrderModalOpen = signal(false);
  readonly editOrderBusy = signal(false);
  readonly editOrderTarget = signal<Order | null>(null);
  readonly editItemsModalOpen = signal(false);
  readonly editItemsBusy = signal(false);
  readonly editItemsTarget = signal<Order | null>(null);
  readonly addItemForm = new FormGroup({
    variantId: new FormControl(''),
    quantity: new FormControl('1'),
  });
  readonly editOrderForm = new FormGroup({
    customerName: new FormControl(''),
    customerPhone: new FormControl(''),
    deliveryAddressText: new FormControl(''),
    deliveryPostalCode: new FormControl(''),
    deliveryContactName: new FormControl(''),
    deliveryContactPhone: new FormControl(''),
    preferredDeliveryTime: new FormControl(''),
    deliveryLocationText: new FormControl(''),
    deliveryGeoLat: new FormControl(''),
    deliveryGeoLng: new FormControl(''),
    notes: new FormControl(''),
  });

  readonly orders = signal<Order[]>([]);
  readonly totalOrders = signal(0);
  readonly orderTablePageIndex = signal(0);
  readonly orderTablePageSize = signal(10);
  readonly canLoadAllOrders = signal(false);
  readonly allOrdersLoaded = signal(false);
  readonly serverSidePaginationOrders = computed(() => true);
  readonly orderTableDataMode = computed<'client' | 'server'>(() => 'server');
  readonly riders = signal<Rider[]>([]);
  readonly courierPartners = signal<CourierPartner[]>([]);
  readonly variants = signal<Variant[]>([]);

  private readonly serverChunkSize = 50;
  private ordersChunkCache = new Map<number, Order[]>();
  private activeOrdersQueryKey = '';
  private latestOrdersRequestId = 0;
  private lastOrdersQuery: GomTableQuery = {
    searchTerm: '',
    sort: { key: '', direction: '' },
    pageIndex: 0,
    pageSize: 10,
    filters: {},
    visibleColumnKeys: [],
    advancedFilters: {},
    globalSearchScope: 'all',
  };


  readonly riderOptions = computed<GomSelectOption[]>(() =>
    this.riders().map((rider) => ({
      value: rider._id,
      label: `${rider.name} (${rider.phone})`,
    }))
  );

  readonly courierPartnerOptions = computed<GomSelectOption[]>(() =>
    this.courierPartners().map((partner) => ({
      value: partner._id,
      label: partner.name,
    }))
  );

  readonly addableVariantOptions = computed<GomSelectOption[]>(() => {
    const currentItems = this.editItemsTarget()?.items || [];
    const existingVariantIds = new Set(
      currentItems
        .filter((item) => String(item.status || '').toUpperCase() !== 'CANCELLED')
        .map((item) => String(item.variantId || ''))
        .filter(Boolean)
    );

    return this.variants()
      .filter((variant) => !existingVariantIds.has(String(variant._id)))
      .map((variant) => ({ value: variant._id, label: variant.name }));
  });

  readonly bulkStatusOptions: GomSelectOption[] = [
    { label: 'Confirmed', value: 'CONFIRMED' },
    { label: 'Packed', value: 'PACKED' },
    { label: 'Assigned', value: 'ASSIGNED' },
    { label: 'Shipped', value: 'SHIPPED' },
    { label: 'Dispatched', value: 'DISPATCHED' },
    { label: 'Attempted Delivery', value: 'ATTEMPTED_DELIVERY' },
    { label: 'Delivered', value: 'DELIVERED' },
    { label: 'Cancelled', value: 'CANCELLED' },
    { label: 'Return Requested', value: 'RETURN_REQUESTED' },
    { label: 'Return in Transit', value: 'RETURN_IN_TRANSIT' },
    { label: 'Returned', value: 'RETURNED' },
    { label: 'Refunded', value: 'REFUNDED' },
  ];

  readonly orderTableBulkActions: GomTableBulkAction<OrderRow>[] = [
    {
      actionKey: 'change-status',
      label: 'Change status',
      icon: 'ri-exchange-line',
      variant: 'primary',
      disabled: () => !this.canUpdateOrder(),
      disabledTooltip: 'You do not have permission to update orders',
    },
  ];

  readonly orderTableFilters: GomTableFilterDefinition<OrderRow>[] = [
    {
      key: 'paymentStatus',
      label: 'Payment',
      type: 'multi-select',
      placement: 'both',
      mobileControl: 'checkboxes',
      options: [
        { label: 'Pending', value: 'PENDING' },
        { label: 'Success', value: 'SUCCESS' },
        { label: 'Failed', value: 'FAILED' },
        { label: 'Refunded', value: 'REFUNDED' },
      ],
    },
    {
      key: 'rawStatus',
      label: 'Status',
      type: 'multi-select',
      placement: 'panel',
      mobileControl: 'checkboxes',
      options: [
        { label: 'Draft', value: 'DRAFT' },
        { label: 'Placed', value: 'PLACED' },
        { label: 'Confirmed', value: 'CONFIRMED' },
        { label: 'Packed', value: 'PACKED' },
        { label: 'Assigned', value: 'ASSIGNED' },
        { label: 'Shipped', value: 'SHIPPED' },
        { label: 'Dispatched', value: 'DISPATCHED' },
        { label: 'Attempted Delivery', value: 'ATTEMPTED_DELIVERY' },
        { label: 'Delivered', value: 'DELIVERED' },
        { label: 'Cancelled', value: 'CANCELLED' },
        { label: 'Return Requested', value: 'RETURN_REQUESTED' },
        { label: 'Return in Transit', value: 'RETURN_IN_TRANSIT' },
        { label: 'Returned', value: 'RETURNED' },
        { label: 'Refunded', value: 'REFUNDED' },
      ],
    },
    {
      key: 'source',
      label: 'Order source',
      type: 'select',
      placement: 'panel',
      optionSource: 'rows',
      searchable: true,
      mobileControl: 'chips',
    },
    {
      key: 'rawCreatedAt',
      label: 'Created date',
      type: 'date-range',
      placement: 'panel',
    },
    {
      key: 'deliveryDelayedFilter',
      label: 'Attention',
      type: 'select',
      placement: 'panel',
      options: [
        { label: 'Delivery Delayed', value: 'true' },
      ],
    },
  ];

  readonly orderMobileCardConfig: GomTableMobileCardConfig<OrderRow> = {
    primaryKey: 'orderNo',
    titleKey: 'customerName',
    subtitleKey: 'customer',
    avatarKey: 'customerName',
    dateKey: 'mobileCreatedAt',
    summaryStartKey: 'itemCount',
    summaryCenterKey: 'total',
    summaryEndKey: 'mobileSource',
    statusKey: 'status',
    detailKey: 'deliveryType',
    paymentKey: 'mobilePayment',
  };

  orderTableNavigationRows: GomTableFilterNavigationRow<OrderRow>[] = [
    {
      key: 'rawStatus',
      label: 'Status',
      showCounts: true,
      options: [
        { label: 'Draft', value: 'DRAFT' },
        { label: 'Placed', value: 'PLACED' },
        { label: 'Confirmed', value: 'CONFIRMED' },
        { label: 'Packed', value: 'PACKED' },
        { label: 'Assigned', value: 'ASSIGNED' },
        { label: 'Shipped', value: 'SHIPPED' },
        { label: 'Dispatched', value: 'DISPATCHED' },
        { label: 'Attempted Delivery', value: 'ATTEMPTED_DELIVERY' },
        { label: 'Delivered', value: 'DELIVERED' },
        { label: 'Cancelled', value: 'CANCELLED' },
        { label: 'Return Requested', value: 'RETURN_REQUESTED' },
        { label: 'Return in Transit', value: 'RETURN_IN_TRANSIT' },
        { label: 'Returned', value: 'RETURNED' },
        { label: 'Refunded', value: 'REFUNDED' },
      ],
    }
  ];

  readonly columns: GomTableColumn<OrderRow>[] = [
    { key: 'orderNo', header: 'Order No', sortable: true, filterable: true, width: '12rem' },
    {
      key: 'customer',
      header: 'Customer',
      sortable: true,
      filterable: true,
      width: '14rem',
      tooltip: (_, row) => String(row.customerName || row.customer || '-'),
    },
    {
      key: 'customerName',
      header: 'Customer Name',
      sortable: true,
      filterable: true,
      width: '14rem',
      hiddenByDefault: true,
    },
    { key: 'source', header: 'Source', sortable: true, filterable: true, width: '10rem' },
    { key: 'orderType', header: 'Order Type', sortable: true, width: '12rem' },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      filterable: true,
      width: '10rem',
      clickActionKey: 'status-history',
      chipTone: (value) => this.getStatusChipTone(String(value || '')),
    },
    {
      key: 'paymentStatus',
      header: 'Payment',
      sortable: true,
      filterable: true,
      width: '9rem',
      chipTone: (value) => this.getPaymentChipTone(String(value || '')),
    },
    { key: 'discount', header: 'Discount', sortable: true, width: '8rem' },
    {
      key: 'couponsUsed',
      header: 'Coupons Used',
      sortable: true,
      filterable: true,
      width: '14rem',
      tooltip: (_, row) => String(row.couponsUsed || '-'),
    },
    {
      key: 'profit',
      header: 'Profit',
      sortable: true,
      width: '10rem',
      tooltip: (_, row) => this.getProfitTooltip(String(row._id || '')),
    },
    { key: 'total', header: 'Total', sortable: true, sortValue: (row) => row.rawTotal, width: '8rem' },
    { key: 'createdAt', header: 'Created', sortable: true, sortValue: (row) => row.rawCreatedAt, width: '10rem' },
    {
      key: 'actions',
      header: 'Actions',
      width: '12rem',
      actionButtons: [
        {
          label: (row) => this.getNextStatusLabel(String(row['rawStatus'] || ''), String(row['deliveryType'] || ''), String(row['orderType'] || '')),
          actionKey: 'next',
          variant: 'secondary',
          disabled: (row) => !this.canUpdateOrder() || !this.getNextStatus(
            String(row['rawStatus'] || ''),
            String(row['deliveryType'] || ''),
            String(row['orderType'] || '')
          ),
        },
        {
          label: (row) => this.getAssignRiderLabel(String(row['assignedRiderName'] || '')),
          icon: (row) => String(row['assignedRiderName'] || '') ? 'ri-user-follow-line' : 'ri-user-add-line',
          actionKey: 'assign-rider',
          variant: 'secondary',
          disabled: (row) => !this.canUpdateOrder() || !this.canAssignRider(
            String(row['rawStatus'] || ''),
            String(row['deliveryType'] || ''),
            String(row['orderType'] || '')
          ),
        },
        {
          label: 'More Actions',
          icon: 'ri-more-2-fill',
          actionKey: 'more-actions',
          variant: 'secondary',
          subActions: [
            {
              label: 'View Full Order',
              actionKey: 'view',
              variant: 'secondary',
            },
            {
              label: 'Share Bill on WhatsApp',
              actionKey: 'share-bill-whatsapp',
              variant: 'secondary',
            },
            {
              label: 'Share Bill by Email',
              actionKey: 'share-bill-mail',
              variant: 'secondary',
            },
            {
              label: 'Print Bill',
              actionKey: 'print-bill',
              variant: 'secondary',
            },
            {
              label: 'Edit Order Details',
              actionKey: 'edit-order-details',
              variant: 'secondary',
              disabled: (row) => !this.canEditOrderDetails(String(row['rawStatus'] || '')),
            },
            {
              label: 'Add / Change Items',
              actionKey: 'edit-order-items',
              variant: 'secondary',
              disabled: (row) => !this.canEditOrderItems(String(row['rawStatus'] || ''), String(row['paymentStatus'] || '')),
            },
            {
              label: 'Mark Payment Received',
              actionKey: 'mark-payment-received',
              variant: 'secondary',
              disabled: (row) => !this.canUpdateOrder() || String(row['paymentStatus'] || '').toUpperCase() !== 'PENDING',
            },
            {
              label: 'Mark Delivery Attempt Failed',
              actionKey: 'attempt-failed',
              variant: 'secondary',
              disabled: (row) => !this.canUpdateOrder() || !(
                String(row['deliveryType'] || '').toUpperCase() === 'DELIVERY'
                && String(row['rawStatus'] || '') === 'SHIPPED'
              ),
            },
            {
              label: (row) => String(row['deliveryType'] || '').toUpperCase() === 'PICKUP'
                ? 'Request Return / Refund'
                : 'Request Return / Refund',
              icon: 'ri-arrow-go-back-line',
              actionKey: 'request-return',
              variant: 'secondary',
              disabled: (row) => !this.canUpdateOrder() || String(row['rawStatus'] || '') !== 'DELIVERED',
            },
            {
              label: 'Mark Return In Transit',
              icon: 'ri-truck-line',
              actionKey: 'mark-return-in-transit',
              variant: 'secondary',
              disabled: (row) => !this.canUpdateOrder() || !(
                String(row['rawStatus'] || '') === 'RETURN_REQUESTED'
                && (
                  String(row['deliveryType'] || '').toUpperCase() === 'DELIVERY'
                  || String(row['orderType'] || '').toUpperCase() === 'CALL_COURIER'
                )
              ),
            },
            {
              label: 'Mark Return Received at Store',
              icon: 'ri-home-office-line',
              actionKey: 'mark-return-received',
              variant: 'secondary',
              disabled: (row) => !this.canUpdateOrder() || !(
                (
                  String(row['rawStatus'] || '') === 'RETURN_IN_TRANSIT'
                  && (
                    String(row['deliveryType'] || '').toUpperCase() === 'DELIVERY'
                    || String(row['orderType'] || '').toUpperCase() === 'CALL_COURIER'
                  )
                )
                || (
                  String(row['rawStatus'] || '') === 'RETURN_REQUESTED'
                  && String(row['deliveryType'] || '').toUpperCase() === 'PICKUP'
                )
              ),
            },
            {
              label: 'Mark Money Refunded',
              icon: 'ri-refund-2-line',
              actionKey: 'mark-money-refunded',
              variant: 'secondary',
              disabled: (row) => !this.canUpdateOrder() || String(row['rawStatus'] || '') !== 'RETURNED',
            },
            {
              label: 'Return to Warehouse (Undeliverable)',
              icon: 'ri-store-3-line',
              actionKey: 'courier-return-to-warehouse',
              variant: 'secondary',
              disabled: (row) => !this.canShowCourierReturnAction(row),
            },
            {
              label: 'Cancel Order',
              actionKey: 'cancel',
              variant: 'danger',
              disabled: (row) => !this.canCancelStatus(String(row['rawStatus'] || '')),
            },
            {
              label: 'Delete Draft',
              actionKey: 'delete',
              variant: 'danger',
              disabled: (row) => !this.canDeleteStatus(String(row['rawStatus'] || '')),
            },
          ],
        },
      ],
    },
  ];

  readonly orderMobileSortKeys: Array<keyof OrderRow & string> = [
    'orderNo',
    'customerName',
    'source',
    'total',
    'status',
    'paymentStatus',
    'createdAt',
  ];

  readonly rows = computed<OrderRow[]>(() =>
    this.orders().map((item) => ({
      discount: `Rs ${Number(item.pricingSnapshot?.discount || 0).toLocaleString()}`,
      couponsUsed: this.getCouponsUsedLabel(item),
      profit: this.getProfitLabel(item),
      customerName: typeof item.customerId === 'object' ? item.customerId?.name || '-' : '-',
      _id: item._id,
      orderNo: item.orderNo,
      customer: typeof item.customerId === 'object' ? item.customerId?.phone || '-' : '-',
      source: item.orderSource,
      mobileSource: this.getMobileOrderSourceLabel(item.orderSource),
      deliveryType: item.deliveryType,
      orderType: item.orderType || 'WALK_IN_INSTANT',
      status: this.getStatusDisplayLabel(item.status, item.deliveryType),
      rawStatus: item.status,
      paymentStatus: item.paymentStatus,
      mobilePayment: this.getMobilePaymentLabel(item.paymentStatus),
      total: `Rs ${Number(item.pricingSnapshot?.grandTotal || 0).toLocaleString()}`,
      rawTotal: Number(item.pricingSnapshot?.grandTotal || 0),
      createdAt: new Date(item.createdAt).toLocaleDateString(),
      mobileCreatedAt: this.getMobileOrderDateLabel(item.createdAt),
      rawCreatedAt: item.createdAt,
      deliveryDelayedFilter: this.isOrderDeliveryDelayed(item) ? 'true' : '',
      assignedRiderName: item.assignedRider?.name || '',
      itemCount: `${item.items?.length || 0} Item${item.items?.length === 1 ? '' : 's'}`,
      actions: 'Actions',
    }))
  );

  private getMobileOrderSourceLabel(source: string): string {
    const labels: Record<string, string> = {
      CUSTOMER_WEB: 'Online Store',
      PHONE: 'Phone',
      WHATSAPP: 'WhatsApp',
      SHOP_COUNTER: 'Store',
      WALK_IN: 'Walk-in',
      MARKETPLACE: 'Marketplace',
    };
    return labels[String(source || '').toUpperCase()] || String(source || '').replaceAll('_', ' ');
  }

  private getMobilePaymentLabel(status: string): string {
    const labels: Record<string, string> = {
      SUCCESS: 'Paid',
      PENDING: 'Unpaid',
      FAILED: 'Failed',
      REFUNDED: 'Refunded',
      PARTIAL: 'Partial',
    };
    return labels[String(status || '').toUpperCase()] || status;
  }

  private getMobileOrderDateLabel(value: string): string {
    const date = new Date(value);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const sameDay = (left: Date, right: Date) => left.toDateString() === right.toDateString();
    let day = date.toLocaleDateString();
    if (sameDay(date, today)) {
      day = 'Today';
    } else if (sameDay(date, yesterday)) {
      day = 'Yesterday';
    }
    return `${day}, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }

  private isOrderDeliveryDelayed(order: Order): boolean {
    const status = String(order.status || '').toUpperCase();
    if (status === 'ATTEMPTED_DELIVERY') {
      return true;
    }

    if (status === 'DISPATCHED' && this.isPastDate(order.courierDetails?.estimatedDeliveryDate)) {
      return true;
    }

    if (['ASSIGNED', 'SHIPPED'].includes(status) && this.isPastDate(order.deliveryDetails?.preferredDeliveryTime)) {
      return true;
    }

    return false;
  }

  private isPastDate(value?: string | null): boolean {
    if (!value) {
      return false;
    }
    const date = new Date(value);
    return !Number.isNaN(date.getTime()) && date.getTime() < Date.now();
  }

  getCouponsUsedLabel(order: Order): string {
    const rawCodes = [
      ...(order?.promotionSnapshot?.coupon?.codes || []),
      ...(order?.promotionSnapshot?.coupon?.coupons || []).map((coupon) => String(coupon?.code || '')),
      String(order?.promotionSnapshot?.coupon?.code || ''),
    ];

    const dedupedCodes = [...new Set(rawCodes.map((code) => String(code || '').trim()).filter(Boolean))];
    return dedupedCodes.length ? dedupedCodes.join(', ') : '-';
  }

  getProfitLabel(order: Order): string {
    const grossProfit = Number(order?.profitabilitySnapshot?.grossProfit);
    if (!Number.isFinite(grossProfit)) {
      return '-';
    }

    return `Rs ${grossProfit.toLocaleString()}`;
  }

  private getProfitTooltip(orderId: string): string {
    const order = this.orders().find((item) => item._id === orderId);
    if (!order?.profitabilitySnapshot || !Number.isFinite(Number(order.profitabilitySnapshot.grossProfit))) {
      return 'Profit snapshot is not available for this order.';
    }

    const marginPct = Number(order.profitabilitySnapshot.grossMarginPct);
    const cogsTotal = Number(order.profitabilitySnapshot.cogsTotal || 0);
    const marginLabel = Number.isFinite(marginPct) ? `${marginPct.toFixed(2)}%` : 'N/A';
    return `COGS: Rs ${cogsTotal.toLocaleString()} | Margin: ${marginLabel}`;
  }

  private isPickupDeliveryType(deliveryType: string | null | undefined): boolean {
    return String(deliveryType || '').toUpperCase() === 'PICKUP';
  }

  private getStatusDisplayLabel(status: string, deliveryType: string): string {
    const normalized = String(status || '').toUpperCase();
    if (!this.isPickupDeliveryType(deliveryType)) {
      return normalized;
    }

    const pickupLabels: Record<string, string> = {
      PACKED: 'READY_FOR_PICKUP',
      DELIVERED: 'PICKED_UP',
    };

    return pickupLabels[normalized] || normalized;
  }

  private getPickupPreferredTime(notes: string | null | undefined): string {
    for (const part of String(notes || '').split('|')) {
      const trimmed = part.trim();
      if (trimmed.toLowerCase().startsWith('preferred pickup time:')) {
        return trimmed.replace(/^preferred pickup time:\s*/i, '').trim();
      }
    }
    return '';
  }

  private getSanitizedOrderNotes(notes: string | null | undefined): string {
    return String(notes || '')
      .split('|')
      .map((part) => part.trim())
      .filter((part) => part && !part.toLowerCase().startsWith('preferred pickup time:'))
      .join(' | ');
  }

  get viewOrderIsPickup(): boolean {
    return this.isPickupDeliveryType(this.viewOrderTarget()?.deliveryType);
  }

  get viewOrderPickupTime(): string {
    return this.getPickupPreferredTime(this.viewOrderTarget()?.notes);
  }

  get viewOrderLocationTitle(): string {
    return this.viewOrderIsPickup ? 'Pickup Location' : 'Delivery Address';
  }

  get viewOrderLocationText(): string {
    const order = this.viewOrderTarget();
    if (!order?.addressSnapshot) {
      return '-';
    }

    return [
      order.addressSnapshot.name,
      order.addressSnapshot.line1,
      order.addressSnapshot.line2,
      [order.addressSnapshot.city, order.addressSnapshot.state].filter(Boolean).join(', '),
      order.addressSnapshot.postalCode,
    ].filter(Boolean).join(' | ');
  }

  get viewOrderNotes(): string {
    return this.getSanitizedOrderNotes(this.viewOrderTarget()?.notes);
  }

  getViewOrderStatusLabel(order: Order | null | undefined): string {
    if (!order) {
      return '-';
    }
    return this.getStatusDisplayLabel(order.status, order.deliveryType);
  }

  getStatusHistoryLabel(status: string | null | undefined, deliveryType: string | null | undefined): string {
    if (!status) {
      return 'Order Created';
    }
    return this.getStatusDisplayLabel(status, String(deliveryType || ''));
  }

  getOrderMarginLabel(order: Order): string {
    const marginPct = Number(order?.profitabilitySnapshot?.grossMarginPct);
    return Number.isFinite(marginPct) ? `${marginPct.toFixed(2)}%` : '-';
  }

  getItemDiscountValue(item: OrderItem): number {
    return Math.max(0, Number(item?.priceSnapshot?.discount || 0));
  }

  ngOnInit(): void {
    this.loadInitialData();
    this.loadDeliveryMasters();
  }

  loadInitialData(): void {
    this.errorMessage.set(null);
    const nextQuery = this.cloneTableQuery({
      ...this.lastOrdersQuery,
      pageIndex: 0,
      pageSize: this.lastOrdersQuery.pageSize || this.orderTablePageSize(),
    });

    this.orderTablePageIndex.set(0);
    this.orderTablePageSize.set(nextQuery.pageSize);
    this.allOrdersLoaded.set(false);
    this.lastOrdersQuery = nextQuery;
    this.loadOrderNavigationCounts();
    this.fetchOrdersForQuery(nextQuery, { forceRefresh: true });
  }

  private loadOrderNavigationCounts(): void {
    const dateParams = this.getKpiDateParams();
    this.kpiLoading.set(true);
    this.service.getNavigationCounts(dateParams).subscribe({
      next: (response) => {
        const statuses = response.data?.statuses ?? {};
        const total = Math.max(0, Number(response.data?.total) || 0);
        this.kpiCounts.set({ ...statuses, total });
        this.kpiAttention.set(response.data?.attention ?? { paymentPending: 0, awaitingConfirmation: 0, returnRequests: 0, deliveryDelayed: 0 });
        this.kpiLoading.set(false);
        this.orderTableNavigationRows = this.orderTableNavigationRows.map((row) => {
          if (row.key !== 'rawStatus') {
            return row;
          }
          return {
            ...row,
            allOption: { label: 'All', value: '', count: total },
            options: (row.options ?? []).map((option) => ({
              ...option,
              count: Math.max(0, Number(statuses[option.value]) || 0),
            })),
          };
        });
      },
      error: () => this.kpiLoading.set(false),
    });
  }

  setKpiDateRange(range: string): void {
    this.kpiDateRange.set(range);
    if (range !== 'custom') {
      this.loadOrderNavigationCounts();
    }
  }

  onAttentionClick(type: 'paymentPending' | 'awaitingConfirmation' | 'returnRequests' | 'deliveryDelayed'): void {
    if (!this.orderTable) {
      console.warn('[Attention] orderTable ViewChild not available');
      return;
    }
    switch (type) {
      case 'paymentPending':
        this.orderTable.setQueryFilters({ paymentStatus: 'PENDING' });
        break;
      case 'awaitingConfirmation':
        this.orderTable.setQueryFilters({ rawStatus: 'PLACED' });
        break;
      case 'returnRequests':
        this.orderTable.setQueryFilters({ rawStatus: 'RETURN_REQUESTED' });
        break;
      case 'deliveryDelayed':
        this.orderTable.setQueryFilters({ deliveryDelayedFilter: 'true' });
        break;
    }
  }

  setCustomDateFrom(value: string): void {
    this.customDateFrom.set(value);
    if (value && this.customDateTo()) {
      this.loadOrderNavigationCounts();
    }
  }

  setCustomDateTo(value: string): void {
    this.customDateTo.set(value);
    if (value && this.customDateFrom()) {
      this.loadOrderNavigationCounts();
    }
  }

  private getKpiDateParams(): { from?: string; to?: string } {
    const range = this.kpiDateRange();
    if (range === 'all') return {};
    if (range === 'custom') {
      const from = this.customDateFrom();
      const to = this.customDateTo();
      if (!from || !to) return {};
      return {
        from: new Date(from + 'T00:00:00').toISOString(),
        to: new Date(to + 'T23:59:59.999').toISOString(),
      };
    }
    const now = new Date();
    const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
    let from: Date;
    const to = endOfDay(now);
    switch (range) {
      case 'today': from = startOfDay(now); break;
      case 'week': { const d = startOfDay(now); d.setDate(d.getDate() - d.getDay()); from = d; break; }
      case 'month': from = new Date(now.getFullYear(), now.getMonth(), 1); break;
      case 'quarter': { const q = Math.floor(now.getMonth() / 3) * 3; from = new Date(now.getFullYear(), q, 1); break; }
      case 'year': from = new Date(now.getFullYear(), 0, 1); break;
      default: return {};
    }
    return { from: from.toISOString(), to: to.toISOString() };
  }

  getKpiCount(key: string): number {
    return this.kpiCounts()[key] ?? 0;
  }

  get kpiTotalOrders(): number { return this.getKpiCount('total'); }
  get kpiNewOrders(): number { return this.getKpiCount('PLACED') + this.getKpiCount('DRAFT'); }
  get kpiToShip(): number { return this.getKpiCount('CONFIRMED') + this.getKpiCount('PACKED') + this.getKpiCount('ASSIGNED'); }
  get kpiOutForDelivery(): number { return this.getKpiCount('SHIPPED') + this.getKpiCount('DISPATCHED'); }
  get kpiDelivered(): number { return this.getKpiCount('DELIVERED'); }
  get kpiReturns(): number { return this.getKpiCount('RETURN_REQUESTED') + this.getKpiCount('RETURN_IN_TRANSIT') + this.getKpiCount('RETURNED'); }
  get kpiCancelled(): number { return this.getKpiCount('CANCELLED'); }
  get kpiPaymentPending(): number { return this.kpiAttention().paymentPending; }

  get visibleOrderTableFilters(): GomTableFilterDefinition<OrderRow>[] {
    if (this.canManageDelivery()) {
      return this.orderTableFilters;
    }

    return this.orderTableFilters
      .filter((filter) => filter.key !== 'deliveryDelayedFilter')
      .map((filter) => filter.key === 'rawStatus'
        ? { ...filter, options: (filter.options || []).filter((option) => !['ASSIGNED', 'SHIPPED', 'DISPATCHED', 'ATTEMPTED_DELIVERY'].includes(option.value)) }
        : filter);
  }

  get visibleOrderTableNavigationRows(): GomTableFilterNavigationRow<OrderRow>[] {
    if (this.canManageDelivery()) {
      return this.orderTableNavigationRows;
    }

    return this.orderTableNavigationRows.map((row) => row.key === 'rawStatus'
      ? { ...row, options: (row.options || []).filter((option) => !['ASSIGNED', 'SHIPPED', 'DISPATCHED', 'ATTEMPTED_DELIVERY'].includes(option.value)) }
      : row);
  }

  onOrderTableQueryChange(query: GomTableQuery): void {
    this.fetchOrdersForQuery(query);
  }

  onSelectedOrderRowsChange(rows: OrderRow[]): void {
    this.selectedOrderRows.set(rows);
  }

  onOrderBulkAction(event: GomTableBulkActionEvent<OrderRow>): void {
    this.selectedOrderRows.set(event.selectedRows);
    if (event.actionKey !== 'change-status' || !this.canUpdateOrder()) {
      return;
    }

    this.bulkStatusForm.reset({ status: '', reason: '' });
    this.bulkStatusModalOpen.set(true);
  }

  closeBulkStatusModal(): void {
    if (this.bulkActionBusyKey()) {
      return;
    }
    this.bulkStatusModalOpen.set(false);
    this.bulkStatusForm.reset({ status: '', reason: '' });
  }

  confirmBulkStatusChange(): void {
    if (!this.canUpdateOrder() || this.bulkActionBusyKey()) {
      return;
    }

    const rows = this.selectedOrderRows();
    const status = String(this.bulkStatusForm.controls.status.value || '').trim();
    const reason = String(this.bulkStatusForm.controls.reason.value || '').trim();
    if (!rows.length) {
      this.toast.warning('Select at least one order.');
      this.closeBulkStatusModal();
      return;
    }
    if (!status) {
      this.toast.warning('Select a target status.');
      return;
    }

    this.bulkActionBusyKey.set('change-status');
    this.service.bulkUpdateStatus(rows.map((row) => row._id), status, reason).subscribe({
      next: (response) => {
        const result = response.data;
        const updated = Number(result?.summary?.updated || 0);
        const failed = Number(result?.summary?.failed || 0);
        this.bulkActionBusyKey.set(null);

        if (updated > 0) {
          const failureSummary = failed ? `; ${failed} failed` : '';
          this.toast.success(`${updated} order${updated === 1 ? '' : 's'} updated${failureSummary}.`);
          this.bulkStatusModalOpen.set(false);
          this.bulkStatusForm.reset({ status: '', reason: '' });
          this.loadInitialData();
          return;
        }

        const firstFailure = result?.failed?.[0]?.message;
        this.toast.error(firstFailure || 'No selected orders could be updated.');
      },
      error: (error) => {
        this.bulkActionBusyKey.set(null);
        this.toast.error(String(error?.error?.message || 'Failed to update selected orders.'));
      },
    });
  }

  private getTableFilterParam(query: GomTableQuery, key: string): string | undefined {
    const value = query.advancedFilters?.[key];
    if (typeof value === 'string') {
      return value.trim() || undefined;
    }
    if (Array.isArray(value)) {
      return value.filter(Boolean).join(',') || undefined;
    }
    return undefined;
  }

  private getTableDateBoundary(query: GomTableQuery, key: string, boundary: 'from' | 'to'): string | undefined {
    const value = query.advancedFilters?.[key];
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return undefined;
    }
    if (boundary === 'to' && value.to) {
      return `${value.to}T23:59:59.999`;
    }
    return value[boundary] || undefined;
  }

  private fetchOrdersForQuery(query: GomTableQuery, options?: { forceRefresh?: boolean }): void {
    const normalizedQuery = this.cloneTableQuery(query);
    const queryKey = this.buildOrdersQueryKey(normalizedQuery);
    const requestedChunks = this.getRequiredChunkIndexes(normalizedQuery.pageIndex, normalizedQuery.pageSize);
    const shouldResetCache = options?.forceRefresh || queryKey !== this.activeOrdersQueryKey;

    this.errorMessage.set(null);
    this.lastOrdersQuery = normalizedQuery;
    this.orderTablePageIndex.set(normalizedQuery.pageIndex);
    this.orderTablePageSize.set(normalizedQuery.pageSize);

    if (shouldResetCache) {
      this.ordersChunkCache = new Map<number, Order[]>();
      this.activeOrdersQueryKey = queryKey;
    }

    const missingChunks = requestedChunks.filter((chunkIndex) => !this.ordersChunkCache.has(chunkIndex));
    if (missingChunks.length === 0) {
      this.applyVisibleOrdersFromCache(normalizedQuery);
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    const requestId = ++this.latestOrdersRequestId;
    const requests = missingChunks.map((chunkIndex) => this.service.listOrders(this.buildOrdersRequestParams(normalizedQuery, chunkIndex)));

    forkJoin(requests).subscribe({
      next: (responses) => {
        if (requestId !== this.latestOrdersRequestId) {
          return;
        }

        responses.forEach((response, index) => {
          const chunkIndex = missingChunks[index];
          this.ordersChunkCache.set(chunkIndex, response.data ?? []);
          this.totalOrders.set(response.pagination.total);
          this.canLoadAllOrders.set(false);
        });

        this.allOrdersLoaded.set(false);
        this.applyVisibleOrdersFromCache(normalizedQuery);
        this.loading.set(false);
      },
      error: () => {
        if (requestId !== this.latestOrdersRequestId) {
          return;
        }
        this.errorMessage.set('Failed to load orders data.');
        this.loading.set(false);
      },
    });
  }

  private applyVisibleOrdersFromCache(query: GomTableQuery): void {
    const requestedChunks = this.getRequiredChunkIndexes(query.pageIndex, query.pageSize);
    const startIndex = query.pageIndex * query.pageSize;
    const firstChunkOffset = requestedChunks.length > 0 ? requestedChunks[0] * this.serverChunkSize : 0;
    const offsetWithinCache = Math.max(0, startIndex - firstChunkOffset);
    const mergedOrders = requestedChunks.flatMap((chunkIndex) => this.ordersChunkCache.get(chunkIndex) ?? []);

    this.orders.set(mergedOrders.slice(offsetWithinCache, offsetWithinCache + query.pageSize));
  }

  private getRequiredChunkIndexes(pageIndex: number, pageSize: number): number[] {
    const startIndex = Math.max(0, pageIndex) * Math.max(1, pageSize);
    const endIndexExclusive = startIndex + Math.max(1, pageSize);
    const startChunk = Math.floor(startIndex / this.serverChunkSize);
    const endChunk = Math.floor((Math.max(endIndexExclusive - 1, startIndex)) / this.serverChunkSize);

    return Array.from({ length: endChunk - startChunk + 1 }, (_, index) => startChunk + index);
  }

  private buildOrdersRequestParams(query: GomTableQuery, chunkIndex: number): {
    page: number;
    limit: number;
    paymentStatus?: string;
    status?: string;
    deliveryDelayed?: string;
    orderSource?: string;
    from?: string;
    to?: string;
    search?: string;
    sortBy?: string;
    order?: 'asc' | 'desc';
  } {
    const apiSortFields: Record<string, string> = {
      orderNo: 'orderNo',
      customerName: 'addressSnapshot.name',
      source: 'orderSource',
      total: 'pricingSnapshot.grandTotal',
      status: 'status',
      paymentStatus: 'paymentStatus',
      createdAt: 'createdAt',
    };
    const sortDirection = query.sort?.direction || undefined;
    const sortBy = sortDirection ? apiSortFields[query.sort.key] : undefined;

    return {
      page: chunkIndex + 1,
      limit: this.serverChunkSize,
      search: query.searchTerm?.trim() || undefined,
      sortBy,
      order: sortDirection as 'asc' | 'desc' | undefined,
      paymentStatus: this.getTableFilterParam(query, 'paymentStatus'),
      status: this.getTableFilterParam(query, 'rawStatus'),
      deliveryDelayed: this.getTableFilterParam(query, 'deliveryDelayedFilter') === 'true' ? 'true' : undefined,
      orderSource: this.getTableFilterParam(query, 'source'),
      from: this.getTableDateBoundary(query, 'rawCreatedAt', 'from'),
      to: this.getTableDateBoundary(query, 'rawCreatedAt', 'to'),
    };
  }

  private buildOrdersQueryKey(query: GomTableQuery): string {
    const params = this.buildOrdersRequestParams(query, 0);
    return JSON.stringify({
      paymentStatus: params.paymentStatus || '',
      status: params.status || '',
      deliveryDelayed: params.deliveryDelayed || '',
      orderSource: params.orderSource || '',
      from: params.from || '',
      to: params.to || '',
      search: params.search || '',
      sortBy: params.sortBy || '',
      order: params.order || '',
    });
  }

  private cloneTableQuery(query: GomTableQuery): GomTableQuery {
    return {
      ...query,
      sort: { ...query.sort },
      filters: { ...(query.filters || {}) },
      visibleColumnKeys: [...(query.visibleColumnKeys || [])],
      advancedFilters: this.cloneAdvancedFilters(query.advancedFilters),
      globalSearchScope: query.globalSearchScope,
    };
  }

  private cloneAdvancedFilters(filters?: Record<string, GomTableFilterValue>): Record<string, GomTableFilterValue> {
    const cloned: Record<string, GomTableFilterValue> = {};

    Object.entries(filters || {}).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        cloned[key] = [...value];
        return;
      }

      if (value && typeof value === 'object') {
        cloned[key] = { from: value.from, to: value.to };
        return;
      }

      cloned[key] = value;
    });

    return cloned;
  }

  loadAllOrders(): void {
    this.loading.set(true);
    this.service.listOrders({ page: 1, limit: this.totalOrders() }).subscribe({
      next: (res) => {
        this.orders.set(res.data ?? []);
        this.totalOrders.set(res.pagination.total);
        this.canLoadAllOrders.set(false);
        this.allOrdersLoaded.set(true);
        this.orderTablePageIndex.set(0);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  openCreate(): void {
    if (!this.canCreateOrder()) {
      return;
    }

    this.router.navigate(['/orders/create']);
  }

  onExportOrders(): void {
    this.toast.info('Export feature coming soon.');
  }

  onRowAction(event: { actionKey: string; row: GomTableRow }): void {
    if (!this.hasActionPermission(event.actionKey)) {
      this.toast.warning('You do not have permission to perform this action');
      return;
    }
    const orderId = typeof event.row['_id'] === 'string' ? event.row['_id'] : '';
    const row = this.orders().find((item) => item._id === orderId);
    if (!row) {
      return;
    }

    if (event.actionKey === 'view') {
      this.openViewOrderModal(row);
      return;
    }

    if (event.actionKey === 'status-history') {
      this.openStatusHistoryModal(row);
      return;
    }

    if (event.actionKey === 'share-bill-whatsapp') {
      this.withOrderDetails(row, (fullOrder) => this.shareBillViaWhatsApp(fullOrder));
      return;
    }

    if (event.actionKey === 'share-bill-mail') {
      this.withOrderDetails(row, (fullOrder) => this.shareBillViaMail(fullOrder));
      return;
    }

    if (event.actionKey === 'print-bill') {
      this.withOrderDetails(row, (fullOrder) => this.printBill(fullOrder));
      return;
    }

    if (event.actionKey === 'edit-order-details') {
      this.openEditOrderModal(row);
      return;
    }

    if (event.actionKey === 'edit-order-items') {
      this.openEditItemsModal(row);
      return;
    }

    if (event.actionKey === 'mark-payment-received') {
      this.service.markPaymentReceived(orderId, { paymentMode: 'CASH' }).subscribe({
        next: () => {
          this.toast.success('Payment marked as received.');
          this.loadInitialData();
        },
        error: (error) => {
          const message = String(error?.error?.message || 'Failed to update payment status.');
          this.toast.error(message);
        },
      });
      return;
    }

    if (event.actionKey === 'attempt-failed') {
      this.openTransitionModal(row, 'ATTEMPTED_DELIVERY', 'Delivery attempted but customer unavailable');
      return;
    }

    if (event.actionKey === 'cancel') {
      this.service.cancelOrder(orderId, 'Cancelled from admin').subscribe({
        next: () => {
          this.toast.success('Order cancelled.');
          this.loadInitialData();
        },
        error: (error) => {
          const message = String(error?.error?.message || 'Failed to cancel order.');
          this.toast.error(message);
        },
      });
      return;
    }

    if (event.actionKey === 'delete') {
      this.deleteTarget.set(row);
      this.deleteModalOpen.set(true);
      return;
    }

    if (event.actionKey === 'next') {
      const nextStatus = this.getNextStatus(row.status, row.deliveryType, row.orderType || '');
      
      if (!nextStatus) {
        this.toast.warning('No next transition for this order status.');
        return;
      }

      // Courier dispatch opens a special form modal
      if (nextStatus === 'DISPATCHED') {
        this.openDispatchModal(row);
        return;
      }

      this.openTransitionModal(row, nextStatus, `Moved from ${row.status} to ${nextStatus}`);
      return;
    }

    if (event.actionKey === 'request-return') {
      this.openTransitionModal(row, 'RETURN_REQUESTED', 'Customer requested return');
      return;
    }

    if (event.actionKey === 'courier-return-to-warehouse') {
      this.openTransitionModal(row, 'RETURN_REQUESTED', 'Undeliverable — courier returning to warehouse');
      return;
    }

    if (event.actionKey === 'mark-return-in-transit') {
      this.openTransitionModal(row, 'RETURN_IN_TRANSIT', 'Return pickup initiated by rider/courier');
      return;
    }

    if (event.actionKey === 'mark-return-received') {
      this.openTransitionModal(row, 'RETURNED', 'Returned item received at source/store');
      return;
    }

    if (event.actionKey === 'mark-money-refunded') {
      this.openTransitionModal(row, 'REFUNDED', 'Refund issued to customer');
      return;
    }

    if (event.actionKey === 'assign-rider') {
      this.openAssignRiderModal(row);
    }
  }

  openEditOrderModal(order: Order): void {
    this.editOrderBusy.set(false);
    this.editOrderModalOpen.set(true);
    this.editOrderTarget.set(order);

    this.service.getOrderById(order._id).subscribe({
      next: (response) => {
        const fullOrder = response.data || order;
        this.editOrderTarget.set(fullOrder);
        this.patchEditOrderForm(fullOrder);
        this.applyEditFormFieldPolicy(fullOrder);
      },
      error: (error) => {
        const message = String(error?.error?.message || 'Failed to load order details for editing.');
        this.toast.error(message);
        this.closeEditOrderModal();
      },
    });
  }

  closeEditOrderModal(): void {
    this.editOrderModalOpen.set(false);
    this.editOrderBusy.set(false);
    this.editOrderTarget.set(null);
    this.editOrderForm.reset();
    Object.values(this.editOrderForm.controls).forEach((control) => control.enable({ emitEvent: false }));
  }

  openEditItemsModal(order: Order): void {
    this.editItemsBusy.set(false);
    this.editItemsModalOpen.set(true);
    this.editItemsTarget.set(order);
    this.addItemForm.reset({ variantId: '', quantity: '1' });

    this.service.getOrderById(order._id).subscribe({
      next: (response) => {
        const fullOrder = response.data || order;
        this.editItemsTarget.set(fullOrder);
      },
      error: (error) => {
        const message = String(error?.error?.message || 'Failed to load order items for editing.');
        this.toast.error(message);
        this.closeEditItemsModal();
      },
    });
  }

  closeEditItemsModal(): void {
    this.editItemsModalOpen.set(false);
    this.editItemsBusy.set(false);
    this.editItemsTarget.set(null);
    this.addItemForm.reset({ variantId: '', quantity: '1' });
  }

  addOrderItemFromModal(): void {
    if (!this.canUpdateOrder()) {
      return;
    }

    const order = this.editItemsTarget();
    if (!order?._id) {
      return;
    }

    const variantId = String(this.addItemForm.controls.variantId.value || '').trim();
    const quantity = Number(this.addItemForm.controls.quantity.value || 0);
    if (!variantId) {
      this.toast.warning('Select a variant to add.');
      return;
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      this.toast.warning('Quantity must be greater than 0.');
      return;
    }

    this.editItemsBusy.set(true);
    this.service.addOrderItem(order._id, { variantId, quantity }).subscribe({
      next: () => {
        this.toast.success('Item added to order.');
        this.addItemForm.reset({ variantId: '', quantity: '1' });
        this.refreshEditItemsOrder(order._id);
      },
      error: (error) => {
        const message = String(error?.error?.message || 'Failed to add item.');
        this.toast.error(message);
        this.editItemsBusy.set(false);
      },
    });
  }

  saveOrderItemQuantity(item: OrderItem, quantityInput: unknown): void {
    if (!this.canUpdateOrder()) {
      return;
    }

    const order = this.editItemsTarget();
    if (!order?._id || !item?._id) {
      return;
    }

    const nextQty = Number(quantityInput || 0);
    if (!Number.isFinite(nextQty) || nextQty <= 0) {
      this.toast.warning('Quantity must be greater than 0.');
      return;
    }

    this.editItemsBusy.set(true);
    this.service.updateOrderItem(order._id, item._id, { quantity: nextQty }).subscribe({
      next: () => {
        this.toast.success('Item quantity updated.');
        this.refreshEditItemsOrder(order._id);
      },
      error: (error) => {
        const message = String(error?.error?.message || 'Failed to update item quantity.');
        this.toast.error(message);
        this.editItemsBusy.set(false);
      },
    });
  }

  cancelOrderItemFromModal(item: OrderItem): void {
    if (!this.canUpdateOrder()) {
      return;
    }

    const order = this.editItemsTarget();
    if (!order?._id || !item?._id) {
      return;
    }

    const activeItemsCount = this.getEditableOrderItems(order).length;
    if (activeItemsCount <= 1) {
      this.editItemsBusy.set(true);

      if (String(order.status || '').toUpperCase() === 'DRAFT') {
        this.service.deleteOrder(order._id).subscribe({
          next: () => {
            this.toast.success('Last item removed. Draft order deleted.');
            this.closeEditItemsModal();
            this.loadInitialData();
          },
          error: (error) => {
            const message = String(error?.error?.message || 'Failed to delete empty draft order.');
            this.toast.error(message);
            this.editItemsBusy.set(false);
          },
        });
        return;
      }

      this.service.cancelOrder(order._id, 'Order cancelled because last item was removed').subscribe({
        next: () => {
          this.toast.success('Last item removed. Order cancelled.');
          this.closeEditItemsModal();
          this.loadInitialData();
        },
        error: (error) => {
          const message = String(error?.error?.message || 'Failed to cancel empty order.');
          this.toast.error(message);
          this.editItemsBusy.set(false);
        },
      });
      return;
    }

    this.editItemsBusy.set(true);
    this.service.cancelOrderItem(order._id, item._id, { reason: 'Cancelled from order item editor' }).subscribe({
      next: () => {
        this.toast.success('Item removed from order.');
        this.refreshEditItemsOrder(order._id);
      },
      error: (error) => {
        const message = String(error?.error?.message || 'Failed to cancel item.');
        this.toast.error(message);
        this.editItemsBusy.set(false);
      },
    });
  }

  canModifyItem(item: OrderItem): boolean {
    return String(item?.status || '').toUpperCase() !== 'CANCELLED';
  }

  getEditableOrderItems(order: Order | null): OrderItem[] {
    return (order?.items || []).filter((item) => String(item?.status || '').toUpperCase() !== 'CANCELLED');
  }

  getVisibleOrderItems(order: Order | null): OrderItem[] {
    return (order?.items || []).filter((item) => String(item?.status || '').toUpperCase() !== 'CANCELLED');
  }

  editItemsPolicyHint(order: Order | null): string {
    if (!order) {
      return '';
    }
    return 'Item changes are allowed only for unpaid orders in DRAFT, PLACED, or CONFIRMED status. Removing the last item will close the order automatically.';
  }

  createFollowUpOrderFromEditItems(): void {
    this.closeEditItemsModal();
    this.router.navigate(['/orders/create']);
  }

  saveEditedOrderDetails(): void {
    if (!this.canUpdateOrder()) {
      return;
    }

    const target = this.editOrderTarget();
    if (!target?._id) {
      this.closeEditOrderModal();
      return;
    }

    const payload: UpdateOrderEditableFieldsPayload = {};
    const raw = this.editOrderForm.getRawValue();
    type EditableStringField = Exclude<keyof UpdateOrderEditableFieldsPayload, 'deliveryGeoLat' | 'deliveryGeoLng'>;
    type EditControlName =
      | 'customerName'
      | 'customerPhone'
      | 'deliveryAddressText'
      | 'deliveryPostalCode'
      | 'deliveryContactName'
      | 'deliveryContactPhone'
      | 'preferredDeliveryTime'
      | 'deliveryLocationText'
      | 'deliveryGeoLat'
      | 'deliveryGeoLng'
      | 'notes';

    const maybeSet = (key: EditableStringField, value: unknown, controlName: EditControlName): void => {
      if (this.editOrderForm.controls[controlName].disabled) {
        return;
      }
      if (value === undefined || value === null) {
        return;
      }
      if (typeof value === 'string') {
        const next = value.trim();
        payload[key] = next;
        return;
      }
    };

    maybeSet('customerName', raw.customerName, 'customerName');
    maybeSet('customerPhone', raw.customerPhone, 'customerPhone');
    maybeSet('deliveryAddressText', raw.deliveryAddressText, 'deliveryAddressText');
    maybeSet('deliveryPostalCode', raw.deliveryPostalCode, 'deliveryPostalCode');
    maybeSet('deliveryContactName', raw.deliveryContactName, 'deliveryContactName');
    maybeSet('deliveryContactPhone', raw.deliveryContactPhone, 'deliveryContactPhone');
    if (!this.editOrderForm.controls.preferredDeliveryTime.disabled) {
      const normalizedPreferredTime = this.normalizeDateTimeForApi(raw.preferredDeliveryTime);
      if (normalizedPreferredTime) {
        payload.preferredDeliveryTime = normalizedPreferredTime;
      }
    }
    maybeSet('deliveryLocationText', raw.deliveryLocationText, 'deliveryLocationText');

    if (!this.editOrderForm.controls.deliveryGeoLat.disabled && String(raw.deliveryGeoLat || '').trim()) {
      payload.deliveryGeoLat = Number(raw.deliveryGeoLat);
    }

    if (!this.editOrderForm.controls.deliveryGeoLng.disabled && String(raw.deliveryGeoLng || '').trim()) {
      payload.deliveryGeoLng = Number(raw.deliveryGeoLng);
    }

    maybeSet('notes', raw.notes, 'notes');

    this.editOrderBusy.set(true);
    this.service.updateEditableFields(target._id, payload).subscribe({
      next: () => {
        this.toast.success('Order details updated.');
        this.closeEditOrderModal();
        this.loadInitialData();
      },
      error: (error) => {
        const message = String(error?.error?.message || 'Failed to update order details.');
        this.toast.error(message);
        this.editOrderBusy.set(false);
      },
    });
  }

  get canSaveEditedOrderDetails(): boolean {
    if (!this.canUpdateOrder()) {
      return false;
    }

    return Object.values(this.editOrderForm.controls).some((control) => !control.disabled);
  }

  get editPolicyHint(): string {
    const order = this.editOrderTarget();
    if (!order) {
      return 'You can edit details while the order is still in early processing stages.';
    }

    const status = String(order.status || '').toUpperCase();
    if (['DELIVERED', 'CANCELLED', 'RETURN_REQUESTED', 'RETURN_IN_TRANSIT', 'RETURNED', 'REFUNDED'].includes(status)) {
      return 'This order is in a final/return stage. Editing is locked for audit safety.';
    }

    if (order.paymentStatus === 'SUCCESS' && status !== 'DRAFT') {
      return 'Payment is marked SUCCESS. Delivery address and location fields are locked.';
    }

    if (['PACKED', 'ASSIGNED', 'SHIPPED', 'DISPATCHED', 'ATTEMPTED_DELIVERY'].includes(status)) {
      return 'Order is already in fulfillment. Structural fields are locked; contact and notes can still be updated.';
    }

    return 'All editable fields are available for this order status.';
  }

  getEditFieldLockReason(controlName: string): string | null {
    const control = this.editOrderForm.controls[controlName as keyof typeof this.editOrderForm.controls];
    if (!control?.disabled) {
      return null;
    }

    const order = this.editOrderTarget();
    if (!order) {
      return 'This field is currently locked.';
    }

    const status = String(order.status || '').toUpperCase();
    if (['DELIVERED', 'CANCELLED', 'RETURN_REQUESTED', 'RETURN_IN_TRANSIT', 'RETURNED', 'REFUNDED'].includes(status)) {
      return 'Locked after final/return status.';
    }

    const structuralControls = ['customerName', 'customerPhone', 'deliveryAddressText', 'deliveryPostalCode', 'deliveryLocationText', 'deliveryGeoLat', 'deliveryGeoLng'];
    if (order.paymentStatus === 'SUCCESS' && status !== 'DRAFT' && ['deliveryAddressText', 'deliveryPostalCode', 'deliveryLocationText', 'deliveryGeoLat', 'deliveryGeoLng'].includes(controlName)) {
      return 'Locked after payment success.';
    }

    if (['PACKED', 'ASSIGNED', 'SHIPPED', 'DISPATCHED', 'ATTEMPTED_DELIVERY'].includes(status) && structuralControls.includes(controlName)) {
      return 'Locked after fulfillment started.';
    }

    return 'This field is currently locked by policy.';
  }

  openViewOrderModal(order: Order): void {
    this.viewOrderTarget.set(order);
    this.viewOrderModalOpen.set(true);
    this.viewOrderLoading.set(true);
    this.viewOrderRating.set(null);
    this.viewOrderReturnRequest.set(null);
    this.viewOrderReturnLoading.set(false);

    this.service.getOrderById(order._id).subscribe({
      next: (response) => {
        this.viewOrderTarget.set(response.data || order);
        this.viewOrderLoading.set(false);

        const loadedOrder = response.data || order;
        if (['RETURN_REQUESTED', 'RETURN_IN_TRANSIT', 'RETURNED', 'REFUNDED'].includes(String(loadedOrder.status || '').toUpperCase())) {
          this.loadViewOrderReturnRequest(order._id);
        }

        if (response.data?.status === 'DELIVERED') {
          this.loadViewOrderRating(order._id);
        }
      },
      error: (error) => {
        const message = String(error?.error?.message || 'Failed to load order details.');
        this.toast.error(message);
        this.viewOrderLoading.set(false);
      },
    });
  }

  private loadViewOrderRating(orderId: string): void {
    this.viewOrderRatingLoading.set(true);
    this.service.getOrderRating(orderId).subscribe({
      next: (response) => {
        this.viewOrderRating.set(response.data ?? null);
        this.viewOrderRatingLoading.set(false);
      },
      error: () => {
        this.viewOrderRatingLoading.set(false);
      },
    });
  }

  private loadViewOrderReturnRequest(orderId: string): void {
    this.viewOrderReturnLoading.set(true);
    this.service.listReturns(orderId).subscribe({
      next: (response) => {
        this.viewOrderReturnRequest.set((response.data || [])[0] || null);
        this.viewOrderReturnLoading.set(false);
      },
      error: () => {
        this.viewOrderReturnLoading.set(false);
      },
    });
  }

  get viewOrderReturnReason(): string {
    const request = this.viewOrderReturnRequest();
    if (!request?.items?.length) {
      return '-';
    }

    const reason = request.items.find((item) => Boolean(String(item.reason || '').trim()))?.reason;
    return String(reason || '-').trim() || '-';
  }

  closeViewOrderModal(): void {
    this.viewOrderModalOpen.set(false);
    this.viewOrderLoading.set(false);
    this.viewOrderTarget.set(null);
    this.viewOrderRating.set(null);
    this.viewOrderReturnRequest.set(null);
    this.viewOrderReturnLoading.set(false);
  }

  openStatusHistoryModal(order: Order): void {
    this.statusHistoryTarget.set(order);
    this.statusHistoryModalOpen.set(true);
    this.statusHistoryLoading.set(true);

    this.service.getOrderById(order._id).subscribe({
      next: (response) => {
        this.statusHistoryTarget.set(response.data || order);
        this.statusHistoryLoading.set(false);
      },
      error: (error) => {
        const message = String(error?.error?.message || 'Failed to load status history.');
        this.toast.error(message);
        this.statusHistoryLoading.set(false);
      },
    });
  }

  closeStatusHistoryModal(): void {
    this.statusHistoryModalOpen.set(false);
    this.statusHistoryLoading.set(false);
    this.statusHistoryTarget.set(null);
  }

  openAssignRiderModal(order: Order): void {
    this.assignRiderForm.reset({
      riderId: order.assignedRider?.riderId || '',
    });
    this.assignRiderOrderTarget.set(order);
    this.assignRiderModalOpen.set(true);
  }

  closeAssignRiderModal(): void {
    this.assignRiderModalOpen.set(false);
    this.assignRiderOrderTarget.set(null);
    this.assignRiderBusy.set(false);
  }

  confirmAssignRider(): void {
    if (!this.canUpdateOrder()) {
      return;
    }

    const order = this.assignRiderOrderTarget();
    if (!order) {
      this.closeAssignRiderModal();
      return;
    }

    const riderId = String(this.assignRiderForm.value.riderId || '').trim();
    if (!riderId) {
      this.toast.warning('Select a rider to continue.');
      return;
    }

    this.assignRiderBusy.set(true);
    this.service.assignRider(order._id, { riderId }).subscribe({
      next: () => {
        this.toast.success('Rider assigned.');
        this.closeAssignRiderModal();
        this.loadInitialData();
      },
      error: (error) => {
        const message = String(error?.error?.message || 'Failed to assign rider.');
        this.toast.error(message);
        this.assignRiderBusy.set(false);
      },
    });
  }

  private getAssignRiderLabel(assignedRiderName: string): string {
    return assignedRiderName ? `Reassign Rider (${assignedRiderName})` : 'Assign Rider';
  }

  private canAssignRider(status: string, deliveryType: string, orderType: string): boolean {
    if (String(deliveryType || '').toUpperCase() !== 'DELIVERY') {
      return false;
    }

    // Courier orders use dispatch flow instead of rider assignment
    if (String(orderType || '').toUpperCase() === 'CALL_COURIER') {
      return false;
    }

    return !['DELIVERED', 'CANCELLED', 'REFUNDED'].includes(String(status || '').toUpperCase());
  }

  private canEditOrderDetails(status: string): boolean {
    if (!this.canUpdateOrder()) return false;
    const normalized = String(status || '').toUpperCase();
    return !['DELIVERED', 'CANCELLED', 'RETURN_REQUESTED', 'RETURN_IN_TRANSIT', 'RETURNED', 'REFUNDED'].includes(normalized);
  }

  private canEditOrderItems(status: string, paymentStatus: string): boolean {
    if (!this.canUpdateOrder()) return false;
    const normalizedStatus = String(status || '').toUpperCase();
    const normalizedPayment = String(paymentStatus || '').toUpperCase();
    return ['DRAFT', 'PLACED', 'CONFIRMED'].includes(normalizedStatus) && normalizedPayment !== 'SUCCESS';
  }

  private patchEditOrderForm(order: Order): void {
    this.editOrderForm.patchValue({
      customerName: typeof order.customerId === 'object' ? order.customerId?.name || '' : order.addressSnapshot?.name || '',
      customerPhone: typeof order.customerId === 'object' ? order.customerId?.phone || '' : order.addressSnapshot?.phone || '',
      deliveryAddressText: order.addressSnapshot?.line1 || '',
      deliveryPostalCode: order.deliveryDetails?.postalCode || order.addressSnapshot?.postalCode || '',
      deliveryContactName: order.deliveryDetails?.deliveryContactName || '',
      deliveryContactPhone: order.deliveryDetails?.deliveryContactPhone || '',
      preferredDeliveryTime: this.formatDateTimeLocal(order.deliveryDetails?.preferredDeliveryTime),
      deliveryLocationText: order.deliveryDetails?.locationText || '',
      deliveryGeoLat: order.deliveryDetails?.geo?.lat != null ? String(order.deliveryDetails.geo.lat) : '',
      deliveryGeoLng: order.deliveryDetails?.geo?.lng != null ? String(order.deliveryDetails.geo.lng) : '',
      notes: order.notes || '',
    }, { emitEvent: false });
  }

  private formatDateTimeLocal(value: unknown): string {
    if (!value) {
      return '';
    }

    const date = new Date(String(value));
    if (!Number.isFinite(date.getTime())) {
      return '';
    }

    const pad = (num: number): string => String(num).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  private normalizeDateTimeForApi(value: unknown): string {
    const raw = String(value || '').trim();
    if (!raw) {
      return '';
    }

    const parsed = new Date(raw);
    return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : raw;
  }

  private refreshEditItemsOrder(orderId: string): void {
    this.service.getOrderById(orderId).subscribe({
      next: (response) => {
        const freshOrder = response.data;
        this.editItemsTarget.set(freshOrder);
        this.editItemsBusy.set(false);
        this.loadInitialData();
      },
      error: (error) => {
        const message = String(error?.error?.message || 'Item was updated, but failed to refresh order details.');
        this.toast.warning(message);
        this.editItemsBusy.set(false);
        this.loadInitialData();
      },
    });
  }

  private applyEditFormFieldPolicy(order: Order): void {
    Object.values(this.editOrderForm.controls).forEach((control) => control.enable({ emitEvent: false }));

    const status = String(order.status || '').toUpperCase();
    const structuralControls: Array<keyof typeof this.editOrderForm.controls> = [
      'customerName',
      'customerPhone',
      'deliveryAddressText',
      'deliveryPostalCode',
      'deliveryLocationText',
      'deliveryGeoLat',
      'deliveryGeoLng',
    ];
    const contactControls: Array<keyof typeof this.editOrderForm.controls> = [
      'deliveryContactName',
      'deliveryContactPhone',
      'preferredDeliveryTime',
      'notes',
    ];

    const disableList = (names: Array<keyof typeof this.editOrderForm.controls>): void => {
      names.forEach((name) => this.editOrderForm.controls[name].disable({ emitEvent: false }));
    };

    if (['PACKED', 'ASSIGNED', 'SHIPPED', 'DISPATCHED', 'ATTEMPTED_DELIVERY'].includes(status)) {
      disableList(structuralControls);
    }

    if (order.paymentStatus === 'SUCCESS' && status !== 'DRAFT') {
      disableList(['deliveryAddressText', 'deliveryPostalCode', 'deliveryLocationText', 'deliveryGeoLat', 'deliveryGeoLng']);
    }

    if (['DELIVERED', 'CANCELLED', 'RETURN_REQUESTED', 'RETURN_IN_TRANSIT', 'RETURNED', 'REFUNDED'].includes(status)) {
      disableList([...structuralControls, ...contactControls]);
    }
  }

  get transitionModalTitle(): string {
    const target = this.transitionTarget();
    if (!target) {
      return 'Confirm Status Update';
    }

    if (this.isPickupDeliveryType(target.order.deliveryType)) {
      const pickupTitleMap: Record<string, string> = {
        CONFIRMED: `Confirm Pickup Order ${target.order.orderNo}`,
        PACKED: `Mark Ready for Pickup ${target.order.orderNo}`,
        DELIVERED: `Mark Picked Up ${target.order.orderNo}`,
      };
      return pickupTitleMap[target.nextStatus] || `Move Order ${target.order.orderNo}`;
    }

    return `Move Order ${target.order.orderNo}`;
  }

  get transitionModalMessage(): string {
    const target = this.transitionTarget();
    if (!target) {
      return 'Confirm status update.';
    }

    const isDeliveredWithPendingPayment =
      target.nextStatus === 'DELIVERED' && String(target.order.paymentStatus || '').toUpperCase() === 'PENDING';

    if (this.isPickupDeliveryType(target.order.deliveryType)) {
      const pickupTargetLabel = this.getStatusDisplayLabel(target.nextStatus, target.order.deliveryType);
      return `Current status: ${this.getStatusDisplayLabel(target.order.status, target.order.deliveryType)}. New status: ${pickupTargetLabel}. Do you want to continue?`;
    }

    if (isDeliveredWithPendingPayment) {
      return `Current status: ${target.order.status}. New status: DELIVERED.\n\n⚠️ Payment has not been received yet. Marking this order as Delivered will automatically mark the payment as received. Are you sure you want to proceed?`;
    }

    return `Current status: ${target.order.status}. New status: ${target.nextStatus}. Do you want to continue?`;
  }

  get transitionModalConfirmVariant(): 'primary' | 'secondary' | 'danger' {
    const target = this.transitionTarget();
    if (
      target?.nextStatus === 'DELIVERED' &&
      String(target.order.paymentStatus || '').toUpperCase() === 'PENDING'
    ) {
      return 'danger';
    }
    return 'primary';
  }

  closeTransitionModal(): void {
    this.transitionModalOpen.set(false);
    this.transitionTarget.set(null);
    this.transitionBusy.set(false);
  }

  confirmTransition(): void {
    if (!this.canUpdateOrder()) {
      this.closeTransitionModal();
      return;
    }

    const target = this.transitionTarget();
    if (!target) {
      this.closeTransitionModal();
      return;
    }

    this.transitionBusy.set(true);
    this.service.updateStatus(target.order._id, target.nextStatus, target.reason).subscribe({
      next: () => {
        const nextLabel = this.getStatusDisplayLabel(target.nextStatus, target.order.deliveryType);
        this.toast.success(`Order moved to ${nextLabel}.`);
        this.closeTransitionModal();
        this.loadInitialData();
      },
      error: (error) => {
        const message = String(error?.error?.message || `Failed to move order to ${target.nextStatus}.`);
        this.toast.error(message);
        this.transitionBusy.set(false);
      },
    });
  }

  private openTransitionModal(order: Order, nextStatus: string, reason: string): void {
    this.transitionTarget.set({ order, nextStatus, reason });
    this.transitionModalOpen.set(true);
  }

  private getNextStatusLabel(status: string, deliveryType: string, orderType: string = ''): string {
    const nextStatus = this.getNextStatus(status, deliveryType, orderType);
    if (!nextStatus) {
      return 'No Next Status';
    }
    if (this.isPickupDeliveryType(deliveryType)) {
      const pickupFriendlyNames: Record<string, string> = {
        CONFIRMED: 'Confirm Order',
        PACKED: 'Mark Ready for Pickup',
        DELIVERED: 'Mark Picked Up',
        RETURNED: 'Confirm Returned at Store',
        REFUNDED: 'Mark Refunded',
      };
      return pickupFriendlyNames[nextStatus] ?? `Move to ${nextStatus}`;
    }
    const friendlyNames: Record<string, string> = {
      RETURN_IN_TRANSIT: 'Confirm Rider Collected Return',
      RETURNED: 'Confirm Received at Store',
      REFUNDED: 'Mark Refunded',
    };
    return friendlyNames[nextStatus] ?? `Move to ${nextStatus}`;
  }

  canCancelStatus(status: string): boolean {
    if (!this.canUpdateOrder()) return false;
    return ['PLACED', 'CONFIRMED', 'PACKED', 'ASSIGNED', 'ATTEMPTED_DELIVERY', 'RETURN_REQUESTED', 'RETURN_IN_TRANSIT'].includes(status);
  }

  canDeleteStatus(status: string): boolean {
    if (!this.canDeleteOrder()) return false;
    return ['DRAFT', 'CANCELLED'].includes(status);
  }

  get deleteModalMessage(): string {
    const orderNo = this.deleteTarget()?.orderNo || '-';
    return `Delete order ${orderNo}? This cannot be undone.`;
  }

  closeDeleteModal(): void {
    this.deleteModalOpen.set(false);
    this.deleteTarget.set(null);
  }



  confirmDeleteOrder(): void {
    if (!this.canDeleteOrder()) {
      this.closeDeleteModal();
      return;
    }

    const target = this.deleteTarget();
    if (!target?._id) {
      this.closeDeleteModal();
      return;
    }

    this.deleting.set(true);
    this.service.deleteOrder(target._id).subscribe({
      next: () => {
        this.toast.success('Order deleted.');
        this.deleting.set(false);
        this.closeDeleteModal();
        this.loadInitialData();
      },
      error: (error) => {
        const message = String(error?.error?.message || 'Failed to delete order.');
        this.toast.error(message);
        this.deleting.set(false);
      },
    });
  }

  private getNextStatus(status: string, deliveryType: string, orderType: string = ''): string | null {
    const isPickup = String(deliveryType || '').toUpperCase() === 'PICKUP';
    const isCourier = String(orderType || '').toUpperCase() === 'CALL_COURIER';

    if (isPickup) {
      const pickupTransitions: Record<string, string> = {
        PLACED: 'CONFIRMED',
        CONFIRMED: 'PACKED',
        PACKED: 'DELIVERED',
        RETURN_REQUESTED: 'RETURNED',
        RETURNED: 'REFUNDED',
      };
      return pickupTransitions[status] || null;
    }

    if (isCourier) {
      const courierTransitions: Record<string, string> = {
        PLACED: 'CONFIRMED',
        CONFIRMED: 'PACKED',
        PACKED: 'DISPATCHED',
        DISPATCHED: 'DELIVERED',
        RETURN_REQUESTED: 'RETURN_IN_TRANSIT',
        RETURN_IN_TRANSIT: 'RETURNED',
        RETURNED: 'REFUNDED',
      };
      return courierTransitions[status] || null;
    }

    const transitions: Record<string, string> = {
      PLACED: 'CONFIRMED',
      CONFIRMED: 'PACKED',
      PACKED: 'ASSIGNED',
      ASSIGNED: 'SHIPPED',
      SHIPPED: 'DELIVERED',
      ATTEMPTED_DELIVERY: 'DELIVERED',
      RETURN_REQUESTED: 'RETURN_IN_TRANSIT',
      RETURN_IN_TRANSIT: 'RETURNED',
      RETURNED: 'REFUNDED',
    };

    return transitions[status] || null;
  }

  private canShowDeliveryAttemptAction(row: OrderRow): boolean {
    return String(row.deliveryType || '').toUpperCase() === 'DELIVERY' && String(row.rawStatus || '').toUpperCase() === 'SHIPPED';
  }

  private canShowCourierReturnAction(row: OrderRow): boolean {
    if (!this.canUpdateOrder()) return false;
    return String(row.orderType || '').toUpperCase() === 'CALL_COURIER' && String(row.rawStatus || '').toUpperCase() === 'DISPATCHED';
  }

  getStatusChipTone(status: string): GomChipTone {
    const normalized = String(status || '').toUpperCase();

    const statusToneMap: Record<string, GomChipTone> = {
      DRAFT: 'neutral',
      PLACED: 'pending',
      CONFIRMED: 'progress',
      PACKED: 'info',
      ASSIGNED: 'progress',
      SHIPPED: 'shipped',
      DISPATCHED: 'shipped',
      ATTEMPTED_DELIVERY: 'warning',
      DELIVERED: 'delivered',
      CANCELLED: 'cancelled',
      RETURN_REQUESTED: 'warning',
      RETURN_IN_TRANSIT: 'warning',
      RETURNED: 'danger',
      REFUNDED: 'danger',
    };

    return statusToneMap[normalized] || 'neutral';
  }

  getPaymentChipTone(paymentStatus: string): GomChipTone {
    const normalized = String(paymentStatus || '').toUpperCase();

    const paymentToneMap: Record<string, GomChipTone> = {
      PENDING: 'pending',
      SUCCESS: 'success',
      FAILED: 'danger',
      REFUNDED: 'cancelled',
    };

    return paymentToneMap[normalized] || 'neutral';
  }

  openDispatchModal(order: Order): void {
    this.dispatchForm.reset({
      courierPartnerId: order.courierDetails?.courierPartnerId || '',
      trackingNumber: order.courierDetails?.trackingNumber || '',
      awbNumber: order.courierDetails?.awbNumber || '',
      consignmentNote: order.courierDetails?.consignmentNote || '',
      estimatedDeliveryDate: '',
    });
    this.dispatchOrderTarget.set(order);
    this.dispatchModalOpen.set(true);
  }

  closeDispatchModal(): void {
    this.dispatchModalOpen.set(false);
    this.dispatchOrderTarget.set(null);
    this.dispatchBusy.set(false);
  }

  confirmDispatch(): void {
    if (!this.canUpdateOrder()) {
      this.closeDispatchModal();
      return;
    }

    const order = this.dispatchOrderTarget();
    if (!order) {
      this.closeDispatchModal();
      return;
    }

    const v = this.dispatchForm.value;
    const courierPartnerId = String(v.courierPartnerId || '').trim();
    if (!courierPartnerId) {
      this.toast.warning('Select a courier partner to continue.');
      return;
    }

    this.dispatchBusy.set(true);
    this.service.assignCourier(order._id, {
      courierPartnerId,
      trackingNumber: String(v.trackingNumber || '').trim(),
      awbNumber: String(v.awbNumber || '').trim(),
      consignmentNote: String(v.consignmentNote || '').trim(),
      estimatedDeliveryDate: String(v.estimatedDeliveryDate || '').trim() || undefined,
      reason: 'Dispatched via courier',
    }).subscribe({
      next: () => {
        this.toast.success('Order dispatched via courier.');
        this.closeDispatchModal();
        this.loadInitialData();
      },
      error: (error) => {
        const message = String(error?.error?.message || 'Failed to dispatch order.');
        this.toast.error(message);
        this.dispatchBusy.set(false);
      },
    });
  }

  get viewOrderItemsCount(): number {
    return this.getVisibleOrderItems(this.viewOrderTarget()).length;
  }

  get viewOrderCustomerName(): string {
    const customer = this.viewOrderTarget()?.customerId;
    return typeof customer === 'object' ? customer?.name || '-' : '-';
  }

  get viewOrderCustomerPhone(): string {
    const customer = this.viewOrderTarget()?.customerId;
    return typeof customer === 'object' ? customer?.phone || '-' : '-';
  }

  private loadDeliveryMasters(): void {
    this.service.listRiders().subscribe({
      next: (response) => {
        this.riders.set(response.data || []);
      },
      error: () => {
        this.riders.set([]);
      },
    });

    this.service.listCourierPartners().subscribe({
      next: (response) => {
        this.courierPartners.set(response.data || []);
      },
      error: () => {
        this.courierPartners.set([]);
      },
    });

    this.service.listVariants().subscribe({
      next: (response) => {
        this.variants.set(response.data || []);
      },
      error: () => {
        this.variants.set([]);
      },
    });
  }

  private hasActionPermission(actionKey: string): boolean {
    const readOnlyActions = ['view', 'status-history', 'share-bill-whatsapp', 'share-bill-mail', 'print-bill'];
    if (readOnlyActions.includes(actionKey)) {
      return true;
    }

    if (actionKey === 'delete') {
      return this.canDeleteOrder();
    }

    const updateActions = [
      'next',
      'assign-rider',
      'edit-order-details',
      'edit-order-items',
      'mark-payment-received',
      'attempt-failed',
      'cancel',
      'request-return',
      'courier-return-to-warehouse',
      'mark-return-in-transit',
      'mark-return-received',
      'mark-money-refunded',
    ];

    if (updateActions.includes(actionKey)) {
      return this.canUpdateOrder();
    }

    return this.canUpdateOrder();
  }

  private withOrderDetails(order: Order, callback: (fullOrder: Order) => void): void {
    this.service.getOrderById(order._id).subscribe({
      next: (response) => {
        callback(response.data || order);
      },
      error: (error) => {
        const message = String(error?.error?.message || 'Failed to load bill details.');
        this.toast.error(message);
      },
    });
  }

  private shareBillViaWhatsApp(order: Order): void {
    const currency = 'Rs';
    const customerName = typeof order.customerId === 'object' ? order.customerId?.name || '-' : '-';
    const customerPhone = typeof order.customerId === 'object' ? order.customerId?.phone || '-' : '-';
    const lines = (order.items || []).map((item, index) => {
      const selling = Number(item.priceSnapshot?.sellingPrice || 0);
      const anchor = Number(item.priceSnapshot?.anchorPrice || selling);
      const qty = Number(item.quantity || 0);
      const discountValue = anchor > selling ? (anchor - selling) * qty : Number(item.priceSnapshot?.discount || 0);
      const taxValue = Number(item.priceSnapshot?.tax || 0);
      const detailRows = [
        `${index + 1}. ${item.variantNameSnapshot}`,
        `   MRP: ${currency} ${anchor.toLocaleString('en-IN')} | Selling: ${currency} ${selling.toLocaleString('en-IN')} | Qty: ${qty}`,
      ];
      if (discountValue > 0) {
        detailRows.push(`   Discount: -${currency} ${Number(discountValue).toLocaleString('en-IN')}`);
      }
      if (taxValue > 0) {
        detailRows.push(`   Tax: ${currency} ${Number(taxValue).toLocaleString('en-IN')}`);
      }
      detailRows.push(`   Line Total: ${currency} ${Number(item.lineTotal || 0).toLocaleString('en-IN')}`);
      return detailRows.join('\n');
    });

    const subTotal = Number(order.items?.reduce((sum, item) => sum + Number(item.priceSnapshot?.sellingPrice || 0) * Number(item.quantity || 0), 0) || 0);
    const taxTotal = Number(order.items?.reduce((sum, item) => sum + Number(item.priceSnapshot?.tax || 0), 0) || 0);
    const deliveryCharge = this.getOrderDeliveryCharge(order);
    const grandTotal = Number(order.pricingSnapshot?.grandTotal || 0);
    const totalSavings = Number(order.items?.reduce((sum, item) => {
      const selling = Number(item.priceSnapshot?.sellingPrice || 0);
      const anchor = Number(item.priceSnapshot?.anchorPrice || selling);
      const qty = Number(item.quantity || 0);
      const computedDiscount = anchor > selling ? (anchor - selling) * qty : 0;
      return sum + (computedDiscount > 0 ? computedDiscount : Number(item.priceSnapshot?.discount || 0));
    }, 0) || 0);

    const parts: string[] = [];
    parts.push('*ORDER BILL*');
    parts.push(`Order: ${order.orderNo}`);
    parts.push(`Customer: ${customerName} (${customerPhone})`);
    parts.push('------------------------------');
    parts.push(lines.length ? lines.join('\n------------------------------\n') : 'No items found');
    parts.push('------------------------------');
    parts.push(`Sub Total: ${currency} ${subTotal.toLocaleString('en-IN')}`);
    if (taxTotal > 0) {
      parts.push(`Tax Total: ${currency} ${taxTotal.toLocaleString('en-IN')}`);
    }
    if (deliveryCharge > 0) {
      parts.push(`Delivery Charge: ${currency} ${deliveryCharge.toLocaleString('en-IN')}`);
    }
    if (totalSavings > 0) {
      parts.push(`Total Savings: -${currency} ${totalSavings.toLocaleString('en-IN')}`);
    }
    parts.push(`*Grand Total: ${currency} ${grandTotal.toLocaleString('en-IN')}*`);

    const text = encodeURIComponent(parts.join('\n'));
    window.location.href = `https://wa.me/?text=${text}`;
  }

  private shareBillViaMail(order: Order): void {
    const currency = 'Rs';
    const customerName = typeof order.customerId === 'object' ? order.customerId?.name || '-' : '-';
    const customerPhone = typeof order.customerId === 'object' ? order.customerId?.phone || '-' : '-';

    const itemLines = (order.items || []).map((item, index) => {
      const selling = Number(item.priceSnapshot?.sellingPrice || 0);
      const anchor = Number(item.priceSnapshot?.anchorPrice || selling);
      const qty = Number(item.quantity || 0);
      const discountValue = anchor > selling ? (anchor - selling) * qty : Number(item.priceSnapshot?.discount || 0);
      const taxValue = Number(item.priceSnapshot?.tax || 0);
      const rows = [
        `${index + 1}. ${item.variantNameSnapshot}`,
        `   MRP: ${currency} ${anchor.toLocaleString('en-IN')} | Selling: ${currency} ${selling.toLocaleString('en-IN')} | Qty: ${qty}`,
      ];
      if (discountValue > 0) rows.push(`   Discount: -${currency} ${Number(discountValue).toLocaleString('en-IN')}`);
      if (taxValue > 0) rows.push(`   Tax: ${currency} ${taxValue.toLocaleString('en-IN')}`);
      rows.push(`   Line Total: ${currency} ${Number(item.lineTotal || 0).toLocaleString('en-IN')}`);
      return rows.join('\n');
    });

    const subTotal = Number(order.items?.reduce((sum, item) => sum + Number(item.priceSnapshot?.sellingPrice || 0) * Number(item.quantity || 0), 0) || 0);
    const taxTotal = Number(order.items?.reduce((sum, item) => sum + Number(item.priceSnapshot?.tax || 0), 0) || 0);
    const deliveryCharge = this.getOrderDeliveryCharge(order);
    const grandTotal = Number(order.pricingSnapshot?.grandTotal || 0);
    const totalSavings = Number(order.items?.reduce((sum, item) => {
      const selling = Number(item.priceSnapshot?.sellingPrice || 0);
      const anchor = Number(item.priceSnapshot?.anchorPrice || selling);
      const qty = Number(item.quantity || 0);
      const computedDiscount = anchor > selling ? (anchor - selling) * qty : 0;
      return sum + (computedDiscount > 0 ? computedDiscount : Number(item.priceSnapshot?.discount || 0));
    }, 0) || 0);

    const body: string[] = [];
    body.push('Order Bill');
    body.push(`Order: ${order.orderNo}`);
    body.push(`Customer: ${customerName} (${customerPhone})`);
    body.push('');
    body.push(itemLines.length ? itemLines.join('\n------------------------------\n') : 'No items found');
    body.push('');
    body.push(`Sub Total: ${currency} ${subTotal.toLocaleString('en-IN')}`);
    if (taxTotal > 0) body.push(`Tax Total: ${currency} ${taxTotal.toLocaleString('en-IN')}`);
    if (deliveryCharge > 0) body.push(`Delivery Charge: ${currency} ${deliveryCharge.toLocaleString('en-IN')}`);
    if (totalSavings > 0) body.push(`Total Savings: -${currency} ${totalSavings.toLocaleString('en-IN')}`);
    body.push(`Grand Total: ${currency} ${grandTotal.toLocaleString('en-IN')}`);

    const subject = encodeURIComponent(`Order Bill - ${order.orderNo}`);
    const encodedBody = encodeURIComponent(body.join('\n'));
    window.location.href = `mailto:?subject=${subject}&body=${encodedBody}`;
  }

  private printBill(order: Order): void {
    const currency = 'Rs';
    const customerName = typeof order.customerId === 'object' ? order.customerId?.name || '-' : '-';
    const customerPhone = typeof order.customerId === 'object' ? order.customerId?.phone || '-' : '-';

    const rows = (order.items || [])
      .map((item) => {
        const selling = Number(item.priceSnapshot?.sellingPrice || 0);
        const anchor = Number(item.priceSnapshot?.anchorPrice || selling);
        const qty = Number(item.quantity || 0);
        const discount = anchor > selling ? (anchor - selling) * qty : Number(item.priceSnapshot?.discount || 0);
        const tax = Number(item.priceSnapshot?.tax || 0);
        const lineTotal = Number(item.lineTotal || 0);
        return `<tr>
          <td>${item.variantNameSnapshot}</td>
          <td>${currency} ${anchor.toLocaleString('en-IN')}</td>
          <td>${currency} ${selling.toLocaleString('en-IN')}</td>
          <td>${qty}</td>
          <td>${discount > 0 ? '-' + currency + ' ' + Number(discount).toLocaleString('en-IN') : '&mdash;'}</td>
          <td>${tax > 0 ? currency + ' ' + tax.toLocaleString('en-IN') : '&mdash;'}</td>
          <td><strong>${currency} ${lineTotal.toLocaleString('en-IN')}</strong></td>
        </tr>`;
      })
      .join('');

    const subTotal = Number(order.items?.reduce((sum, item) => sum + Number(item.priceSnapshot?.sellingPrice || 0) * Number(item.quantity || 0), 0) || 0);
    const taxTotal = Number(order.items?.reduce((sum, item) => sum + Number(item.priceSnapshot?.tax || 0), 0) || 0);
    const deliveryCharge = this.getOrderDeliveryCharge(order);
    const grandTotal = Number(order.pricingSnapshot?.grandTotal || 0);
    const totalSavings = Number(order.items?.reduce((sum, item) => {
      const selling = Number(item.priceSnapshot?.sellingPrice || 0);
      const anchor = Number(item.priceSnapshot?.anchorPrice || selling);
      const qty = Number(item.quantity || 0);
      const computedDiscount = anchor > selling ? (anchor - selling) * qty : 0;
      return sum + (computedDiscount > 0 ? computedDiscount : Number(item.priceSnapshot?.discount || 0));
    }, 0) || 0);

    const summaryRows = [
      `<tr><td>Sub Total</td><td><strong>${currency} ${subTotal.toLocaleString('en-IN')}</strong></td></tr>`,
      taxTotal > 0 ? `<tr><td>Tax Total</td><td><strong>${currency} ${taxTotal.toLocaleString('en-IN')}</strong></td></tr>` : '',
      deliveryCharge > 0 ? `<tr><td>Delivery Charge</td><td><strong>${currency} ${deliveryCharge.toLocaleString('en-IN')}</strong></td></tr>` : '',
      totalSavings > 0 ? `<tr class="savings"><td>Total Savings</td><td><strong>-${currency} ${totalSavings.toLocaleString('en-IN')}</strong></td></tr>` : '',
      `<tr class="grand"><td><strong>Grand Total</strong></td><td><strong>${currency} ${grandTotal.toLocaleString('en-IN')}</strong></td></tr>`,
    ].join('');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Order Bill</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; padding: 2rem; color: #111; font-size: 14px; }
    h2 { margin-bottom: 0.35rem; font-size: 1.3rem; }
    .meta { margin-bottom: 1rem; color: #4b5563; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 1.5rem; }
    th { text-align: left; background: #f3f4f6; padding: 0.5rem 0.75rem; font-size: 0.8rem; }
    td { padding: 0.45rem 0.75rem; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
    .summary { max-width: 22rem; margin-left: auto; border: 1px solid #e5e7eb; border-radius: 0.5rem; overflow: hidden; }
    .summary td { border-bottom: 1px solid #f3f4f6; padding: 0.4rem 0.85rem; }
    .savings { background: #f0fdf4; color: #16a34a; }
    .savings strong { color: #16a34a; }
    .grand { background: #eff6ff; }
    .grand strong { color: #1d4ed8; }
  </style>
</head>
<body>
  <h2>Order Bill</h2>
  <p class="meta">Order: ${order.orderNo} | Customer: ${customerName} (${customerPhone})</p>
  <table>
    <thead>
      <tr><th>Item</th><th>MRP</th><th>Selling</th><th>Qty</th><th>Discount</th><th>Tax</th><th>Total</th></tr>
    </thead>
    <tbody>${rows || '<tr><td colspan="7">No items found</td></tr>'}</tbody>
  </table>
  <table class="summary"><tbody>${summaryRows}</tbody></table>
</body>
</html>`;

    const win = window.open('', '_blank', 'width=860,height=640');
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      win.print();
    }
  }

  private getOrderDeliveryCharge(order: Order): number {
    const payload = order as Order & {
      deliveryCharge?: number;
      pricingSnapshot?: {
        deliveryCharge?: number;
      };
    };
    return Number(payload.deliveryCharge ?? payload.pricingSnapshot?.deliveryCharge ?? 0);
  }
}