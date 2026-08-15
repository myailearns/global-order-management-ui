import {
  Component,
  computed,
  effect,
  ElementRef,
  HostListener,
  inject,
  OnDestroy,
  OnInit,
  signal,
  untracked,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  Subscription,
  Observable,
  catchError,
  debounceTime,
  distinctUntilChanged,
  forkJoin,
  from,
  interval,
  map,
  of,
  concatMap,
  mergeMap,
  switchMap,
  toArray,
  startWith,
} from 'rxjs';

import {
  FormControlsModule,
  GomAlertToastService,
  GomChipComponent,
  GomModalComponent,
  GomSelectOption,
  GomTableColumn,
  GomTableComponent,
  GomTableRow,
} from '@gomlibs/ui';

import { AuthSessionService } from '../../../core/auth/auth-session.service';
import {
  GroupType,
  GroupUpdatePayload,
  PricingEntity,
  PricingState,
  SimplePricingCategory,
  SimplePricingGroup,
  SimplePricingSearchSuggestion,
  SimplePricingService,
  SimplePricingTemplateDownloadFilters,
  SimplePricingVariant,
} from './simple-pricing.service';
import { SimplePricingSearchAutocompleteComponent } from './search-autocomplete/simple-pricing-search-autocomplete.component';
import { SimplePricingEditModalComponent, SimplePricingEditSavedPayload } from './edit-modal/simple-pricing-edit-modal.component';
import { SimplePricingInfoModalComponent } from './info-modal/simple-pricing-info-modal.component';
import { PriceReviewItem, SimplePricingReviewModalComponent } from './review-modal/simple-pricing-review-modal.component';
import {
  SimplePricingBulkHistoryItem,
  SimplePricingBulkJobStatus,
  SimplePricingBulkResults,
  SimplePricingBulkUploadService,
} from './simple-pricing-bulk-upload.service';
import { SimplePricingUploadFeedbackModalComponent } from './upload-feedback-modal/simple-pricing-upload-feedback-modal.component';

interface PricingTableRow {
  id: string;
  name: string;
  sellingPrice: string;
  definedProfit: string;
  affectedProfit: string;
  affectedProfitTone: 'info' | 'success' | 'danger' | 'neutral';
  priceSummary: string;
  pricingState: string;
  hasNoCostPrice: boolean;
}

interface RefreshTemplatePreviewData {
  refreshedAt: string;
  totalRows: number;
  addedRows: number;
  retainedRows: number;
  removedRows: number;
  addedItems: Array<{ item: string; entityType: 'GROUP' | 'VARIANT' | 'UNKNOWN' }>;
  removedItems: Array<{ item: string; entityType: 'GROUP' | 'VARIANT' | 'UNKNOWN' }>;
  file: string;
  filename: string;
}

interface UploadHistoryRow {
  rowId: string;
  status: SimplePricingBulkHistoryItem['status'];
  uploadedAtLabel: string;
  durationLabel: string;
  successRows: number;
  failedRows: number;
  unresolvedRows: number;
  totalRows: number;
  reviewLabel: string;
}

@Component({
  selector: 'gom-simple-pricing',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    TranslateModule,
    FormControlsModule,
    GomChipComponent,
    GomModalComponent,
    GomTableComponent,
    SimplePricingEditModalComponent,
    SimplePricingInfoModalComponent,
    SimplePricingReviewModalComponent,
    SimplePricingUploadFeedbackModalComponent,
    SimplePricingSearchAutocompleteComponent,
  ],
  templateUrl: './simple-pricing.component.html',
  styleUrls: ['./simple-pricing.component.scss'],
})
export class SimplePricingComponent implements OnInit, OnDestroy {
  private readonly service = inject(SimplePricingService);
  private readonly bulkUploadService = inject(SimplePricingBulkUploadService);
  private readonly authSession = inject(AuthSessionService);
  private readonly toast = inject(GomAlertToastService);
  private readonly translate = inject(TranslateService);
  private readonly el = inject(ElementRef);

  // ── Entitlements ────────────────────────────

  readonly canEdit = computed(
    () =>
      this.authSession.hasFeature('pricing.simple.edit') ||
      this.authSession.hasFeature('variant.edit')
  );

  // ── Filters ─────────────────────────────────

  readonly categoryControl = new FormControl<string>('');
  readonly groupTypeControl = new FormControl<string>('');
  readonly groupControl = new FormControl<string>('');
  readonly searchControl = new FormControl<string>('');

  /** Suggestion pinned from the API autocomplete search. */
  readonly searchPinnedSuggestion = signal<SimplePricingSearchSuggestion | null>(null);
  readonly searchAutocompleteResetKey = signal(0);
  readonly downloadCategoryControl = new FormControl<string[]>([], { nonNullable: true });
  readonly downloadGroupTypeControl = new FormControl<GroupType[]>([], { nonNullable: true });
  readonly downloadGroupControl = new FormControl<string[]>([], { nonNullable: true });

  // ── Loading / error state ────────────────────

  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly downloadingTemplate = signal(false);
  readonly refreshingTemplate = signal(false);
  readonly uploadingTemplate = signal(false);

  // ── Data ─────────────────────────────────────

  readonly categories = signal<SimplePricingCategory[]>([]);
  readonly allEntities = signal<PricingEntity[]>([]);
  readonly filterGroups = signal<SimplePricingGroup[]>([]);
  private readonly categoryMap = signal<Map<string, string>>(new Map<string, string>());

  private readonly groupsPageLimit = 20;
  private readonly attributeVariantsPageLimit = 500;
  private readonly attributeVariantConcurrency = 3;
  private nextGroupsPage = 1;
  private hasMoreGroups = false;
  readonly loadingMore = signal(false);
  readonly hasMoreItems = signal(false);

  // ── Filtered entities ────────────────────────

  private readonly categoryFilter = toSignal(
    this.categoryControl.valueChanges.pipe(startWith(''), distinctUntilChanged()),
    { initialValue: '' }
  );
  private readonly groupTypeFilter = toSignal(
    this.groupTypeControl.valueChanges.pipe(startWith(''), distinctUntilChanged()),
    { initialValue: '' }
  );
  private readonly groupFilter = toSignal(
    this.groupControl.valueChanges.pipe(startWith(''), distinctUntilChanged()),
    { initialValue: '' }
  );
  private readonly searchFilter = toSignal(
    this.searchControl.valueChanges.pipe(
      startWith(''),
      debounceTime(300),
      distinctUntilChanged()
    ),
    { initialValue: '' }
  );

  readonly filteredEntities = computed(() => {
    const pinned = this.searchPinnedSuggestion();
    const entities = this.allEntities();

    // ── API search mode: show only the selected entity ────────
    if (pinned) {
      const pinnedId = String(pinned.id || '');
      const pinnedType = String(pinned.entityType || '');
      return entities.filter(
        (e) => String(e.entityId || '') === pinnedId && String(e.entityType || '') === pinnedType
      );
    }

    // ── Local filter mode ─────────────────────────────────────
    const categoryId = this.categoryFilter() || '';
    const groupType = this.groupTypeFilter() || '';
    const groupId = this.groupFilter() || '';
    const search = (this.searchFilter() || '').toLowerCase().trim();

    return entities.filter((e) => {
      if (categoryId && e.categoryId !== categoryId) return false;
      if (groupType && e.groupType !== groupType) return false;
      if (groupId && String(e.group?._id || '') !== groupId) return false;
      if (search && !e.displayName.toLowerCase().includes(search)) return false;
      return true;
    });
  });

  // ── Table model ──────────────────────────────

  readonly tableRows = computed<PricingTableRow[]>(() =>
    this.filteredEntities().map((e) => {
      const editedSellingPrice = this.inlinePriceEdits()[e.trackId];
      const currentSellingPrice = editedSellingPrice ?? e.sellingPrice;
      const affectedProfit = e.actualPrice !== null
        ? this.computeProfit(currentSellingPrice, e.actualPrice, e.group)
        : null;
      const affectedProfitTone = this.resolveAffectedProfitTone(
        affectedProfit,
        e.definedProfitPercent
      );

      return {
        id: e.trackId,
        name: e.displayName,
        sellingPrice: this.formatPrice(currentSellingPrice),
        definedProfit: e.definedProfitPercent !== null
          ? `${e.definedProfitPercent.toFixed(1)}%`
          : '—',
        affectedProfit: affectedProfit !== null
          ? `${affectedProfit.toFixed(1)}%`
          : '—',
        affectedProfitTone,
        priceSummary: this.buildPriceSummary(e, currentSellingPrice),
        pricingState: e.pricingState,
        hasNoCostPrice: e.actualPrice === null || e.actualPrice === 0,
      };
    })
  );

  readonly uploadHistoryRows = computed<UploadHistoryRow[]>(() =>
    this.uploadHistoryJobs().map((job) => ({
      rowId: job.jobId,
      status: job.status,
      uploadedAtLabel: this.formatUploadDateTime(job.uploadedAt),
      durationLabel: job.durationLabel || '0s',
      successRows: job.totals.successRows,
      failedRows: job.totals.failedRows,
      unresolvedRows: job.totals.unresolvedRows,
      totalRows: job.totals.totalRows,
      reviewLabel: 'View Report',
    }))
  );

  readonly uploadHistoryColumns: GomTableColumn[] = [
    { key: 'uploadedAtLabel', header: 'Uploaded Date & Time', sortable: true, width: '220px' },
    { key: 'durationLabel', header: 'Duration', sortable: true, width: '110px' },
    { key: 'successRows', header: 'Success', sortable: true, width: '90px' },
    { key: 'failedRows', header: 'Failed', sortable: true, width: '90px' },
    { key: 'unresolvedRows', header: 'Unresolved', sortable: true, width: '110px' },
    { key: 'totalRows', header: 'Total', sortable: true, width: '90px' },
    {
      key: 'actions',
      header: 'Review',
      width: '130px',
      actionButtons: [
        {
          actionKey: 'review',
          label: () => 'View Report',
          icon: 'ri-file-list-3-line',
          variant: 'secondary',
        },
      ],
    },
  ];

  readonly uploadHistoryTableRows = computed<GomTableRow[]>(() =>
    this.uploadHistoryRows().map((row) => ({
      rowId: row.rowId,
      status: row.status,
      uploadedAtLabel: row.uploadedAtLabel,
      durationLabel: row.durationLabel,
      successRows: row.successRows,
      failedRows: row.failedRows,
      unresolvedRows: row.unresolvedRows,
      totalRows: row.totalRows,
      reviewLabel: row.reviewLabel,
    }))
  );

  // ── Inline editing / bulk save ──────────────

