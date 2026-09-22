import * as i0 from '@angular/core';
import { EventEmitter, OnChanges, SimpleChanges, OnInit, AfterViewInit, OnDestroy, ElementRef } from '@angular/core';
import * as i1 from '@angular/common';
import { ControlValueAccessor, FormGroup, FormBuilder } from '@angular/forms';
import { Observable } from 'rxjs';

declare class GomButtonComponent {
    type: 'button' | 'submit' | 'reset';
    variant: 'primary' | 'secondary' | 'danger' | 'ghost';
    size: 'default' | 'icon' | 'compact-icon';
    disabled: boolean;
    ariaLabel: string;
    ariaExpanded: boolean | null;
    ariaHaspopup: 'menu' | 'dialog' | null;
    ariaCurrent: 'page' | null;
    buttonTitle: string;
    ariaRole: string;
    buttonClick: EventEmitter<MouseEvent>;
    handleClick(event: MouseEvent): void;
    static ɵfac: i0.ɵɵFactoryDeclaration<GomButtonComponent, never>;
    static ɵcmp: i0.ɵɵComponentDeclaration<GomButtonComponent, "gom-lib-button", never, { "type": { "alias": "type"; "required": false; }; "variant": { "alias": "variant"; "required": false; }; "size": { "alias": "size"; "required": false; }; "disabled": { "alias": "disabled"; "required": false; }; "ariaLabel": { "alias": "ariaLabel"; "required": false; }; "ariaExpanded": { "alias": "ariaExpanded"; "required": false; }; "ariaHaspopup": { "alias": "ariaHaspopup"; "required": false; }; "ariaCurrent": { "alias": "ariaCurrent"; "required": false; }; "buttonTitle": { "alias": "buttonTitle"; "required": false; }; "ariaRole": { "alias": "ariaRole"; "required": false; }; }, { "buttonClick": "buttonClick"; }, never, ["*"], true, never>;
}

declare class GomCheckboxComponent implements ControlValueAccessor {
    label: string;
    hint: string;
    error: string;
    id: string;
    checkedChange: EventEmitter<boolean>;
    checked: boolean;
    disabled: boolean;
    private onChange;
    private onTouched;
    writeValue(value: boolean | null): void;
    registerOnChange(fn: (value: boolean) => void): void;
    registerOnTouched(fn: () => void): void;
    setDisabledState(disabled: boolean): void;
    handleChange(event: Event): void;
    handleBlur(): void;
    static ɵfac: i0.ɵɵFactoryDeclaration<GomCheckboxComponent, never>;
    static ɵcmp: i0.ɵɵComponentDeclaration<GomCheckboxComponent, "gom-lib-checkbox", never, { "label": { "alias": "label"; "required": false; }; "hint": { "alias": "hint"; "required": false; }; "error": { "alias": "error"; "required": false; }; "id": { "alias": "id"; "required": false; }; }, { "checkedChange": "checkedChange"; }, never, never, true, never>;
}

declare class GomInputComponent implements ControlValueAccessor {
    label: string;
    required: boolean;
    type: 'text' | 'email' | 'password' | 'number' | 'search' | 'date' | 'datetime-local';
    min?: string | number;
    max?: string | number;
    step?: string | number;
    placeholder: string;
    inputmode?: 'none' | 'text' | 'decimal' | 'numeric' | 'tel' | 'search' | 'email' | 'url';
    hint: string;
    error: string;
    leadingIcon: string;
    clearable: boolean;
    id: string;
    ariaLabel: string;
    valueChange: EventEmitter<string>;
    value: string;
    disabled: boolean;
    private onChange;
    private onTouched;
    writeValue(value: string | null): void;
    registerOnChange(fn: (value: string) => void): void;
    registerOnTouched(fn: () => void): void;
    setDisabledState(disabled: boolean): void;
    handleInput(event: Event): void;
    handleBlur(): void;
    clearValue(): void;
    static ɵfac: i0.ɵɵFactoryDeclaration<GomInputComponent, never>;
    static ɵcmp: i0.ɵɵComponentDeclaration<GomInputComponent, "gom-lib-input", never, { "label": { "alias": "label"; "required": false; }; "required": { "alias": "required"; "required": false; }; "type": { "alias": "type"; "required": false; }; "min": { "alias": "min"; "required": false; }; "max": { "alias": "max"; "required": false; }; "step": { "alias": "step"; "required": false; }; "placeholder": { "alias": "placeholder"; "required": false; }; "inputmode": { "alias": "inputmode"; "required": false; }; "hint": { "alias": "hint"; "required": false; }; "error": { "alias": "error"; "required": false; }; "leadingIcon": { "alias": "leadingIcon"; "required": false; }; "clearable": { "alias": "clearable"; "required": false; }; "id": { "alias": "id"; "required": false; }; "ariaLabel": { "alias": "ariaLabel"; "required": false; }; "disabled": { "alias": "disabled"; "required": false; }; }, { "valueChange": "valueChange"; }, never, never, true, never>;
}

interface GomSelectOption {
    label: string;
    value: string;
}
declare class GomSelectComponent implements ControlValueAccessor, OnChanges {
    label: string;
    required: boolean;
    placeholder: string;
    options: GomSelectOption[];
    isDisabled: boolean;
    hint: string;
    error: string;
    id: string;
    multiple: boolean;
    selectedValues: string[];
    searchable: boolean;
    searchPlaceholder: string;
    selectAllLabel: string;
    closeMenuTrigger: unknown;
    ariaLabel: string;
    valueChange: EventEmitter<string>;
    selectedValuesChange: EventEmitter<string[]>;
    private readonly el;
    value: string;
    disabled: boolean;
    menuOpen: boolean;
    menuOpenUpward: boolean;
    searchTerm: string;
    menuStyles: Record<string, string>;
    private onChange;
    private onTouched;
    ngOnChanges(changes: SimpleChanges): void;
    get displayLabel(): string;
    get filteredOptions(): GomSelectOption[];
    get showSelectAll(): boolean;
    get isAllVisibleSelected(): boolean;
    writeValue(value: string | string[] | null): void;
    registerOnChange(fn: (value: unknown) => void): void;
    registerOnTouched(fn: () => void): void;
    setDisabledState(disabled: boolean): void;
    toggleMenu(): void;
    onSearchInput(event: Event): void;
    selectOption(value: string): void;
    toggleSelectAll(): void;
    isSelected(optionValue: string): boolean;
    onDocumentClick(event: MouseEvent): void;
    onWindowResize(): void;
    onViewportScroll(): void;
    private updateMenuDirection;
    private computeMenuPosition;
    private closeMenu;
    static ɵfac: i0.ɵɵFactoryDeclaration<GomSelectComponent, never>;
    static ɵcmp: i0.ɵɵComponentDeclaration<GomSelectComponent, "gom-lib-select", never, { "label": { "alias": "label"; "required": false; }; "required": { "alias": "required"; "required": false; }; "placeholder": { "alias": "placeholder"; "required": false; }; "options": { "alias": "options"; "required": false; }; "isDisabled": { "alias": "isDisabled"; "required": false; }; "hint": { "alias": "hint"; "required": false; }; "error": { "alias": "error"; "required": false; }; "id": { "alias": "id"; "required": false; }; "multiple": { "alias": "multiple"; "required": false; }; "selectedValues": { "alias": "selectedValues"; "required": false; }; "searchable": { "alias": "searchable"; "required": false; }; "searchPlaceholder": { "alias": "searchPlaceholder"; "required": false; }; "selectAllLabel": { "alias": "selectAllLabel"; "required": false; }; "closeMenuTrigger": { "alias": "closeMenuTrigger"; "required": false; }; "ariaLabel": { "alias": "ariaLabel"; "required": false; }; }, { "valueChange": "valueChange"; "selectedValuesChange": "selectedValuesChange"; }, never, never, true, never>;
}

