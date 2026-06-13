import { Directive, DoCheck, ElementRef, HostListener, Input, inject } from '@angular/core';

import { AuthSessionService } from '../../core/auth/auth-session.service';

@Directive({
  selector: '[gomDisableIfNoFeature],[gomDisableIfNoCapability]',
  standalone: true,
})
export class DisableIfNoFeatureDirective implements DoCheck {
  private readonly authSession = inject(AuthSessionService);
  private readonly host = inject(ElementRef<HTMLElement>);

  private lastAllowed = true;
  private previousDisabledState = false;

  @Input('gomDisableIfNoFeature') requiredFeatures: string | string[] = [];
  @Input() gomDisableIfNoFeatureMode: 'any' | 'all' = 'any';
  @Input() gomDisableIfNoCapability: string | null = null;

  ngDoCheck(): void {
    const allowed = this.checkAllowed();
    if (allowed === this.lastAllowed) {
      return;
    }

    this.lastAllowed = allowed;
    const hostAny = this.host.nativeElement as HTMLElement & { disabled?: boolean };

    if (!allowed) {
      this.previousDisabledState = !!hostAny.disabled;
      hostAny.disabled = true;
      this.host.nativeElement.setAttribute('aria-disabled', 'true');
      this.host.nativeElement.classList.add('gom-disabled-by-permission');
      return;
    }

    hostAny.disabled = this.previousDisabledState;
    this.host.nativeElement.removeAttribute('aria-disabled');
    this.host.nativeElement.classList.remove('gom-disabled-by-permission');
  }

  @HostListener('click', ['$event'])
  onClick(event: Event): void {
    if (!this.lastAllowed) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }

  private checkAllowed(): boolean {
    const requiredCapability = String(this.gomDisableIfNoCapability || '').trim();
    const capabilityAllowed = requiredCapability ? this.authSession.canWrite(requiredCapability as never) : true;

    const keys = Array.isArray(this.requiredFeatures)
      ? this.requiredFeatures
      : [this.requiredFeatures];

    const normalized = keys.map((item) => String(item || '').trim()).filter(Boolean);
    if (normalized.length === 0) {
      return capabilityAllowed;
    }

    if (this.gomDisableIfNoFeatureMode === 'all') {
      return capabilityAllowed && normalized.every((key) => this.authSession.hasFeature(key));
    }

    return capabilityAllowed && normalized.some((key) => this.authSession.hasFeature(key));
  }
}
