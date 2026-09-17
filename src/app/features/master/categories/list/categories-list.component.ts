import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, HostListener, computed, ElementRef, inject, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { CATEGORY_DEFAULT_STATUS, CATEGORY_UI_TEXT } from '../categories.constants';
import { Category } from '../categories.service';
import { GomButtonComponent, GomTableColumn, GomTableComponent, GomTableQuery, GomTableRow } from '@gomlibs/ui';
import { DisableIfNoFeatureDirective } from '../../../../shared/directives/disable-if-no-feature.directive';
import { getNavIcon } from '../../../../shared/components/layout/nav.config';
import { PageHeadingComponent } from '../../../../shared/components/page-heading/page-heading.component';

interface CategoryTableRow extends GomTableRow {
  _id?: string;
  name: string;
  groupCount: number;
  imageAssetId?: string | null;
  imageUrl?: string;
  status: string;
}

export interface CategoryAction {
  action: 'view' | 'edit' | 'delete' | 'manage' | 'groups-info' | 'clone';
  category: Category;
}

@Component({
  selector: 'gom-categories-list',
  standalone: true,
  imports: [CommonModule, TranslateModule, GomTableComponent, GomButtonComponent, DisableIfNoFeatureDirective, PageHeadingComponent],
  templateUrl: './categories-list.component.html',
  styleUrl: './categories-list.component.scss'
})
export class CategoriesListComponent implements OnChanges {
  @Input() categories: Category[] = [];
  @Input() loading = false;
  @Input() canCreate = true;
  @Input() canEdit = true;
  @Input() canDelete = true;
  @Input() dataMode: 'client' | 'server' = 'client';
  @Input() totalItems = 0;
  @Input() pageIndex = 0;
  @Input() pageSize = 10;
  @Input() pageSizeOptions: number[] = [10, 20, 50];
  @Input() templateDownloading = false;
  @Input() templateUploading = false;
  @Output() action = new EventEmitter<CategoryAction>();
  @Output() addNew = new EventEmitter<void>();
  @Output() downloadTemplate = new EventEmitter<void>();
  @Output() uploadCategories = new EventEmitter<void>();
  @Output() queryChange = new EventEmitter<GomTableQuery>();
  @ViewChild('moreMenuBoundary', { read: ElementRef }) moreMenuBoundary?: ElementRef<HTMLElement>;
  readonly viewportWidth = signal<number>(window.innerWidth);
  readonly isMobileHeader = computed<boolean>(() => this.viewportWidth() <= 768);
  readonly headerActionsOpen = signal(false);
  readonly headingIcon = getNavIcon('/masters/categories');

  readonly text = CATEGORY_UI_TEXT;
  private readonly translate = inject(TranslateService);

  @HostListener('window:resize')
  onWindowResize(): void {
    this.viewportWidth.set(window.innerWidth);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.headerActionsOpen()) {
      return;
    }

    const boundary = this.moreMenuBoundary?.nativeElement;
    const target = event.target as Node | null;