declare class GomSwitchComponent {
    checked: boolean;
    disabled: boolean;
    leftText: string;
    rightText: string;
    leftIcon: string;
    rightIcon: string;
    ariaLabel: string;
    checkedChange: EventEmitter<boolean>;
    toggle(): void;
    static ɵfac: i0.ɵɵFactoryDeclaration<GomSwitchComponent, never>;
    static ɵcmp: i0.ɵɵComponentDeclaration<GomSwitchComponent, "gom-lib-switch", never, { "checked": { "alias": "checked"; "required": false; }; "disabled": { "alias": "disabled"; "required": false; }; "leftText": { "alias": "leftText"; "required": false; }; "rightText": { "alias": "rightText"; "required": false; }; "leftIcon": { "alias": "leftIcon"; "required": false; }; "rightIcon": { "alias": "rightIcon"; "required": false; }; "ariaLabel": { "alias": "ariaLabel"; "required": false; }; }, { "checkedChange": "checkedChange"; }, never, never, true, never>;
}

declare class GomTextareaComponent implements ControlValueAccessor {
    label: string;
    required: boolean;
    placeholder: string;
    rows: number;
    hint: string;
    error: string;
    id: string;
    valueChange: EventEmitter<string>;
    focus: EventEmitter<void>;
    value: string;
    disabled: boolean;
    private onChange;
    private onTouched;
    writeValue(value: string | null): void;
    registerOnChange(fn: (value: string) => void): void;
    registerOnTouched(fn: () => void): void;
    setDisabledState(disabled: boolean): void;
    handleInput(event: Event): void;
    handleBlur(): void;
    handleFocus(): void;
    static ɵfac: i0.ɵɵFactoryDeclaration<GomTextareaComponent, never>;
    static ɵcmp: i0.ɵɵComponentDeclaration<GomTextareaComponent, "gom-lib-textarea", never, { "label": { "alias": "label"; "required": false; }; "required": { "alias": "required"; "required": false; }; "placeholder": { "alias": "placeholder"; "required": false; }; "rows": { "alias": "rows"; "required": false; }; "hint": { "alias": "hint"; "required": false; }; "error": { "alias": "error"; "required": false; }; "id": { "alias": "id"; "required": false; }; }, { "valueChange": "valueChange"; "focus": "focus"; }, never, never, true, never>;
}

declare class FormControlsModule {
    static ɵfac: i0.ɵɵFactoryDeclaration<FormControlsModule, never>;
    static ɵmod: i0.ɵɵNgModuleDeclaration<FormControlsModule, never, [typeof GomButtonComponent, typeof GomCheckboxComponent, typeof GomInputComponent, typeof GomSelectComponent, typeof GomSwitchComponent, typeof GomTextareaComponent], [typeof GomButtonComponent, typeof GomCheckboxComponent, typeof GomInputComponent, typeof GomSelectComponent, typeof GomSwitchComponent, typeof GomTextareaComponent]>;
    static ɵinj: i0.ɵɵInjectorDeclaration<FormControlsModule>;
}

type GomTableRow = Record<string, unknown>;
type GomTableAlign = 'left' | 'center' | 'right';
type GomTableTextMode = 'truncate' | 'wrap' | 'expand';
type GomSortDirection = 'asc' | 'desc' | '';
type GomTableActionVariant = 'primary' | 'secondary' | 'danger';
type GomTableEditMode = 'click' | 'always';
type GomTableEditorType = 'text' | 'number';
type GomTableGlobalSearchScope = 'visible' | 'all';
type GomTableFilterType = 'text' | 'select' | 'multi-select' | 'date' | 'date-range';
type GomTableFilterPlacement = 'panel' | 'toolbar' | 'both';
type GomTableFilterValue = string | string[] | {
    from: string;
    to: string;
};
type GomTableMobileFilterControl = 'checkboxes' | 'chips' | 'radio' | 'default';
interface GomTableFilterOption {
    label: string;
    value: string;
    count?: number;
}
interface GomTableFilterNavigationOption extends GomTableFilterOption {
    count?: number;
    disabled?: boolean;
}
interface GomTableFilterNavigationRow<T extends GomTableRow = GomTableRow> {
    key: keyof T & string;
    label?: string;
    options?: GomTableFilterNavigationOption[];
    optionSource?: 'static' | 'rows';
    valueAccessor?: (row: T) => unknown;
    allOption?: GomTableFilterNavigationOption | false;
    showCounts?: boolean;
}
interface GomTableFilterNavigationChange {
    key: string;
    value: string;
}
interface GomTableFilterDefinition<T extends GomTableRow = GomTableRow> {
    key: keyof T & string;
    label: string;
    type: GomTableFilterType;
    placeholder?: string;
    options?: GomTableFilterOption[];
    optionSource?: 'static' | 'rows';
    placement?: GomTableFilterPlacement;
    searchable?: boolean;
    valueAccessor?: (row: T) => unknown;
    mobileControl?: GomTableMobileFilterControl;
}
interface GomTableMobileCardField<T extends GomTableRow = GomTableRow> {
    key: keyof T & string;
    label?: string;
    width?: 'half' | 'full';
    hideWhenEmpty?: boolean;
    format?: (value: unknown, row: T) => string;
}
interface GomTableMobileCardHeader<T extends GomTableRow = GomTableRow> {
    titleKey?: keyof T & string;
    subtitleKeys?: Array<keyof T & string>;
    statusKey?: keyof T & string;
    overflowActionKeys?: string[];
}
interface GomTableMobileCardBody<T extends GomTableRow = GomTableRow> {
    visibleFields?: GomTableMobileCardField<T>[];
    expandableFields?: GomTableMobileCardField<T>[];
    defaultExpanded?: boolean;
}
interface GomTableMobileCardFooter<T extends GomTableRow = GomTableRow> {
    primaryActionKeys?: string[];
    secondaryActionKeys?: string[];
    showPrimaryActionLabels?: boolean;
    showDetailsToggle?: boolean;
    expandLabel?: string;
    collapseLabel?: string;
}
interface GomTableMobileCardConfig<T extends GomTableRow = GomTableRow> {
    header?: GomTableMobileCardHeader<T>;
    body?: GomTableMobileCardBody<T>;
    footer?: GomTableMobileCardFooter<T>;
}
interface GomTableAppliedFilter {
    key: string;
    label: string;
    displayValue: string;
}
type GomChipTone = 'neutral' | 'info' | 'warning' | 'success' | 'danger' | 'pending' | 'progress' | 'shipped' | 'delivered' | 'cancelled';
interface GomTableActionButton<T extends GomTableRow = GomTableRow> {
    label: string | ((row: T) => string);
    icon?: string | ((row: T) => string);
    actionKey: string;
    variant?: GomTableActionVariant;
    disabled?: (row: T) => boolean;
    disabledTooltip?: string | ((row: T) => string);
    subActions?: GomTableActionButton<T>[];
}
interface GomTableActionOverflowMenu<T extends GomTableRow = GomTableRow> {
    actionKeys: string[];
    triggerIcon?: string;
    triggerAriaLabel?: string;
    triggerButtonTitle?: string;
    backButtonText?: string;
}
interface GomTableBulkAction<T extends GomTableRow = GomTableRow> {
    actionKey: string;
    label: string;
    icon?: string;
    variant?: GomTableActionVariant;
    visible?: (selectedRows: T[]) => boolean;
    disabled?: (selectedRows: T[]) => boolean;
    disabledTooltip?: string | ((selectedRows: T[]) => string);
}
interface GomTableBulkActionEvent<T extends GomTableRow = GomTableRow> {
    actionKey: string;
    selectedRows: T[];
    selectedRowKeys: string[];
}
interface GomTableEditableConfig<T extends GomTableRow = GomTableRow> {
    type?: GomTableEditorType;
    mode?: GomTableEditMode;
    disabled?: (row: T) => boolean;
    min?: number;
    max?: number;
    step?: number;
}
interface GomTableCellEditEvent<T extends GomTableRow = GomTableRow> {
    row: T;
    columnKey: keyof T & string;
    previousValue: unknown;
    value: string | number;
}
interface GomTableSortState {
    key: string;
    direction: GomSortDirection;
}
interface GomTableColumn<T extends GomTableRow = GomTableRow> {
    key: keyof T & string;
    header: string;
    sortable?: boolean;
    sortValue?: (row: T) => unknown;
    filterable?: boolean;
    width?: string;
    headerAlign?: GomTableAlign;
    cellAlign?: GomTableAlign;
    textMode?: GomTableTextMode;
    format?: (value: unknown, row: T) => string;
    tooltip?: (value: unknown, row: T) => string;
    cellClass?: (value: unknown, row: T) => string;
    hiddenByDefault?: boolean;
    hideable?: boolean;
    searchable?: boolean;
    searchValue?: (row: T) => unknown;
    editable?: boolean | GomTableEditableConfig<T>;
    clickActionKey?: string | ((row: T) => string | null);
    clickActionIcon?: string | ((row: T) => string | null | undefined);
    chipTone?: GomChipTone | ((value: unknown, row: T) => GomChipTone);
    actionButtons?: GomTableActionButton<T>[];
    actionOverflowMenu?: GomTableActionOverflowMenu<T> | null;
}
interface GomTableQuery {
    searchTerm: string;
    sort: GomTableSortState;
    pageIndex: number;
    pageSize: number;
    filters: Record<string, string>;
    visibleColumnKeys: string[];
    advancedFilters?: Record<string, GomTableFilterValue>;
    globalSearchScope?: GomTableGlobalSearchScope;
}
interface GomTablePageChangeEvent {
    pageIndex: number;
    pageSize: number;
}
interface GomTableClientResult<T extends GomTableRow = GomTableRow> {
    rows: T[];
    filteredTotal: number;
}

