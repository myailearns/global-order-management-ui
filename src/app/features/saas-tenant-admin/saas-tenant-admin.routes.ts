import { Routes } from '@angular/router';
import { SaasTenantAdminComponent } from './saas-tenant-admin.component';
import { UsersListComponent } from './users/list';
import { UserInviteFormComponent } from './users/form/user-invite-form.component';
import { EmployeesListComponent } from './employees/list/employees-list.component';
import { EmployeeFormComponent } from './employees/form/employee-form.component';
import { RolesListComponent } from './roles/list/roles-list.component';
import { RoleMatrixComponent } from './roles/matrix/index';
import { TenantDashboardComponent } from './dashboard/tenant-dashboard.component';

/**
 * EPIC 3 UI - Feature module routes
 * Lazy-loaded from main app routing
 */
export const SAAS_TENANT_ADMIN_ROUTES: Routes = [
  {
    path: '',
    component: SaasTenantAdminComponent,
    children: [
      {
        path: '',
        redirectTo: 'users',
        pathMatch: 'full',
      },
      {
        path: 'users',
        component: UsersListComponent,
        data: { title: 'saas.admin.users.title' },
      },
      {
        path: 'users/invite',
        component: UserInviteFormComponent,
        data: { title: 'saas.admin.users.btn_invite' },
      },
      {
        path: 'employees',
        component: EmployeesListComponent,
        data: { title: 'saas.admin.employees.title' },
      },
      {
        path: 'employees/create',
        component: EmployeeFormComponent,
        data: { title: 'saas.admin.employees.btn_create' },
      },
      {
        path: 'roles',
        component: RolesListComponent,
        data: { title: 'saas.admin.roles.title' },
      },
      {
        path: 'roles/matrix',
        component: RoleMatrixComponent,
        data: { title: 'saas.admin.roles.title' },
      },
      {
        path: 'dashboard',
        component: TenantDashboardComponent,
        data: { title: 'saas.admin.dashboard.title' },
      },
    ],
  },
];
