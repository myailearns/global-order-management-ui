import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { forkJoin } from 'rxjs';

import {
  GomAlertToastService,
  GomButtonComponent,
  GomConfirmationModalComponent,
  GomInputComponent,
  GomModalComponent,
  GomSelectComponent,
  GomSelectOption,
  GomTableColumn,
  GomTableComponent,
  GomTableRow,
} from '@gomlibs/ui';

import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { PRODUCT_COLLECTIONS_TEXT } from './product-collections.constants';
import {
  ProductCollection,
  ProductCollectionAssignment,
  ProductCollectionCategory,
  ProductCollectionDetail,
  ProductCollectionGroup,
  ProductCollectionResolvedGroup,
  ProductCollectionResolvedVariant,
  ProductCollectionVariant,
  ProductCollectionMappingState,
  ProductCollectionsService,
} from './product-collections.service';

interface ProductCollectionRow extends GomTableRow {
  id: string;
  name: string;
  description: string;
  itemCount: string;
  status: string;
  createdAt: string;
}

interface AssignmentSelection {
  type: 'GROUP' | 'VARIANT';
  referenceId: string;
}

@Component({
  selector: 'gom-product-collections',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    GomButtonComponent,
    GomTableComponent,
    GomInputComponent,
    GomModalComponent,
    GomConfirmationModalComponent,
    GomSelectComponent,
  ],
  templateUrl: './product-collections.component.html',
  styleUrl: './product-collections.component.scss',
})
export class ProductCollectionsComponent implements OnInit {
  private readonly service = inject(ProductCollectionsService);
  private readonly toast = inject(GomAlertToastService);
  private readonly fb = inject(FormBuilder);
  private readonly authSession = inject(AuthSessionService);
  private readonly translate = inject(TranslateService);

  readonly text = PRODUCT_COLLECTIONS_TEXT;
  readonly loading = signal(false);
  readonly mappingLoading = signal(false);
  readonly detailLoading = signal(false);
  readonly rows = signal<ProductCollectionRow[]>([]);
  readonly collections = signal<ProductCollection[]>([]);
  readonly categories = signal<ProductCollectionCategory[]>([]);
  readonly groups = signal<ProductCollectionGroup[]>([]);
  readonly variants = signal<ProductCollectionVariant[]>([]);

  readonly selectedGroupIds = signal<string[]>([]);
  readonly selectedVariantIds = signal<string[]>([]);
  readonly currentProductSearch = signal('');
  readonly activeMappingTab = signal<string>('all');
  readonly groupTabSearch = signal('');
  readonly excludedVariantIdsGlobal = signal<string[]>([]);
  readonly excludedVariantIdsByGroup = signal<Record<string, string[]>>({});
  readonly allCategoryVariants = signal<ProductCollectionVariant[]>([]);

  readonly selectedGroupLabels = signal<Record<string, string>>({});
  readonly selectedVariantLabels = signal<Record<string, string>>({});
  readonly variantGroupMap = signal<Record<string, string>>({});
  readonly assignmentError = signal('');
  /** Non-null when reopening a locked (autoSyncNewVariants=false) collection for edit.
   * Holds the set of variant IDs that were explicitly saved — anything NOT in this set
   * that belongs to a selected group must be treated as excluded in the UI. */
  private readonly lockedVariantIds = signal<Set<string> | null>(null);

  readonly detailGroups = signal<ProductCollectionResolvedGroup[]>([]);
  readonly detailDirectVariants = signal<ProductCollectionResolvedVariant[]>([]);
  readonly detailCategoryLabels = signal<string[]>([]);
  readonly detailResolvedTotal = signal(0);
  readonly expandedDetailGroupIds = signal<string[]>([]);
  readonly detailActiveTab = signal<string>('all');
  readonly detailGroupSearch = signal('');
  readonly detailVariantSearch = signal('');

  readonly detailGroupRail = computed(() => {
    const searchTerm = this.detailGroupSearch().trim().toLowerCase();
    return this.detailGroups()
      .map((item) => ({
        id: String(item.group._id),
        label: String(item.group.name || ''),
      }))
      .filter((item) => !searchTerm || item.label.toLowerCase().includes(searchTerm));
  });

  readonly detailAllVariants = computed(() => {
    const grouped = this.detailGroups().flatMap((item) => item.variants || []);
    const direct = this.detailDirectVariants().map((item) => item.variant);

    const dedup = new Map<string, ProductCollectionVariant>();
    [...grouped, ...direct].forEach((variant) => {
      if (variant?._id) {
        dedup.set(String(variant._id), variant as ProductCollectionVariant);
      }
    });

    return Array.from(dedup.values());
  });

  readonly detailVisibleVariants = computed(() => {
    const activeTab = this.detailActiveTab();
    const search = this.detailVariantSearch().trim().toLowerCase();

    const base = activeTab === 'all'
      ? this.detailAllVariants()
      : this.detailAllVariants().filter((variant) => String(variant.groupId || '') === activeTab.replace('group:', ''));

    if (!search) {
      return base;
    }

    return base.filter((variant) => String(variant.name || '').toLowerCase().includes(search));
  });

  readonly detailActiveScopeTitle = computed(() => {
    const activeTab = this.detailActiveTab();
    if (activeTab === 'all') {
      return this.translateWithFallback('productCollections.mapping.allVariantsTitle', 'All Variants');
    }

    const groupId = activeTab.replace('group:', '');
    return this.detailGroups().find((item) => String(item.group._id) === groupId)?.group?.name
      || this.translateWithFallback('productCollections.mapping.groupVariantsTitle', 'Group Variants');
  });

  readonly detailActiveScopeSubtitle = computed(() => {
    const activeTab = this.detailActiveTab();
    if (activeTab === 'all') {
      return 'Viewing: All variants from selected categories';
    }

    const groupId = activeTab.replace('group:', '');
    const groupName = this.detailGroups().find((item) => String(item.group._id) === groupId)?.group?.name || groupId;
    return `Viewing: Group ${groupName}`;
  });

