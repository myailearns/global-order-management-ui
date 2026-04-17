import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';

import { GomAlertToastService } from '../../../shared/components/alert';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { GomButtonComponent, GomInputComponent } from '../../../shared/components/form-controls';
import { GomModalComponent } from '../../../shared/components/modal';
import { GomTableColumn, GomTableComponent, GomTableRow } from '../../../shared/components/table';
import {
  CustomerEngagementService,
  CustomerInsight,
  CustomerOrderHistoryItem,
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

@Component({
  selector: 'gom-customers',
  standalone: true,
  imports: [
    CommonModule,
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

  readonly detailOpen = signal(false);
  readonly selectedCustomer = signal<CustomerSummary | null>(null);
  readonly selectedCustomerOrders = signal<CustomerOrderHistoryItem[]>([]);

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

    this.service.listCustomerInsights().subscribe({
      next: (response) => {
        this.customers.set(response.data || []);
        this.loading.set(false);
      },
      error: (error) => {
        this.errorMessage.set(String(error?.error?.message || 'Failed to load customers.'));
        this.loading.set(false);
      },
    });
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(String(value || ''));
  }

  onRowAction(event: { actionKey: string; row: GomTableRow }): void {
    if (event.actionKey !== 'view') {
      return;
    }

    const row = event.row as { customerId?: unknown };
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
    this.selectedCustomerOrders.set([]);

    this.service.getCustomerSummary(customerId).subscribe({
      next: (response) => {
        this.selectedCustomer.set(response.data || null);
        this.detailLoading.set(false);
      },
      error: (error) => {
        this.toast.error(String(error?.error?.message || 'Failed to load customer summary.'));
        this.closeCustomerDetail();
      },
    });

    this.service.listCustomerOrderHistory(customerId).subscribe({
      next: (response) => {
        this.selectedCustomerOrders.set(response.data || []);
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
    this.selectedCustomerOrders.set([]);
  }
}
