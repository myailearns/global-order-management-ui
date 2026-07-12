import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, switchMap } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import {
  UserWithRoles,
  UserStatus,
  UpdateUserRequest,
  CreateUserRequest,
  EmployeeProfile,
  CreateEmployeeRequest,
  UpdateEmployeeRequest,
  RoleWithPermissions,
  CreateRoleRequest,
  UpdateRoleRequest,
  UserRoleAssignment,
  ApiResponse,
  ApiListResponse,
  Permission,
  TenantAdminSummary,
  TenantDashboardSummary,
  DashboardOrdersNeedingActionResponse,
  DashboardLowStockResponse,
  DashboardOutOfStockResponse,
  DashboardTopProductsResponse,
  DashboardSlowProductsResponse,
  AnalyticsSalesTrendsResponse,
  AnalyticsContributionResponse,
  AnalyticsCustomerMixResponse,
  AnalyticsReasonSplitsResponse,
  AnalyticsChannelSplitsResponse,
  AnalyticsDemandHeatmapResponse,
  AnalyticsPromotionResponse,
} from '../models/tenant-access.model';

@Injectable({
  providedIn: 'root',
})
export class TenantAccessService {
  private readonly http = inject(HttpClient);
  private readonly authSession = inject(AuthSessionService);
  private readonly apiBaseUrl = `${environment.apiBaseUrl}/tenant-access`;

  private buildTenantHeaders(tenantId?: string): Record<string, string> {
    const headers = this.authSession.getTenantHeaders();
    if (tenantId) {
      return {
        ...headers,
        'x-tenant-id': tenantId,
      };
    }

    return headers;
  }

  getTenantAdminSummary(tenantId?: string): Observable<TenantAdminSummary> {
    return this.http
      .get<ApiResponse<TenantAdminSummary>>(`${this.apiBaseUrl}/summary`, {
        headers: this.buildTenantHeaders(tenantId),
      })
      .pipe(map((res) => res.data));
  }

  getTenantDashboardSummary(
    params?: { fromDate?: string; toDate?: string; timezone?: string; compareMode?: string },
    tenantId?: string
  ): Observable<TenantDashboardSummary> {
    let queryParams = new HttpParams();

    if (params?.fromDate) {
      queryParams = queryParams.set('fromDate', params.fromDate);
    }
    if (params?.toDate) {
      queryParams = queryParams.set('toDate', params.toDate);
    }
    if (params?.timezone) {
      queryParams = queryParams.set('timezone', params.timezone);
    }
    if (params?.compareMode) {
      queryParams = queryParams.set('compareMode', params.compareMode);
    }

    return this.http.get<TenantDashboardSummary>(`${this.apiBaseUrl}/dashboard/summary`, {
      params: queryParams,
      headers: this.buildTenantHeaders(tenantId),
    });
  }

  getDashboardOrdersNeedingAction(
    params?: { page?: number; limit?: number; fromDate?: string; toDate?: string; timezone?: string },
    tenantId?: string
  ): Observable<DashboardOrdersNeedingActionResponse> {
    let queryParams = new HttpParams();

    if (params?.page) queryParams = queryParams.set('page', params.page.toString());
    if (params?.limit) queryParams = queryParams.set('limit', params.limit.toString());
    if (params?.fromDate) queryParams = queryParams.set('fromDate', params.fromDate);
    if (params?.toDate) queryParams = queryParams.set('toDate', params.toDate);
    if (params?.timezone) queryParams = queryParams.set('timezone', params.timezone);

    return this.http.get<DashboardOrdersNeedingActionResponse>(`${this.apiBaseUrl}/dashboard/orders-needing-action`, {
      params: queryParams,
      headers: this.buildTenantHeaders(tenantId),
    });
  }

  getDashboardLowStock(
    params?: { page?: number; limit?: number; fromDate?: string; toDate?: string; timezone?: string },
    tenantId?: string
  ): Observable<DashboardLowStockResponse> {
    let queryParams = new HttpParams();

    if (params?.page) queryParams = queryParams.set('page', params.page.toString());
    if (params?.limit) queryParams = queryParams.set('limit', params.limit.toString());
    if (params?.fromDate) queryParams = queryParams.set('fromDate', params.fromDate);
    if (params?.toDate) queryParams = queryParams.set('toDate', params.toDate);
    if (params?.timezone) queryParams = queryParams.set('timezone', params.timezone);

    return this.http.get<DashboardLowStockResponse>(`${this.apiBaseUrl}/dashboard/low-stock`, {
      params: queryParams,
      headers: this.buildTenantHeaders(tenantId),
    });
  }

