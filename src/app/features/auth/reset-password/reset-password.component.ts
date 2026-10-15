import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { take } from 'rxjs';

import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { GomAlertToastService, GomButtonComponent, GomInputComponent } from '@gomlibs/ui';
import { PASSWORD_POLICY_REGEX } from '../../../shared/validators/password-policy';

@Component({
  selector: 'gom-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, GomButtonComponent, GomInputComponent],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResetPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authSession = inject(AuthSessionService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(GomAlertToastService);
  private readonly translate = inject(TranslateService);

  readonly loading = signal(true);
  readonly submitting = signal(false);
  readonly passwordVisible = signal(false);
  readonly confirmPasswordVisible = signal(false);
  readonly token = signal('');
  readonly linkState = signal<'loading' | 'valid' | 'expired'>('loading');
  readonly canResend = signal(false);
  readonly errorMessage = signal('');
  readonly showValidationErrors = signal(false);
  readonly currentYear = new Date().getFullYear();

  readonly form = this.fb.nonNullable.group({
    newPassword: ['', [Validators.required, Validators.minLength(8), Validators.pattern(PASSWORD_POLICY_REGEX)]],
    confirmPassword: ['', [Validators.required]],
  });

  constructor() {
    const token = this.route.snapshot.queryParamMap.get('token') || '';
    this.token.set(token);
    this.validateToken();
  }

  togglePasswordVisibility(): void {
    this.passwordVisible.update((visible) => !visible);
  }

  toggleConfirmPasswordVisibility(): void {
    this.confirmPasswordVisible.update((visible) => !visible);
  }

  submit(): void {
    if (this.form.invalid || this.submitting()) {
      this.showValidationErrors.set(true);
      this.form.markAllAsTouched();
      return;
    }

    const { newPassword, confirmPassword } = this.form.getRawValue();
    if (newPassword !== confirmPassword) {
      const message = 'New password and confirmation must match.';
      this.errorMessage.set(message);
      this.showValidationErrors.set(true);
      this.toast.error(message, this.translate.instant('auth.common.error_title'));
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set('');

    this.authSession
      .resetTenantPassword({ token: this.token(), newPassword })
      .pipe(take(1))
      .subscribe((result) => {
        if (!result.success) {
          if (result.errorKey === 'auth.errors.reset_link_invalid_or_expired') {
            this.linkState.set('expired');
            this.canResend.set(true);
          }

          const fallbackMessage = 'Unable to reset the password right now.';
          const message = result.errorKey ? this.translate.instant(result.errorKey) : fallbackMessage;
          this.errorMessage.set(message);
          this.toast.error(message, this.translate.instant('auth.common.error_title'));
          this.submitting.set(false);
          return;
        }

        this.toast.success('Password reset successful. Please sign in with your new password.');
        this.submitting.set(false);
        void this.router.navigate(['/tenant-login'], { replaceUrl: true });
      });
  }

  resendLink(): void {
    if (!this.token() || this.submitting()) {
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set('');

    this.authSession
      .resendTenantPasswordResetLink({ token: this.token() })
      .pipe(take(1))
      .subscribe((result) => {
        if (!result.success) {
          const fallbackMessage = 'Unable to resend the reset link right now.';
          const message = result.errorKey ? this.translate.instant(result.errorKey) : fallbackMessage;
          this.errorMessage.set(message);
          this.toast.error(message, this.translate.instant('auth.common.error_title'));
          this.submitting.set(false);
          return;
        }

        this.toast.success('A fresh reset link has been sent to your registered email address.');
        this.submitting.set(false);
      });
  }

  backToLogin(): void {
    void this.router.navigate(['/tenant-login']);
  }

  fieldError(controlName: 'newPassword' | 'confirmPassword'): string {
    const control = this.form.controls[controlName];
    if (!control || (!control.touched && !this.showValidationErrors())) {
      return '';
    }

    if (control.hasError('required')) {
      return 'This field is required.';
    }

    if (controlName === 'newPassword') {
      if (control.hasError('minlength') || control.hasError('pattern')) {
        return 'Use at least 8 characters with uppercase, lowercase, a number, and a special character.';
      }
      return '';
    }

    if (controlName === 'confirmPassword') {
      const newPassword = String(this.form.controls.newPassword.value || '');
      if (newPassword && control.value && control.value !== newPassword) {
        return 'Passwords do not match.';
      }
    }

    return '';
  }

  private validateToken(): void {
    if (!this.token()) {
      this.loading.set(false);
      this.linkState.set('expired');
      this.canResend.set(false);
      return;
    }

    this.authSession
      .validateTenantPasswordResetToken(this.token())
      .pipe(take(1))
      .subscribe((result) => {
        this.loading.set(false);
        this.canResend.set(result.canResend);
        this.linkState.set(result.valid ? 'valid' : 'expired');
      });
  }
}