import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { GomButtonComponent, GomInputComponent, GomSelectComponent, GomSelectOption } from '@gomlibs/ui';
import { GomConfirmationModalComponent, GomModalComponent } from '@gomlibs/ui';
import { GomChipTone, GomChipComponent } from '@gomlibs/ui';
import { GomTableColumn, GomTableComponent, GomTableRow } from '@gomlibs/ui';
import { GomAlertToastService } from '@gomlibs/ui';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { CourierPartner, Order, OrderItem, OrdersService, Rider, UpdateOrderEditableFieldsPayload, Variant } from './orders.service';
import { environment } from '../../../../environments/environment';

interface OrderRow extends GomTableRow {
  _id: string;
  orderNo: string;
  customer: string;
  customerName: string;
  source: string;
  deliveryType: string;
  orderType: string;
  status: string;
  paymentStatus: string;
  total: string;
  createdAt: string;
  assignedRiderName: string;
  actions: string;
}

@Component({
  selector: 'gom-orders',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
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

  readonly loading = signal(false);
  readonly canWrite = computed(() => this.authSession.canWrite('orders'));
  readonly deleting = signal(false);
  readonly purgeAllBusy = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly deleteModalOpen = signal(false);
  readonly purgeAllModalOpen = signal(false);
  readonly deleteTarget = signal<Order | null>(null);
  readonly transitionModalOpen = signal(false);
  readonly transitionBusy = signal(false);
  readonly transitionTarget = signal<{ order: Order; nextStatus: string; reason: string } | null>(null);

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
  readonly riders = signal<Rider[]>([]);
  readonly courierPartners = signal<CourierPartner[]>([]);
  readonly variants = signal<Variant[]>([]);
  readonly isDevMode = !environment.production;

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
    { key: 'total', header: 'Total', sortable: true, width: '8rem' },
    { key: 'createdAt', header: 'Created', sortable: true, width: '10rem' },
    {
      key: 'actions',
      header: 'Actions',
      width: '12rem',
      actionButtons: [
        {
          label: (row) => this.getNextStatusLabel(String(row['status'] || ''), String(row['deliveryType'] || ''), String(row['orderType'] || '')),
          actionKey: 'next',
          variant: 'secondary',
          disabled: (row) => !this.getNextStatus(
            String(row['status'] || ''),
            String(row['deliveryType'] || ''),
            String(row['orderType'] || '')
          ),
        },
        {
          label: (row) => this.getAssignRiderLabel(String(row['assignedRiderName'] || '')),
          icon: (row) => String(row['assignedRiderName'] || '') ? 'ri-user-follow-line' : 'ri-user-add-line',
          actionKey: 'assign-rider',
          variant: 'secondary',
          disabled: (row) => !this.canAssignRider(
            String(row['status'] || ''),
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
              disabled: (row) => !this.canEditOrderDetails(String(row['status'] || '')),
            },
            {
              label: 'Add / Change Items',
              actionKey: 'edit-order-items',
              variant: 'secondary',
              disabled: (row) => !this.canEditOrderItems(String(row['status'] || ''), String(row['paymentStatus'] || '')),
            },
            {
              label: 'Mark Payment Received',
              actionKey: 'mark-payment-received',
              variant: 'secondary',
              disabled: (row) => String(row['paymentStatus'] || '').toUpperCase() !== 'PENDING',
            },
            {
              label: 'Mark Delivery Attempt Failed',
              actionKey: 'attempt-failed',
              variant: 'secondary',
              disabled: (row) => !(
                String(row['deliveryType'] || '').toUpperCase() === 'DELIVERY'
                && String(row['status'] || '') === 'SHIPPED'
              ),
            },
            {
              label: 'Request Return / Refund',
              icon: 'ri-arrow-go-back-line',
              actionKey: 'request-return',
              variant: 'secondary',
              disabled: (row) => String(row['status'] || '') !== 'DELIVERED',
            },
            {
              label: 'Mark Return In Transit',
              icon: 'ri-truck-line',
              actionKey: 'mark-return-in-transit',
              variant: 'secondary',
              disabled: (row) => !(
                String(row['status'] || '') === 'RETURN_REQUESTED'
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
              disabled: (row) => !(
                String(row['status'] || '') === 'RETURN_IN_TRANSIT'
                || (
                  String(row['status'] || '') === 'RETURN_REQUESTED'
                  && String(row['deliveryType'] || '').toUpperCase() === 'PICKUP'
                )
              ),
            },
            {
              label: 'Mark Money Refunded',
              icon: 'ri-refund-2-line',
              actionKey: 'mark-money-refunded',
              variant: 'secondary',
              disabled: (row) => String(row['status'] || '') !== 'RETURNED',
            },
            {
              label: 'Return to Warehouse (Undeliverable)',
              icon: 'ri-store-3-line',
              actionKey: 'courier-return-to-warehouse',
              variant: 'secondary',
              disabled: (row) => !(
                String(row['orderType'] || '').toUpperCase() === 'CALL_COURIER'
                && String(row['status'] || '') === 'DISPATCHED'
              ),
            },
            {
              label: 'Cancel Order',
              actionKey: 'cancel',
              variant: 'danger',
              disabled: (row) => !this.canCancelStatus(String(row['status'] || '')),
            },
            {
              label: 'Delete Draft',
              actionKey: 'delete',
              variant: 'danger',
              disabled: (row) => !this.canDeleteStatus(String(row['status'] || '')),
            },
          ],
        },
      ],
    },
  ];

  readonly rows = computed<OrderRow[]>(() =>
    this.orders().map((item) => ({
      customerName: typeof item.customerId === 'object' ? item.customerId?.name || '-' : '-',
      _id: item._id,
      orderNo: item.orderNo,
      customer: typeof item.customerId === 'object' ? item.customerId?.phone || '-' : '-',
      source: item.orderSource,
      deliveryType: item.deliveryType,
      orderType: item.orderType || 'WALK_IN_INSTANT',
      status: item.status,
      paymentStatus: item.paymentStatus,
      total: `Rs ${Number(item.pricingSnapshot?.grandTotal || 0).toLocaleString()}`,
      createdAt: new Date(item.createdAt).toLocaleDateString(),
      assignedRiderName: item.assignedRider?.name || '',
      actions: 'Actions',
    }))
  );

  ngOnInit(): void {
    this.loadInitialData();
    this.loadDeliveryMasters();
  }

  loadInitialData(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.service.listOrders().subscribe({
      next: (orders) => {
        this.orders.set(orders.data || []);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Failed to load orders data.');
        this.loading.set(false);
      },
    });
  }

  openCreate(): void {
    this.router.navigate(['/orders/create']);
  }

  onRowAction(event: { actionKey: string; row: GomTableRow }): void {
    const readOnlyActions = ['view', 'status-history', 'share-bill-whatsapp', 'share-bill-mail', 'print-bill'];
    if (!this.canWrite() && !readOnlyActions.includes(event.actionKey)) {
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

    this.service.getOrderById(order._id).subscribe({
      next: (response) => {
        this.viewOrderTarget.set(response.data || order);
        this.viewOrderLoading.set(false);
      },
      error: (error) => {
        const message = String(error?.error?.message || 'Failed to load order details.');
        this.toast.error(message);
        this.viewOrderLoading.set(false);
      },
    });
  }

  closeViewOrderModal(): void {
    this.viewOrderModalOpen.set(false);
    this.viewOrderLoading.set(false);
    this.viewOrderTarget.set(null);
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
    const normalized = String(status || '').toUpperCase();
    return !['DELIVERED', 'CANCELLED', 'RETURN_REQUESTED', 'RETURN_IN_TRANSIT', 'RETURNED', 'REFUNDED'].includes(normalized);
  }

  private canEditOrderItems(status: string, paymentStatus: string): boolean {
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

    return `Move Order ${target.order.orderNo}`;
  }

  get transitionModalMessage(): string {
    const target = this.transitionTarget();
    if (!target) {
      return 'Confirm status update.';
    }

    const isDeliveredWithPendingPayment =
      target.nextStatus === 'DELIVERED' && String(target.order.paymentStatus || '').toUpperCase() === 'PENDING';

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
    const target = this.transitionTarget();
    if (!target) {
      this.closeTransitionModal();
      return;
    }

    this.transitionBusy.set(true);
    this.service.updateStatus(target.order._id, target.nextStatus, target.reason).subscribe({
      next: () => {
        this.toast.success(`Order moved to ${target.nextStatus}.`);
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
    const friendlyNames: Record<string, string> = {
      RETURN_IN_TRANSIT: 'Confirm Rider Collected Return',
      RETURNED: 'Confirm Received at Store',
      REFUNDED: 'Mark Refunded',
    };
    return friendlyNames[nextStatus] ?? `Move to ${nextStatus}`;
  }

  canCancelStatus(status: string): boolean {
    return ['PLACED', 'CONFIRMED', 'PACKED', 'ASSIGNED', 'ATTEMPTED_DELIVERY', 'RETURN_REQUESTED', 'RETURN_IN_TRANSIT'].includes(status);
  }

  canDeleteStatus(status: string): boolean {
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

  openPurgeAllModal(): void {
    this.purgeAllModalOpen.set(true);
  }

  closePurgeAllModal(): void {
    this.purgeAllModalOpen.set(false);
  }

  get purgeAllModalMessage(): string {
    return `Delete ALL orders for this tenant? This removes orders and linked items/payments/shipments/returns. Current orders: ${this.orders().length}.`;
  }

  confirmPurgeAllOrders(): void {
    this.purgeAllBusy.set(true);
    this.service.purgeAllOrdersDev().subscribe({
      next: (response) => {
        const deletedOrders = Number(response?.data?.deleted?.orders || 0);
        this.toast.success(`Deleted ${deletedOrders} orders (development purge).`);
        this.purgeAllBusy.set(false);
        this.closePurgeAllModal();
        this.loadInitialData();
      },
      error: (error) => {
        const message = String(error?.error?.message || 'Failed to purge all orders.');
        this.toast.error(message);
        this.purgeAllBusy.set(false);
      },
    });
  }

  confirmDeleteOrder(): void {
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