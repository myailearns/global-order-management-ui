import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslateModule } from '@ngx-translate/core';

import {
  GomAlertToastService,
  GomButtonComponent,
  GomCheckboxComponent,
  GomChipComponent,
  GomConfirmationModalComponent,
  GomInputComponent,
  GomSelectComponent,
  GomSwitchComponent,
} from '@gomlibs/ui';
import { EntitlementsService } from './entitlements.service';
import { BillingDurationCode, FeatureCatalogItem, PostTrialAction, TierCyclePricing, TierFeatureMap, TrialMode } from './entitlements.model';
import { toFallbackFeatureCatalogItems, toFeatureTemplateSyncPayload } from './feature-catalog.templates';

const STANDARD_CONFIG_KEYS = new Set([
  'max_count',
  'max_images',
  'max_videos',
  'max_variants',
  'max_groups',
]);

const BILLING_CYCLE_CONFIG: Array<{ code: BillingDurationCode; label: string; months: number; defaultDiscountPercent: number }> = [
  { code: '1_MONTH', label: '1 Month', months: 1, defaultDiscountPercent: 0 },
  { code: '3_MONTHS', label: '3 Months', months: 3, defaultDiscountPercent: 5 },
  { code: '6_MONTHS', label: '6 Months', months: 6, defaultDiscountPercent: 10 },
  { code: '1_YEAR', label: '1 Year', months: 12, defaultDiscountPercent: 12 },
];

