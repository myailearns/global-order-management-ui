import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, computed, inject, OnInit, OnDestroy, signal, ViewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormRecord,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';

import {
  FormControlsModule,
  GomAlertToastService,
  GomButtonComponent,
  GomButtonContentMode,
  GomConfirmationModalComponent,
  GomModalComponent,
  GomSelectOption,
  GomTabContentComponent,
  GomTableColumn,
  GomTableComponent,
  GomTableQuery,
  GomTableRow,
  GomTabsComponent,
  TabItem,
  getButtonContentMode,
  showButtonIcon,
  showButtonText,
} from '@gomlibs/ui';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { MediaAssetService } from '../../saas-platform/media/media-asset.service';
import { GroupImage, GroupImageEntry } from '../../saas-platform/media/media-asset.model';
import { ImagePickerComponent, PickedImage } from '../../../shared/components/image-picker/image-picker.component';
import { RichTextEditorComponent } from '../../../shared/components/rich-text-editor/rich-text-editor.component';
import { DisableIfNoFeatureDirective } from '../../../shared/directives/disable-if-no-feature.directive';
import { ProductCollection, ProductCollectionsService } from '../product-collections/product-collections.service';
import {
  Category,
  Field,
  FieldGroup,
  Group,
  GroupCompletionStatus,
  GroupVariantGenerationPreview,
  GroupPayload,
  PricingRefreshMode,
  GroupsService,
  Unit,
  TaxProfile,
} from './groups.service';
import { QuickCreateGroupComponent } from './quick-create';
import {
  BulkImportTemplateService,
  BulkUploadFailedRow,
  BulkUploadJobResults,
  BulkUploadJobStatus,
  BulkUploadVariantFailure,
} from './bulk-upload/services/bulk-import-template.service';
import { VariantsService, ApiPaginated, Variant } from '../variants/variants.service';

interface GroupRow extends GomTableRow {
  _id: string;
  name: string;
  categoryName: string;
  stock: string;
  stockSeverity: 'normal' | 'low' | 'critical';
  status: string;
  actions: string;
}

interface GroupWizardField {
  fieldId: string;
  key: string;
  name: string;
  type: 'NUMBER' | 'PERCENTAGE';
  isRequired: boolean;
  defaultValue: number;
  valueFormat?: 'NUMBER' | 'CURRENCY';
  currencyCode?: 'INR' | null;
}

type FormulaTarget = 'sellingPrice' | 'anchorPrice' | 'actualPrice';
type SellingMarginBase = 'actual' | 'buy';
type CompletionChecklistItem = 'fieldValues' | 'variants' | 'media' | 'advancedSettings';

interface BulkRowEditContext {
  name: string;
  description: string;
  categoryId: string;
  taxProfileId: string;
  fieldGroupId: string;
  fieldValues: Record<string, number>;
  formula: {
    actualPrice: string;
    sellingPrice: string;
    anchorPrice: string;
  };
  baseUnitId: string;
}

interface BulkFailedResultRow extends GomTableRow {
  rowId: string;
  rowNumber: number;
  groupName: string;
  category: string;
  inferredGroupType: string;
  baseUnit: string;
  allowedUnits: string;
  resultType: string;
  errorSummary: string;
  errorFields: string[];
  actions: string;
}

interface BulkSuccessResultRow extends GomTableRow {
  rowId: string;
  rowNumber: number;
  groupId: string;
  groupName: string;
  category: string;
  inferredGroupType: string;
  baseUnit: string;
  allowedUnits: string;
  variantSummary: string;
  variantTooltip: string;
  createVariantsRequested: boolean;
  variantFailureCount: number;
  variantIssue: string;
  actions: string;
  status: string;
}

interface BulkVariantFailureRow extends GomTableRow {
  id: string;
  rowNumber: number;
  groupName: string;
  attemptedVariantLabel: string;
  measuredInput: string;
  failureCode: string;
  failureMessage: string;
}

@Component({
  selector: 'gom-groups',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormControlsModule,
    DisableIfNoFeatureDirective,
    GomButtonComponent,
    GomTableComponent,
    GomTabsComponent,
    GomTabContentComponent,
    GomModalComponent,
    GomConfirmationModalComponent,
    ImagePickerComponent,
    RichTextEditorComponent,
    QuickCreateGroupComponent,
  ],
  templateUrl: './groups.component.html',
  styleUrl: './groups.component.scss',
})
export class GroupsComponent implements OnInit, OnDestroy {
  @ViewChild('descEditor') descEditor?: RichTextEditorComponent;
  @ViewChild('quickCreateModal') quickCreateModal?: QuickCreateGroupComponent;
  private readonly groupsService = inject(GroupsService);
  private readonly mediaService = inject(MediaAssetService);
  private readonly bulkImportTemplateService = inject(BulkImportTemplateService);
  private readonly toast = inject(GomAlertToastService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly authSession = inject(AuthSessionService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly productCollectionsService = inject(ProductCollectionsService);
  private readonly variantsService = inject(VariantsService);
  private readonly bulkRowEditContextStorageKey = 'gom.bulk.row.edit.context';
  private readonly groupFieldToggleControls = new Map<string, FormControl<boolean>>();
  private pendingQuickEditGroupId: string | null = null;
  private bulkUploadPollTimer: ReturnType<typeof setInterval> | null = null;

  // ── Bulk Upload Excel state ─────────────────────────────────────────────
  readonly templateUploading = signal(false);
  readonly bulkUploadJobId = signal<string | null>(null);
  readonly bulkUploadJobStatus = signal<BulkUploadJobStatus | null>(null);
  readonly showBulkUploadResultModal = signal(false);
  readonly bulkUploadResults = signal<BulkUploadJobResults | null>(null);
  readonly bulkUploadResultsLoading = signal(false);
  readonly bulkUploadRetryingRowId = signal<string | null>(null);
  readonly bulkUploadEditRow = signal<BulkUploadFailedRow | null>(null);
  readonly bulkUploadEditGroupName = signal('');
  readonly bulkUploadEditGroupNameControl = new FormControl<string>('', { nonNullable: true });
  readonly bulkUploadPendingQuickCreateRow = signal<BulkUploadFailedRow | null>(null);
  readonly reopenBulkUploadResultsAfterQuickCreate = signal(false);
  readonly bulkUploadAcknowledgeConfirmOpen = signal(false);
  readonly bulkUploadDeleteConfirmOpen = signal(false);
  readonly bulkUploadRowToDelete = signal<BulkUploadFailedRow | null>(null);
  readonly bulkVariantFailuresHidden = signal(false);

  readonly bulkJobIsActive = computed(() => {
    const s = this.bulkUploadJobStatus()?.status;
    return s === 'QUEUED' || s === 'VALIDATING' || s === 'PROCESSING';
  });

  readonly bulkJobIsTerminal = computed(() => this.bulkUploadJobStatus()?.isTerminal ?? false);
  readonly bulkJobUnresolvedCount = computed(() => {
    // Always prefer the server-authoritative totals (row-level counts, not record counts).
    // Fallback to counting locally only when status is not yet loaded.
    const fromStatus = this.bulkUploadJobStatus()?.totals?.unresolvedRows;
    if (typeof fromStatus === 'number') {
      return fromStatus;
    }
    // Local fallback: count unresolved failed rows only (variant warnings are server-authoritative).
    return this.bulkUploadResults()?.failedRows.filter((r) => !r.resolved).length ?? 0;
  });
  readonly showBulkUploadBanner = computed(() => {
    // Keep completion banner visible for the current job even when there are no failures,
    // so users can still open View and inspect success/variant-warning details.
    return this.bulkJobIsActive() || this.bulkJobUnresolvedCount() > 0 || this.bulkJobIsTerminal();
  });

  private readonly bulkFailedErrorFieldMap: Record<string, string[]> = {
    GROUP_NAME_REQUIRED: ['groupName'],
    DUPLICATE: ['groupName'],
    CATEGORY_INVALID: ['category'],
    BASE_UNIT_REQUIRED: ['baseUnit'],
    ALLOWED_UNIT_INVALID: ['allowedUnits'],
    TAX_PROFILE_INVALID: ['taxProfile'],
    PRICING_TEMPLATE_INVALID: ['pricingTemplate'],
    GROUP_TYPE_INFERENCE_FAILED: ['inferredGroupType'],
    ATTRIBUTE_INVALID: ['inferredGroupType'],
    ATTRIBUTE_VALUES_REQUIRED: ['inferredGroupType'],
    ATTRIBUTE_VALUES_INVALID: ['inferredGroupType'],
    ATTRIBUTE_NAME_REQUIRED: ['inferredGroupType'],
    QUOTA_EXCEEDED: ['resultType'],
    SYSTEM_ERROR: ['resultType'],
    INVALID: ['resultType'],
  };

  readonly loading = signal(false);
  readonly templateDownloading = signal(false);
  readonly templateRefreshing = signal(false);
  readonly showTemplateRefreshWarningsModal = signal(false);
  readonly templateRefreshWarnings = signal<Array<{ rowNumber: number; message: string }>>([]);
  readonly templateRefreshResult = signal<{
    file: string;
    filename: string;
    rowCount: number;
    newlyAdded: {
      categories: string[];
      units: string[];
      taxProfiles: string[];
      pricingTemplates: string[];
      attributes: string[];
    };
    masterData: {
      categories: string[];
      units: string[];
      taxProfiles: string[];
      pricingTemplates: string[];
      attributes: string[];
    };
  } | null>(null);
  readonly canCreateGroup = computed(() => this.authSession.hasFeature('group.create'));
  readonly canCreateTabbedGroup = computed(() => {
    return (
      this.authSession.hasFeature('tap.create_group')
      || this.authSession.hasFeature('tab.create_group')
      || this.authSession.hasFeature('Tap Create Group')
    );
  });
  readonly canUpdateGroup = computed(() => this.authSession.hasFeature('group.edit') || this.authSession.hasFeature('group.update'));
  readonly canDeleteGroup = computed(() => this.authSession.hasFeature('group.delete'));
  readonly canBulkCreateGroup = computed(() => this.authSession.hasFeature('group.bulk_create'));
  readonly canCreateStock = computed(() => this.authSession.hasFeature('stock.create'));
  readonly canCreateVariant = computed(() => this.authSession.hasFeature('variant.create'));
  readonly canManageProductCollections = computed(
    () => this.authSession.hasFeature('productCollection.list') && this.authSession.hasFeature('productCollection.assign')
  );
  readonly groupCreateLimit = computed(() => this.authSession.getFeatureConfigNumber('group.create', 'max_count'));
  readonly groupCreateUsed = computed(() => this.groups().length);
  readonly groupCreateRemaining = computed(() => {
    const limit = this.groupCreateLimit();
    if (limit === null) {
      return null;
    }

    return Math.max(limit - this.groupCreateUsed(), 0);
  });
  readonly saving = signal(false);
  readonly completionStatus = signal<GroupCompletionStatus | null>(null);
  readonly completionLoading = signal(false);
  readonly completionActionItem = signal<CompletionChecklistItem | null>(null);
  readonly completionMode = signal(false);
  readonly variantReviewOpen = signal(false);
  readonly variantReviewLoading = signal(false);
  readonly variantGenerating = signal(false);
  readonly variantPreview = signal<GroupVariantGenerationPreview | null>(null);
  readonly variantDisabledKeys = signal<string[]>([]);
  readonly errorMessage = signal<string | null>(null);

  readonly totalGroups = signal(0);
  readonly currentGroupPage = signal(1);
  readonly groupTablePageIndex = signal(0);
  readonly groupTablePageSize = signal(50);
  readonly canLoadAllGroups = signal(false);
  readonly allGroupsLoaded = signal(false);
  readonly serverSidePagination = computed(() => this.totalGroups() > 500);
  readonly tableDataMode = computed<'client' | 'server'>(() => (this.serverSidePagination() && !this.allGroupsLoaded() ? 'server' : 'client'));
  readonly totalGroupPages = computed(() => Math.max(Math.ceil(this.totalGroups() / 50), 1));

  readonly groups = signal<Group[]>([]);
  readonly categories = signal<Category[]>([]);
  readonly fields = signal<Field[]>([]);
  readonly fieldGroups = signal<FieldGroup[]>([]);
  readonly units = signal<Unit[]>([]);
  readonly taxProfiles = signal<TaxProfile[]>([]);

  readonly wizardOpen = signal(false);
  readonly currentStep = signal(1);
  readonly editingGroupId = signal<string | null>(null);
  readonly editingQuantity = signal(1);
  readonly selectedFieldGroupIds = signal<string[]>([]);
  readonly hiddenGroupFieldKeys = signal<Set<string>>(new Set());
  readonly selectedExtraFieldIds = signal<string[]>([]);
  readonly formulaTarget = signal<FormulaTarget>('sellingPrice');
  readonly showAdvancedFormulaTools = signal(false);
  readonly simpleBaseCostKey = signal<string>('');
  readonly simpleMarginPercent = signal<number>(0);
  readonly simpleAnchorPercent = signal<number>(0);
  readonly simpleSellingMarginBase = signal<SellingMarginBase>('buy');
  readonly simpleActualExtraKeys = signal<string[]>([]);
  readonly submitMode: GomButtonContentMode = getButtonContentMode('primary-action');
  readonly cancelMode: GomButtonContentMode = getButtonContentMode('dismiss');
  readonly secondaryMode: GomButtonContentMode = getButtonContentMode('secondary-action');

  readonly basicForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    description: [''],
    groupType: ['MEASURED' as 'MEASURED' | 'ATTRIBUTE' | 'HYBRID', [Validators.required]],
    createDefaultVariant: [false],
    categoryId: ['', [Validators.required]],
    taxProfileId: [''],
    pricingRefreshMode: ['AUTO_REFRESH' as PricingRefreshMode, [Validators.required]],
  });

  readonly selectionForm = this.fb.group({
    fieldGroupId: ['', [Validators.required]],
  });

  readonly valuesForm = new FormRecord<FormControl<number | null>>({});

  readonly formulaForm = this.fb.group({
    sellingPrice: ['', [Validators.required]],
    anchorPrice: ['', [Validators.required]],
    actualPrice: ['', [Validators.required]],
  });

  readonly unitsForm = this.fb.group({
    baseUnitId: ['', [Validators.required]],
  });

  readonly groupCollectionForm = this.fb.group({
    collectionId: [''],
  });

  readonly allowedUnitIds = signal<string[]>([]);

  // --- Option Axes for ATTRIBUTE/HYBRID groups ---
  readonly optionAxesForm = this.fb.array<FormGroup<{
    key: FormControl<string>;
    label: FormControl<string>;
    values: FormControl<string>;
  }>>([]);

  readonly currentGroupType = toSignal(this.basicForm.controls.groupType.valueChanges, {
    initialValue: this.basicForm.controls.groupType.value,
  });

  readonly selectedCategoryId = toSignal(this.basicForm.controls.categoryId.valueChanges, {
    initialValue: this.basicForm.controls.categoryId.value,
  });

  readonly needsOptionAxes = computed(() => {
    const groupType = this.currentGroupType();
    return groupType === 'ATTRIBUTE' || groupType === 'HYBRID';
  });

