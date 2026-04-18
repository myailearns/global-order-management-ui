import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { GomAlertToastService } from '@gomlibs/ui';
import { AuthSessionService } from '../../../../core/auth/auth-session.service';
import { GomButtonComponent } from '@gomlibs/ui';
import { GomChipTone, GomTableColumn, GomTableComponent, GomTableRow } from '@gomlibs/ui';
import { GomModalComponent } from '@gomlibs/ui';

import { TenantAccessService } from '../../services';
import { RoleWithPermissions, UserRoleAssignment, UserWithRoles, UserStatus } from '../../models';
import { TRANSLATION_KEYS, UI_CONFIG, PERMISSION_KEYS } from '../../constants';

interface UserRow extends GomTableRow {
  userId: string;
  fullName: string;
  email: string;
  phone: string;
  status: UserStatus;
  roles: string;
  lastLogin: string;
}

/**
 * EPIC 3 UI - S7: Users Management List Component
 * Display tenant users, search, filter, and invite new users
 */
@Component({
  selector: 'gom-users-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TranslateModule,
    GomButtonComponent,
    GomTableComponent,
    GomModalComponent,
  ],
  templateUrl: './users-list.component.html',
  styleUrl: './users-list.component.scss',
})
export class UsersListComponent implements OnInit {
  private readonly service = inject(TenantAccessService);
  private readonly toast = inject(GomAlertToastService);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);
  private readonly authSession = inject(AuthSessionService);

  readonly loading = signal(false);
  readonly canWrite = computed(() => this.authSession.canWrite('tenant-admin'));
  readonly errorMessage = signal<string | null>(null);

  readonly users = signal<UserWithRoles[]>([]);
  readonly roles = signal<RoleWithPermissions[]>([]);
  readonly assignmentsByUser = signal<Record<string, UserRoleAssignment[]>>({});
  readonly page = signal(1);
  readonly limit = signal(UI_CONFIG.USERS_PAGE_SIZE);
  readonly total = signal(0);
  readonly assignRolesOpen = signal(false);
  readonly assignRolesLoading = signal(false);
  readonly selectedUser = signal<UserRow | null>(null);
  readonly selectedRoleIds = signal<string[]>([]);

  readonly selectedStatusFilter = signal<UserStatus | null>(null);

  readonly filteredUsers = computed<UserRow[]>(() => {
    const status = this.selectedStatusFilter();

    return this.users()
      .filter((user) => {
        // Filter by status
        if (status && user.status !== status) {
          return false;
        }
        return true;
      })
      .map((user) => ({
        userId: user._id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone || '-',
        status: user.status,
        roles: this.getUserRoleNames(user),
        lastLogin: user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : '-',
      }));
  });

  readonly columns = computed<GomTableColumn<UserRow>[]>(() => {
    const baseColumns: GomTableColumn<UserRow>[] = [
      { key: 'fullName', header: 'Name', sortable: true, width: '14rem' },
      {
        key: 'email',
        header: this.translate.instant(TRANSLATION_KEYS.TBL_USER_EMAIL),
        sortable: true,
        width: '18rem',
      },
      {
        key: 'phone',
        header: this.translate.instant(TRANSLATION_KEYS.TBL_USER_PHONE),
        sortable: true,
        width: '12rem',
      },
      {
        key: 'status',
        header: this.translate.instant(TRANSLATION_KEYS.TBL_USER_STATUS),
        width: '8rem',
        chipTone: (value) => this.getUserStatusTone(typeof value === 'string' ? value : ''),
      },
      { key: 'roles', header: this.translate.instant(TRANSLATION_KEYS.TBL_USER_ROLES), width: '15rem' },
      {
        key: 'lastLogin',
        header: this.translate.instant(TRANSLATION_KEYS.TBL_USER_LAST_LOGIN),
        width: '10rem',
      },
    ];

    if (!this.canWrite()) {
      return baseColumns;
    }

    return [
      ...baseColumns,
      {
        key: 'actions',
        header: this.translate.instant('common.labels.actions'),
        width: '10rem',
        actionButtons: [
          {
            label: this.translate.instant(TRANSLATION_KEYS.BTN_ASSIGN_ROLES),
            actionKey: 'assign-roles',
            variant: 'primary',
            icon: 'ri-admin-line',
          },
          {
            label: (row) => (row.status === UserStatus.LOCKED ? 'Unlock' : 'Lock'),
            actionKey: 'lock-unlock',
            variant: 'danger',
            icon: (row) => (row.status === UserStatus.LOCKED ? 'ri-lock-unlock-line' : 'ri-lock-line'),
          },
          {
            label: 'Reset Password',
            actionKey: 'reset-password',
            variant: 'secondary',
            icon: 'ri-key-2-line',
          },
        ],
      },
    ];
  });

  readonly permissionKeys = PERMISSION_KEYS;
  readonly translationKeys = TRANSLATION_KEYS;
  readonly uiConfig = UI_CONFIG;

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.total() / this.limit()));
  }

  ngOnInit(): void {
    this.loadRoles();
    this.loadUsers();
  }

  get availableRoles(): RoleWithPermissions[] {
    return this.roles().filter((role) => role.status === 'ACTIVE');
  }

  get canSubmitRoleAssignments(): boolean {
    return !this.assignRolesLoading() && this.selectedRoleIds().length > 0;
  }

  loadUsers(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    const status = this.selectedStatusFilter() || undefined;

    this.service
      .listUsers(this.page(), this.limit(), undefined, status)
      .subscribe({
        next: (response) => {
          this.users.set(response.users);
          this.total.set(response.meta.total);
          this.loading.set(false);
        },
        error: (err) => {
          const message = String(err?.error?.message || '').trim();
          const finalMessage = message || 'Failed to load users';
          this.errorMessage.set(finalMessage);
          this.toast.error(finalMessage);
          this.loading.set(false);
        },
      });
  }

  onInviteUser(): void {
    if (!this.canWrite()) {
      return;
    }
    this.router.navigate(['/saas-admin/users/invite']);
  }

  loadRoles(): void {
    this.service.listRoles().subscribe({
      next: (roles) => {
        this.roles.set(roles);
      },
      error: () => {
        this.toast.error('Failed to load roles list.');
      },
    });
  }

  onStatusFilterChange(status: UserStatus | null): void {
    this.selectedStatusFilter.set(status);
    this.page.set(1);
    this.loadUsers();
  }

  onTableAction(event: { actionKey: string; row: UserRow }): void {
    if (!this.canWrite()) {
      return;
    }
    const { actionKey, row } = event;

    switch (actionKey) {
      case 'assign-roles':
        this.openAssignRoles(row);
        break;
      case 'lock-unlock':
        this.onToggleLock(row);
        break;
      case 'reset-password':
        this.toast.info('Reset password API is not available yet.');
        break;
      default:
        break;
    }
  }

  openAssignRoles(user: UserRow): void {
    this.selectedUser.set(user);
    this.assignRolesOpen.set(true);
    this.assignRolesLoading.set(true);

    this.service.getUserAssignments(user.userId).subscribe({
      next: (assignments) => {
        const ids = assignments
          .map((assignment) => {
            if (typeof assignment.roleId === 'string') {
              return assignment.roleId;
            }
            return assignment.roleId?._id || '';
          })
          .filter(Boolean);
        this.selectedRoleIds.set(ids);
        this.assignRolesLoading.set(false);
      },
      error: () => {
        this.assignRolesLoading.set(false);
        this.toast.error('Failed to load role assignments.');
      },
    });
  }

  closeAssignRoles(): void {
    this.assignRolesOpen.set(false);
    this.selectedUser.set(null);
    this.selectedRoleIds.set([]);
    this.assignRolesLoading.set(false);
  }

  toggleSelectedRole(roleId: string): void {
    const current = this.selectedRoleIds();
    if (current.includes(roleId)) {
      this.selectedRoleIds.set(current.filter((id) => id !== roleId));
      return;
    }
    this.selectedRoleIds.set([...current, roleId]);
  }

  saveRoleAssignments(): void {
    const user = this.selectedUser();
    if (!user || this.selectedRoleIds().length === 0) {
      return;
    }

    this.assignRolesLoading.set(true);
    this.service.replaceUserRoles(user.userId, this.selectedRoleIds()).subscribe({
      next: (assignments) => {
        this.assignRolesLoading.set(false);
        this.assignmentsByUser.update((curr) => ({ ...curr, [user.userId]: assignments }));
        this.toast.success('Roles assigned successfully.');
        this.closeAssignRoles();
      },
      error: () => {
        this.assignRolesLoading.set(false);
        this.toast.error('Failed to update role assignments.');
      },
    });
  }

  isRoleSelected(roleId: string): boolean {
    return this.selectedRoleIds().includes(roleId);
  }

  private onToggleLock(row: UserRow): void {
    const user = this.users().find((u) => u._id === row.userId);
    if (!user) return;

    const isUnlock = row.status === UserStatus.LOCKED;
    const actionLabel = isUnlock ? 'unlock' : 'lock';
    if (confirm(`Are you sure you want to ${actionLabel} ${user.email}?`)) {
      const request = isUnlock ? this.service.unlockUser(row.userId) : this.service.lockUser(row.userId);
      request.subscribe({
        next: () => {
          this.toast.success(`User ${isUnlock ? 'unlocked' : 'locked'} successfully`);
          this.loadUsers();
        },
        error: (err) => {
          const message = String(err?.error?.message || '');
          if (message.toLowerCase().includes('last active saas_admin')) {
            this.toast.error('Cannot lock the last active SaaS admin.');
          } else {
            this.toast.error(`Failed to ${actionLabel} user`);
          }
        },
      });
    }
  }

  private getUserRoleNames(user: UserWithRoles): string {
    const assignedRoles = Array.isArray(user.assignedRoles) ? user.assignedRoles : [];
    if (assignedRoles.length > 0) {
      return assignedRoles.map((item) => item.roleName).filter(Boolean).join(', ') || '-';
    }

    const assignments = this.assignmentsByUser()[user._id] || [];
    if (assignments.length === 0) {
      return '-';
    }

    const names = assignments.map((assignment) => {
      if (typeof assignment.roleId === 'string') {
        const role = this.roles().find((item) => item._id === assignment.roleId);
        return role?.name || assignment.roleId;
      }
      return assignment.roleId?.name || '-';
    });

    return names.filter((name) => name && name !== '-').join(', ') || '-';
  }

  private getUserStatusTone(status: string): GomChipTone {
    switch (status) {
      case UserStatus.ACTIVE:
        return 'success';
      case UserStatus.INVITED:
        return 'info';
      case UserStatus.LOCKED:
        return 'warning';
      case UserStatus.DISABLED:
        return 'danger';
      default:
        return 'neutral';
    }
  }

  trackByUserId(_index: number, user: UserRow): string {
    return user.userId;
  }
}
