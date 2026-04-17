import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { AuthSessionService } from '../../../core/auth/auth-session.service';

@Component({
  selector: 'gom-auth-landing',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './auth-landing.component.html',
  styleUrl: './auth-landing.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthLandingComponent implements OnInit {
  private readonly authSession = inject(AuthSessionService);
  private readonly router = inject(Router);

  ngOnInit(): void {
    void this.router.navigateByUrl(this.authSession.getLandingRoute(), { replaceUrl: true });
  }
}
