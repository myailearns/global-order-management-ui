import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin, startWith } from 'rxjs';

import {
  FormControlsModule,
  GomAlertToastService,
  GomButtonComponent,
  GomButtonContentMode,
  GomConfirmationModalComponent,
  GomModalComponent,
  GomSelectOption,
  GomTableColumn,
  GomTableComponent,
  GomTableRow,
  getButtonContentMode,
  showButtonIcon,
  showButtonText,
} from '@gomlibs/ui';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { ImagePickerComponent, PickedImage } from '../../../shared/components/image-picker/image-picker.component';
import { DisableIfNoFeatureDirective } from '../../../shared/directives/disable-if-no-feature.directive';
import { Pack, PacksService, VariantOption } from './packs.service';

interface PackRow extends GomTableRow {
  _id: string;
  name: string;
  stockStatus: string;
  itemsCount: string;
  sellingPrice: string;
  anchorPrice: string;
  updatedAt: string;
  actions: string;
}

interface SelectedPackImage {
  _id: string;
  url: string;
  mediaType?: 'IMAGE' | 'VIDEO';
  format?: string;
}

@Component({
  selector: 'gom-packs',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormControlsModule,
    DisableIfNoFeatureDirective,
    GomButtonComponent,
    GomTableComponent,
    GomModalComponent,
    GomConfirmationModalComponent,
    ImagePickerComponent,
  ],
  templateUrl: './packs.component.html',
  styleUrl: './packs.component.scss',
})
export class PacksComponent implements OnInit {
  private readonly service = inject(PacksService);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(GomAlertToastService);
  private readonly authSession = inject(AuthSessionService);

  readonly loading = signal(false);
  readonly canCreatePack = computed(() => this.authSession.hasFeature('pack.create') && (this.packCreateRemaining() ?? Infinity) > 0);
  readonly canUpdatePack = computed(() => this.authSession.hasFeature('pack.edit') || this.authSession.hasFeature('pack.update'));
  readonly canDeletePack = computed(() => this.authSession.hasFeature('pack.delete'));
  readonly packCreateLimit = computed(() => this.authSession.getFeatureConfigNumber('pack.create', 'max_count'));
  readonly packCreateUsed = computed(() => this.packs().length);
  readonly packCreateRemaining = computed(() => {
    const limit = this.packCreateLimit();
    if (limit === null) {
      return null;
    }

    return Math.max(limit - this.packCreateUsed(), 0);
  });
  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly packs = signal<Pack[]>([]);
  readonly variants = signal<VariantOption[]>([]);

  readonly DEFAULT_MAX_IMAGES = 6;
  readonly DEFAULT_MAX_VIDEOS = 1;
  readonly pickerOpen = signal(false);
  readonly selectedPackImages = signal<SelectedPackImage[]>([]);
  readonly previewCaptionTrack = 'data:text/vtt;charset=utf-8,WEBVTT%0A';

  readonly canUploadOwn = computed(() => {
    const session = this.authSession.session();
    if (session?.actorType !== 'tenant') return false;
    const keys = new Set(
      (session.featureKeys ?? []).map((k: string) => String(k || '').trim().toLowerCase()).filter(Boolean),
    );
    return keys.has('media.upload');
  });

  readonly existingImageIds = computed(() => new Set(this.selectedPackImages().map((img) => img._id)));
  readonly imageCount = computed(() => this.selectedPackImages().length);
  readonly videoCount = computed(() => this.selectedPackImages().filter((img) => img.mediaType === 'VIDEO').length);
  readonly packImageLimit = computed(() => this.authSession.getFeatureConfigNumber('pack.create', 'max_images') ?? this.DEFAULT_MAX_IMAGES);
  readonly packVideoLimit = computed(() => this.authSession.getFeatureConfigNumber('pack.create', 'max_videos') ?? this.DEFAULT_MAX_VIDEOS);

