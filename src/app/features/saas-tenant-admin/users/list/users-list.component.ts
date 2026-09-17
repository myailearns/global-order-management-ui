import { Component, HostListener, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import {
  GomAlertToastService,
  GomButtonComponent,
  GomCheckboxComponent,
  GomChipTone,
  GomModalComponent,
  GomTableColumn,
  GomTableComponent,
  GomTableFilterDefinition,
  GomTableRow,
} from '@gomlibs/ui';
import { AuthSessionService } from '../../../../core/auth/auth-session.service';

import { TenantAccessService } from '../../services';
import { RoleWithPermissions, UserWithRoles, UserStatus } from '../../models';
import { TRANSLATION_KEYS, PERMISSION_KEYS } from '../../constants';
import { DisableIfNoFeatureDirective } from '../../../../shared/directives/disable-if-no-feature.directive';
import { PageHeadingComponent } from '../../../../shared/components/page-heading/page-heading.component';
import { UserInviteFormComponent } from '../form/user-invite-form.component';

interface UserRow extends GomTableRow {
  _id: string;
  userId: string;
  fullName: string;
  email: string;
  phone: string;
  whatsappNumber: string;
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
    TranslateModule,
    PageHeadingComponent,
    DisableIfNoFeatureDirective,
    GomButtonComponent,
    GomCheckboxComponent,
    GomTableComponent,
    GomModalComponent,
    UserInviteFormComponent,
  ],
  templateUrl: './users-list.component.html',
  styleUrl: './users-list.component.scss',
})
export class UsersListComponent implements OnInit {
  private readonly service = inject(TenantAccessService);
  private readonly toast = inject(GomAlertToastService);
  private readonly translate = inject(TranslateService);
  private readonly authSession = inject(AuthSessionService);

  readonly loading = signal(false);
  readonly viewportWidth = signal<number>(window.innerWidth);
  readonly isMobileHeader = computed<boolean>(() => this.viewportWidth() <= 768);
  readonly canCreate = computed(() => this.authSession.hasFeature('user.create'));
  readonly canEdit = computed(() => this.authSession.hasFeature('user.edit'));
  readonly canDelete = computed(() => this.authSession.hasFeature('user.delete'));
  readonly errorMessage = signal<string | null>(null);

  readonly users = signal<UserWithRoles[]>([]);
  readonly roles = signal<RoleWithPermissions[]>([]);
  readonly total = signal(0);
  readonly formModalOpen = signal(false);
  readonly editingUserId = signal<string | null>(null);
  readonly deleteConfirmModalOpen = signal(false);
  readonly deletingUserId = signal<string | null>(null);
  readonly userToDeleteName = signal('');
  readonly assignRolesOpen = signal(false);
  readonly assignRolesLoading = signal(false);
  readonly selectedUser = signal<UserRow | null>(null);
  readonly selectedRoleIds = signal<string[]>([]);

  @HostListener('window:resize')
  onWindowResize(): void {
    this.viewportWidth.set(window.innerWidth);
  }

  readonly tableRows = computed<UserRow[]>(() => {
    return this.users().map((user) => ({
        _id: user._id,
        userId: user._id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone || '-',
        whatsappNumber: user.whatsappNumber || user.phone || '-',
        status: user.status,
        roles: this.getUserRoleNames(user),
        lastLogin: user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : '-',
      }));
  });

  readonly filterDefinitions: GomTableFilterDefinition<UserRow>[] = [
    {
      key: 'status',
      label: this.translate.instant(TRANSLATION_KEYS.LBL_STATUS),
      type: 'select',
      options: [
        { value: UserStatus.INVITED, label: this.translate.instant('saas.admin.users.opt_invited') },
        { value: UserStatus.ACTIVE, label: this.translate.instant('saas.admin.users.opt_active') },
        { value: UserStatus.LOCKED, label: this.translate.instant('saas.admin.users.opt_locked') },
        { value: UserStatus.DISABLED, label: this.translate.instant('saas.admin.users.opt_disabled') },
      ],
    },
  ];

  readonly tablePageSize = computed(() => Math.max(this.tableRows().length || 0, 1));

  get availableRoles(): RoleWithPermissions[] {
    return this.roles().filter((role) => role.status === 'ACTIVE');
  }

  get canSubmitRoleAssignments(): boolean {
    return !this.assignRolesLoading() && this.selectedRoleIds().length > 0;
  }

  get userModalTitle(): string {
    return this.translate.instant(this.editingUserId() ? 'saas.admin.users.title_edit' : 'saas.admin.users.title_create');
  }

  get canManageUsers(): boolean {
    return this.canEdit() || this.canDelete();
  }

