import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import {
  GomAlertToastService,
  GomButtonComponent,
  GomChipComponent,
  GomModalComponent,
  GomSelectComponent,
  GomSelectOption,
  GomTableColumn,
  GomTableComponent,
  GomTableRow,
} from '@gomlibs/ui';
import { AuthSessionService } from '../../../../core/auth/auth-session.service';
import { TenantAccessService } from '../../services';
import { RoleStatus, RoleWithPermissions } from '../../models';
import { SaasAccountService } from '../../../saas-platform/accounts/saas-account.service';
import { DisableIfNoFeatureDirective } from '../../../../shared/directives/disable-if-no-feature.directive';
import { RoleMatrixComponent } from '../matrix/role-matrix.component';

interface RoleRow extends GomTableRow {
  roleId: string;
  roleName: string;
  roleKey: string;
  permissionCount: number;
  mappedUserCount: number;
  status: string;
  isSystem: string;
}

interface AccountRow extends GomTableRow {
  _id: string;
  fullName: string;
  email: string;
  status: string;
}

interface RoleCloneSeed {
  name: string;
  description: string;
  permissionKeys: string[];
}

@Component({
  selector: 'gom-roles-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    DisableIfNoFeatureDirective,
    GomButtonComponent,
    GomChipComponent,
    GomSelectComponent,
    GomTableComponent,
    GomModalComponent,
    RoleMatrixComponent,
  ],
  templateUrl: './roles-list.component.html',
  styleUrl: './roles-list.component.scss',
})
export class RolesListComponent implements OnInit {
  private mapAccountsTable?: GomTableComponent<AccountRow>;
  private isBootstrappingMapSelection = false;
  private isApplyingMapSelection = false;

  @ViewChild('mapAccountsTable')
  set mapAccountsTableRef(table: GomTableComponent<AccountRow> | undefined) {
    this.mapAccountsTable = table;
    if (table) {
      this.syncMapTableSelection(0);
    }
  }