interface MenuList {
    mainMenu: MainMenuList[];
    portalMenu: PrimaryMenuList[];
}
interface PrimaryMenuList {
    id?: string;
    title: string;
    icon: string;
    clickEvent?: (event: Event) => void;
}
interface MainMenuList extends PrimaryMenuList {
    submenu?: SubMenuList[];
    subMenuOpen?: boolean;
    subMenuWidth?: number;
    level?: number;
}
interface SubMenuList extends MainMenuList {
    title: string;
    route?: string;
}

declare class MenuComponent {
    menuList: i0.InputSignal<MenuList>;
    menuType: i0.InputSignal<"sidebar" | "submenu">;
    outsideClickBoundary: i0.InputSignal<HTMLElement | null>;
    showMenuListArrow: i0.InputSignal<boolean>;
    showMobileBackArrow: i0.InputSignal<boolean>;
    mobileBackArrowIcon: i0.InputSignal<string>;
    backButtonText: i0.InputSignal<string>;
    protected showSideNavOpen: i0.ModelSignal<boolean>;
    private readonly elementRef;
    private lastOpenedAt;
    protected updatedMenuList: i0.Signal<MenuList>;
    onKeydownHandler(_event: KeyboardEvent): void;
    onDocumentClick(event: MouseEvent): void;
    toggle(): void;
    close(): void;
    protected updateItem(menuArr: MainMenuList[] | SubMenuList[], index: number): MainMenuList[] | SubMenuList[];
    addSubMenuOpen(menu: MainMenuList[] | PrimaryMenuList[]): MainMenuList[] | PrimaryMenuList[];
    private hasNestedMenu;
    static ɵfac: i0.ɵɵFactoryDeclaration<MenuComponent, never>;
    static ɵcmp: i0.ɵɵComponentDeclaration<MenuComponent, "core-lib-menu", never, { "menuList": { "alias": "menuList"; "required": true; "isSignal": true; }; "menuType": { "alias": "menuType"; "required": false; "isSignal": true; }; "outsideClickBoundary": { "alias": "outsideClickBoundary"; "required": false; "isSignal": true; }; "showMenuListArrow": { "alias": "showMenuListArrow"; "required": false; "isSignal": true; }; "showMobileBackArrow": { "alias": "showMobileBackArrow"; "required": false; "isSignal": true; }; "mobileBackArrowIcon": { "alias": "mobileBackArrowIcon"; "required": false; "isSignal": true; }; "backButtonText": { "alias": "backButtonText"; "required": false; "isSignal": true; }; "showSideNavOpen": { "alias": "showSideNavOpen"; "required": false; "isSignal": true; }; }, { "showSideNavOpen": "showSideNavOpenChange"; }, never, never, true, never>;
}

declare class MenuModule {
    static ɵfac: i0.ɵɵFactoryDeclaration<MenuModule, never>;
    static ɵmod: i0.ɵɵNgModuleDeclaration<MenuModule, never, [typeof i1.CommonModule, typeof MenuComponent], [typeof MenuComponent]>;
    static ɵinj: i0.ɵɵInjectorDeclaration<MenuModule>;
}