  getDashboardOutOfStock(
    params?: { page?: number; limit?: number },
    tenantId?: string
  ): Observable<DashboardOutOfStockResponse> {
    let queryParams = new HttpParams();
    if (params?.page) queryParams = queryParams.set('page', params.page.toString());
    if (params?.limit) queryParams = queryParams.set('limit', params.limit.toString());
    return this.http.get<DashboardOutOfStockResponse>(`${this.apiBaseUrl}/dashboard/out-of-stock`, {
      params: queryParams,
      headers: this.buildTenantHeaders(tenantId),
    });
  }

  getDashboardTopProducts(
    params?: { page?: number; limit?: number; fromDate?: string; toDate?: string; timezone?: string },
    tenantId?: string
  ): Observable<DashboardTopProductsResponse> {
    let queryParams = new HttpParams();

    if (params?.page) queryParams = queryParams.set('page', params.page.toString());
    if (params?.limit) queryParams = queryParams.set('limit', params.limit.toString());
    if (params?.fromDate) queryParams = queryParams.set('fromDate', params.fromDate);
    if (params?.toDate) queryParams = queryParams.set('toDate', params.toDate);
    if (params?.timezone) queryParams = queryParams.set('timezone', params.timezone);

    return this.http.get<DashboardTopProductsResponse>(`${this.apiBaseUrl}/dashboard/top-products`, {
      params: queryParams,
      headers: this.buildTenantHeaders(tenantId),
    });
  }

  getDashboardSlowProducts(
    params?: {
      page?: number;
      limit?: number;
      lookbackDays?: number;
      slowThreshold?: number;
      fromDate?: string;
      toDate?: string;
      timezone?: string;
    },
    tenantId?: string
  ): Observable<DashboardSlowProductsResponse> {
    let queryParams = new HttpParams();

    if (params?.page) queryParams = queryParams.set('page', params.page.toString());
    if (params?.limit) queryParams = queryParams.set('limit', params.limit.toString());
    if (params?.lookbackDays) queryParams = queryParams.set('lookbackDays', params.lookbackDays.toString());
    if (params?.slowThreshold) queryParams = queryParams.set('slowThreshold', params.slowThreshold.toString());
    if (params?.fromDate) queryParams = queryParams.set('fromDate', params.fromDate);
    if (params?.toDate) queryParams = queryParams.set('toDate', params.toDate);
    if (params?.timezone) queryParams = queryParams.set('timezone', params.timezone);

    return this.http.get<DashboardSlowProductsResponse>(`${this.apiBaseUrl}/dashboard/slow-products`, {
      params: queryParams,
      headers: this.buildTenantHeaders(tenantId),
    });
  }

  getAnalyticsSalesTrends(
    params?: { granularity?: string; compareMode?: string; fromDate?: string; toDate?: string; timezone?: string },
    tenantId?: string
  ): Observable<AnalyticsSalesTrendsResponse> {
    let queryParams = new HttpParams();

    if (params?.granularity) queryParams = queryParams.set('granularity', params.granularity);
    if (params?.compareMode) queryParams = queryParams.set('compareMode', params.compareMode);
    if (params?.fromDate) queryParams = queryParams.set('fromDate', params.fromDate);
    if (params?.toDate) queryParams = queryParams.set('toDate', params.toDate);
    if (params?.timezone) queryParams = queryParams.set('timezone', params.timezone);

    return this.http.get<AnalyticsSalesTrendsResponse>(`${this.apiBaseUrl}/analytics/sales-trends`, {
      params: queryParams,
      headers: this.buildTenantHeaders(tenantId),
    });
  }

