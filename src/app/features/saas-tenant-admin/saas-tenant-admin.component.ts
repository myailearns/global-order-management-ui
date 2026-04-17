import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

/**
 * EPIC 3 UI - Tenant Admin Shell Container
 * Provides routing outlet for all saas-tenant-admin feature screens
 */
@Component({
  selector: 'gom-saas-tenant-admin',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="gom-saas-tenant-admin">
      <router-outlet></router-outlet>
    </div>
  `,
  styleUrl: './saas-tenant-admin.component.scss',
})
export class SaasTenantAdminComponent {}