  readonly formOpen = signal(false);
  readonly deleteConfirmOpen = signal(false);
  readonly showProfitImpact = signal(false);
  readonly editingPackId = signal<string | null>(null);
  readonly deletingPackId = signal<string | null>(null);
  readonly submitMode: GomButtonContentMode = getButtonContentMode('primary-action');
  readonly cancelMode: GomButtonContentMode = getButtonContentMode('dismiss');
  readonly rowDeleteMode: GomButtonContentMode = getButtonContentMode('danger-action');

  readonly packForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    description: [''],
    allowOutOfStockItems: ['false'],
    outOfStockThreshold: [1, [Validators.required, Validators.min(1)]],
    discountPercentage: [0, [Validators.min(0), Validators.max(100)]],
    discountDescription: [''],
    status: ['ACTIVE' as 'ACTIVE' | 'INACTIVE'],
    items: this.fb.array([]),
    badges: this.fb.array([]),
  });

  private readonly packFormValue = toSignal(
    this.packForm.valueChanges.pipe(startWith(this.packForm.getRawValue())),
    { initialValue: this.packForm.getRawValue() }
  );

  readonly columns: GomTableColumn<PackRow>[] = [
    { key: 'name', header: 'Pack Name', sortable: true, filterable: true, width: '16rem' },
    { key: 'stockStatus', header: 'Stock', sortable: false, width: '16rem' },
    { key: 'itemsCount', header: 'Items', sortable: true, width: '7rem' },
    { key: 'sellingPrice', header: 'Selling Price', sortable: true, width: '10rem' },
    { key: 'anchorPrice', header: 'Anchor Price', sortable: true, width: '10rem' },
    { key: 'updatedAt', header: 'Updated', sortable: true, width: '10rem' },
    {
      key: 'actions',
      header: 'Actions',
      width: '10rem',
      actionButtons: [
        {
          label: () => this.canUpdatePack() ? 'Edit' : 'No permission to edit packs',
          actionKey: 'edit',
          variant: 'secondary',
          disabled: () => !this.canUpdatePack(),
        },
        {
          label: () => this.canDeletePack() ? 'Delete' : 'No permission to delete packs',
          actionKey: 'delete',
          variant: 'secondary',
          disabled: () => !this.canDeletePack(),
        },
      ],
    },
  ];

  readonly variantOptions = computed<GomSelectOption[]>(() =>
    this.variants().map((item) => ({ value: String(item._id), label: item.name }))
  );

  readonly rows = computed<PackRow[]>(() =>
    this.packs().map((item) => ({
      _id: item._id,
      name: item.name,
      stockStatus: this.formatStockStatus(item),
      itemsCount: this.formatNumber(item.items.length),
      sellingPrice: this.formatCurrency(item.price.sellingPrice),
      anchorPrice: this.formatCurrency(item.price.anchorPrice),
      updatedAt: new Date(item.updatedAt).toLocaleDateString(),
      actions: 'Actions',
    }))
  );

  readonly formPricePreview = computed(() => {
    const formValue = this.packFormValue();
    const itemsValue = (
      Array.isArray(formValue.items) ? formValue.items : []
    ) as Array<{ variantId?: string; quantity?: number | null }>;
    const variantById = new Map(this.variants().map((item) => [String(item._id), item]));

    let sellingPrice = 0;
    let anchorPrice = 0;
    let computedActualPrice = 0;
    let discountedProfit = 0;
    let individualProfit = 0;
    const breakdown: Array<{
      variantName: string;
      quantity: number;
      sellingPrice: number;
      anchorPrice: number;
      actualPrice: number;
      percentOfTotal: number;
      discountedPrice: number;
      individualProfit: number;
      discountedProfit: number;
      profitDrop: number;
    }> = [];
    const discountPercentage = Number(formValue.discountPercentage || 0);

    for (const item of itemsValue) {
      const variant = variantById.get(String(item?.variantId || ''));
      const qty = Number(item.quantity || 0);
      if (!variant || !Number.isFinite(qty) || qty <= 0) {
        continue;
      }

      const effectiveSelling = Number(variant.effectivePrice?.sellingPrice ?? variant.price.sellingPrice ?? 0);
      const effectiveAnchor = Number(variant.effectivePrice?.anchorPrice ?? variant.price.anchorPrice ?? 0);
      const effectiveActual = Number(variant.effectivePrice?.actualPrice ?? variant.price.actualPrice ?? 0);

      const rowSelling = effectiveSelling * qty;
      const rowAnchor = effectiveAnchor * qty;
      const rowActual = effectiveActual * qty;
      const rowDiscounted = rowSelling * (1 - discountPercentage / 100);
      const rowIndividualProfit = rowSelling - rowActual;
      const rowDiscountedProfit = rowDiscounted - rowActual;
      const rowProfitDrop = rowIndividualProfit - rowDiscountedProfit;

      sellingPrice += rowSelling;
      anchorPrice += rowAnchor;
      computedActualPrice += rowActual;
      individualProfit += rowIndividualProfit;
      discountedProfit += rowDiscountedProfit;

      breakdown.push({
        variantName: variant.name,
        quantity: qty,
        sellingPrice: Number(rowSelling.toFixed(2)),
        anchorPrice: Number(rowAnchor.toFixed(2)),
        actualPrice: Number(rowActual.toFixed(2)),
        percentOfTotal: 0,
        discountedPrice: Number(rowDiscounted.toFixed(2)),
        individualProfit: Number(rowIndividualProfit.toFixed(2)),
        discountedProfit: Number(rowDiscountedProfit.toFixed(2)),
        profitDrop: Number(rowProfitDrop.toFixed(2)),
      });
    }

    for (const row of breakdown) {
      row.percentOfTotal = sellingPrice > 0 ? Number(((row.sellingPrice / sellingPrice) * 100).toFixed(2)) : 0;
    }

    const discountedPrice = Number((sellingPrice * (1 - discountPercentage / 100)).toFixed(2));
    const savings = Number((sellingPrice - discountedPrice).toFixed(2));
    const effectiveActualPrice = Number(computedActualPrice.toFixed(2));
    const profitDrop = Number((individualProfit - discountedProfit).toFixed(2));
    const profitDropPercent = individualProfit > 0
      ? Number(((profitDrop / individualProfit) * 100).toFixed(2))
      : 0;
    const individualProfitMarginPercent = sellingPrice > 0
      ? Number(((individualProfit / sellingPrice) * 100).toFixed(2))
      : 0;
    const discountedProfitMarginPercent = discountedPrice > 0
      ? Number(((discountedProfit / discountedPrice) * 100).toFixed(2))
      : 0;

    return {
      sellingPrice: Number(sellingPrice.toFixed(2)),
      anchorPrice: Number(anchorPrice.toFixed(2)),
      computedActualPrice: Number(computedActualPrice.toFixed(2)),
      actualPrice: Number(effectiveActualPrice.toFixed(2)),
      discountPercentage,
      discountedPrice,
      savings,
      isBelowActual: discountedPrice < effectiveActualPrice && effectiveActualPrice > 0,
      individualProfit: Number(individualProfit.toFixed(2)),
      discountedProfit: Number(discountedProfit.toFixed(2)),
      individualProfitMarginPercent,
      discountedProfitMarginPercent,
      profitDrop,
      profitDropPercent,
      breakdown,
    };
  });

  get itemControls(): FormArray {
    return this.packForm.controls.items as FormArray;
  }

  get badgeControls(): FormArray {
    return this.packForm.controls.badges as FormArray;
  }

  ngOnInit(): void {
    this.loadInitialData();
  }

  loadInitialData(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    forkJoin({
      packs: this.service.listPacks(1, 100),
      variants: this.service.listVariantOptions(1, 100),
    }).subscribe({
      next: ({ packs, variants }) => {
        this.packs.set(packs.data || []);
        this.variants.set((variants.data || []).filter((item) => item.status === 'ACTIVE'));
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Failed to load packs.');
        this.loading.set(false);
      },
    });
  }

  openCreatePack(): void {
    this.editingPackId.set(null);
    this.packForm.reset({
      name: '',
      description: '',
      allowOutOfStockItems: 'false',
      outOfStockThreshold: 1,
      discountPercentage: 0,
      discountDescription: '',
      status: 'ACTIVE',
    });
    this.itemControls.clear();
    this.badgeControls.clear();
    this.selectedPackImages.set([]);
    this.showProfitImpact.set(false);
    this.addItemRow();
    this.formOpen.set(true);
  }

  openEditPack(pack: Pack): void {
    if (!this.canUpdatePack()) {
      this.toast.error('You do not have permission to edit packs.');
      return;
    }

    this.editingPackId.set(pack._id);
    this.packForm.reset({
      name: pack.name,
      description: pack.description || '',
      allowOutOfStockItems: this.normalizeBoolean(pack.allowOutOfStockItems, false) ? 'true' : 'false',
      outOfStockThreshold: Number(pack.outOfStockThreshold || 1),
      discountPercentage: Number(pack.discountPercentage || 0),
      discountDescription: pack.discountDescription || '',
      status: pack.status,
    });

    this.itemControls.clear();
    this.badgeControls.clear();

    pack.items.forEach((item) => {
      this.itemControls.push(this.fb.group({
        variantId: [String(item.variantId), [Validators.required]],
        quantity: [item.quantity, [Validators.required, Validators.min(0.000001)]],
      }));
    });

    (pack.badges || []).forEach((badge) => {
      this.badgeControls.push(this.fb.group({
        label: [badge.label, [Validators.required, Validators.maxLength(50)]],
        color: [badge.color || 'primary'],
      }));
    });

    this.selectedPackImages.set(
      (pack.images || []).map((img, index) => ({
        _id: `${pack._id}-${index}-${img.url}`,
        url: img.url,
        mediaType: img.mediaType,
        format: img.format,
      })),
    );

    if (!this.itemControls.length) {
      this.addItemRow();
    }

    this.showProfitImpact.set(false);
    this.formOpen.set(true);
  }

  addItemRow(): void {
    this.itemControls.push(this.fb.group({
      variantId: ['', [Validators.required]],
      quantity: [1, [Validators.required, Validators.min(0.000001)]],
    }));
  }

  getVariantOptionsForRow(rowIndex: number): GomSelectOption[] {
    const selectedVariantIds = new Set(
      this.itemControls.controls
        .map((group, index) => index === rowIndex ? null : String(group.get('variantId')?.value || '').trim())
        .filter((value): value is string => Boolean(value))
    );

    const currentVariantId = String(this.itemControls.at(rowIndex)?.get('variantId')?.value || '').trim();

    return this.variantOptions().filter((option) => {
      const optionValue = String(option.value || '').trim();
      if (!optionValue) {
        return false;
      }

      return optionValue === currentVariantId || !selectedVariantIds.has(optionValue);
    });
  }

  addBadgeRow(): void {
    this.badgeControls.push(this.fb.group({
      label: ['', [Validators.required, Validators.maxLength(50)]],
      color: ['primary'],
    }));
  }

  removeBadgeRow(index: number): void {
    this.badgeControls.removeAt(index);
  }

  removeItemRow(index: number): void {
    if (this.itemControls.length <= 1) {
      return;
    }

    this.itemControls.removeAt(index);
  }

  closeForm(): void {
    this.formOpen.set(false);
    this.editingPackId.set(null);
    this.pickerOpen.set(false);
    this.showProfitImpact.set(false);
  }

  savePack(): void {
    const editingId = this.editingPackId();
    if (editingId && !this.canUpdatePack()) {
      this.toast.error('You do not have permission to edit packs.');
      return;
    }

    if (!editingId && !this.canCreatePack()) {
      this.toast.error('You do not have permission to create packs.');
      return;
    }

    this.packForm.markAllAsTouched();
    if (this.packForm.invalid || this.itemControls.length === 0) {
      this.toast.error('Please provide pack name and at least one valid item.');
      return;
    }

    function normalizeImageFormat(format?: string): 'PNG' | 'JPEG' | 'WEBP' {
      const ext = String(format || '').trim().toLowerCase();
      if (ext === 'png') return 'PNG';
      if (ext === 'webp') return 'WEBP';
      if (ext === 'jpg' || ext === 'jpeg') return 'JPEG';
      return 'JPEG';
    }

    const payload = {
      name: String(this.packForm.controls.name.value || '').trim(),
      description: String(this.packForm.controls.description.value || '').trim(),
      allowOutOfStockItems: this.normalizeBoolean(this.packForm.controls.allowOutOfStockItems.value, false),
      outOfStockThreshold: Number(this.packForm.controls.outOfStockThreshold.value || 1),
      discountPercentage: Number(this.packForm.controls.discountPercentage.value || 0),
      discountDescription: String(this.packForm.controls.discountDescription.value || '').trim(),
      badges: this.badgeControls.controls
        .map((group) => group.getRawValue() as { label?: string; color?: string })
        .filter((badge) => Boolean(String(badge.label || '').trim()))
        .map((badge) => ({
          label: String(badge.label || '').trim(),
          color: (badge.color || 'primary') as 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'dark',
        })),
      images: this.selectedPackImages().map((img) => {
        const mediaType: 'IMAGE' | 'VIDEO' = img.mediaType === 'VIDEO' ? 'VIDEO' : 'IMAGE';
        if (mediaType === 'VIDEO') {
          return {
            url: img.url,
            mediaType,
          };
        }

        return {
          url: img.url,
          mediaType,
          format: normalizeImageFormat(img.format),
        };
      }),
      status: this.packForm.controls.status.value || 'ACTIVE',
      items: this.itemControls.controls.map((group) => {
        const raw = group.getRawValue();
        return {
          variantId: raw.variantId || '',
          quantity: Number(raw.quantity || 0),
        };
      }),
    };

    this.saving.set(true);

    const request$ = editingId
      ? this.service.updatePack(editingId, payload)
      : this.service.createPack(payload);

    request$.subscribe({
      next: () => {
        this.toast.success(editingId ? 'Pack updated successfully.' : 'Pack created successfully.');
        this.closeForm();
        this.loadInitialData();
        this.saving.set(false);
      },
      error: (error) => {
        this.toast.error(this.extractApiMessage(error) || 'Failed to save pack.');
        this.saving.set(false);
      },
    });
  }

  onRowAction(event: { actionKey: string; row: GomTableRow }): void {
    const id = typeof event.row['_id'] === 'string' ? event.row['_id'] : '';
    const pack = this.packs().find((item) => item._id === id);
    if (!pack) {
      return;
    }

    if (event.actionKey === 'edit') {
      if (!this.canUpdatePack()) {
        return;
      }
      this.openEditPack(pack);
      return;
    }

    if (event.actionKey === 'delete') {
      if (!this.canDeletePack()) {
        return;
      }
      this.deletingPackId.set(pack._id);
      this.deleteConfirmOpen.set(true);
    }
  }

  cancelDelete(): void {
    this.deleteConfirmOpen.set(false);
    this.deletingPackId.set(null);
  }

  confirmDelete(): void {
    const id = this.deletingPackId();
    if (!id) {
      return;
    }

    this.saving.set(true);
    this.deleteConfirmOpen.set(false);

    this.service.deletePack(id).subscribe({
      next: () => {
        this.toast.success('Pack deleted successfully.');
        this.deletingPackId.set(null);
        this.loadInitialData();
        this.saving.set(false);
      },
      error: (error) => {
        this.toast.error(this.extractApiMessage(error) || 'Failed to delete pack.');
        this.saving.set(false);
      },
    });
  }

  getDeleteMessage(): string {
    return 'Are you sure you want to delete this pack?';
  }

  openPicker(): void {
    this.pickerOpen.set(true);
  }

  onImagesSelected(picked: PickedImage[]): void {
    const imageLimit = this.packImageLimit();
    const remainingImageSlots = Math.max(imageLimit - this.imageCount(), 0);
    if (remainingImageSlots <= 0) {
      this.toast.error(`Only ${imageLimit} media items are allowed per pack.`);
      return;
    }

    const videoLimit = this.packVideoLimit();
    const selectedVideos = picked.filter((p) => p.asset.mediaType === 'VIDEO').length;
    const remainingVideoSlots = Math.max(videoLimit - this.videoCount(), 0);
    if (selectedVideos > remainingVideoSlots) {
      this.toast.error(`Only ${videoLimit} video${videoLimit === 1 ? '' : 's'} are allowed per pack.`);
      return;
    }

    const current = this.selectedPackImages();
    const existingUrls = new Set(current.map((img) => img.url));
    const newImages: SelectedPackImage[] = picked
      .filter((p) => !existingUrls.has(p.asset.url))
      .map((p) => ({
        _id: p.asset._id,
        url: p.asset.url,
        mediaType: p.asset.mediaType,
        format: p.asset.format,
      }));

    const next = [...current, ...newImages].slice(0, imageLimit);
    this.selectedPackImages.set(next);
    if (next.length < current.length + newImages.length) {
      this.toast.error(`Only ${imageLimit} media items are allowed per pack.`);
    }
  }

  removeSelectedImage(imageId: string): void {
    this.selectedPackImages.set(this.selectedPackImages().filter((img) => img._id !== imageId));
  }

  calculateProfitImpact(): void {
    this.showProfitImpact.set(true);
  }

  hideProfitImpact(): void {
    this.showProfitImpact.set(false);
  }

  isSaveDisabled(): boolean {
    if (this.saving() || this.packForm.invalid || this.itemControls.length === 0) {
      return true;
    }

    return this.itemControls.controls.some((group) => {
      const raw = group.getRawValue() as { variantId?: string; quantity?: number | null };
      const hasVariant = Boolean(String(raw.variantId || '').trim());
      const qty = Number(raw.quantity || 0);
      return !hasVariant || !Number.isFinite(qty) || qty <= 0;
    });
  }

  shouldShowIcon(mode: GomButtonContentMode): boolean {
    return showButtonIcon(mode);
  }

  shouldShowText(mode: GomButtonContentMode): boolean {
    return showButtonText(mode);
  }

  private formatNumber(value: number): string {
    return Number.isFinite(value)
      ? value.toLocaleString(undefined, { maximumFractionDigits: 4 })
      : '-';
  }

  private formatCurrency(value: number): string {
    return Number.isFinite(value)
      ? value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : '-';
  }

  private extractApiMessage(error: unknown): string {
    const maybeMessage = (error as { error?: { message?: string } })?.error?.message;
    return typeof maybeMessage === 'string' ? maybeMessage : '';
  }

  private normalizeBoolean(value: unknown, fallback: boolean): boolean {
    if (value === true || value === false) {
      return value;
    }
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (normalized === 'true') return true;
      if (normalized === 'false') return false;
    }
    return fallback;
  }

  private formatStockStatus(pack: Pack): string {
    const summary = pack.stockSummary;
    if (!summary) {
      return 'Unknown';
    }

    if (!summary.outOfStock) {
      return 'In stock';
    }

    return `Out of stock (${summary.outOfStockItemCount} items impacted)`;
  }
}
