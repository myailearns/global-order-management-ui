import { Directive, Input, OnChanges, OnInit, TemplateRef, ViewContainerRef, inject } from '@angular/core';

import { AppCapability } from '../../core/auth/auth-session.model';
import { AuthSessionService } from '../../core/auth/auth-session.service';

/**
 * Structural directive that conditionally renders its host only when the current
 * session has write (create/edit/delete) rights for the given capability.
 *
 * Usage:
 *   <gom-lib-button *gomIfCanWrite="'masters'" (buttonClick)="onAddNew()">Add</gom-lib-button>
 *   <div *gomIfCanWrite>always visible when authenticated (no cap check)</div>
 */
@Directive({
  selector: '[gomIfCanWrite]',
  standalone: true,
})
export class GomIfCanWriteDirective implements OnInit, OnChanges {
  @Input('gomIfCanWrite') capability?: AppCapability;

  private readonly authSession = inject(AuthSessionService);
  private readonly viewContainer = inject(ViewContainerRef);
  private readonly templateRef = inject(TemplateRef);
  private rendered = false;

  ngOnInit(): void {
    this.update();
  }

  ngOnChanges(): void {
    this.update();
  }

  private update(): void {
    const allowed = this.authSession.canWrite(this.capability);
    if (allowed && !this.rendered) {
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.rendered = true;
    } else if (!allowed && this.rendered) {
      this.viewContainer.clear();
      this.rendered = false;
    }
  }
}
