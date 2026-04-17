import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin, startWith } from 'rxjs';

import {
  FormControlsModule,
  GomButtonComponent,
  GomSelectOption,
} from '../../../shared/components/form-controls';
import {
  GomButtonContentMode,
  getButtonContentMode,
  showButtonIcon,
  showButtonText,
} from '../../../shared/components/config';
import { GomTableColumn, GomTableComponent, GomTableRow } from '../../../shared/components/table';
import { GomConfirmationModalComponent, GomModalComponent } from '../../../shared/components/modal';
import { GomAlertToastService } from '../../../shared/components/alert';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { Pack, PacksService, VariantOption } from './packs.service';

interface PackRow extends GomTableRow {
  _id: string;
  name: string;
  itemsCount: string;
  sellingPrice: string;
  anchorPrice: string;
  updatedAt: string;
  actions: string;
}

@Component({
  selector: 'gom-packs',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormControlsModule,
    GomButtonComponent,
    GomTableComponent,
    GomModalComponent,
    GomConfirmationModalComponent,
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
  readonly canWrite = computed(() => this.authSession.canWrite('product'));
  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly packs = signal<Pack[]>([]);
  readonly variants = signal<VariantOption[]>([]);

  readonly formOpen = signal(false);
  readonly deleteConfirmOpen = signal(false);
  readonly editingPackId = signal<string | null>(null);
  readonly deletingPackId = signal<string | null>(null);
  readonly submitMode: GomButtonContentMode = getButtonContentMode('primary-action');
  readonly cancelMode: GomButtonContentMode = getButtonContentMode('dismiss');

  readonly packForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    status: ['ACTIVE' as 'ACTIVE' | 'INACTIVE'],
    items: this.fb.array([]),
  });

  private readonly packFormValue = toSignal(
    this.packForm.valueChanges.pipe(startWith(this.packForm.getRawValue())),
    { initialValue: this.packForm.getRawValue() }
  );

  readonly columns: GomTableColumn<PackRow>[] = [
    { key: 'name', header: 'Pack Name', sortable: true, filterable: true, width: '16rem' },
    { key: 'itemsCount', header: 'Items', sortable: true, width: '7rem' },
    { key: 'sellingPrice', header: 'Selling Price', sortable: true, width: '10rem' },
    { key: 'anchorPrice', header: 'Anchor Price', sortable: true, width: '10rem' },
    { key: 'updatedAt', header: 'Updated', sortable: true, width: '10rem' },
    {
      key: 'actions',
      header: 'Actions',
      width: '10rem',
      actionButtons: [
        { label: 'Edit', actionKey: 'edit', variant: 'secondary' },
        { label: 'Delete', actionKey: 'delete', variant: 'secondary' },
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

    for (const item of itemsValue) {
      const variant = variantById.get(String(item?.variantId || ''));
      const qty = Number(item.quantity || 0);
      if (!variant || !Number.isFinite(qty) || qty <= 0) {
        continue;
      }

      const effectiveSelling = Number(variant.effectivePrice?.sellingPrice ?? variant.price.sellingPrice ?? 0);
      const effectiveAnchor = Number(variant.effectivePrice?.anchorPrice ?? variant.price.anchorPrice ?? 0);

      sellingPrice += effectiveSelling * qty;
      anchorPrice += effectiveAnchor * qty;
    }

    return {
      sellingPrice: Number(sellingPrice.toFixed(2)),
      anchorPrice: Number(anchorPrice.toFixed(2)),
    };
  });

  get itemControls(): FormArray {
    return this.packForm.controls.items as FormArray;
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
      status: 'ACTIVE',
    });
    this.itemControls.clear();
    this.addItemRow();
    this.formOpen.set(true);
  }

  openEditPack(pack: Pack): void {
    this.editingPackId.set(pack._id);
    this.packForm.reset({
      name: pack.name,
      status: pack.status,
    });

    this.itemControls.clear();
    pack.items.forEach((item) => {
      this.itemControls.push(this.fb.group({
        variantId: [String(item.variantId), [Validators.required]],
        quantity: [item.quantity, [Validators.required, Validators.min(0.000001)]],
      }));
    });

    if (!this.itemControls.length) {
      this.addItemRow();
    }

    this.formOpen.set(true);
  }

  addItemRow(): void {
    this.itemControls.push(this.fb.group({
      variantId: ['', [Validators.required]],
      quantity: [1, [Validators.required, Validators.min(0.000001)]],
    }));
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
  }

  savePack(): void {
    this.packForm.markAllAsTouched();
    if (this.packForm.invalid || this.itemControls.length === 0) {
      this.toast.error('Please provide pack name and at least one valid item.');
      return;
    }

    const payload = {
      name: String(this.packForm.controls.name.value || '').trim(),
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

    const editingId = this.editingPackId();
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
    if (!this.canWrite()) {
      return;
    }
    const id = typeof event.row['_id'] === 'string' ? event.row['_id'] : '';
    const pack = this.packs().find((item) => item._id === id);
    if (!pack) {
      return;
    }

    if (event.actionKey === 'edit') {
      this.openEditPack(pack);
      return;
    }

    if (event.actionKey === 'delete') {
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
}