  private readonly inlinePriceControls = new Map<string, FormControl<string>>();
  private readonly inlinePriceSubscriptions = new Map<string, Subscription>();
  private readonly pendingInlineEditWrites = new Map<string, number | null>();
  private inlineEditWriteFlushScheduled = false;
  readonly inlinePriceEdits = signal<Record<string, number>>({});
  readonly bulkSaving = signal(false);

  readonly dirtyRowCount = computed(() => Object.keys(this.inlinePriceEdits()).length);
  readonly canSaveAll = computed(
    () => this.dirtyRowCount() > 0 && !this.bulkSaving() && !this.loading()
  );

  // ── Modals ───────────────────────────────────

  readonly editModalOpen = signal(false);
  readonly infoModalOpen = signal(false);
  readonly reviewModalOpen = signal(false);
  readonly headerActionsMenuOpen = signal(false);
  readonly reviewItems = signal<PriceReviewItem[]>([]);
  readonly selectedEntity = signal<PricingEntity | null>(null);
  readonly saving = signal(false);
  readonly refreshPreviewOpen = signal(false);
  readonly refreshPreviewData = signal<RefreshTemplatePreviewData | null>(null);
  readonly downloadTemplateModalOpen = signal(false);
  readonly loadingDownloadTemplateGroups = signal(false);
  readonly downloadTemplateGroups = signal<SimplePricingGroup[]>([]);
  readonly uploadAttentionVisible = signal(false);
  readonly uploadAttentionJobs = signal<SimplePricingBulkJobStatus[]>([]);
  readonly uploadHistoryOpen = signal(false);
  readonly loadingUploadHistory = signal(false);
  readonly uploadHistoryJobs = signal<SimplePricingBulkHistoryItem[]>([]);
  readonly uploadFeedbackOpen = signal(false);
  readonly loadingUploadFeedback = signal(false);
  readonly uploadFeedbackReadOnly = signal(false);
  readonly currentUploadJob = signal<SimplePricingBulkJobStatus | null>(null);
  readonly uploadResults = signal<SimplePricingBulkResults | null>(null);
  private readonly acknowledgedUploadJobs = signal<Record<string, true>>({});
  private uploadPollingSubscription: Subscription | null = null;

  // ── Dropdown options ─────────────────────────

  readonly categoryOptions = computed<GomSelectOption[]>(() => [
    { value: '', label: this.translate.instant('common.opt_all') },
    ...this.categories().map((c) => ({ value: c._id, label: c.name })),
  ]);

  readonly groupTypeOptions: GomSelectOption[] = [
    { value: '', label: 'All' },
    { value: 'MEASURED', label: 'Measured' },
    { value: 'HYBRID', label: 'Hybrid' },
    { value: 'ATTRIBUTE', label: 'Attribute' },
  ];

  readonly groupOptions = computed<GomSelectOption[]>(() => [
    { value: '', label: 'All' },
    ...this.filterGroups().map((group) => ({ value: group._id, label: group.name })),
  ]);

  readonly downloadCategoryOptions = computed<GomSelectOption[]>(() =>
    this.categories().map((c) => ({ value: c._id, label: c.name }))
  );

  readonly downloadGroupTypeOptions: GomSelectOption[] = [
    { value: 'MEASURED', label: 'Measured' },
    { value: 'HYBRID', label: 'Hybrid' },
    { value: 'ATTRIBUTE', label: 'Attribute' },
  ];

  readonly downloadGroupOptions = computed<GomSelectOption[]>(() => {
    const selectedCategoryIds = new Set(this.getSelectedDownloadCategoryIds());
    const selectedGroupTypes = new Set(this.getSelectedDownloadGroupTypes());

    const groups = this.downloadTemplateGroups().filter((group) => {
      if (selectedCategoryIds.size && !selectedCategoryIds.has(String(group.categoryId || ''))) {
        return false;
      }
      if (selectedGroupTypes.size && !selectedGroupTypes.has(group.groupType)) {
        return false;
      }
      return true;
    });

    return groups.map((group) => ({ value: group._id, label: group.name }));
  });

  private readonly downloadFilterSubscriptions: Subscription[] = [];
  private readonly listingFilterSubscriptions: Subscription[] = [];
  private lastPinnedGroupLookupId: string | null = null;

  // ─────────────────────────────────────────────
  // API search pinned-entity loader effect
  // ─────────────────────────────────────────────

  /**
   * When the user selects a suggestion from the API autocomplete, we pin that
   * entity and show only it in the table. If it isn't in the currently-loaded
   * pages, this effect keeps calling loadMoreData() until the entity appears or
   * all pages are exhausted.
   */
  /**
   * Pre-creates FormControls for every entity in the filtered list BEFORE the
   * template touches them. This keeps getSellingPriceControl() a pure map
   * lookup so that no subscriptions or signal writes can occur during render.
   */
  private readonly priceControlSyncEffect = effect(() => {
    this.syncPriceControls(this.filteredEntities(), this.inlinePriceEdits());
  });

  private syncPriceControls(
    entities: PricingEntity[],
    inlineEdits: Record<string, number>
  ): void {
    untracked(() => {
      const visibleIds = new Set(entities.map((entity) => entity.trackId));

      for (const entity of entities) {
        this.syncVisiblePriceControl(entity, inlineEdits);
      }

      for (const trackId of this.inlinePriceControls.keys()) {
        if (!visibleIds.has(trackId)) {
          this.inlinePriceSubscriptions.get(trackId)?.unsubscribe();
          this.inlinePriceSubscriptions.delete(trackId);
          this.inlinePriceControls.delete(trackId);
        }
      }
    });
  }

  private syncVisiblePriceControl(
    entity: PricingEntity,
    inlineEdits: Record<string, number>
  ): void {
    if (!this.inlinePriceControls.has(entity.trackId)) {
      this.buildPriceControlForEntity(entity);
      return;
    }

    const ctrl = this.inlinePriceControls.get(entity.trackId)!;
    const noCost = entity.actualPrice == null || entity.actualPrice === 0;
    if (noCost && ctrl.enabled) ctrl.disable({ emitEvent: false });
    if (!noCost && ctrl.disabled) ctrl.enable({ emitEvent: false });

    const hasPendingInlineEdit = Object.hasOwn(inlineEdits, entity.trackId);
    const nextValue = entity.sellingPrice.toFixed(2);
    if (!hasPendingInlineEdit && ctrl.value !== nextValue) {
      ctrl.setValue(nextValue, { emitEvent: false });
    }
  }

  private readonly pinnedEntityLoaderEffect = effect(() => {
    const pinned = this.searchPinnedSuggestion();
    if (!pinned) {
      this.lastPinnedGroupLookupId = null;
      return;
    }

    const pinnedId = String(pinned.id || '');
    const pinnedType = String(pinned.entityType || '');
    const alreadyLoaded = this.allEntities().some(
      (e) => String(e.entityId || '') === pinnedId && String(e.entityType || '') === pinnedType
    );

    if (alreadyLoaded) {
      this.lastPinnedGroupLookupId = null;
      return;
    }

    // Global search should not depend on currently loaded pages; fetch the
    // owning group directly so the selected entity can be materialized.
    const targetGroupId = pinned.entityType === 'GROUP'
      ? String(pinned.id || '').trim()
      : String(pinned.groupId || '').trim();

    if (
      targetGroupId
      && this.lastPinnedGroupLookupId !== targetGroupId
      && !this.loading()
      && !this.loadingMore()
    ) {
      this.lastPinnedGroupLookupId = targetGroupId;
      this.loadPinnedEntityGroup(targetGroupId);
      return;
    }

    if (!alreadyLoaded && this.hasMoreItems() && !this.loading() && !this.loadingMore()) {
      this.loadMoreData();
    }
  });

  // ─────────────────────────────────────────────
  // Lifecycle
  // ─────────────────────────────────────────────

  ngOnInit(): void {
    this.loadData();
    this.loadFilterGroups();
    this.setupListingFilterSubscriptions();
    this.setupDownloadTemplateFilterSubscriptions();
    this.restoreUploadAttention();
    this.startUploadPolling();
  }

  ngOnDestroy(): void {
    this.resetInlineEditState();
    this.stopUploadPolling();
    this.downloadFilterSubscriptions.forEach((sub) => sub.unsubscribe());
    this.listingFilterSubscriptions.forEach((sub) => sub.unsubscribe());
  }

  // ─────────────────────────────────────────────
  // API search handlers
  // ─────────────────────────────────────────────

  onSearchSuggestionSelected(suggestion: SimplePricingSearchSuggestion): void {
    this.lastPinnedGroupLookupId = null;
    this.searchPinnedSuggestion.set(suggestion);
    // Clear local text filter so it doesn't conflict with the pinned mode.
    this.searchControl.setValue('', { emitEvent: false });

    const targetGroupId = suggestion.entityType === 'GROUP'
      ? String(suggestion.id || '').trim()
      : String(suggestion.groupId || '').trim();

    if (targetGroupId) {
      this.lastPinnedGroupLookupId = targetGroupId;
      this.loadPinnedEntityGroup(targetGroupId);
    }
  }

  onSearchCleared(): void {
    this.lastPinnedGroupLookupId = null;
    this.searchPinnedSuggestion.set(null);
  }

  toggleHeaderActionsMenu(): void {
    this.headerActionsMenuOpen.update((open) => !open);
  }

  closeHeaderActionsMenu(): void {
    this.headerActionsMenuOpen.set(false);
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    if (this.headerActionsMenuOpen()) {
      this.closeHeaderActionsMenu();
    }
  }

  private loadPinnedEntityGroup(groupId: string): void {
    this.loadingMore.set(true);
    this.errorMessage.set(null);

    this.fetchGroupById(groupId)
      .subscribe({
        next: (group) => {
          if (!group) {
            this.loadingMore.set(false);
            return;
          }

          const categoryMap = this.categoryMap();
          this.buildEntitiesChunk([group], categoryMap).subscribe({
            next: (chunk) => {
              if (chunk.length === 0) {
                this.loadingMore.set(false);
                return;
              }

              // Upsert by trackId so global-search results override stale rows
              // and are visible even when not part of current paged dataset.
              this.allEntities.update((current) => {
                const byTrackId = new Map(current.map((entity) => [entity.trackId, entity]));
                chunk.forEach((entity) => byTrackId.set(entity.trackId, entity));
                return Array.from(byTrackId.values());
              });

              this.loadingMore.set(false);
            },
            error: () => {
              this.loadingMore.set(false);
            },
          });
        },
        error: () => {
          this.loadingMore.set(false);
        },
      });
  }

