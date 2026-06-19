import { Component, DestroyRef, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Router } from '@angular/router';

import {
  GomAlertToastService,
  GomButtonComponent,
  GomConfirmationModalComponent,
  GomTableColumn,
  GomTableComponent,
  GomTableQuery,
  GomTableRow,
} from '@gomlibs/ui';
import { AuthSessionService } from '../../../../core/auth/auth-session.service';

import { OfferService } from '../../services';
import {
  Offer,
  OfferStatus,
} from '../../models';

interface OfferRow extends GomTableRow {
  offerId: string;
  name: string;
  couponCode: string;
  type: string;
  triggerType: string;
  statusCode: OfferStatus;
  status: string;
  priority: number;
  startDate: string;
  endDate: string;
  endDateRaw: Date | null;
  usedCount: string;
  lastUpdated: string;
}

/**
 * Offers Management - List Component
 * Displays all tenant offers with filters (status, type, search)
 * Supports create, edit, delete, and settings actions
 */
@Component({
  selector: 'gom-offers-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    GomButtonComponent,
    GomConfirmationModalComponent,
    GomTableComponent,
  ],
  templateUrl: './offers-list.component.html',
  styleUrl: './offers-list.component.scss',
})
export class OffersListComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly offerService = inject(OfferService);
  private readonly toast = inject(GomAlertToastService);
  private readonly translate = inject(TranslateService);
  private readonly authSession = inject(AuthSessionService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly canWrite = computed(() => this.authSession.canWrite('tenant-admin'));
  readonly errorMessage = signal<string | null>(null);


  readonly offers = signal<Offer[]>([]);
  readonly totalOffers = signal(0);
  readonly offerTablePageIndex = signal(0);
  readonly offerTablePageSize = signal(50);
  readonly canLoadAllOffers = signal(false);
  readonly allOffersLoaded = signal(false);
  readonly serverSidePaginationOffers = computed(() => this.totalOffers() > 500);
  readonly offerTableDataMode = computed<'client' | 'server'>(() => (this.serverSidePaginationOffers() && !this.allOffersLoaded() ? 'server' : 'client'));
  readonly translationVersion = signal(0);

  readonly deleteModalOpen = signal(false);
  readonly deletingOfferId = signal<string | null>(null);

  readonly filteredOffers = computed<OfferRow[]>(() => {
    this.translationVersion();

    return this.offers()
      .map((offer) => ({
        offerId: offer._id,
        name: offer.name,
        couponCode: offer.coupon?.code || '-',
        type: this.translate.instant(`gom.offers.type_${offer.type.toLowerCase()}`),
        triggerType: this.translate.instant(`gom.offers.trigger_${offer.triggerType.toLowerCase()}`),
        statusCode: offer.status,
        status: this.translate.instant(`gom.offers.status_${offer.status.toLowerCase()}`),
        priority: offer.priority,
        startDate: offer.validFrom ? new Date(offer.validFrom).toLocaleDateString() : '-',
        endDate: offer.validTo ? new Date(offer.validTo).toLocaleDateString() : '-',
        endDateRaw: offer.validTo ? new Date(offer.validTo) : null,
        usedCount: offer.usageLimitTotal
          ? `${offer.usedCount || 0} / ${offer.usageLimitTotal}`
          : this.translate.instant('gom.offers.unlimited'),
        lastUpdated: offer.updatedAt ? new Date(offer.updatedAt).toLocaleString() : '-',
      }));
  });

  readonly columns = computed<GomTableColumn<OfferRow>[]>(() => {
    this.translationVersion();

    return [
    { key: 'name', header: this.translate.instant('gom.offers.col_name'), sortable: true, width: '15rem' },
    { key: 'couponCode', header: this.translate.instant('gom.offers.col_coupon_code'), sortable: true, width: '10rem' },
    { key: 'type', header: this.translate.instant('gom.offers.col_type'), sortable: true, width: '10rem' },
    { key: 'triggerType', header: this.translate.instant('gom.offers.col_trigger'), sortable: true, width: '10rem' },
    { key: 'priority', header: this.translate.instant('gom.offers.col_priority'), sortable: true, width: '8rem' },
    {
      key: 'status',
      header: this.translate.instant('gom.offers.col_status'),
      sortable: true,
      width: '10rem',
      chipTone: (_val, row) => {
        switch (row.statusCode) {
          case OfferStatus.ACTIVE: return 'success';
          case OfferStatus.PAUSED: return 'warning';
          case OfferStatus.EXPIRED: return 'danger';
          default: return 'neutral';
        }
      },
    },
    { key: 'startDate', header: this.translate.instant('gom.offers.col_start_date'), width: '10rem' },
    {
      key: 'endDate',
      header: this.translate.instant('gom.offers.col_end_date'),
      width: '10rem',
      chipTone: (_val, row) => {
        if (!row.endDateRaw) return 'neutral';
        return row.endDateRaw < new Date() ? 'danger' : 'neutral';
      },
    },
    { key: 'usedCount', header: this.translate.instant('gom.offers.col_usage'), width: '10rem' },
    { key: 'lastUpdated', header: this.translate.instant('gom.offers.col_last_updated'), width: '12rem' },
    {
      key: 'offerId',
      header: this.translate.instant('common.labels.actions'),
      width: '20rem',
      actionButtons: [
        {
          label: this.translate.instant('common.btn_edit'),
          actionKey: 'edit',
          variant: 'secondary',
          icon: 'ri-pencil-line',
        },
        {
          label: (row) => this.getLifecycleActionLabel(row),
          actionKey: 'lifecycle',
          variant: 'secondary',
          icon: (row) => this.getLifecycleActionIcon(row),
          disabled: (row) => !this.getLifecycleActionKey(row),
          disabledTooltip: () => this.translate.instant('gom.offers.error_update'),
        },
        {
          label: this.translate.instant('gom.offers.btn_duplicate'),
          actionKey: 'duplicate',
          variant: 'secondary',
          icon: 'ri-file-copy-line',
        },
        {
          label: this.translate.instant('common.btn_delete'),
          actionKey: 'delete',
          variant: 'danger',
          icon: 'ri-delete-bin-line',
        },
      ],
    },
    ];
  });

  ngOnInit(): void {
    this.rebuildFilterOptions();
    this.translate.onLangChange.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.rebuildFilterOptions();
      this.translationVersion.update((value) => value + 1);
    });
    this.loadOffers();
    this.setupFilters();
  }

  private rebuildFilterOptions(): void {
    // Filter options removed — filtering handled by table-level search
  }

  private setupFilters(): void {
    // Filter controls removed — filtering handled by table-level search
  }

  loadOffers(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.offerTablePageIndex.set(0);
    this.allOffersLoaded.set(false);

    this.offerService.listOffers({
      page: 1,
      limit: this.offerTablePageSize(),
      sortBy: 'priority',
      sortOrder: 'desc',
    }).subscribe({
      next: (response) => {
        const pagination = response.pagination;
        this.totalOffers.set(pagination?.total || response.data.length || 0);
        this.canLoadAllOffers.set(Boolean(pagination?.canLoadAll));
        this.allOffersLoaded.set((pagination?.total || 0) <= 500);

        if ((pagination?.total || 0) <= 500 && pagination?.hasMore) {
          this.offerService.listOffers({
            page: 1,
            limit: pagination.total,
            sortBy: 'priority',
            sortOrder: 'desc',
          }).subscribe({
            next: (allRes) => this.offers.set(allRes.data || []),
          });
        } else {
          this.offers.set(response.data || []);
        }

        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading offers:', error);
        this.errorMessage.set(this.translate.instant('gom.offers.error_load'));
        this.toast.error(this.translate.instant('gom.offers.error_load'));
        this.loading.set(false);
      },
    });
  }

  onOfferTableQueryChange(query: GomTableQuery): void {
    if (this.offerTableDataMode() !== 'server') {
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    this.offerService.listOffers({
      page: query.pageIndex + 1,
      limit: query.pageSize,
      search: query.searchTerm?.trim() || undefined,
      sortBy: query.sort?.key || 'priority',
      sortOrder: (query.sort?.direction as 'asc' | 'desc' | undefined) || 'desc',
    }).subscribe({
      next: (response) => {
        this.allOffersLoaded.set(false);
        this.offers.set(response.data ?? []);
        this.totalOffers.set(response.pagination?.total || 0);
        this.canLoadAllOffers.set(Boolean(response.pagination?.canLoadAll));
        this.offerTablePageIndex.set(query.pageIndex);
        this.offerTablePageSize.set(query.pageSize);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading offers table page:', error);
        this.loading.set(false);
      },
    });
  }

  loadAllOffers(): void {
    this.loading.set(true);
    this.offerService.listOffers({
      page: 1,
      limit: this.totalOffers(),
      sortBy: 'priority',
      sortOrder: 'desc',
    }).subscribe({
      next: (response) => {
        this.offers.set(response.data ?? []);
        this.totalOffers.set(response.pagination?.total || response.data.length || 0);
        this.canLoadAllOffers.set(false);
        this.allOffersLoaded.set(true);
        this.offerTablePageIndex.set(0);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading all offers:', error);
        this.loading.set(false);
      },
    });
  }

  onCreate(): void {
    this.router.navigate(['/saas-admin/offers/create']);
  }

  onEdit(row: OfferRow): void {
    this.router.navigate([`/saas-admin/offers/edit/${row.offerId}`]);
  }

  onDelete(row: OfferRow): void {
    this.deletingOfferId.set(row.offerId);
    this.deleteModalOpen.set(true);
  }

  onConfirmDelete(): void {
    const offerId = this.deletingOfferId();
    if (!offerId) return;

    this.loading.set(true);
    this.offerService.deleteOffer(offerId).subscribe({
      next: () => {
        this.toast.success(this.translate.instant('gom.offers.deleted_success'));
        this.deleteModalOpen.set(false);
        this.deletingOfferId.set(null);
        this.loadOffers();
      },
      error: (error) => {
        console.error('Error deleting offer:', error);
        this.toast.error(this.translate.instant('gom.offers.error_delete'));
        this.loading.set(false);
      },
    });
  }

  onCancelDelete(): void {
    this.deleteModalOpen.set(false);
    this.deletingOfferId.set(null);
  }

  onSettings(): void {
    this.router.navigate(['/saas-admin/offers/settings']);
  }

  onActivate(row: OfferRow): void {
    this.loading.set(true);
    this.offerService.activateOffer(row.offerId).subscribe({
      next: () => {
        this.toast.success(this.translate.instant('gom.offers.updated_success'));
        this.loadOffers();
      },
      error: (error) => {
        console.error('Error activating offer:', error);
        this.toast.error(this.translate.instant('gom.offers.error_update'));
        this.loading.set(false);
      },
    });
  }

  onPause(row: OfferRow): void {
    this.loading.set(true);
    this.offerService.pauseOffer(row.offerId).subscribe({
      next: () => {
        this.toast.success(this.translate.instant('gom.offers.updated_success'));
        this.loadOffers();
      },
      error: (error) => {
        console.error('Error pausing offer:', error);
        this.toast.error(this.translate.instant('gom.offers.error_update'));
        this.loading.set(false);
      },
    });
  }

  onResume(row: OfferRow): void {
    this.loading.set(true);
    this.offerService.resumeOffer(row.offerId).subscribe({
      next: () => {
        this.toast.success(this.translate.instant('gom.offers.updated_success'));
        this.loadOffers();
      },
      error: (error) => {
        console.error('Error resuming offer:', error);
        this.toast.error(this.translate.instant('gom.offers.error_update'));
        this.loading.set(false);
      },
    });
  }

  onDuplicate(row: OfferRow): void {
    this.loading.set(true);
    this.offerService.duplicateOffer(row.offerId).subscribe({
      next: () => {
        this.toast.success(this.translate.instant('gom.offers.created_success'));
        this.loadOffers();
      },
      error: (error) => {
        console.error('Error duplicating offer:', error);
        this.toast.error(this.translate.instant('gom.offers.error_create'));
        this.loading.set(false);
      },
    });
  }

  private getLifecycleActionKey(row: OfferRow): 'activate' | 'pause' | 'resume' | null {
    if (row.statusCode === OfferStatus.ACTIVE) {
      return 'pause';
    }

    if (row.statusCode === OfferStatus.PAUSED) {
      return 'resume';
    }

    if (row.statusCode === OfferStatus.DRAFT) {
      return 'activate';
    }

    return null;
  }

  private getLifecycleActionLabel(row: OfferRow): string {
    const action = this.getLifecycleActionKey(row);
    if (action === 'pause') {
      return this.translate.instant('gom.offers.btn_pause');
    }

    if (action === 'resume') {
      return this.translate.instant('gom.offers.btn_resume');
    }

    return this.translate.instant('gom.offers.btn_activate');
  }

  private getLifecycleActionIcon(row: OfferRow): string {
    const action = this.getLifecycleActionKey(row);
    if (action === 'pause') {
      return 'ri-pause-circle-line';
    }

    if (action === 'resume') {
      return 'ri-play-line';
    }

    return 'ri-play-circle-line';
  }

  private onLifecycleAction(row: OfferRow): void {
    const action = this.getLifecycleActionKey(row);

    if (action === 'activate') {
      this.onActivate(row);
      return;
    }

    if (action === 'pause') {
      this.onPause(row);
      return;
    }

    if (action === 'resume') {
      this.onResume(row);
    }
  }

  onTableAction(event: { actionKey: string; row: OfferRow }): void {
    if (!this.canWrite()) {
      return;
    }

    if (event.actionKey === 'edit') {
      this.onEdit(event.row);
      return;
    }

    if (event.actionKey === 'delete') {
      this.onDelete(event.row);
      return;
    }

    if (event.actionKey === 'lifecycle') {
      this.onLifecycleAction(event.row);
      return;
    }

    if (event.actionKey === 'duplicate') {
      this.onDuplicate(event.row);
    }
  }
}