  modalOpen = false;
  detailsModalOpen = false;
  deleteConfirmOpen = false;
  selected: ProductCollection | null = null;
  detailTarget: ProductCollection | null = null;
  pendingDeleteCollection = signal<ProductCollection | null>(null);
  private suppressCategoryChange = false;

  readonly canList = computed(() => this.authSession.hasFeature('productCollection.list'));
  readonly canViewDetail = computed(() => this.authSession.hasFeature('productCollection.view'));
  readonly hasCreateFeature = computed(() => this.authSession.hasFeature('productCollection.create'));
  readonly collectionCreateLimit = computed(() => this.authSession.getFeatureConfigNumber('productCollection.create', 'max_count'));
  readonly collectionCreateUsed = computed(() => this.collections().length);
  readonly collectionCreateRemaining = computed(() => {
    const limit = this.collectionCreateLimit();
    if (limit === null) {
      return null;
    }
    return Math.max(limit - this.collectionCreateUsed(), 0);
  });
  readonly canCreate = computed(() => this.authSession.hasFeature('productCollection.create'));
  readonly canEdit = computed(() => this.authSession.hasFeature('productCollection.edit'));
  readonly canDelete = computed(() => this.authSession.hasFeature('productCollection.delete'));

  readonly statusOptions: GomSelectOption[] = [
    { value: 'ACTIVE', label: 'ACTIVE' },
    { value: 'INACTIVE', label: 'INACTIVE' },
  ];

  readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    description: [''],
    status: ['INACTIVE' as 'ACTIVE' | 'INACTIVE', [Validators.required]],
    autoSyncNewVariants: [true],
    showOnHomeScreen: [false],
    categoryIds: [[] as string[]],
    productSearch: [''],
    groupTabSearch: [''],
    removedGroupIds: [[] as string[]],
  });

  readonly categoryOptions = computed<GomSelectOption[]>(() =>
    this.categories().map((item) => ({ value: item._id, label: item.name }))
  );

  readonly filteredGroups = computed(() => {
    const term = this.currentProductSearch().trim().toLowerCase();
    if (!term) {
      return this.groups();
    }
    return this.groups().filter((item) => item.name.toLowerCase().includes(term));
  });

  readonly filteredVariants = computed(() => {
    const term = this.currentProductSearch().trim().toLowerCase();
    if (!term) {
      return this.variants();
    }
    return this.variants().filter((item) => item.name.toLowerCase().includes(term));
  });

  readonly filteredGroupRail = computed(() => {
    const searchTerm = this.groupTabSearch().trim().toLowerCase();
    const selectedSet = new Set(this.selectedGroupIds());

    return this.groups()
      .filter((group) => selectedSet.has(String(group._id)))
      .filter((group) => !searchTerm || String(group.name || '').toLowerCase().includes(searchTerm))
      .map((group) => ({
        id: String(group._id),
        label: group.name,
        hasCustomIcon: Boolean(
          (group as unknown as Record<string, unknown>)['icon']
          || (group as unknown as Record<string, unknown>)['imageUrl']
        ),
      }));
  });

  readonly removedGroupOptions = computed<GomSelectOption[]>(() => {
    const selectedSet = new Set(this.selectedGroupIds());

    return this.groups()
      .filter((group) => !selectedSet.has(String(group._id)))
      .map((group) => ({
        value: String(group._id),
        label: String(group.name || ''),
      }));
  });

  readonly activeScopeVariants = computed<ProductCollectionVariant[]>(() => {
    const activeTab = this.activeMappingTab();
    const selectedGroupSet = new Set(this.selectedGroupIds());

    if (activeTab === 'all') {
      return this.allCategoryVariants().filter((variant) => selectedGroupSet.has(String(variant.groupId)));
    }

    const groupId = activeTab.startsWith('group:') ? activeTab.substring(6) : '';
    if (!groupId || !selectedGroupSet.has(groupId)) {
      return [];
    }

    return this.allCategoryVariants().filter((variant) => {
      if (String(variant.groupId) !== groupId) {
        return false;
      }
      return true;
    });
  });

  readonly visibleActiveScopeVariants = computed<ProductCollectionVariant[]>(() => {
    const term = this.currentProductSearch().trim().toLowerCase();
    if (!term) {
      return this.activeScopeVariants();
    }

    return this.activeScopeVariants().filter((variant) => String(variant.name || '').toLowerCase().includes(term));
  });

  readonly activeScopeTitle = computed(() => {
    const activeTab = this.activeMappingTab();
    if (activeTab === 'all') {
      return this.translateWithFallback('productCollections.mapping.allVariantsTitle', 'All Variants');
    }

    const groupId = activeTab.startsWith('group:') ? activeTab.substring(6) : '';
    return this.selectedGroupLabels()[groupId]
      || this.translateWithFallback('productCollections.mapping.groupVariantsTitle', 'Group Variants');
  });

  readonly assignmentSummary = computed(() => {
    const selectedGroupIds = new Set(this.selectedGroupIds());
    const resolvedVariantIds = new Set(this.selectedVariantIds());
    const globalExcluded = new Set(this.excludedVariantIdsGlobal());
    const groupExcluded = this.excludedVariantIdsByGroup();

    this.allCategoryVariants().forEach((variant) => {
      const variantId = String(variant._id);
      const groupId = String(variant.groupId);
      if (!selectedGroupIds.has(groupId)) {
        return;
      }
      if (globalExcluded.has(variantId)) {
        return;
      }
      if ((groupExcluded[groupId] || []).includes(variantId)) {
        return;
      }
      resolvedVariantIds.add(variantId);
    });

    return {
      categories: (this.form.controls.categoryIds.value || []).length,
      groups: this.selectedGroupIds().length,
      variants: this.selectedVariantIds().length,
      resolvedVariants: resolvedVariantIds.size,
    };
  });

  readonly columns = computed<GomTableColumn<ProductCollectionRow>[]>(() => {
    return [
      { key: 'name', header: 'Name', sortable: true, width: '16rem' },
      { key: 'description', header: 'Description', width: '20rem' },
      { key: 'itemCount', header: 'Items', width: '8rem' },
      { key: 'status', header: 'Status', sortable: true, width: '8rem' },
      { key: 'createdAt', header: 'Created', sortable: true, width: '12rem' },
      {
        key: 'id',
        header: 'Actions',
        width: '10rem',
        actionButtons: [
          {
            label: () => this.canViewDetail() ? 'View' : 'No permission to view collections',
            icon: 'ri-eye-line',
            actionKey: 'view',
            variant: 'secondary',
            disabled: () => !this.canViewDetail(),
          },
          {
            label: () => this.canEdit() ? 'Edit' : 'No permission to edit collections',
            icon: 'ri-pencil-line',
            actionKey: 'edit',
            variant: 'secondary',
            disabled: () => !this.canEdit(),
          },
          {
            label: () => this.canDelete() ? 'Delete' : 'No permission to delete collections',
            icon: 'ri-delete-bin-line',
            actionKey: 'delete',
            variant: 'danger',
            disabled: () => !this.canDelete(),
          },
        ],
      },
    ];
  });

  ngOnInit(): void {
    this.form.controls.categoryIds.valueChanges.subscribe((categoryIds) => {
      if (this.suppressCategoryChange) {
        return;
      }

      this.onCategoryChanged((categoryIds || []).map(String));
    });

    this.form.controls.productSearch.valueChanges.subscribe((term) => {
      this.currentProductSearch.set(String(term || ''));
    });

    this.form.controls.groupTabSearch.valueChanges.subscribe((term) => {
      this.groupTabSearch.set(String(term || ''));
    });

    this.form.controls.removedGroupIds.valueChanges.subscribe((values) => {
      this.onRemovedGroupsSelectionChanged((values || []).map((id) => String(id || '').trim()).filter(Boolean));
    });

    this.load();
  }

  load(): void {
    if (!this.canList()) {
      this.rows.set([]);
      this.collections.set([]);
      return;
    }

    this.loading.set(true);
    this.service.list({ page: 1, limit: 50 }).subscribe({
      next: (response) => {
        const data = response.data || [];
        this.collections.set(data);
        this.rows.set(
          data.map((item) => ({
            id: item._id,
            name: item.name,
            description: item.description || '-',
            itemCount: String(item.itemCount?.total ?? 0),
            status: item.status,
            createdAt: item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '-',
          }))
        );
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error(this.translate.instant(this.text.errorLoad));
      },
    });
  }

  openCreate(): void {
    if (!this.canCreate()) {
      this.toast.warning('No permission to create collections.');
      return;
    }

    const limit = this.collectionCreateLimit();
    const remaining = this.collectionCreateRemaining();
    if (limit !== null && remaining !== null && remaining <= 0) {
      this.toast.error(`Collection creation limit reached. You can create up to ${limit} collections.`);
      return;
    }

    this.selected = null;
    this.form.reset({
      name: '',
      description: '',
      status: 'INACTIVE',
      categoryIds: [],
      productSearch: '',
      groupTabSearch: '',
      removedGroupIds: [],
    });
    this.currentProductSearch.set('');
    this.selectedGroupIds.set([]);
    this.selectedVariantIds.set([]);
    this.selectedGroupLabels.set({});
    this.selectedVariantLabels.set({});
    this.variantGroupMap.set({});
    this.activeMappingTab.set('all');
    this.groupTabSearch.set('');
    this.excludedVariantIdsGlobal.set([]);
    this.excludedVariantIdsByGroup.set({});
    this.allCategoryVariants.set([]);
    this.assignmentError.set('');
    this.groups.set([]);
    this.variants.set([]);
    this.ensureCategoriesLoaded();
    this.modalOpen = true;
  }

  closeForm(): void {
    this.modalOpen = false;
    this.selected = null;
    this.assignmentError.set('');
  }

  onRowAction(event: { actionKey: string; row: ProductCollectionRow }): void {
    const current = this.collections().find((item) => item._id === event.row.id);
    if (!current) {
      return;
    }

    if (event.actionKey === 'edit') {
      if (!this.canEdit()) {
        return;
      }
      this.openEdit(current);
      return;
    }

    if (event.actionKey === 'view') {
      this.openDetails(current);
      return;
    }

    if (event.actionKey === 'delete') {
      if (!this.canDelete()) {
        return;
      }
      this.pendingDeleteCollection.set(current);
      this.deleteConfirmOpen = true;
    }
  }

  cancelDeleteCollection(): void {
    this.deleteConfirmOpen = false;
    this.pendingDeleteCollection.set(null);
  }

  confirmDeleteCollection(): void {
    const collection = this.pendingDeleteCollection();
    this.deleteConfirmOpen = false;
    if (!collection) {
      this.pendingDeleteCollection.set(null);
      return;
    }

    this.removeCollection(collection);
  }

  getDeleteCollectionMessage(): string {
    return this.translate.instant(this.text.confirmDeleteMessage, {
      name: this.pendingDeleteCollection()?.name || '',
    });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const payload = {
      name: String(raw.name || '').trim(),
      description: String(raw.description || '').trim(),
      status: (String(raw.status || 'INACTIVE').toUpperCase() as 'ACTIVE' | 'INACTIVE'),
      autoSyncNewVariants: raw.autoSyncNewVariants !== false,
      showOnHomeScreen: raw.showOnHomeScreen === true,
      assignments: this.buildAssignments(),
      mappingState: this.buildMappingStatePayload(),
    };

    this.loading.set(true);
    const selected = this.selected;

    if (selected?._id) {
      this.service.update(selected._id, payload).subscribe({
        next: () => {
          this.loading.set(false);
          this.closeForm();
          this.toast.success(this.translate.instant(this.text.successUpdated));
          this.load();
        },
        error: (error) => {
          this.loading.set(false);
          this.assignmentError.set(String(error?.error?.message || this.translate.instant(this.text.errorSave)));
          this.toast.error(String(error?.error?.message || this.translate.instant(this.text.errorSave)));
        },
      });
      return;
    }

    this.service.create(payload).subscribe({
      next: () => {
        this.loading.set(false);
        this.closeForm();
        this.toast.success(this.translate.instant(this.text.successCreated));
        this.load();
      },
      error: (error) => {
        this.loading.set(false);
        this.assignmentError.set(String(error?.error?.message || this.translate.instant(this.text.errorSave)));
        this.toast.error(String(error?.error?.message || this.translate.instant(this.text.errorSave)));
      },
    });
  }

  onGroupsChanged(values: string[]): void {
    const unique = Array.from(new Set((values || []).map(String)));
    this.selectedGroupIds.set(unique);
    this.syncGroupLabels();
    this.loadVariantsByGroups(unique);

    const activeTab = this.activeMappingTab();
    if (activeTab !== 'all') {
      const groupId = activeTab.startsWith('group:') ? activeTab.substring(6) : '';
      if (!unique.includes(groupId)) {
        this.activeMappingTab.set('all');
      }
    }
  }

  selectScope(scope: string): void {
    const normalizedScope = String(scope || 'all');
    if (normalizedScope !== 'all' && normalizedScope.startsWith('group:')) {
      const groupId = normalizedScope.substring(6);
      if (groupId && !this.isGroupSelected(groupId)) {
        const nextSelected = [...this.selectedGroupIds(), groupId];
        this.selectedGroupIds.set(nextSelected);
        this.loadVariantsByGroups(nextSelected, true);
      }
    }

    this.activeMappingTab.set(normalizedScope);
  }

  isScopeActive(scope: string): boolean {
    return this.activeMappingTab() === scope;
  }

  activeScopeSubtitle(): string {
    const activeTab = this.activeMappingTab();
    if (activeTab === 'all') {
      return 'Viewing: All variants from selected categories';
    }

    const groupId = activeTab.startsWith('group:') ? activeTab.substring(6) : '';
    const groupLabel = this.selectedGroupLabels()[groupId] || groupId;
    return `Viewing: Group ${groupLabel}`;
  }

  isGroupSelected(groupId: string): boolean {
    return this.selectedGroupIds().includes(groupId);
  }

  getGroupInitial(name: string): string {
    const safeName = String(name || '').trim();
    return safeName ? safeName[0].toUpperCase() : '?';
  }

  toggleGroupSelection(groupId: string): void {
    if (!this.isGroupSelected(groupId)) {
      return;
    }

    const nextSelected = this.selectedGroupIds().filter((id) => id !== groupId);
    this.selectedGroupIds.set(nextSelected);

    const activeTab = this.activeMappingTab();
    if (activeTab === `group:${groupId}`) {
      this.activeMappingTab.set('all');
    }

    const removedVariantCount = this.allCategoryVariants().filter((variant) => String(variant.groupId) === groupId).length;
    const nextByGroup = { ...this.excludedVariantIdsByGroup() };
    delete nextByGroup[groupId];
    this.excludedVariantIdsByGroup.set(nextByGroup);

    this.selectedVariantIds.set(
      this.selectedVariantIds().filter((variantId) => String(this.variantGroupMap()[variantId] || '') !== groupId)
    );

    const removedGroupName = this.selectedGroupLabels()[groupId] || groupId;
    this.toast.info(`Removed group ${removedGroupName}. ${removedVariantCount} related variants are no longer included.`);

    this.loadVariantsByGroups(nextSelected, true);
  }

  onRemovedGroupsSelectionChanged(values: string[]): void {
    const requestedIds = Array.from(new Set((values || []).map((id) => String(id || '').trim()).filter(Boolean)));
    if (!requestedIds.length) {
      return;
    }

    const allowedSet = new Set(this.removedGroupOptions().map((option) => String(option.value || '')));
    const toAdd = requestedIds.filter((id) => allowedSet.has(id));
    if (!toAdd.length) {
      this.form.controls.removedGroupIds.setValue([], { emitEvent: false });
      return;
    }

    const nextSelected = Array.from(new Set([...this.selectedGroupIds(), ...toAdd]));
    this.selectedGroupIds.set(nextSelected);
    this.loadVariantsByGroups(nextSelected, true);
    this.form.controls.removedGroupIds.setValue([], { emitEvent: false });
  }

  isActiveScopeSelectable(): boolean {
    const activeTab = this.activeMappingTab();
    if (activeTab === 'all') {
      return true;
    }

    const groupId = activeTab.startsWith('group:') ? activeTab.substring(6) : '';
    return this.selectedGroupIds().includes(groupId);
  }

  isVariantExcludedInActiveScope(variantId: string): boolean {
    const activeTab = this.activeMappingTab();

    if (activeTab === 'all') {
      // Check global exclusion list first
      if (this.excludedVariantIdsGlobal().includes(variantId)) {
        return true;
      }
      // Also check per-group exclusions (used for locked collections)
      const byGroup = this.excludedVariantIdsByGroup();
      return Object.values(byGroup).some((ids) => ids.includes(variantId));
    }

    const groupId = activeTab.startsWith('group:') ? activeTab.substring(6) : '';
    return (this.excludedVariantIdsByGroup()[groupId] || []).includes(variantId);
  }

  toggleVariantInActiveScope(variantId: string): void {
    if (!this.isActiveScopeSelectable()) {
      return;
    }

    const activeTab = this.activeMappingTab();
    if (activeTab === 'all') {
      if (this.excludedVariantIdsGlobal().includes(variantId)) {
        this.excludedVariantIdsGlobal.set(this.excludedVariantIdsGlobal().filter((id) => id !== variantId));
      } else {
        this.excludedVariantIdsGlobal.set([...this.excludedVariantIdsGlobal(), variantId]);
      }
      return;
    }

    const groupId = activeTab.startsWith('group:') ? activeTab.substring(6) : '';
    if (!groupId) {
      return;
    }

    const byGroup = { ...this.excludedVariantIdsByGroup() };
    const current = new Set(byGroup[groupId] || []);
    if (current.has(variantId)) {
      current.delete(variantId);
    } else {
      current.add(variantId);
    }

    if (current.size) {
      byGroup[groupId] = Array.from(current);
    } else {
      delete byGroup[groupId];
    }
    this.excludedVariantIdsByGroup.set(byGroup);
  }

  onVariantsChanged(values: string[]): void {
    const unique = Array.from(new Set((values || []).map(String)));
    this.selectedVariantIds.set(unique);
    this.syncVariantLabels();
  }

  closeDetails(): void {
    this.detailsModalOpen = false;
    this.detailTarget = null;
    this.detailGroups.set([]);
    this.detailDirectVariants.set([]);
    this.detailCategoryLabels.set([]);
    this.detailResolvedTotal.set(0);
    this.expandedDetailGroupIds.set([]);
    this.detailActiveTab.set('all');
    this.detailGroupSearch.set('');
    this.detailVariantSearch.set('');
  }

  selectDetailScope(scope: string): void {
    this.detailActiveTab.set(String(scope || 'all'));
  }

  isDetailScopeActive(scope: string): boolean {
    return this.detailActiveTab() === scope;
  }

  onDetailGroupSearchChange(value: string): void {
    this.detailGroupSearch.set(String(value || ''));
  }

  onDetailVariantSearchChange(value: string): void {
    this.detailVariantSearch.set(String(value || ''));
  }

  toggleDetailGroup(groupId: string): void {
    const current = new Set(this.expandedDetailGroupIds());
    if (current.has(groupId)) {
      current.delete(groupId);
    } else {
      current.add(groupId);
    }
    this.expandedDetailGroupIds.set(Array.from(current));
  }

  isDetailGroupExpanded(groupId: string): boolean {
    return this.expandedDetailGroupIds().includes(groupId);
  }

  private openEdit(current: ProductCollection): void {
    this.loading.set(true);
    this.ensureCategoriesLoaded();

    this.service.getById(current._id, true).subscribe({
      next: (response) => {
        const detail = response.data;
        this.selected = detail;
        this.form.reset({
          name: detail.name,
          description: detail.description || '',
          status: detail.status,
          autoSyncNewVariants: detail.autoSyncNewVariants !== false,
          showOnHomeScreen: detail.showOnHomeScreen === true,
          categoryIds: [],
          productSearch: '',
          groupTabSearch: '',
          removedGroupIds: [],
        });

        this.hydrateAssignments(detail.assignments || []);
        this.currentProductSearch.set('');
        this.groupTabSearch.set('');
        this.activeMappingTab.set('all');

        // If this collection is locked, prepare the set of saved variant IDs so that
        // loadAllCategoryVariants can recompute exclusions for any new variants.
        if (detail.autoSyncNewVariants === false) {
          const savedVariantIds = new Set(
            (detail.assignments || [])
              .filter((a) => a.type === 'VARIANT')
              .map((a) => String(a.referenceId))
          );
          this.lockedVariantIds.set(savedVariantIds);
        } else {
          this.lockedVariantIds.set(null);
        }

        const mappingState = detail.mappingState;
        if (mappingState) {
          const mappedCategoryIds = (mappingState.selectedCategoryIds || []).map(String).filter(Boolean);
          if (mappedCategoryIds.length) {
            this.suppressCategoryChange = true;
            this.form.controls.categoryIds.setValue(mappedCategoryIds);
            this.suppressCategoryChange = false;
            this.loadGroupsForCategories(mappedCategoryIds, true);
          }

          if (Array.isArray(mappingState.selectedGroupIds) && mappingState.selectedGroupIds.length) {
            this.selectedGroupIds.set(Array.from(new Set(mappingState.selectedGroupIds.map(String))));
          }

          this.excludedVariantIdsGlobal.set(mappingState.excludedVariantIdsGlobal || []);

          const byGroup: Record<string, string[]> = {};
          (mappingState.excludedVariantIdsByGroup || []).forEach((entry) => {
            byGroup[String(entry.groupId)] = Array.from(new Set((entry.variantIds || []).map(String)));
          });
          this.excludedVariantIdsByGroup.set(byGroup);
        } else {
          this.excludedVariantIdsGlobal.set([]);
          this.excludedVariantIdsByGroup.set({});
        }
        this.assignmentError.set('');
        this.modalOpen = true;
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.toast.error(String(error?.error?.message || this.translate.instant(this.text.errorLoad)));
      },
    });
  }

  private openDetails(current: ProductCollection): void {
    this.detailTarget = current;
    this.detailsModalOpen = true;
    this.detailLoading.set(true);
    this.detailActiveTab.set('all');
    this.detailGroupSearch.set('');
    this.detailVariantSearch.set('');

    forkJoin({
      detail: this.service.getById(current._id, true),
      resolved: this.service.getResolvedItems(current._id, { page: 1, limit: 500 }),
    }).subscribe({
      next: ({ detail, resolved }) => {
        const groups = resolved.data.filter((item): item is ProductCollectionResolvedGroup => item.type === 'GROUP');
        const directVariants = resolved.data.filter(
          (item): item is ProductCollectionResolvedVariant => item.type === 'VARIANT'
        );

        if (!groups.length && !directVariants.length) {
          this.populateDetailsFromMappingState(detail.data);
          return;
        }

        const categoryMap = new Map(this.categories().map((item) => [String(item._id), item.name]));
        const categoryIds = new Set(
          (detail.data.assignments || [])
            .filter((item) => item.type === 'GROUP')
            .map((item) => String(item.group?.categoryId || ''))
            .filter(Boolean)
        );

        this.detailGroups.set(groups);
        this.detailDirectVariants.set(directVariants);
        this.detailCategoryLabels.set(Array.from(categoryIds).map((id) => categoryMap.get(id) || id));
        this.detailResolvedTotal.set(resolved.resolvedItems?.total ?? groups.reduce((sum, row) => sum + row.variants.length, 0) + directVariants.length);
        this.expandedDetailGroupIds.set([]);
        this.detailLoading.set(false);
      },
      error: (error) => {
        this.detailLoading.set(false);
        this.toast.error(String(error?.error?.message || this.translate.instant(this.text.errorLoad)));
      },
    });
  }

  private populateDetailsFromMappingState(detail: ProductCollectionDetail): void {
    const mappingState = detail.mappingState;
    const selectedGroupIds = Array.from(new Set((mappingState?.selectedGroupIds || []).map(String).filter(Boolean)));
    const selectedCategoryIds = Array.from(new Set((mappingState?.selectedCategoryIds || []).map(String).filter(Boolean)));

    const globalExcluded = new Set((mappingState?.excludedVariantIdsGlobal || []).map(String));
    const excludedByGroup = new Map(
      (mappingState?.excludedVariantIdsByGroup || []).map((entry) => [
        String(entry.groupId),
        new Set((entry.variantIds || []).map(String)),
      ])
    );

    const directAssignedVariants = (detail.assignments || [])
      .filter((item) => item.type === 'VARIANT' && item.variant)
      .map((item) => item.variant as ProductCollectionVariant)
      .filter((variant) => !!variant?._id)
      .filter((variant) => !globalExcluded.has(String(variant._id)));

    if (!selectedGroupIds.length) {
      const directRows: ProductCollectionResolvedVariant[] = directAssignedVariants.map((variant) => ({
        type: 'VARIANT',
        variant: {
          ...variant,
          sourceLabels: ['DIRECT'],
        },
      }));

      this.detailGroups.set([]);
      this.detailDirectVariants.set(directRows);
      this.detailCategoryLabels.set([]);
      this.detailResolvedTotal.set(directRows.length);
      this.expandedDetailGroupIds.set([]);
      this.detailLoading.set(false);
      return;
    }

    const groupRequests = selectedGroupIds.map((groupId) =>
      this.service.listVariants({ page: 1, limit: 5000, status: 'ACTIVE', groupId })
    );
    const categoryRequests = selectedCategoryIds.map((categoryId) =>
      this.service.listGroups({ page: 1, limit: 5000, status: 'ACTIVE', categoryId })
    );

    forkJoin({
      variantsByGroup: forkJoin(groupRequests),
      groupsByCategory: categoryRequests.length ? forkJoin(categoryRequests) : forkJoin([]),
    }).subscribe({
      next: ({ variantsByGroup, groupsByCategory }) => {
        const groupMetaById = new Map<string, ProductCollectionGroup>();

        (groupsByCategory || []).forEach((response) => {
          (response.data || []).forEach((group) => {
            groupMetaById.set(String(group._id), group);
          });
        });

        (detail.assignments || [])
          .filter((item) => item.type === 'GROUP' && item.group)
          .forEach((item) => {
            groupMetaById.set(String(item.group!._id), item.group as ProductCollectionGroup);
          });

        const groupedRows: ProductCollectionResolvedGroup[] = [];
        const visibleVariantIds = new Set<string>();

        selectedGroupIds.forEach((groupId, index) => {
          const response = variantsByGroup[index];
          const excluded = excludedByGroup.get(groupId) || new Set<string>();

          const variants = (response?.data || [])
            .filter((variant) => !globalExcluded.has(String(variant._id)))
            .filter((variant) => !excluded.has(String(variant._id)))
            .map((variant) => ({ ...variant, sourceLabels: ['VIA_GROUP'] }));

          variants.forEach((variant) => visibleVariantIds.add(String(variant._id)));

          if (!variants.length) {
            return;
          }

          const meta = groupMetaById.get(groupId);
          groupedRows.push({
            type: 'GROUP',
            group: {
              _id: groupId,
              name: String(meta?.name || groupId),
              categoryId: meta?.categoryId,
              status: (meta?.status || 'ACTIVE') as 'ACTIVE' | 'INACTIVE',
            },
            variants,
          });
        });

        const directRows: ProductCollectionResolvedVariant[] = directAssignedVariants
          .filter((variant) => !visibleVariantIds.has(String(variant._id)))
          .map((variant) => ({
            type: 'VARIANT',
            variant: {
              ...variant,
              sourceLabels: ['DIRECT'],
            },
          }));

        const categoryMap = new Map(this.categories().map((item) => [String(item._id), item.name]));
        const labels = selectedCategoryIds.map((id) => categoryMap.get(id) || id);

        this.detailGroups.set(groupedRows);
        this.detailDirectVariants.set(directRows);
        this.detailCategoryLabels.set(labels);
        this.detailResolvedTotal.set(
          groupedRows.reduce((sum, row) => sum + (row.variants?.length || 0), 0) + directRows.length
        );
        this.expandedDetailGroupIds.set([]);
        this.detailLoading.set(false);
      },
      error: () => {
        this.detailLoading.set(false);
        this.toast.error(this.translate.instant(this.text.errorLoad));
      },
    });
  }

  private onCategoryChanged(categoryIds: string[]): void {
    this.assignmentError.set('');

    const normalized = Array.from(new Set((categoryIds || []).map(String).filter(Boolean)));
    if (!normalized.length) {
      this.groups.set([]);
      this.variants.set([]);
      this.allCategoryVariants.set([]);
      this.selectedGroupIds.set([]);
      this.selectedVariantIds.set([]);
      this.excludedVariantIdsGlobal.set([]);
      this.excludedVariantIdsByGroup.set({});
      this.activeMappingTab.set('all');
      this.form.controls.removedGroupIds.setValue([]);
      return;
    }

    this.loadGroupsForCategories(normalized, false);
  }

  private ensureCategoriesLoaded(): void {
    if (this.categories().length > 0) {
      return;
    }

    this.service.listCategories({ page: 1, limit: 5000, status: 'ACTIVE' }).subscribe({
      next: (response) => {
        this.categories.set(response.data || []);
      },
      error: () => {
        this.toast.error(this.translate.instant(this.text.errorLoad));
      },
    });
  }

  private loadGroupsForCategories(categoryIds: string[], preserveSelections: boolean): void {
    this.mappingLoading.set(true);
    const normalizedIds = Array.from(new Set((categoryIds || []).map(String).filter(Boolean)));
    const requests = normalizedIds.map((categoryId) =>
      this.service.listGroups({ page: 1, limit: 5000, status: 'ACTIVE', categoryId })
    );

    forkJoin(requests).subscribe({
      next: (responses) => {
        const dedup = new Map<string, ProductCollectionGroup>();
        responses.forEach((response) => {
          (response.data || []).forEach((group) => {
            dedup.set(String(group._id), group);
          });
        });

        const rows = Array.from(dedup.values());
        this.groups.set(rows);
        this.syncGroupLabels();

        const validGroupIds = new Set(rows.map((item) => String(item._id)));
        const nextSelectedGroups = preserveSelections
          ? this.selectedGroupIds().filter((id) => validGroupIds.has(id))
          : rows.map((item) => String(item._id));

        this.selectedGroupIds.set(nextSelectedGroups);
        this.form.controls.removedGroupIds.setValue([]);
        if (!preserveSelections) {
          this.excludedVariantIdsGlobal.set([]);
          this.excludedVariantIdsByGroup.set({});
          this.activeMappingTab.set('all');
        }

        const allGroupIds = rows.map((item) => String(item._id));

        // If locked collection, use forkJoin to ensure exclusion recompute happens after
        // all variants are loaded — avoiding the race between the two async loads.
        const locked = this.lockedVariantIds();
        if (locked !== null) {
          const allVariantRequests = allGroupIds.map((gId) =>
            this.service.listVariants({ page: 1, limit: 5000, status: 'ACTIVE', groupId: gId })
          );

          forkJoin(allVariantRequests.length ? allVariantRequests : []).subscribe({
            next: (responses) => {
              const variantById = new Map<string, ProductCollectionVariant>();
              responses.forEach((response) => {
                (response.data || []).forEach((variant) => {
                  variantById.set(String(variant._id), variant);
                });
              });

              const allVariants = Array.from(variantById.values());
              this.allCategoryVariants.set(allVariants);
              this.syncVariantLabels();
              this.syncVariantGroupMap();

              // Recompute exclusions: anything NOT in locked set is excluded
              const byGroup: Record<string, string[]> = {};
              allVariants.forEach((variant) => {
                const vId = String(variant._id);
                const gId = String(variant.groupId || '');
                if (!gId || locked.has(vId)) return;
                if (!byGroup[gId]) byGroup[gId] = [];
                byGroup[gId].push(vId);
              });
              this.excludedVariantIdsByGroup.set(byGroup);
              this.lockedVariantIds.set(null);

              // Also update variants for the group rail view
              const filteredVariants = allVariants.filter((v) =>
                nextSelectedGroups.includes(String(v.groupId || ''))
              );
              this.variants.set(filteredVariants);
              const savedIds = new Set(locked);
              const availableIds = new Set(allVariants.map((v) => String(v._id)));
              this.selectedVariantIds.set(Array.from(savedIds).filter((id) => availableIds.has(id)));
              this.mappingLoading.set(false);
            },
            error: () => {
              this.lockedVariantIds.set(null);
              this.mappingLoading.set(false);
            },
          });
        } else {
          this.loadAllCategoryVariants(allGroupIds);
          this.loadVariantsByGroups(nextSelectedGroups, preserveSelections);
        }
      },
      error: () => {
        this.mappingLoading.set(false);
        this.toast.error(this.translate.instant(this.text.errorLoad));
      },
    });
  }

  private loadVariantsByGroups(groupIds: string[], preserveSelections = false): void {
    if (!groupIds.length) {
      this.variants.set([]);
      if (!preserveSelections) {
        this.selectedVariantIds.set([]);
      }
      this.mappingLoading.set(false);
      return;
    }

    const search = this.currentProductSearch().trim();
    const requests = groupIds.map((groupId) =>
      this.service.listVariants({
        page: 1,
        limit: 5000,
        status: 'ACTIVE',
        groupId,
        search: search || undefined,
      })
    );

    forkJoin(requests).subscribe({
      next: (responses) => {
        const variantById = new Map<string, ProductCollectionVariant>();
        responses.forEach((response) => {
          (response.data || []).forEach((variant) => {
            variantById.set(String(variant._id), variant);
          });
        });

        const variantRows = Array.from(variantById.values());
        this.variants.set(variantRows);
        this.syncVariantLabels();
        this.syncVariantGroupMap();

        const availableVariantIds = new Set(variantRows.map((item) => String(item._id)));
        const nextSelectedVariants = preserveSelections
          ? this.selectedVariantIds().filter((id) => availableVariantIds.has(id))
          : [];

        this.selectedVariantIds.set(nextSelectedVariants);
        this.mappingLoading.set(false);
      },
      error: () => {
        this.mappingLoading.set(false);
        this.toast.error(this.translate.instant(this.text.errorLoad));
      },
    });
  }

  private loadAllCategoryVariants(groupIds: string[]): void {
    const uniqueGroupIds = Array.from(new Set((groupIds || []).map(String).filter(Boolean)));
    if (!uniqueGroupIds.length) {
      this.allCategoryVariants.set([]);
      return;
    }

    const requests = uniqueGroupIds.map((groupId) =>
      this.service.listVariants({
        page: 1,
        limit: 5000,
        status: 'ACTIVE',
        groupId,
      })
    );

    forkJoin(requests).subscribe({
      next: (responses) => {
        const variantById = new Map<string, ProductCollectionVariant>();
        responses.forEach((response) => {
          (response.data || []).forEach((variant) => {
            variantById.set(String(variant._id), variant);
          });
        });

        const allVariants = Array.from(variantById.values());
        this.allCategoryVariants.set(allVariants);
        this.syncVariantLabels();
        this.syncVariantGroupMap();
      },
      error: () => {
        this.allCategoryVariants.set([]);
      },
    });
  }

  private hydrateAssignments(assignments: ProductCollectionAssignment[]): void {

    this.form.controls.categoryIds.setValue([]);
    this.groups.set([]);
    this.variants.set([]);
  }

  private translateWithFallback(key: string, fallback: string): string {
    const translated = String(this.translate.instant(key) || '').trim();
    if (!translated || translated === key) {
      return fallback;
    }
    return translated;
  }

  private syncGroupLabels(): void {
    const next = { ...this.selectedGroupLabels() };
    this.groups().forEach((group) => {
      next[String(group._id)] = group.name;
    });
    this.selectedGroupLabels.set(next);
  }

  private syncVariantLabels(): void {
    const next = { ...this.selectedVariantLabels() };
    this.variants().forEach((variant) => {
      next[String(variant._id)] = variant.name;
    });
    this.allCategoryVariants().forEach((variant) => {
      next[String(variant._id)] = variant.name;
    });
    this.selectedVariantLabels.set(next);
  }

  private syncVariantGroupMap(): void {
    const next = { ...this.variantGroupMap() };
    this.variants().forEach((variant) => {
      next[String(variant._id)] = String(variant.groupId);
    });
    this.allCategoryVariants().forEach((variant) => {
      next[String(variant._id)] = String(variant.groupId);
    });
    this.variantGroupMap.set(next);
  }

  private buildMappingStatePayload(): ProductCollectionMappingState {
    const excludedByGroupSource = this.excludedVariantIdsByGroup();
    const selectedGroupSet = new Set(this.selectedGroupIds());
    const excludedVariantIdsByGroup = Object.entries(excludedByGroupSource)
      .filter(([groupId]) => selectedGroupSet.has(groupId))
      .map(([groupId, variantIds]) => ({
        groupId,
        variantIds: Array.from(new Set((variantIds || []).map(String))),
      }))
      .filter((entry) => entry.variantIds.length > 0);

    return {
      selectedCategoryIds: Array.from(new Set((this.form.controls.categoryIds.value || []).map(String).filter(Boolean))),
      selectedGroupIds: Array.from(new Set(this.selectedGroupIds().map(String))),
      excludedVariantIdsGlobal: Array.from(new Set(this.excludedVariantIdsGlobal().map(String))),
      excludedVariantIdsByGroup,
    };
  }

  private buildAssignments(): AssignmentSelection[] {
    const groupIds = Array.from(new Set(this.selectedGroupIds().map(String)));
    const selectedGroupSet = new Set(groupIds);
    const variantGroupMap = this.variantGroupMap();
    const excludedByGroup = this.excludedVariantIdsByGroup();
    const autoSync = this.form.controls.autoSyncNewVariants.value !== false;

    // Build a map of all variants per group from allCategoryVariants + variants
    const allVariantsByGroup: Record<string, string[]> = {};
    [...this.allCategoryVariants(), ...this.variants()].forEach((v) => {
      const gId = String(v.groupId || '');
      if (!gId) return;
      if (!allVariantsByGroup[gId]) allVariantsByGroup[gId] = [];
      const vId = String(v._id);
      if (!allVariantsByGroup[gId].includes(vId)) {
        allVariantsByGroup[gId].push(vId);
      }
    });

    const result: AssignmentSelection[] = [];

    for (const groupId of groupIds) {
      const excluded = new Set((excludedByGroup[groupId] || []).map(String));
      if (autoSync && excluded.size === 0) {
        // AUTO_SYNC + no exclusions: store as GROUP → future new variants auto-included
        result.push({ type: 'GROUP', referenceId: groupId });
      } else {
        // LOCKED or partial exclusion: store only the kept variants explicitly
        const allForGroup = allVariantsByGroup[groupId] || [];
        const kept = allForGroup.filter((vId) => !excluded.has(vId));
        kept.forEach((referenceId) => result.push({ type: 'VARIANT', referenceId }));
      }
    }

    // Standalone variant-level selections whose group is NOT in selectedGroupSet
    const standaloneVariantIds = Array.from(
      new Set(
        this.selectedVariantIds()
          .map(String)
          .filter((variantId) => {
            const groupId = String(variantGroupMap[variantId] || '');
            return !groupId || !selectedGroupSet.has(groupId);
          })
      )
    );
    standaloneVariantIds.forEach((referenceId) => result.push({ type: 'VARIANT', referenceId }));

    return result;
  }

  private removeCollection(item: ProductCollection): void {
    if (!item?._id) {
      this.pendingDeleteCollection.set(null);
      return;
    }

    this.loading.set(true);
    this.service.remove(item._id).subscribe({
      next: () => {
        this.loading.set(false);
        this.pendingDeleteCollection.set(null);
        this.toast.success(this.translate.instant(this.text.successDeleted));
        this.load();
      },
      error: (error) => {
        this.loading.set(false);
        this.pendingDeleteCollection.set(null);
        this.toast.error(String(error?.error?.message || this.translate.instant(this.text.errorDelete)));
      },
    });
  }

}
