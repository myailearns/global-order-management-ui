import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { GomButtonComponent } from '@gomlibs/ui';
import { TenantAccessService } from '../services';
import { TenantAdminSummary } from '../models';

@Component({
  selector: 'gom-tenant-dashboard',
  standalone: true,
  imports: [CommonModule, TranslateModule, GomButtonComponent],
  templateUrl: './tenant-dashboard.component.html',
  styleUrl: './tenant-dashboard.component.scss',
})
export class TenantDashboardComponent implements OnInit {
  private readonly service = inject(TenantAccessService);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);

  readonly loading = signal(false);
  readonly usersCount = signal(0);
  readonly employeesCount = signal(0);
  readonly rolesCount = signal(0);
  readonly summary = signal<TenantAdminSummary | null>(null);

  readonly cards = computed(() => [
    { 
      title: this.translate.instant('saas.admin.dashboard.card_users'), 
      value: this.usersCount(), 
      action: () => this.router.navigate(['/saas-admin/users']) 
    },
    { 
      title: this.translate.instant('saas.admin.dashboard.card_employees'), 
      value: this.employeesCount(), 
      action: () => this.router.navigate(['/saas-admin/employees']) 
    },
    { 
      title: this.translate.instant('saas.admin.dashboard.card_roles'), 
      value: this.rolesCount(), 
      action: () => this.router.navigate(['/saas-admin/roles']) 
    },
  ]);

  ngOnInit(): void {
    this.loadSummary();
  }

  private loadSummary(): void {
    this.loading.set(true);

    this.service.getTenantAdminSummary().subscribe({
      next: (summary) => {
        this.summary.set(summary);
        this.usersCount.set(summary.counts.users);
        this.employeesCount.set(summary.counts.employees);
        this.rolesCount.set(summary.counts.roles);
        this.loading.set(false);
      },
      error: () => {
        this.summary.set(null);
        this.usersCount.set(0);
        this.employeesCount.set(0);
        this.rolesCount.set(0);
        this.loading.set(false);
      },
    });
  }
}