@Component({
  selector: 'gom-tier-management',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    TranslateModule,
    GomButtonComponent,
    GomCheckboxComponent,
    GomChipComponent,
    GomConfirmationModalComponent,
    GomInputComponent,
    GomSelectComponent,
    GomSwitchComponent,
  ],
  template: `
    <section class="tier-page">
      <header class="tier-page__header">
        <div class="tier-page__title-wrap">
          <h1>Tier Management</h1>
          <p>Managing tiers for package: {{ packageId() }}</p>
        </div>
        <div class="tier-page__header-actions">
          <gom-lib-button
            variant="danger"
            (buttonClick)="openDeleteTierConfirm()"
            [disabled]="loading() || !activeTierId() || savingFeatures() || deletingTier()"
          >
            Delete Tier
          </gom-lib-button>
          <gom-lib-button (buttonClick)="saveActiveTier()" [disabled]="loading() || !activeTierId() || savingFeatures() || deletingTier()">
            {{ savingFeatures() ? 'Saving...' : 'Save Tier' }}
          </gom-lib-button>
        </div>
      </header>

      @if (loading()) {
      <p class="tier-page__loading">Loading tiers...</p>
      }

      @if (!loading()) {
      <section class="tier-shell">
        <div class="tier-tabs" role="tablist" aria-label="Tier tabs">
          @for (tier of tierItems(); track tier._id) {
          <button
            type="button"
            class="tier-tabs__item"
            [class.tier-tabs__item--active]="activeTierId() === tier._id"
            (click)="selectTier(tier._id)"
          >{{ tier.tierKey }}</button>
          }
          <button type="button" class="tier-tabs__add" (click)="addTier()" [disabled]="addingTier()">
            {{ addingTier() ? 'Adding...' : '+ Add New Tier' }}
          </button>
        </div>

        <section class="tier-display-name-panel">
          <gom-lib-input 
            [formControl]="tierDisplayNameControl" 
            placeholder="Enter display name (e.g., Basic, Professional, Enterprise)"
            [label]="'Tier Display Name'"
          ></gom-lib-input>
        </section>

        <section class="tier-trial-policy-panel">
          <h3>Tier Trial Policy</h3>

          <div class="tier-trial-policy-panel__switch-row" role="group" aria-label="Enable Trial For This Tier">
            <span>Enable Trial For This Tier</span>
            <gom-lib-switch
              [checked]="!!tierTrialEnabledControl.value"
              (checkedChange)="tierTrialEnabledControl.setValue($event)"
            ></gom-lib-switch>
          </div>

          <gom-lib-select
            [formControl]="tierTrialModeControl"
            label="Default Trial Mode"
            [options]="tierTrialModeOptions"
          ></gom-lib-select>

          @if (tierTrialModeControl.value !== 'NONE') {
          <gom-lib-input
            [formControl]="tierTrialDurationControl"
            type="number"
            label="Default Trial Duration (Days)"
          ></gom-lib-input>
          }

          <gom-lib-select
            [formControl]="tierPostTrialActionControl"
            label="Post-Trial Action"
            [options]="postTrialActionOptions"
          ></gom-lib-select>

          @if (tierPostTrialActionControl.value === 'DOWNGRADE_TO_TIER') {
          <gom-lib-select
            [formControl]="tierFallbackTierControl"
            label="Fallback Tier"
            [options]="fallbackTierOptions()"
          ></gom-lib-select>
          }

          <div class="tier-trial-policy-panel__switch-row" role="group" aria-label="Allow Custom Trial Days Per Account">
            <span>Allow Custom Trial Days Per Account</span>
            <gom-lib-switch
              [checked]="!!tierAllowCustomTrialDaysControl.value"
              (checkedChange)="tierAllowCustomTrialDaysControl.setValue($event)"
            ></gom-lib-switch>
          </div>

          <div class="tier-trial-policy-panel__switch-row" role="group" aria-label="Allow Full App Trial Option">
            <span>Allow Full App Trial Option</span>
            <gom-lib-switch
              [checked]="!!tierAllowFullFeatureTrialControl.value"
              (checkedChange)="tierAllowFullFeatureTrialControl.setValue($event)"
            ></gom-lib-switch>
          </div>
        </section>

        <section class="tier-billing-policy-panel">
          <h3>Tier Billing Configuration</h3>

          <div class="tier-billing-policy-panel__grid">
            <gom-lib-input
              [formControl]="tierSetupFeeControl"
              type="number"
              label="Setup Fee"
            ></gom-lib-input>

            <gom-lib-input
              [formControl]="tierCurrencyControl"
              label="Currency"
            ></gom-lib-input>
          </div>

          <div class="tier-billing-policy-panel__cycles">
            @for (cycle of billingCycleConfig; track cycle.code) {
            <article class="tier-cycle-card">
              <div class="tier-cycle-card__header">
                <strong>{{ cycle.label }}</strong>
                <gom-lib-switch
                  [checked]="cycleEnabledControl(cycle.code).value"
                  (checkedChange)="cycleEnabledControl(cycle.code).setValue($event)"
                ></gom-lib-switch>
              </div>

              <div class="tier-cycle-card__body">
                <gom-lib-input
                  [formControl]="cycleBaseAmountControl(cycle.code)"
                  type="number"
                  label="Base Amount"
                ></gom-lib-input>

                <gom-lib-input
                  [formControl]="cycleDiscountControl(cycle.code)"
                  type="number"
                  label="Discount %"
                ></gom-lib-input>

                <gom-lib-input
                  [formControl]="cycleFinalAmountControl(cycle.code)"
                  type="number"
                  label="Final Amount"
                ></gom-lib-input>
              </div>
            </article>
            }
          </div>
        </section>

        <section class="module-chips-panel">
          <p class="module-chips-panel__label">Module Filter Chips</p>
          <div class="module-chips-panel__list">
            <button type="button" class="module-chip" [class.module-chip--active]="activeModule() === 'all'" (click)="selectModule('all')">
              <gom-lib-chip>All</gom-lib-chip>
            </button>
            @for (moduleName of moduleChipOptions(); track moduleName) {
            <button type="button" class="module-chip" [class.module-chip--active]="activeModule() === moduleName" (click)="selectModule(moduleName)">
              <gom-lib-chip>{{ moduleName }}</gom-lib-chip>
            </button>
            }
          </div>
        </section>

        <section class="feature-transfer">
          <article class="feature-transfer__column">
            <h3>Search Available Features</h3>
            <gom-lib-input [formControl]="searchControl" placeholder="Search features..."></gom-lib-input>

            <div class="feature-transfer__actions">
              <gom-lib-button variant="secondary" (buttonClick)="selectAllModuleFeatures()">Select All</gom-lib-button>
              <gom-lib-button variant="secondary" (buttonClick)="clearAllModuleFeatures()">Clear All</gom-lib-button>
            </div>

            <div class="feature-transfer__list">
              @for (feature of availableFeatures(); track feature.featureKey) {
              <label class="feature-item" (click)="$event.stopPropagation()">
                <gom-lib-checkbox
                  [label]="feature.displayName + ' (' + feature.module + ')'"
                  [formControl]="featureControl(feature.featureKey)"
                ></gom-lib-checkbox>
              </label>
              }
              @if (!availableFeatures().length) {
              <p class="feature-transfer__empty">No available features for this module/search.</p>
              }
            </div>
          </article>

          <article class="feature-transfer__column">
            <h3>Selected Features ({{ selectedFeatures().length }})</h3>

            <div class="feature-transfer__list">
              @for (feature of selectedFeatures(); track feature.featureKey) {
              <div class="feature-item feature-item--selected">
                <gom-lib-checkbox
                  [label]="feature.displayName + ' (' + feature.module + ')'"
                  [formControl]="featureControl(feature.featureKey)"
                ></gom-lib-checkbox>

                @if ((feature.filters || []).length) {
                <div class="feature-item__settings">
                  @for (filterDef of feature.filters || []; track filterDef.key) {
                  <gom-lib-input
                    type="number"
                    [label]="formatSettingLabel(filterDef.key)"
                    [formControl]="configControl(feature.featureKey, filterDef.key, filterDef.defaultValue)"
                  ></gom-lib-input>
                  }
                </div>
                }
              </div>
              }
              @if (!selectedFeatures().length) {
              <p class="feature-transfer__empty">No selected features for this tier.</p>
              }
            </div>
          </article>
        </section>

        <footer class="tier-shell__footer">
          <span>Selected: {{ selectedFeatureCount() }}</span>
        </footer>
      </section>
      }

      <gom-lib-confirmation-modal
        [(show)]="deleteTierConfirmOpen"
        [title]="deleteTierConfirmTitle"
        [message]="deleteTierConfirmMessage"
        [confirmText]="'Delete Tier'"
        [cancelText]="'Cancel'"
        [confirmVariant]="'danger'"
        [busy]="deletingTier()"
        (confirmed)="confirmDeleteTier()"
        (cancelled)="closeDeleteTierConfirm()"
      ></gom-lib-confirmation-modal>
    </section>
  `,
  styles: [`
    .tier-page {
      padding: 1rem;
      display: grid;
      gap: 1rem;
    }

    .tier-page__header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
    }

    .tier-page__title-wrap h1 {
      margin: 0;
      font-size: 1.8rem;
      line-height: 1.2;
    }

    .tier-page__title-wrap p {
      margin: 0.15rem 0 0;
      color: var(--gom-color-text-secondary, #566);
      font-size: 0.9rem;
    }

    .tier-page__header-actions {
      display: flex;
      gap: 0.5rem;
    }

    .tier-shell {
      border: 1px solid var(--gom-color-border-default, #d9e1e8);
      border-radius: 0.75rem;
      background: #fff;
      padding: 0.9rem;
      display: grid;
      gap: 0.9rem;
    }

    .tier-tabs {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      flex-wrap: wrap;
      border-bottom: 1px solid var(--gom-color-border-muted, #e6edf2);
      padding-bottom: 0.45rem;
    }

    .tier-tabs__item,
    .tier-tabs__add {
      border: none;
      background: transparent;
      padding: 0.45rem 0.7rem;
      border-radius: 0.45rem;
      cursor: pointer;
      font-weight: 600;
      color: var(--gom-color-text-secondary, #425466);
    }

    .tier-tabs__item--active {
      color: var(--gom-color-primary, #005ea6);
      background: rgba(0, 94, 166, 0.08);
    }

    .tier-tabs__add {
      margin-left: 0.35rem;
      color: var(--gom-color-primary, #005ea6);
    }

    .tier-display-name-panel {
      border: 1px solid var(--gom-color-border-muted, #e6edf2);
      border-radius: 0.6rem;
      padding: 0.65rem;
      display: flex;
      align-items: flex-end;
      gap: 0.5rem;
    }

    .tier-trial-policy-panel {
      border: 1px solid var(--gom-color-border-muted, #e6edf2);
      border-radius: 0.6rem;
      padding: 0.65rem;
      display: grid;
      gap: 0.6rem;
    }

    .tier-trial-policy-panel h3 {
      margin: 0;
      font-size: 1rem;
    }

    .tier-trial-policy-panel__switch-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.7rem;
      color: var(--gom-color-text-primary, #243b53);
      font-size: 0.92rem;
    }

    .tier-billing-policy-panel {
      border: 1px solid var(--gom-color-border-muted, #e6edf2);
      border-radius: 0.6rem;
      padding: 0.65rem;
      display: grid;
      gap: 0.6rem;
    }

    .tier-billing-policy-panel h3 {
      margin: 0;
      font-size: 1rem;
    }

    .tier-billing-policy-panel__grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 0.6rem;
    }

    .tier-billing-policy-panel__cycles {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.6rem;
    }

    .tier-cycle-card {
      border: 1px solid var(--gom-color-border-muted, #e6edf2);
      border-radius: 0.6rem;
      padding: 0.55rem;
      display: grid;
      gap: 0.45rem;
      background: #fff;
    }

    .tier-cycle-card__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.6rem;
    }

    .tier-cycle-card__body {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 0.45rem;
    }

    .module-chips-panel {
      border: 1px solid var(--gom-color-border-muted, #e6edf2);
      border-radius: 0.6rem;
      padding: 0.65rem;
      display: grid;
      gap: 0.45rem;
    }

    .module-chips-panel__label {
      margin: 0;
      font-size: 0.85rem;
      font-weight: 600;
    }

    .module-chips-panel__list {
      display: flex;
      flex-wrap: wrap;
      gap: 0.45rem;
    }

    .module-chip {
      border: none;
      background: transparent;
      padding: 0;
      cursor: pointer;
      border-radius: 999px;
    }

    .module-chip--active {
      outline: 2px solid var(--gom-color-primary, #005ea6);
      outline-offset: 1px;
    }

    .feature-transfer {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.9rem;
    }

    .feature-transfer__column {
      border: 1px solid var(--gom-color-border-muted, #e6edf2);
      border-radius: 0.6rem;
      padding: 0.65rem;
      display: flex;
      flex-direction: column;
      gap: 0.55rem;
      height: 44rem;
      min-height: 44rem;
      overflow: hidden;
    }

    .feature-transfer__column h3 {
      margin: 0;
      font-size: 1rem;
    }

    .feature-transfer__list {
      flex: 1 1 auto;
      min-height: 0;
      overflow: auto;
      display: grid;
      gap: 0.5rem;
      align-content: start;
      padding-right: 0.2rem;
    }

    .feature-transfer__actions {
      display: flex;
      gap: 0.4rem;
      flex-wrap: wrap;
    }

    .feature-item {
      border: 1px solid var(--gom-color-border-muted, #e9eef3);
      border-radius: 0.5rem;
      padding: 0.45rem;
      background: #fff;
    }

    .feature-item--selected {
      background: #fafcff;
    }

    .feature-item__settings {
      margin-top: 0.4rem;
      padding-top: 0.35rem;
      border-top: 1px dashed var(--gom-color-border-muted, #dde6ed);
      display: grid;
      gap: 0.35rem;
    }

    .feature-transfer__empty {
      margin: 0;
      color: var(--gom-color-text-secondary, #6a7a89);
      font-size: 0.9rem;
    }

    .tier-shell__footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.7rem;
      flex-wrap: wrap;
    }

    .tier-shell__footer-actions {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .tier-page__loading {
      margin: 0;
      color: var(--gom-color-text-secondary, #556);
    }

    @media (max-width: 900px) {
      .feature-transfer {
        grid-template-columns: 1fr;
      }

      .tier-billing-policy-panel__grid,
      .tier-billing-policy-panel__cycles,
      .tier-cycle-card__body {
        grid-template-columns: 1fr;
      }
    }
  `],
})
export class TierManagementComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(GomAlertToastService);
  private readonly entitlementsService = inject(EntitlementsService);
  private readonly destroyRef = inject(DestroyRef);

  readonly tierControl = new FormControl<string>('', { nonNullable: true });
  readonly tierDisplayNameControl = new FormControl<string>('', { nonNullable: true });
  readonly moduleControl = new FormControl<string>('all', { nonNullable: true });
  readonly searchControl = new FormControl<string>('', { nonNullable: true });
  readonly tierStatusControl = new FormControl<'ACTIVE' | 'INACTIVE'>('ACTIVE', { nonNullable: true });
  readonly tierTrialEnabledControl = new FormControl<boolean>(true, { nonNullable: true });
  readonly tierTrialModeControl = new FormControl<TrialMode>('PLAN_BASED_TRIAL', { nonNullable: true });
  readonly tierTrialDurationControl = new FormControl<string>('14', { nonNullable: true });
  readonly tierPostTrialActionControl = new FormControl<PostTrialAction>('SUSPEND_PREMIUM_ACCESS', { nonNullable: true });
  readonly tierFallbackTierControl = new FormControl<string>('', { nonNullable: true });
  readonly tierAllowCustomTrialDaysControl = new FormControl<boolean>(true, { nonNullable: true });
  readonly tierAllowFullFeatureTrialControl = new FormControl<boolean>(true, { nonNullable: true });
  readonly tierSetupFeeControl = new FormControl<string>('0', { nonNullable: true });
  readonly tierCurrencyControl = new FormControl<string>('INR', { nonNullable: true });

  readonly cycleEnabledControlMap: Record<BillingDurationCode, FormControl<boolean>> = {
    '1_MONTH': new FormControl<boolean>(true, { nonNullable: true }),
    '3_MONTHS': new FormControl<boolean>(true, { nonNullable: true }),
    '6_MONTHS': new FormControl<boolean>(true, { nonNullable: true }),
    '1_YEAR': new FormControl<boolean>(true, { nonNullable: true }),
  };

  readonly cycleBaseAmountControlMap: Record<BillingDurationCode, FormControl<string>> = {
    '1_MONTH': new FormControl<string>('0', { nonNullable: true }),
    '3_MONTHS': new FormControl<string>('0', { nonNullable: true }),
    '6_MONTHS': new FormControl<string>('0', { nonNullable: true }),
    '1_YEAR': new FormControl<string>('0', { nonNullable: true }),
  };

  readonly cycleDiscountControlMap: Record<BillingDurationCode, FormControl<string>> = {
    '1_MONTH': new FormControl<string>('0', { nonNullable: true }),
    '3_MONTHS': new FormControl<string>('5', { nonNullable: true }),
    '6_MONTHS': new FormControl<string>('10', { nonNullable: true }),
    '1_YEAR': new FormControl<string>('12', { nonNullable: true }),
  };

  readonly cycleFinalAmountControlMap: Record<BillingDurationCode, FormControl<string>> = {
    '1_MONTH': new FormControl<string>('0', { nonNullable: true }),
    '3_MONTHS': new FormControl<string>('0', { nonNullable: true }),
    '6_MONTHS': new FormControl<string>('0', { nonNullable: true }),
    '1_YEAR': new FormControl<string>('0', { nonNullable: true }),
  };

  readonly billingCycleConfig = BILLING_CYCLE_CONFIG;

  readonly tierTrialModeOptions = [
    { value: 'PLAN_BASED_TRIAL', label: 'Plan Based Trial' },
    { value: 'FULL_APP_TRIAL', label: 'Full App Trial' },
    { value: 'NONE', label: 'No Trial' },
  ];

  readonly postTrialActionOptions = [
    { value: 'SUSPEND_PREMIUM_ACCESS', label: 'Suspend Premium Access' },
    { value: 'DOWNGRADE_TO_TIER', label: 'Downgrade To Tier' },
    { value: 'CONVERT_TO_PAID', label: 'Convert To Paid' },
  ];

  readonly packageId = signal('');
  readonly loading = signal(false);
  readonly savingFeatures = signal(false);
  readonly addingTier = signal(false);
  readonly deletingTier = signal(false);
  readonly deleteTierConfirmOpen = signal(false);
  readonly seedingFeatureCatalog = signal(false);
  readonly tierItems = signal<TierFeatureMap[]>([]);
  readonly activeTierId = signal('');
  readonly activeModule = signal('all');
  readonly featureSearch = signal('');
  readonly features = signal<FeatureCatalogItem[]>([]);
  readonly selectedFeatureKeys = signal<string[]>([]);
  readonly selectedFeatureConfigs = signal<Record<string, Record<string, number>>>({});
  private readonly featureControlMap = new Map<string, FormControl<boolean>>();
  private readonly configControlMap = new Map<string, FormControl<string>>();
  private suppressAutoCycleBaseSync = false;

  readonly moduleOptions = computed(() => {
    const modules = [...new Set(this.selectedFeatures().map((item) => String(item.module || '').trim()).filter(Boolean))]
      .sort((left, right) => left.localeCompare(right, 'en'));
    return [{ value: 'all', label: 'All Modules' }, ...modules.map((moduleName) => ({ value: moduleName, label: moduleName }))];
  });

  readonly moduleChipOptions = computed(() => this.moduleOptions().filter((opt) => opt.value !== 'all').map((opt) => String(opt.value)));
  readonly fallbackTierOptions = computed(() => {
    const activeTierId = this.activeTierId();
    const options = this.tierItems()
      .filter((item) => item._id !== activeTierId)
      .map((item) => {
        const key = String(item.tierKey || '').trim();
        const display = String(item.displayName || '').trim();
        return {
          value: key,
          label: display ? `${display} (${key})` : key,
        };
      });

    return [{ value: '', label: 'Select Tier' }, ...options];
  });

  readonly filteredFeatures = computed(() => {
    const moduleFilter = this.activeModule();
    const query = String(this.featureSearch() || '').trim().toLowerCase();

    return this.features()
      .filter((feature) => (moduleFilter === 'all' ? true : String(feature.module || '').trim() === moduleFilter))
      .filter((feature) => {
        if (!query) {
          return true;
        }

        const displayName = String(feature.displayName || '').toLowerCase();
        const featureKey = String(feature.featureKey || '').toLowerCase();
        return displayName.includes(query) || featureKey.includes(query);
      })
      .sort((left, right) => String(left.displayName || '').localeCompare(String(right.displayName || ''), 'en'));
  });

  readonly availableFeatures = computed(() => {
    const selectedSet = new Set(this.selectedFeatureKeys());
    return this.filteredFeatures().filter((feature) => !selectedSet.has(String(feature.featureKey || '').trim().toLowerCase()));
  });

  readonly selectedFeatures = computed(() => {
    const moduleFilter = this.activeModule();
    const keySet = new Set(this.selectedFeatureKeys());
    return this.features()
      .filter((feature) => keySet.has(String(feature.featureKey || '').trim().toLowerCase()))
      .filter((feature) => (moduleFilter === 'all' ? true : String(feature.module || '').trim() === moduleFilter))
      .sort((left, right) => String(left.displayName || '').localeCompare(String(right.displayName || ''), 'en'));
  });

  readonly selectedFeatureCount = computed(() => this.selectedFeatureKeys().length);

  private applyTierPricingControls(tier: TierFeatureMap | null): void {
    const pricingByCode = new Map<BillingDurationCode, TierCyclePricing>();
    (tier?.cyclePricing || []).forEach((entry) => {
      const code = String(entry.durationCode || '').trim().toUpperCase() as BillingDurationCode;
      if (this.billingCycleConfig.some((cycle) => cycle.code === code)) {
        pricingByCode.set(code, entry);
      }
    });

    const baseOneMonthAmount = Number(pricingByCode.get('1_MONTH')?.baseAmount ?? 0);

    this.tierSetupFeeControl.setValue(String(Number(tier?.setupFee ?? 0)), { emitEvent: false });
    this.tierCurrencyControl.setValue(String(tier?.currency || 'INR').trim().toUpperCase(), { emitEvent: false });

    this.billingCycleConfig.forEach((cycle) => {
      const entry = pricingByCode.get(cycle.code);

      const derivedBaseAmount = entry?.baseAmount ?? this.roundHalfUpToTwoDecimals(baseOneMonthAmount * cycle.months);
      const derivedDiscountPercent = entry?.discountPercent ?? cycle.defaultDiscountPercent;
      const derivedEnabled = entry?.isEnabled ?? true;

      this.cycleEnabledControl(cycle.code).setValue(Boolean(derivedEnabled), { emitEvent: false });
      this.cycleBaseAmountControl(cycle.code).setValue(String(Number(derivedBaseAmount ?? 0)), { emitEvent: false });
      this.cycleDiscountControl(cycle.code).setValue(String(Number(derivedDiscountPercent ?? 0)), { emitEvent: false });
      this.recomputeCycleFinalAmount(cycle.code);
    });
  }

  private resetTierPricingControls(): void {
    this.applyTierPricingControls(null);
    this.cycleEnabledControl('1_MONTH').setValue(true, { emitEvent: false });
    this.recomputeCycleFinalAmount('1_MONTH');
  }

  ngOnInit(): void {
    this.tierControl.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((value) => this.onTierChange(value));
    this.tierDisplayNameControl.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((value) => this.onTierDisplayNameChange(value));
    this.moduleControl.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((value) => this.onModuleChange(value));
    this.searchControl.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((value) => this.onFeatureSearch(value));

    this.billingCycleConfig.forEach((cycle) => {
      this.cycleFinalAmountControl(cycle.code).disable({ emitEvent: false });
      this.cycleBaseAmountControl(cycle.code).valueChanges
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => {
          this.recomputeCycleFinalAmount(cycle.code);
          if (cycle.code === '1_MONTH') {
            this.syncCycleBaseAmountsFromOneMonth();
          }
        });
      this.cycleDiscountControl(cycle.code).valueChanges
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => this.recomputeCycleFinalAmount(cycle.code));
    });

    const id = String(this.route.snapshot.paramMap.get('packageId') || '').trim();
    this.packageId.set(id);
    this.reload();
    this.loadPackageFeatures();
  }

  cycleEnabledControl(code: BillingDurationCode): FormControl<boolean> {
    return this.cycleEnabledControlMap[code];
  }

  cycleBaseAmountControl(code: BillingDurationCode): FormControl<string> {
    return this.cycleBaseAmountControlMap[code];
  }

  cycleDiscountControl(code: BillingDurationCode): FormControl<string> {
    return this.cycleDiscountControlMap[code];
  }

  cycleFinalAmountControl(code: BillingDurationCode): FormControl<string> {
    return this.cycleFinalAmountControlMap[code];
  }

  private recomputeCycleFinalAmount(code: BillingDurationCode): void {
    const baseAmount = this.parseCurrencyOrPercent(this.cycleBaseAmountControl(code).value, 0);
    const discountPercent = this.parseCurrencyOrPercent(this.cycleDiscountControl(code).value, 0);
    const boundedDiscount = Math.max(0, Math.min(100, discountPercent));
    const finalAmount = this.roundHalfUpToTwoDecimals(baseAmount - ((baseAmount * boundedDiscount) / 100));
    this.cycleFinalAmountControl(code).setValue(String(finalAmount), { emitEvent: false });
  }

  private parseCurrencyOrPercent(rawValue: string, fallback = 0): number {
    const parsed = Number(String(rawValue || '').trim());
    if (!Number.isFinite(parsed)) {
      return fallback;
    }
    return parsed;
  }

  private roundHalfUpToTwoDecimals(value: number): number {
    return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
  }

  private syncCycleBaseAmountsFromOneMonth(): void {
    if (this.suppressAutoCycleBaseSync) {
      return;
    }

    const oneMonthBase = this.parseCurrencyOrPercent(this.cycleBaseAmountControl('1_MONTH').value, 0);
    this.suppressAutoCycleBaseSync = true;
    try {
      this.billingCycleConfig.forEach((cycle) => {
        if (cycle.code === '1_MONTH') {
          return;
        }

        const scaledBase = this.roundHalfUpToTwoDecimals(oneMonthBase * cycle.months);
        this.cycleBaseAmountControl(cycle.code).setValue(String(scaledBase), { emitEvent: false });
        this.recomputeCycleFinalAmount(cycle.code);
      });
    } finally {
      this.suppressAutoCycleBaseSync = false;
    }
  }

  reload(): void {
    const pkgId = this.packageId();
    if (!pkgId) {
      return;
    }

    this.loading.set(true);
    this.entitlementsService.listPackageTiers(pkgId).subscribe({
      next: (result) => {
        const items = result.items || [];
        this.tierItems.set(items);

        if (items.length > 0) {
          const preferredTierId = this.activeTierId() && items.some((item) => item._id === this.activeTierId())
            ? this.activeTierId()
            : items[0]._id;
          const current = items.find((item) => item._id === preferredTierId) || items[0];

          this.activeTierId.set(current._id);
          this.tierControl.setValue(current._id, { emitEvent: false });
          this.tierStatusControl.setValue((current.status || 'ACTIVE') as 'ACTIVE' | 'INACTIVE', { emitEvent: false });
          this.tierDisplayNameControl.setValue(String(current.displayName || ''), { emitEvent: false });
          this.tierTrialEnabledControl.setValue(current.trialEnabled ?? true, { emitEvent: false });
          this.tierTrialModeControl.setValue((current.defaultTrialMode || 'PLAN_BASED_TRIAL') as TrialMode, { emitEvent: false });
          this.tierTrialDurationControl.setValue(String(Number(current.defaultTrialDurationDays ?? 14)), { emitEvent: false });
          this.tierPostTrialActionControl.setValue((current.postTrialAction || 'SUSPEND_PREMIUM_ACCESS') as PostTrialAction, { emitEvent: false });
          this.tierFallbackTierControl.setValue(String(current.fallbackTierKey || ''), { emitEvent: false });
          this.tierAllowCustomTrialDaysControl.setValue(current.allowCustomTrialDays ?? true, { emitEvent: false });
          this.tierAllowFullFeatureTrialControl.setValue(current.allowFullFeatureTrial ?? true, { emitEvent: false });
          this.applyTierPricingControls(current);
          this.setSelectedFeatureKeys(Array.isArray(current.featureKeys) ? [...current.featureKeys] : []);
          this.setSelectedFeatureConfigs(this.normalizeTierFeatureConfigs(current.featureConfigs));
        } else {
          this.activeTierId.set('');
          this.tierControl.setValue('', { emitEvent: false });
          this.tierDisplayNameControl.setValue('', { emitEvent: false });
          this.tierTrialEnabledControl.setValue(true, { emitEvent: false });
          this.tierTrialModeControl.setValue('PLAN_BASED_TRIAL', { emitEvent: false });
          this.tierTrialDurationControl.setValue('14', { emitEvent: false });
          this.tierPostTrialActionControl.setValue('SUSPEND_PREMIUM_ACCESS', { emitEvent: false });
          this.tierFallbackTierControl.setValue('', { emitEvent: false });
          this.tierAllowCustomTrialDaysControl.setValue(true, { emitEvent: false });
          this.tierAllowFullFeatureTrialControl.setValue(true, { emitEvent: false });
          this.resetTierPricingControls();
          this.setSelectedFeatureKeys([]);
          this.setSelectedFeatureConfigs({});
        }

        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.toast.error(String(error?.error?.message || 'Failed to load tiers'));
      },
    });
  }

  loadPackageFeatures(): void {
    const pkgId = this.packageId();
    if (!pkgId) {
      return;
    }

    this.entitlementsService.listPackageFeatures(pkgId).subscribe({
      next: (result) => {
        const items = Array.isArray(result.items) ? result.items : [];
        if (items.length > 0) {
          this.features.set(items);
          return;
        }

        this.seedFeatureCatalogFromTemplates();
      },
      error: (error) => {
        this.toast.error(String(error?.error?.message || 'Failed to load package feature catalog'));
      },
    });
  }

  private seedFeatureCatalogFromTemplates(): void {
    if (this.seedingFeatureCatalog()) {
      return;
    }

    this.seedingFeatureCatalog.set(true);
    this.entitlementsService.syncFeatureTemplates(toFeatureTemplateSyncPayload()).subscribe({
      next: () => {
        this.seedingFeatureCatalog.set(false);
        this.toast.info('Feature catalog was empty, so the built-in module and feature templates were synced automatically.');
        this.entitlementsService.listPackageFeatures(this.packageId()).subscribe({
          next: (result) => {
            const items = Array.isArray(result.items) ? result.items : [];
            this.features.set(items.length > 0 ? items : toFallbackFeatureCatalogItems());
          },
          error: () => {
            this.features.set(toFallbackFeatureCatalogItems());
          },
        });
      },
      error: () => {
        this.seedingFeatureCatalog.set(false);
        this.features.set(toFallbackFeatureCatalogItems());
        this.toast.info('Backend feature catalog is empty. Showing the built-in module and feature template list locally until the catalog is synced.');
      },
    });
  }

  selectTier(tierId: string): void {
    this.tierControl.setValue(String(tierId || ''));
  }

  onTierChange(value: string): void {
    const nextTierId = String(value || '').trim();
    this.activeTierId.set(nextTierId);

    const tier = this.tierItems().find((item) => item._id === nextTierId);
    if (!tier) {
      return;
    }

    this.tierStatusControl.setValue((tier.status || 'ACTIVE') as 'ACTIVE' | 'INACTIVE', { emitEvent: false });
    this.tierDisplayNameControl.setValue(String(tier.displayName || ''), { emitEvent: false });
    this.tierTrialEnabledControl.setValue(tier.trialEnabled ?? true, { emitEvent: false });
    this.tierTrialModeControl.setValue((tier.defaultTrialMode || 'PLAN_BASED_TRIAL') as TrialMode, { emitEvent: false });
    this.tierTrialDurationControl.setValue(String(Number(tier.defaultTrialDurationDays ?? 14)), { emitEvent: false });
    this.tierPostTrialActionControl.setValue((tier.postTrialAction || 'SUSPEND_PREMIUM_ACCESS') as PostTrialAction, { emitEvent: false });
    this.tierFallbackTierControl.setValue(String(tier.fallbackTierKey || ''), { emitEvent: false });
    this.tierAllowCustomTrialDaysControl.setValue(tier.allowCustomTrialDays ?? true, { emitEvent: false });
    this.tierAllowFullFeatureTrialControl.setValue(tier.allowFullFeatureTrial ?? true, { emitEvent: false });
    this.applyTierPricingControls(tier);
    this.setSelectedFeatureKeys(Array.isArray(tier.featureKeys) ? [...tier.featureKeys] : []);
    this.setSelectedFeatureConfigs(this.normalizeTierFeatureConfigs(tier.featureConfigs));
    this.moduleControl.setValue('all', { emitEvent: false });
    this.activeModule.set('all');
    this.searchControl.setValue('', { emitEvent: false });
    this.featureSearch.set('');
  }

  onTierDisplayNameChange(value: string): void {
    // Display name will be saved with the tier on next save
  }

  onModuleChange(value: string): void {
    this.activeModule.set(String(value || 'all'));
  }

  selectModule(moduleName: string): void {
    this.moduleControl.setValue(String(moduleName || 'all'));
  }

  onFeatureSearch(value: string): void {
    this.featureSearch.set(String(value || ''));
  }

  isFeatureSelected(featureKey: string): boolean {
    return this.selectedFeatureKeys().includes(String(featureKey || '').trim().toLowerCase());
  }

  toggleFeature(featureKey: string, checked: boolean): void {
    const normalized = String(featureKey || '').trim().toLowerCase();
    const currentSet = new Set(this.selectedFeatureKeys());

    if (checked) {
      // When ADDING a feature, check if its dependencies are already selected
      const currentFeature = this.features().find((f) => String(f.featureKey || '').trim().toLowerCase() === normalized);
      
      if (currentFeature && Array.isArray(currentFeature.dependencyKeys) && currentFeature.dependencyKeys.length > 0) {
        const missingDependencies = currentFeature.dependencyKeys
          .map((dep) => String(dep || '').trim().toLowerCase())
          .filter((dep) => !currentSet.has(dep));
        
        if (missingDependencies.length > 0) {
          // Find the feature details for missing dependencies
          const missingFeatures = this.features().filter((f) => {
            const fKey = String(f.featureKey || '').trim().toLowerCase();
            return missingDependencies.includes(fKey);
          });
          
          const missingNames = missingFeatures.map((f) => f.displayName || f.featureKey);
          const currentDisplayName = currentFeature.displayName || featureKey;
          
          // Auto-add missing dependencies
          missingDependencies.forEach((dep) => currentSet.add(dep));
          currentSet.add(normalized);
          
          this.toast.info(
            `Added "${currentDisplayName}" and its required dependencies: ${missingNames.join(', ')}`
          );
          
          this.setSelectedFeatureKeys([...currentSet]);
          return;
        }
      }
      
      currentSet.add(normalized);
    } else {
      // Check if any selected feature depends on this feature
      const dependentFeatures = this.features()
        .filter((feature) => {
          const fKey = String(feature.featureKey || '').trim().toLowerCase();
          if (!currentSet.has(fKey) || fKey === normalized) {
            return false;
          }
          const dependencies = (feature.dependencyKeys || []).map((dep) => String(dep || '').trim().toLowerCase());
          return dependencies.includes(normalized);
        });

      if (dependentFeatures.length > 0) {
        const currentFeature = this.features().find((f) => String(f.featureKey || '').trim().toLowerCase() === normalized);
        const currentDisplayName = currentFeature?.displayName || featureKey;
        const dependentNames = dependentFeatures.map((f) => f.displayName || f.featureKey);
        
        // Automatically remove dependent features too
        dependentFeatures.forEach((feature) => {
          const fKey = String(feature.featureKey || '').trim().toLowerCase();
          currentSet.delete(fKey);
        });
        currentSet.delete(normalized);
        
        this.toast.info(
          `Removed "${currentDisplayName}" and its dependent features: ${dependentNames.join(', ')}`
        );
        
        this.setSelectedFeatureKeys([...currentSet]);
        return;
      }

      currentSet.delete(normalized);
    }

    this.setSelectedFeatureKeys([...currentSet]);
  }

  featureControl(featureKey: string): FormControl<boolean> {
    const normalized = String(featureKey || '').trim().toLowerCase();
    let control = this.featureControlMap.get(normalized);

    if (!control) {
      control = new FormControl<boolean>(this.isFeatureSelected(normalized), { nonNullable: true });
      control.valueChanges
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((checked) => this.toggleFeature(normalized, Boolean(checked)));
      this.featureControlMap.set(normalized, control);
    }

    const selected = this.isFeatureSelected(normalized);
    if (control.value !== selected) {
      control.setValue(selected, { emitEvent: false });
    }

    return control;
  }

  selectAllModuleFeatures(): void {
    const currentSet = new Set(this.selectedFeatureKeys());
    this.filteredFeatures().forEach((feature) => currentSet.add(String(feature.featureKey || '').trim().toLowerCase()));
    this.setSelectedFeatureKeys([...currentSet]);
  }

  clearAllModuleFeatures(): void {
    const moduleSet = new Set(this.filteredFeatures().map((feature) => String(feature.featureKey || '').trim().toLowerCase()));
    const remaining = this.selectedFeatureKeys().filter((featureKey) => !moduleSet.has(featureKey));
    this.setSelectedFeatureKeys(remaining);
  }

  formatSettingLabel(key: string): string {
    const normalized = String(key || '').trim().toLowerCase();
    if (normalized === 'max_count') {
      return 'Max allowed count';
    }

    return normalized.replaceAll('_', ' ');
  }

  configControl(featureKey: string, configKey: string, defaultValue: unknown): FormControl<string> {
    const normalizedFeatureKey = String(featureKey || '').trim().toLowerCase();
    const normalizedConfigKey = String(configKey || '').trim().toLowerCase();
    const mapKey = `${normalizedFeatureKey}::${normalizedConfigKey}`;

    let control = this.configControlMap.get(mapKey);
    if (!control) {
      const currentFeatureConfigs = this.selectedFeatureConfigs()[normalizedFeatureKey] || {};
      const currentValue = currentFeatureConfigs[normalizedConfigKey];
      const fallbackValue = typeof defaultValue === 'number' && Number.isFinite(defaultValue) ? String(defaultValue) : '';

      control = new FormControl<string>(currentValue !== undefined ? String(currentValue) : fallbackValue, { nonNullable: true });
      control.valueChanges
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((value) => this.onConfigChange(normalizedFeatureKey, normalizedConfigKey, value));
      this.configControlMap.set(mapKey, control);
    }

    return control;
  }

  private onConfigChange(featureKey: string, configKey: string, rawValue: string): void {
    const trimmed = String(rawValue || '').trim();
    const next = { ...this.selectedFeatureConfigs() };
    const featureConfig = next[featureKey] ? { ...next[featureKey] } : {};

    if (!trimmed) {
      delete featureConfig[configKey];
    } else {
      const numeric = Number(trimmed);
      if (!Number.isFinite(numeric)) {
        return;
      }
      featureConfig[configKey] = numeric;
    }

    if (Object.keys(featureConfig).length === 0) {
      delete next[featureKey];
    } else {
      next[featureKey] = featureConfig;
    }

    this.setSelectedFeatureConfigs(next);
  }

  private setSelectedFeatureKeys(keys: string[]): void {
    const normalized = [...new Set((keys || []).map((key) => String(key || '').trim().toLowerCase()).filter(Boolean))];
    this.selectedFeatureKeys.set(normalized);

    this.featureControlMap.forEach((control, featureKey) => {
      const selected = normalized.includes(featureKey);
      if (control.value !== selected) {
        control.setValue(selected, { emitEvent: false });
      }
    });

    const selectedSet = new Set(normalized);
    const nextConfigs = { ...this.selectedFeatureConfigs() };
    Object.keys(nextConfigs).forEach((featureKey) => {
      if (!selectedSet.has(featureKey)) {
        delete nextConfigs[featureKey];
      }
    });
    this.setSelectedFeatureConfigs(nextConfigs);

    this.configControlMap.forEach((_control, key) => {
      const featureKey = key.split('::')[0];
      if (!selectedSet.has(featureKey)) {
        this.configControlMap.delete(key);
      }
    });
  }

  private setSelectedFeatureConfigs(configs: Record<string, Record<string, number>>): void {
    const normalized: Record<string, Record<string, number>> = {};

    Object.entries(configs || {}).forEach(([featureKey, configObj]) => {
      const normalizedFeatureKey = String(featureKey || '').trim().toLowerCase();
      if (!normalizedFeatureKey || !configObj || typeof configObj !== 'object') {
        return;
      }

      const nextConfig: Record<string, number> = {};
      Object.entries(configObj).forEach(([configKey, configValue]) => {
        const normalizedConfigKey = String(configKey || '').trim().toLowerCase();
        const numeric = Number(configValue);
        if (!normalizedConfigKey || !Number.isFinite(numeric)) {
          return;
        }
        nextConfig[normalizedConfigKey] = numeric;
      });

      if (Object.keys(nextConfig).length > 0) {
        normalized[normalizedFeatureKey] = nextConfig;
      }
    });

    this.selectedFeatureConfigs.set(normalized);
  }

  private normalizeTierFeatureConfigs(rawConfigs: unknown): Record<string, Record<string, number>> {
    if (!rawConfigs || typeof rawConfigs !== 'object') {
      return {};
    }

    const normalized: Record<string, Record<string, number>> = {};
    Object.entries(rawConfigs as Record<string, unknown>).forEach(([featureKey, configValue]) => {
      if (!configValue || typeof configValue !== 'object' || Array.isArray(configValue)) {
        return;
      }

      const featureConfig: Record<string, number> = {};
      Object.entries(configValue as Record<string, unknown>).forEach(([configKey, rawValue]) => {
        const numeric = Number(rawValue);
        if (Number.isFinite(numeric)) {
          featureConfig[String(configKey || '').trim().toLowerCase()] = numeric;
        }
      });

      if (Object.keys(featureConfig).length > 0) {
        normalized[String(featureKey || '').trim().toLowerCase()] = featureConfig;
      }
    });

    return normalized;
  }

  private getNextTierKey(items: Array<{ tierKey?: string }>): string {
    const maxIndex = (items || []).reduce((max, item) => {
      const match = /^TIER_(\d{1,2})$/i.exec(String(item.tierKey || '').trim());
      if (!match) {
        return max;
      }
      return Math.max(max, Number(match[1]));
    }, 0);

    return `TIER_${maxIndex + 1}`;
  }

  addTier(): void {
    const pkgId = this.packageId();
    if (!pkgId) {
      return;
    }

    const tierKey = this.getNextTierKey(this.tierItems());

    this.addingTier.set(true);
    this.entitlementsService.createTier(pkgId, {
      tierKey,
      status: 'INACTIVE',
      setupFee: 0,
      currency: 'INR',
      trialDurationDays: 14,
      cyclePricing: [
        {
          durationCode: '1_MONTH',
          baseAmount: 0,
          discountPercent: 0,
          finalAmount: 0,
          isEnabled: true,
        },
        {
          durationCode: '3_MONTHS',
          baseAmount: 0,
          discountPercent: 5,
          finalAmount: 0,
          isEnabled: true,
        },
        {
          durationCode: '6_MONTHS',
          baseAmount: 0,
          discountPercent: 10,
          finalAmount: 0,
          isEnabled: true,
        },
        {
          durationCode: '1_YEAR',
          baseAmount: 0,
          discountPercent: 12,
          finalAmount: 0,
          isEnabled: true,
        },
      ],
      featureKeys: [],
      featureConfigs: {},
    }).subscribe({
      next: (created) => {
        this.addingTier.set(false);
        this.toast.success(`Tier ${tierKey} created`);
        this.activeTierId.set(String(created._id));
        this.reload();
      },
      error: (error) => {
        this.addingTier.set(false);
        this.toast.error(String(error?.error?.message || 'Failed to create tier'));
      },
    });
  }

  openDeleteTierConfirm(): void {
    if (!this.activeTierId()) {
      return;
    }

    this.deleteTierConfirmOpen.set(true);
  }

  closeDeleteTierConfirm(): void {
    this.deleteTierConfirmOpen.set(false);
  }

  get deleteTierConfirmTitle(): string {
    return 'Delete Tier';
  }

  get deleteTierConfirmMessage(): string {
    const activeId = this.activeTierId();
    const activeTier = this.tierItems().find((item) => item._id === activeId);
    const tierLabel = activeTier?.displayName || activeTier?.tierKey || 'this tier';
    return `Are you sure you want to delete ${tierLabel}? This action cannot be undone.`;
  }

  confirmDeleteTier(): void {
    const pkgId = this.packageId();
    const tierId = this.activeTierId();

    if (!pkgId || !tierId) {
      this.closeDeleteTierConfirm();
      return;
    }

    if ((this.tierItems() || []).length <= 1) {
      this.toast.error('At least one tier must remain in the package.');
      this.closeDeleteTierConfirm();
      return;
    }

    this.deletingTier.set(true);
    this.entitlementsService.deleteTier(pkgId, tierId).subscribe({
      next: () => {
        this.deletingTier.set(false);
        this.closeDeleteTierConfirm();
        this.toast.success('Tier deleted successfully');
        this.reload();
      },
      error: (error) => {
        this.deletingTier.set(false);
        this.toast.error(String(error?.error?.message || 'Failed to delete tier'));
      },
    });
  }

  saveActiveTier(): void {
    const pkgId = this.packageId();
    const tierId = this.activeTierId();
    if (!pkgId || !tierId) {
      return;
    }

    const normalizedConfigPayload = this.buildValidatedConfigPayload();
    if (!normalizedConfigPayload) {
      return;
    }

    const pricingPayload = this.buildTierPricingPayload();
    if (!pricingPayload) {
      return;
    }

    this.savingFeatures.set(true);
    this.entitlementsService
      .updateTierFeatures(pkgId, tierId, this.selectedFeatureKeys(), this.tierStatusControl.value)
      .subscribe({
        next: () => {
          this.entitlementsService.updateTierFeatureConfigs(pkgId, tierId, normalizedConfigPayload).subscribe({
            next: () => {
              const currentTier = this.tierItems().find((item) => item._id === tierId);
              const displayName = String(this.tierDisplayNameControl.value || '').trim();
              const trialMode = this.tierTrialModeControl.value || 'PLAN_BASED_TRIAL';
              const postTrialAction = this.tierPostTrialActionControl.value || 'SUSPEND_PREMIUM_ACCESS';
              const fallbackTierKey = postTrialAction === 'DOWNGRADE_TO_TIER'
                ? String(this.tierFallbackTierControl.value || '').trim().toUpperCase()
                : '';

              if (postTrialAction === 'DOWNGRADE_TO_TIER' && !fallbackTierKey) {
                this.savingFeatures.set(false);
                this.toast.error('Fallback tier is required when post-trial action is Downgrade To Tier');
                return;
              }

              const parsedDuration = Number(String(this.tierTrialDurationControl.value || '').trim());
              if (trialMode !== 'NONE' && (!Number.isInteger(parsedDuration) || parsedDuration < 1 || parsedDuration > 365)) {
                this.savingFeatures.set(false);
                this.toast.error('Trial duration must be an integer between 1 and 365 days');
                return;
              }

              const updatePayload = {
                displayName,
                trialEnabled: Boolean(this.tierTrialEnabledControl.value),
                defaultTrialMode: String(trialMode).trim().toUpperCase() as TrialMode,
                defaultTrialDurationDays: trialMode === 'NONE' ? null : parsedDuration,
                postTrialAction: String(postTrialAction).trim().toUpperCase() as PostTrialAction,
                fallbackTierKey: postTrialAction === 'DOWNGRADE_TO_TIER' ? fallbackTierKey : null,
                allowCustomTrialDays: Boolean(this.tierAllowCustomTrialDaysControl.value),
                allowFullFeatureTrial: Boolean(this.tierAllowFullFeatureTrialControl.value),
                setupFee: pricingPayload.setupFee,
                currency: pricingPayload.currency,
                trialDurationDays: pricingPayload.trialDurationDays,
                cyclePricing: pricingPayload.cyclePricing,
              };

              const currentCyclePricing = this.normalizeCyclePricingForCompare(currentTier?.cyclePricing || []);
              const nextCyclePricing = this.normalizeCyclePricingForCompare(pricingPayload.cyclePricing || []);

              const changed = !!currentTier && (
                String(currentTier.displayName || '') !== displayName
                || Boolean(currentTier.trialEnabled ?? true) !== updatePayload.trialEnabled
                || String(currentTier.defaultTrialMode || 'PLAN_BASED_TRIAL') !== updatePayload.defaultTrialMode
                || Number(currentTier.defaultTrialDurationDays ?? 14) !== Number(updatePayload.defaultTrialDurationDays ?? 0)
                || String(currentTier.postTrialAction || 'SUSPEND_PREMIUM_ACCESS') !== updatePayload.postTrialAction
                || String(currentTier.fallbackTierKey || '') !== String(updatePayload.fallbackTierKey || '')
                || Boolean(currentTier.allowCustomTrialDays ?? true) !== updatePayload.allowCustomTrialDays
                || Boolean(currentTier.allowFullFeatureTrial ?? true) !== updatePayload.allowFullFeatureTrial
                || Number(currentTier.setupFee ?? 0) !== Number(updatePayload.setupFee ?? 0)
                || String(currentTier.currency || 'INR').trim().toUpperCase() !== updatePayload.currency
                || Number(currentTier.trialDurationDays ?? currentTier.defaultTrialDurationDays ?? 14) !== Number(updatePayload.trialDurationDays)
                || JSON.stringify(currentCyclePricing) !== JSON.stringify(nextCyclePricing)
              );

              if (!changed) {
                this.savingFeatures.set(false);
                this.toast.success('Tier saved successfully');
                this.reload();
                return;
              }

              this.entitlementsService.updateTier(pkgId, tierId, updatePayload).subscribe({
                next: () => {
                  this.savingFeatures.set(false);
                  this.toast.success('Tier saved successfully');
                  this.reload();
                },
                error: (error) => {
                  this.savingFeatures.set(false);
                  this.toast.error(String(error?.error?.message || 'Failed to save tier trial policy'));
                },
              });
            },
            error: (error) => {
              this.savingFeatures.set(false);
              this.toast.error(String(error?.error?.message || 'Failed to save tier feature configs'));
            },
          });
        },
        error: (error) => {
          this.savingFeatures.set(false);
          this.toast.error(String(error?.error?.message || 'Failed to save tier features'));
        },
      });
  }

  private buildValidatedConfigPayload(): Record<string, Record<string, number>> | null {
    const payload: Record<string, Record<string, number>> = {};

    for (const [featureKey, configObj] of Object.entries(this.selectedFeatureConfigs())) {
      const nextConfig: Record<string, number> = {};

      for (const [configKey, configValue] of Object.entries(configObj || {})) {
        const validated = this.validateConfigEntry(featureKey, configKey, configValue);
        if (!validated) {
          return null;
        }

        nextConfig[validated.normalizedConfigKey] = validated.numeric;
      }

      if (Object.keys(nextConfig).length > 0) {
        payload[featureKey] = nextConfig;
      }
    }

    return payload;
  }

  private hasMaxTwoDecimals(value: number): boolean {
    return Math.round(value * 100) === value * 100;
  }

  private buildTierPricingPayload(): {
    setupFee: number;
    currency: string;
    trialDurationDays: number;
    cyclePricing: TierCyclePricing[];
  } | null {
    const setupFee = this.parseCurrencyOrPercent(this.tierSetupFeeControl.value, NaN);
    if (!Number.isFinite(setupFee) || setupFee < 0 || !this.hasMaxTwoDecimals(setupFee)) {
      this.toast.error('Setup fee must be a non-negative number with up to 2 decimals');
      return null;
    }

    const currency = String(this.tierCurrencyControl.value || '').trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(currency)) {
      this.toast.error('Currency must be a valid 3-letter code (example: INR)');
      return null;
    }

    const trialDurationDays = Number(String(this.tierTrialDurationControl.value || '').trim());
    if (!Number.isInteger(trialDurationDays) || trialDurationDays < 1 || trialDurationDays > 365) {
      this.toast.error('Default trial duration must be an integer between 1 and 365 days');
      return null;
    }

    const cyclePricing: TierCyclePricing[] = [];
    let hasEnabled = false;
    for (const cycle of this.billingCycleConfig) {
      const baseAmount = this.parseCurrencyOrPercent(this.cycleBaseAmountControl(cycle.code).value, NaN);
      const discountPercent = this.parseCurrencyOrPercent(this.cycleDiscountControl(cycle.code).value, NaN);

      if (!Number.isFinite(baseAmount) || baseAmount < 0 || !this.hasMaxTwoDecimals(baseAmount)) {
        this.toast.error(`${cycle.label}: base amount must be non-negative with up to 2 decimals`);
        return null;
      }

      if (!Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent > 100 || !this.hasMaxTwoDecimals(discountPercent)) {
        this.toast.error(`${cycle.label}: discount must be between 0 and 100 with up to 2 decimals`);
        return null;
      }

      const isEnabled = Boolean(this.cycleEnabledControl(cycle.code).value);
      if (isEnabled) {
        hasEnabled = true;
      }

      const finalAmount = this.roundHalfUpToTwoDecimals(baseAmount - ((baseAmount * discountPercent) / 100));
      cyclePricing.push({
        durationCode: cycle.code,
        baseAmount,
        discountPercent,
        finalAmount,
        isEnabled,
      });
    }

    if (!hasEnabled) {
      this.toast.error('At least one billing cycle must be enabled');
      return null;
    }

    return {
      setupFee: this.roundHalfUpToTwoDecimals(setupFee),
      currency,
      trialDurationDays,
      cyclePricing,
    };
  }

  private normalizeCyclePricingForCompare(cyclePricing: Array<Partial<TierCyclePricing>>): Array<TierCyclePricing> {
    return BILLING_CYCLE_CONFIG.map((cycle) => {
      const current = (cyclePricing || []).find((item) => String(item.durationCode || '').trim().toUpperCase() === cycle.code);
      const baseAmount = this.roundHalfUpToTwoDecimals(Number(current?.baseAmount ?? 0));
      const discountPercent = this.roundHalfUpToTwoDecimals(Number(current?.discountPercent ?? 0));
      return {
        durationCode: cycle.code,
        baseAmount,
        discountPercent,
        finalAmount: this.roundHalfUpToTwoDecimals(baseAmount - ((baseAmount * discountPercent) / 100)),
        isEnabled: Boolean(current?.isEnabled),
      };
    });
  }

  private validateConfigEntry(featureKey: string, configKey: string, configValue: number): { normalizedConfigKey: string; numeric: number } | null {
    const normalizedConfigKey = String(configKey || '').trim().toLowerCase();
    if (!STANDARD_CONFIG_KEYS.has(normalizedConfigKey)) {
      this.toast.error(`Unsupported config key: ${configKey}`);
      return null;
    }

    const numeric = Number(configValue);
    if (!Number.isInteger(numeric)) {
      this.toast.error(`Config value for ${featureKey}.${normalizedConfigKey} must be an integer`);
      return null;
    }

    const allowsZero = normalizedConfigKey === 'max_videos';
    if (allowsZero ? numeric < 0 : numeric <= 0) {
      this.toast.error(`Config value for ${featureKey}.${normalizedConfigKey} must be ${allowsZero ? '>= 0' : '> 0'}`);
      return null;
    }

    return { normalizedConfigKey, numeric };
  }

  goBack(): void {
    this.router.navigate(['/settings/saas-packages']);
  }
}
