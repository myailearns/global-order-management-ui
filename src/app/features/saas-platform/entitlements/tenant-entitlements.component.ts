import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { GomAlertToastService } from '@gomlibs/ui';
import { GomButtonComponent, GomSelectComponent, GomSelectOption, GomTextareaComponent } from '@gomlibs/ui';
import { SaasAccountService } from '../accounts/saas-account.service';
import { EntitlementsService } from './entitlements.service';
import { EffectiveFeaturesResult, TenantEntitlement } from './entitlements.model';

@Component({
  selector: 'gom-tenant-entitlements',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, TranslateModule, GomButtonComponent, GomSelectComponent, GomTextareaComponent],
  templateUrl: './tenant-entitlements.component.html',
  styleUrl: './tenant-entitlements.component.scss',
})
export class TenantEntitlementsComponent {
  private readonly service = inject(EntitlementsService);
  private readonly saasAccountService = inject(SaasAccountService);
  private readonly toast = inject(GomAlertToastService);
  private readonly fb = inject(FormBuilder);

  readonly loading = signal(false);
  readonly entitlement = signal<TenantEntitlement | null>(null);
  readonly effective = signal<EffectiveFeaturesResult | null>(null);
  readonly tenantOptions = signal<GomSelectOption[]>([]);
  readonly packageOptions = signal<GomSelectOption[]>([]);
  readonly featureOptions = signal<GomSelectOption[]>([]);
  readonly packageFeatureKeysByPlan = signal<Record<string, string[]>>({});
  readonly selectedPackagePlanId = signal('');
  readonly tenantPlanByCode = signal<Record<string, string>>({});

  readonly addOnFeatureOptions = computed<GomSelectOption[]>(() => {
    const packagePlanId = this.selectedPackagePlanId().trim().toUpperCase();
    const includedKeys = new Set(
      (this.packageFeatureKeysByPlan()[packagePlanId] || []).map((key) => String(key).trim().toLowerCase()),
    );

    return this.featureOptions().filter((option) => !includedKeys.has(String(option.value).trim().toLowerCase()));
  });

  readonly lookupForm = this.fb.group({
    tenantId: ['', [Validators.required]],
  });

  readonly editForm = this.fb.group({
    packagePlanId: ['', [Validators.required]],
    addOnFeatureKeys: this.fb.control<string[]>([]),
    suspendedFeatureKeys: this.fb.control<string[]>([]),
    reason: [''],
  });

  constructor() {
    this.loadTenantOptions();
    this.loadPackageOptions();
    this.loadFeatureOptions();

    this.editForm.controls.packagePlanId.valueChanges.subscribe((value) => {
      const normalizedPlanId = String(value || '').trim().toUpperCase();
      this.selectedPackagePlanId.set(normalizedPlanId);

      const includedKeys = new Set(
        (this.packageFeatureKeysByPlan()[normalizedPlanId] || []).map((key) => String(key).trim().toLowerCase()),
      );

      const currentAddOns = this.editForm.controls.addOnFeatureKeys.value || [];
      const filteredAddOns = currentAddOns.filter((key) => !includedKeys.has(String(key).trim().toLowerCase()));

      if (filteredAddOns.length !== currentAddOns.length) {
        this.editForm.patchValue({ addOnFeatureKeys: filteredAddOns }, { emitEvent: false });
      }
    });
  }

  onTenantSelect(value: string): void {
    this.lookupForm.controls.tenantId.setValue(value);
  }

  lookup(): void {
    if (this.lookupForm.invalid) {
      return;
    }

    const tenantId = String(this.lookupForm.controls.tenantId.value || '').trim();
    if (!tenantId) {
      return;
    }

    this.loading.set(true);

    this.loadEntitlementAndEffective(tenantId);
  }