  private readonly service = inject(TenantAccessService);
  private readonly saasAccountService = inject(SaasAccountService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(GomAlertToastService);
  private readonly authSession = inject(AuthSessionService);
  private readonly translate = inject(TranslateService);

  readonly loading = signal(false);
  readonly canWrite = computed(() => this.authSession.canWrite('tenant-admin'));
  readonly roles = signal<RoleWithPermissions[]>([]);
  readonly roleFormModalOpen = signal(false);
  readonly editingRoleId = signal<string | null>(null);
  readonly cloneSeed = signal<RoleCloneSeed | null>(null);
  readonly platformMode = signal(false);
  readonly tenantOptions = signal<GomSelectOption[]>([]);
  readonly selectedTenantId = signal('');
  readonly mapUsersModalOpen = signal(false);
  readonly viewUsersModalOpen = signal(false);
  readonly selectedRoleForUsers = signal<RoleRow | null>(null);
  readonly availableAccounts = signal<AccountRow[]>([]);
  readonly selectedAccountIds = signal<string[]>([]);
  readonly mappedAccounts = signal<AccountRow[]>([]);
  readonly roleUsersLoading = signal(false);
  readonly roleUsersSaving = signal(false);

  readonly maxRoles = signal<number | null>(null);
  readonly atQuota = computed(() => {
    const max = this.maxRoles();
    return !this.platformMode() && max !== null && this.roles().length >= max;
  });
  readonly quotaLabel = computed(() => {
    if (this.platformMode()) return null;
    const max = this.maxRoles();
    if (max === null) return null;
    return `${this.roles().length} / ${max}`;
  });

  readonly canLoadRoles = computed(() => !this.platformMode() || !!this.selectedTenantId().trim());

  readonly rows = computed<RoleRow[]>(() =>
    this.roles().map((role) => ({
      roleId: role._id,
      roleName: role.name,
      roleKey: role.roleKey,
      permissionCount: role.permissionKeys?.length || 0,
      mappedUserCount: role.mappedUserCount || 0,
      status: role.status,
      isSystem: role.isSystem ? 'Yes' : 'No',
    }))
  );

  readonly columns = computed<GomTableColumn<RoleRow>[]>(() => {
    const baseColumns: GomTableColumn<RoleRow>[] = [
      { key: 'roleName', header: 'Role Name', sortable: true, width: '16rem' },
      { key: 'permissionCount', header: 'Features', sortable: true, width: '10rem' },
      {
        key: 'mappedUserCount',
        header: 'Accounts',
        width: '8rem',
      },
      { key: 'status', header: 'Status', width: '10rem' },
      { key: 'isSystem', header: 'System Role', width: '10rem' },
    ];

    if (!this.canWrite()) {
      return baseColumns;
    }

    return [
      ...baseColumns,
      {
        key: 'roleId',
        header: 'Actions',
        width: '28rem',
        actionButtons: [
          { label: 'Edit Matrix', actionKey: 'edit', variant: 'secondary', icon: 'ri-pencil-line' },
          { label: (row) => `View Users (${row.mappedUserCount || 0})`, actionKey: 'view-users', variant: 'secondary' },
          { label: 'Map Users', actionKey: 'map-users', variant: 'secondary', icon: 'ri-user-settings-line' },
          { label: 'Clone', actionKey: 'clone', variant: 'secondary', icon: 'ri-file-copy-line' },
          {
            label: (row) => (row.status === 'ACTIVE' ? 'Deactivate' : 'Activate'),
            actionKey: 'toggle-status',
            variant: 'danger',
            icon: (row) => (row.status === 'ACTIVE' ? 'ri-forbid-2-line' : 'ri-check-line'),
          },
          {
            label: 'Delete',
            actionKey: 'delete',
            variant: 'danger',
            icon: 'ri-delete-bin-line',
          },
        ],
      },
    ];
  });

  readonly mapUsersColumns: GomTableColumn<AccountRow>[] = [
    { key: 'fullName', header: 'Account Name', sortable: true, width: '16rem' },
    { key: 'email', header: 'Email', sortable: true, width: '20rem' },
    { key: 'status', header: 'Status', sortable: true, width: '10rem' },
  ];

  ngOnInit(): void {
    this.platformMode.set(!!this.route.snapshot.data['platformMode']);

    if (this.platformMode()) {
      const initialTenantId = String(this.route.snapshot.queryParamMap.get('tenantId') || '').trim();
      this.selectedTenantId.set(initialTenantId);
      this.loadTenantOptions();
      if (initialTenantId) {
        this.loadRoles();
      }
      return;
    }

    this.loadRoles();
    this.loadQuota();
  }

  loadRoles(): void {
    if (!this.canLoadRoles()) {
      this.roles.set([]);
      return;
    }

    this.loading.set(true);
    this.service.listRoles(1, 200, this.selectedTenantId() || undefined).subscribe({
      next: (roles) => {
        this.roles.set(roles);
        this.loading.set(false);
      },
      error: () => {
        this.roles.set([]);
        this.loading.set(false);
      },
    });
  }

  loadQuota(): void {
    this.service.getTenantAdminSummary().subscribe({
      next: (summary) => {
        this.maxRoles.set(summary.limits?.maxRoles ?? null);
      },
      error: () => {
        // Non-critical — quota display is best-effort
      },
    });
  }

  onTenantSelect(tenantId: string): void {
    this.selectedTenantId.set(String(tenantId || '').trim());
    this.loadRoles();
  }

  createRole(): void {
    if (!this.canWrite()) {
      return;
    }
    if (this.atQuota()) {
      this.toast.error(this.translate.instant('saas.admin.roles.msg_quota_exceeded'));
      return;
    }
    this.editingRoleId.set(null);
    this.cloneSeed.set(null);
    this.roleFormModalOpen.set(true);
  }

  onTableAction(event: { actionKey: string; row: RoleRow }): void {
    if (event.actionKey === 'view-users') {
      this.openViewUsersModal(event.row);
      return;
    }

    if (!this.canWrite()) {
      return;
    }

    switch (event.actionKey) {
      case 'edit':
        this.navigateToRoleMatrix(event.row.roleId);
        break;
      case 'clone':
        this.openCloneRoleModal(event.row.roleId);
        break;
      case 'map-users':
        this.openMapUsersModal(event.row);
        break;
      case 'toggle-status':
        this.toggleRoleStatus(event.row);
        break;
      case 'delete':
        this.deleteRole(event.row);
        break;
      default:
        break;
    }
  }

  onRoleFormSaved(): void {
    this.roleFormModalOpen.set(false);
    this.editingRoleId.set(null);
    this.cloneSeed.set(null);
    this.loadRoles();
    this.loadQuota();
  }

  onRoleFormCancelled(): void {
    this.roleFormModalOpen.set(false);
    this.editingRoleId.set(null);
    this.cloneSeed.set(null);
  }

  closeMapUsersModal(): void {
    this.mapUsersModalOpen.set(false);
    this.selectedRoleForUsers.set(null);
    this.availableAccounts.set([]);
    this.selectedAccountIds.set([]);
    this.roleUsersLoading.set(false);
    this.roleUsersSaving.set(false);
  }

  closeViewUsersModal(): void {
    this.viewUsersModalOpen.set(false);
    this.selectedRoleForUsers.set(null);
    this.mappedAccounts.set([]);
    this.roleUsersLoading.set(false);
  }

  onMapTableSelectedRowsChange(rows: AccountRow[]): void {
    if (this.isBootstrappingMapSelection || this.isApplyingMapSelection) {
      return;
    }
    this.selectedAccountIds.set(rows.map((row) => row._id));
  }

  saveRoleUserMappings(): void {
    const role = this.selectedRoleForUsers();
    if (!role || this.roleUsersSaving()) {
      return;
    }

    this.roleUsersSaving.set(true);
    this.service.replaceRoleUsers(role.roleId, this.selectedAccountIds(), this.selectedTenantId() || undefined).subscribe({
      next: () => {
        this.roleUsersSaving.set(false);
        this.toast.success('Role mappings updated successfully.');
        this.closeMapUsersModal();
        this.loadRoles();
      },
      error: (err) => {
        this.roleUsersSaving.set(false);
        const serverMessage = String(err?.error?.message || '').trim();
        this.toast.error(serverMessage || 'Failed to update role mappings.');
      },
    });
  }

  private openCloneRoleModal(roleId: string): void {
    const sourceRole = this.roles().find((item) => item._id === roleId);
    if (!sourceRole) {
      this.toast.error('Failed to prepare role copy.');
      return;
    }

    this.editingRoleId.set(null);
    this.cloneSeed.set({
      name: `${sourceRole.name} Copy`,
      description: sourceRole.description || '',
      permissionKeys: [...(sourceRole.permissionKeys || [])],
    });
    this.roleFormModalOpen.set(true);
  }

  private navigateToRoleMatrix(roleId: string): void {
    const path = this.platformMode() ? ['/settings/tenant-roles/matrix'] : ['/saas-admin/roles/matrix'];
    this.router.navigate(path, {
      queryParams: {
        id: roleId,
        ...(this.platformMode() && this.selectedTenantId() ? { tenantId: this.selectedTenantId() } : {}),
      },
    });
  }

  private toggleRoleStatus(role: RoleRow): void {
    const nextStatus = role.status === 'ACTIVE' ? RoleStatus.INACTIVE : RoleStatus.ACTIVE;
    this.service.updateRole(role.roleId, { status: nextStatus }, this.selectedTenantId() || undefined).subscribe({
      next: () => {
        this.toast.success(`Role ${nextStatus === 'ACTIVE' ? 'activated' : 'deactivated'} successfully.`);
        this.loadRoles();
      },
      error: () => {
        this.toast.error('Failed to update role status.');
      },
    });
  }

  private deleteRole(role: RoleRow): void {
    if (role.isSystem === 'Yes') {
      this.toast.error(this.translate.instant('saas.admin.roles.err_system_role_delete'));
      return;
    }

    this.service.deleteRole(role.roleId, this.selectedTenantId() || undefined).subscribe({
      next: () => {
        this.toast.success(this.translate.instant('saas.admin.roles.msg_delete_success'));
        this.loadRoles();
        this.loadQuota();
      },
      error: (err) => {
        const serverMessage: string = err?.error?.message || '';
        if (serverMessage === 'role_in_use') {
          this.toast.error(this.translate.instant('saas.admin.roles.err_role_in_use'));
        } else {
          this.toast.error(this.translate.instant('saas.admin.roles.msg_delete_failed'));
        }
      },
    });
  }

  private openMapUsersModal(role: RoleRow): void {
    this.isBootstrappingMapSelection = true;
    this.selectedRoleForUsers.set(role);
    this.mapUsersModalOpen.set(true);
    this.roleUsersLoading.set(true);

    this.service.listUsers(1, 500, undefined, undefined, this.selectedTenantId() || undefined).subscribe({
      next: (usersResponse) => {
        const users = usersResponse.users.map((user) => ({
          _id: user._id,
          fullName: user.fullName,
          email: user.email,
          status: user.status,
        }));
        this.availableAccounts.set(users);

        this.service.getRoleUsers(role.roleId, this.selectedTenantId() || undefined).subscribe({
          next: (mappedUsers) => {
            this.selectedAccountIds.set(mappedUsers.map((user) => user._id));
            this.roleUsersLoading.set(false);
            this.syncMapTableSelection(0);
          },
          error: () => {
            this.roleUsersLoading.set(false);
            this.isBootstrappingMapSelection = false;
            this.toast.error('Failed to load mapped accounts.');
          },
        });
      },
      error: () => {
        this.roleUsersLoading.set(false);
        this.isBootstrappingMapSelection = false;
        this.toast.error('Failed to load accounts.');
      },
    });
  }

  private openViewUsersModal(role: RoleRow): void {
    this.selectedRoleForUsers.set(role);
    this.viewUsersModalOpen.set(true);
    this.roleUsersLoading.set(true);

    this.service.getRoleUsers(role.roleId, this.selectedTenantId() || undefined).subscribe({
      next: (mappedUsers) => {
        this.mappedAccounts.set(mappedUsers.map((user) => ({
          _id: user._id,
          fullName: user.fullName,
          email: user.email,
          status: user.status,
        })));
        this.roleUsersLoading.set(false);
      },
      error: () => {
        this.mappedAccounts.set([]);
        this.roleUsersLoading.set(false);
        this.toast.error('Failed to load mapped accounts.');
      },
    });
  }

  private loadTenantOptions(): void {
    this.saasAccountService.listAccounts({ page: 1, limit: 200 }).subscribe({
      next: (response) => {
        this.tenantOptions.set(
          response.data.map((account) => ({
            value: account.tenantCode,
            label: `${account.accountName} (${account.tenantCode})`,
          })),
        );
      },
      error: () => {
        this.tenantOptions.set([]);
        this.toast.error('Failed to load tenants.');
      },
    });
  }

  private syncMapTableSelection(attempt: number): void {
    setTimeout(() => {
      const table = this.mapAccountsTable;
      if (!table) {
        return;
      }

      // Wait until table has received the modal rows before selecting.
      if (table.rows.length !== this.availableAccounts().length) {
        if (attempt < 8) {
          this.syncMapTableSelection(attempt + 1);
          return;
        }
      }

      const selectedIds = new Set(this.selectedAccountIds());
      this.isApplyingMapSelection = true;
      this.availableAccounts().forEach((account, index) => {
        table.toggleRowSelection(account, index, selectedIds.has(account._id));
      });
      this.isApplyingMapSelection = false;
      this.isBootstrappingMapSelection = false;
    });
  }
}
