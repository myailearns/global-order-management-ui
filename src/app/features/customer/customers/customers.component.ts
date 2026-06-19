import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';

import {
  FormControlsModule,
  GomAlertToastService,
  GomButtonComponent,
  GomInputComponent,
  GomModalComponent,
  GomTableColumn,
  GomTableComponent,
  GomTableQuery,
  GomTableRow,
} from '@gomlibs/ui';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import {
  CustomerEngagementService,
  CustomerInsight,
  CustomerOrderHistoryItem,
  CustomerDetail,
  CustomerSummary,
} from '../customer-engagement.service';

interface CustomerRow extends GomTableRow {
  customerId: string;
  name: string;
  phone: string;
  pincode: string;
  totalOrders: string;
  totalSpend: string;
  averageOrderValue: string;
  lastOrderAt: string;
  actions: string;
}

interface CustomerOrderHistoryRow extends GomTableRow {
  _id: string;
  orderNo: string;
  status: string;
  orderType: string;
  orderSource: string;
  grandTotal: string;
  createdAt: string;
}

@Component({
  selector: 'gom-customers',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormControlsModule,
    GomButtonComponent,
    GomInputComponent,
    GomTableComponent,
    GomModalComponent,
  ],
  templateUrl: './customers.component.html',
  styleUrl: './customers.component.scss',
})
export class CustomersComponent implements OnInit {
  private readonly service = inject(CustomerEngagementService);
  private readonly toast = inject(GomAlertToastService);

  readonly loading = signal(false);
  private readonly authSession = inject(AuthSessionService);
  readonly canWrite = computed(() => this.authSession.canWrite('customers'));

  readonly detailLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly searchTerm = signal('');
  readonly customers = signal<CustomerInsight[]>([]);
  readonly totalCustomers = signal(0);
  readonly customerTablePageIndex = signal(0);
  readonly customerTablePageSize = signal(50);
  readonly canLoadAllCustomers = signal(false);
  readonly allCustomersLoaded = signal(false);
  readonly serverSidePaginationCustomers = computed(() => this.totalCustomers() > 500);
  readonly customerTableDataMode = computed<'client' | 'server'>(() => (this.serverSidePaginationCustomers() && !this.allCustomersLoaded() ? 'server' : 'client'));

  readonly detailOpen = signal(false);
  readonly selectedCustomer = signal<CustomerSummary | null>(null);
  readonly selectedCustomerDetail = signal<CustomerDetail | null>(null);
  readonly selectedCustomerOrders = signal<CustomerOrderHistoryItem[]>([]);
  readonly customerOrderHistoryTotal = signal(0);
  readonly customerOrderHistoryPageIndex = signal(0);
  readonly customerOrderHistoryPageSize = signal(25);
  readonly customerOrderHistoryColumns: GomTableColumn<CustomerOrderHistoryRow>[] = [
    { key: 'orderNo', header: 'Order No', sortable: true },
    { key: 'status', header: 'Status', sortable: true },
    { key: 'orderType', header: 'Type', sortable: true },
    { key: 'orderSource', header: 'Source', sortable: true },
    { key: 'grandTotal', header: 'Total', sortable: true },
    { key: 'createdAt', header: 'Date', sortable: true },
  ];
  readonly customerOrderHistoryRows = computed<CustomerOrderHistoryRow[]>(() =>
    this.selectedCustomerOrders().map((order) => ({
      _id: order._id,
      orderNo: order.orderNo,
      status: order.status,
      orderType: order.orderType,
      orderSource: order.orderSource,
      grandTotal: `Rs ${Number(order.pricingSnapshot.grandTotal || 0).toLocaleString('en-IN')}`,
      createdAt: order.createdAt ? new Date(order.createdAt).toLocaleString() : '-',
    }))
  );

  readonly columns: GomTableColumn<CustomerRow>[] = [
    { key: 'name', header: 'Customer', sortable: true, filterable: true, width: '14rem' },
    { key: 'phone', header: 'Phone', sortable: true, filterable: true, width: '10rem' },
    { key: 'pincode', header: 'Pincode', sortable: true, width: '8rem' },
    { key: 'totalOrders', header: 'Orders', sortable: true, width: '7rem' },
    { key: 'totalSpend', header: 'Total Spend', sortable: true, width: '9rem' },
    { key: 'averageOrderValue', header: 'AOV', sortable: true, width: '8rem' },
    { key: 'lastOrderAt', header: 'Last Order', sortable: true, width: '10rem' },
    {
      key: 'actions',
      header: 'Actions',
      width: '10rem',
      actionButtons: [
        {
          label: 'View Details',
          actionKey: 'view',
          variant: 'secondary',
        },
      ],
    },
  ];

  readonly rows = computed<CustomerRow[]>(() => {
    const term = this.searchTerm().trim().toLowerCase();

    return this.customers()
      .filter((item) => {
        if (!term) {
          return true;
        }

        return (
          String(item.name || '').toLowerCase().includes(term)
          || String(item.phone || '').toLowerCase().includes(term)
          || String(item.primaryPincode || '').toLowerCase().includes(term)
        );
      })
      .map((item) => ({
        customerId: item.customerId,
        name: item.name,
        phone: item.phone,
        pincode: item.primaryPincode || '-',
        totalOrders: String(item.totalOrders || 0),
        totalSpend: `Rs ${Number(item.totalSpend || 0).toLocaleString('en-IN')}`,
        averageOrderValue: `Rs ${Number(item.averageOrderValue || 0).toLocaleString('en-IN')}`,
        lastOrderAt: item.lastOrderAt ? new Date(item.lastOrderAt).toLocaleDateString() : '-',
        actions: 'Actions',
      }));
  });