    if (boundary && target && !boundary.contains(target)) {
      this.headerActionsOpen.set(false);
    }
  }

  readonly columns: GomTableColumn<CategoryTableRow>[] = [
    { key: 'name', header: CATEGORY_UI_TEXT.nameLabel, sortable: true, filterable: true },
    {
      key: 'groupCount',
      header: 'Groups',
      sortable: true,
      width: '8rem',
      clickActionKey: (row) => row.groupCount > 0 ? 'groups-info' : null,
      clickActionIcon: (row) => row.groupCount > 0 ? 'ri-information-line' : null,
    },
    { key: 'status', header: CATEGORY_UI_TEXT.statusLabel, sortable: true, filterable: true },
    {
      key: 'actions',
      header: CATEGORY_UI_TEXT.actionsLabel,
      width: '12rem',
      actionOverflowMenu: {
        actionKeys: ['view', 'manage', 'delete'],
        triggerIcon: 'ri-more-2-fill',
        triggerAriaLabel: 'More category actions',
        triggerButtonTitle: 'More category actions',
        backButtonText: 'Category actions',
      },
      actionButtons: [
        { label: CATEGORY_UI_TEXT.editAction, icon: 'ri-pencil-line', actionKey: 'edit', variant: 'secondary' },
        { label: 'Clone', icon: 'ri-file-copy-line', actionKey: 'clone', variant: 'secondary' },
        { label: CATEGORY_UI_TEXT.viewAction, icon: 'ri-eye-line', actionKey: 'view', variant: 'secondary' },
        { label: CATEGORY_UI_TEXT.deleteAction, icon: 'ri-delete-bin-line', actionKey: 'delete', variant: 'secondary' },
      ],
    },
  ];

  readonly mobileCardFields: string[] = ['name', 'groupCount', 'status'];

  constructor() {
    this.translate.onLangChange.subscribe(() => {
      this.rebuildColumns();
    });
    this.rebuildColumns();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['canCreate'] || changes['canEdit'] || changes['canDelete']) {
      this.rebuildColumns();
    }
  }

  get rows(): CategoryTableRow[] {
    return this.categories.map((category) => ({
      _id: category._id,
      ...category,
      groupCount: Number((category as Category & { groupCount?: number }).groupCount || 0),
      imageAssetId: category.imageAssetId ?? null,
      imageUrl: category.imageUrl || '',
      status: category.status || CATEGORY_DEFAULT_STATUS,
    }));
  }

  onEdit(category: Category) {
    this.action.emit({ action: 'edit', category });
  }

  onDelete(category: Category) {
    this.action.emit({ action: 'delete', category });
  }

  onAddNew() {
    this.addNew.emit();
  }

  onDownloadTemplateFromMenu(): void {
    this.downloadTemplate.emit();
    this.headerActionsOpen.set(false);
  }

  onUploadTemplateFromMenu(): void {
    this.uploadCategories.emit();
    this.headerActionsOpen.set(false);
  }

  toggleHeaderActionsMenu(): void {
    this.headerActionsOpen.update((open) => !open);
  }

  onRowAction(event: { actionKey: string; row: GomTableRow }) {
    const category = this.mapRowToCategory(event.row);

    if (event.actionKey === 'view') {
      this.action.emit({ action: 'view', category });
    }

    if (event.actionKey === 'edit') {
      this.onEdit(category);
    }

    if (event.actionKey === 'delete') {
      this.onDelete(category);
    }

    if (event.actionKey === 'manage') {
      this.action.emit({ action: 'manage', category });
    }

    if (event.actionKey === 'groups-info') {
      this.action.emit({ action: 'groups-info', category });
    }

    if (event.actionKey === 'clone') {
      this.action.emit({ action: 'clone', category });
    }
  }

  onRowClick(row: GomTableRow): void {
    this.action.emit({ action: 'view', category: this.mapRowToCategory(row) });
  }

  onTableQueryChange(query: GomTableQuery): void {
    this.queryChange.emit(query);
  }

  private mapRowToCategory(row: GomTableRow): Category {
    return {
      _id: typeof row['_id'] === 'string' ? row['_id'] : '',
      name: typeof row['name'] === 'string' ? row['name'] : '',
      groupCount: typeof row['groupCount'] === 'number' ? row['groupCount'] : Number(row['groupCount'] || 0),
      imageAssetId: typeof row['imageAssetId'] === 'string' ? row['imageAssetId'] : null,
      imageUrl: typeof row['imageUrl'] === 'string' ? row['imageUrl'] : '',
      status: row['status'] === 'INACTIVE' ? 'INACTIVE' : CATEGORY_DEFAULT_STATUS,
    };
  }

  private rebuildColumns(): void {
    this.columns[0].header = this.translate.instant(this.text.nameLabel);
    this.columns[1].header = this.translate.instant('categories.associations.tabs.groups');
    this.columns[1].format = (value) => String(Number(value || 0));
    this.columns[2].header = this.translate.instant(this.text.statusLabel);
    this.columns[2].format = (value) =>
      value === 'INACTIVE'
        ? this.translate.instant('common.status.inactive')
        : this.translate.instant('common.status.active');
    this.columns[3].header = this.translate.instant(this.text.actionsLabel);
    this.columns[3].actionOverflowMenu = {
      actionKeys: ['view', 'manage', 'delete'],
      triggerIcon: 'ri-more-2-fill',
      triggerAriaLabel: 'More category actions',
      triggerButtonTitle: 'More category actions',
      backButtonText: 'Category actions',
    };
    this.columns[3].actionButtons = [
      ...(this.canEdit ? [
        { label: this.translate.instant(this.text.editAction), icon: 'ri-pencil-line', actionKey: 'edit', variant: 'secondary' as const },
      ] : []),
      ...(this.canCreate ? [
        { label: 'Clone', icon: 'ri-file-copy-line', actionKey: 'clone', variant: 'secondary' as const },
      ] : []),
      { label: this.translate.instant(this.text.viewAction), icon: 'ri-eye-line', actionKey: 'view', variant: 'secondary' },
      ...(this.canEdit ? [
        { label: this.translate.instant('categories.associations.manage'), actionKey: 'manage', variant: 'secondary' as const, icon: 'ri-links-line' },
      ] : []),
      ...(this.canDelete ? [
        { label: this.translate.instant(this.text.deleteAction), icon: 'ri-delete-bin-line', actionKey: 'delete', variant: 'secondary' as const },
      ] : []),
    ];
  }
}