declare class GomTableComponent<T extends GomTableRow = GomTableRow> implements OnInit, AfterViewInit, OnChanges, OnDestroy {
    columns: GomTableColumn<T>[];
    rows: T[];
    loading: boolean;
    dataMode: 'client' | 'server';
    totalItems: number;
    pageSize: number;
    pageIndex: number;
    pageSizeOptions: number[];
    showPagination: boolean;
    searchPlaceholder: string;
    emptyMessage: string;
    mobileCardView: boolean;
    mobileCardFields: string[];
    mobileSortKeys: string[];
    mobileCardClickable: boolean;
    mobileCardConfig: GomTableMobileCardConfig<T> | null;
    mobilePaginationMode: 'pages' | 'load-more';
    mobileAutoLoadMore: boolean;
    mobileLoadMoreStrategy: 'emit' | 'page-query';
    bodyViewportRows: number | null;
    enableRowSelection: boolean;
    bulkActions: GomTableBulkAction<T>[];
    bulkActionBusyKey: string | null;
    selectionItemLabel: string;
    showSearch: boolean;
    globalSearchScope: GomTableGlobalSearchScope;
    searchDebounceMs: number;
    showFilterButton: boolean;
    showClearFilterButton: boolean;
    advancedFilterDefinitions: GomTableFilterDefinition<T>[];
    filterNavigationRows: GomTableFilterNavigationRow<T>[];
    enableColumnSearch: boolean;
    showColumnSearchInitially: boolean;
    enableColumnVisibility: boolean;
    showExport: boolean;
    showInlineEditBanner: boolean;
    inlineEditBannerCount: number;
    inlineEditBannerSummary: string;
    inlineEditBannerDetail: string;
    inlineEditBannerSaveLabel: string;
    inlineEditBannerDiscardLabel: string;
    inlineEditBannerReviewLabel: string;
    inlineEditBannerSaving: boolean;
    queryChange: EventEmitter<GomTableQuery>;
    pageChange: EventEmitter<GomTablePageChangeEvent>;
    sortChange: EventEmitter<GomTableSortState>;
    filterChange: EventEmitter<Record<string, string>>;
    filterNavigationChange: EventEmitter<GomTableFilterNavigationChange>;
    columnVisibilityChange: EventEmitter<string[]>;
    rowAction: EventEmitter<{
        actionKey: string;
        row: T;
    }>;
    cellEdit: EventEmitter<GomTableCellEditEvent<T>>;
    rowClick: EventEmitter<T>;
    selectedRowsChange: EventEmitter<T[]>;
    bulkAction: EventEmitter<GomTableBulkActionEvent<T>>;
    loadMore: EventEmitter<GomTablePageChangeEvent>;
    exportClick: EventEmitter<void>;
    inlineEditDiscardAll: EventEmitter<void>;
    inlineEditSaveAll: EventEmitter<void>;
    inlineEditReviewChanges: EventEmitter<void>;
    get tableBodyMaxHeight(): string | null;
    displayedRows: T[];
    searchTerm: string;
    filters: Record<string, string>;
    sortState: GomTableSortState;
    visibleColumnKeys: Set<string>;
    columnPanelOpen: boolean;
    filtersVisible: boolean;
    toolbarOptionsOpen: boolean;
    advancedFilterModalOpen: boolean;
    advancedFilters: Record<string, GomTableFilterValue>;
    draftAdvancedFilters: Record<string, GomTableFilterValue>;
    filteredTotal: number;
    selectedRowKeys: Set<string>;
    mobileViewMode: 'cards' | 'table';
    isMobileViewport: boolean;
    submenuOpenKey: string | null;
    submenuPosition: Record<string, string> | null;
    navigationOverflowOpenKey: string | null;
    navigationVisibleOptionCounts: Record<string, number>;
    mobileTableOptionsOpen: boolean;
    mobileRowActionsOpen: boolean;
    mobileRowActionTarget: T | null;
    mobileLoadMoreSentinel?: ElementRef<HTMLElement>;
    private readonly mobileCardExpandedRowKeys;
    private mobileLoadMoreObserver;
    private mobileLoadMoreSentinelInView;
    private autoLoadMoreCooldownUntil;
    private accumulatedServerRows;
    private lastAccumulatedPageIndex;
    private lastSyncedServerRowsRef;
    private lastSyncedServerPageIndex;
    private readonly tableService;
    private readonly host;
    private readonly changeDetector;
    private searchDebounceTimer;
    private navigationResizeObserver;
    private readonly navigationOptionWidths;
    private navigationLayoutTimer;
    private cellEditStates;
    private pendingCellNavigation;
    private pendingCellNavigationTimer;
    ngOnInit(): void;
    ngAfterViewInit(): void;
    ngOnDestroy(): void;
    ngOnChanges(changes: SimpleChanges): void;
    get showMobileViewToggle(): boolean;
    get isMobileCardsActive(): boolean;
    get isMobileTableActive(): boolean;
    get visibleColumns(): GomTableColumn<T>[];
    get mobileCardColumns(): GomTableColumn<T>[];
    get mobileSortColumns(): GomTableColumn<T>[];
    get mobileCardActionColumn(): GomTableColumn<T> | null;
    get hasInlineFilters(): boolean;
    get showToolbarOptions(): boolean;
    get toolbarOptionsMenuList(): MenuList;
    get panelFilterDefinitions(): GomTableFilterDefinition<T>[];
    get toolbarFilterDefinitions(): GomTableFilterDefinition<T>[];
    get activeAdvancedFilterCount(): number;
    get activeColumnFilterCount(): number;
    get activeFilterCount(): number;
    get draftAdvancedFilterCount(): number;
    get appliedFilterChips(): GomTableAppliedFilter[];
    get mobileSortLabel(): string;
    get mobileSortButtonLabel(): string;
    getFilterNavigationOptions(row: GomTableFilterNavigationRow<T>): GomTableFilterNavigationOption[];
    private getRowDerivedFilterNavigationOptions;
    getVisibleFilterNavigationOptions(row: GomTableFilterNavigationRow<T>): GomTableFilterNavigationOption[];
    getOverflowFilterNavigationOptions(row: GomTableFilterNavigationRow<T>): GomTableFilterNavigationOption[];
    isFilterNavigationOptionActive(row: GomTableFilterNavigationRow<T>, option: GomTableFilterNavigationOption): boolean;
    hasActiveOverflowFilterNavigationOption(row: GomTableFilterNavigationRow<T>): boolean;
    selectFilterNavigationOption(row: GomTableFilterNavigationRow<T>, option: GomTableFilterNavigationOption): void;
    toggleFilterNavigationOverflow(event: Event, rowKey: string): void;
    onFilterNavigationKeydown(event: KeyboardEvent, rowKey: string): void;
    get pageSizeSelectOptions(): GomSelectOption[];
    get skeletonRows(): number[];
    get pageSizeModel(): string;
    get totalPages(): number;
    get paginationTotal(): number;
    get paginationRangeStart(): number;
    get paginationRangeEnd(): number;
    get paginationItems(): Array<number | 'ellipsis-start' | 'ellipsis-end'>;
    getActionLabel(action: GomTableActionButton<T>, row: T): string;
    getActionIcon(action: GomTableActionButton<T>, row: T): string | null;
    isActionDisabled(action: GomTableActionButton<T>, row: T): boolean;
    getActionTitle(action: GomTableActionButton<T>, row: T): string;
    get canGoPrevious(): boolean;
    get canGoNext(): boolean;
    get hasSelectedRows(): boolean;
    get selectedRowCount(): number;
    get selectedRows(): T[];
    get visibleBulkActions(): GomTableBulkAction<T>[];
    get selectionSummary(): string;
    isBulkActionDisabled(action: GomTableBulkAction<T>): boolean;
    getBulkActionTitle(action: GomTableBulkAction<T>): string;
    triggerBulkAction(action: GomTableBulkAction<T>): void;
    clearSelectedRows(): void;
    toggleColumnPanel(): void;
    toggleFilters(): void;
    toggleToolbarOptions(event?: Event): void;
    openAdvancedFilters(): void;
    closeAdvancedFilters(): void;
    applyAdvancedFilters(): void;
    clearDraftAdvancedFilters(): void;
    clearAdvancedFilters(): void;
    clearAllFilters(): void;
    clearAllQueryFilters(): void;
    setQueryFilters(filters: Record<string, GomTableFilterValue>, clearSearch?: boolean): void;
    removeAppliedFilter(chipKey: string): void;
    toggleColumn(columnKey: string): void;
    setSort(column: GomTableColumn<T>): void;
    setSearchTerm(term: string): void;
    clearSearch(): void;
    setFilter(columnKey: string, value: string): void;
    clearFilter(columnKey: string): void;
    getFilterOptions(definition: GomTableFilterDefinition<T>): GomSelectOption[];
    getFilterOptionCount(definition: GomTableFilterDefinition<T>, value: string): number | undefined;
    getFilterString(source: Record<string, GomTableFilterValue>, key: string): string;
    getFilterArray(source: Record<string, GomTableFilterValue>, key: string): string[];
    getFilterRange(source: Record<string, GomTableFilterValue>, key: string): {
        from: string;
        to: string;
    };
    setDraftFilterValue(key: string, value: GomTableFilterValue): void;
    isDraftOptionSelected(key: string, value: string): boolean;
    toggleDraftFilterOption(filter: GomTableFilterDefinition<T>, value: string): void;
    setDraftDateRangeValue(key: string, boundary: 'from' | 'to', value: string): void;
    setQuickFilterValue(key: string, value: GomTableFilterValue): void;
    changePageSize(nextPageSize: number): void;
    onPageSizeSelectChange(value: string): void;
    previousPage(): void;
    goToPage(pageNumber: number): void;
    nextPage(): void;
    requestLoadMore(): void;
    getSortDirection(columnKey: string): GomSortDirection;
    getHeaderAlign(column: GomTableColumn<T>): GomTableAlign;
    getCellAlign(column: GomTableColumn<T>): GomTableAlign;
    getTextMode(column: GomTableColumn<T>): GomTableTextMode;
    getCellValue(row: T, column: GomTableColumn<T>): string;
    getCellTitle(row: T, column: GomTableColumn<T>): string;
    getCellClass(row: T, column: GomTableColumn<T>): string;
    getEditableConfig(column: GomTableColumn<T>): GomTableEditableConfig<T> | null;
    isCellEditDisabled(row: T, column: GomTableColumn<T>): boolean;
    isCellEditing(row: T, column: GomTableColumn<T>): boolean;
    getCellEditType(column: GomTableColumn<T>): 'text' | 'number';
    getCellEditInputType(column: GomTableColumn<T>): 'text';
    getCellEditInputMode(column: GomTableColumn<T>): 'text' | 'decimal';
    getCellDraft(row: T, column: GomTableColumn<T>): string;
    getCellEditError(row: T, column: GomTableColumn<T>): string;
    startCellEdit(event: Event, row: T, column: GomTableColumn<T>): void;
    onCellEditTriggerKeydown(event: KeyboardEvent, row: T, column: GomTableColumn<T>): void;
    setCellDraft(row: T, column: GomTableColumn<T>, value: string): void;
    onCellEditorKeydown(event: KeyboardEvent, row: T, column: GomTableColumn<T>): void;
    commitCellEdit(row: T, column: GomTableColumn<T>): void;
    cancelCellEdit(row: T, column: GomTableColumn<T>): void;
    private commitAndMoveCellEdit;
    private schedulePendingCellNavigation;
    private focusCellEditor;
    getChipTone(row: T, column: GomTableColumn<T>): GomChipTone;
    getCellActionKey(row: T, column: GomTableColumn<T>): string | null;
    getCellActionIcon(row: T, column: GomTableColumn<T>): string | null;
    onCellActionClick(event: Event, actionKey: string, row: T): void;
    onCellActionKeydown(event: KeyboardEvent, actionKey: string, row: T): void;
    private getCellEditState;
    private ensureCellEditState;
    private deleteCellEditState;
    private validateCellDraft;
    private parseNumericDraft;
    hasActionButtons(column: GomTableColumn<T>): boolean;
    getActionButtons(column: GomTableColumn<T>): GomTableActionButton<T>[];
    hasOverflowMenu(column: GomTableColumn<T>): boolean;
    getInlineActionButtons(column: GomTableColumn<T>): GomTableActionButton<T>[];
    getOverflowActionButtons(column: GomTableColumn<T>): GomTableActionButton<T>[];
    getOverflowMenuConfig(column: GomTableColumn<T>): GomTableActionOverflowMenu<T> | null;
    getOverflowMenuTriggerIcon(column: GomTableColumn<T>): string;
    getOverflowMenuTriggerAriaLabel(column: GomTableColumn<T>): string;
    getOverflowMenuTriggerTitle(column: GomTableColumn<T>): string;
    getOverflowMenuBackButtonText(column: GomTableColumn<T>): string;
    getOverflowMenuList(column: GomTableColumn<T>, row: T): MenuList;
    triggerRowAction(actionKey: string, row: T): void;
    toggleSubmenu(event: Event, action: GomTableActionButton<T>, row: T, rowIndex: number): void;
    isSubmenuOpen(action: GomTableActionButton<T>, row: T, rowIndex: number): boolean;
    getSubActions(action: GomTableActionButton<T>): GomTableActionButton<T>[];
    onSubmenuActionClick(event: Event, actionKey: string, row: T): void;
    onMobileCardClick(row: T): void;
    getMobileCardActions(row: T): GomTableActionButton<T>[];
    openMobileTableOptions(): void;
    closeMobileTableOptions(): void;
    toggleMobileColumnSearch(): void;
    openMobileColumnPanel(): void;
    openMobileRowActions(row: T): void;
    closeMobileRowActions(): void;
    getMobileRowSheetActions(row: T): GomTableActionButton<T>[];
    getMobileCardTitle(row: T, rowIndex: number): string;
    getMobileCardSubtitleParts(row: T): string[];
    getMobileCardStatusLabel(row: T): string;
    getMobileCardStatusTone(row: T): GomChipTone;
    hasMobileCardStatus(row: T): boolean;
    getMobileCardVisibleFields(row: T): GomTableMobileCardField<T>[];
    getMobileCardExpandableFields(row: T): GomTableMobileCardField<T>[];
    hasMobileCardExpandableFields(row: T): boolean;
    isMobileCardExpanded(row: T, rowIndex: number): boolean;
    toggleMobileCardDetails(event: Event, row: T, rowIndex: number): void;
    getMobileCardDetailsToggleLabel(row: T, rowIndex: number): string;
    shouldShowMobileCardDetailsToggle(row: T): boolean;
    hasMobileCardBody(row: T, rowIndex: number): boolean;
    getMobileCardPrimaryActions(row: T): GomTableActionButton<T>[];
    getMobileCardOverflowActions(row: T): GomTableActionButton<T>[];
    getMobileCardOverflowMenuList(row: T): MenuList;
    getMobileCardActionLabel(action: GomTableActionButton<T>, row: T): string;
    getMobileCardActionIcon(action: GomTableActionButton<T>, row: T): string | null;
    showMobileCardPrimaryActionLabels(): boolean;
    onMobileCardOverflowActionClick(event: Event, actionKey: string, row: T): void;
    getMobileCardFieldLabel(row: T, field: GomTableMobileCardField<T>): string;
    getMobileCardFieldValue(row: T, field: GomTableMobileCardField<T>): string;
    isMobileCardFieldHidden(row: T, field: GomTableMobileCardField<T>): boolean;
    getMobileCardFieldWidth(field: GomTableMobileCardField<T>): string;
    triggerMobileRowAction(actionKey: string): void;
    private getMobileCardValueLabel;
    private getFallbackMobileCardFields;
    private resolveMobileCardHeaderTitleKey;
    private resolveMobileCardHeaderSubtitleKeys;
    private resolveMobileCardHeaderStatusKey;
    private getMobileCardFallbackTitle;
    private getMobileCardActionByKey;
    private findActionButtonByKey;
    getMobileCardValue(row: T, key: keyof T & string | undefined): string;
    getMobileCardTone(row: T, key: keyof T & string | undefined): GomChipTone;
    getMobileCardInitials(row: T): string;
    setMobileSort(column: GomTableColumn<T>): void;
    onMobileCardActionClick(event: Event, actionKey: string, row: T): void;
    handleHeaderKeydown(event: KeyboardEvent, column: GomTableColumn<T>): void;
    closeColumnPanel(): void;
    isRowSelected(row: T, rowIndex: number): boolean;
    areAllDisplayedRowsSelected(): boolean;
    toggleRowSelection(row: T, rowIndex: number, selected: boolean): void;
    toggleSelectAllDisplayedRows(selected: boolean): void;
    setMobileViewMode(mode: 'cards' | 'table'): void;
    onResize(): void;
    onDocumentClick(event: Event): void;
    onDocumentKeydown(event: KeyboardEvent): void;
    readonly trackByColumn: (_: number, column: GomTableColumn<T>) => string;
    readonly trackByRow: (index: number) => number;
    private getNextSortDirection;
    private initializeVisibleColumns;
    private refresh;
    private runClientMode;
    private syncServerModeRows;
    private isMobileLoadMoreActive;
    private mergeServerRows;
    private shouldObserveMobileLoadMoreSentinel;
    private syncMobileLoadMoreObserver;
    private maybeAutoLoadMore;
    private emitPageChange;
    private buildQuery;
    private stringifyCellValue;
    private formatFilterValue;
    private hasFilterValue;
    private cloneFilterValues;
    private updateViewportMode;
    private observeFilterNavigationRows;
    private scheduleFilterNavigationLayout;
    private updateFilterNavigationLayout;
    private calculateVisibleNavigationOptionCount;
    private findFilterNavigationElement;
    private clearSelection;
    private emitSelectedRows;
    private getRowKey;
    private getSubmenuKey;
    static ɵfac: i0.ɵɵFactoryDeclaration<GomTableComponent<any>, never>;
    static ɵcmp: i0.ɵɵComponentDeclaration<GomTableComponent<any>, "gom-lib-table", never, { "columns": { "alias": "columns"; "required": false; }; "rows": { "alias": "rows"; "required": false; }; "loading": { "alias": "loading"; "required": false; }; "dataMode": { "alias": "dataMode"; "required": false; }; "totalItems": { "alias": "totalItems"; "required": false; }; "pageSize": { "alias": "pageSize"; "required": false; }; "pageIndex": { "alias": "pageIndex"; "required": false; }; "pageSizeOptions": { "alias": "pageSizeOptions"; "required": false; }; "showPagination": { "alias": "showPagination"; "required": false; }; "searchPlaceholder": { "alias": "searchPlaceholder"; "required": false; }; "emptyMessage": { "alias": "emptyMessage"; "required": false; }; "mobileCardView": { "alias": "mobileCardView"; "required": false; }; "mobileCardFields": { "alias": "mobileCardFields"; "required": false; }; "mobileSortKeys": { "alias": "mobileSortKeys"; "required": false; }; "mobileCardClickable": { "alias": "mobileCardClickable"; "required": false; }; "mobileCardConfig": { "alias": "mobileCardConfig"; "required": false; }; "mobilePaginationMode": { "alias": "mobilePaginationMode"; "required": false; }; "mobileAutoLoadMore": { "alias": "mobileAutoLoadMore"; "required": false; }; "mobileLoadMoreStrategy": { "alias": "mobileLoadMoreStrategy"; "required": false; }; "bodyViewportRows": { "alias": "bodyViewportRows"; "required": false; }; "enableRowSelection": { "alias": "enableRowSelection"; "required": false; }; "bulkActions": { "alias": "bulkActions"; "required": false; }; "bulkActionBusyKey": { "alias": "bulkActionBusyKey"; "required": false; }; "selectionItemLabel": { "alias": "selectionItemLabel"; "required": false; }; "showSearch": { "alias": "showSearch"; "required": false; }; "globalSearchScope": { "alias": "globalSearchScope"; "required": false; }; "searchDebounceMs": { "alias": "searchDebounceMs"; "required": false; }; "showFilterButton": { "alias": "showFilterButton"; "required": false; }; "showClearFilterButton": { "alias": "showClearFilterButton"; "required": false; }; "advancedFilterDefinitions": { "alias": "advancedFilterDefinitions"; "required": false; }; "filterNavigationRows": { "alias": "filterNavigationRows"; "required": false; }; "enableColumnSearch": { "alias": "enableColumnSearch"; "required": false; }; "showColumnSearchInitially": { "alias": "showColumnSearchInitially"; "required": false; }; "enableColumnVisibility": { "alias": "enableColumnVisibility"; "required": false; }; "showExport": { "alias": "showExport"; "required": false; }; "showInlineEditBanner": { "alias": "showInlineEditBanner"; "required": false; }; "inlineEditBannerCount": { "alias": "inlineEditBannerCount"; "required": false; }; "inlineEditBannerSummary": { "alias": "inlineEditBannerSummary"; "required": false; }; "inlineEditBannerDetail": { "alias": "inlineEditBannerDetail"; "required": false; }; "inlineEditBannerSaveLabel": { "alias": "inlineEditBannerSaveLabel"; "required": false; }; "inlineEditBannerDiscardLabel": { "alias": "inlineEditBannerDiscardLabel"; "required": false; }; "inlineEditBannerReviewLabel": { "alias": "inlineEditBannerReviewLabel"; "required": false; }; "inlineEditBannerSaving": { "alias": "inlineEditBannerSaving"; "required": false; }; }, { "queryChange": "queryChange"; "pageChange": "pageChange"; "sortChange": "sortChange"; "filterChange": "filterChange"; "filterNavigationChange": "filterNavigationChange"; "columnVisibilityChange": "columnVisibilityChange"; "rowAction": "rowAction"; "cellEdit": "cellEdit"; "rowClick": "rowClick"; "selectedRowsChange": "selectedRowsChange"; "bulkAction": "bulkAction"; "loadMore": "loadMore"; "exportClick": "exportClick"; "inlineEditDiscardAll": "inlineEditDiscardAll"; "inlineEditSaveAll": "inlineEditSaveAll"; "inlineEditReviewChanges": "inlineEditReviewChanges"; }, never, never, true, never>;
}

