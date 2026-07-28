import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { GomAlertToastService, GomButtonComponent, GomConfirmationModalComponent, GomInputComponent, GomModalComponent, GomSelectComponent, GomTableColumn, GomTableComponent, GomTableQuery, GomTableRow, GomTextareaComponent } from '@gomlibs/ui';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { DisableIfNoFeatureDirective } from '../../../shared/directives/disable-if-no-feature.directive';
import { PRICING_TEMPLATE_DEFAULT_STATUS, PRICING_TEMPLATE_STATUS_OPTIONS, PRICING_TEMPLATE_UI_TEXT } from './pricing-templates.constants';
import { PricingTemplate, PricingTemplatePayload, PricingTemplatesService } from './pricing-templates.service';

interface PricingTemplateRow extends GomTableRow {
  _id: string;
  name: string;
  description: string;
  fieldKeys: string;
  categories: string;
  status: string;
}

@Component({
  selector: 'gom-pricing-templates',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule, GomButtonComponent, GomTableComponent, GomModalComponent, GomInputComponent, GomSelectComponent, GomTextareaComponent, GomConfirmationModalComponent, DisableIfNoFeatureDirective],
  templateUrl: './pricing-templates.component.html',
  styleUrl: './pricing-templates.component.scss',
})
export class PricingTemplatesComponent implements OnInit {
  private readonly service = inject(PricingTemplatesService);
  private readonly toast = inject(GomAlertToastService);
  private readonly translate = inject(TranslateService);
  private readonly fb = inject(FormBuilder);
  private readonly authSession = inject(AuthSessionService);

