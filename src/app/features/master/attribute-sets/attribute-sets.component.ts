import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { GomAlertToastService, GomButtonComponent, GomConfirmationModalComponent, GomInputComponent, GomModalComponent, GomSelectComponent, GomTableColumn, GomTableComponent, GomTableQuery, GomTableRow, GomTextareaComponent } from '@gomlibs/ui';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { DisableIfNoFeatureDirective } from '../../../shared/directives/disable-if-no-feature.directive';
import { ATTRIBUTE_SET_DEFAULT_STATUS, ATTRIBUTE_SET_REQUIRED_OPTIONS, ATTRIBUTE_SET_STATUS_OPTIONS, ATTRIBUTE_SET_UI_TEXT } from './attribute-sets.constants';
import { AttributeDefinitionOption, AttributeSet, AttributeSetItem, AttributeSetPayload, AttributeSetsService, CategoryOption } from './attribute-sets.service';

interface AttributeSetRow extends GomTableRow {
  _id: string;
  name: string;
  description: string;
  attributes: string;
  categories: string;
  status: string;
}

@Component({
  selector: 'gom-attribute-sets',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule, GomButtonComponent, GomTableComponent, GomModalComponent, GomInputComponent, GomSelectComponent, GomTextareaComponent, GomConfirmationModalComponent, DisableIfNoFeatureDirective],
  templateUrl: './attribute-sets.component.html',
  styleUrl: './attribute-sets.component.scss',
})
export class AttributeSetsComponent implements OnInit {
  private readonly service = inject(AttributeSetsService);
  private readonly toast = inject(GomAlertToastService);
  private readonly translate = inject(TranslateService);
  private readonly fb = inject(FormBuilder);
  private readonly authSession = inject(AuthSessionService);