  // --- Images ---
  readonly DEFAULT_MAX_IMAGES = 10;
  readonly DEFAULT_MAX_VIDEOS = 1;
  readonly groupImages = signal<GroupImage[]>([]);
  readonly pickerOpen = signal(false);
  readonly groupCollectionsModalOpen = signal(false);
  readonly loadingGroupCollections = signal(false);
  readonly currentGroupForCollections = signal<Group | null>(null);
  readonly groupCollectionMemberships = signal<ProductCollection[]>([]);
  readonly availableProductCollections = signal<ProductCollection[]>([]);
  readonly canUploadOwn = computed(() => {
    const session = this.authSession.session();
    if (session?.actorType !== 'tenant') return false;
    const keys = new Set(
      (session.featureKeys ?? []).map((k: string) => String(k || '').trim().toLowerCase()).filter(Boolean),
    );
    return keys.has('media.upload');
  });
  readonly imageCount = computed(() => this.groupImages().length);
  readonly videoCount = computed(() => this.groupImages().filter((img) => img.mediaAssetId.mediaType === 'VIDEO').length);
  readonly hasVideo = computed(() => this.videoCount() > 0);
  readonly existingImageIds = computed(() => new Set(this.groupImages().map((img) => img.mediaAssetId._id)));
  readonly previewCaptionTrack = 'data:text/vtt;charset=utf-8,WEBVTT%0A';
  readonly groupImageLimit = computed(() => this.authSession.getFeatureConfigNumber('group.create', 'max_images') ?? this.DEFAULT_MAX_IMAGES);
  readonly groupVideoLimit = computed(() => this.authSession.getFeatureConfigNumber('group.create', 'max_videos') ?? this.DEFAULT_MAX_VIDEOS);

  readonly columns: GomTableColumn<GroupRow>[] = [
    { key: 'name', header: 'Group Name', sortable: true, filterable: true, width: '16rem' },
    { key: 'categoryName', header: 'Category', sortable: true, filterable: true, width: '12rem' },
    {
      key: 'stock',
      header: 'Stock',
      sortable: true,
      width: '10rem',
      cellClass: (_value, row) => {
        if (row.stockSeverity === 'critical') {
          return 'group-stock--critical';
        }
        if (row.stockSeverity === 'low') {
          return 'group-stock--low';
        }
        return 'group-stock--normal';
      },
    },
    { key: 'status', header: 'Status', sortable: true, filterable: true, width: '10rem' },
    {
      key: 'actions',
      header: 'Actions',
      width: '20rem',
      actionButtons: [
        {
          label: () => this.canUpdateGroup() ? 'Edit' : 'No permission to edit groups',
          icon: 'ri-pencil-line',
          actionKey: 'edit',
          variant: 'secondary',
          disabled: () => !this.canUpdateGroup(),
        },
        {
          label: () => this.canCreateGroup() ? 'Clone Group' : 'No permission to clone groups',
          icon: 'ri-file-copy-line',
          actionKey: 'clone',
          variant: 'secondary',
          disabled: () => !this.canCreateGroup(),
        },
        {
          label: () => this.canCreateStock() ? 'Add Stock' : 'No permission to add stock',
          icon: 'ri-stock-line',
          actionKey: 'add-stock',
          variant: 'secondary',
          disabled: () => !this.canCreateStock(),
        },
        {
          label: () => this.canCreateVariant() ? 'Add Variant' : 'No permission to add variants',
          icon: 'ri-price-tag-3-line',
          actionKey: 'add-variant',
          variant: 'secondary',
          disabled: () => !this.canCreateVariant(),
        },
        {
          label: () => this.canManageProductCollections() ? 'Collections' : 'No permission for collections',
          icon: 'ri-folders-line',
          actionKey: 'collections',
          variant: 'secondary',
          disabled: () => !this.canManageProductCollections(),
        },
        {
          label: () => this.canDeleteGroup() ? 'Delete' : 'No permission to delete groups',
          icon: 'ri-delete-bin-line',
          actionKey: 'delete',
          variant: 'danger',
          disabled: () => !this.canDeleteGroup(),
        },
      ],
    },
  ];

  readonly bulkFailedColumns: GomTableColumn<BulkFailedResultRow>[] = [
    { key: 'rowNumber', header: 'Row', sortable: true, width: '6rem' },
    {
      key: 'groupName',
      header: 'Group Name',
      sortable: true,
      filterable: true,
      width: '14rem',
      cellClass: (_value, row) => row.errorFields.includes('groupName') ? 'bulk-upload-cell--error' : '',
    },
    {
      key: 'category',
      header: 'Category',
      sortable: true,
      filterable: true,
      width: '12rem',
      cellClass: (_value, row) => row.errorFields.includes('category') ? 'bulk-upload-cell--error' : '',
    },
    {
      key: 'inferredGroupType',
      header: 'Group Type',
      sortable: true,
      filterable: true,
      width: '10rem',
      cellClass: (_value, row) => row.errorFields.includes('inferredGroupType') ? 'bulk-upload-cell--error' : '',
    },
    {
      key: 'baseUnit',
      header: 'Base Unit',
      sortable: true,
      filterable: true,
      width: '10rem',
      cellClass: (_value, row) => row.errorFields.includes('baseUnit') ? 'bulk-upload-cell--error' : '',
    },
    {
      key: 'allowedUnits',
      header: 'Allowed Units',
      sortable: false,
      filterable: true,
      width: '12rem',
      cellClass: (_value, row) => row.errorFields.includes('allowedUnits') ? 'bulk-upload-cell--error' : '',
    },
    {
      key: 'resultType',
      header: 'Fail Type',
      sortable: true,
      filterable: true,
      width: '10rem',
      cellClass: (_value, row) => row.errorFields.includes('resultType') ? 'bulk-upload-cell--error' : '',
    },
    {
      key: 'errorSummary',
      header: 'Error Details',
      sortable: false,
      filterable: true,
      width: '24rem',
      cellClass: () => 'bulk-upload-cell--error-detail',
    },
    {
      key: 'actions',
      header: 'Actions',
      width: '18rem',
      actionButtons: [
        {
          label: () => 'Edit',
          icon: 'ri-pencil-line',
          actionKey: 'edit',
          variant: 'secondary',
        },
        {
          label: () => 'Retry',
          icon: 'ri-refresh-line',
          actionKey: 'retry',
          variant: 'secondary',
        },
        {
          label: () => 'Delete',
          icon: 'ri-delete-bin-line',
          actionKey: 'delete',
          variant: 'danger',
        },
      ],
    },
  ];

  readonly bulkSuccessColumns: GomTableColumn<BulkSuccessResultRow>[] = [
    { key: 'rowNumber', header: 'Row', sortable: true, width: '6rem' },
    { key: 'groupName', header: 'Group Name', sortable: true, filterable: true, width: '14rem' },
    { key: 'category', header: 'Category', sortable: true, filterable: true, width: '12rem' },
    { key: 'inferredGroupType', header: 'Group Type', sortable: true, filterable: true, width: '10rem' },
    { key: 'baseUnit', header: 'Base Unit', sortable: true, filterable: true, width: '10rem' },
    { key: 'allowedUnits', header: 'Allowed Units', sortable: false, filterable: true, width: '12rem' },
    {
      key: 'variantSummary',
      header: 'Variants',
      sortable: false,
      filterable: true,
      width: '24rem',
      tooltip: (_value, row) => row.variantTooltip,
    },
    {
      key: 'variantIssue',
      header: 'Variant Issue',
      sortable: false,
      filterable: true,
      width: '26rem',
      cellClass: (_value, row) => row.variantIssue !== '-' ? 'bulk-upload-cell--error-detail' : '',
    },
    {
      key: 'actions',
      header: 'Actions',
      width: '14rem',
      actionButtons: [
        {
          label: () => 'Retry Variants',
          icon: 'ri-refresh-line',
          actionKey: 'retry-variants',
          variant: 'secondary',
          disabled: (row) => !(row.createVariantsRequested && row.variantFailureCount > 0 && !!row.groupId),
          disabledTooltip: (row) => row.createVariantsRequested
            ? 'No variant retry needed for this row'
            : 'Create Variants is not enabled for this row',
        },
      ],
    },
    { key: 'status', header: 'Status', sortable: true, filterable: true, width: '8rem' },
  ];

  readonly bulkFailedRows = computed<BulkFailedResultRow[]>(() => {
    const rows = this.bulkUploadResults()?.failedRows ?? [];
    return rows
      .filter((row) => !row.resolved)
      .map((row) => {
        const errorFields = this.resolveFailedRowErrorFields(row);
        const cleanedErrors = (row.reasons || [])
          .map((reason) => this.parseErrorMessage(reason.message || ''))
          .filter((msg) => msg !== '-')
          .join(' | ');
        return {
          rowId: row.rowId,
          rowNumber: Number(row.rowNumber || 0),
          groupName: String(row.groupName || row.rawPayload?.['groupName'] || '-'),
          category: String(row.rawPayload?.['category'] || '-'),
          inferredGroupType: String(row.inferredGroupType || '-'),
          baseUnit: String(row.rawPayload?.['baseUnit'] || '-'),
          allowedUnits: String(row.rawPayload?.['allowedUnits'] || '-'),
          resultType: String(row.resultType || '-'),
          errorSummary: cleanedErrors || '-',
          errorFields,
          actions: 'Edit / Retry / Delete',
        };
      });
  });

  readonly bulkSuccessRows = computed<BulkSuccessResultRow[]>(() => {
    const rows = this.bulkUploadResults()?.successRows ?? [];
    return rows.map((row) => ({
      groupId: String(row.groupId || ''),
      createVariantsRequested: Boolean(row.createVariantsRequested),
      variantFailureCount: Number(row.variantFailureCount || 0),
      variantIssue: String(row.variantFailureReason || '').trim() || '-',
      actions: 'Retry Variants',
      variantSummary: this.buildVariantSummary(
        Array.isArray(row.variantNames) ? row.variantNames : [],
        Number(row.variantCount || 0)
      ),
      variantTooltip: this.buildVariantTooltip(
        Array.isArray(row.variantNames) ? row.variantNames : [],
        Number(row.variantCount || 0)
      ),
      rowId: row.rowId,
      rowNumber: Number(row.rowNumber || 0),
      groupName: String(row.groupName || '-'),
      category: String(row.category || row.rawPayload?.['category'] || '-'),
      inferredGroupType: String(row.inferredGroupType || '-'),
      baseUnit: String(row.baseUnit || row.rawPayload?.['baseUnit'] || '-'),
      allowedUnits: String(row.allowedUnits || row.rawPayload?.['allowedUnits'] || '-'),
      status: 'SUCCESS',
    }));
  });

  onBulkSuccessRowAction(event: { actionKey: string; row: GomTableRow }): void {
    if (event.actionKey !== 'retry-variants') {
      return;
    }

    const rowId = String(event.row['rowId'] || '');
    if (!rowId) {
      return;
    }

    const row = this.bulkUploadResults()?.successRows.find((item) => item.rowId === rowId);
    if (!row) {
      return;
    }

    this.retryVariantsForSuccessRow(row);
  }

  private retryVariantsForSuccessRow(row: { rowId: string; rowNumber: number; groupId: string | null }): void {
    const jobId = this.bulkUploadJobId();
    if (!jobId || !row.groupId) {
      this.toast.warning('Cannot retry variants for this row.');
      return;
    }

    this.bulkUploadRetryingRowId.set(row.rowId);
    this.bulkImportTemplateService.retryRow(jobId, row.rowId, { retryVariantsOnly: 'true' }).subscribe({
      next: (res) => {
        this.bulkUploadRetryingRowId.set(null);
        const attempted = Number(res.data?.variantRetry?.attempted || 0);
        const warnings = Number(res.data?.variantRetry?.warningCount || 0);
        if (warnings > 0) {
          this.toast.warning(`Retried ${attempted} variants. ${warnings} warning(s) remain.`);
        } else {
          this.toast.success(`Retried ${attempted} variants successfully.`);
        }
        this.loadBulkUploadResults(jobId);
      },
      error: (err) => {
        this.bulkUploadRetryingRowId.set(null);
        this.toast.error(err?.error?.message || 'Retry variants failed. Please try again.');
      },
    });
  }

  private buildVariantSummary(variantNames: string[], totalCount: number): string {
    if (!Number.isFinite(totalCount) || totalCount <= 0) {
      return 'No variants created';
    }
    const cleanNames = variantNames
      .map((name) => String(name || '').trim())
      .filter(Boolean)
      .slice(0, 3);
    const remaining = Math.max(0, totalCount - cleanNames.length);
    const prefix = cleanNames.length > 0 ? cleanNames.join(' | ') : `${totalCount} created`;
    return remaining > 0 ? `${prefix} + ${remaining} more` : prefix;
  }

  private buildVariantTooltip(variantNames: string[], totalCount: number): string {
    if (!Number.isFinite(totalCount) || totalCount <= 0) {
      return 'No variants created';
    }

    const cleanNames = variantNames
      .map((name) => String(name || '').trim())
      .filter(Boolean);

    if (cleanNames.length === 0) {
      return `${totalCount} variants created`;
    }

    return cleanNames.join('\n');
  }

  readonly bulkVariantFailureColumns: GomTableColumn<BulkVariantFailureRow>[] = [
    { key: 'rowNumber', header: 'Row', sortable: true, width: '6rem' },
    { key: 'groupName', header: 'Group Name', sortable: true, filterable: true, width: '14rem' },
    { key: 'attemptedVariantLabel', header: 'Attempted Variant', sortable: false, width: '20rem' },
    { key: 'measuredInput', header: 'Measured Input', sortable: false, width: '10rem' },
    { key: 'failureCode', header: 'Failure Code', sortable: true, filterable: true, width: '14rem' },
    {
      key: 'failureMessage',
      header: 'Reason',
      sortable: false,
      width: '24rem',
      cellClass: () => 'bulk-upload-cell--error-detail',
    },
  ];

  readonly bulkVariantFailureRows = computed<BulkVariantFailureRow[]>(() =>
    (this.bulkUploadResults()?.variantFailures ?? []).map((vf: BulkUploadVariantFailure) => ({
      id: vf.id,
      rowNumber: Number(vf.rowNumber || 0),
      groupName: String(vf.groupName || '-'),
      attemptedVariantLabel: String(vf.attemptedVariantLabel || '-'),
      measuredInput: String(vf.measuredInput || '-'),
      failureCode: String(vf.failureCode || '-'),
      failureMessage: String(vf.failureMessage || '-'),
    }))
  );

  readonly categoryOptions = computed<GomSelectOption[]>(() =>
    this.categories()
      .filter((item) => item.status === 'ACTIVE')
      .map((item) => ({ label: item.name, value: item._id }))
  );

  readonly fieldGroupOptions = computed<GomSelectOption[]>(() =>
    this.getFieldGroupsForCategory(this.selectedCategoryId() || '')
      .filter((item) => item.status === 'ACTIVE')
      .map((item) => ({ label: `${item.name} (v${item.version})`, value: item._id }))
  );

  readonly unitOptions = computed<GomSelectOption[]>(() =>
    this.getUnitsForCategory(this.selectedCategoryId() || '')
      .filter((item) => item.status === 'ACTIVE')
      .map((item) => ({ label: `${item.name} (${item.symbol})`, value: item._id }))
  );

  readonly taxProfileOptions = computed<GomSelectOption[]>(() =>
    this.taxProfiles()
      .filter((item) => item.status === 'ACTIVE')
      .map((item) => {
        const taxLabel = item.taxMode === 'GST' ? `${item.rate}% GST` : 'No Tax';
        return {
          label: `${item.name} (${taxLabel})`,
          value: item._id,
        };
      })
  );

