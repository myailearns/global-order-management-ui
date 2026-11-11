import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { GomAlertToastService, GomButtonComponent, GomConfirmationModalComponent, GomInputComponent, GomModalComponent, GomSelectComponent, GomTableColumn, GomTableComponent, GomTableQuery, GomTableRow, GomTextareaComponent } from '@gomlibs/ui';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { DisableIfNoFeatureDirective } from '../../../shared/directives/disable-if-no-feature.directive';
import { ATTRIBUTE_DEFAULT_STATUS, ATTRIBUTE_UI_TEXT } from './attributes.constants';
import { AttributeDefinition, AttributeDefinitionPayload, AttributesService } from './attributes.service';
import { getNavIcon } from '../../../shared/components/layout/nav.config';
import { PageHeadingComponent } from '../../../shared/components/page-heading/page-heading.component';

interface AttributeRow extends GomTableRow {
  _id: string;
  name: string;
  key: string;
  allowedValues: string;
  status: string;
}

@Component({
  selector: 'gom-attributes',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule, GomButtonComponent, GomTableComponent, GomModalComponent, GomInputComponent, GomSelectComponent, GomTextareaComponent, GomConfirmationModalComponent, DisableIfNoFeatureDirective, PageHeadingComponent],
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
  readonly headingIcon = getNavIcon('/masters/attributes');
  readonly statusOptions: { label: string; value: string }[] = [];
  readonly viewportWidth = signal<number>(window.innerWidth);
  readonly isMobileHeader = computed<boolean>(() => this.viewportWidth() <= 768);
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
    allowedValues: ['', []],
    status: [ATTRIBUTE_DEFAULT_STATUS as string, [Validators.required]],
  });

  readonly columns: GomTableColumn<AttributeRow>[] = [
    { key: 'name', header: '', sortable: true, filterable: true, width: '18rem' },
    { key: 'allowedValues', header: '', width: '22rem', textMode: 'wrap' },
    { key: 'status', header: '', sortable: true, width: '12rem' },
    { key: 'id', header: '', width: '10rem', actionButtons: [] },
  ];

  readonly rows = computed<AttributeRow[]>(() =>
    this.items().map((item) => ({
      _id: item._id || '',
      name: item.name,
      key: item.key,
      allowedValues: item.allowedValues?.join(', ') || '-',
      status: item.status,
    }))
  );

  constructor() {
    this.rebuildText();
    this.rebuildStatusOptions();
    this.translate.onLangChange.subscribe(() => this.rebuildText());
    this.translate.onLangChange.subscribe(() => this.rebuildStatusOptions());
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.viewportWidth.set(window.innerWidth);
  }

  ngOnInit(): void {
    this.load();
  }

  onAddNew(): void {
    if (!this.canCreate()) return;
    this.selected.set(null);
    this.form.reset({
      name: '',
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
    const rawId = event.row['_id'];
    const id = typeof rawId === 'string' ? rawId : '';
    const item = this.items().find((row) => row._id === id);
    if (!item) return;

    if (event.actionKey === 'edit') {
      if (!this.canEdit()) return;
      this.selected.set(item);
      this.form.patchValue({
        name: item.name,
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
    const generatedKey = this.generateAttributeKey(raw.name);
    const payload: AttributeDefinitionPayload = {
      name: raw.name.trim(),
      key: this.selected()?.key?.trim().toLowerCase() || generatedKey,
      allowedValues: raw.allowedValues.trim().split(',').map((item) => item.trim()).filter(Boolean),
      status: raw.status as any,
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

  private handleError(error: unknown, fallbackKey: string): void {
    console.error('Attributes error:', error);
    const apiMessage = String((error as { error?: { message?: string } })?.error?.message || '').toLowerCase();
    const message = apiMessage.includes('duplicate') || apiMessage.includes('already exists') || apiMessage.includes('e11000')
      ? 'An attribute with the same name or key already exists.'
      : this.translate.instant(fallbackKey);
    this.errorMessage.set(message);
    this.toast.error(message);
    this.loading.set(false);
  }

  private rebuildText(): void {
    this.columns[0].header = this.translate.instant(this.text.nameLabel);
    this.columns[1].header = this.translate.instant(this.text.allowedValuesLabel);
    this.columns[2].header = this.translate.instant(this.text.statusLabel);
    this.columns[2].format = (value) =>
      value === 'INACTIVE'
        ? this.translate.instant('common.status.inactive')
        : this.translate.instant('common.status.active');
    this.columns[3].header = this.translate.instant(this.text.actionsLabel);
    this.columns[3].actionButtons = [
      { label: this.translate.instant(this.text.editAction), icon: 'ri-pencil-line', actionKey: 'edit', variant: 'secondary' },
      { label: this.translate.instant(this.text.deleteAction), icon: 'ri-delete-bin-line', actionKey: 'delete', variant: 'secondary' },
    ];
  }

  private rebuildStatusOptions(): void {
    this.statusOptions.length = 0;
    this.statusOptions.push(
      { label: this.translate.instant('common.status.active'), value: 'ACTIVE' },
      { label: this.translate.instant('common.status.inactive'), value: 'INACTIVE' },
    );
  }

  private generateAttributeKey(rawName: string): string {
    const tokens = rawName
      .trim()
      .toLowerCase()
      .split(/[^a-zA-Z0-9]+/)
      .filter((token) => token.length > 0);

    if (tokens.length === 0) {
      return '';
    }

    const [first, ...rest] = tokens;
    const suffix = rest
      .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
      .join('');

    return `${first}${suffix}`;
  }
}