  ngOnInit(): void {
    this.loadCustomers();
  }

  loadCustomers(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.customerTablePageIndex.set(0);
    this.allCustomersLoaded.set(false);

    this.service.listCustomerInsights({ page: 1, limit: this.customerTablePageSize() }).subscribe({
      next: (response) => {
        const pagination = response.pagination;
        this.totalCustomers.set(pagination.total);
        this.canLoadAllCustomers.set(pagination.canLoadAll);
        this.allCustomersLoaded.set(pagination.total <= 500);

        if (pagination.total <= 500 && pagination.hasMore) {
          this.service.listCustomerInsights({ page: 1, limit: pagination.total }).subscribe({
            next: (allRes) => this.customers.set(allRes.data || []),
          });
        } else {
          this.customers.set(response.data || []);
        }
        this.loading.set(false);
      },
      error: (error) => {
        this.errorMessage.set(String(error?.error?.message || 'Failed to load customers.'));
        this.loading.set(false);
      },
    });
  }

  onCustomerTableQueryChange(query: GomTableQuery): void {
    if (this.customerTableDataMode() !== 'server') {
      return;
    }

    this.loading.set(true);

    this.service.listCustomerInsights({
      page: query.pageIndex + 1,
      limit: query.pageSize,
      search: query.searchTerm?.trim() || undefined,
      sortBy: query.sort?.key as 'lastOrderAt' | 'totalOrders' | 'totalSpend' | 'averageOrderValue' | undefined,
      sortOrder: query.sort?.direction as 'asc' | 'desc' | undefined,
    }).subscribe({
      next: (res) => {
        this.allCustomersLoaded.set(false);
        this.customers.set(res.data ?? []);
        this.totalCustomers.set(res.pagination.total);
        this.canLoadAllCustomers.set(res.pagination.canLoadAll);
        this.customerTablePageIndex.set(query.pageIndex);
        this.customerTablePageSize.set(query.pageSize);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  loadAllCustomers(): void {
    this.loading.set(true);
    this.service.listCustomerInsights({ page: 1, limit: this.totalCustomers() }).subscribe({
      next: (res) => {
        this.customers.set(res.data ?? []);
        this.totalCustomers.set(res.pagination.total);
        this.canLoadAllCustomers.set(false);
        this.allCustomersLoaded.set(true);
        this.customerTablePageIndex.set(0);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(String(value || ''));
  }

  onRowAction(event: { actionKey: string; row: GomTableRow }): void {
    if (event.actionKey !== 'view') {
      return;
    }

    const row = event.row as CustomerRow;
    const customerId = typeof row.customerId === 'string' ? row.customerId : '';
    if (!customerId) {
      return;
    }

    this.openCustomerDetail(customerId);
  }

  openCustomerDetail(customerId: string): void {
    this.detailOpen.set(true);
    this.detailLoading.set(true);
    this.selectedCustomer.set(null);
    this.selectedCustomerDetail.set(null);
    this.selectedCustomerOrders.set([]);
    this.customerOrderHistoryPageIndex.set(0);

    this.service.getCustomerSummary(customerId).subscribe({
      next: (response) => {
        this.selectedCustomer.set(response.data || null);
      },
      error: (error) => {
        this.toast.error(String(error?.error?.message || 'Failed to load customer summary.'));
        this.closeCustomerDetail();
      },
    });

    this.service.getCustomerById(customerId).subscribe({
      next: (response) => {
        this.selectedCustomerDetail.set(response.data || null);
        this.detailLoading.set(false);
      },
      error: (error) => {
        this.detailLoading.set(false);
        this.toast.error(String(error?.error?.message || 'Failed to load customer details.'));
      },
    });

    this.service.listCustomerOrderHistory(customerId, 1, this.customerOrderHistoryPageSize()).subscribe({
      next: (response) => {
        this.selectedCustomerOrders.set(response.data || []);
        this.customerOrderHistoryTotal.set(response.pagination.total);
      },
      error: () => {
        this.selectedCustomerOrders.set([]);
        this.customerOrderHistoryTotal.set(0);
      },
    });
  }

  onCustomerOrderHistoryQueryChange(query: GomTableQuery): void {
    const customerId = this.selectedCustomer()?.customer?._id;
    if (!customerId) {
      return;
    }

    this.service.listCustomerOrderHistory(customerId, query.pageIndex + 1, query.pageSize).subscribe({
      next: (response) => {
        this.selectedCustomerOrders.set(response.data || []);
        this.customerOrderHistoryTotal.set(response.pagination.total);
        this.customerOrderHistoryPageIndex.set(query.pageIndex);
        this.customerOrderHistoryPageSize.set(query.pageSize);
      },
      error: () => {
        this.selectedCustomerOrders.set([]);
      },
    });
  }

  closeCustomerDetail(): void {
    this.detailOpen.set(false);
    this.detailLoading.set(false);
    this.selectedCustomer.set(null);
    this.selectedCustomerDetail.set(null);
    this.selectedCustomerOrders.set([]);
    this.customerOrderHistoryTotal.set(0);
    this.customerOrderHistoryPageIndex.set(0);
  }

  isPinLocked(): boolean {
    const lockUntil = this.selectedCustomerDetail()?.pinLockedUntil;
    if (!lockUntil) {
      return false;
    }

    const lockDate = new Date(lockUntil);
    if (!Number.isFinite(lockDate.getTime())) {
      return false;
    }

    return lockDate.getTime() > Date.now();
  }
}
