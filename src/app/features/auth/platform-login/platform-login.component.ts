import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { take } from 'rxjs';

import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { GomAlertToastService } from '../../../shared/components/alert';
import { GomButtonComponent, GomInputComponent } from '../../../shared/components/form-controls';

@Component({
  selector: 'gom-platform-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslateModule, GomButtonComponent, GomInputComponent],
  templateUrl: './platform-login.component.html',
  styleUrl: './platform-login.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlatformLoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authSession = inject(AuthSessionService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(GomAlertToastService);
  private readonly translate = inject(TranslateService);

  readonly submitting = signal(false);
  readonly errorMessage = signal('');

  readonly form = this.fb.nonNullable.group({
    email: ['platform.admin@gom.dev', [Validators.required, Validators.email]],
    password: ['Platform@123', [Validators.required]],
  });

  submit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set('');

    this.authSession
      .loginPlatform(this.form.getRawValue())
      .pipe(take(1))
      .subscribe((result) => {
        if (!result.success && result.errorKey) {
          const message = this.translate.instant(result.errorKey);
          this.errorMessage.set(message);
          this.toast.error(message, this.translate.instant('auth.common.error_title'));
          this.submitting.set(false);
          return;
        }

        const redirectUrl = this.route.snapshot.queryParamMap.get('redirectUrl') || this.authSession.getLandingRoute();
        void this.router.navigateByUrl(redirectUrl, { replaceUrl: true });
      });
  }
}
