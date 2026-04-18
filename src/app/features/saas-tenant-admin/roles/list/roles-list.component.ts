import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { GomAlertToastService } from '@gomlibs/ui';
import { AuthSessionService } from '../../../../core/auth/auth-session.service';
import { GomButtonComponent, GomSelectComponent, GomSelectOption } from '@gomlibs/ui';
import { GomTableColumn, GomTableComponent, GomTableRow } from '@gomlibs/ui';
import { TenantAccessService } from '../../services';
import { RoleStatus, RoleWithPermissions } from '../../models';
import { SaasAccountService } from '../../../saas-platform/accounts/saas-account.service';

interface RoleRow extends GomTableRow {
  roleId: string;
  roleName: string;
  roleKey: string;
  permissionCount: number;
  status: string;
  isSystem: string;
}

@Component({
  selector: 'gom-roles-list',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, GomButtonComponent, GomSelectComponent, GomTableComponent],
  templateUrl: './roles-list.component.html',
  styleUrl: './roles-list.component.scss',
})
export class RolesListComponent implements OnInit {
  private readonly service = inject(TenantAccessService);
  private readonly saasAccountService = inject(SaasAccountService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(GomAlertToastService);
  private readonly authSession = inject(AuthSessionService);

  readonly loading = signal(false);
  readonly canWrite = computed(() => this.authSession.canWrite('tenant-admin'));
  readonly roles = signal<RoleWithPermissions[]>([]);
  readonly platformMode = signal(false);
  readonly tenantOptions = signal<GomSelectOption[]>([]);
  readonly selectedTenantId = signal('');

  readonly canLoadRoles = computed(() => !this.platformMode() || !!this.selectedTenantId().trim());

  readonly rows = computed<RoleRow[]>(() =>
    this.roles().map((role) => ({
      roleId: role._id,
      roleName: role.name,
      roleKey: role.roleKey,
      permissionCount: role.permissionKeys?.length || 0,
      status: role.status,
      isSystem: role.isSystem ? 'Yes' : 'No',
    }))
  );

  readonly columns = computed<GomTableColumn<RoleRow>[]>(() => {
    const baseColumns: GomTableColumn<RoleRow>[] = [
      { key: 'roleName', header: 'Role Name', sortable: true, width: '16rem' },
      { key: 'roleKey', header: 'Role Key', sortable: true, width: '14rem' },
      { key: 'permissionCount', header: 'Features', sortable: true, width: '10rem' },
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
        width: '22rem',
        actionButtons: [
          { label: 'Edit Matrix', actionKey: 'edit', variant: 'secondary', icon: 'ri-pencil-line' },
          { label: 'Clone', actionKey: 'clone', variant: 'secondary', icon: 'ri-file-copy-line' },
          {
            label: (row) => (row.status === 'ACTIVE' ? 'Deactivate' : 'Activate'),
            actionKey: 'toggle-status',
            variant: 'danger',
            icon: (row) => (row.status === 'ACTIVE' ? 'ri-forbid-2-line' : 'ri-check-line'),
          },
        ],
      },
    ];
  });

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

  onTenantSelect(tenantId: string): void {
    this.selectedTenantId.set(String(tenantId || '').trim());
    this.loadRoles();
  }

  createRole(): void {
    if (!this.canWrite()) {
      return;
    }
    const queryParams = this.platformMode() && this.selectedTenantId() ? { tenantId: this.selectedTenantId() } : undefined;
    const path = this.platformMode() ? ['/settings/tenant-roles/matrix'] : ['/saas-admin/roles/matrix'];
    this.router.navigate(path, { queryParams });
  }

  openPlatformTenantRoles(): void {
    this.router.navigate(['/settings/tenant-roles']);
  }

  onTableAction(event: { actionKey: string; row: RoleRow }): void {
    if (!this.canWrite()) {
      return;
    }
    if (event.actionKey === 'edit') {
      const path = this.platformMode() ? ['/settings/tenant-roles/matrix'] : ['/saas-admin/roles/matrix'];
      this.router.navigate(path, {
        queryParams: {
          id: event.row.roleId,
          ...(this.platformMode() && this.selectedTenantId() ? { tenantId: this.selectedTenantId() } : {}),
        },
      });
      return;
    }

    if (event.actionKey === 'clone') {
      this.cloneRole(event.row.roleId, event.row.roleKey);
      return;
    }

    if (event.actionKey === 'toggle-status') {
      const nextStatus = event.row.status === 'ACTIVE' ? RoleStatus.INACTIVE : RoleStatus.ACTIVE;
      this.service.updateRole(event.row.roleId, { status: nextStatus }, this.selectedTenantId() || undefined).subscribe({
        next: () => {
          this.toast.success(`Role ${nextStatus === 'ACTIVE' ? 'activated' : 'deactivated'} successfully.`);
          this.loadRoles();
        },
        error: () => {
          this.toast.error('Failed to update role status.');
        },
      });
    }
  }

  private cloneRole(roleId: string, roleKey: string): void {
    const newRoleKey = prompt('Enter new role key', `${roleKey}_copy`);
    if (!newRoleKey) {
      return;
    }

    const newRoleName = prompt('Enter new role name', `${newRoleKey} role`);
    if (!newRoleName) {
      return;
    }

    this.service.cloneRole(roleId, newRoleKey.trim().toLowerCase(), newRoleName.trim(), this.selectedTenantId() || undefined).subscribe({
      next: () => {
        this.toast.success('Role cloned successfully.');
        this.loadRoles();
      },
      error: () => {
        this.toast.error('Failed to clone role.');
      },
    });
  }

  private loadTenantOptions(): void {
    this.saasAccountService.listAccounts(1, 200).subscribe({
      next: (response) => {
        this.tenantOptions.set(
          response.items.map((account) => ({
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
}