  readonly groupCollectionOptions = computed<GomSelectOption[]>(() =>
    this.availableProductCollections().map((item) => ({ value: item._id, label: item.name }))
  );

  readonly pricingRefreshModeOptions: GomSelectOption[] = [
    { label: 'Auto Refresh (apply automatically)', value: 'AUTO_REFRESH' },
    { label: 'Manual Refresh (require approval)', value: 'MANUAL_REFRESH' },
    { label: 'Fixed (no auto updates)', value: 'FIXED' },
  ];

  getPricingRefreshModeHint(): string {
    const mode = this.basicForm.controls.pricingRefreshMode.value;
    switch (mode) {
      case 'AUTO_REFRESH':
        return 'Prices will update automatically whenever you add stock. No approval needed.';
      case 'MANUAL_REFRESH':
        return 'System will calculate new prices and show suggestions for your approval before applying changes.';
      case 'FIXED':
        return 'Prices will never change automatically. You can only edit prices manually on the group page.';
      default:
        return 'Select a mode to see how pricing updates will work for this group.';
    }
  }

  readonly groupTypeOptions: GomSelectOption[] = [
    { label: 'Measured (by Weight/Volume)', value: 'MEASURED' },
    { label: 'Attribute (by Options)', value: 'ATTRIBUTE' },
    { label: 'Hybrid (Weight/Volume + Options)', value: 'HYBRID' },
  ];

  readonly selectedFieldGroups = computed<FieldGroup[]>(() => {
    const selectedIds = this.selectedFieldGroupIds();
    if (!selectedIds.length) {
      return [];
    }

    const byId = new Map(this.fieldGroups().map((item) => [item._id, item]));
    return selectedIds
      .map((id) => byId.get(id) || null)
      .filter((item): item is FieldGroup => !!item);
  });

  readonly groupFields = computed<GroupWizardField[]>(() => {
    const selectedGroups = this.selectedFieldGroups();
    if (!selectedGroups.length) {
      return [];
    }

    const byId = new Map(this.fields().map((item) => [item._id, item]));
    const merged = new Map<string, GroupWizardField>();

    for (const selected of selectedGroups) {
      for (const item of [...selected.fields].sort((a, b) => a.order - b.order)) {
        const field = byId.get(item.fieldId);
        if (!field || !this.isPricingField(field)) {
          continue;
        }

        if (merged.has(field._id)) {
          continue;
        }

        let resolvedDefaultValue = 0;
        if (typeof field.defaultValue === 'number') {
          resolvedDefaultValue = field.defaultValue;
        }

        if (typeof item.defaultValue === 'number') {
          resolvedDefaultValue = item.defaultValue;
        }

        merged.set(field._id, {
          fieldId: field._id,
          key: field.key,
          name: field.name,
          type: field.type,
          isRequired: typeof item.requiredOverride === 'boolean' ? item.requiredOverride : field.isRequired,
          defaultValue: resolvedDefaultValue,
          valueFormat: field.valueFormat ?? 'NUMBER',
          currencyCode: field.currencyCode ?? null,
        });
      }
    }

    return [...merged.values()];
  });

  readonly visibleGroupFields = computed<GroupWizardField[]>(() => {
    const hidden = this.hiddenGroupFieldKeys();
    return this.groupFields().filter((item) => !hidden.has(item.key));
  });

  readonly availableExtraFields = computed<GroupWizardField[]>(() => {
    const baseFieldIds = new Set(this.groupFields().map((item) => item.fieldId));

    return this.fields()
      .filter((item) => item.status === 'ACTIVE' && !baseFieldIds.has(item._id))
      .filter((item) => this.isPricingField(item))
      .map((item) => ({
        fieldId: item._id,
        key: item.key,
        name: item.name,
        type: item.type,
        isRequired: item.isRequired,
        defaultValue: typeof item.defaultValue === 'number' ? item.defaultValue : 0,
        valueFormat: item.valueFormat ?? 'NUMBER',
        currencyCode: item.currencyCode ?? null,
      }));
  });

  readonly wizardFields = computed<GroupWizardField[]>(() => {
    const extras = new Set(this.selectedExtraFieldIds());
    const extraFields = this.availableExtraFields().filter((item) => extras.has(item.fieldId));
    return [...this.visibleGroupFields(), ...extraFields];
  });

  readonly formulaTokenFields = computed<string[]>(() => this.wizardFields().map((field) => field.key));
  readonly simpleBaseCostOptions = computed<GomSelectOption[]>(() =>
    this.wizardFields()
      .filter((field) => field.type === 'NUMBER')
      .map((field) => ({ value: field.key, label: `${field.name} (${field.key})` }))
  );
  readonly simpleActualExtraOptions = computed<GroupWizardField[]>(() => {
    const base = this.simpleBaseCostKey();
    return this.wizardFields().filter((field) => field.type === 'NUMBER' && field.key !== base);
  });
  readonly simpleGeneratedFormulas = computed(() => this.buildSimplePricingFormulas());

  readonly rows = computed<GroupRow[]>(() => {
    const categoriesById = new Map(this.categories().map((item) => [item._id, item.name]));

    return this.groups().map((item) => {
      const availableStock = Number(item.stock?.available ?? 0);
      const reorderLevel = Number(item.stock?.reorderLevel ?? 0);
      let stockSeverity: GroupRow['stockSeverity'] = 'normal';

      if (availableStock === 0) {
        stockSeverity = 'critical';
      } else if (availableStock <= reorderLevel) {
        stockSeverity = 'low';
      }

      return {
        _id: item._id,
        name: item.name,
        categoryName: categoriesById.get(item.categoryId) || '-',
        stock: availableStock.toLocaleString(),
        stockSeverity,
        status: item.status,
        actions: 'Edit',
      };
    });
  });

  formulaPreview(): { sellingPrice: number | null; anchorPrice: number | null; actualPrice: number | null; error: string | null } {
    return this.calculateFormulaPreview();
  }

  readonly wizardTabs = computed<TabItem[]>(() => [
    { id: 1, label: '1. Basic Info' },
    { id: 2, label: '2. Product Options' },
    { id: 3, label: '3. Field Values' },
    { id: 4, label: '4. Price Rule' },
    { id: 5, label: '5. Units' },
    { id: 6, label: '6. Images/Videos' },
  ]);

  /**
   * Extract error message from HTTP error response
   * Handles various error structures from backend
   */
  private getErrorMessage(error: any, fallback: string): string {
    // Try to get message from structured error response
    if (error?.error) {
      // If error.error is a string, return it
      if (typeof error.error === 'string') {
        return error.error;
      }
      // If error.error has a message property
      if (error.error.message && typeof error.error.message === 'string') {
        return error.error.message;
      }
      // If error.error is an object, try to stringify it nicely
      if (typeof error.error === 'object') {
        return error.error.message || JSON.stringify(error.error);
      }
    }
    // Try to get message directly from error
    if (error?.message && typeof error.message === 'string') {
      return error.message;
    }
    // Fallback
    return fallback;
  }

  ngOnInit(): void {
    this.pendingBulkContextOpen = this.route.snapshot.queryParamMap.get('openBulkRowEdit') === '1';
    const quickEditTargetId = this.route.snapshot.queryParamMap.get('quickEditGroupId') || '';
    const quickEditMode = this.route.snapshot.queryParamMap.get('quickEdit') === '1';
    if (quickEditMode && quickEditTargetId) {
      this.pendingQuickEditGroupId = quickEditTargetId;
      this.completionMode.set(false);
      this.editingGroupId.set(null);
    }

    const completionTargetId = this.route.snapshot.queryParamMap.get('completeGroupId') || '';
    if (!this.pendingQuickEditGroupId && this.route.snapshot.queryParamMap.get('openCompletion') === '1' && completionTargetId) {
      this.pendingQuickEditGroupId = completionTargetId;
      this.completionMode.set(false);
      this.editingGroupId.set(null);
    }
    this.loadInitialData();
  }

  private pendingBulkContextOpen = false;

  loadInitialData(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    forkJoin({
      groups: this.groupsService.listGroups({ page: 1, limit: this.groupTablePageSize() }),
      categories: this.groupsService.listCategories(),
      fields: this.groupsService.listFields(),
      fieldGroups: this.groupsService.listFieldGroups(),
      units: this.groupsService.listUnits(),
      taxProfiles: this.groupsService.listTaxProfiles(),
    }).subscribe({
      next: (result) => {
        const gPagination = result.groups.pagination;
        this.totalGroups.set(gPagination.total);
        this.canLoadAllGroups.set(gPagination.canLoadAll);
        this.currentGroupPage.set(1);
        this.groupTablePageIndex.set(0);
        this.allGroupsLoaded.set(gPagination.total <= 500);

        if (gPagination.total <= 500 && gPagination.hasMore) {
          this.groupsService.listGroups({ page: 1, limit: gPagination.total }).subscribe({
            next: (allRes) => this.groups.set(allRes.data ?? []),
          });
        } else {
          this.groups.set(result.groups.data ?? []);
        }
        this.categories.set(result.categories.data ?? []);
        this.fields.set(result.fields.data ?? []);
        this.fieldGroups.set(result.fieldGroups.data ?? []);
        this.units.set(result.units.data ?? []);
        this.taxProfiles.set(result.taxProfiles.data ?? []);
        this.restoreBulkUploadAttention();
        this.loading.set(false);

        if (this.pendingBulkContextOpen) {
          this.pendingBulkContextOpen = false;
          this.openWizardFromBulkContext();
        }

        if (this.pendingQuickEditGroupId) {
          const quickEditId = this.pendingQuickEditGroupId;
          this.pendingQuickEditGroupId = null;
          this.openQuickCreateEditById(quickEditId);
          return;
        }

        if (this.completionMode() && this.editingGroupId()) {
          const group = this.groups().find((item) => item._id === this.editingGroupId());
          if (group) {
            this.openEditWizard(group, true);
          } else {
            const completionGroupId = this.editingGroupId()!;
            this.groupsService.getGroupById(completionGroupId).subscribe({
              next: (response) => {
                if (response?.data) {
                  this.openEditWizard(response.data, true);
                }
              },
              error: () => {
                this.toast.error('Unable to open completion mode for this group.');
              },
            });
          }
        }
      },
      error: (error) => {
        console.error('Failed to load group setup data', error);
        this.errorMessage.set('Failed to load group setup data. Please refresh and try again.');
        this.loading.set(false);
      },
    });
  }