/**
 * Theming Module for GOM-UI
 * Provides theme configuration and theming utilities
 *
 * Usage:
 *   1. Import in app.config.ts: importProvidersFrom(ThemedModule)
 *   2. Import styles in global styles: @use './app/shared/theming/styles/theme';
 *   3. Inject ThemeService in components for dynamic theme switching
 */
declare class ThemedModule {
    static ɵfac: i0.ɵɵFactoryDeclaration<ThemedModule, never>;
    static ɵmod: i0.ɵɵNgModuleDeclaration<ThemedModule, never, never, never>;
    static ɵinj: i0.ɵɵInjectorDeclaration<ThemedModule>;
}

declare class SharedModule {
    static ɵfac: i0.ɵɵFactoryDeclaration<SharedModule, never>;
    static ɵmod: i0.ɵɵNgModuleDeclaration<SharedModule, never, [typeof i1.CommonModule, typeof FormControlsModule, typeof GomTableComponent, typeof ThemedModule], [typeof i1.CommonModule, typeof FormControlsModule, typeof GomTableComponent, typeof ThemedModule]>;
    static ɵinj: i0.ɵɵInjectorDeclaration<SharedModule>;
}

declare class GomTableService {
    runClientPipeline<T extends GomTableRow>(rows: T[], columns: GomTableColumn<T>[], query: GomTableQuery, advancedFilterDefinitions?: GomTableFilterDefinition<T>[]): GomTableClientResult<T>;
    private applySearch;
    private applyAdvancedFilters;
    private matchesAdvancedFilter;
    private hasFilterValue;
    private toDateComparable;
    private applyFilters;
    private applySort;
    private applyPagination;
    private stringifyCellValue;
    static ɵfac: i0.ɵɵFactoryDeclaration<GomTableService, never>;
    static ɵprov: i0.ɵɵInjectableDeclaration<GomTableService>;
}

