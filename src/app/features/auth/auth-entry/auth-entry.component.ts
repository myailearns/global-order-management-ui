import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { GomButtonComponent } from '../../../shared/components/form-controls';

@Component({
  selector: 'gom-auth-entry',
  standalone: true,
  imports: [CommonModule, TranslateModule, GomButtonComponent],
  templateUrl: './auth-entry.component.html',
  styleUrl: './auth-entry.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthEntryComponent {
  private readonly router = inject(Router);

  openPlatformLogin(): void {
    void this.router.navigateByUrl('/auth/platform-login');
  }

  openTenantLogin(): void {
    void this.router.navigateByUrl('/auth/tenant-login');
  }
}