  onGroupTableQueryChange(query: GomTableQuery): void {
    if (this.tableDataMode() !== 'server') {
      return;
    }

    this.loading.set(true);

    const params: Parameters<GroupsService['listGroups']>[0] = {
      page: query.pageIndex + 1,
      limit: query.pageSize,
    };

    if (query.searchTerm?.trim()) {
      params.search = query.searchTerm.trim();
    }

    if (query.sort?.key && query.sort?.direction && (query.sort.direction === 'asc' || query.sort.direction === 'desc')) {
      params.sortBy = query.sort.key;
      params.order = query.sort.direction;
    }

    this.groupsService.listGroups(params).subscribe({
      next: (res) => {
        this.allGroupsLoaded.set(false);
        this.groups.set(res.data ?? []);
        this.totalGroups.set(res.pagination.total);
        this.canLoadAllGroups.set(res.pagination.canLoadAll);
        this.currentGroupPage.set(query.pageIndex + 1);
        this.groupTablePageIndex.set(query.pageIndex);
        this.groupTablePageSize.set(query.pageSize);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

    private openWizardFromBulkContext(): void {
      const raw = localStorage.getItem(this.bulkRowEditContextStorageKey);
      if (!raw) {
        return;
      }

      let context: BulkRowEditContext | null = null;
      try {
        context = JSON.parse(raw) as BulkRowEditContext;
      } catch {
        context = null;
      }

      if (!context) {
        return;
      }

      this.resetWizard();

      const categoryId = String(context.categoryId || '').trim();
      const taxProfileId = String(context.taxProfileId || '').trim();
      const fieldGroupId = String(context.fieldGroupId || '').trim();
      const baseUnitId = String(context.baseUnitId || '').trim();

      this.basicForm.patchValue({
        name: String(context.name || '').trim(),
        description: String(context.description || ''),
        categoryId,
        taxProfileId,
      });

      if (categoryId) {
        this.onCategoryChange(categoryId);
      }

      if (fieldGroupId) {
        this.selectedFieldGroupIds.set([fieldGroupId]);
        this.hiddenGroupFieldKeys.set(new Set());
        this.selectionForm.patchValue({ fieldGroupId });

        const selectedGroup = this.fieldGroups().find((item) => item._id === fieldGroupId);
        if (selectedGroup) {
          const selectedKeys = new Set(Object.keys(context.fieldValues || {}));
          const byId = new Map(this.fields().map((item) => [item._id, item]));
          const hidden = new Set<string>();
          for (const fieldRef of selectedGroup.fields) {
            const resolved = byId.get(fieldRef.fieldId);
            if (!resolved || !this.isPricingField(resolved)) {
              continue;
            }
            const isRequired = typeof fieldRef.requiredOverride === 'boolean' ? fieldRef.requiredOverride : resolved.isRequired;
            if (!isRequired && !selectedKeys.has(resolved.key)) {
              hidden.add(resolved.key);
            }
          }
          this.hiddenGroupFieldKeys.set(hidden);
        }

        this.syncDynamicFields();
      }

      Object.entries(context.fieldValues || {}).forEach(([key, value]) => {
        const control = this.valuesForm.get(key) as FormControl<number | null> | null;
        if (control) {
          const parsed = Number(value);
          control.setValue(Number.isFinite(parsed) ? parsed : null);
        }
      });

      this.formulaForm.patchValue({
        sellingPrice: String(context.formula?.sellingPrice || '').trim(),
        anchorPrice: String(context.formula?.anchorPrice || '').trim(),
        actualPrice: String(context.formula?.actualPrice || '').trim(),
      });

      this.unitsForm.patchValue({ baseUnitId });
      this.allowedUnitIds.set(baseUnitId ? [baseUnitId] : []);

      this.currentStep.set(1);

      // Defer modal open with enough time for form initialization
      setTimeout(() => {
        this.wizardOpen.set(true);
        this.cdr.markForCheck();
      }, 50);

      setTimeout(() => this.descEditor?.setContent(String(context?.description || '')), 0);

      localStorage.removeItem(this.bulkRowEditContextStorageKey);
      void this.router.navigate([], {
        queryParams: { openBulkRowEdit: null },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    }

  openCreateWizard(): void {
    const remaining = this.groupCreateRemaining();
    if (remaining !== null && remaining <= 0) {
      const limit = this.groupCreateLimit();
      this.toast.error(`Group creation limit reached. You have used ${this.groupCreateUsed()} of ${limit} allowed groups.`);
      return;
    }

    this.resetWizard();
    // Defer modal open with enough time for form initialization
    setTimeout(() => {
      this.wizardOpen.set(true);
      this.cdr.markForCheck();
    }, 50);
  }

  openBulkUpload(): void {
    void this.router.navigate(['/product/groups/bulk-upload']);
  }

  downloadTemplate(): void {
    if (!this.canCreateGroup()) {
      this.toast.warning('You do not have permission to download the template.');
      return;
    }

    this.templateDownloading.set(true);
    this.bulkImportTemplateService.downloadTemplate().subscribe({
      next: (blob) => {
        const timestamp = new Date().toISOString().split('T')[0];
        this.bulkImportTemplateService.triggerFileDownload(blob, `groups-template-${timestamp}.xlsx`);
        this.toast.success('Template downloaded successfully.');
        this.templateDownloading.set(false);
      },
      error: (err) => {
        console.error('Failed to download template:', err);
        this.toast.error('Failed to download template. Please try again.');
        this.templateDownloading.set(false);
      },
    });
  }

  refreshTemplate(): void {
    if (!this.canCreateGroup()) {
      this.toast.warning('You do not have permission to refresh the template.');
      return;
    }

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.xlsx';
    fileInput.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) return;

      this.templateRefreshing.set(true);
      this.bulkImportTemplateService.refreshTemplate(file).subscribe({
        next: (response) => {
          this.templateRefreshing.set(false);
          // Store the refreshed file so user can download from the modal
          this.templateRefreshResult.set({
            file: response.file,
            filename: response.filename,
            rowCount: response.rowCount,
            newlyAdded: response.newlyAdded ?? {
              categories: [],
              units: [],
              taxProfiles: [],
              pricingTemplates: [],
              attributes: [],
            },
            masterData: response.masterData ?? {
              categories: [],
              units: [],
              taxProfiles: [],
              pricingTemplates: [],
              attributes: [],
            },
          });
          // Always open the result modal (shows success + any warnings)
          this.templateRefreshWarnings.set(
            (response.warnings ?? []).map(w => ({ rowNumber: w.rowNumber, message: w.message }))
          );
          this.showTemplateRefreshWarningsModal.set(true);
        },
        error: (err) => {
          console.error('Failed to refresh template:', err);
          const errorMessage = err.error?.message || 'Failed to refresh template. Please check that the file is a valid .xlsx template.';
          this.toast.error(errorMessage);
          this.templateRefreshing.set(false);
        },
      });
    };
    fileInput.click();
  }

  downloadRefreshedTemplate(): void {
    const result = this.templateRefreshResult();
    if (!result) return;
    this.bulkImportTemplateService.downloadRefreshedTemplate(result.file, result.filename);
  }

  private showTemplateRefreshWarningsPopup(warnings: any[]): void {
    const formattedWarnings = warnings.map((w) => ({
      rowNumber: w.rowNumber || w.row,
      message: w.message,
    }));
    
    this.templateRefreshWarnings.set(formattedWarnings);
    this.showTemplateRefreshWarningsModal.set(true);
  }

  closeTemplateRefreshWarningsModal(): void {
    this.showTemplateRefreshWarningsModal.set(false);
    this.templateRefreshWarnings.set([]);
    this.templateRefreshResult.set(null);
  }

  // ── Bulk Upload Excel methods ─────────────────────────────────────────────

  ngOnDestroy(): void {
    this.stopBulkUploadPoll();
  }

  private stopBulkUploadPoll(): void {
    if (this.bulkUploadPollTimer !== null) {
      clearInterval(this.bulkUploadPollTimer);
      this.bulkUploadPollTimer = null;
    }
  }

  private startBulkUploadPoll(jobId: string): void {
    this.stopBulkUploadPoll();
    const doPoll = () => {
      this.bulkImportTemplateService.getJobStatus(jobId).subscribe({
        next: (res) => {
          this.bulkUploadJobStatus.set(res.data);
          if (res.data.isTerminal) {
            this.stopBulkUploadPoll();
            this.loadBulkUploadResults(jobId);
            const failedRows = Number(res.data.totals.failedRows || 0);
            const variantWarnings = Number(res.data.totals.variantWarningRows || 0);
            if (failedRows > 0 && variantWarnings > 0) {
              this.toast.warning(
                `Upload complete — ${res.data.totals.successRows} groups created, ${failedRows} failed row(s), ${variantWarnings} group(s) have variant warnings.`
              );
            } else if (failedRows > 0) {
              this.toast.warning(`Upload complete with ${failedRows} failed row(s). Review and retry failed rows.`);
            } else if (variantWarnings > 0) {
              this.toast.warning(`Upload complete — ${res.data.totals.successRows} groups created. ${variantWarnings} group(s) have variant warnings to review.`);
            } else {
              this.toast.success(`Upload complete! ${res.data.totals.successRows} groups created.`);
            }
          }
        },
        error: () => this.stopBulkUploadPoll(),
      });
    };
    doPoll();
    this.bulkUploadPollTimer = setInterval(doPoll, 3000);
  }

  private loadBulkUploadResults(jobId: string, unresolvedOnly = false): void {
    this.bulkUploadResultsLoading.set(true);
    this.bulkImportTemplateService.getJobResults(jobId, unresolvedOnly ? 'unresolved' : 'all').subscribe({
      next: (res) => {
        this.bulkUploadResults.set(res.data);
        this.bulkVariantFailuresHidden.set(false);
        this.bulkUploadJobStatus.update((prev) => {
          const status = String(res.data?.job?.status || prev?.status || 'COMPLETED') as BulkUploadJobStatus['status'];
          return {
            jobId: String(res.data?.job?.jobId || prev?.jobId || jobId),
            status,
            isTerminal: Boolean(res.data?.job?.isTerminal),
            totals: res.data?.job?.totals || prev?.totals || {
              totalRows: 0,
              processedRows: 0,
              successRows: 0,
              failedRows: 0,
              unresolvedRows: 0,
            },
            startedAt: prev?.startedAt ?? null,
            completedAt: prev?.completedAt ?? null,
            errorMessage: prev?.errorMessage || '',
          };
        });
        this.bulkUploadResultsLoading.set(false);
      },
      error: () => this.bulkUploadResultsLoading.set(false),
    });
  }

  private restoreBulkUploadAttention(): void {
    this.bulkImportTemplateService.getAttentionJob().subscribe({
      next: (res) => {
        const attention = res.data;
        if (!attention?.hasAttention || !attention.job?.jobId) {
          return;
        }

        this.bulkUploadJobId.set(attention.job.jobId);
        this.bulkUploadJobStatus.set(attention.job);

        if (attention.reason === 'PROCESSING') {
          this.startBulkUploadPoll(attention.job.jobId);
          return;
        }

        this.loadBulkUploadResults(attention.job.jobId);
      },
      error: () => {
        // Keep page usable even if attention lookup fails.
      },
    });
  }

  uploadTemplate(): void {
    if (!this.canCreateGroup()) {
      this.toast.warning('You do not have permission to upload a template.');
      return;
    }

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.xlsx';
    fileInput.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) return;

      this.templateUploading.set(true);
      this.bulkUploadResults.set(null);
      this.bulkUploadJobStatus.set(null);
      this.bulkVariantFailuresHidden.set(false);

      this.bulkImportTemplateService.uploadTemplate(file).subscribe({
        next: (res) => {
          this.templateUploading.set(false);
          const jobId = res.data.jobId;
          this.bulkUploadJobId.set(jobId);
          this.toast.success('Upload accepted. Group creation is processing in the background.');
          this.startBulkUploadPoll(jobId);
        },
        error: (err) => {
          this.templateUploading.set(false);
          const msg = err?.error?.message || 'Failed to upload template. Please check the file and try again.';
          this.toast.error(msg);
        },
      });
    };
    fileInput.click();
  }

  openBulkUploadResultModal(): void {
    const jobId = this.bulkUploadJobId();
    if (!jobId) return;

    this.showBulkUploadResultModal.set(true);
    if (!this.bulkUploadResults()) {
      this.loadBulkUploadResults(jobId);
    }
  }

  closeBulkUploadResultModal(): void {
    this.showBulkUploadResultModal.set(false);
  }

  onBulkFailedRowAction(event: { actionKey: string; row: GomTableRow }): void {
    const rawRowId = event.row['rowId'];
    const rowId = typeof rawRowId === 'string' ? rawRowId : '';
    if (!rowId) {
      return;
    }

    const failedRow = (this.bulkUploadResults()?.failedRows || []).find((item) => item.rowId === rowId);
    if (!failedRow) {
      return;
    }

    if (event.actionKey === 'retry') {
      this.retryRow(failedRow);
      return;
    }

    if (event.actionKey === 'delete') {
      this.closeFailedRow(failedRow);
      return;
    }

    if (event.actionKey === 'edit') {
      if (failedRow.resultType === 'QUOTA_EXCEEDED') {
        this.toast.warning('Quota exceeded rows cannot be edited in this phase.');
        return;
      }
      this.openFailedRowQuickCreate(failedRow);
    }
  }

  private openFailedRowQuickCreate(row: BulkUploadFailedRow): void {
    this.bulkUploadPendingQuickCreateRow.set(row);

    // Avoid modal stacking: close upload results first, then open Quick Create.
    this.showBulkUploadResultModal.set(false);
    this.reopenBulkUploadResultsAfterQuickCreate.set(true);

    setTimeout(() => this.quickCreateModal?.openModal(), 50);

    const applyPrefill = () => {
      if (!this.quickCreateModal) {
        return;
      }

      const name = String(row.rawPayload?.['groupName'] || row.groupName || '').trim();
      const categoryName = String(row.rawPayload?.['category'] || '').trim().toLowerCase();
      const baseUnitName = String(row.rawPayload?.['baseUnit'] || '').trim().toLowerCase();
      const taxProfileName = String(row.rawPayload?.['taxProfile'] || '').trim().toLowerCase();
      const pricingTemplateName = String(row.rawPayload?.['pricingTemplate'] || '').trim().toLowerCase();
      const pricingRefreshMode = String(row.rawPayload?.['pricingRefreshMode'] || 'AUTO_REFRESH').trim().toUpperCase();

      const categoryId = this.categories().find((item) => item.name.trim().toLowerCase() === categoryName)?._id || '';
      const baseUnit = this.units().find((item) => item.name.trim().toLowerCase() === baseUnitName);
      const taxProfileId = this.taxProfiles().find((item) => item.name.trim().toLowerCase() === taxProfileName)?._id || '';

      const pricingTemplateId = this.quickCreateModal
        .pricingTemplates()
        .find((item) => String(item.label || '').trim().toLowerCase() === pricingTemplateName)?.value || '';

      const allowedUnits = String(row.rawPayload?.['allowedUnits'] || '')
        .split(',')
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean)
        .map((unitName) => this.units().find((unit) => unit.name.trim().toLowerCase() === unitName)?._id || '')
        .filter(Boolean);

      // Parse uploaded attribute columns and retain only valid values.
      const uploadedAttrPairs = Array.from({ length: 3 }, (_unused, idx) => {
        const i = idx + 1;
        const attrNameRaw = String(
          row.rawPayload?.[`attribute${i}`] ||
          row.rawPayload?.[`Attribute ${i}`] ||
          ''
        ).trim();
        const attrValuesRaw = String(
          row.rawPayload?.[`attribute${i}Values`] ||
          row.rawPayload?.[`Attribute ${i} Values`] ||
          ''
        ).trim();
        const uploadedValues = attrValuesRaw
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean);

        return {
          attrNameRaw,
          attrNameKey: attrNameRaw.toLowerCase(),
          uploadedValues,
        };
      }).filter((item) => item.attrNameRaw);

      const attributesData = this.quickCreateModal.attributesData();
      const selectedAttributeIds: string[] = [];
      const selectedAttributeValues: Record<string, string[]> = {};

      for (const pair of uploadedAttrPairs) {
        const matchedAttr = attributesData.find((attr) => {
          const nameKey = String(attr.name || '').trim().toLowerCase();
          const apiKey = String(attr.key || '').trim().toLowerCase();
          return nameKey === pair.attrNameKey || apiKey === pair.attrNameKey;
        });

        if (!matchedAttr?._id) {
          continue;
        }

        selectedAttributeIds.push(matchedAttr._id);

        const allowedValues = Array.isArray(matchedAttr.allowedValues)
          ? matchedAttr.allowedValues
          : [];
        const allowedByLower = new Map(
          allowedValues.map((value) => [String(value || '').trim().toLowerCase(), String(value || '').trim()])
        );

        const validUploadedValues: string[] = [];
        for (const uploadedValue of pair.uploadedValues) {
          const canonical = allowedByLower.get(uploadedValue.toLowerCase());
          if (canonical && !validUploadedValues.includes(canonical)) {
            validUploadedValues.push(canonical);
          }
        }

        // If no values were uploaded for a valid attribute, keep all allowed values selected.
        selectedAttributeValues[matchedAttr._id] = pair.uploadedValues.length > 0
          ? validUploadedValues
          : [...allowedValues];
      }

      const groupType = (row.inferredGroupType === 'ATTRIBUTE' || row.inferredGroupType === 'HYBRID' || row.inferredGroupType === 'MEASURED')
        ? row.inferredGroupType
        : 'MEASURED';

      this.quickCreateModal.quickCreateForm.patchValue({
        name,
        categoryId,
        groupType,
        attributeIds: [...new Set(selectedAttributeIds)],
        pricingTemplateId,
        baseUnitId: baseUnit?._id || '',
        allowedUnitIds: [...new Set([...(allowedUnits || []), ...(baseUnit?._id ? [baseUnit._id] : [])])],
        taxProfileId,
        pricingRefreshMode: pricingRefreshMode || 'AUTO_REFRESH',
      });

      this.quickCreateModal.selectedAttributeValues.set(selectedAttributeValues);

      // Pricing templates load async in quick-create; retry once if not available yet.
      if (!pricingTemplateId && pricingTemplateName) {
        setTimeout(() => {
          if (!this.quickCreateModal) {
            return;
          }
          const delayedPricingTemplateId = this.quickCreateModal
            .pricingTemplates()
            .find((item) => String(item.label || '').trim().toLowerCase() === pricingTemplateName)?.value || '';
          if (delayedPricingTemplateId) {
            this.quickCreateModal.quickCreateForm.patchValue({ pricingTemplateId: delayedPricingTemplateId });
          }

          // Retry attribute prefill once in case attributes loaded after modal opened.
          const delayedAttributesData = this.quickCreateModal.attributesData();
          if (delayedAttributesData.length > 0 && selectedAttributeIds.length === 0 && uploadedAttrPairs.length > 0) {
            const delayedAttributeIds: string[] = [];
            const delayedSelectedValues: Record<string, string[]> = {};

            for (const pair of uploadedAttrPairs) {
              const matchedAttr = delayedAttributesData.find((attr) => {
                const nameKey = String(attr.name || '').trim().toLowerCase();
                const apiKey = String(attr.key || '').trim().toLowerCase();
                return nameKey === pair.attrNameKey || apiKey === pair.attrNameKey;
              });
              if (!matchedAttr?._id) {
                continue;
              }

              delayedAttributeIds.push(matchedAttr._id);
              const allowedValues = Array.isArray(matchedAttr.allowedValues) ? matchedAttr.allowedValues : [];
              const allowedByLower = new Map(
                allowedValues.map((value) => [String(value || '').trim().toLowerCase(), String(value || '').trim()])
              );

              const validUploadedValues: string[] = [];
              for (const uploadedValue of pair.uploadedValues) {
                const canonical = allowedByLower.get(uploadedValue.toLowerCase());
                if (canonical && !validUploadedValues.includes(canonical)) {
                  validUploadedValues.push(canonical);
                }
              }

              delayedSelectedValues[matchedAttr._id] = pair.uploadedValues.length > 0
                ? validUploadedValues
                : [...allowedValues];
            }

            if (delayedAttributeIds.length > 0) {
              this.quickCreateModal.quickCreateForm.patchValue({ attributeIds: [...new Set(delayedAttributeIds)] });
              this.quickCreateModal.selectedAttributeValues.set(delayedSelectedValues);
            }
          }
        }, 500);
      }
    };

    setTimeout(applyPrefill, 150);
  }