  readonly columns = computed<GomTableColumn<UserRow>[]>(() => {
    const baseColumns: GomTableColumn<UserRow>[] = [
      { key: 'fullName', header: this.translate.instant('saas.admin.users.lbl_full_name'), sortable: true, width: '14rem' },
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
        key: 'whatsappNumber',
        header: this.translate.instant('saas.admin.users.tbl_whatsapp'),
        sortable: true,
        width: '12rem',
      },
      {
        key: 'status',
        header: this.translate.instant(TRANSLATION_KEYS.TBL_USER_STATUS),
        width: '8rem',
        format: (value) => this.getUserStatusLabel(typeof value === 'string' ? value : ''),
        chipTone: (value) => this.getUserStatusTone(typeof value === 'string' ? value : ''),
      },
      { key: 'roles', header: this.translate.instant(TRANSLATION_KEYS.TBL_USER_ROLES), width: '15rem' },
      {
        key: 'lastLogin',
        header: this.translate.instant(TRANSLATION_KEYS.TBL_USER_LAST_LOGIN),
        width: '10rem',
      },
    ];

    if (!this.canManageUsers) {
      return baseColumns;
    }

    const actionButtons = [
      ...(this.canEdit() ? [{
        label: this.translate.instant('saas.admin.users.btn_add_role'),
        actionKey: 'assign-roles',
        variant: 'primary' as const,
        icon: 'ri-admin-line',
      }, {
        label: this.translate.instant('common.actions.edit'),
        actionKey: 'edit',
        variant: 'secondary' as const,
        icon: 'ri-pencil-line',
      }] : []),
      ...(this.canDelete() ? [{
        label: this.translate.instant('common.actions.delete'),
        actionKey: 'delete',
        variant: 'danger' as const,
        icon: 'ri-delete-bin-line',
      }] : []),
    ];

    return [
      ...baseColumns,
      {
        key: 'actions',
        header: this.translate.instant('common.labels.actions'),
        width: '14rem',
        actionButtons,
      },
    ];
  });

  readonly permissionKeys = PERMISSION_KEYS;
  readonly translationKeys = TRANSLATION_KEYS;

  ngOnInit(): void {
    this.loadRoles();
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.service
      .listUsers(1, 5000)
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
    if (!this.canCreate()) {
      return;
    }
    this.openUserForm(null);
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

  onTableAction(event: { actionKey: string; row: UserRow }): void {
    if (!this.canManageUsers) {
      return;
    }
    const { actionKey, row } = event;

    switch (actionKey) {
      case 'assign-roles':
        this.openAssignRoles(row);
        break;
      case 'edit':
        this.openUserForm(row.userId);
        break;
      case 'delete':
        this.onDeleteUser(row.userId, row.fullName);
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
      next: () => {
        this.assignRolesLoading.set(false);
        this.toast.success(this.translate.instant('saas.admin.users.msg_role_update_success'));
        this.closeAssignRoles();
        this.loadUsers();
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

  onUserFormSaved(): void {
    this.formModalOpen.set(false);
    this.editingUserId.set(null);
    this.loadUsers();
  }

  onUserFormCancelled(): void {
    this.formModalOpen.set(false);
    this.editingUserId.set(null);
  }

  onUserModalClosed(): void {
    this.editingUserId.set(null);
  }

  onDeleteUser(userId: string, userName: string): void {
    this.deletingUserId.set(userId);
    this.userToDeleteName.set(userName);
    this.deleteConfirmModalOpen.set(true);
  }

  onDeleteConfirmClosed(): void {
    this.deleteConfirmModalOpen.set(false);
    this.deletingUserId.set(null);
    this.userToDeleteName.set('');
  }

  onConfirmDeleteUser(): void {
    const userId = this.deletingUserId();
    if (!userId) {
      return;
    }

    this.loading.set(true);
    this.deleteConfirmModalOpen.set(false);
    this.service.deleteUser(userId).subscribe({
      next: () => {
        this.toast.success(this.translate.instant('saas.admin.users.msg_delete_success'));
        this.deletingUserId.set(null);
        this.userToDeleteName.set('');
        this.loadUsers();
      },
      error: () => {
        this.loading.set(false);
        this.toast.error(this.translate.instant('saas.admin.users.msg_delete_failed'));
        this.deletingUserId.set(null);
        this.userToDeleteName.set('');
      },
    });
  }

  private openUserForm(userId: string | null): void {
    this.editingUserId.set(userId);
    this.formModalOpen.set(true);
  }

  private getUserRoleNames(user: UserWithRoles): string {
    const assignedRoles = Array.isArray(user.assignedRoles) ? user.assignedRoles : [];
    if (assignedRoles.length > 0) {
      return assignedRoles.map((item) => item.roleName).filter(Boolean).join(', ') || '-';
    }
    return '-';
  }

  private getUserStatusLabel(status: string): string {
    switch (status) {
      case UserStatus.INVITED:
        return this.translate.instant('saas.admin.users.opt_invited');
      case UserStatus.ACTIVE:
        return this.translate.instant('saas.admin.users.opt_active');
      case UserStatus.LOCKED:
        return this.translate.instant('saas.admin.users.opt_locked');
      case UserStatus.DISABLED:
        return this.translate.instant('saas.admin.users.opt_disabled');
      default:
        return status;
    }
  }

  private getUserStatusTone(status: string): GomChipTone {
    switch (status) {
      case UserStatus.INVITED:
        return 'warning';
      case UserStatus.ACTIVE:
        return 'success';
      case UserStatus.LOCKED:
        return 'pending';
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