interface TabItem {
    id: string | number;
    label: string;
    disabled?: boolean;
}
declare class GomTabsComponent {
    /**
     * Array of tab items to display
     */
    tabs: i0.InputSignal<TabItem[]>;
    /**
     * The currently active tab ID
     */
    activeTab: i0.InputSignal<string | number | undefined>;
    /**
     * Emits when a tab is clicked
     */
    tabChange: i0.OutputEmitterRef<string | number>;
    /**
     * Get available tabs (non-disabled)
     */
    availableTabs: i0.Signal<TabItem[]>;
    /**
     * Handle tab click
     */
    selectTab(tabId: string | number): void;
    static ɵfac: i0.ɵɵFactoryDeclaration<GomTabsComponent, never>;
    static ɵcmp: i0.ɵɵComponentDeclaration<GomTabsComponent, "gom-lib-tabs", never, { "tabs": { "alias": "tabs"; "required": false; "isSignal": true; }; "activeTab": { "alias": "activeTab"; "required": false; "isSignal": true; }; }, { "tabChange": "tabChange"; }, never, ["*"], true, never>;
}

declare class GomTabContentComponent {
    /**
     * The tab ID this content belongs to
     */
    tabId: i0.InputSignal<string | number | undefined>;
    /**
     * The currently active tab ID
     */
    activeTab: i0.InputSignal<string | number | undefined>;
    static ɵfac: i0.ɵɵFactoryDeclaration<GomTabContentComponent, never>;
    static ɵcmp: i0.ɵɵComponentDeclaration<GomTabContentComponent, "gom-lib-tab-content", never, { "tabId": { "alias": "tabId"; "required": false; "isSignal": true; }; "activeTab": { "alias": "activeTab"; "required": false; "isSignal": true; }; }, {}, never, ["*"], true, never>;
}

