import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { catchError, forkJoin, map, of, switchMap } from 'rxjs';

import { GomAlertToastService } from '@gomlibs/ui';
import { GomButtonComponent, GomInputComponent, GomSelectComponent, GomSelectOption } from '@gomlibs/ui';
import { RoleWithPermissions, TenantAdminSummary } from '../../models';
import { TenantAccessService } from '../../services';
import { SaasAccountService } from '../../../saas-platform/accounts/saas-account.service';

interface RoleCloneSeed {
  name: string;
  description?: string;
  permissionKeys: string[];
}

@Component({
  selector: 'gom-role-matrix',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, TranslateModule, GomButtonComponent, GomInputComponent, GomSelectComponent],
  templateUrl: './role-matrix.component.html',
  styleUrl: './role-matrix.component.scss',
})
export class RoleMatrixComponent implements OnInit, OnChanges {
  @Input() modalMode = false;
  @Input() roleIdInput: string | null = null;
  @Input() tenantIdInput: string | null = null;
  @Input() cloneSeedInput: RoleCloneSeed | null = null;

  @Output() formSaved = new EventEmitter<void>();
  @Output() formCancelled = new EventEmitter<void>();

  private readonly fb = inject(FormBuilder);
  private readonly service = inject(TenantAccessService);
  private readonly saasAccountService = inject(SaasAccountService);
  private readonly toast = inject(GomAlertToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly form = this.fb.group({
    name: ['', [Validators.required]],
    description: [''],
  });

  readonly selectedFeatures = signal<Set<string>>(new Set<string>());
  readonly loading = signal(false);
  readonly assignedUsersCount = signal(0);
  readonly summary = signal<TenantAdminSummary | null>(null);
  readonly platformMode = signal(false);
  readonly tenantOptions = signal<GomSelectOption[]>([]);
  readonly selectedTenantId = signal('');

  roleId: string | null = null;

  readonly canLoadTenantContext = computed(() => !this.platformMode() || !!this.selectedTenantId().trim());

  readonly featureOptions = computed<GomSelectOption[]>(() => {
    const permissions = this.summary()?.availablePermissions || [];
    return [...permissions]
      .sort((left, right) => (left.displayName || left.key).localeCompare(right.displayName || right.key))
      .map((perm) => ({
        value: perm.key,
        label: `${perm.displayName || perm.key} (${perm.module || 'general'})`,
      }));
  });

  readonly selectedFeatureValues = computed<string[]>(() => [...this.selectedFeatures()]);

  readonly selectedFeatureChips = computed<GomSelectOption[]>(() => {
    const labelByValue = new Map(this.featureOptions().map((item) => [item.value, item.label]));
    return [...this.selectedFeatures()]
      .sort((a, b) => a.localeCompare(b))
      .map((value) => ({
        value,
        label: labelByValue.get(value) || value,
      }));
  });

  readonly selectedCount = computed(() => this.selectedFeatures().size);

  ngOnInit(): void {
    this.initializeFormContext();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.modalMode) {
      return;
    }

    if (changes['roleIdInput'] || changes['tenantIdInput'] || changes['modalMode'] || changes['cloneSeedInput']) {
      this.initializeFormContext();
    }
  }

  private initializeFormContext(): void {
    this.platformMode.set(!!this.route.snapshot.data['platformMode']);
    this.roleId = this.modalMode
      ? this.roleIdInput
      : this.route.snapshot.queryParamMap.get('id');

    const nextTenantId = this.modalMode
      ? String(this.tenantIdInput || '').trim()
      : String(this.route.snapshot.queryParamMap.get('tenantId') || '').trim();

    this.selectedTenantId.set(nextTenantId);

    this.form.reset({
      name: '',
      description: '',
    });
    this.selectedFeatures.set(new Set());
    this.assignedUsersCount.set(0);
    this.loading.set(false);

    if (this.platformMode()) {
      this.loadTenantOptions();
      if (!this.selectedTenantId()) {
        this.summary.set(null);
        return;
      }
    }

    this.loadTenantSummary();

    if (!this.roleId || !this.canLoadTenantContext()) {
      if (this.cloneSeedInput && !this.roleId) {
        this.form.patchValue({
          name: this.cloneSeedInput.name || '',
          description: this.cloneSeedInput.description || '',
        });
        this.selectedFeatures.set(new Set(this.cloneSeedInput.permissionKeys || []));
      }
      return;
    }

    this.loadRole();
  }

  onTenantSelect(tenantId: string): void {
    const normalizedTenantId = String(tenantId || '').trim();
    this.selectedTenantId.set(normalizedTenantId);
    this.summary.set(null);
    this.selectedFeatures.set(new Set());
    this.assignedUsersCount.set(0);

    if (!normalizedTenantId) {
      return;
    }

    this.loadTenantSummary();

    if (this.roleId) {
      this.loadRole();
    }
  }

  private loadTenantSummary(): void {
    if (!this.canLoadTenantContext()) {
      this.summary.set(null);
      return;
    }

    this.service.getTenantAdminSummary(this.selectedTenantId() || undefined).subscribe({
      next: (summary) => this.summary.set(summary),
      error: () => this.summary.set(null),
    });
  }

