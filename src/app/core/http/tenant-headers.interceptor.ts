import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { environment } from '../../../environments/environment';
import { AuthSessionService } from '../auth/auth-session.service';

const TENANT_ROUTE_PREFIXES = [
  '/categories',
  '/fields',
  '/field-groups',
  '/units',
  '/groups',
  '/variants',
  '/packs',
  '/tax-profiles',
  '/formulas',
  '/stock',
  '/customers',
  '/customers-insights',
  '/customer-groups',
  '/orders',
  '/returns',
  '/payments',
  '/riders',
  '/courier-partners',
  '/tenant-config',
  '/tenant-access',
  '/tenant/templates',
  '/media',
] as const;

function isTenantApiRequest(url: string): boolean {
  const baseUrl = String(environment.apiBaseUrl || '').trim();
  if (!baseUrl || !url.startsWith(baseUrl)) {
    return false;
  }

  const path = url.slice(baseUrl.length);
  return TENANT_ROUTE_PREFIXES.some((prefix) => path.startsWith(prefix));
}

export const tenantHeadersInterceptor: HttpInterceptorFn = (request, next) => {
  if (!isTenantApiRequest(request.url)) {
    return next(request);
  }

  const authSession = inject(AuthSessionService);
  const tenantHeaders = authSession.getTenantHeaders();

  const setHeaders: Record<string, string> = {};
  if (!request.headers.has('x-tenant-id') && tenantHeaders['x-tenant-id']) {
    setHeaders['x-tenant-id'] = tenantHeaders['x-tenant-id'];
  }
  if (!request.headers.has('x-user-id') && tenantHeaders['x-user-id']) {
    setHeaders['x-user-id'] = tenantHeaders['x-user-id'];
  }
  if (!request.headers.has('x-actor-id') && tenantHeaders['x-actor-id']) {
    setHeaders['x-actor-id'] = tenantHeaders['x-actor-id'];
  }

  if (Object.keys(setHeaders).length === 0) {
    return next(request);
  }

  return next(request.clone({ setHeaders }));
};