declare class GomModalComponent {
    private el;
    /**
     * Controls visibility of the modal
     */
    show: i0.ModelSignal<boolean>;
    /**
     * Title of the modal
     */
    title: i0.InputSignal<string>;
    /**
     * Determines if clicking outside modal closes it
     * @default false
     */
    closeOnBackdropClick: i0.InputSignal<boolean>;
    /**
     * Determines if escape key closes modal
     * @default true
     */
    closeOnEscape: i0.InputSignal<boolean>;
    /**
     * Determines if close button is shown
     * @default true
     */
    showCloseButton: i0.InputSignal<boolean>;
    /**
     * Size variant: small | medium | large
     * @default 'medium'
     */
    size: i0.InputSignal<"small" | "medium" | "large">;
    /** Mobile-only presentation; desktop remains a centered dialog. */
    mobilePresentation: i0.InputSignal<"dialog" | "fullscreen" | "sheet">;
    /** Optional action displayed in the modal header. */
    headerActionLabel: i0.InputSignal<string>;
    /**
     * Emits when modal is closed
     */
    closed: i0.OutputEmitterRef<void>;
    headerAction: i0.OutputEmitterRef<void>;
    constructor();
    onKeydownEscape(event: KeyboardEvent): void;
    /**
     * Close the modal
     */
    close(): void;
    /**
     * Handle backdrop click
     */
    onBackdropClick(): void;
    /**
     * Handle dialog click (prevent backdrop close)
     */
    onDialogClick(event: MouseEvent): void;
    static ɵfac: i0.ɵɵFactoryDeclaration<GomModalComponent, never>;
    static ɵcmp: i0.ɵɵComponentDeclaration<GomModalComponent, "gom-lib-modal", never, { "show": { "alias": "show"; "required": false; "isSignal": true; }; "title": { "alias": "title"; "required": false; "isSignal": true; }; "closeOnBackdropClick": { "alias": "closeOnBackdropClick"; "required": false; "isSignal": true; }; "closeOnEscape": { "alias": "closeOnEscape"; "required": false; "isSignal": true; }; "showCloseButton": { "alias": "showCloseButton"; "required": false; "isSignal": true; }; "size": { "alias": "size"; "required": false; "isSignal": true; }; "mobilePresentation": { "alias": "mobilePresentation"; "required": false; "isSignal": true; }; "headerActionLabel": { "alias": "headerActionLabel"; "required": false; "isSignal": true; }; }, { "show": "showChange"; "closed": "closed"; "headerAction": "headerAction"; }, never, ["*", "[gom-modal-actions]"], true, never>;
}

type GomButtonContentMode = 'icon-only' | 'text-only' | 'icon-text';
type GomActionButtonRole = 'primary-action' | 'danger-action' | 'secondary-action' | 'dismiss';
interface GomActionButtonPolicy {
    primaryAction: GomButtonContentMode;
    dangerAction: GomButtonContentMode;
    secondaryAction: GomButtonContentMode;
    dismissAction: GomButtonContentMode;
}
declare const GOM_ACTION_BUTTON_POLICY: GomActionButtonPolicy;
declare function getButtonContentMode(role: GomActionButtonRole): GomButtonContentMode;
declare function showButtonIcon(mode: GomButtonContentMode): boolean;
declare function showButtonText(mode: GomButtonContentMode): boolean;

declare class GomConfirmationModalComponent {
    show: i0.ModelSignal<boolean>;
    title: i0.InputSignal<string>;
    message: i0.InputSignal<string>;
    confirmText: i0.InputSignal<string>;
    cancelText: i0.InputSignal<string>;
    busy: i0.InputSignal<boolean>;
    confirmVariant: i0.InputSignal<"primary" | "secondary" | "danger">;
    confirmIconOnly: i0.InputSignal<boolean>;
    confirmIcon: i0.InputSignal<string>;
    cancelIcon: i0.InputSignal<string>;
    confirmed: i0.OutputEmitterRef<void>;
    cancelled: i0.OutputEmitterRef<void>;
    get cancelMode(): GomButtonContentMode;
    get confirmMode(): GomButtonContentMode;
    shouldShowIcon(mode: GomButtonContentMode): boolean;
    shouldShowText(mode: GomButtonContentMode): boolean;
    onConfirm(): void;
    onCancel(): void;
    static ɵfac: i0.ɵɵFactoryDeclaration<GomConfirmationModalComponent, never>;
    static ɵcmp: i0.ɵɵComponentDeclaration<GomConfirmationModalComponent, "gom-lib-confirmation-modal", never, { "show": { "alias": "show"; "required": false; "isSignal": true; }; "title": { "alias": "title"; "required": false; "isSignal": true; }; "message": { "alias": "message"; "required": false; "isSignal": true; }; "confirmText": { "alias": "confirmText"; "required": false; "isSignal": true; }; "cancelText": { "alias": "cancelText"; "required": false; "isSignal": true; }; "busy": { "alias": "busy"; "required": false; "isSignal": true; }; "confirmVariant": { "alias": "confirmVariant"; "required": false; "isSignal": true; }; "confirmIconOnly": { "alias": "confirmIconOnly"; "required": false; "isSignal": true; }; "confirmIcon": { "alias": "confirmIcon"; "required": false; "isSignal": true; }; "cancelIcon": { "alias": "cancelIcon"; "required": false; "isSignal": true; }; }, { "show": "showChange"; "confirmed": "confirmed"; "cancelled": "cancelled"; }, never, never, true, never>;
}

type GomAlertVariant = 'success' | 'error' | 'info' | 'warning';
interface GomAlertToast {
    title?: string;
    message: string;
    variant: GomAlertVariant;
    durationMs: number;
}
declare class GomAlertToastService {
    readonly currentToast: i0.WritableSignal<GomAlertToast | null>;
    private timeoutId;
    show(toast: Omit<GomAlertToast, 'durationMs'> & {
        durationMs?: number;
    }): void;
    success(message: string, title?: string, durationMs?: number): void;
    error(message: string, title?: string, durationMs?: number): void;
    info(message: string, title?: string, durationMs?: number): void;
    warning(message: string, title?: string, durationMs?: number): void;
    dismiss(): void;
    private clearTimer;
    static ɵfac: i0.ɵɵFactoryDeclaration<GomAlertToastService, never>;
    static ɵprov: i0.ɵɵInjectableDeclaration<GomAlertToastService>;
}

declare class GomAlertToastComponent {
    readonly toastService: GomAlertToastService;
    dismiss(): void;
    static ɵfac: i0.ɵɵFactoryDeclaration<GomAlertToastComponent, never>;
    static ɵcmp: i0.ɵɵComponentDeclaration<GomAlertToastComponent, "gom-lib-alert-toast", never, {}, {}, never, never, true, never>;
}

declare class GomCardComponent {
    contentGutter: i0.InputSignalWithTransform<boolean, unknown>;
    contentGap: i0.InputSignalWithTransform<boolean, unknown>;
    static ɵfac: i0.ɵɵFactoryDeclaration<GomCardComponent, never>;
    static ɵcmp: i0.ɵɵComponentDeclaration<GomCardComponent, "gom-lib-card, [gomLibCard]", never, { "contentGutter": { "alias": "contentGutter"; "required": false; "isSignal": true; }; "contentGap": { "alias": "contentGap"; "required": false; "isSignal": true; }; }, {}, never, ["*"], true, never>;
}