  getAnalyticsContribution(
    params?: { fromDate?: string; toDate?: string; timezone?: string },
    tenantId?: string
  ): Observable<AnalyticsContributionResponse> {
    let queryParams = new HttpParams();
    if (params?.fromDate) queryParams = queryParams.set('fromDate', params.fromDate);
    if (params?.toDate) queryParams = queryParams.set('toDate', params.toDate);
    if (params?.timezone) queryParams = queryParams.set('timezone', params.timezone);
    return this.http.get<AnalyticsContributionResponse>(`${this.apiBaseUrl}/analytics/contribution`, {
      params: queryParams,
      headers: this.buildTenantHeaders(tenantId),
    });
  }

  getAnalyticsCustomerMix(
    params?: { granularity?: string; fromDate?: string; toDate?: string; timezone?: string },
    tenantId?: string
  ): Observable<AnalyticsCustomerMixResponse> {
    let queryParams = new HttpParams();
    if (params?.granularity) queryParams = queryParams.set('granularity', params.granularity);
    if (params?.fromDate) queryParams = queryParams.set('fromDate', params.fromDate);
    if (params?.toDate) queryParams = queryParams.set('toDate', params.toDate);
    if (params?.timezone) queryParams = queryParams.set('timezone', params.timezone);
    return this.http.get<AnalyticsCustomerMixResponse>(`${this.apiBaseUrl}/analytics/customer-mix`, {
      params: queryParams,
      headers: this.buildTenantHeaders(tenantId),
    });
  }

  getAnalyticsReasonSplits(
    params?: { fromDate?: string; toDate?: string; timezone?: string },
    tenantId?: string
  ): Observable<AnalyticsReasonSplitsResponse> {
    let queryParams = new HttpParams();
    if (params?.fromDate) queryParams = queryParams.set('fromDate', params.fromDate);
    if (params?.toDate) queryParams = queryParams.set('toDate', params.toDate);
    if (params?.timezone) queryParams = queryParams.set('timezone', params.timezone);
    return this.http.get<AnalyticsReasonSplitsResponse>(`${this.apiBaseUrl}/analytics/reason-splits`, {
      params: queryParams,
      headers: this.buildTenantHeaders(tenantId),
    });
  }

  getAnalyticsChannelSplits(
    params?: { fromDate?: string; toDate?: string; timezone?: string },
    tenantId?: string
  ): Observable<AnalyticsChannelSplitsResponse> {
    let queryParams = new HttpParams();
    if (params?.fromDate) queryParams = queryParams.set('fromDate', params.fromDate);
    if (params?.toDate) queryParams = queryParams.set('toDate', params.toDate);
    if (params?.timezone) queryParams = queryParams.set('timezone', params.timezone);
    return this.http.get<AnalyticsChannelSplitsResponse>(`${this.apiBaseUrl}/analytics/channel-splits`, {
      params: queryParams,
      headers: this.buildTenantHeaders(tenantId),
    });
  }

  getAnalyticsDemandHeatmap(
    params?: { fromDate?: string; toDate?: string; timezone?: string },
    tenantId?: string
  ): Observable<AnalyticsDemandHeatmapResponse> {
    let queryParams = new HttpParams();
    if (params?.fromDate) queryParams = queryParams.set('fromDate', params.fromDate);
    if (params?.toDate) queryParams = queryParams.set('toDate', params.toDate);
    if (params?.timezone) queryParams = queryParams.set('timezone', params.timezone);
    return this.http.get<AnalyticsDemandHeatmapResponse>(`${this.apiBaseUrl}/analytics/demand-heatmap`, {
      params: queryParams,
      headers: this.buildTenantHeaders(tenantId),
    });
  }

  getAnalyticsPromotion(
    params?: { fromDate?: string; toDate?: string; timezone?: string },
    tenantId?: string
  ): Observable<AnalyticsPromotionResponse> {
    let queryParams = new HttpParams();
    if (params?.fromDate) queryParams = queryParams.set('fromDate', params.fromDate);
    if (params?.toDate) queryParams = queryParams.set('toDate', params.toDate);
    if (params?.timezone) queryParams = queryParams.set('timezone', params.timezone);
    return this.http.get<AnalyticsPromotionResponse>(`${this.apiBaseUrl}/analytics/promotion`, {
      params: queryParams,
      headers: this.buildTenantHeaders(tenantId),
    });
  }