  private closeFailedRow(row: BulkUploadFailedRow): void {
    this.bulkUploadRowToDelete.set(row);
    this.bulkUploadDeleteConfirmOpen.set(true);
  }

  openDeleteRowConfirm(): void {
    // Confirmation modal will open via signal
  }

  cancelDeleteRowConfirm(): void {
    this.bulkUploadDeleteConfirmOpen.set(false);
    this.bulkUploadRowToDelete.set(null);
  }

  confirmDeleteRow(): void {
    const row = this.bulkUploadRowToDelete();
    const jobId = this.bulkUploadJobId();
    if (!row || !jobId) {
      this.bulkUploadDeleteConfirmOpen.set(false);
      return;
    }

    this.bulkUploadRetryingRowId.set(row.rowId);
    this.bulkUploadDeleteConfirmOpen.set(false);
    
    this.bulkImportTemplateService.closeRow(jobId, row.rowId).subscribe({
      next: () => {
        this.bulkUploadRetryingRowId.set(null);
        this.bulkUploadRowToDelete.set(null);
        this.toast.success(`Row ${row.rowNumber} removed from failed list.`);
        this.loadBulkUploadResults(jobId);
      },
      error: (err) => {
        this.bulkUploadRetryingRowId.set(null);
        this.bulkUploadRowToDelete.set(null);
        this.toast.error(err?.error?.message || 'Failed to remove row from failed list.');
      },
    });
  }

  private resolveFailedRowErrorFields(row: BulkUploadFailedRow): string[] {
    const fields = new Set<string>();
    for (const reason of row.reasons || []) {
      const mapped = this.bulkFailedErrorFieldMap[String(reason.code || '').trim()] || [];
      mapped.forEach((item) => fields.add(item));
    }

    if (fields.size === 0) {
      fields.add('resultType');
    }

    return [...fields];
  }

  private parseErrorMessage(message: string): string {
    if (!message) return '-';

    // E11000 duplicate key error: extract the field names from the index
    const dupKeyMatch = message.match(/E11000.*index: ([\w_]+)/);
    if (dupKeyMatch && dupKeyMatch[1]) {
      // Split index name by underscore, remove trailing version numbers, filter out tenantId
      const fields = dupKeyMatch[1]
        .split('_')
        .filter((part, i, arr) => 
          !/^\d+$/.test(part) && 
          part.toLowerCase() !== 'tenantid' &&
          (i === arr.length - 1 || !/^\d+$/.test(arr[i + 1]))
        )
        .map((field) => field.charAt(0).toUpperCase() + field.slice(1))
        .join(', ');
      
      return fields ? `Duplicate: ${fields}` : 'Duplicate entry';
    }

    // Validation error: take first 80 characters
    const lines = message.split('\n')[0];
    return lines.length > 80 ? lines.substring(0, 80) + '...' : lines;
  }

  openBulkUploadAcknowledgeConfirm(): void {
    const jobId = this.bulkUploadJobId();
    if (!jobId || this.bulkJobUnresolvedCount() <= 0) {
      this.closeBulkUploadResultModal();
      return;
    }

    this.bulkUploadAcknowledgeConfirmOpen.set(true);
  }

  cancelBulkUploadAcknowledgeConfirm(): void {
    this.bulkUploadAcknowledgeConfirmOpen.set(false);
  }

  confirmBulkUploadAcknowledgement(): void {
    const jobId = this.bulkUploadJobId();
    if (!jobId || this.bulkJobUnresolvedCount() <= 0) {
      this.bulkUploadAcknowledgeConfirmOpen.set(false);
      this.closeBulkUploadResultModal();
      return;
    }

    this.bulkUploadAcknowledgeConfirmOpen.set(false);

    this.bulkUploadResultsLoading.set(true);
    this.bulkImportTemplateService.suspendUnresolved(jobId).subscribe({
      next: (res) => {
        this.bulkUploadJobStatus.update((prev) => {
          if (!prev) {
            return prev;
          }
          return {
            ...prev,
            totals: res.data?.totals || prev.totals,
          };
        });
        this.bulkUploadResultsLoading.set(false);
        this.showBulkUploadResultModal.set(false);
        this.loadBulkUploadResults(jobId);
        this.toast.success('Unresolved upload errors were marked as accepted for now.');
      },
      error: (err) => {
        this.bulkUploadResultsLoading.set(false);
        this.toast.error(err?.error?.message || 'Failed to mark unresolved errors as accepted.');
      },
    });
  }

  openRowCorrection(row: BulkUploadFailedRow): void {
    if (row.resultType === 'QUOTA_EXCEEDED') return;
    this.bulkUploadEditRow.set(row);
    const currentName = row.rawPayload?.['groupName'] ?? row.groupName ?? '';
    this.bulkUploadEditGroupName.set(currentName);
    this.bulkUploadEditGroupNameControl.setValue(currentName);
  }

  cancelRowCorrection(): void {
    this.bulkUploadEditRow.set(null);
    this.bulkUploadEditGroupName.set('');
    this.bulkUploadEditGroupNameControl.setValue('');
  }

  retryRow(row: BulkUploadFailedRow): void {
    const jobId = this.bulkUploadJobId();
    if (!jobId) return;

    const patch: Record<string, string> = {};
    if (row.resultType === 'DUPLICATE') {
      patch['groupName'] = this.bulkUploadEditGroupNameControl.value.trim();
    }

    this.bulkUploadRetryingRowId.set(row.rowId);
    this.bulkImportTemplateService.retryRow(jobId, row.rowId, patch).subscribe({
      next: (res) => {
        this.bulkUploadRetryingRowId.set(null);
        this.cancelRowCorrection();
        if (res.data.resolved) {
          this.toast.success(`Row ${row.rowNumber} retried successfully.`);
        } else {
          this.toast.warning(`Row ${row.rowNumber} still has errors after retry.`);
        }
        this.loadBulkUploadResults(jobId);
      },
      error: (err) => {
        this.bulkUploadRetryingRowId.set(null);
        this.toast.error(err?.error?.message || 'Retry failed. Please try again.');
      },
    });
  }

  private refreshGroupList(onSuccess?: () => void, onError?: () => void): void {
    const pageIndex = this.groupTablePageIndex();
    const pageSize = this.groupTablePageSize();
    const limit = this.tableDataMode() === 'server' ? pageSize : Math.max(this.totalGroups(), pageSize);
    const page = this.tableDataMode() === 'server' ? pageIndex + 1 : 1;

    this.groupsService.listGroups({ page, limit }).subscribe({
      next: (res) => {
        this.totalGroups.set(res.pagination.total);
        this.canLoadAllGroups.set(res.pagination.canLoadAll);
        this.groups.set(res.data ?? []);
        onSuccess?.();
      },
      error: () => onError?.(),
    });
  }

