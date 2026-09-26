import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';

import { GomButtonComponent } from '@gomlibs/ui';

import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { PageHeadingComponent } from '../../../shared/components/page-heading/page-heading.component';
import { BusinessSetupSection, BusinessSetupService, TenantBusinessSetupProfile, TenantBusinessSetupSummary } from './business-setup.service';
import { BusinessTypeCategoryManagerComponent } from './business-type-category-manager.component';
import { BusinessTypeFieldManagerComponent } from './business-type-field-manager.component';
import { BusinessTypeFieldGroupManagerComponent } from './business-type-field-group-manager.component';
import { BusinessTypeUnitManagerComponent } from './business-type-unit-manager.component';

@Component({
  selector: 'gom-business-setup',
  standalone: true,
  imports: [
    CommonModule,
    GomButtonComponent,
    PageHeadingComponent,
    BusinessTypeCategoryManagerComponent,
    BusinessTypeFieldManagerComponent,
    BusinessTypeFieldGroupManagerComponent,
    BusinessTypeUnitManagerComponent,
  ],
  templateUrl: './business-setup.component.html',
  styleUrl: './business-setup.component.scss',
})
export class BusinessSetupComponent {
  private readonly service = inject(BusinessSetupService);
  private readonly authSession = inject(AuthSessionService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);

  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly summary = signal<TenantBusinessSetupSummary | null>(null);
  readonly activeProfileId = signal<string | null>(null);
  readonly managedProfileId = signal<string | null>(null);
  readonly managingCategoryBusinessTypeId = signal<string | null>(null);
  readonly managingFieldBusinessTypeId = signal<string | null>(null);
  readonly managingFieldGroupBusinessTypeId = signal<string | null>(null);
  readonly managingUnitBusinessTypeId = signal<string | null>(null);
  readonly canManage = computed(() => this.authSession.hasFeature('businessSetup.manage'));
  readonly profiles = computed(() => this.summary()?.items ?? []);
  readonly profileCount = computed(() => this.profiles().length);
  readonly setupModeLabel = computed(() => (this.summary()?.tenant.completed ? 'Live Setup' : 'Sandboxed Setup'));
  readonly isManageView = computed(() => Boolean(this.managedProfileId()));
  readonly isCategoryManagerOpen = computed(() => Boolean(this.managingCategoryBusinessTypeId()));
  readonly isFieldManagerOpen = computed(() => Boolean(this.managingFieldBusinessTypeId()));
  readonly isFieldGroupManagerOpen = computed(() => Boolean(this.managingFieldGroupBusinessTypeId()));
  readonly isUnitManagerOpen = computed(() => Boolean(this.managingUnitBusinessTypeId()));
  readonly activeProfile = computed<TenantBusinessSetupProfile | null>(() => {
    const profiles = this.profiles();
    const selectedId = this.activeProfileId();
    return profiles.find((profile) => profile.id === selectedId) || profiles[0] || null;
  });
  readonly managedProfile = computed<TenantBusinessSetupProfile | null>(() => {
    const profiles = this.profiles();
    const selectedId = this.managedProfileId();
    return profiles.find((profile) => profile.id === selectedId) || null;
  });
  readonly managedSections = computed(() => {
    const profile = this.managedProfile();
    if (!profile) {
      return [];
    }

    return profile.sections.map((section) => ({
      ...section,
      description: this.sectionDescription(section.key, profile.name),
      statusLabel: section.count > 0 ? 'Ready' : 'Not Started',
      itemLabel: this.sectionItemLabel(section),
      iconClass: this.sectionIcon(section.key),
    }));
  });

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.service.listProfiles()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ data }) => {
          this.summary.set(data);
          this.activeProfileId.set(data?.items?.[0]?.id || null);
          this.loading.set(false);
        },
        error: (error) => {
          this.loading.set(false);
          this.errorMessage.set(error?.error?.message || 'Failed to load business setup profiles.');
        },
      });
  }

  selectProfile(profileId: string): void {
    this.activeProfileId.set(profileId);
  }

  openManageProfile(profileId: string): void {
    this.activeProfileId.set(profileId);
    this.managedProfileId.set(profileId);
  }

  closeManageProfile(): void {
    this.managedProfileId.set(null);
    this.managingCategoryBusinessTypeId.set(null);
    this.managingFieldBusinessTypeId.set(null);
    this.managingFieldGroupBusinessTypeId.set(null);
    this.managingUnitBusinessTypeId.set(null);
  }

  openSection(sectionKey: BusinessSetupSection['key']): void {
    if (sectionKey === 'categories') {
      this.openCategoryManager();
      return;
    }

    if (sectionKey === 'fields') {
      this.openFieldManager();
      return;
    }

    if (sectionKey === 'field-groups') {
      this.openFieldGroupManager();
      return;
    }

    if (sectionKey === 'units') {
      this.openUnitManager();
      return;
    }

    const route = this.sectionRoute(sectionKey);
    if (!route) {
      return;
    }

    void this.router.navigateByUrl(route);
  }

  closeCategoryManager(): void {
    this.managingCategoryBusinessTypeId.set(null);
  }

  closeFieldManager(): void {
    this.managingFieldBusinessTypeId.set(null);
  }

  closeFieldGroupManager(): void {
    this.managingFieldGroupBusinessTypeId.set(null);
  }

  closeUnitManager(): void {
    this.managingUnitBusinessTypeId.set(null);
  }

  onCategoriesUpdated(): void {
    const managedProfileId = this.managedProfileId();
    this.load();
    if (managedProfileId) {
      this.managedProfileId.set(managedProfileId);
    }
  }

  onFieldsUpdated(): void {
    const managedProfileId = this.managedProfileId();
    this.load();
    if (managedProfileId) {
      this.managedProfileId.set(managedProfileId);
    }
  }

  onFieldGroupsUpdated(): void {
    const managedProfileId = this.managedProfileId();
    this.load();
    if (managedProfileId) {
      this.managedProfileId.set(managedProfileId);
    }
  }

  onUnitsUpdated(): void {
    const managedProfileId = this.managedProfileId();
    this.load();
    if (managedProfileId) {
      this.managedProfileId.set(managedProfileId);
    }
  }

  statusLabel(status: TenantBusinessSetupProfile['setupStatus']): string {
    if (status === 'ACTIVE') {
      return 'Active';
    }

    if (status === 'IN_PROGRESS') {
      return 'In Progress';
    }

    return 'Not Started';
  }

  sectionHint(sectionKey: BusinessSetupSection['key']): string {
    switch (sectionKey) {
      case 'categories':
        return 'Organize sellable items and map them to the selected business profile.';
      case 'fields':
        return 'Review core attributes and custom fields available for this setup.';
      case 'field-groups':
        return 'Bundle reusable field combinations for faster profile activation.';
      case 'units':
        return 'Confirm measurement units and conversions used by this business type.';
      case 'tax-profiles':
        return 'Validate applicable tax structures before publishing the profile.';
      default:
        return 'Manage profile setup items.';
    }
  }

  private sectionDescription(sectionKey: BusinessSetupSection['key'], profileName: string): string {
    const profileLabel = profileName.toLowerCase();

    switch (sectionKey) {
      case 'categories':
        return `Define structural groups for ${profileLabel} stock organization.`;
      case 'fields':
        return `Customize product details requested for ${profileLabel} items.`;
      case 'field-groups':
        return 'Group related details into reusable tabs for cleaner visibility.';
      case 'units':
        return 'Review allowed units of measurement used by this business setup.';
      case 'tax-profiles':
        return 'Validate applicable tax brackets before activating this profile.';
      default:
        return 'Manage profile setup items.';
    }
  }

  private sectionItemLabel(section: BusinessSetupSection): string {
    const singular = section.label.endsWith('s') ? section.label.slice(0, -1) : section.label;
    return section.count === 1 ? `1 ${singular}` : `${section.count} ${section.label}`;
  }

  private sectionIcon(sectionKey: BusinessSetupSection['key']): string {
    switch (sectionKey) {
      case 'categories':
        return 'ri-folder-2-line';
      case 'fields':
        return 'ri-layout-grid-line';
      case 'field-groups':
        return 'ri-folders-line';
      case 'units':
        return 'ri-scales-3-line';
      case 'tax-profiles':
        return 'ri-percent-line';
      default:
        return 'ri-folder-line';
    }
  }

  private sectionRoute(sectionKey: BusinessSetupSection['key']): string | null {
    switch (sectionKey) {
      case 'tax-profiles':
        return '/masters/tax-profiles';
      default:
        return null;
    }
  }

  private openCategoryManager(): void {
    const profile = this.managedProfile();
    if (!profile?.businessTypeId) {
      return;
    }

    this.managingCategoryBusinessTypeId.set(profile.businessTypeId);
  }

  private openFieldManager(): void {
    const profile = this.managedProfile();
    if (!profile?.businessTypeId) {
      return;
    }

    this.managingFieldBusinessTypeId.set(profile.businessTypeId);
  }

  private openFieldGroupManager(): void {
    const profile = this.managedProfile();
    if (!profile?.businessTypeId) {
      return;
    }

    this.managingFieldGroupBusinessTypeId.set(profile.businessTypeId);
  }

  private openUnitManager(): void {
    const profile = this.managedProfile();
    if (!profile?.businessTypeId) {
      return;
    }

    this.managingUnitBusinessTypeId.set(profile.businessTypeId);
  }
}