  save(): void {
    const tenantId = String(this.lookupForm.controls.tenantId.value || '').trim();
    if (!tenantId || this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    const raw = this.editForm.getRawValue();
    const payload = {
      packagePlanId: String(raw.packagePlanId || '').trim().toUpperCase(),
      addOnFeatureKeys: Array.isArray(raw.addOnFeatureKeys)
        ? raw.addOnFeatureKeys.map((value) => String(value).trim().toLowerCase()).filter(Boolean)
        : [],
      customGrants: this.entitlement()?.customGrants || [],
      suspendedFeatureKeys: Array.isArray(raw.suspendedFeatureKeys)
        ? raw.suspendedFeatureKeys.map((value) => String(value).trim().toLowerCase()).filter(Boolean)
        : [],
      reason: String(raw.reason || '').trim() || undefined,
    };

    this.loading.set(true);
    this.service.upsertTenantEntitlement(tenantId, payload).subscribe({
      next: (doc) => {
        this.entitlement.set(doc);
        this.service.getEffectiveFeatures(tenantId).subscribe({
          next: (effective) => {
            this.effective.set(effective);
            this.loading.set(false);
            this.toast.success('Tenant entitlement updated');
          },
          error: () => {
            this.loading.set(false);
            this.toast.warning('Entitlement updated, but failed to refresh effective features');
          },
        });
      },
      error: (error) => {
        this.loading.set(false);
        this.toast.error(String(error?.error?.message || 'Failed to update tenant entitlement'));
      },
    });
  }

  private loadTenantOptions(): void {
    this.saasAccountService.listAccounts(1, 200).subscribe({
      next: (response) => {
        const planByCode: Record<string, string> = {};
        const options = response.items.map((account) => ({
          value: account.tenantCode,
          label: `${account.accountName} (${account.tenantCode})`,
        }));
        response.items.forEach((account) => {
          planByCode[account.tenantCode] = account.planId;
        });

        this.tenantPlanByCode.set(planByCode);
        this.tenantOptions.set(options);
      },
      error: () => {
        this.tenantPlanByCode.set({});
        this.tenantOptions.set([]);
      },
    });
  }

  private loadPackageOptions(): void {
    this.service.listPackages(1, 200).subscribe({
      next: (packages) => {
        const featureMap: Record<string, string[]> = {};
        packages.forEach((pkg) => {
          featureMap[pkg.planId] = pkg.featureKeys || [];
        });

        this.packageFeatureKeysByPlan.set(featureMap);
        this.packageOptions.set(
          packages.map((pkg) => ({
            value: pkg.planId,
            label: `${pkg.name} (${pkg.planId})`,
          })),
        );
      },
      error: () => {
        this.packageFeatureKeysByPlan.set({});
        this.packageOptions.set([]);
      },
    });
  }

  private loadFeatureOptions(): void {
    this.service.listFeatures(1, 300).subscribe({
      next: (features) => {
        this.featureOptions.set(
          features.map((feature) => ({
            value: feature.featureKey,
            label: `${feature.displayName} (${feature.featureKey})`,
          })),
        );
      },
      error: () => {
        this.featureOptions.set([]);
      },
    });
  }

  private loadEntitlementAndEffective(tenantId: string): void {
    this.service.getTenantEntitlement(tenantId).subscribe({
      next: (entitlement) => {
        this.entitlement.set(entitlement);
        this.editForm.patchValue({
          packagePlanId: entitlement.packagePlanId,
          addOnFeatureKeys: entitlement.addOnFeatureKeys,
          suspendedFeatureKeys: entitlement.suspendedFeatureKeys,
          reason: '',
        });
        this.selectedPackagePlanId.set(String(entitlement.packagePlanId || '').trim().toUpperCase());

        this.service.getEffectiveFeatures(tenantId).subscribe({
          next: (effective) => {
            this.effective.set(effective);
            this.loading.set(false);
          },
          error: (error) => {
            this.loading.set(false);
            this.toast.error(String(error?.error?.message || 'Failed to resolve effective features'));
          },
        });
      },
      error: (error) => {
        const message = String(error?.error?.message || '');
        const seededPlanId = this.tenantPlanByCode()[tenantId];

        if (message.toLowerCase().includes('tenant entitlement not found') && seededPlanId) {
          this.service
            .upsertTenantEntitlement(tenantId, {
              packagePlanId: seededPlanId,
              addOnFeatureKeys: [],
              customGrants: [],
              suspendedFeatureKeys: [],
              reason: 'Auto-created on first entitlement lookup',
            })
            .subscribe({
              next: () => this.loadEntitlementAndEffective(tenantId),
              error: (upsertError) => {
                this.loading.set(false);
                this.entitlement.set(null);
                this.effective.set(null);
                this.toast.error(String(upsertError?.error?.message || 'Failed to auto-create tenant entitlement'));
              },
            });
          return;
        }

        this.loading.set(false);
        this.entitlement.set(null);
        this.effective.set(null);
        this.toast.error(String(error?.error?.message || 'Failed to load tenant entitlement'));
      },
    });
  }
}