  private loadRole(): void {
    if (!this.roleId) {
      return;
    }

    this.loading.set(true);
    this.service.getRole(this.roleId, this.selectedTenantId() || undefined).subscribe({
      next: (role) => {
        this.patchRole(role);
        this.loadAssignedUsersCount(role._id);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('Failed to load role.');
      },
    });
  }

  onSelectedFeaturesChange(values: string[]): void {
    const next = new Set((values || []).map((value) => String(value || '').trim().toLowerCase()).filter(Boolean));
    this.selectedFeatures.set(next);
  }

  grantAll(): void {
    const keys = (this.summary()?.availablePermissions || []).map((p) => p.key);
    this.selectedFeatures.set(new Set(keys));
  }

  clearAll(): void {
    this.selectedFeatures.set(new Set());
  }

  removeFeature(featureKey: string): void {
    const next = new Set(this.selectedFeatures());
    next.delete(featureKey);
    this.selectedFeatures.set(next);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.toast.error('Role name is required.');
      return;
    }

    const roleName = String(this.form.controls.name.value || '').trim();

    const payload = {
      name: roleName,
      description: this.form.controls.description.value || undefined,
      permissionKeys: [...this.selectedFeatures()],
      // Compatibility fallback for environments still enforcing roleKey on create.
      roleKey: this.roleId ? undefined : this.deriveRoleKey(roleName),
    };

    this.loading.set(true);

    if (this.roleId) {
      this.service.updateRole(this.roleId, payload, this.selectedTenantId() || undefined).subscribe({
        next: () => {
          this.loading.set(false);
          this.toast.success('Role updated successfully.');
          this.afterSaveSuccess();
        },
        error: (err) => {
          this.loading.set(false);
          this.toast.error(err?.error?.message || 'Failed to update role.');
        },
      });
      return;
    }

    this.service.createRole(payload, this.selectedTenantId() || undefined).subscribe({
      next: () => {
        this.loading.set(false);
        this.toast.success('Role created successfully.');
        this.afterSaveSuccess();
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.error(err?.error?.message || 'Failed to create role.');
      },
    });
  }

  onCancel(): void {
    if (this.modalMode) {
      this.formCancelled.emit();
      return;
    }

    this.navigateToRoleList();
  }

  openPlatformTenantRoles(): void {
    const queryParams = this.selectedTenantId() ? { tenantId: this.selectedTenantId() } : undefined;
    this.router.navigate(['/settings/tenant-roles'], { queryParams });
  }

  private patchRole(role: RoleWithPermissions): void {
    this.form.patchValue({
      name: role.name,
      description: role.description || '',
    });
    this.selectedFeatures.set(new Set(role.permissionKeys || []));
  }

  private loadAssignedUsersCount(roleId: string): void {
    this.service
      .listUsers(1, 200, undefined, undefined, this.selectedTenantId() || undefined)
      .pipe(
        switchMap((response) => {
          if (!response.users.length) {
            return of(0);
          }
          return forkJoin(
            response.users.map((user) =>
              this.service.getUserAssignments(user._id, this.selectedTenantId() || undefined).pipe(
                map((assignments) => this.hasRoleAssignment(assignments, roleId)),
                catchError(() => of(false)),
              ),
            ),
          ).pipe(map((flags) => flags.filter(Boolean).length));
        }),
      )
      .subscribe({
        next: (count) => this.assignedUsersCount.set(count),
        error: () => this.assignedUsersCount.set(0),
      });
  }

  private hasRoleAssignment(assignments: Array<{ roleId: unknown }>, roleId: string): boolean {
    return assignments.some((assignment) => {
      if (typeof assignment.roleId === 'string') {
        return assignment.roleId === roleId;
      }
      const roleRef = assignment.roleId as { _id?: string } | null;
      return roleRef?._id === roleId;
    });
  }

  private afterSaveSuccess(): void {
    if (this.modalMode) {
      this.formSaved.emit();
      return;
    }

    this.navigateToRoleList();
  }

  private navigateToRoleList(): void {
    const path = this.platformMode() ? ['/settings/tenant-roles'] : ['/saas-admin/roles'];
    const queryParams = this.platformMode() && this.selectedTenantId() ? { tenantId: this.selectedTenantId() } : undefined;
    this.router.navigate(path, { queryParams });
  }

  private loadTenantOptions(): void {
    this.saasAccountService.listAccounts({ page: 1, limit: 200 }).subscribe({
      next: (response) => {
        this.tenantOptions.set(
          response.data.map((account) => ({
            value: account.tenantCode,
            label: `${account.accountName} (${account.tenantCode})`,
          })),
        );
      },
      error: () => {
        this.tenantOptions.set([]);
        this.toast.error('Failed to load tenants.');
      },
    });
  }

  private deriveRoleKey(roleName: string): string {
    let normalized = String(roleName || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/_+/g, '_');

    while (normalized.startsWith('_')) {
      normalized = normalized.slice(1);
    }
    while (normalized.endsWith('_')) {
      normalized = normalized.slice(0, -1);
    }

    const base = normalized || 'role';
    return base.length >= 2 ? base.slice(0, 40) : `${base}_role`;
  }
}