  readonly text = ATTRIBUTE_SET_UI_TEXT;
  readonly statusOptions = ATTRIBUTE_SET_STATUS_OPTIONS;
  readonly requiredOptions = ATTRIBUTE_SET_REQUIRED_OPTIONS;
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly items = signal<AttributeSet[]>([]);
  readonly totalItems = signal(0);
  readonly pageIndex = signal(0);
  readonly pageSize = signal(50);
  readonly canLoadAll = signal(false);
  readonly allLoaded = signal(false);
  readonly viewMode = computed<'client' | 'server'>(() => (this.totalItems() > 500 && !this.allLoaded() ? 'server' : 'client'));
  readonly formOpen = signal(false);
  readonly selected = signal<AttributeSet | null>(null);
  readonly deleteConfirmOpen = signal(false);
  readonly pendingDelete = signal<AttributeSet | null>(null);
  readonly attributes = signal<AttributeDefinitionOption[]>([]);
  readonly categories = signal<CategoryOption[]>([]);
  readonly attributeOptions = computed(() => this.attributes().map((item) => ({ value: item._id, label: `${item.name} (${item.key})` })));
  readonly categoryOptions = computed(() => this.categories().filter((item) => item.status === 'ACTIVE').map((item) => ({ value: item._id, label: item.name })));
  readonly canCreate = computed(() => this.authSession.hasFeature('attributeSet.create'));
  readonly canEdit = computed(() => this.authSession.hasFeature('attributeSet.edit'));
  readonly canDelete = computed(() => this.authSession.hasFeature('attributeSet.delete'));

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    description: [''],
    attributes: ['' as string, [Validators.required]],
    categories: ['' as string],
    status: [ATTRIBUTE_SET_DEFAULT_STATUS, [Validators.required]],
  });

  readonly columns: GomTableColumn<AttributeSetRow>[] = [
    { key: 'name', header: '', sortable: true, filterable: true, width: '16rem' },
    { key: 'description', header: '', sortable: true, width: '16rem', textMode: 'wrap' },
    { key: 'attributes', header: '', width: '18rem', textMode: 'wrap' },
    { key: 'categories', header: '', width: '14rem', textMode: 'wrap' },
    { key: 'status', header: '', sortable: true, width: '10rem' },
    { key: 'id', header: '', width: '10rem', actionButtons: [] },
  ];

  readonly rows = computed<AttributeSetRow[]>(() =>
    this.items().map((item) => ({
      _id: item._id || '',
      name: item.name,
      description: item.description || '-',
      attributes: item.attributes?.length ? item.attributes.map((a) => a.attributeId).join(', ') : '-',
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
    this.form.reset({ name: '', description: '', attributes: '', categories: '', status: ATTRIBUTE_SET_DEFAULT_STATUS });
    this.formOpen.set(true);
  }

  onQueryChange(query: GomTableQuery): void {
    if (this.viewMode() !== 'server') return;
    this.loading.set(true);
    this.errorMessage.set(null);
    this.service.getAttributeSets({ page: query.pageIndex + 1, limit: query.pageSize, search: query.searchTerm?.trim(), sortBy: query.sort?.key, order: query.sort?.direction as 'asc' | 'desc' | undefined }).subscribe({
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
        attributes: item.attributes?.map((attr) => attr.attributeId).join(', ') || '',
        categories: item.categoryIds?.join(', ') || '',
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
    const attributeIds = raw.attributes.split(',').map((item) => item.trim()).filter(Boolean);
    if (!attributeIds.length) {
      this.form.controls.attributes.setErrors({ required: true });
      return;
    }

    const payload: AttributeSetPayload = {
      name: raw.name.trim(),
      description: raw.description.trim(),
      attributes: attributeIds.map((attributeId, index) => ({ attributeId, order: index + 1, requiredOverride: null })),
      categoryIds: raw.categories.split(',').map((item) => item.trim()).filter(Boolean),
      status: raw.status,
    };

    this.loading.set(true);
    const wasEdit = !!this.selected()?._id;
    const request = wasEdit && this.selected()?._id
      ? this.service.updateAttributeSet(this.selected()!._id!, payload)
      : this.service.createAttributeSet(payload);

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
    this.service.deleteAttributeSet(item._id, true).subscribe({
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
    this.service.getAttributeSets({ page: 1, limit: 50 }).subscribe({
      next: (response) => {
        this.items.set(response.data ?? []);
        this.totalItems.set(response.pagination.total);
        this.canLoadAll.set(response.pagination.canLoadAll);
        this.allLoaded.set(response.pagination.total <= 500);
        this.loading.set(false);
      },
      error: (error) => this.handleError(error, this.text.errorLoad),
    });

    this.service.getAttributes({ page: 1, limit: 500, status: 'ACTIVE' }).subscribe({ next: (response) => this.attributes.set(response.data ?? []) });
    this.service.listCategories({ page: 1, limit: 500, status: 'ACTIVE' }).subscribe({ next: (response) => this.categories.set(response.data ?? []) });
  }

  private handleError(error: unknown, fallbackKey: keyof typeof ATTRIBUTE_SET_UI_TEXT): void {
    console.error('Attribute sets error:', error);
    const message = this.translate.instant(fallbackKey);
    this.errorMessage.set(message);
    this.toast.error(message);
    this.loading.set(false);
  }

  private rebuildText(): void {
    this.columns[0].header = this.translate.instant(this.text.nameLabel);
    this.columns[1].header = this.translate.instant(this.text.descriptionLabel);
    this.columns[2].header = this.translate.instant(this.text.attributesLabel);
    this.columns[3].header = this.translate.instant(this.text.categoriesLabel);
    this.columns[4].header = this.translate.instant(this.text.statusLabel);
    this.columns[5].header = this.translate.instant(this.text.actionsLabel);
    this.columns[5].actionButtons = [
      { label: this.translate.instant(this.text.editAction), actionKey: 'edit', variant: 'secondary' },
      { label: this.translate.instant(this.text.deleteAction), actionKey: 'delete', variant: 'secondary' },
    ];
  }
}