  readonly text = PRICING_TEMPLATE_UI_TEXT;
  readonly statusOptions = PRICING_TEMPLATE_STATUS_OPTIONS;
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly items = signal<PricingTemplate[]>([]);
  readonly totalItems = signal(0);
  readonly pageIndex = signal(0);
  readonly pageSize = signal(50);
  readonly canLoadAll = signal(false);
  readonly allLoaded = signal(false);
  readonly viewMode = computed<'client' | 'server'>(() => (this.totalItems() > 500 && !this.allLoaded() ? 'server' : 'client'));
  readonly formOpen = signal(false);
  readonly selected = signal<PricingTemplate | null>(null);
  readonly deleteConfirmOpen = signal(false);
  readonly pendingDelete = signal<PricingTemplate | null>(null);
  readonly canCreate = computed(() => this.authSession.hasFeature('pricingTemplate.create'));
  readonly canEdit = computed(() => this.authSession.hasFeature('pricingTemplate.edit'));
  readonly canDelete = computed(() => this.authSession.hasFeature('pricingTemplate.delete'));

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    description: [''],
    actualPriceFormula: ['', [Validators.required]],
    sellingPriceFormula: ['', [Validators.required]],
    anchorPriceFormula: ['', [Validators.required]],
    supportedFieldKeys: ['', [Validators.required]],
    categoryIds: [''],
    status: [PRICING_TEMPLATE_DEFAULT_STATUS, [Validators.required]],
  });

  readonly columns: GomTableColumn<PricingTemplateRow>[] = [
    { key: 'name', header: '', sortable: true, filterable: true, width: '16rem' },
    { key: 'description', header: '', sortable: true, width: '16rem', textMode: 'wrap' },
    { key: 'fieldKeys', header: '', width: '18rem', textMode: 'wrap' },
    { key: 'categories', header: '', width: '14rem', textMode: 'wrap' },
    { key: 'status', header: '', sortable: true, width: '10rem' },
    { key: 'id', header: '', width: '10rem', actionButtons: [] },
  ];

  readonly rows = computed<PricingTemplateRow[]>(() =>
    this.items().map((item) => ({
      _id: item._id || '',
      name: item.name,
      description: item.description || '-',
      fieldKeys: item.supportedFieldKeys?.length ? item.supportedFieldKeys.join(', ') : '-',
      categories: item.categoryIds?.length ? item.categoryIds.join(', ') : '-',
      status: item.status,
    }))
  );

  constructor() {
    this.rebuildText();
    this.translate.onLangChange.subscribe(() => this.rebuildText());
  }

  ngOnInit(): void {
    this.load();
  }

  onAddNew(): void {
    if (!this.canCreate()) return;
    this.selected.set(null);
    this.form.reset({
      name: '',
      description: '',
      actualPriceFormula: '',
      sellingPriceFormula: '',
      anchorPriceFormula: '',
      supportedFieldKeys: '',
      categoryIds: '',
      status: PRICING_TEMPLATE_DEFAULT_STATUS,
    });
    this.formOpen.set(true);
  }

  onQueryChange(query: GomTableQuery): void {
    if (this.viewMode() !== 'server') return;
    this.loading.set(true);
    this.errorMessage.set(null);
    this.service.getPricingTemplates({ page: query.pageIndex + 1, limit: query.pageSize, search: query.searchTerm?.trim(), sortBy: query.sort?.key, order: query.sort?.direction as 'asc' | 'desc' | undefined }).subscribe({
      next: (response) => {
        this.items.set(response.data ?? []);
        this.totalItems.set(response.pagination.total);
        this.pageIndex.set(query.pageIndex);
        this.pageSize.set(query.pageSize);
        this.canLoadAll.set(response.pagination.canLoadAll);
        this.allLoaded.set(false);
        this.loading.set(false);
      },
      error: (error) => this.handleError(error, this.text.errorLoad),
    });
  }

  onAction(event: { actionKey: string; row: GomTableRow }): void {
    const id = String(event.row['_id'] || '');
    const item = this.items().find((row) => row._id === id);
    if (!item) return;

    if (event.actionKey === 'edit') {
      if (!this.canEdit()) return;
      this.selected.set(item);
      this.form.patchValue({
        name: item.name,
        description: item.description,
        actualPriceFormula: item.actualPriceFormula,
        sellingPriceFormula: item.sellingPriceFormula,
        anchorPriceFormula: item.anchorPriceFormula,
        supportedFieldKeys: item.supportedFieldKeys?.join(', ') || '',
        categoryIds: item.categoryIds?.join(', ') || '',
        status: item.status,
      });
      this.formOpen.set(true);
      return;
    }

    if (event.actionKey === 'delete') {
      if (!this.canDelete()) return;
      this.pendingDelete.set(item);
      this.deleteConfirmOpen.set(true);
    }
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const supportedFieldKeys = raw.supportedFieldKeys.split(',').map((item) => item.trim()).filter(Boolean);
    if (!supportedFieldKeys.length) {
      this.form.controls.supportedFieldKeys.setErrors({ required: true });
      return;
    }

    const payload: PricingTemplatePayload = {
      name: raw.name.trim(),
      description: raw.description.trim(),
      actualPriceFormula: raw.actualPriceFormula.trim(),
      sellingPriceFormula: raw.sellingPriceFormula.trim(),
      anchorPriceFormula: raw.anchorPriceFormula.trim(),
      supportedFieldKeys,
      categoryIds: raw.categoryIds.split(',').map((item) => item.trim()).filter(Boolean),
      status: raw.status,
    };

    this.loading.set(true);
    const wasEdit = !!this.selected()?._id;
    const request = wasEdit && this.selected()?._id
      ? this.service.updatePricingTemplate(this.selected()!._id!, payload)
      : this.service.createPricingTemplate(payload);

    request.subscribe({
      next: () => {
        this.formOpen.set(false);
        this.selected.set(null);
        this.toast.success(this.translate.instant(wasEdit ? this.text.successUpdate : this.text.successCreate));
        this.load();
      },
      error: (error) => this.handleError(error, this.text.errorSave),
    });
  }

  cancelForm(): void {
    this.formOpen.set(false);
    this.selected.set(null);
  }

  cancelDelete(): void {
    this.deleteConfirmOpen.set(false);
    this.pendingDelete.set(null);
  }

  confirmDelete(): void {
    const item = this.pendingDelete();
    if (!item?._id) {
      this.cancelDelete();
      return;
    }

    this.loading.set(true);
    this.service.deletePricingTemplate(item._id, true).subscribe({
      next: () => {
        this.deleteConfirmOpen.set(false);
        this.pendingDelete.set(null);
        this.toast.success(this.translate.instant(this.text.successDelete));
        this.load();
      },
      error: (error) => this.handleError(error, this.text.errorDelete),
    });
  }

  private load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.service.getPricingTemplates({ page: 1, limit: 50 }).subscribe({
      next: (response) => {
        this.items.set(response.data ?? []);
        this.totalItems.set(response.pagination.total);
        this.canLoadAll.set(response.pagination.canLoadAll);
        this.allLoaded.set(response.pagination.total <= 500);
        this.loading.set(false);
      },
      error: (error) => this.handleError(error, this.text.errorLoad),
    });
  }

  private handleError(error: unknown, fallbackKey: keyof typeof PRICING_TEMPLATE_UI_TEXT): void {
    console.error('Pricing templates error:', error);
    const message = this.translate.instant(fallbackKey);
    this.errorMessage.set(message);
    this.toast.error(message);
    this.loading.set(false);
  }

  private rebuildText(): void {
    this.columns[0].header = this.translate.instant(this.text.nameLabel);
    this.columns[1].header = this.translate.instant(this.text.descriptionLabel);
    this.columns[2].header = this.translate.instant(this.text.fieldKeysLabel);
    this.columns[3].header = this.translate.instant(this.text.categoriesLabel);
    this.columns[4].header = this.translate.instant(this.text.statusLabel);
    this.columns[5].header = this.translate.instant(this.text.actionsLabel);
    this.columns[5].actionButtons = [
      { label: this.translate.instant(this.text.editAction), actionKey: 'edit', variant: 'secondary' },
      { label: this.translate.instant(this.text.deleteAction), actionKey: 'delete', variant: 'secondary' },
    ];
  }
}