  loadAllGroups(): void {
    this.loading.set(true);
    this.groupsService.listGroups({ page: 1, limit: this.totalGroups() }).subscribe({
      next: (res) => {
        this.groups.set(res.data ?? []);
        this.totalGroups.set(res.pagination.total);
        this.canLoadAllGroups.set(false);
        this.allGroupsLoaded.set(true);
        this.groupTablePageIndex.set(0);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  closeWizard(): void {
    this.wizardOpen.set(false);
    this.completionMode.set(false);
    this.completionStatus.set(null);
    this.closeVariantReview();
  }

  onRowAction(event: { actionKey: string; row: GomTableRow }): void {
    const groupId = typeof event.row['_id'] === 'string' ? event.row['_id'] : '';
    const existing = this.groups().find((item) => item._id === groupId);
    if (!existing) {
      return;
    }

    if (event.actionKey === 'add-stock') {
      if (!this.canCreateStock()) {
        return;
      }
      void this.router.navigate(['/product/stock'], {
        queryParams: {
          groupId: existing._id,
          openAdd: '1',
        },
      });
      return;
    }

    if (event.actionKey === 'add-variant') {
      if (!this.canCreateVariant()) {
        return;
      }
      void this.router.navigate(['/product/variants'], {
        queryParams: {
          groupId: existing._id,
        },
      });
      return;
    }

    if (event.actionKey === 'collections') {
      if (!this.canManageProductCollections()) {
        return;
      }
      this.openGroupCollections(existing);
      return;
    }

    if (event.actionKey === 'delete') {
      if (!this.canDeleteGroup()) {
        this.toast.warning('No permission to delete groups.');
        return;
      }

      this.saving.set(true);
      
      // First check if group has variants
      this.variantsService.listVariants(existing._id, undefined, 1).subscribe({
        next: (variantsResponse: ApiPaginated<Variant>) => {
          const variantCount = variantsResponse.pagination.total;
          
          if (variantCount > 0) {
            this.toast.error(
              `Cannot delete "${existing.name}": it has ${variantCount} variant(s). ` +
              `Please delete all variants first.`
            );
            this.saving.set(false);
            return;
          }
          
          // No variants, proceed with collection impact check
          this.proceedWithGroupDeletion(existing);
        },
        error: () => {
          this.toast.error('Failed to check group variants.');
          this.saving.set(false);
        },
      });

      return;
    }

    if (event.actionKey !== 'edit') {
      if (event.actionKey !== 'clone') {
        return;
      }

      this.quickCreateModal?.openForClone(existing);
      return;
    }

    void this.router.navigate([], {
      queryParams: {
        quickEdit: '1',
        quickEditGroupId: existing._id,
        openCompletion: null,
        completeGroupId: null,
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });

    this.quickCreateModal?.openForEdit(existing);
  }

  onQuickCreateSaved(): void {
    this.refreshGroupList();

    const pendingRow = this.bulkUploadPendingQuickCreateRow();
    const jobId = this.bulkUploadJobId();
    if (pendingRow && jobId) {
      this.bulkImportTemplateService.closeRow(jobId, pendingRow.rowId, { markSuccess: true }).subscribe({
        next: () => {
          this.toast.success(`Row ${pendingRow.rowNumber} resolved from failed list.`);
          this.bulkUploadPendingQuickCreateRow.set(null);
          this.loadBulkUploadResults(jobId);
        },
        error: () => {
          this.bulkUploadPendingQuickCreateRow.set(null);
          this.loadBulkUploadResults(jobId);
        },
      });
    }
  }

  onQuickCreateClosed(): void {
    const shouldReopenBulkResults = this.reopenBulkUploadResultsAfterQuickCreate();

    this.bulkUploadPendingQuickCreateRow.set(null);
    this.reopenBulkUploadResultsAfterQuickCreate.set(false);
    this.pendingQuickEditGroupId = null;
    this.completionMode.set(false);
    this.editingGroupId.set(null);
    void this.router.navigate([], {
      queryParams: {
        quickEdit: null,
        quickEditGroupId: null,
        openCompletion: null,
        completeGroupId: null,
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });

    if (shouldReopenBulkResults) {
      this.showBulkUploadResultModal.set(true);
      const jobId = this.bulkUploadJobId();
      if (jobId) {
        this.loadBulkUploadResults(jobId);
      }
    }
  }

  private proceedWithGroupDeletion(existing: Group): void {
    this.productCollectionsService.listCollectionsByGroup(existing._id).subscribe({
      next: (response) => {
        const impactCount = (response.data || []).length;
        const warning = impactCount > 0
          ? `Delete "${existing.name}"? It is used in ${impactCount} collections and will be unmapped from all of them.`
          : `Delete "${existing.name}"?`;

        const confirmed = window.confirm(warning);
        if (!confirmed) {
          this.saving.set(false);
          return;
        }

        this.groupsService.deleteGroup(existing._id).subscribe({
          next: (deleteResponse) => {
            const unmapped = Number(deleteResponse.data?.unmappedFromCollections || 0);
            if (unmapped > 0) {
              this.toast.success(`"${existing.name}" deleted. Unmapped from ${unmapped} collections.`);
            } else {
              this.toast.success(`"${existing.name}" deleted successfully.`);
            }
            this.refreshGroupList(() => this.saving.set(false), () => this.saving.set(false));
          },
          error: (error) => {
            this.toast.error(this.getErrorMessage(error, 'Failed to delete group.'));
            this.saving.set(false);
          },
          complete: () => this.saving.set(false),
        });
      },
      error: () => {
        // Fall back to basic confirmation if impact lookup fails.
        const confirmed = window.confirm(`Delete "${existing.name}"?`);
        if (!confirmed) {
          this.saving.set(false);
          return;
        }

        this.groupsService.deleteGroup(existing._id).subscribe({
          next: () => {
            this.toast.success(`"${existing.name}" deleted successfully.`);
            this.refreshGroupList(() => this.saving.set(false), () => this.saving.set(false));
          },
          error: (err) => {
            this.toast.error(this.getErrorMessage(err, 'Failed to delete group.'));
            this.saving.set(false);
          },
          complete: () => this.saving.set(false),
        });
      },
    });
  }

  private openQuickCreateEditById(groupId: string): void {
    const existing = this.groups().find((item) => item._id === groupId);
    if (existing) {
      this.quickCreateModal?.openForEdit(existing);
      return;
    }

    this.groupsService.getGroupById(groupId).subscribe({
      next: (response) => {
        if (response?.data) {
          this.quickCreateModal?.openForEdit(response.data);
        }
      },
      error: () => {
        this.toast.error('Unable to open quick edit for this group.');
      },
    });
  }

  private openEditWizard(existing: Group, completionMode = false): void {
    this.resetWizard();
    this.completionMode.set(completionMode);
    this.editingGroupId.set(existing._id);
    this.loadCompletionStatus(existing._id);

    this.basicForm.patchValue({
      name: existing.name,
      description: existing.description || '',
      groupType: existing.groupType || 'MEASURED',
      createDefaultVariant: false,
      categoryId: existing.categoryId,
      taxProfileId: existing.taxProfileId || '',
      pricingRefreshMode: existing.pricingRefreshMode || 'AUTO_REFRESH',
    });
    this.syncOptionAxesFromExisting(existing);
    this.editingQuantity.set(existing.quantity || 1);

    this.selectedFieldGroupIds.set([existing.fieldGroupId]);
    this.selectionForm.patchValue({ fieldGroupId: existing.fieldGroupId });

    const selectedGroup = this.fieldGroups().find((item) => item._id === existing.fieldGroupId);
    const baseIds = new Set((selectedGroup?.fields ?? []).map((item) => item.fieldId));
    this.hiddenGroupFieldKeys.set(new Set(existing.excludedFieldKeys ?? []));

    const extraIds = existing.resolvedFields
      .filter((item) => !baseIds.has(item.fieldId))
      .map((item) => item.fieldId);

    this.selectedExtraFieldIds.set(extraIds);
    this.syncDynamicFields(existing);

    this.formulaForm.patchValue({
      sellingPrice: existing.formula.sellingPrice,
      anchorPrice: existing.formula.anchorPrice,
      actualPrice: existing.formula.actualPrice || existing.formula.sellingPrice,
    });

    this.unitsForm.patchValue({ baseUnitId: existing.baseUnitId });
    const allowedUnits = new Set([...(existing.allowedUnitIds || [])]);
    if (existing.baseUnitId) {
      allowedUnits.add(existing.baseUnitId);
    }
    this.allowedUnitIds.set([...allowedUnits]);

    this.currentStep.set(1);
    this.loadGroupImages(existing._id);

    // Defer modal open with enough time for form initialization
    setTimeout(() => {
      this.wizardOpen.set(true);
      this.cdr.markForCheck();
    }, 50);

    // Set editor content after wizard opens (need a tick for ViewChild to resolve)
    setTimeout(() => this.descEditor?.setContent(existing.description || ''), 0);
  }

  private loadCompletionStatus(groupId: string): void {
    this.completionLoading.set(true);
    this.groupsService.getGroupCompletionStatus(groupId).subscribe({
      next: (response) => {
        this.completionStatus.set(response.data);
        this.completionLoading.set(false);
      },
      error: () => {
        this.completionStatus.set(null);
        this.completionLoading.set(false);
      },
    });
  }

  getCompletionItemTitle(item: CompletionChecklistItem): string {
    if (item === 'fieldValues') return 'Field Values';
    if (item === 'variants') return 'Variants';
    if (item === 'media') return 'Media';
    return 'Advanced Settings';
  }

  getCompletionActionLabel(item: CompletionChecklistItem): string {
    if (item === 'fieldValues') return 'Save Values';
    if (item === 'variants') return 'Review & Generate';
    if (item === 'media') return 'Open Media Tab';
    return 'Save Advanced';
  }

  isCompletionActionRunning(item: CompletionChecklistItem): boolean {
    return this.completionActionItem() === item;
  }

  openCompletionStep(item: CompletionChecklistItem): void {
    if (item === 'fieldValues') {
      this.currentStep.set(3);
      return;
    }

    if (item === 'variants') {
      const editId = this.editingGroupId();
      if (!editId) {
        return;
      }

      void this.router.navigate(['/product/variants'], {
        queryParams: {
          groupId: editId,
        },
      });
      return;
    }

    if (item === 'media') {
      this.currentStep.set(6);
      return;
    }

    this.currentStep.set(4);
  }

  runCompletionItem(item: CompletionChecklistItem): void {
    const editId = this.editingGroupId();
    if (!editId) {
      return;
    }

    if (item === 'media') {
      this.currentStep.set(6);
      this.openPicker();
      return;
    }

    if (item === 'fieldValues') {
      if (!this.isStepValid(3)) {
        this.currentStep.set(3);
        this.touchStep(3);
        this.toast.warning('Please complete required Field Values before saving.');
        return;
      }

      const values = this.valuesForm.getRawValue() as Record<string, number | null>;
      const fieldValues = this.wizardFields().map((field) => ({
        fieldId: field.fieldId,
        value: Number(values[field.key]),
      }));

      this.completionActionItem.set(item);
      this.groupsService.updateGroupFieldValues(editId, {
        fieldValues,
        excludedFieldKeys: [...this.hiddenGroupFieldKeys()],
      }).subscribe({
        next: () => this.updateCompletionChecklistItem(editId, item, 'Field values saved and checklist updated.'),
        error: () => {
          this.completionActionItem.set(null);
          this.toast.error('Failed to save field values.');
        },
      });
      return;
    }

    if (item === 'variants') {
      this.openVariantReview();
      return;
    }

    const invalidAdvancedStep = [4, 5].find((step) => !this.isStepValid(step));
    if (invalidAdvancedStep) {
      this.currentStep.set(invalidAdvancedStep);
      this.touchStep(invalidAdvancedStep);
      this.toast.warning('Please complete required Price Rule and Units fields before saving advanced settings.');
      return;
    }

    const baseUnitId = String(this.unitsForm.controls.baseUnitId.value || '');
    const allowedUnitIds = new Set(this.allowedUnitIds());
    if (baseUnitId) {
      allowedUnitIds.add(baseUnitId);
    }

    const optionAxes = (this.basicForm.controls.groupType.value === 'ATTRIBUTE' || this.basicForm.controls.groupType.value === 'HYBRID')
      ? this.optionAxesForm.controls.map((control) => ({
          key: (control.controls.key.value || '').trim(),
          label: (control.controls.label.value || '').trim(),
          values: this.getOptionAxisValuesArray(control.controls.values.value || ''),
        })).filter((axis) => axis.key && axis.values.length > 0)
      : [];

    this.completionActionItem.set(item);
    forkJoin({
      pricing: this.groupsService.updateAdvancedPricing(editId, {
        actualPrice: String(this.formulaForm.controls.actualPrice.value || '').trim(),
        sellingPrice: String(this.formulaForm.controls.sellingPrice.value || '').trim(),
        anchorPrice: String(this.formulaForm.controls.anchorPrice.value || '').trim(),
      }),
      units: this.groupsService.updateGroupUnits(editId, {
        baseUnitId,
        allowedUnitIds: [...allowedUnitIds],
      }),
      mappings: this.groupsService.updateGroupMappings(editId, {
        fieldGroupId: String(this.selectionForm.controls.fieldGroupId.value || ''),
      }),
      advanced: this.groupsService.updateGroupAdvancedSettings(editId, {
        taxProfileId: String(this.basicForm.controls.taxProfileId.value || '').trim() || null,
        pricingRefreshMode: this.basicForm.controls.pricingRefreshMode.value || 'AUTO_REFRESH',
        groupType: this.basicForm.controls.groupType.value || 'MEASURED',
        optionAxes,
      }),
    }).subscribe({
      next: () => this.updateCompletionChecklistItem(editId, item, 'Advanced settings saved and checklist updated.'),
      error: () => {
        this.completionActionItem.set(null);
        this.toast.error('Failed to save advanced settings.');
      },
    });
  }

  markCompletionItem(item: CompletionChecklistItem): void {
    const editId = this.editingGroupId();
    if (!editId) {
      return;
    }

    this.updateCompletionChecklistItem(editId, item, 'Checklist updated.');
  }

  private updateCompletionChecklistItem(
    groupId: string,
    item: CompletionChecklistItem,
    successMessage: string,
  ): void {
    this.groupsService.updateGroupCompletionChecklist(groupId, { [item]: true }).subscribe({
      next: () => {
        this.loadCompletionStatus(groupId);
        this.completionActionItem.set(null);
        this.toast.success(successMessage);
      },
      error: () => {
        this.completionActionItem.set(null);
        this.toast.error('Failed to update checklist.');
      },
    });
  }

  completeGroupSetup(): void {
    const editId = this.editingGroupId();
    if (!editId) {
      return;
    }

    this.groupsService.markGroupComplete(editId).subscribe({
      next: () => {
        this.loadCompletionStatus(editId);
        this.completionMode.set(false);
        this.toast.success('Group setup completed.');
        void this.router.navigate([], {
          queryParams: { completeGroupId: null, openCompletion: null },
          queryParamsHandling: 'merge',
          replaceUrl: true,
        });
      },
      error: () => this.toast.error('Failed to complete group setup.'),
    });
  }

  openVariantReview(): void {
    const editId = this.editingGroupId();
    if (!editId) {
      return;
    }

    this.variantReviewOpen.set(true);
    this.variantReviewLoading.set(true);
    this.variantDisabledKeys.set([]);

    this.groupsService.previewAutoGenerateVariants({ groupId: editId }).subscribe({
      next: (response) => {
        this.variantPreview.set(response.data);
        this.variantReviewLoading.set(false);
      },
      error: () => {
        this.variantPreview.set(null);
        this.variantReviewLoading.set(false);
        this.toast.error('Failed to load variant combinations preview.');
      },
    });
  }

  closeVariantReview(): void {
    this.variantReviewOpen.set(false);
    this.variantReviewLoading.set(false);
    this.variantGenerating.set(false);
    this.variantPreview.set(null);
    this.variantDisabledKeys.set([]);
  }

  isVariantCombinationSelected(combinationKey: string, exists: boolean): boolean {
    if (exists) {
      return false;
    }

    return !this.variantDisabledKeys().includes(combinationKey);
  }

  toggleVariantCombination(combinationKey: string, exists: boolean, checked: boolean): void {
    if (exists) {
      return;
    }

    const disabled = new Set(this.variantDisabledKeys());
    if (checked) {
      disabled.delete(combinationKey);
    } else {
      disabled.add(combinationKey);
    }

    this.variantDisabledKeys.set([...disabled]);
  }

  selectedVariantCombinationCount(): number {
    const preview = this.variantPreview();
    if (!preview) {
      return 0;
    }

    const disabledSet = new Set(this.variantDisabledKeys());
    return preview.items.filter((item) => !item.exists && !disabledSet.has(item.combinationKey)).length;
  }

  getVariantOptionText(item: { optionSelections: Array<{ value: string }> }): string {
    return item.optionSelections.map((option) => option.value).join(' / ');
  }

  createVariantsFromReview(): void {
    const editId = this.editingGroupId();
    if (!editId) {
      return;
    }

    const selectedCount = this.selectedVariantCombinationCount();
    if (selectedCount <= 0) {
      this.toast.warning('Select at least one new combination to generate variants.');
      return;
    }

    this.variantGenerating.set(true);
    this.groupsService.createAutoGenerateVariants({
      groupId: editId,
      disabledCombinationKeys: [...this.variantDisabledKeys()],
    }).subscribe({
      next: (response) => {
        const data = response.data;
        this.variantGenerating.set(false);
        this.updateCompletionChecklistItem(
          editId,
          'variants',
          `Generated ${data.createdCount} variants (${data.skippedCount} skipped).`,
        );
        this.closeVariantReview();
      },
      error: () => {
        this.variantGenerating.set(false);
        this.toast.error('Failed to generate variants from selected combinations.');
      },
    });
  }

  openVariantsModuleFromReview(): void {
    const editId = this.editingGroupId();
    if (!editId) {
      return;
    }

    this.closeVariantReview();
    void this.router.navigate(['/product/variants'], {
      queryParams: {
        groupId: editId,
      },
    });
  }

  onDescriptionChanged(html: string): void {
    this.basicForm.controls.description.setValue(html);
  }

  onFieldGroupSelectionChange(ids: string[]): void {
    const cleaned = [...new Set(ids.map((id) => String(id || '').trim()).filter((id) => !!id))];
    this.selectedFieldGroupIds.set(cleaned);
    this.hiddenGroupFieldKeys.set(new Set());
    this.selectionForm.patchValue({ fieldGroupId: cleaned[0] || '' });

    this.selectedExtraFieldIds.set([]);
    this.syncDynamicFields();
  }

  onCategoryChange(categoryId: string): void {
    const selectedFieldGroupId = this.selectionForm.controls.fieldGroupId.value || '';
    const allowedFieldGroups = this.getFieldGroupsForCategory(categoryId)
      .filter((item) => item.status === 'ACTIVE');
    const allowedFieldGroupIds = new Set(allowedFieldGroups.map((item) => item._id));

    const filteredSelectedIds = this.selectedFieldGroupIds().filter((id) => allowedFieldGroupIds.has(id));
    if (filteredSelectedIds.length !== this.selectedFieldGroupIds().length) {
      this.selectedFieldGroupIds.set(filteredSelectedIds);
      this.hiddenGroupFieldKeys.set(new Set());
      this.selectionForm.patchValue({ fieldGroupId: filteredSelectedIds[0] || '' });
      this.selectedExtraFieldIds.set([]);
      this.syncDynamicFields();
    }

    if (selectedFieldGroupId && !allowedFieldGroups.some((item) => item._id === selectedFieldGroupId)) {
      this.selectionForm.patchValue({ fieldGroupId: '' });
      this.selectedFieldGroupIds.set([]);
      this.hiddenGroupFieldKeys.set(new Set());
      this.selectedExtraFieldIds.set([]);
      this.syncDynamicFields();
    }

    if (!this.selectionForm.controls.fieldGroupId.value && allowedFieldGroups.length === 1) {
      this.onFieldGroupSelectionChange([allowedFieldGroups[0]._id]);
    }

    const allowedUnits = this.getUnitsForCategory(categoryId)
      .filter((item) => item.status === 'ACTIVE')
      .map((item) => item._id);
    const allowedUnitSet = new Set(allowedUnits);

    const currentBaseUnit = this.unitsForm.controls.baseUnitId.value || '';
    if (currentBaseUnit && !allowedUnitSet.has(currentBaseUnit)) {
      this.unitsForm.patchValue({ baseUnitId: '' });
    }

    const filteredAllowedUnits = this.allowedUnitIds().filter((id) => allowedUnitSet.has(id));
    if (filteredAllowedUnits.length !== this.allowedUnitIds().length) {
      this.allowedUnitIds.set(filteredAllowedUnits);
    }
  }

  toggleExtraField(fieldId: string, checked: boolean): void {
    const current = new Set(this.selectedExtraFieldIds());
    if (checked) {
      current.add(fieldId);
    } else {
      current.delete(fieldId);
    }
    this.selectedExtraFieldIds.set([...current]);
    this.syncDynamicFields();
  }

  isGroupFieldSelected(fieldKey: string): boolean {
    return !this.hiddenGroupFieldKeys().has(String(fieldKey || '').trim());
  }

  toggleGroupFieldSelection(fieldKey: string, checked: boolean): void {
    const normalized = String(fieldKey || '').trim();
    if (!normalized) {
      return;
    }

    const field = this.groupFields().find((item) => item.key === normalized);
    if (!field || field.isRequired) {
      return;
    }

    const hidden = new Set(this.hiddenGroupFieldKeys());
    if (checked) {
      hidden.delete(normalized);
    } else {
      hidden.add(normalized);
    }
    this.hiddenGroupFieldKeys.set(hidden);

    const visibleNumericKeys = new Set(
      this.visibleGroupFields()
        .filter((item) => item.type === 'NUMBER')
        .map((item) => item.key)
    );

    if (!visibleNumericKeys.has(this.simpleBaseCostKey())) {
      const fallback = this.visibleGroupFields().find((item) => item.type === 'NUMBER')?.key || '';
      this.simpleBaseCostKey.set(fallback);
    }

    this.simpleActualExtraKeys.update((keys) =>
      keys.filter((key) => visibleNumericKeys.has(key) && key !== this.simpleBaseCostKey())
    );

    this.syncDynamicFields();
    const control = this.groupFieldToggleControls.get(normalized);
    if (control && control.value !== checked) {
      control.setValue(checked, { emitEvent: false });
    }
  }

  getGroupFieldToggleControl(field: GroupWizardField): FormControl<boolean> {
    const key = String(field.key || '').trim();
    let control = this.groupFieldToggleControls.get(key);
    if (!control) {
      control = new FormControl<boolean>(this.isGroupFieldSelected(key), { nonNullable: true });
      this.groupFieldToggleControls.set(key, control);
    }

    const shouldBeChecked = this.isGroupFieldSelected(key);
    if (control.value !== shouldBeChecked) {
      control.setValue(shouldBeChecked, { emitEvent: false });
    }

    if (field.isRequired) {
      control.disable({ emitEvent: false });
    } else {
      control.enable({ emitEvent: false });
    }

    return control;
  }

  toggleAllowedUnit(unitId: string, checked: boolean): void {
    const current = new Set(this.allowedUnitIds());
    if (checked) {
      current.add(unitId);
    } else {
      current.delete(unitId);
    }
    this.allowedUnitIds.set([...current]);
  }

  onBaseUnitChange(unitId: string): void {
    const current = new Set(this.allowedUnitIds());
    if (unitId) {
      current.add(unitId);
    }
    this.allowedUnitIds.set([...current]);
  }

  isAllowedUnitSelected(unitId: string): boolean {
    return this.allowedUnitIds().includes(unitId);
  }

  // --- Option Axes Management ---
  addOptionAxis(): void {
    const axisGroup = this.fb.group({
      key: this.fb.control('', { validators: [Validators.required, Validators.pattern(/^[a-zA-Z_]\w*$/)], nonNullable: true }),
      label: this.fb.control('', { validators: [Validators.required], nonNullable: true }),
      values: this.fb.control('', { validators: [Validators.required], nonNullable: true }),
    });
    this.optionAxesForm.push(axisGroup);
  }

  removeOptionAxis(index: number): void {
    this.optionAxesForm.removeAt(index);
  }

  getOptionAxisControl(index: number, field: 'key' | 'label' | 'values'): FormControl<string> {
    const group = this.optionAxesForm.at(index);
    if (!group) {
      return new FormControl<string>('', { nonNullable: true });
    }
    const control = group.get(field);
    if (!control) {
      return new FormControl<string>('', { nonNullable: true });
    }
    return control as FormControl<string>;
  }

  getOptionAxisValuesArray(valuesString: string): string[] {
    return valuesString
      .split(',')
      .map(v => v.trim())
      .filter(v => v.length > 0);
  }

  getValueControl(key: string): FormControl<number | null> {
    let control = this.valuesForm.get(key) as FormControl<number | null> | null;
    if (!control) {
      // Create control on-the-fly if it doesn't exist yet
      control = new FormControl<number | null>(null);
      this.valuesForm.addControl(key, control);
    }
    return control;
  }

  getFieldHint(field: GroupWizardField): string {
    if (field.type === 'PERCENTAGE') {
      const numberFields = this.wizardFields().filter((item) => item.type === 'NUMBER' && item.key !== field.key);
      if (!numberFields.length) {
        return 'Enter percentage value (without % sign).';
      }

      const percentage = Number(this.getValueControl(field.key).value);
      if (!Number.isFinite(percentage)) {
        return 'Enter percentage value (without % sign).';
      }

      const preferredBase = numberFields.find((item) => ['buyPrice', 'buy_price', 'basePrice', 'costPrice'].includes(item.key));
      const baseField = preferredBase || numberFields[0];
      const baseValue = Number(this.getValueControl(baseField.key).value);
      if (!Number.isFinite(baseValue)) {
        return 'Enter percentage value (without % sign).';
      }

      const calculated = (baseValue * percentage) / 100;
      return `Enter percentage value (without % sign). Example amount = ${calculated.toFixed(2)}`;
    }

    return field.valueFormat === 'CURRENCY'
      ? 'Amount in ₹ (INR). Example: 49.99'
      : 'Enter numeric value.';
  }

  getFieldPlaceholder(field: GroupWizardField): string {
    if (field.type === 'PERCENTAGE') {
      return `Enter ${field.name} (%)`;
    }

    if (field.valueFormat === 'CURRENCY') {
      return `Enter ${field.name} (₹)`;
    }

    return `Enter ${field.name}`;
  }

  getSellingFormulaHint(): string {
    const preview = this.formulaPreview();
    if (preview.error || preview.sellingPrice === null) {
      return '';
    }

    return `Calculated selling price: ${preview.sellingPrice}`;
  }

  getAnchorFormulaHint(): string {
    const preview = this.formulaPreview();
    if (preview.error || preview.anchorPrice === null) {
      return '';
    }

    return `Calculated anchor price: ${preview.anchorPrice}`;
  }

  getActualFormulaHint(): string {
    const preview = this.formulaPreview();
    if (preview.error || preview.actualPrice === null) {
      return '';
    }

    return `Calculated actual price: ${preview.actualPrice}`;
  }

  setFormulaTarget(target: FormulaTarget): void {
    this.formulaTarget.set(target);
  }

  insertToken(token: string): void {
    const target = this.formulaTarget();
    this.insertTokenFor(target, token);
  }

  insertTokenFor(target: FormulaTarget, token: string): void {
    const control = this.formulaForm.controls[target];
    const current = control.value || '';
    const next = current.trim().length ? `${current} ${token}` : token;
    control.setValue(next);
    control.markAsDirty();
    control.markAsTouched();
    this.formulaTarget.set(target);
  }

  clearFormula(target: FormulaTarget): void {
    const control = this.formulaForm.controls[target];
    control.setValue('');
    control.markAsDirty();
    control.markAsTouched();
    this.formulaTarget.set(target);
  }

  toggleAdvancedFormulaTools(): void {
    this.showAdvancedFormulaTools.update((value) => !value);
  }

  onSimpleBaseCostChange(value: string): void {
    const normalized = String(value || '').trim();
    this.simpleBaseCostKey.set(normalized);
    this.simpleActualExtraKeys.update((keys) => keys.filter((key) => key !== normalized));
    this.autoApplySimplePricingBuilder();
  }

  onSimpleMarginPercentChange(value: string): void {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed >= 0) {
      this.simpleMarginPercent.set(parsed);
      this.autoApplySimplePricingBuilder();
    }
  }

  onSimpleAnchorPercentChange(value: string): void {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed >= 0) {
      this.simpleAnchorPercent.set(parsed);
      this.autoApplySimplePricingBuilder();
    }
  }

  onSimpleSellingMarginBaseChange(value: string): void {
    const normalized = String(value || '').trim().toLowerCase();
    this.simpleSellingMarginBase.set(normalized === 'actual' ? 'actual' : 'buy');
    this.autoApplySimplePricingBuilder();
  }

  toggleSimpleActualExtraKey(fieldKey: string, checked: boolean): void {
    const normalized = String(fieldKey || '').trim();
    if (!normalized || normalized === this.simpleBaseCostKey()) {
      return;
    }
    const current = new Set(this.simpleActualExtraKeys());
    if (checked) {
      current.add(normalized);
    } else {
      current.delete(normalized);
    }
    this.simpleActualExtraKeys.set([...current]);
    this.autoApplySimplePricingBuilder();
  }

  isSimpleActualExtraSelected(fieldKey: string): boolean {
    return this.simpleActualExtraKeys().includes(String(fieldKey || '').trim());
  }

  toggleAllSimpleActualExtraKeys(selectAll: boolean): void {
    if (selectAll) {
      const allKeys = this.simpleActualExtraOptions()
        .map((field) => field.key)
        .filter((key) => key !== this.simpleBaseCostKey());
      this.simpleActualExtraKeys.set(allKeys);
    } else {
      this.simpleActualExtraKeys.set([]);
    }
    this.autoApplySimplePricingBuilder();
  }

  isAllSimpleActualExtraSelected(): boolean {
    const options = this.simpleActualExtraOptions();
    if (options.length === 0) return false;
    return options.every((field) => this.isSimpleActualExtraSelected(field.key));
  }

  applySimplePricingBuilder(): void {
    this.autoApplySimplePricingBuilder();
  }

  private autoApplySimplePricingBuilder(): void {
    const formulas = this.simpleGeneratedFormulas();
    this.formulaForm.patchValue({
      actualPrice: formulas.actualPrice,
      sellingPrice: formulas.sellingPrice,
      anchorPrice: formulas.anchorPrice,
    }, { emitEvent: false });
    this.formulaForm.markAsDirty();
    this.formulaTarget.set('sellingPrice');
  }

  private buildSimplePricingFormulas(): { actualPrice: string; sellingPrice: string; anchorPrice: string } {
    const base = String(this.simpleBaseCostKey() || '').trim();
    const numberTokenFallback = this.wizardFields().find((field) => field.type === 'NUMBER')?.key || 'buyPrice';
    const baseToken = base || numberTokenFallback;
    const extras = this.simpleActualExtraKeys().filter((key) => key && key !== baseToken);

    const actualParts = [baseToken, ...extras];
    const actualFormula = actualParts.join(' + ');

    const marginPercent = Math.max(0, Number(this.simpleMarginPercent()) || 0);
    const anchorPercent = Math.max(0, Number(this.simpleAnchorPercent()) || 0);
    const sellingFormula = `actualPrice + (${baseToken} * ${marginPercent}%)`;
    const anchorMultiplier = (1 + (anchorPercent / 100)).toFixed(4).replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
    const anchorFormula = anchorPercent > 0 ? `sellingPrice * ${anchorMultiplier}` : 'sellingPrice';

    return {
      actualPrice: actualFormula,
      sellingPrice: sellingFormula,
      anchorPrice: anchorFormula,
    };
  }

  nextStep(): void {
    const step = this.currentStep();
    if (step < 6) {
      this.currentStep.set(step + 1);
    }
  }

  previousStep(): void {
    const step = this.currentStep();
    if (step > 1) {
      this.currentStep.set(step - 1);
    }
  }

  selectStep(stepId: string | number): void {
    const step = typeof stepId === 'number' ? stepId : Number.parseInt(stepId, 10);
    // Allow free navigation to any tab
    this.currentStep.set(step);
  }

  saveGroup(): void {
    if (![1, 2, 3, 4, 5].every((step) => this.isStepValid(step))) {
      this.touchStep(this.currentStep());
      this.errorMessage.set('Please complete all required fields before saving the group.');
      return;
    }

    const payload = this.buildPayload();
    if (!payload) {
      return;
    }

    this.saving.set(true);
    this.errorMessage.set(null);

    const editId = this.editingGroupId();
    const request = editId
      ? this.groupsService.updateGroup(editId, payload)
      : this.groupsService.createGroup(payload);

    request.subscribe({
      next: (result) => {
        const pendingImages = this.groupImages();
        const newGroupId = !editId && result?.data?._id ? result.data._id : null;

        if (newGroupId && pendingImages.length > 0) {
          const entries: GroupImageEntry[] = pendingImages.map((img, i) => ({
            mediaAssetId: img.mediaAssetId._id,
            source: img.source,
            sortOrder: i,
          }));
          this.mediaService.attachGroupImages(newGroupId, entries).subscribe({
            next: () => {
              this.groupsService.updateGroupCompletionChecklist(newGroupId, { media: true }).subscribe({ next: () => void 0, error: () => void 0 });
              this.saving.set(false);
              this.closeWizard();
              this.loadInitialData();
            },
            error: () => {
              this.toast.error('Group saved but failed to attach media.');
              this.saving.set(false);
              this.closeWizard();
              this.loadInitialData();
            },
          });
        } else {
          this.saving.set(false);
          this.closeWizard();
          this.loadInitialData();
        }
      },
      error: (error) => {
        console.error('Failed to save group', error);
        const apiMessage = error?.error?.message || error?.message || 'Failed to save group. Please check formulas and required fields.';
        this.errorMessage.set(String(apiMessage));
        this.saving.set(false);
      },
    });
  }

  // --- Image Methods ---

  openPicker(): void {
    this.pickerOpen.set(true);
  }

  onImagesSelected(picked: PickedImage[]): void {
    const imageLimit = this.groupImageLimit();
    const remainingImageSlots = Math.max(imageLimit - this.imageCount(), 0);
    if (remainingImageSlots <= 0) {
      this.toast.error(`Only ${imageLimit} media items are allowed per group.`);
      return;
    }

    const videoLimit = this.groupVideoLimit();
    const selectedVideos = picked.filter((p) => p.asset.mediaType === 'VIDEO').length;
    const remainingVideoSlots = Math.max(videoLimit - this.videoCount(), 0);
    if (selectedVideos > remainingVideoSlots) {
      this.toast.error(`Only ${videoLimit} video${videoLimit === 1 ? '' : 's'} are allowed per group.`);
      return;
    }

    const editId = this.editingGroupId();
    if (!editId) {
      // New group — add locally, will attach after save
      const current = this.groupImages();
      const existingIds = new Set(current.map((img) => img.mediaAssetId._id));
      const newImages: GroupImage[] = picked
        .filter((p) => !existingIds.has(p.asset._id))
        .map((p, i) => ({ mediaAssetId: p.asset, source: p.source, sortOrder: current.length + i }));
      const next = [...current, ...newImages].slice(0, imageLimit);
      this.groupImages.set(next);
      if (next.length < current.length + newImages.length) {
        this.toast.error(`Only ${imageLimit} media items are allowed per group.`);
      }
      return;
    }

    const entries: GroupImageEntry[] = picked.map((p, i) => ({
      mediaAssetId: p.asset._id,
      source: p.source,
      sortOrder: this.groupImages().length + i,
    }));

    this.mediaService.attachGroupImages(editId, entries).subscribe({
      next: () => {
        this.groupsService.updateGroupCompletionChecklist(editId, { media: true }).subscribe({
          next: () => this.loadCompletionStatus(editId),
          error: () => void 0,
        });
        this.toast.success('Media attached.');
        this.loadGroupImages(editId);
      },
      error: (err) => {
        const msg = err?.error?.message || 'Failed to attach media.';
        this.toast.error(msg);
      },
    });
  }

  removeImage(image: GroupImage): void {
    const editId = this.editingGroupId();
    if (!editId) {
      this.groupImages.set(this.groupImages().filter((img) => img.mediaAssetId._id !== image.mediaAssetId._id));
      return;
    }

    this.mediaService.detachGroupImages(editId, [image.mediaAssetId._id]).subscribe({
      next: () => {
        this.toast.success('Media removed.');
        this.loadGroupImages(editId);
      },
      error: () => this.toast.error('Failed to remove media.'),
    });
  }

  loadGroupImages(groupId: string): void {
    this.mediaService.getGroupImages(groupId).subscribe({
      next: (images) => this.groupImages.set(images || []),
      error: () => this.groupImages.set([]),
    });
  }

  canProceedToNextStep(): boolean {
    return this.isStepValid(this.currentStep());
  }

  canSaveGroup(): boolean {
    return [1, 2, 3, 4, 5].every((step) => this.isStepValid(step));
  }

  shouldShowIcon(mode: GomButtonContentMode): boolean {
    return showButtonIcon(mode);
  }

  shouldShowText(mode: GomButtonContentMode): boolean {
    return showButtonText(mode);
  }

  private isStepValid(step: number): boolean {
    if (step === 1) {
      if (!this.basicForm.valid) {
        return false;
      }
      
      // For ATTRIBUTE/HYBRID groups, validate optionAxes
      const groupType = this.currentGroupType();
      if (groupType === 'ATTRIBUTE' || groupType === 'HYBRID') {
        if (this.optionAxesForm.length === 0) {
          return false;
        }
        
        // Check all axes are valid
        return this.optionAxesForm.controls.every(control => {
          const key = (control.controls.key.value || '').trim();
          const valuesString = (control.controls.values.value || '').trim();
          const values = this.getOptionAxisValuesArray(valuesString);
          return control.valid && key.length > 0 && values.length > 0;
        });
      }
      
      return true;
    }

    if (step === 2) {
      return this.selectionForm.valid;
    }

    if (step === 3) {
      return this.valuesForm.valid && this.wizardFields().length > 0;
    }

    if (step === 4) {
      const preview = this.formulaPreview();
      
      // Validate simple pricing builder fields (required when using simple mode)
      const baseCost = this.simpleBaseCostKey();
      const margin = this.simpleMarginPercent();
      const markup = this.simpleAnchorPercent();
      
      // All three simple builder fields must be filled
      if (!baseCost?.trim()) {
        return false; // Base cost is required
      }
      
      if (!Number.isFinite(margin) || margin <= 0) {
        return false; // Profit margin must be > 0
      }
      
      if (!Number.isFinite(markup) || markup <= 0) {
        return false; // MRP markup must be > 0
      }
      
      return this.formulaForm.valid && !preview.error;
    }

    if (step === 5) {
      return this.unitsForm.valid && this.allowedUnitIds().length > 0;
    }

    if (step === 6) {
      return true; // Images step is always valid (optional)
    }

    return false;
  }

  private touchStep(step: number): void {
    if (step === 1) {
      this.basicForm.markAllAsTouched();
      return;
    }

    if (step === 2) {
      this.selectionForm.markAllAsTouched();
      return;
    }

    if (step === 3) {
      this.valuesForm.markAllAsTouched();
      return;
    }

    if (step === 4) {
      this.formulaForm.markAllAsTouched();
      return;
    }

    if (step === 5) {
      this.unitsForm.markAllAsTouched();
    }
  }

  private syncDynamicFields(existing?: Group): void {
    const nextGroup = new FormRecord<FormControl<number | null>>({});

    const resolvedByKey = new Map((existing?.resolvedFields || []).map((item) => [item.key, item.value]));
    const currentValues = this.valuesForm.getRawValue() as Record<string, number | null>;

    for (const field of this.wizardFields()) {
      const currentValue = Object.hasOwn(currentValues, field.key)
        ? currentValues[field.key]
        : null;
      const initialValue = resolvedByKey.has(field.key)
        ? resolvedByKey.get(field.key)
        : currentValue;
      const parsed = Number(initialValue);
      const normalizedValue = Number.isFinite(parsed) ? parsed : field.defaultValue;

      nextGroup.addControl(
        field.key,
        new FormControl<number | null>(normalizedValue, field.isRequired ? [Validators.required] : [])
      );
    }

    this.replaceValuesForm(nextGroup);
    this.tryAutofillFormulas();
  }

  private replaceValuesForm(nextForm: FormRecord<FormControl<number | null>>): void {
    Object.keys(this.valuesForm.controls).forEach((key) => {
      this.valuesForm.removeControl(key);
    });

    Object.entries(nextForm.controls).forEach(([key, control]) => {
      this.valuesForm.addControl(key, control);
    });
  }

  private resetWizard(): void {
    this.currentStep.set(1);
    this.editingGroupId.set(null);
    this.editingQuantity.set(1);
    this.selectedFieldGroupIds.set([]);
    this.hiddenGroupFieldKeys.set(new Set());
    this.selectedExtraFieldIds.set([]);
    this.allowedUnitIds.set([]);
    this.formulaTarget.set('sellingPrice');
    this.showAdvancedFormulaTools.set(false);
    this.simpleBaseCostKey.set('');
    this.simpleMarginPercent.set(20);
    this.simpleAnchorPercent.set(5);
    this.simpleSellingMarginBase.set('buy');
    this.simpleActualExtraKeys.set([]);
    this.groupFieldToggleControls.clear();

    this.basicForm.reset({ name: '', description: '', createDefaultVariant: false, categoryId: '', taxProfileId: '' });
    this.basicForm.controls.groupType.setValue('MEASURED');
    this.basicForm.controls.pricingRefreshMode.setValue('AUTO_REFRESH');
    this.descEditor?.clear();
    this.selectionForm.reset({ fieldGroupId: '' });
    this.formulaForm.reset({ sellingPrice: '', anchorPrice: '', actualPrice: '' });
    this.unitsForm.reset({ baseUnitId: '' });
    this.replaceValuesForm(new FormRecord<FormControl<number | null>>({}));
    this.groupImages.set([]);
    this.clearOptionAxes();
    this.completionStatus.set(null);
    this.completionMode.set(false);
    this.closeVariantReview();
  }

  private clearOptionAxes(): void {
    while (this.optionAxesForm.length > 0) {
      this.optionAxesForm.removeAt(this.optionAxesForm.length - 1);
    }
  }

  private syncOptionAxesFromExisting(existing?: Group): void {
    this.clearOptionAxes();

    const groupType = String(existing?.groupType || this.basicForm.controls.groupType.value || 'MEASURED').toUpperCase();
    if (groupType !== 'ATTRIBUTE' && groupType !== 'HYBRID') {
      return;
    }

    const optionAxes = Array.isArray(existing?.optionAxes) ? existing.optionAxes : [];
    optionAxes.forEach((axis) => {
      const axisGroup = this.fb.group({
        key: this.fb.control(String(axis?.key || '').trim(), {
          validators: [Validators.required, Validators.pattern(/^[a-zA-Z_]\w*$/)],
          nonNullable: true,
        }),
        label: this.fb.control(String(axis?.label || '').trim(), {
          validators: [Validators.required],
          nonNullable: true,
        }),
        values: this.fb.control((Array.isArray(axis?.values) ? axis.values : []).join(', '), {
          validators: [Validators.required],
          nonNullable: true,
        }),
      });

      this.optionAxesForm.push(axisGroup);
    });
  }

  private buildPayload(): GroupPayload | null {
    const values = this.valuesForm.getRawValue() as Record<string, number | null>;
    const customFields = this.wizardFields().map((field) => ({
      fieldId: field.fieldId,
      value: Number(values[field.key]),
    }));

    const editingGroupId = this.editingGroupId();
    const quantity = editingGroupId ? this.editingQuantity() : 1;

    const baseUnitId = String(this.unitsForm.controls.baseUnitId.value || '');
    const allowedUnitIds = new Set(this.allowedUnitIds());
    if (baseUnitId) {
      allowedUnitIds.add(baseUnitId);
    }

    const taxProfileId = String(this.basicForm.controls.taxProfileId.value || '').trim();
    const pricingRefreshMode = this.basicForm.controls.pricingRefreshMode.value || 'AUTO_REFRESH';

    const payload: GroupPayload = {
      name: String(this.basicForm.controls.name.value || '').trim(),
      description: this.basicForm.controls.description.value || '',
      categoryId: String(this.basicForm.controls.categoryId.value || ''),
      quantity,
      fieldGroupId: String(this.selectionForm.controls.fieldGroupId.value || ''),
      customFields,
      excludedFieldKeys: [...this.hiddenGroupFieldKeys()],
      formula: {
        sellingPrice: String(this.formulaForm.controls.sellingPrice.value || '').trim(),
        anchorPrice: String(this.formulaForm.controls.anchorPrice.value || '').trim(),
        actualPrice: String(this.formulaForm.controls.actualPrice.value || '').trim(),
      },
      pricingRefreshMode,
      baseUnitId,
      allowedUnitIds: [...allowedUnitIds],
      taxProfileId,
      status: 'ACTIVE',
    };

    if (!editingGroupId) {
      const createDefaultVariant = this.basicForm.controls.createDefaultVariant.value !== false;
      payload.createDefaultVariant = createDefaultVariant;
      if (createDefaultVariant && baseUnitId) {
        payload.defaultVariant = {
          quantity,
          unitId: baseUnitId,
        };
      }
    }

    payload.groupType = this.basicForm.controls.groupType.value || 'MEASURED';

    // Add optionAxes for ATTRIBUTE/HYBRID groups
    const groupType = this.basicForm.controls.groupType.value;
    if (groupType === 'ATTRIBUTE' || groupType === 'HYBRID') {
      payload.optionAxes = this.optionAxesForm.controls.map(control => {
        const valuesString = control.controls.values.value || '';
        return {
          key: (control.controls.key.value || '').trim(),
          label: (control.controls.label.value || '').trim(),
          values: this.getOptionAxisValuesArray(valuesString),
        };
      }).filter(axis => axis.key && axis.values.length > 0);
    }

    return payload;
  }

  private calculateFormulaPreview(): { sellingPrice: number | null; anchorPrice: number | null; actualPrice: number | null; error: string | null } {
    const rawValues = this.valuesForm.getRawValue() as Record<string, number | null>;
    const context: Record<string, number> = {};

    for (const field of this.wizardFields()) {
      const value = Number(rawValues[field.key]);
      if (!Number.isFinite(value)) {
        return { sellingPrice: null, anchorPrice: null, actualPrice: null, error: `${field.name} has invalid value.` };
      }
      context[field.key] = value;
    }

    const sellingFormula = String(this.formulaForm.controls.sellingPrice.value || '').trim();
    const anchorFormula = String(this.formulaForm.controls.anchorPrice.value || '').trim();
    const actualFormula = String(this.formulaForm.controls.actualPrice.value || '').trim();

    if (!sellingFormula && !anchorFormula && !actualFormula) {
      return { sellingPrice: null, anchorPrice: null, actualPrice: null, error: null };
    }

    try {
      let selling: number | null = null;
      let anchor: number | null = null;
      let actual: number | null = null;

      if (actualFormula) {
        actual = this.evaluateExpression(actualFormula, context);
      }

      if (sellingFormula) {
        selling = this.evaluateExpression(sellingFormula, {
          ...context,
          actualPrice: Number(actual ?? 0),
        });
      }

      if (anchorFormula) {
        if (!Number.isFinite(selling)) {
          return {
            sellingPrice: null,
            anchorPrice: null,
            actualPrice: null,
            error: 'Selling price formula is required before anchor price formula.',
          };
        }

        anchor = this.evaluateExpression(anchorFormula, {
          ...context,
          actualPrice: Number(actual ?? 0),
          sellingPrice: Number(selling),
        });
      }

      return {
        sellingPrice: Number.isFinite(selling) ? Number(Number(selling).toFixed(2)) : null,
        anchorPrice: Number.isFinite(anchor) ? Number(Number(anchor).toFixed(2)) : null,
        actualPrice: Number.isFinite(actual) ? Number(Number(actual).toFixed(2)) : null,
        error: null,
      };
    } catch (error) {
      return {
        sellingPrice: null,
        anchorPrice: null,
        actualPrice: null,
        error: error instanceof Error ? error.message : 'Invalid formula',
      };
    }
  }

  private getFieldGroupsForCategory(categoryId: string): FieldGroup[] {
    const normalizedCategoryId = String(categoryId || '').trim();
    const activeFieldGroups = this.fieldGroups().filter((item) => item.status === 'ACTIVE');

    // If no category selected, return empty array
    if (!normalizedCategoryId) {
      return [];
    }

    // Only return field groups that are explicitly mapped to this category
    return activeFieldGroups.filter((fieldGroup) => {
      const mappedCategoryIds = fieldGroup.categoryIds || [];
      return mappedCategoryIds.includes(normalizedCategoryId);
    });
  }

  private getUnitsForCategory(categoryId: string): Unit[] {
    const normalizedCategoryId = String(categoryId || '').trim();
    const allUnits = this.units().filter((item) => item.status === 'ACTIVE');

    // If no category selected, return empty array
    if (!normalizedCategoryId) {
      return [];
    }

    // Only return units that are explicitly mapped to this category
    return allUnits.filter((unit) => {
      const mappedCategoryIds = unit.categoryIds || [];
      return mappedCategoryIds.includes(normalizedCategoryId);
    });
  }

  private evaluateExpression(expression: string, context: Record<string, number>): number {
    if (!/^[\d\s()+\-*/%._A-Za-z]+$/.test(expression)) {
      throw new Error('Formula contains unsupported characters.');
    }

    const keys = Object.keys(context).sort((a, b) => b.length - a.length);
    let replaced = expression.replaceAll(/(\d+(?:\.\d+)?)\s*%/g, '($1/100)');

    for (const key of keys) {
      const value = context[key];
      const pattern = new RegExp(String.raw`\b${key}\b`, 'g');
      replaced = replaced.replace(pattern, String(value));
    }

    if (/\b[A-Za-z_]\w*\b/.test(replaced)) {
      throw new Error('Formula uses unknown variables.');
    }

    const result = new Function(`"use strict"; return (${replaced});`)();
    const numeric = Number(result);

    if (!Number.isFinite(numeric)) {
      throw new TypeError('Formula output is invalid.');
    }

    return numeric;
  }

  private isPricingField(field: Field): field is Field & { type: 'NUMBER' | 'PERCENTAGE' } {
    return (
      field.fieldKind !== 'METADATA'
      && (field.type === 'NUMBER' || field.type === 'PERCENTAGE')
    );
  }

  private getPreferredToken(candidates: string[]): string | null {
    const available = new Set(this.wizardFields().map((field) => String(field.key || '').trim().toLowerCase()));
    const found = candidates.find((key) => available.has(String(key || '').trim().toLowerCase()));
    return found || null;
  }

  private tryAutofillFormulas(): void {
    const selling = String(this.formulaForm.controls.sellingPrice.value || '').trim();
    const anchor = String(this.formulaForm.controls.anchorPrice.value || '').trim();
    const actual = String(this.formulaForm.controls.actualPrice.value || '').trim();
    if (selling || anchor || actual) {
      return;
    }

    this.initializeSimplePricingDefaults();
  }

  private initializeSimplePricingDefaults(): void {
    const numberFields = this.wizardFields().filter((field) => field.type === 'NUMBER');
    const preferredBase = this.getPreferredToken(['buyPrice', 'buyprice', 'costPrice', 'costprice', 'basePrice', 'baseprice']);
    const fallbackBase = numberFields[0]?.key || 'buyPrice';
    const base = preferredBase || fallbackBase;

    this.simpleBaseCostKey.set(base);
    this.simpleActualExtraKeys.set(
      numberFields
        .map((field) => field.key)
        .filter((key) => key !== base)
        .filter((key) => ['labourcost', 'laborcost', 'makingcharge', 'transport', 'wastage'].includes(key.toLowerCase()))
    );

    this.autoApplySimplePricingBuilder();
  }

  closeGroupCollectionsModal(): void {
    this.groupCollectionsModalOpen.set(false);
    this.currentGroupForCollections.set(null);
    this.groupCollectionMemberships.set([]);
    this.availableProductCollections.set([]);
    this.groupCollectionForm.reset({ collectionId: '' });
  }

  addCurrentGroupToCollection(): void {
    const group = this.currentGroupForCollections();
    const collectionId = String(this.groupCollectionForm.controls.collectionId.value || '');
    if (!group?._id || !collectionId) {
      return;
    }

    this.loadingGroupCollections.set(true);
    this.productCollectionsService.assignItems(collectionId, {
      assignments: [{ type: 'GROUP', referenceId: group._id }],
    }).subscribe({
      next: () => {
        this.groupCollectionForm.reset({ collectionId: '' });
        this.toast.success('Group added to collection.');
        this.reloadGroupCollectionMemberships(group._id);
      },
      error: (error) => {
        this.loadingGroupCollections.set(false);
        this.toast.error(this.getErrorMessage(error, 'Failed to add group to collection.'));
      },
    });
  }

  private openGroupCollections(group: Group): void {
    this.currentGroupForCollections.set(group);
    this.groupCollectionsModalOpen.set(true);
    this.loadingGroupCollections.set(true);
    this.groupCollectionForm.reset({ collectionId: '' });

    forkJoin({
      memberships: this.productCollectionsService.listCollectionsByGroup(group._id),
      all: this.productCollectionsService.list({ page: 1, limit: 500 }),
    }).subscribe({
      next: ({ memberships, all }) => {
        this.groupCollectionMemberships.set(memberships.data || []);
        this.availableProductCollections.set(all.data || []);
        this.loadingGroupCollections.set(false);
      },
      error: () => {
        this.loadingGroupCollections.set(false);
        this.toast.error('Failed to load collection memberships.');
      },
    });
  }

  private reloadGroupCollectionMemberships(groupId: string): void {
    this.productCollectionsService.listCollectionsByGroup(groupId).subscribe({
      next: (response) => {
        this.groupCollectionMemberships.set(response.data || []);
        this.loadingGroupCollections.set(false);
      },
      error: () => {
        this.loadingGroupCollections.set(false);
        this.toast.error('Failed to refresh collection memberships.');
      },
    });
  }
}
