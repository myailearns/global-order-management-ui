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

  // If route declares featureKeys, tenant must have at least one to access the page.
  const routeFeatureKeys = childRoute.data['featureKeys'] as string[] | undefined;
  if (routeFeatureKeys?.length && session.actorType === 'tenant') {
    const hasAtLeastOne = routeFeatureKeys.some((key) => authSession.hasFeature(key));
    if (!hasAtLeastOne) {
      return router.createUrlTree(['/auth/access-denied'], {
        queryParams: { reason: 'feature_disabled' },
      });
    }
  }

  return true;
};