  private fetchGroupById(groupId: string): Observable<SimplePricingGroup | null> {
    return this.service.listGroups({
      groupId,
      status: 'ACTIVE',
      page: 1,
      limit: 1,
    }).pipe(
      catchError(() => of({ data: [], pagination: null } as any)),
      switchMap((response) => {
        const directHit = (response?.data || []).find(
          (group: SimplePricingGroup) => String(group._id || '') === groupId
        );

        if (directHit) {
          return of(directHit);
        }

        // Fallback: some environments ignore groupId on /groups.
        // Scan paged groups and find the target by _id.
        return this.findGroupByIdAcrossPages(groupId, 1, 200);
      })
    );
  }

  private findGroupByIdAcrossPages(
    groupId: string,
    page: number,
    limit: number
  ): Observable<SimplePricingGroup | null> {
    return this.service.listGroups({
      status: 'ACTIVE',
      page,
      limit,
    }).pipe(
      catchError(() => of({ data: [], pagination: { hasMore: false } } as any)),
      switchMap((response) => {
        const groups: SimplePricingGroup[] = response?.data || [];
        const hit = groups.find((group) => String(group._id || '') === groupId) || null;

        if (hit) {
          return of(hit);
        }

        if (response?.pagination?.hasMore) {
          return this.findGroupByIdAcrossPages(groupId, page + 1, limit);
        }

        return of(null);
      })
    );
  }

  private refreshGroupsInPlace(groupIds: string[]): void {
    const uniqueGroupIds = Array.from(new Set(
      (groupIds || []).map((id) => String(id || '').trim()).filter(Boolean)
    ));

    if (!uniqueGroupIds.length) {
      return;
    }

    this.loadingMore.set(true);

    from(uniqueGroupIds).pipe(
      concatMap((groupId) => this.fetchGroupById(groupId).pipe(catchError(() => of(null)))),
      toArray(),
      switchMap((groups) => {
        const refreshedGroups = groups.filter((group): group is SimplePricingGroup => Boolean(group));
        if (!refreshedGroups.length) {
          return of({ refreshedGroupIds: [] as string[], chunk: [] as PricingEntity[] });
        }

        const categoryMap = this.categoryMap();
        return this.buildEntitiesChunk(refreshedGroups, categoryMap).pipe(
          map((chunk) => ({
            refreshedGroupIds: refreshedGroups.map((group) => String(group._id)),
            chunk,
          }))
        );
      })
    ).subscribe({
      next: ({ refreshedGroupIds, chunk }) => {
        if (refreshedGroupIds.length) {
          this.allEntities.update((current) => this.mergeRefreshedEntitiesInPlace(
            current,
            refreshedGroupIds,
            chunk
          ));
        }

        this.loadingMore.set(false);
      },
      error: () => {
        this.loadingMore.set(false);
      },
    });
  }

  private mergeRefreshedEntitiesInPlace(
    current: PricingEntity[],
    refreshedGroupIds: string[],
    refreshedEntities: PricingEntity[]
  ): PricingEntity[] {
    const replacementByGroupId = new Map<string, PricingEntity[]>();

    refreshedEntities.forEach((entity) => {
      const groupId = this.resolveEntityGroupId(entity);
      if (!groupId) {
        return;
      }

      const existing = replacementByGroupId.get(groupId);
      if (existing) {
        existing.push(entity);
        return;
      }

      replacementByGroupId.set(groupId, [entity]);
    });

    const refreshedSet = new Set(refreshedGroupIds);
    const insertedGroupIds = new Set<string>();
    const merged: PricingEntity[] = [];

    current.forEach((entity) => {
      const groupId = this.resolveEntityGroupId(entity);
      if (!groupId || !refreshedSet.has(groupId)) {
        merged.push(entity);
        return;
      }

      if (insertedGroupIds.has(groupId)) {
        return;
      }

      const replacements = replacementByGroupId.get(groupId) ?? [];
      merged.push(...replacements);
      insertedGroupIds.add(groupId);
    });

    refreshedGroupIds.forEach((groupId) => {
      if (insertedGroupIds.has(groupId)) {
        return;
      }

      const replacements = replacementByGroupId.get(groupId);
      if (replacements?.length) {
        merged.push(...replacements);
        insertedGroupIds.add(groupId);
      }
    });

    return merged;
  }

  private resolveEntityGroupId(entity: PricingEntity): string {
    return entity.entityType === 'GROUP'
      ? String(entity.entityId || '')
      : String(entity.group?._id || '');
  }

  // ─────────────────────────────────────────────
  // Data loading
  // ─────────────────────────────────────────────

  loadData(): void {
    this.resetInlineEditState();
    this.loading.set(true);
    this.errorMessage.set(null);
    this.nextGroupsPage = 1;
    this.hasMoreGroups = false;
    this.hasMoreItems.set(false);
    this.allEntities.set([]);

    forkJoin({
      categories: this.service.listCategories().pipe(catchError(() => of({ data: [], pagination: null } as any))),
      groups: this.service.listGroups(this.buildGroupsListParams(this.nextGroupsPage)).pipe(catchError(() => of({ data: [], pagination: null } as any))),
    }).subscribe({
      next: ({ categories, groups }) => {
        this.categories.set(categories.data ?? []);
        const categoryMap = new Map<string, string>(
          (categories.data ?? []).map((c: SimplePricingCategory) => [c._id, c.name])
        );
        this.categoryMap.set(categoryMap);
        this.nextGroupsPage = 2;
        this.hasMoreGroups = Boolean(groups?.pagination?.hasMore);
        this.hasMoreItems.set(this.hasMoreGroups);
        this.buildEntities(groups.data ?? [], categoryMap, false);
      },
      error: () => {
        this.errorMessage.set(this.translate.instant('pricing.simple.error.loadFailed'));
        this.loading.set(false);
      },
    });
  }

  openDownloadTemplateModal(): void {
    if (this.downloadingTemplate()) {
      return;
    }

    // Pre-select all static options immediately so the user sees everything chosen by default.
    const allGroupTypes: GroupType[] = ['MEASURED', 'HYBRID', 'ATTRIBUTE'];
    const allCategoryIds = this.categories().map((c) => c._id);
    this.downloadCategoryControl.setValue(allCategoryIds, { emitEvent: false });
    this.downloadGroupTypeControl.setValue(allGroupTypes, { emitEvent: false });
    this.downloadGroupControl.setValue([], { emitEvent: false });

    this.downloadTemplateModalOpen.set(true);
    this.loadDownloadTemplateGroups();
  }

  closeDownloadTemplateModal(): void {
    this.downloadTemplateModalOpen.set(false);
  }

  downloadTemplate(): void {
    if (this.downloadingTemplate()) {
      return;
    }

    const categoryIds = this.getSelectedDownloadCategoryIds();
    const groupIds = this.getSelectedDownloadGroupIds();
    const groupTypes = this.getSelectedDownloadGroupTypes();
    const filters: SimplePricingTemplateDownloadFilters = {};

    if (categoryIds.length) {
      filters.categoryIds = categoryIds;
    }
    if (groupIds.length) {
      filters.groupIds = groupIds;
    }
    if (groupTypes.length) {
      filters.groupTypes = groupTypes;
    }

    this.downloadingTemplate.set(true);
    this.service.downloadTemplate(filters).subscribe({
      next: (blob) => {
        this.downloadingTemplate.set(false);
        const timestamp = new Date().toISOString().slice(0, 10);
        const filename = `simple-pricing-template-${timestamp}.xlsx`;
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        this.closeDownloadTemplateModal();
      },
      error: (err) => {
        this.downloadingTemplate.set(false);
        this.toast.error(err?.error?.message || 'Failed to download template. Please try again.');
      },
    });
  }

  private setupDownloadTemplateFilterSubscriptions(): void {
    const categorySub = this.downloadCategoryControl.valueChanges.pipe(distinctUntilChanged()).subscribe(() => {
      this.reconcileDownloadGroupSelection();
      if (this.downloadTemplateModalOpen()) {
        this.loadDownloadTemplateGroups();
      }
    });

    const groupTypeSub = this.downloadGroupTypeControl.valueChanges.pipe(distinctUntilChanged()).subscribe(() => {
      this.reconcileDownloadGroupSelection();
      if (this.downloadTemplateModalOpen()) {
        this.loadDownloadTemplateGroups();
      }
    });

    this.downloadFilterSubscriptions.push(categorySub, groupTypeSub);
  }

  private setupListingFilterSubscriptions(): void {
    const categorySub = this.categoryControl.valueChanges.pipe(distinctUntilChanged()).subscribe(() => {
      this.handlePrimaryListingFilterChange();
    });

    const groupTypeSub = this.groupTypeControl.valueChanges.pipe(distinctUntilChanged()).subscribe(() => {
      this.handlePrimaryListingFilterChange();
    });

    const groupSub = this.groupControl.valueChanges.pipe(distinctUntilChanged()).subscribe(() => {
      this.handleListingFilterChange();
    });

    this.listingFilterSubscriptions.push(categorySub, groupTypeSub, groupSub);
  }

  private handlePrimaryListingFilterChange(): void {
    const hadSelectedGroup = Boolean(String(this.groupControl.value || '').trim());
    this.loadFilterGroups();

    // If a specific group was selected, resetting it should emit so table filters clear too.
    if (hadSelectedGroup) {
      this.groupControl.setValue('');
      return;
    }

    this.handleListingFilterChange();
  }

  private handleListingFilterChange(): void {
    this.searchPinnedSuggestion.set(null);
    this.searchAutocompleteResetKey.update((value) => value + 1);
    this.loadData();
  }

  private buildGroupsListParams(page: number): {
    groupId?: string;
    categoryId?: string;
    groupType?: GroupType;
    status: 'ACTIVE';
    page: number;
    limit: number;
  } {
    const params: {
      groupId?: string;
      categoryId?: string;
      groupType?: GroupType;
      status: 'ACTIVE';
      page: number;
      limit: number;
    } = {
      status: 'ACTIVE',
      page,
      limit: this.groupsPageLimit,
    };

    const groupId = String(this.groupControl.value || '').trim();
    const categoryId = String(this.categoryControl.value || '').trim();
    const groupType = String(this.groupTypeControl.value || '').trim().toUpperCase();

    if (groupId) {
      params.groupId = groupId;
    }

    if (categoryId) {
      params.categoryId = categoryId;
    }

    if (groupType === 'MEASURED' || groupType === 'HYBRID' || groupType === 'ATTRIBUTE') {
      params.groupType = groupType;
    }

    return params;
  }