  /**
   * ============ Users API ============
   */

  /**
   * Create a new user in the tenant
   */
  createUser(createRequest: CreateUserRequest, tenantId?: string): Observable<UserWithRoles> {
    return this.http
      .post<ApiResponse<UserWithRoles>>(`${this.apiBaseUrl}/users`, createRequest, { headers: this.buildTenantHeaders(tenantId) })
      .pipe(map((res) => res.data));
  }

  /**
   * List all users in the tenant with pagination
   */
  listUsers(
    page = 1,
    limit = 20,
    searchTerm?: string,
    status?: UserStatus,
    tenantId?: string,
  ): Observable<{ users: UserWithRoles[]; meta: any }> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (searchTerm) {
      params = params.set('search', searchTerm);
    }

    if (status) {
      params = params.set('status', status);
    }

    return this.http
      .get<ApiListResponse<UserWithRoles>>(`${this.apiBaseUrl}/users`, { params, headers: this.buildTenantHeaders(tenantId) })
      .pipe(
        map((res) => ({
          users: res.data,
          meta: res.meta,
        })),
      );
  }

  /**
   * Get a specific user by ID
   */
  getUser(userId: string, tenantId?: string): Observable<UserWithRoles> {
    return this.http
      .get<ApiResponse<UserWithRoles>>(`${this.apiBaseUrl}/users/${userId}`, { headers: this.buildTenantHeaders(tenantId) })
      .pipe(map((res) => res.data));
  }

  /**
   * Update user profile
   */
  updateUser(userId: string, updateRequest: UpdateUserRequest, tenantId?: string): Observable<UserWithRoles> {
    return this.http
      .patch<ApiResponse<UserWithRoles>>(`${this.apiBaseUrl}/users/${userId}`, updateRequest, { headers: this.buildTenantHeaders(tenantId) })
      .pipe(map((res) => res.data));
  }

  /**
   * Lock a user account
   */
  lockUser(userId: string): Observable<UserWithRoles> {
    return this.updateUser(userId, { status: UserStatus.LOCKED });
  }

  /**
   * Unlock a user account
   */
  unlockUser(userId: string): Observable<UserWithRoles> {
    return this.updateUser(userId, { status: UserStatus.ACTIVE });
  }

  /**
   * ============ Employees API ============
   */

  /**
   * Create a new employee profile
   */
  createEmployee(createRequest: CreateEmployeeRequest, tenantId?: string): Observable<EmployeeProfile> {
    return this.http
      .post<ApiResponse<EmployeeProfile>>(`${this.apiBaseUrl}/employees`, createRequest, { headers: this.buildTenantHeaders(tenantId) })
      .pipe(map((res) => res.data));
  }

  /**
   * List all employees in the tenant
   */
  listEmployees(page = 1, limit = 20, tenantId?: string): Observable<{ employees: EmployeeProfile[]; meta: any }> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    return this.http
      .get<ApiListResponse<EmployeeProfile>>(`${this.apiBaseUrl}/employees`, { params, headers: this.buildTenantHeaders(tenantId) })
      .pipe(
        map((res) => ({
          employees: res.data,
          meta: res.meta,
        })),
      );
  }

  /**
   * Get a specific employee by ID
   */
  getEmployee(employeeId: string, tenantId?: string): Observable<EmployeeProfile> {
    return this.listEmployees(1, 200, tenantId).pipe(
      map((res) => {
        const employee = res.employees.find((item) => item._id === employeeId);
        if (!employee) {
          throw new Error('Employee not found');
        }
        return employee;
      }),
    );
  }

  /**
   * Update employee profile
   */
  updateEmployee(
    employeeId: string,
    updateRequest: UpdateEmployeeRequest,
    tenantId?: string,
  ): Observable<EmployeeProfile> {
    return this.http
      .patch<ApiResponse<EmployeeProfile>>(
        `${this.apiBaseUrl}/employees/${employeeId}`,
        updateRequest,
        { headers: this.buildTenantHeaders(tenantId) },
      )
      .pipe(map((res) => res.data));
  }

  /**
   * Link employee to a user account
   */
  linkEmployeeToUser(employeeId: string, userId: string | null): Observable<EmployeeProfile> {
    return this.updateEmployee(employeeId, { userId });
  }

  /**
   * ============ Roles API ============
   */

  /**
   * Create a new role
   */
  createRole(createRequest: CreateRoleRequest, tenantId?: string): Observable<RoleWithPermissions> {
    return this.http
      .post<ApiResponse<RoleWithPermissions>>(`${this.apiBaseUrl}/roles`, createRequest, { headers: this.buildTenantHeaders(tenantId) })
      .pipe(map((res) => res.data));
  }

  /**
   * List all roles in the tenant
   */
  listRoles(page = 1, limit = 200, tenantId?: string): Observable<RoleWithPermissions[]> {
    const params = new HttpParams().set('page', String(page)).set('limit', String(limit));
    return this.http
      .get<ApiListResponse<RoleWithPermissions>>(`${this.apiBaseUrl}/roles`, { params, headers: this.buildTenantHeaders(tenantId) })
      .pipe(map((res) => res.data));
  }

  /**
   * Get a specific role by ID
   */
  getRole(roleId: string, tenantId?: string): Observable<RoleWithPermissions> {
    return this.listRoles(1, 300, tenantId).pipe(
      map((roles) => {
        const role = roles.find((item) => item._id === roleId);
        if (!role) {
          throw new Error('Role not found');
        }
        return role;
      }),
    );
  }

  /**
   * Update role permissions
   */
  updateRole(roleId: string, updateRequest: UpdateRoleRequest, tenantId?: string): Observable<RoleWithPermissions> {
    return this.http
      .patch<ApiResponse<RoleWithPermissions>>(`${this.apiBaseUrl}/roles/${roleId}`, updateRequest, { headers: this.buildTenantHeaders(tenantId) })
      .pipe(map((res) => res.data));
  }

  /**
   * Clone a role (create new role based on existing)
   */
  cloneRole(roleId: string, newRoleKey: string, newRoleName: string, tenantId?: string): Observable<RoleWithPermissions> {
    return this.getRole(roleId, tenantId).pipe(
      map((role) => ({
        roleKey: newRoleKey,
        name: newRoleName,
        description: role.description,
        permissionKeys: role.permissionKeys,
      })),
      switchMap((payload) => this.createRole(payload as CreateRoleRequest, tenantId)),
    );
  }

  /**
   * ============ Assignments API ============
   */

  /**
   * Replace user roles atomically
   */
  replaceUserRoles(userId: string, roleIds: string[], tenantId?: string): Observable<UserRoleAssignment[]> {
    return this.http
      .put<ApiResponse<UserRoleAssignment[]>>(
        `${this.apiBaseUrl}/users/${userId}/assignments`,
        { roleIds },
        { headers: this.buildTenantHeaders(tenantId) },
      )
      .pipe(map((res) => res.data));
  }

  /**
   * Get role assignments for a user
   */
  getUserAssignments(userId: string, tenantId?: string): Observable<UserRoleAssignment[]> {
    return this.http
      .get<ApiResponse<UserRoleAssignment[]>>(
        `${this.apiBaseUrl}/users/${userId}/assignments`,
        { headers: this.buildTenantHeaders(tenantId) },
      )
      .pipe(map((res) => res.data));
  }

  /**
   * ============ Permissions API ============
   */

  /**
   * Get all available permissions for the tenant
   */
  listPermissions(): Observable<Permission[]> {
    return this.listRoles(1, 300).pipe(
      map((roles) => {
        const keys = new Set<string>();
        roles.forEach((role) => role.permissionKeys.forEach((key) => keys.add(key)));
        return [...keys].map((key) => {
          const [module, action] = key.split('.');
          return { key, module: module || 'general', action: action || 'view' } as Permission;
        });
      }),
    );
  }

  /**
   * Evaluate if current user has a specific permission
   */
  evaluatePermission(userId: string, permissionKey: string): Observable<{ allowed: boolean; reasonCode?: string }> {
    return this.http
      .get<ApiResponse<{ allowed: boolean; reasonCode?: string }>>(
        `${this.apiBaseUrl}/permissions/evaluate/${userId}/${encodeURIComponent(permissionKey)}`,
      )
      .pipe(map((res) => res.data));
  }
}
