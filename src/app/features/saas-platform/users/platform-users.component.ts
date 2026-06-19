import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GomAlertToastService, GomInputComponent, GomSelectComponent, GomSelectOption, GomTableColumn, GomTableComponent, GomTableQuery, GomTableRow } from '@gomlibs/ui';
import { PlatformUser, PlatformUsersService } from './platform-users.service';

interface PlatformUserRow extends GomTableRow {
  id: string;
  fullName: string;
  email: string;
  role: string;
  status: string;
  lastLoginAt: string;
  updatedAt: string;
}

@Component({
  selector: 'gom-platform-users',
  standalone: true,
  imports: [CommonModule, FormsModule, GomInputComponent, GomSelectComponent, GomTableComponent],
  templateUrl: './platform-users.component.html',
  styleUrl: './platform-users.component.scss',
})
export class PlatformUsersComponent {
  private readonly service = inject(PlatformUsersService);
  private readonly toast = inject(GomAlertToastService);

  readonly loading = signal(false);
  readonly users = signal<PlatformUser[]>([]);
  readonly total = signal(0);
  readonly tablePageIndex = signal(0);
  readonly tablePageSize = signal(50);
  readonly canLoadAll = signal(false);
  readonly allLoaded = signal(false);

  readonly search = signal('');
  readonly roleFilter = signal('');
  readonly statusFilter = signal('');

  readonly serverSidePagination = computed(() => this.total() > 500);
  readonly tableDataMode = computed<'client' | 'server'>(() => (
    this.serverSidePagination() && !this.allLoaded() ? 'server' : 'client'
  ));

  readonly roleOptions: GomSelectOption[] = [
    { value: '', label: 'All Roles' },
    { value: 'platform_super_admin', label: 'Platform Super Admin' },
    { value: 'platform_admin', label: 'Platform Admin' },
    { value: 'platform_support', label: 'Platform Support' },
  ];

  readonly statusOptions: GomSelectOption[] = [
    { value: '', label: 'All Statuses' },
    { value: 'ACTIVE', label: 'ACTIVE' },
    { value: 'INACTIVE', label: 'INACTIVE' },
    { value: 'SUSPENDED', label: 'SUSPENDED' },
  ];

  readonly rows = computed<PlatformUserRow[]>(() => this.users().map((user) => ({
    id: user.userId,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    status: user.status,
    lastLoginAt: user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : '-',
    updatedAt: new Date(user.updatedAt).toLocaleDateString(),
  })));

  readonly columns: GomTableColumn<PlatformUserRow>[] = [
    { key: 'fullName', header: 'Name', sortable: true, width: '14rem' },
    { key: 'email', header: 'Email', sortable: true, width: '18rem' },
    { key: 'role', header: 'Role', sortable: true, width: '14rem' },
    { key: 'status', header: 'Status', width: '10rem' },
    { key: 'lastLoginAt', header: 'Last Login', width: '14rem' },
    { key: 'updatedAt', header: 'Updated', sortable: true, width: '10rem' },
  ];

  constructor() {
    this.loadUsers();
  }

  onSearchChange(value: string): void {
    this.search.set(String(value || '').trim());
    this.loadUsers();
  }

  onRoleFilterChange(value: string): void {
    this.roleFilter.set(String(value || '').trim());
    this.loadUsers();
  }

  onStatusFilterChange(value: string): void {
    this.statusFilter.set(String(value || '').trim());
    this.loadUsers();
  }

  onTableQueryChange(query: GomTableQuery): void {
    this.tablePageIndex.set(query.pageIndex);
    this.tablePageSize.set(query.pageSize);

    this.loadUsersPage(query.pageIndex + 1, query.pageSize);
  }

  loadAllUsers(): void {
    const count = this.total();
    if (!count) {
      return;
    }

    this.loading.set(true);
    this.service.listUsers({
      page: 1,
      limit: count,
      search: this.search(),
      role: this.roleFilter(),
      status: this.statusFilter(),
    }).subscribe({
      next: (response) => {
        this.users.set(response.data || []);
        this.allLoaded.set(true);
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.toast.error(String(error?.error?.message || 'Failed to load all platform users'));
      },
    });
  }

  private loadUsers(): void {
    this.tablePageIndex.set(0);
    this.allLoaded.set(false);
    this.loadUsersPage(1, this.tablePageSize());
  }

  private loadUsersPage(page: number, limit: number): void {
    this.loading.set(true);

    this.service.listUsers({
      page,
      limit,
      search: this.search(),
      role: this.roleFilter(),
      status: this.statusFilter(),
    }).subscribe({
      next: (response) => {
        const pagination = response.pagination;
        this.total.set(pagination.total);
        this.canLoadAll.set(pagination.canLoadAll && pagination.total <= 5000);
        this.allLoaded.set(pagination.total <= 500);

        if (pagination.total <= 500 && pagination.hasMore) {
          this.service.listUsers({
            page: 1,
            limit: pagination.total,
            search: this.search(),
            role: this.roleFilter(),
            status: this.statusFilter(),
          }).subscribe({
            next: (allResponse) => {
              this.users.set(allResponse.data || []);
              this.loading.set(false);
            },
            error: (error) => {
              this.loading.set(false);
              this.toast.error(String(error?.error?.message || 'Failed to load platform users'));
            },
          });
          return;
        }

        this.users.set(response.data || []);
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.toast.error(String(error?.error?.message || 'Failed to load platform users'));
      },
    });
  }
}
