import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { GomAlertToastService, GomButtonComponent, GomConfirmationModalComponent, GomInputComponent, GomModalComponent, GomSelectComponent, GomTableColumn, GomTableComponent, GomTableQuery, GomTableRow, GomTextareaComponent } from '@gomlibs/ui';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { DisableIfNoFeatureDirective } from '../../../shared/directives/disable-if-no-feature.directive';
import { ATTRIBUTE_DEFAULT_INPUT_TYPE, ATTRIBUTE_DEFAULT_STATUS, ATTRIBUTE_INPUT_TYPE_OPTIONS, ATTRIBUTE_STATUS_OPTIONS, ATTRIBUTE_UI_TEXT } from './attributes.constants';
import { AttributeDefinition, AttributeDefinitionPayload, AttributesService } from './attributes.service';

interface AttributeRow extends GomTableRow {
  _id: string;
  name: string;
  key: string;
  label: string;
  inputType: string;
  allowedValues: string;
  status: string;
}

@Component({
  selector: 'gom-attributes',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule, GomButtonComponent, GomTableComponent, GomModalComponent, GomInputComponent, GomSelectComponent, GomTextareaComponent, GomConfirmationModalComponent, DisableIfNoFeatureDirective],
  templateUrl: './attributes.component.html',
  styleUrl: './attributes.component.scss',
})
export class AttributesComponent implements OnInit {
  private readonly service = inject(AttributesService);
  private readonly toast = inject(GomAlertToastService);
  private readonly translate = inject(TranslateService);
  private readonly fb = inject(FormBuilder);
  private readonly authSession = inject(AuthSessionService);

  readonly text = ATTRIBUTE_UI_TEXT;
  readonly inputTypeOptions = ATTRIBUTE_INPUT_TYPE_OPTIONS;
  readonly statusOptions = ATTRIBUTE_STATUS_OPTIONS;
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly items = signal<AttributeDefinition[]>([]);
  readonly totalItems = signal(0);
  readonly pageIndex = signal(0);
  readonly pageSize = signal(50);
  readonly canLoadAll = signal(false);
  readonly allLoaded = signal(false);
  readonly viewMode = computed<'client' | 'server'>(() => (this.totalItems() > 500 && !this.allLoaded() ? 'server' : 'client'));
  readonly formOpen = signal(false);
  readonly selected = signal<AttributeDefinition | null>(null);
  readonly deleteConfirmOpen = signal(false);
  readonly pendingDelete = signal<AttributeDefinition | null>(null);

  readonly canCreate = computed(() => this.authSession.hasFeature('attribute.create'));
  readonly canEdit = computed(() => this.authSession.hasFeature('attribute.edit'));
  readonly canDelete = computed(() => this.authSession.hasFeature('attribute.delete'));

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    key: ['', [Validators.required, Validators.pattern(/^[a-z0-9._-]{2,80}$/)]],
    label: ['', [Validators.required, Validators.minLength(2)]],
    inputType: [ATTRIBUTE_DEFAULT_INPUT_TYPE, [Validators.required]],
    allowedValues: ['', []],
    status: [ATTRIBUTE_DEFAULT_STATUS, [Validators.required]],
  });

  readonly columns: GomTableColumn<AttributeRow>[] = [
    { key: 'name', header: '', sortable: true, filterable: true, width: '16rem' },
    { key: 'key', header: '', sortable: true, filterable: true, width: '14rem' },
    { key: 'label', header: '', sortable: true, filterable: true, width: '14rem' },
    { key: 'inputType', header: '', sortable: true, width: '12rem' },
    { key: 'allowedValues', header: '', width: '16rem', textMode: 'wrap' },
    { key: 'status', header: '', sortable: true, width: '10rem' },
    { key: 'id', header: '', width: '10rem', actionButtons: [] },
  ];

  readonly rows = computed<AttributeRow[]>(() =>
    this.items().map((item) => ({
      _id: item._id || '',
      name: item.name,
      key: item.key,
      label: item.label,
      inputType: item.inputType,
      allowedValues: item.allowedValues?.join(', ') || '-',
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
      key: '',
      label: '',
      inputType: ATTRIBUTE_DEFAULT_INPUT_TYPE,
      allowedValues: '',
      status: ATTRIBUTE_DEFAULT_STATUS,
    });
    this.formOpen.set(true);
  }

  onQueryChange(query: GomTableQuery): void {
    if (this.viewMode() !== 'server') {
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);
    this.service.getAttributes({ page: query.pageIndex + 1, limit: query.pageSize, search: query.searchTerm?.trim(), sortBy: query.sort?.key, order: query.sort?.direction as 'asc' | 'desc' | undefined }).subscribe({
      next: (response) => {
        this.items.set(response.data ?? []);
        this.totalItems.set(response.pagination.total);
        this.canLoadAll.set(response.pagination.canLoadAll);
        this.pageIndex.set(query.pageIndex);
        this.pageSize.set(query.pageSize);
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
        key: item.key,
        label: item.label,
        inputType: item.inputType,
        allowedValues: item.allowedValues?.join(', ') || '',
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
    const payload: AttributeDefinitionPayload = {
      name: raw.name.trim(),
      key: raw.key.trim().toLowerCase(),
      label: raw.label.trim(),
      inputType: raw.inputType,
      allowedValues: raw.allowedValues.split(',').map((item) => item.trim()).filter(Boolean),
      status: raw.status,
    };

    this.loading.set(true);
    const wasEdit = !!this.selected()?._id;
    const request = this.selected()?._id
      ? this.service.updateAttribute(this.selected()!._id!, payload)
      : this.service.createAttribute(payload);

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
    this.service.deleteAttribute(item._id, true).subscribe({
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
    this.service.getAttributes({ page: 1, limit: 50 }).subscribe({
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

  private handleError(error: unknown, fallbackKey: keyof typeof ATTRIBUTE_UI_TEXT): void {
    console.error('Attributes error:', error);
    const message = this.translate.instant(fallbackKey);
    this.errorMessage.set(message);
    this.toast.error(message);
    this.loading.set(false);
  }

  private rebuildText(): void {
    this.columns[0].header = this.translate.instant(this.text.nameLabel);
    this.columns[1].header = this.translate.instant(this.text.keyLabel);
    this.columns[2].header = this.translate.instant(this.text.labelLabel);
    this.columns[3].header = this.translate.instant(this.text.inputTypeLabel);
    this.columns[4].header = this.translate.instant(this.text.allowedValuesLabel);
    this.columns[5].header = this.translate.instant(this.text.statusLabel);
    this.columns[6].header = this.translate.instant(this.text.actionsLabel);
    this.columns[6].actionButtons = [
      { label: this.translate.instant(this.text.editAction), actionKey: 'edit', variant: 'secondary' },
      { label: this.translate.instant(this.text.deleteAction), actionKey: 'delete', variant: 'secondary' },
    ];
  }
}