  private loadFilterGroups(): void {
    const params: {
      categoryId?: string;
      groupType?: GroupType;
      status: 'ACTIVE';
      page: number;
      limit: number;
    } = {
      status: 'ACTIVE',
      page: 1,
      limit: 1000,
    };

    const categoryId = String(this.categoryControl.value || '').trim();
    const groupType = String(this.groupTypeControl.value || '').trim().toUpperCase();

    if (categoryId) {
      params.categoryId = categoryId;
    }

    if (groupType === 'MEASURED' || groupType === 'HYBRID' || groupType === 'ATTRIBUTE') {
      params.groupType = groupType;
    }

    this.service.listGroups(params)
      .pipe(catchError(() => of({ data: [] } as any)))
      .subscribe((response) => {
        const groups: SimplePricingGroup[] = response?.data || [];
        this.filterGroups.set(groups);

        // Keep selected group valid for current category/groupType filter set.
        const selectedGroupId = String(this.groupControl.value || '').trim();
        if (selectedGroupId && !groups.some((group: SimplePricingGroup) => String(group._id) === selectedGroupId)) {
          this.groupControl.setValue('');
        }
      });
  }

  private loadDownloadTemplateGroups(): void {
    this.loadingDownloadTemplateGroups.set(true);

    const params: { status: 'ACTIVE'; page: number; limit: number } = {
      status: 'ACTIVE',
      page: 1,
      limit: 500,
    };

    this.service.listGroups(params).subscribe({
      next: (response) => {
        this.loadingDownloadTemplateGroups.set(false);
        this.downloadTemplateGroups.set(response?.data || []);
        // On initial load, if no groups are selected yet, select all available groups.
        if (!this.getSelectedDownloadGroupIds().length) {
          const allGroupIds = (response?.data || []).map((g) => g._id);
          this.downloadGroupControl.setValue(allGroupIds, { emitEvent: false });
        } else {
          this.reconcileDownloadGroupSelection();
        }
      },
      error: () => {
        this.loadingDownloadTemplateGroups.set(false);
        this.downloadTemplateGroups.set([]);
        this.reconcileDownloadGroupSelection();
      },
    });
  }

  private normalizeSelection(value: unknown): string[] {
    if (Array.isArray(value)) {
      return Array.from(new Set(
        value
          .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
          .filter(Boolean)
      ));
    }

    const single = typeof value === 'string' ? value.trim() : '';
    return single ? [single] : [];
  }

  private getSelectedDownloadCategoryIds(): string[] {
    return this.normalizeSelection(this.downloadCategoryControl.value);
  }

  private getSelectedDownloadGroupIds(): string[] {
    return this.normalizeSelection(this.downloadGroupControl.value);
  }

  private getSelectedDownloadGroupTypes(): GroupType[] {
    return this.normalizeSelection(this.downloadGroupTypeControl.value)
      .map((value) => value.toUpperCase())
      .filter((value): value is GroupType => value === 'MEASURED' || value === 'HYBRID' || value === 'ATTRIBUTE');
  }

  private reconcileDownloadGroupSelection(): void {
    const options = new Set(this.downloadGroupOptions().map((option) => String(option.value || '')));
    const selected = this.getSelectedDownloadGroupIds();
    const validSelection = selected.filter((groupId) => options.has(groupId));
    if (validSelection.length !== selected.length) {
      this.downloadGroupControl.setValue(validSelection, { emitEvent: false });
    }
  }

  onRefreshTemplateSelected(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file || this.refreshingTemplate()) {
      if (input) input.value = '';
      return;
    }

    this.refreshingTemplate.set(true);
    this.service.refreshTemplate(file).subscribe({
      next: (response) => {
        this.refreshingTemplate.set(false);
        const data = (response?.data || null) as RefreshTemplatePreviewData | null;
        if (!data?.file) {
          this.toast.error('Template refreshed but file payload is missing.');
          return;
        }

        this.refreshPreviewData.set(data);
        this.refreshPreviewOpen.set(true);
      },
      error: (err) => {
        this.refreshingTemplate.set(false);
        this.toast.error(err?.error?.message || 'Failed to refresh template. Please try again.');
      },
    });

