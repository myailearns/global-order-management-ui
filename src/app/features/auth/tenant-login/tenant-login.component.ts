import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { combineLatest, map, take } from 'rxjs';

import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { GomAlertToastService, GomButtonComponent, GomInputComponent } from '@gomlibs/ui';

@Component({
  selector: 'gom-tenant-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, GomButtonComponent, GomInputComponent],
  templateUrl: './tenant-login.component.html',
  styleUrl: './tenant-login.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TenantLoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authSession = inject(AuthSessionService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(GomAlertToastService);
  private readonly translate = inject(TranslateService);

  readonly submitting = signal(false);
  readonly errorMessage = signal('');
  readonly tenantCodeFromUrl = signal('');
  readonly passwordVisible = signal(false);
  readonly view = signal<'login' | 'forgot-password' | 'forgot-tenant-id'>('login');
  readonly currentYear = new Date().getFullYear();

  readonly form = this.fb.nonNullable.group({
    tenantCode: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  readonly forgotPasswordForm = this.fb.nonNullable.group({
    tenantCode: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
  });

  readonly forgotTenantIdForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  constructor() {
    combineLatest([this.route.paramMap, this.route.queryParamMap])
      .pipe(
        map(([paramMap, queryParamMap]) => paramMap.get('tenantCode') || queryParamMap.get('tenantCode') || ''),
        takeUntilDestroyed(),
      )
      .subscribe((code) => {
        const normalizedCode = String(code || '').trim();
        this.tenantCodeFromUrl.set(normalizedCode);

        if (!normalizedCode) {
          return;
        }

        this.form.patchValue({ tenantCode: normalizedCode });
        this.forgotPasswordForm.patchValue({ tenantCode: normalizedCode });
      });
  }

  openForgotPassword(): void {
    this.forgotPasswordForm.patchValue({
      email: this.form.controls.email.value,
      tenantCode: this.form.controls.tenantCode.value,
    });
    this.errorMessage.set('');
    this.view.set('forgot-password');
  }

  openForgotTenantId(): void {
    this.forgotTenantIdForm.patchValue({
      email: this.form.controls.email.value,
    });
    this.errorMessage.set('');
    this.view.set('forgot-tenant-id');
  }

  backToLogin(): void {
    this.form.patchValue({
      email: this.forgotPasswordForm.controls.email.value,
      tenantCode: this.forgotPasswordForm.controls.tenantCode.value,
    });
    if (this.forgotTenantIdForm.controls.email.value) {
      this.form.patchValue({ email: this.forgotTenantIdForm.controls.email.value });
    }
    this.errorMessage.set('');
    this.view.set('login');
  }

  togglePasswordVisibility(): void {
    this.passwordVisible.update((visible) => !visible);
  }

  submitForgotPassword(): void {
    if (this.forgotPasswordForm.invalid || this.submitting()) {
      this.forgotPasswordForm.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set('');

    this.authSession
      .forgotTenantPassword(this.forgotPasswordForm.getRawValue())
      .pipe(take(1))
      .subscribe((result) => {
        if (!result.success) {
          const fallbackMessage = 'Unable to reset the password right now.';
          const message = result.errorKey ? this.translate.instant(result.errorKey) : fallbackMessage;
          this.errorMessage.set(message);
          this.toast.error(message, this.translate.instant('auth.common.error_title'));
          this.submitting.set(false);
          return;
        }

        this.toast.success('A password reset link has been sent to the registered email address.');
        this.submitting.set(false);
        this.backToLogin();
      });
  }

  submitForgotTenantId(): void {
    if (this.forgotTenantIdForm.invalid || this.submitting()) {
      this.forgotTenantIdForm.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set('');

    this.authSession
      .forgotTenantId(this.forgotTenantIdForm.getRawValue())
      .pipe(take(1))
      .subscribe((result) => {
        if (!result.success) {
          const fallbackMessage = 'Unable to recover the tenant ID right now.';
          const message = result.errorKey ? this.translate.instant(result.errorKey) : fallbackMessage;
          this.errorMessage.set(message);
          this.toast.error(message, this.translate.instant('auth.common.error_title'));
          this.submitting.set(false);
          return;
        }

        this.toast.success('Your Tenant ID has been sent to the registered email address.');
        this.submitting.set(false);
        this.backToLogin();
      });
  }

  forgotTenantIdEmailError(): string {
    const control = this.forgotTenantIdForm.controls.email;
    if (!control.touched || !control.invalid) {
      return '';
    }

    if (control.hasError('required')) {
      return 'Email address is required.';
    }

    if (control.hasError('email')) {
      return 'Enter a valid registered email address.';
    }

    return '';
  }

  submit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set('');

    this.authSession
      .loginTenant(this.form.getRawValue())
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
