import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { GomButtonComponent } from '@gomlibs/ui';

@Component({
  selector: 'gom-access-denied',
  standalone: true,
  imports: [CommonModule, TranslateModule, GomButtonComponent],
  templateUrl: './access-denied.component.html',
  styleUrl: './access-denied.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccessDeniedComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authSession = inject(AuthSessionService);

  readonly reasonKey = computed(() => {
    const reason = this.route.snapshot.queryParamMap.get('reason') ?? 'generic';
    if (reason === 'actor_mismatch') {
      return 'auth.denied.reason_actor_mismatch';
    }

    if (reason === 'feature_disabled') {
      return 'auth.denied.reason_feature_disabled';
    }

    return 'auth.denied.reason_generic';
  });

  navigateHome(): void {
    void this.router.navigateByUrl(this.authSession.getLandingRoute());
  }

  logout(): void {
    this.authSession.logout();
    void this.router.navigateByUrl('/auth', { replaceUrl: true });
  }
}