    if (input) {
      input.value = '';
    }
  }

  closeRefreshPreview(): void {
    this.refreshPreviewOpen.set(false);
    this.refreshPreviewData.set(null);
  }

  confirmRefreshTemplateDownload(): void {
    const data = this.refreshPreviewData();
    if (!data?.file) {
      this.toast.error('Refresh preview data is missing. Please try again.');
      return;
    }

    const filename = data.filename || `simple-pricing-template-refreshed-${new Date().toISOString().slice(0, 10)}.xlsx`;
    this.downloadBase64Excel(data.file, filename);
    this.toast.success(
      `Template updated. Added ${data.addedRows} new rows, retained ${data.retainedRows}, removed ${data.removedRows}.`
    );
    this.closeRefreshPreview();
  }

  onUploadTemplateSelected(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file || this.uploadingTemplate()) {
      if (input) input.value = '';
      return;
    }

    this.uploadingTemplate.set(true);
    this.bulkUploadService.uploadTemplate(file).subscribe({
      next: (response) => {
        this.uploadingTemplate.set(false);
        const jobId = response?.data?.jobId;
        if (!jobId) {
          this.toast.error('Upload started but job id is missing.');
          return;
        }

        const newJob: SimplePricingBulkJobStatus = {
          jobId,
          status: 'QUEUED',
          isTerminal: false,
          totals: {
            totalRows: 0,
            processedRows: 0,
            successRows: 0,
            failedRows: 0,
            unresolvedRows: 0,
          },
          startedAt: null,
          completedAt: null,
          errorMessage: '',
          feedbackAcknowledged: false,
        };

        this.currentUploadJob.set(newJob);
        this.uploadAttentionJobs.update((jobs) => {
          const without = jobs.filter((j) => j.jobId !== newJob.jobId);
          return [newJob, ...without];
        });
        this.uploadAttentionVisible.set(this.uploadAttentionJobs().length > 0);
        this.uploadResults.set(null);
        this.toast.success('Template uploaded. Processing started in background.');
        this.restoreUploadAttention();
      },
      error: (err) => {
        this.uploadingTemplate.set(false);
        this.toast.error(err?.error?.message || 'Failed to upload template. Please try again.');
      },
    });

    if (input) {
      input.value = '';
    }
  }

  openUploadFeedback(jobId?: string, readOnly = false): void {
    const selectedJobId = String(jobId || this.currentUploadJob()?.jobId || '').trim();
    if (!selectedJobId) {
      return;
    }

    const job = this.uploadAttentionJobs().find((candidate) => candidate.jobId === selectedJobId)
      || this.currentUploadJob();
    if (!job) {
      return;
    }

    this.currentUploadJob.set(job);
    this.uploadFeedbackReadOnly.set(readOnly);
    this.uploadFeedbackOpen.set(true);
    this.loadUploadResults(job.jobId);
  }

  openUploadHistory(): void {
    if (this.loadingUploadHistory()) {
      return;
    }

    this.loadUploadHistory();
  }

  closeUploadHistory(): void {
    this.uploadHistoryOpen.set(false);
  }

  closeUploadFeedback(): void {
    this.uploadFeedbackOpen.set(false);
    this.uploadFeedbackReadOnly.set(false);
  }

  dismissUploadRow(rowId: string): void {
    const job = this.currentUploadJob();
    if (!job || !rowId) {
      return;
    }

    this.bulkUploadService.closeRow(job.jobId, rowId).subscribe({
      next: () => {
        this.loadUploadResults(job.jobId);
      },
      error: (err) => {
        this.toast.error(err?.error?.message || 'Failed to dismiss row.');
      },
    });
  }

  acknowledgeUploadFeedback(): void {
    const job = this.currentUploadJob();
    if (!job) {
      return;
    }

    this.bulkUploadService.suspendUnresolved(job.jobId).subscribe({
      next: () => {
        this.markUploadJobAcknowledged(job.jobId);
        this.uploadAttentionVisible.set(false);
        this.uploadFeedbackOpen.set(false);
        this.uploadFeedbackReadOnly.set(false);
        this.toast.success('Upload feedback acknowledged.');
        this.restoreUploadAttention();
      },
      error: (err) => {
        this.toast.error(err?.error?.message || 'Failed to acknowledge upload feedback.');
      },
    });
  }

  cancelCurrentUploadJob(jobId?: string): void {
    const selectedJobId = String(jobId || this.currentUploadJob()?.jobId || '').trim();
    if (!selectedJobId) {
      return;
    }

    const job = this.uploadAttentionJobs().find((candidate) => candidate.jobId === selectedJobId)
      || this.currentUploadJob();
    if (!job || job.isTerminal || job.status === 'CANCELLING') {
      return;
    }

    this.bulkUploadService.cancelJob(job.jobId, 'Canceled by user').subscribe({
      next: (response) => {
        const nextStatus = String(response?.data?.status || 'CANCELLING') as SimplePricingBulkJobStatus['status'];
        this.uploadAttentionJobs.update((jobs) => jobs.map((current) => {
          if (current.jobId !== job.jobId) {
            return current;
          }

          return {
            ...current,
            status: nextStatus,
            isTerminal: Boolean(response?.data?.isTerminal),
            errorMessage: response?.data?.message || current.errorMessage,
            cancelRequested: true,
            cancelReason: 'Canceled by user',
          };
        }));

        this.currentUploadJob.update((current) => {
          if (current?.jobId === job.jobId) {
            return {
              ...current,
              status: nextStatus,
              isTerminal: Boolean(response?.data?.isTerminal),
              errorMessage: response?.data?.message || current.errorMessage,
              cancelRequested: true,
              cancelReason: 'Canceled by user',
            };
          }
          return current;
        });

        this.toast.success('Cancel requested. In-flight row will complete before stopping.');
        this.restoreUploadAttention();
      },
      error: (err) => {
        this.toast.error(err?.error?.message || 'Failed to request cancellation.');
      },
    });
  }

  loadMoreData(): void {
    if (!this.hasMoreGroups || this.loading() || this.loadingMore()) {
      return;
    }

    this.loadingMore.set(true);
    this.service.listGroups(this.buildGroupsListParams(this.nextGroupsPage))
      .pipe(catchError(() => of({ data: [], pagination: { hasMore: false } } as any)))
      .subscribe({
        next: (groupsResponse) => {
          const groups = groupsResponse?.data ?? [];
          this.nextGroupsPage += 1;
          this.hasMoreGroups = Boolean(groupsResponse?.pagination?.hasMore);
          this.hasMoreItems.set(this.hasMoreGroups);
          this.buildEntities(groups, this.categoryMap(), true);
        },
        error: () => {
          this.loadingMore.set(false);
          this.errorMessage.set(this.translate.instant('pricing.simple.error.loadFailed'));
        },
      });
  }

  private buildEntities(groups: SimplePricingGroup[], categoryMap: Map<string, string>, append: boolean): void {
    if (groups.length === 0) {
      if (!append) {
        this.allEntities.set([]);
      }
      this.loading.set(false);
      this.loadingMore.set(false);
      return;
    }

    this.buildEntitiesChunk(groups, categoryMap).subscribe({
      next: (chunk) => {
        if (append) {
          this.allEntities.update((current) => [...current, ...chunk]);
        } else {
          this.allEntities.set(chunk);
        }
        this.loading.set(false);
        this.loadingMore.set(false);
      },
      error: () => {
        this.errorMessage.set(this.translate.instant('pricing.simple.error.loadFailed'));
        this.loading.set(false);
        this.loadingMore.set(false);
      },
    });
  }

  private buildEntitiesChunk(
    groups: SimplePricingGroup[],
    categoryMap: Map<string, string>
  ): Observable<PricingEntity[]> {
    if (groups.length === 0) {
      return of([]);
    }

    return from(groups).pipe(
      mergeMap(
        (group) => this.fetchAllVariantsForGroup(group._id).pipe(
          catchError(() => of([])),
          map((variants) => {
            if (group.groupType === 'ATTRIBUTE') {
              return variants.map((variant) => this.variantToEntity(variant, group, categoryMap));
            }

            return [this.groupToEntity(group, categoryMap, variants)];
          })
        ),
        this.attributeVariantConcurrency
      ),
      toArray(),
      map((entityBatches) => entityBatches.flat())
    );
  }

  private fetchAttributeVariantEntities(
    groups: SimplePricingGroup[],
    categoryMap: Map<string, string>
  ): Observable<PricingEntity[]> {
    if (groups.length === 0) {
      return of([]);
    }

    return from(groups).pipe(
      mergeMap(
        (group) => this.fetchAllVariantsForGroup(group._id).pipe(
          catchError(() => of([])),
          map((variants) => {
            const entities: PricingEntity[] = [];
            variants.forEach((variant) => {
              entities.push(this.variantToEntity(variant, group, categoryMap));
            });
            return entities;
          })
        ),
        this.attributeVariantConcurrency
      ),
      toArray(),
      map((entityBatches) => entityBatches.flat())
    );
  }

  private fetchAllVariantsForGroup(groupId: string): Observable<SimplePricingVariant[]> {
    return this.fetchAllVariantsForGroupPage(groupId, 1, []);
  }

  private fetchAllVariantsForGroupPage(
    groupId: string,
    page: number,
    collected: SimplePricingVariant[]
  ): Observable<SimplePricingVariant[]> {
    return this.fetchVariantsPage(groupId, page).pipe(
      concatMap(({ data, hasMore }) => {
        const nextCollected = [...collected, ...data];
        if (!hasMore) {
          return of(nextCollected);
        }
        return this.fetchAllVariantsForGroupPage(groupId, page + 1, nextCollected);
      })
    );
  }

  private fetchVariantsPage(groupId: string, page: number): Observable<{ data: SimplePricingVariant[]; hasMore: boolean }> {
    return this.service.listVariantsByGroup(groupId, {
      page,
      limit: this.attributeVariantsPageLimit,
    }).pipe(
      catchError(() => of({ data: [], pagination: { hasMore: false } } as any)),
      map((response) => ({
        data: response?.data ?? [],
        hasMore: Boolean(response?.pagination?.hasMore),
      }))
    );
  }

  private groupToEntity(
    g: SimplePricingGroup,
    categoryMap: Map<string, string>,
    variants: SimplePricingVariant[]
  ): PricingEntity {
    const representative = this.pickRepresentativeVariant(variants);
    const derivedPrices = this.deriveGroupPrices(g);
    const representativeSelling = representative ? this.resolveVariantSellingPrice(representative) : null;
    const representativeAnchor = representative ? this.resolveVariantAnchorPrice(representative) : null;
    const representativeActual = representative ? this.resolveVariantActualPrice(representative) : null;
    const selling = this.resolveDisplayPrice(representativeSelling, derivedPrices.selling);
    const anchor = this.resolveDisplayPrice(representativeAnchor, derivedPrices.anchor, selling);
    const actual = this.resolveDisplayActualPrice(representativeActual, derivedPrices.actual, g);
    const definedProfit = this.computeDefinedProfit(g);
    const affectedProfit = actual !== null ? this.computeProfit(selling, actual, g) : null;

    return {
      trackId: `group-${g._id}`,
      entityType: 'GROUP',
      entityId: g._id,
      displayName: g.name,
      groupType: g.groupType,
      categoryId: g.categoryId,
      categoryName: categoryMap.get(g.categoryId) ?? '',
      sellingPrice: selling,
      anchorPrice: anchor,
      actualPrice: actual,
      formulaSummary: this.buildFormulaSummary(g),
      resolvedFields: g.resolvedFields,
      definedProfitPercent: definedProfit,
      affectedProfitPercent: affectedProfit,
      pricingState: representative ? this.resolveVariantState(representative) : 'INHERITED',
      pricingMode: representative?.pricingMode ?? 'FORMULA',
      variantCount: variants.length,
      group: g,
    };
  }

  private pickRepresentativeVariant(variants: SimplePricingVariant[]): SimplePricingVariant | null {
    if (variants.length === 0) {
      return null;
    }

    const sorted = [...variants].sort((a, b) => {
      const aDelta = Math.abs(Number(a.convertedQuantity ?? 0) - 1);
      const bDelta = Math.abs(Number(b.convertedQuantity ?? 0) - 1);
      if (aDelta !== bDelta) {
        return aDelta - bDelta;
      }
      const aQty = Number(a.convertedQuantity ?? 0);
      const bQty = Number(b.convertedQuantity ?? 0);
      if (aQty !== bQty) {
        return aQty - bQty;
      }
      return String(a.name || '').localeCompare(String(b.name || ''));
    });

    return sorted[0] ?? null;
  }

  private variantToEntity(
    v: SimplePricingVariant,
    g: SimplePricingGroup,
    categoryMap: Map<string, string>
  ): PricingEntity {
    const actual = this.resolveVariantActualPrice(v) ?? v.price?.anchorPrice ?? null;
    const selling = this.resolveVariantSellingPrice(v);
    const anchor = this.resolveVariantAnchorPrice(v);
    const state = this.resolveVariantState(v);
    const definedProfit = this.computeDefinedProfit(g);

    return {
      trackId: `variant-${v._id}`,
      entityType: 'VARIANT',
      entityId: v._id,
      displayName: v.name,
      groupType: g.groupType,
      categoryId: g.categoryId,
      categoryName: categoryMap.get(g.categoryId) ?? '',
      sellingPrice: selling,
      anchorPrice: anchor,
      actualPrice: actual,
      formulaSummary: this.buildFormulaSummary(g),
      resolvedFields: g.resolvedFields,
      definedProfitPercent: definedProfit,
      affectedProfitPercent: actual ? this.computeProfit(selling, actual, g) : null,
      pricingState: state,
      pricingMode: v.pricingMode,
      group: g,
      variant: v,
    };
  }

  // ─────────────────────────────────────────────
  // Actions
  // ─────────────────────────────────────────────

  openEdit(entity: PricingEntity): void {
    this.selectedEntity.set(entity);
    this.editModalOpen.set(true);
  }

  openInfo(entity: PricingEntity): void {
    this.selectedEntity.set(entity);
    this.infoModalOpen.set(true);
  }

  closeEdit(): void {
    this.editModalOpen.set(false);
    this.selectedEntity.set(null);
    document.documentElement.style.overflow = '';
  }

  closeInfo(): void {
    this.infoModalOpen.set(false);
    this.selectedEntity.set(null);
    document.documentElement.style.overflow = '';
  }

  onEditSaved(payload: SimplePricingEditSavedPayload): void {
    const entity = this.selectedEntity();
    if (!entity) return;

    this.saving.set(true);

    if (payload.fieldPayload && entity.variant) {
      this.service.updateVariantFieldInputs(entity.variant._id, payload.fieldPayload).subscribe({
        next: () => {
          this.saving.set(false);
          this.closeEdit();
          this.toast.success(this.translate.instant('pricing.simple.toast.updated'));
          this.refreshGroupsInPlace([String(entity.group?._id || '')]);
        },
        error: (err) => {
          this.saving.set(false);
          this.toast.error(err?.error?.message ?? this.translate.instant('pricing.simple.error.updateFailed'));
        },
      });
      return;
    }

    if (payload.groupFieldValues?.length && entity.entityType === 'GROUP') {
      this.service.updateGroupFieldValues(entity.entityId, { fieldValues: payload.groupFieldValues }).pipe(
        switchMap(() => this.fetchAllVariantsForGroup(entity.entityId)),
        switchMap((variants) => {
          if (!variants.length) {
            return of(null);
          }

          const resetRequests = variants.map((variant) => this.service.updateVariantFieldInputs(variant._id, {
            variantId: variant._id,
            quantity: Number(variant.quantity || 0),
            unitId: variant.unitId,
            additionalPrice: Number(variant.additionalPrice || 0),
            pricingMode: 'FORMULA',
            clearOverride: true,
            reason: 'Reset to formula price',
          }));

          return forkJoin(resetRequests);
        })
      ).subscribe({
        next: () => {
          this.saving.set(false);
          this.closeEdit();
          this.toast.success(this.translate.instant('pricing.simple.toast.updated'));
          this.refreshGroupsInPlace([entity.entityId]);
        },
        error: (err) => {
          this.saving.set(false);
          this.toast.error(err?.error?.message ?? this.translate.instant('pricing.simple.error.updateFailed'));
        },
      });
      return;
    }

    if (payload.sellingPrice !== undefined) {
      const sellingPrice = payload.sellingPrice;
      const affectedGroupId = entity.entityType === 'GROUP'
        ? entity.entityId
        : String(entity.group?._id || '');

      this.saveSellingPrice(entity, sellingPrice, payload.reason).subscribe({
        next: () => {
          this.applySavedSellingPrices([{ trackId: entity.trackId, sellingPrice }]);
          this.saving.set(false);
          this.closeEdit();
          this.toast.success(this.translate.instant('pricing.simple.toast.updated'));
          this.refreshGroupsInPlace([affectedGroupId]);
        },
        error: (err) => {
          this.saving.set(false);
          this.toast.error(err?.error?.message ?? this.translate.instant('pricing.simple.error.updateFailed'));
        },
      });
    }
  }

  navigatePriceRow(event: KeyboardEvent, _currentIndex: number): void {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    // Scope the query to the price group (card list or table) that contains the active input
    const activeWrapper = (event.target as HTMLElement).closest('[data-price-input]');
    if (!activeWrapper) return;
    const group = (event.target as HTMLElement).closest('[data-price-group]');
    const scope = (group ?? this.el.nativeElement) as HTMLElement;
    const nativeInput = activeWrapper.querySelector('input');
    const nodeList = scope.querySelectorAll('[data-price-input] input');
    const inputs = ([] as HTMLInputElement[]).slice.call(nodeList) as HTMLInputElement[];
    const currentIndex = nativeInput ? inputs.indexOf(nativeInput as HTMLInputElement) : -1;
    if (currentIndex === -1) return;
    const targetIndex = event.key === 'ArrowDown' ? currentIndex + 1 : currentIndex - 1;
    const target = inputs[targetIndex];
    if (target) {
      event.preventDefault();
      (target as HTMLInputElement).focus();
      (target as HTMLInputElement).select();
    }
  }

  /**
   * Pure map lookup — no side effects, no control creation.
   * Controls are pre-built by priceControlSyncEffect before the template renders.
   * If a control is not ready yet (first render race), return a throwaway disabled
   * control so the template doesn't crash; the effect will replace it next tick.
   */
  getSellingPriceControl(trackId: string): FormControl<string> {
    const existing = this.inlinePriceControls.get(trackId);
    if (existing) {
      return existing;
    }
    // Fallback: control not yet built by the effect. Create it now but fully
    // outside the reactive/render context using untracked so no signals are touched.
    return untracked(() => this.buildPriceControlForEntity(this.getEntity(trackId), trackId));
  }

  /** Creates and registers a FormControl for the given entity. Safe to call outside render. */
  private buildPriceControlForEntity(
    entity: PricingEntity | undefined | null,
    fallbackTrackId?: string
  ): FormControl<string> {
    const trackId = entity?.trackId ?? fallbackTrackId ?? '';
    const initial = entity ? entity.sellingPrice.toFixed(2) : '';
    const noCost = entity?.actualPrice == null || entity?.actualPrice === 0;
    const control = new FormControl<string>(initial, { nonNullable: true });
    if (noCost) control.disable({ emitEvent: false });

    const subscription = control.valueChanges.subscribe((value) => {
      this.syncInlineEdit(trackId, value);
    });

    if (trackId) {
      this.inlinePriceControls.set(trackId, control);
      this.inlinePriceSubscriptions.set(trackId, subscription);
    }

    return control;
  }

  saveAllInlineEdits(): void {
    if (!this.canSaveAll()) {
      return;
    }

    const reviewItems = this.buildReviewItems();
    if (reviewItems.length === 0) {
      return;
    }

    this.reviewItems.set(reviewItems);
    this.reviewModalOpen.set(true);
  }

  onReviewCancelled(): void {
    // Per requirement: cancel only closes the modal, it should not reset edits.
    this.reviewModalOpen.set(false);
    // GomModalComponent sets documentElement.overflow='hidden' when open. Because
    // we mount it via @if, the component is destroyed (not just hidden) when we
    // set reviewModalOpen=false, so its internal effect never runs the cleanup
    // branch. Explicitly restore scroll here.
    document.documentElement.style.overflow = '';
  }

  onReviewConfirmed(remainingTrackIds: string[]): void {
    const allEditedTrackIds = Object.keys(this.inlinePriceEdits());
    const remainingSet = new Set(remainingTrackIds);
    const removedTrackIds = allEditedTrackIds.filter((id) => !remainingSet.has(id));

    // Removed rows should go back to previous/original values.
    removedTrackIds.forEach((trackId) => this.resetInlineEditForTrackId(trackId));

    this.reviewModalOpen.set(false);
    // Same scroll-restore needed here (see onReviewCancelled for explanation).
    document.documentElement.style.overflow = '';

    if (remainingTrackIds.length === 0) {
      return;
    }

    const edits = this.inlinePriceEdits();
    const requests = remainingTrackIds
      .map((trackId) => {
        const sellingPrice = edits[trackId];
        if (!Number.isFinite(sellingPrice)) {
          return null;
        }

        const entity = this.getEntity(trackId);
        if (!entity) {
          return null;
        }

        return this.saveSellingPrice(
          entity,
          sellingPrice,
          this.translate.instant('pricing.simple.bulk.defaultReason')
        );
      })
      .filter((request): request is Observable<unknown> => !!request);

    if (requests.length === 0) {
      return;
    }

    this.bulkSaving.set(true);

    const affectedGroupIds = remainingTrackIds
      .map((trackId) => this.getEntity(trackId))
      .filter((entity): entity is PricingEntity => Boolean(entity))
      .map((entity) => (entity.entityType === 'GROUP'
        ? entity.entityId
        : String(entity.group?._id || '')));

    forkJoin(requests).subscribe({
      next: () => {
        this.applySavedSellingPrices(
          remainingTrackIds
            .map((trackId) => {
              const sellingPrice = edits[trackId];
              return Number.isFinite(sellingPrice)
                ? { trackId, sellingPrice }
                : null;
            })
            .filter((item): item is { trackId: string; sellingPrice: number } => Boolean(item))
        );
        this.bulkSaving.set(false);
        this.reviewItems.set([]);
        this.resetInlineEditState();
        this.toast.success(
          this.translate.instant('pricing.simple.toast.bulkUpdated', { count: requests.length })
        );
        this.refreshGroupsInPlace(affectedGroupIds);
      },
      error: (err) => {
        this.bulkSaving.set(false);
        this.toast.error(err?.error?.message ?? this.translate.instant('pricing.simple.error.updateFailed'));
      },
    });
  }

  onRowAction(event: { actionKey: string; row: Record<string, unknown> }): void {
    const trackId = typeof event.row['_id'] === 'string' ? event.row['_id'] : '';
    const entity = this.getEntity(trackId);
    if (!entity) {
      return;
    }

    if (event.actionKey === 'edit') {
      if (!this.canEdit()) {
        return;
      }
      this.openEdit(entity);
      return;
    }

    if (event.actionKey === 'info') {
      this.openInfo(entity);
    }
  }

  openEditById(trackId: string): void {
    const entity = this.getEntity(trackId);
    if (entity) {
      this.openEdit(entity);
    }
  }

  openInfoById(trackId: string): void {
    const entity = this.getEntity(trackId);
    if (entity) {
      this.openInfo(entity);
    }
  }

  private restoreUploadAttention(): void {
    this.bulkUploadService.getAttentionJob().subscribe({
      next: (response) => {
        const payload = response?.data;
        const jobs = this.resolveAttentionJobs(payload);

        if (!payload?.hasAttention || !jobs.length) {
          this.uploadAttentionJobs.set([]);
          this.uploadAttentionVisible.set(false);
          return;
        }

        const visibleJobs = jobs.filter((job) => {
          if (this.isUploadJobAcknowledged(job.jobId)) {
            return false;
          }
          if (job.feedbackAcknowledged) {
            this.markUploadJobAcknowledged(job.jobId);
            return false;
          }
          return true;
        });

        this.uploadAttentionJobs.set(visibleJobs);
        this.uploadAttentionVisible.set(visibleJobs.length > 0);

        const current = this.currentUploadJob();
        if (!current || !visibleJobs.some((job) => job.jobId === current.jobId)) {
          this.currentUploadJob.set(visibleJobs[0] || null);
        }
      },
      error: () => {
        // Intentionally silent to avoid noisy errors on initial page load.
      },
    });
  }

  private startUploadPolling(): void {
    this.stopUploadPolling();
    this.uploadPollingSubscription = interval(2500)
      .pipe(
        startWith(0),
        switchMap(() => this.bulkUploadService.getAttentionJob()),
        catchError(() => of(null))
      )
      .subscribe((response) => {
        if (!response?.data) {
          return;
        }

        const payload = response.data;
        const jobs = this.resolveAttentionJobs(payload);

        const visibleJobs = jobs.filter((job) => {
          if (this.isUploadJobAcknowledged(job.jobId)) {
            return false;
          }
          if (job.feedbackAcknowledged) {
            this.markUploadJobAcknowledged(job.jobId);
            return false;
          }
          return this.shouldShowUploadAttention(job);
        });

        this.uploadAttentionJobs.set(visibleJobs);
        this.uploadAttentionVisible.set(visibleJobs.length > 0);

        const current = this.currentUploadJob();
        if (!current || !visibleJobs.some((job) => job.jobId === current.jobId)) {
          this.currentUploadJob.set(visibleJobs[0] || null);
        }
      });
  }

  private stopUploadPolling(): void {
    if (this.uploadPollingSubscription) {
      this.uploadPollingSubscription.unsubscribe();
      this.uploadPollingSubscription = null;
    }
  }

  private resolveAttentionJobs(payload: { job: SimplePricingBulkJobStatus | null; jobs?: SimplePricingBulkJobStatus[] } | null | undefined): SimplePricingBulkJobStatus[] {
    if (!payload) {
      return [];
    }

    if (Array.isArray(payload.jobs)) {
      return payload.jobs;
    }

    return payload.job ? [payload.job] : [];
  }

  private loadUploadResults(jobId: string): void {
    this.loadingUploadFeedback.set(true);
    this.bulkUploadService.getJobResults(jobId, 'all').subscribe({
      next: (response) => {
        this.loadingUploadFeedback.set(false);
        const results = response?.data ?? null;
        this.uploadResults.set(results);

        const latestJob = results?.job;
        if (!latestJob) {
          return;
        }

        this.uploadAttentionJobs.update((jobs) => jobs.map((job) => {
          if (job.jobId !== latestJob.jobId) {
            return job;
          }

          return {
            ...job,
            status: latestJob.status as SimplePricingBulkJobStatus['status'],
            isTerminal: latestJob.isTerminal,
            totals: {
              ...job.totals,
              ...latestJob.totals,
            },
          };
        }));

        this.currentUploadJob.update((current) => {
          if (current?.jobId !== latestJob.jobId) {
            return current;
          }

          return {
            ...current,
            status: latestJob.status as SimplePricingBulkJobStatus['status'],
            isTerminal: latestJob.isTerminal,
            totals: {
              ...current.totals,
              ...latestJob.totals,
            },
          };
        });

        this.uploadAttentionVisible.set(this.uploadAttentionJobs().length > 0);
      },
      error: (err) => {
        this.loadingUploadFeedback.set(false);
        this.toast.error(err?.error?.message || 'Failed to load upload feedback.');
      },
    });
  }

  private loadUploadHistory(): void {
    this.loadingUploadHistory.set(true);
    this.bulkUploadService.getHistoryJobs(1, 50).subscribe({
      next: (response) => {
        this.loadingUploadHistory.set(false);
        this.uploadHistoryJobs.set(response?.data?.data ?? []);
        this.uploadHistoryOpen.set(true);
      },
      error: (err) => {
        this.loadingUploadHistory.set(false);
        this.toast.error(err?.error?.message || 'Failed to load upload history.');
      },
    });
  }

  private shouldShowUploadAttention(job: SimplePricingBulkJobStatus): boolean {
    if (job.feedbackAcknowledged) {
      return false;
    }

    if (!job.isTerminal) {
      return true;
    }

    return true;
  }

  private markUploadJobAcknowledged(jobId: string): void {
    this.acknowledgedUploadJobs.update((current) => ({
      ...current,
      [jobId]: true,
    }));
  }

  private isUploadJobAcknowledged(jobId: string): boolean {
    return Boolean(this.acknowledgedUploadJobs()[jobId]);
  }

  private downloadBase64Excel(base64Content: string, filename: string): void {
    const binary = window.atob(base64Content);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.codePointAt(index) || 0;
    }

    const blob = new Blob(
      [bytes],
      { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
    );
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }

  formatUploadDateTime(value: string | null | undefined): string {
    if (!value) {
      return '—';
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return '—';
    }

    return parsed.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }

  openHistoryReport(jobId: string): void {
    const selectedJobId = String(jobId || '').trim();
    if (!selectedJobId) {
      return;
    }

    const historyJob = this.uploadHistoryJobs().find((job) => job.jobId === selectedJobId);
    if (!historyJob) {
      return;
    }

    const current: SimplePricingBulkJobStatus = {
      jobId: historyJob.jobId,
      status: historyJob.status,
      isTerminal: true,
      totals: {
        totalRows: historyJob.totals.totalRows,
        processedRows: historyJob.totals.totalRows,
        successRows: historyJob.totals.successRows,
        failedRows: historyJob.totals.failedRows,
        unresolvedRows: historyJob.totals.unresolvedRows,
      },
      startedAt: null,
      completedAt: null,
      errorMessage: '',
      feedbackAcknowledged: historyJob.status === 'COMPLETED' || historyJob.status === 'COMPLETED_WITH_ERRORS',
    };

    this.currentUploadJob.set(current);
    this.uploadHistoryOpen.set(false);
    this.openUploadFeedback(selectedJobId, true);
  }

  onUploadHistoryRowAction(event: { actionKey: string; row: GomTableRow }): void {
    if (event.actionKey !== 'review') {
      return;
    }

    const rowIdValue = event.row['rowId'];
    const rowId = typeof rowIdValue === 'string' ? rowIdValue : '';
    if (!rowId) {
      return;
    }

    this.openHistoryReport(rowId);
  }

  // ─────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────

  private buildManualPriceUpdatePayload(entity: PricingEntity, targetSellingPrice: number, reason: string) {
    if (entity.entityType === 'GROUP') {
      const currentSellingPrice = Number(entity.sellingPrice || 0);
      const adjustmentValue = Number((targetSellingPrice - currentSellingPrice).toFixed(2));
      return {
        scope: 'GROUP' as const,
        reason,
        groupId: entity.entityId,
        adjustmentType: 'AMOUNT' as const,
        adjustmentValue,
      };
    }

    return {
      scope: 'VARIANT' as const,
      reason,
      variantId: entity.entityId,
      fixedSellingPrice: targetSellingPrice,
    };
  }

  private buildDirectGroupPriceUpdatePayload(
    entity: PricingEntity,
    targetSellingPrice: number
  ): GroupUpdatePayload {
    const currentFormula = entity.group?.formula;
    const fixedSellingPrice = this.formatPriceFormulaValue(targetSellingPrice);

    return {
      formula: {
        sellingPrice: fixedSellingPrice,
        actualPrice: String(currentFormula?.actualPrice || currentFormula?.sellingPrice || fixedSellingPrice),
        anchorPrice: String(currentFormula?.anchorPrice || currentFormula?.sellingPrice || fixedSellingPrice),
      },
    };
  }

  private saveSellingPrice(
    entity: PricingEntity,
    targetSellingPrice: number,
    reason: string
  ): Observable<unknown> {
    if (entity.entityType !== 'GROUP') {
      return this.service.manualPriceUpdate(
        this.buildManualPriceUpdatePayload(entity, targetSellingPrice, reason)
      );
    }

    if ((entity.variantCount ?? 0) === 0) {
      return this.service.updateGroup(
        entity.entityId,
        this.buildDirectGroupPriceUpdatePayload(entity, targetSellingPrice)
      );
    }

    return this.service.manualPriceUpdate(
      this.buildManualPriceUpdatePayload(entity, targetSellingPrice, reason)
    ).pipe(
      switchMap((response) => {
        const updatedCount = this.extractUpdatedCount(response);
        if (updatedCount !== 0) {
          return of(response);
        }

        return this.service.updateGroup(
          entity.entityId,
          this.buildDirectGroupPriceUpdatePayload(entity, targetSellingPrice)
        );
      })
    );
  }

  private extractUpdatedCount(response: unknown): number | null {
    const updatedCount = (response as { data?: { updatedCount?: unknown } } | null)?.data?.updatedCount;
    return typeof updatedCount === 'number' && Number.isFinite(updatedCount)
      ? updatedCount
      : null;
  }

  private formatPriceFormulaValue(value: number): string {
    return (Math.round(value * 100) / 100).toFixed(2);
  }

  private applySavedSellingPrices(
    updates: Array<{ trackId: string; sellingPrice: number }>
  ): void {
    if (!updates.length) {
      return;
    }

    const priceByTrackId = new Map(
      updates.map(({ trackId, sellingPrice }) => [trackId, Math.round(sellingPrice * 100) / 100])
    );

    this.allEntities.update((current) => current.map((entity) => {
      const nextSellingPrice = priceByTrackId.get(entity.trackId);
      if (nextSellingPrice === undefined || Math.abs(entity.sellingPrice - nextSellingPrice) < 0.0001) {
        return entity;
      }

      return {
        ...entity,
        sellingPrice: nextSellingPrice,
      };
    }));

    updates.forEach(({ trackId, sellingPrice }) => {
      const control = this.inlinePriceControls.get(trackId);
      if (control) {
        control.setValue(this.formatPriceFormulaValue(sellingPrice), { emitEvent: false });
      }
    });
  }

  private syncInlineEdit(trackId: string, value: string): void {
    const entity = this.getEntity(trackId);
    if (!entity) {
      return;
    }

    const next = Number(value);

    // Ignore incomplete/invalid values until the user enters a valid number.
    if (!Number.isFinite(next) || next <= 0) {
      this.queueInlineEditWrite(trackId, null);
      return;
    }

    const rounded = Math.round(next * 100) / 100;
    const unchanged = Math.abs(rounded - entity.sellingPrice) < 0.0001;

    if (unchanged) {
      this.queueInlineEditWrite(trackId, null);
      return;
    }

    this.queueInlineEditWrite(trackId, rounded);
  }

  private queueInlineEditWrite(trackId: string, value: number | null): void {
    this.pendingInlineEditWrites.set(trackId, value);

    if (this.inlineEditWriteFlushScheduled) {
      return;
    }

    this.inlineEditWriteFlushScheduled = true;

    queueMicrotask(() => {
      this.inlineEditWriteFlushScheduled = false;

      if (this.pendingInlineEditWrites.size === 0) {
        return;
      }

      const pending = new Map(this.pendingInlineEditWrites);
      this.pendingInlineEditWrites.clear();

      this.inlinePriceEdits.update((current) => {
        let next = current;
        let changed = false;

        pending.forEach((pendingValue, pendingTrackId) => {
          if (pendingValue === null) {
            if (!(pendingTrackId in next)) {
              return;
            }

            if (!changed) {
              next = { ...next };
              changed = true;
            }

            delete next[pendingTrackId];
            return;
          }

          if (next[pendingTrackId] === pendingValue) {
            return;
          }

          if (!changed) {
            next = { ...next };
            changed = true;
          }

          next[pendingTrackId] = pendingValue;
        });

        return changed ? next : current;
      });
    });
  }

  private resetInlineEditState(): void {
    this.inlinePriceSubscriptions.forEach((sub) => sub.unsubscribe());
    this.inlinePriceSubscriptions.clear();
    this.inlinePriceControls.clear();
    this.pendingInlineEditWrites.clear();
    this.inlineEditWriteFlushScheduled = false;
    this.inlinePriceEdits.set({});
  }

  private resetInlineEditForTrackId(trackId: string): void {
    const entity = this.getEntity(trackId);
    if (!entity) {
      return;
    }

    const control = this.inlinePriceControls.get(trackId);
    if (control) {
      control.setValue(entity.sellingPrice.toFixed(2), { emitEvent: false });
    }

    this.inlinePriceEdits.update((current) => {
      if (!(trackId in current)) {
        return current;
      }
      const { [trackId]: _removed, ...remaining } = current;
      return remaining;
    });
  }

  private resolveVariantState(v: SimplePricingVariant): PricingState {
    if (v.pricingMode === 'OVERRIDE') return 'OVERRIDDEN';
    if (v.override?.fixedSellingPrice !== undefined && v.override?.fixedSellingPrice !== null) return 'OVERRIDDEN';
    if (v.additionalPrice !== undefined && v.additionalPrice !== null && v.additionalPrice !== 0) return 'ADJUSTED';
    return 'DIRECT';
  }

  private resolveVariantSellingPrice(v: SimplePricingVariant): number {
    // For OVERRIDE mode, the API always populates both effectivePrice and override.fixedSellingPrice
    // with the saved value. effectivePrice is the API's authoritative computed price for all modes.
    const effective = v.effectivePrice;
    if (effective?.sellingPrice !== undefined && Number.isFinite(effective.sellingPrice) && effective.sellingPrice > 0) {
      return Number(effective.sellingPrice);
    }

    // Fallback: explicit override when pricingMode is OVERRIDE (guards against stale override data)
    if (v.pricingMode === 'OVERRIDE' && v.override?.fixedSellingPrice != null && Number.isFinite(v.override.fixedSellingPrice) && Number(v.override.fixedSellingPrice) > 0) {
      return Number(v.override.fixedSellingPrice);
    }

    // FORMULA mode with an additional price adjustment
    if (v.additionalPrice !== undefined && v.additionalPrice !== null && Number.isFinite(v.additionalPrice)) {
      return Number(v.price.sellingPrice) + Number(v.additionalPrice);
    }

    return Number(v.price.sellingPrice);
  }

  private resolveVariantAnchorPrice(v: SimplePricingVariant): number {
    const effective = v.effectivePrice;
    if (effective?.anchorPrice !== undefined && Number.isFinite(effective.anchorPrice) && effective.anchorPrice > 0) {
      return Number(effective.anchorPrice);
    }

    if (v.override?.finalAnchorPrice !== undefined && v.override?.finalAnchorPrice !== null && Number.isFinite(v.override.finalAnchorPrice)) {
      return Number(v.override.finalAnchorPrice);
    }

    return Number(v.price.anchorPrice);
  }

  private resolveVariantActualPrice(v: SimplePricingVariant): number | null {
    const effective = v.effectivePrice;
    if (effective?.actualPrice !== undefined && effective.actualPrice !== null && Number.isFinite(effective.actualPrice)) {
      return Number(effective.actualPrice);
    }

    if (v.price?.actualPrice !== undefined && v.price.actualPrice !== null && Number.isFinite(v.price.actualPrice)) {
      return Number(v.price.actualPrice);
    }

    return null;
  }

  private deriveGroupPrices(g: SimplePricingGroup): { actual: number | null; selling: number | null; anchor: number | null } {
    if (!g.resolvedFields?.length) {
      return { actual: null, selling: null, anchor: null };
    }

    const fieldValues = g.resolvedFields.reduce((acc, field) => {
      if (Number.isFinite(field.value)) {
        acc[field.key] = Number(field.value);
      }
      return acc;
    }, {} as Record<string, number>);

    const actual = this.evaluateFormula(g.formula?.actualPrice || '', fieldValues);
    const selling = this.evaluateFormula(g.formula?.sellingPrice || '', {
      ...fieldValues,
      actualPrice: actual,
      actual_price: actual,
    });
    const anchor = this.evaluateFormula(g.formula?.anchorPrice || '', {
      ...fieldValues,
      actualPrice: actual,
      actual_price: actual,
      sellingPrice: selling,
      selling_price: selling,
    });

    return {
      actual: Number.isFinite(actual) ? actual : null,
      selling: Number.isFinite(selling) ? selling : null,
      anchor: Number.isFinite(anchor) ? anchor : null,
    };
  }

  private resolveDisplayPrice(primary?: number | null, fallback?: number | null, defaultValue: number = 0): number {
    if (Number.isFinite(primary) && Number(primary) > 0) {
      return Number(primary);
    }
    if (Number.isFinite(fallback) && Number(fallback) > 0) {
      return Number(fallback);
    }
    if (Number.isFinite(primary) && Number(primary) === 0 && (!Number.isFinite(fallback) || Number(fallback) <= 0)) {
      return 0;
    }
    return defaultValue;
  }

  private resolveDisplayActualPrice(primary?: number | null, fallback?: number | null, group?: SimplePricingGroup): number | null {
    if (Number.isFinite(primary) && Number(primary) > 0) {
      return Number(primary);
    }
    if (Number.isFinite(fallback) && Number(fallback) > 0) {
      return Number(fallback);
    }
    return group ? this.resolveActualFromFields(group) : null;
  }

  private resolveActualFromFields(g: SimplePricingGroup): number | null {
    if (!g.resolvedFields?.length) return null;
    const buyField = g.resolvedFields.find((f) =>
      ['buyPrice', 'buy_price', 'basePrice', 'costPrice'].includes(f.key)
    );
    return buyField ? buyField.value : null;
  }

  private computeDefinedProfit(g: SimplePricingGroup): number | null {
    const formula = String(g.formula?.sellingPrice || '').trim();
    const percentRegex = /\*\s*(\d+(?:\.\d+)?)%/;
    const percentMatch = percentRegex.exec(formula);
    if (percentMatch) {
      return Number.parseFloat(percentMatch[1]);
    }

    if (!g.resolvedFields?.length) return null;
    const profitField = g.resolvedFields.find((f) =>
      ['profit', 'profitPercent', 'margin', 'marginPercent'].includes(f.key)
    );
    return profitField ? profitField.value : null;
  }

  private computeProfit(selling: number, actual: number, group?: SimplePricingGroup): number {
    const baseFieldValue = group ? this.resolveBaseFieldValue(group) : null;
    if (baseFieldValue && baseFieldValue > 0) {
      return Math.round(((selling - actual) / baseFieldValue) * 100 * 10) / 10;
    }
    if (!actual || actual <= 0) return 0;
    return Math.round(((selling - actual) / actual) * 100 * 10) / 10;
  }

  private resolveAffectedProfitTone(
    affectedProfit: number | null,
    definedProfit: number | null
  ): 'info' | 'success' | 'danger' | 'neutral' {
    if (affectedProfit === null) {
      return 'neutral';
    }

    if (definedProfit === null) {
      return affectedProfit >= 0 ? 'info' : 'danger';
    }

    const delta = affectedProfit - definedProfit;
    if (Math.abs(delta) < 0.05) {
      return 'info';
    }

    return delta > 0 ? 'success' : 'danger';
  }

  private resolveBaseFieldValue(g: SimplePricingGroup): number | null {
    if (!g.resolvedFields?.length) {
      return null;
    }

    const baseFieldKey = this.extractBaseFieldKey(g.formula?.actualPrice);
    if (baseFieldKey) {
      const baseField = g.resolvedFields.find((field) => field.key === baseFieldKey);
      if (baseField) {
        return Number(baseField.value);
      }
    }

    const fallbackField = g.resolvedFields.find((field) =>
      ['buyPrice', 'buy_price', 'basePrice', 'costPrice'].includes(field.key)
    );
    return fallbackField ? Number(fallbackField.value) : null;
  }

  private extractBaseFieldKey(actualPriceFormula?: string): string | null {
    const formula = String(actualPriceFormula || '').trim();
    if (!formula) {
      return null;
    }

    const firstPart = formula.split('+').map((part) => part.trim()).find((part) => part.length > 0) || '';
    const keyRegex = /[A-Za-z_]\w*/;
    const match = keyRegex.exec(firstPart);
    return match ? match[0] : null;
  }

  private evaluateFormula(expression: string, context: Record<string, number>): number {
    const formula = String(expression || '').trim();
    if (!formula) return 0;
    if (!/^[a-zA-Z0-9_+\-*/().%\s]+$/.test(formula)) return 0;

    try {
      const normalized = this.normalizePercentSyntax(formula);
      const numeric = this.evaluateExpression(normalized, context);
      return Number.isFinite(numeric) ? Math.round(numeric * 100) / 100 : 0;
    } catch {
      return 0;
    }
  }

  private normalizePercentSyntax(expression: string): string {
    let result = '';
    let index = 0;

    while (index < expression.length) {
      const char = expression[index];

      if (/\d/.test(char)) {
        let end = index + 1;
        while (end < expression.length && /[\d.]/.test(expression[end])) {
          end += 1;
        }

        let next = end;
        while (next < expression.length && /\s/.test(expression[next])) {
          next += 1;
        }

        const numberText = expression.slice(index, end);
        if (expression[next] === '%') {
          result += `(${numberText}/100)`;
          index = next + 1;
          continue;
        }

        result += numberText;
        index = end;
        continue;
      }

      result += char;
      index += 1;
    }

    return result;
  }

  private evaluateExpression(expression: string, context: Record<string, number>): number {
    let index = 0;

    const parseExpression = (): number => {
      let value = parseTerm();
      while (true) {
        skipWhitespace();
        const operator = expression[index];
        if (operator !== '+' && operator !== '-') {
          break;
        }
        index += 1;
        const nextValue = parseTerm();
        value = operator === '+' ? value + nextValue : value - nextValue;
      }
      return value;
    };

    const parseTerm = (): number => {
      let value = parseFactor();
      while (true) {
        skipWhitespace();
        const operator = expression[index];
        if (operator !== '*' && operator !== '/') {
          break;
        }
        index += 1;
        const nextValue = parseFactor();
        if (operator === '*') {
          value *= nextValue;
        } else {
          value = nextValue === 0 ? 0 : value / nextValue;
        }
      }
      return value;
    };

    const parseFactor = (): number => {
      skipWhitespace();
      const operator = expression[index];
      if (operator === '+' || operator === '-') {
        index += 1;
        const value = parseFactor();
        return operator === '-' ? -value : value;
      }
      return parsePrimary();
    };

    const parsePrimary = (): number => {
      skipWhitespace();
      const char = expression[index];

      if (char === '(') {
        index += 1;
        const value = parseExpression();
        skipWhitespace();
        if (expression[index] === ')') {
          index += 1;
        }
        return value;
      }

      if (/\d|\./.test(char)) {
        return parseNumber();
      }

      if (/[A-Za-z_]/.test(char)) {
        return parseIdentifier();
      }

      return 0;
    };

    const parseNumber = (): number => {
      const start = index;
      while (index < expression.length && /[\d.]/.test(expression[index])) {
        index += 1;
      }
      const value = Number.parseFloat(expression.slice(start, index));
      return Number.isFinite(value) ? value : 0;
    };

    const parseIdentifier = (): number => {
      const start = index;
      while (index < expression.length && /\w/.test(expression[index])) {
        index += 1;
      }
      const key = expression.slice(start, index);
      const value = context[key];
      return Number.isFinite(value) ? value : 0;
    };

    const skipWhitespace = (): void => {
      while (index < expression.length && /\s/.test(expression[index])) {
        index += 1;
      }
    };

    return parseExpression();
  }

  private buildFormulaSummary(g: SimplePricingGroup): string | null {
    const formula = g.formula?.sellingPrice || g.formula?.actualPrice;
    if (!formula) return null;
    return formula.length > 60 ? formula.substring(0, 57) + '...' : formula;
  }

  private buildPriceSummary(e: PricingEntity, sellingPrice: number = e.sellingPrice): string {
    const parts = [`₹${sellingPrice.toFixed(2)}`];
    if (e.anchorPrice) parts.push(`MRP ₹${e.anchorPrice.toFixed(2)}`);
    if (e.actualPrice) parts.push(`Cost ₹${e.actualPrice.toFixed(2)}`);
    return parts.join(' · ');
  }

  private formatPrice(price: number): string {
    return `₹${price.toFixed(2)}`;
  }

  private buildReviewItems(): PriceReviewItem[] {
    const edits = this.inlinePriceEdits();

    return Object.entries(edits)
      .map(([trackId, newSellingPrice]) => {
        const entity = this.getEntity(trackId);
        if (!entity) {
          return null;
        }

        const oldSellingPrice = entity.sellingPrice;
        const affectedProfit = entity.actualPrice !== null
          ? this.computeProfit(newSellingPrice, entity.actualPrice, entity.group)
          : null;

        return {
          trackId,
          groupName: entity.entityType === 'GROUP' ? entity.displayName : entity.group.name,
          productName: entity.entityType === 'GROUP' ? 'Group Level Price' : entity.displayName,
          entityType: entity.entityType,
          oldSellingPrice,
          newSellingPrice,
          existingProfit: entity.definedProfitPercent !== null
            ? `${entity.definedProfitPercent.toFixed(1)}%`
            : '—',
          newProfit: affectedProfit !== null
            ? `${affectedProfit.toFixed(1)}%`
            : '—',
          newProfitTone: this.resolveAffectedProfitTone(affectedProfit, entity.definedProfitPercent),
        } satisfies PriceReviewItem;
      })
      .filter((item): item is PriceReviewItem => !!item);
  }

  getEntity(trackId: string): PricingEntity | null {
    return this.allEntities().find((e) => e.trackId === trackId) ?? null;
  }
}
