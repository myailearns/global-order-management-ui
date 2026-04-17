import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AppCapability, AuthResult, AuthSession, PlatformLoginRequest, TenantLoginRequest, UserActor } from './auth-session.model';

interface ApiResponse<TData> {
  success: boolean;
  message?: string;
  data: TData;
}

@Injectable({
  providedIn: 'root',
})
export class AuthSessionService {
  private readonly http = inject(HttpClient);
  private readonly storageKey = 'gom-auth-session';
  private readonly authApiUrl = `${environment.apiBaseUrl}/auth`;
  private readonly sessionState = signal<AuthSession | null>(this.readStoredSession());

  readonly session = this.sessionState.asReadonly();
  readonly isAuthenticated = computed(() => this.sessionState() !== null);

  loginPlatform(request: PlatformLoginRequest): Observable<AuthResult> {
    return this.http.post<ApiResponse<AuthSession>>(`${this.authApiUrl}/platform/login`, request).pipe(
      map((response) => response.data),
      tap((session) => this.setSession(this.sanitizeSession(session))),
      map(() => ({ success: true })),
      catchError(() => of({ success: false, errorKey: 'auth.errors.invalid_platform_credentials' })),
    );
  }

  loginTenant(request: TenantLoginRequest): Observable<AuthResult> {
    return this.http.post<ApiResponse<AuthSession>>(`${this.authApiUrl}/tenant/login`, request).pipe(
      map((response) => response.data),
      tap((session) => this.setSession(this.sanitizeSession(session))),
      map(() => ({ success: true })),
      catchError(() => of({ success: false, errorKey: 'auth.errors.invalid_tenant_credentials' })),
    );
  }

  refreshStoredSession(): Observable<boolean> {
    const session = this.sessionState();
    if (session?.actorType !== 'tenant' || !session?.tenantId || !session?.userId) {
      return of(true);
    }

    return this.http
      .get<ApiResponse<AuthSession>>(`${this.authApiUrl}/tenant/session`, {
        headers: this.getTenantHeaders(),
      })
      .pipe(
        map((response) => response.data),
        tap((nextSession) => this.setSession(this.sanitizeSession(nextSession))),
        map(() => true),
        catchError((error) => {
          console.error('Error refreshing tenant session:', error);
          return of(false);
        }),
      );
  }

  logout(): void {
    this.sessionState.set(null);
    localStorage.removeItem(this.storageKey);
  }

  getLandingRoute(): string {
    const session = this.sessionState();
    if (!session) {
      return '/auth';
    }

    return session.actorType === 'platform' ? '/settings/saas-accounts' : '/saas-admin/dashboard';
  }

  getLoginRouteForActor(actor: UserActor): string {
    return actor === 'platform' ? '/auth/platform-login' : '/auth/tenant-login';
  }

  hasCapability(capability?: AppCapability): boolean {
    if (!capability) {
      return true;
    }

    const session = this.sessionState();
    if (!session) {
      return false;
    }

    return session.capabilities.includes(capability);
  }

  /**
   * Returns true if the current session allows write operations (create/edit/delete)
   * for a given module capability. For Epic 3.5 this maps 1:1 to capability presence;
   * future phases will add role-permission checks here.
   */
  canWrite(capability?: AppCapability): boolean {
    return this.hasCapability(capability);
  }

  hasFeature(featureKey?: string): boolean {
    const normalized = String(featureKey || '').trim().toLowerCase();
    if (!normalized) {
      return true;
    }

    const session = this.sessionState();
    if (session?.actorType !== 'tenant') {
      return false;
    }

    const keys = Array.isArray(session.featureKeys)
      ? session.featureKeys.map((item) => String(item || '').trim().toLowerCase()).filter(Boolean)
      : [];

    return keys.includes(normalized);
  }

  getTenantHeaders(): Record<string, string> {
    const session = this.sessionState();
    if (session?.actorType !== 'tenant' || !session.tenantId) {
      return {
        'x-tenant-id': 'sthala',
        'x-user-id': 'bootstrap_saas_admin',
        'x-actor-id': 'bootstrap_saas_admin',
      };
    }

    return {
      'x-tenant-id': session.tenantId,
      'x-user-id': session.userId,
      'x-actor-id': session.userId,
    };
  }

  getPlatformHeaders(): Record<string, string> {
    const session = this.sessionState();
    return {
      'x-platform-actor': session?.userId || 'platform_super_admin_ui',
    };
  }

  private setSession(session: AuthSession): void {
    this.sessionState.set(session);
    localStorage.setItem(this.storageKey, JSON.stringify(session));
  }

  private sanitizeSession(session: AuthSession): AuthSession {
    const nextSession = { ...session };
    nextSession.initials = session.initials || this.getInitials(session.displayName);
    nextSession.featureKeys = Array.isArray(session.featureKeys)
      ? [...new Set(session.featureKeys.map((item) => String(item || '').trim().toLowerCase()).filter(Boolean))]
      : [];
    if (session.actorType === 'tenant') {
      nextSession.tenantCode = String(session.tenantCode || '').trim().toUpperCase();
      nextSession.tenantId = String(session.tenantId || '').trim().toLowerCase();
    }

    return nextSession;
  }

  private readStoredSession(): AuthSession | null {
    const stored = localStorage.getItem(this.storageKey);
    if (!stored) {
      return null;
    }

    try {
      return JSON.parse(stored) as AuthSession;
    } catch {
      localStorage.removeItem(this.storageKey);
      return null;
    }
  }

  private getInitials(displayName: string): string {
    const words = displayName
      .split(' ')
      .map((part) => part.trim())
      .filter(Boolean)
      .slice(0, 2);

    return words.map((word) => word.charAt(0).toUpperCase()).join('');
  }
}
