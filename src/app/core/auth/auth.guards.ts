import { inject } from '@angular/core';
import { CanActivateChildFn, CanActivateFn, Router } from '@angular/router';

import { AuthSessionService } from './auth-session.service';
import { AppCapability, UserActor } from './auth-session.model';

export const guestOnlyGuard: CanActivateFn = () => {
  const authSession = inject(AuthSessionService);
  const router = inject(Router);

  if (!authSession.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree([authSession.getLandingRoute()]);
};

export const protectedRouteGuard: CanActivateChildFn = (childRoute, state) => {
  const authSession = inject(AuthSessionService);
  const router = inject(Router);
  const session = authSession.session();
  const actor = (childRoute.data['actor'] as UserActor | undefined) ?? 'tenant';
  const capability = childRoute.data['capability'] as AppCapability | undefined;

  if (!session) {
    return router.createUrlTree([authSession.getLoginRouteForActor(actor)], {
      queryParams: { redirectUrl: state.url },
    });
  }

  if (session.actorType !== actor) {
    return router.createUrlTree(['/auth/access-denied'], {
      queryParams: { reason: 'actor_mismatch' },
    });
  }

  if (capability && !authSession.hasCapability(capability)) {
    return router.createUrlTree(['/auth/access-denied'], {
      queryParams: { reason: 'feature_disabled' },
    });
  }

  // If route declares featureKeys, tenant must have the list permission (first key) to access the page.
  // The list permission (e.g., 'category.list') grants page access; other permissions control actions on the page.
  const routeFeatureKeys = childRoute.data['featureKeys'] as string[] | undefined;
  if (routeFeatureKeys?.length && session.actorType === 'tenant') {
    // Check if user has the first feature key, which should be the .list permission
    const listPermission = routeFeatureKeys[0];
    if (!authSession.hasFeature(listPermission)) {
      return router.createUrlTree(['/auth/access-denied'], {
        queryParams: { reason: 'feature_disabled' },
      });
    }
  }

  return true;
};