type GomDynamicControlType = 'input' | 'textarea' | 'select';
interface GomDynamicFormOptionConfig {
    value: string;
    labelKey: string;
}
interface GomDynamicFormValidatorsConfig {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    pattern?: string;
}
interface GomDynamicFormValidationMessagesConfig {
    required?: string;
    minlength?: string;
    maxlength?: string;
    min?: string;
    max?: string;
    pattern?: string;
}
interface GomDynamicFormFieldConfig {
    key: string;
    control: GomDynamicControlType;
    inputType?: 'text' | 'email' | 'number' | 'search' | 'password';
    labelKey: string;
    placeholderKey?: string;
    rows?: number;
    defaultValue?: string | number | boolean;
    validators?: GomDynamicFormValidatorsConfig;
    validationMessages?: GomDynamicFormValidationMessagesConfig;
    optionsSource?: string;
    options?: GomDynamicFormOptionConfig[];
}
interface GomDynamicFormConfig {
    fields: GomDynamicFormFieldConfig[];
}
interface GomDynamicFormConfigSource {
    type: 'asset' | 'api';
    path: string;
}

declare class GomDynamicFormComponent {
    private readonly translate;
    form: FormGroup;
    fields: GomDynamicFormFieldConfig[];
    selectOptionsBySource: Record<string, GomSelectOption[]>;
    readonly hasFields: i0.Signal<boolean>;
    getErrorText(field: GomDynamicFormFieldConfig): string;
    getSelectOptions(field: GomDynamicFormFieldConfig): GomSelectOption[];
    isFieldType(field: GomDynamicFormFieldConfig, type: GomDynamicControlType): boolean;
    static ɵfac: i0.ɵɵFactoryDeclaration<GomDynamicFormComponent, never>;
    static ɵcmp: i0.ɵɵComponentDeclaration<GomDynamicFormComponent, "gom-lib-dynamic-form", never, { "form": { "alias": "form"; "required": true; }; "fields": { "alias": "fields"; "required": false; }; "selectOptionsBySource": { "alias": "selectOptionsBySource"; "required": false; }; }, {}, never, never, true, never>;
}

declare class GomDynamicFormLoaderService {
    private readonly http;
    loadConfig(source: GomDynamicFormConfigSource, fallback?: GomDynamicFormConfig): Observable<GomDynamicFormConfig>;
    createFormGroup(fb: FormBuilder, fields: GomDynamicFormFieldConfig[], defaults?: Record<string, unknown>, initialValues?: Record<string, unknown>): FormGroup;
    private resolveDefaultValue;
    private getValidators;
    private normalizeConfig;
    static ɵfac: i0.ɵɵFactoryDeclaration<GomDynamicFormLoaderService, never>;
    static ɵprov: i0.ɵɵInjectableDeclaration<GomDynamicFormLoaderService>;
}

declare class GomChipComponent {
    tone: GomChipTone;
    size: 'default' | 'compact' | 'dense';
    fullWidth: boolean;
    interactive: boolean;
    selected: boolean;
    disabled: boolean;
    ariaLabel: string;
    ariaRole: string;
    chipClick: EventEmitter<MouseEvent>;
    handleClick(event: MouseEvent): void;
    static ɵfac: i0.ɵɵFactoryDeclaration<GomChipComponent, never>;
    static ɵcmp: i0.ɵɵComponentDeclaration<GomChipComponent, "gom-lib-chip", never, { "tone": { "alias": "tone"; "required": false; }; "size": { "alias": "size"; "required": false; }; "fullWidth": { "alias": "fullWidth"; "required": false; }; "interactive": { "alias": "interactive"; "required": false; }; "selected": { "alias": "selected"; "required": false; }; "disabled": { "alias": "disabled"; "required": false; }; "ariaLabel": { "alias": "ariaLabel"; "required": false; }; "ariaRole": { "alias": "ariaRole"; "required": false; }; }, { "chipClick": "chipClick"; }, never, ["*"], true, never>;
}

declare class GomAccordionComponent {
    title: string;
    subtitle: string;
    expanded: boolean;
    disabled: boolean;
    expandedChange: EventEmitter<boolean>;
    toggleState: EventEmitter<boolean>;
    onTriggerClick(): void;
    static ɵfac: i0.ɵɵFactoryDeclaration<GomAccordionComponent, never>;
    static ɵcmp: i0.ɵɵComponentDeclaration<GomAccordionComponent, "gom-lib-accordion", never, { "title": { "alias": "title"; "required": false; }; "subtitle": { "alias": "subtitle"; "required": false; }; "expanded": { "alias": "expanded"; "required": false; }; "disabled": { "alias": "disabled"; "required": false; }; }, { "expandedChange": "expandedChange"; "toggleState": "toggleState"; }, never, ["*"], true, never>;
}

type ThemeMode = 'light' | 'dark' | 'auto';
/**
 * Theme Service for GOM-UI
 * Manages theme switching and CSS variable updates at runtime
 */
declare class ThemeService {
    private readonly themeMode;
    readonly themeMode$: i0.Signal<ThemeMode>;
    constructor();
    /**
     * Initialize theme based on system preference or localStorage
     */
    private initializeTheme;
    /**
     * Detect system theme preference
     */
    private detectSystemTheme;
    /**
     * Get saved theme from localStorage
     */
    private getSavedTheme;
    /**
     * Set theme and persist to localStorage
     */
    setTheme(theme: ThemeMode): void;
    /**
     * Toggle between light and dark themes
     */
    toggleTheme(): void;
    /**
     * Get current theme
     */
    getTheme(): ThemeMode;
    /**
     * Set CSS variable at runtime
     * @param variable - CSS variable name (without --)
     * @param value - CSS variable value
     */
    setCSSVariable(variable: string, value: string): void;
    /**
     * Get CSS variable value
     * @param variable - CSS variable name (without --)
     */
    getCSSVariable(variable: string): string;
    static ɵfac: i0.ɵɵFactoryDeclaration<ThemeService, never>;
    static ɵprov: i0.ɵɵInjectableDeclaration<ThemeService>;
}

export { FormControlsModule, GOM_ACTION_BUTTON_POLICY, GomAccordionComponent, GomAlertToastComponent, GomAlertToastService, GomButtonComponent, GomCardComponent, GomCheckboxComponent, GomChipComponent, GomConfirmationModalComponent, GomDynamicFormComponent, GomDynamicFormLoaderService, GomInputComponent, GomModalComponent, GomSelectComponent, GomSwitchComponent, GomTabContentComponent, GomTableComponent, GomTableService, GomTabsComponent, GomTextareaComponent, MenuComponent, MenuModule, SharedModule, ThemeService, ThemedModule, getButtonContentMode, showButtonIcon, showButtonText };
export type { GomActionButtonPolicy, GomActionButtonRole, GomAlertToast, GomAlertVariant, GomButtonContentMode, GomChipTone, GomDynamicControlType, GomDynamicFormConfig, GomDynamicFormConfigSource, GomDynamicFormFieldConfig, GomDynamicFormOptionConfig, GomDynamicFormValidationMessagesConfig, GomDynamicFormValidatorsConfig, GomSelectOption, GomSortDirection, GomTableActionButton, GomTableActionOverflowMenu, GomTableActionVariant, GomTableAlign, GomTableAppliedFilter, GomTableBulkAction, GomTableBulkActionEvent, GomTableCellEditEvent, GomTableClientResult, GomTableColumn, GomTableEditMode, GomTableEditableConfig, GomTableEditorType, GomTableFilterDefinition, GomTableFilterNavigationChange, GomTableFilterNavigationOption, GomTableFilterNavigationRow, GomTableFilterOption, GomTableFilterPlacement, GomTableFilterType, GomTableFilterValue, GomTableGlobalSearchScope, GomTableMobileCardBody, GomTableMobileCardConfig, GomTableMobileCardField, GomTableMobileCardFooter, GomTableMobileCardHeader, GomTableMobileFilterControl, GomTablePageChangeEvent, GomTableQuery, GomTableRow, GomTableSortState, GomTableTextMode, MainMenuList, MenuList, PrimaryMenuList, SubMenuList, TabItem, ThemeMode };
//# sourceMappingURL=index.d.ts.map
