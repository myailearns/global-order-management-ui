import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { forkJoin } from 'rxjs';

import { GomAlertToastService } from '@gomlibs/ui';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { GomButtonComponent } from '@gomlibs/ui';
import { GomConfirmationModalComponent } from '@gomlibs/ui';
import { GomTableColumn, GomTableComponent, GomTableRow } from '@gomlibs/ui';
import { CategoryOption, FieldGroup, FieldGroupPayload, FieldGroupsService, PricingField, ProductGroupUsage } from './field-groups.service';
import { FieldGroupsFormComponent } from './form/field-groups-form.component';

interface FieldGroupRow extends GomTableRow {
  _id: string;
  name: string;
  fieldsCount: string;
  version: string;
  status: string;
  actions: string;
}

@Component({
  selector: 'gom-field-groups',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    GomButtonComponent,
    GomTableComponent,
    GomConfirmationModalComponent,
    FieldGroupsFormComponent,
  ],
  templateUrl: './field-groups.component.html',
  styleUrl: './field-groups.component.scss',
})
export class FieldGroupsComponent implements OnInit {
  private readonly fieldGroupsService = inject(FieldGroupsService);
  private readonly toast = inject(GomAlertToastService);
  private readonly translate = inject(TranslateService);
  private readonly authSession = inject(AuthSessionService);

  readonly columns: GomTableColumn<FieldGroupRow>[] = [
    { key: 'name', header: '', sortable: true, filterable: true, width: '20rem' },
    { key: 'fieldsCount', header: '', sortable: true, width: '10rem' },
    { key: 'version', header: '', sortable: true, width: '8rem' },
    { key: 'status', header: '', sortable: true, filterable: true, width: '10rem' },
    {
      key: 'actions',
      header: '',
      width: '12rem',
      actionButtons: [],
    },
  ];

  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly canCreateFieldGroup = computed(() => this.authSession.hasFeature('fieldGroup.create'));
  readonly canEditFieldGroup = computed(() => this.authSession.hasFeature('fieldGroup.edit'));
  readonly canDeleteFieldGroup = computed(() => this.authSession.hasFeature('fieldGroup.delete'));
  readonly formOpen = signal(false);
  readonly deleteConfirmOpen = signal(false);
  readonly selectedFieldGroup = signal<FieldGroup | null>(null);
  readonly pendingDeleteFieldGroup = signal<FieldGroup | null>(null);

  readonly fieldGroups = signal<FieldGroup[]>([]);
  readonly fields = signal<PricingField[]>([]);
  readonly groups = signal<ProductGroupUsage[]>([]);
  readonly categories = signal<CategoryOption[]>([]);

  readonly rows = computed<FieldGroupRow[]>(() =>
    this.fieldGroups().map((fieldGroup) => ({
      _id: fieldGroup._id,
      name: fieldGroup.name,
      fieldsCount: String(fieldGroup.fields.length),
      version: `v${fieldGroup.version}`,
      status: fieldGroup.status,
      actions: '',
    }))
  );

  constructor() {
    this.translate.onLangChange.subscribe(() => this.rebuildStaticText());
    this.rebuildStaticText();
  }

  ngOnInit(): void {
    this.loadData();
  }

  onAddFieldGroup(): void {
    if (!this.canCreateFieldGroup()) {
      return;
    }

    this.selectedFieldGroup.set(null);
    this.errorMessage.set(null);
    this.formOpen.set(true);
  }

  onRowAction(event: { actionKey: string; row: GomTableRow }): void {
    const fieldGroupId = typeof event.row['_id'] === 'string' ? event.row['_id'] : '';
    const fieldGroup = this.fieldGroups().find((item) => item._id === fieldGroupId);
    if (!fieldGroup) {
      return;
    }

    if (event.actionKey === 'edit') {
      if (!this.canEditFieldGroup()) {
        return;
      }
      this.selectedFieldGroup.set(fieldGroup);
      this.errorMessage.set(null);
      this.formOpen.set(true);
      return;
    }

    if (event.actionKey === 'delete') {
      if (!this.canDeleteFieldGroup()) {
        return;
      }
      this.pendingDeleteFieldGroup.set(fieldGroup);
      this.deleteConfirmOpen.set(true);
    }
  }

  onFormSubmit(payload: FieldGroupPayload): void {
    const isEdit = !!this.selectedFieldGroup()?._id;
    const canProceed = isEdit ? this.canEditFieldGroup() : this.canCreateFieldGroup();
    if (!canProceed) {
      return;
    }

    const enteredName = payload.name.toLowerCase();
    const editingId = this.selectedFieldGroup()?._id || null;
    const hasDuplicateName = this.fieldGroups().some((item) => {
      if (editingId && item._id === editingId) {
        return false;
      }
      return String(item.name || '').trim().toLowerCase() === enteredName;
    });

    if (hasDuplicateName) {
      const duplicateMessage = this.translate.instant('fieldGroups.validation.nameDuplicate');
      this.errorMessage.set(duplicateMessage);
      this.toast.error(duplicateMessage);
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    const selected = this.selectedFieldGroup();
    const request = selected?._id
      ? this.fieldGroupsService.updateFieldGroup(selected._id, payload)
      : this.fieldGroupsService.createFieldGroup(payload);

    request.subscribe({
      next: () => {
        this.formOpen.set(false);
        this.selectedFieldGroup.set(null);
        this.toast.success(this.translate.instant(selected ? 'fieldGroups.toast.successUpdate' : 'fieldGroups.toast.successCreate'));
        this.loadData();
      },
      error: (error) => {
        console.error('Error saving field group:', error);
        const apiMessage = this.extractApiMessage(error);
        const message = apiMessage || this.translate.instant('fieldGroups.toast.errorSave');
        this.errorMessage.set(message);
        this.toast.error(message);
        this.loading.set(false);
      },
    });
  }

  onFormCancel(): void {
    this.formOpen.set(false);
    this.selectedFieldGroup.set(null);
  }

  cancelDelete(): void {
    this.deleteConfirmOpen.set(false);
    this.pendingDeleteFieldGroup.set(null);
  }

  confirmDelete(): void {
    if (!this.canDeleteFieldGroup()) {
      this.cancelDelete();
      return;
    }

    const fieldGroup = this.pendingDeleteFieldGroup();
    if (!fieldGroup?._id) {
      this.cancelDelete();
      return;
    }

    this.loading.set(true);
    this.deleteConfirmOpen.set(false);
    this.errorMessage.set(null);

    this.fieldGroupsService.deleteFieldGroup(fieldGroup._id, true).subscribe({
      next: () => {
        this.pendingDeleteFieldGroup.set(null);
        this.toast.success(this.translate.instant('fieldGroups.toast.successDelete'));
        this.loadData();
      },
      error: (error) => {
        console.error('Error deleting field group:', error);
        const apiMessage = this.extractApiMessage(error);
        const message = apiMessage || this.translate.instant('fieldGroups.toast.errorDelete');
        this.errorMessage.set(message);
        this.toast.error(message);
        this.pendingDeleteFieldGroup.set(null);
        this.loading.set(false);
      },
    });
  }

  getDeleteMessage(): string {
    return this.translate.instant('fieldGroups.deleteConfirm.message', {
      name: this.pendingDeleteFieldGroup()?.name || '',
    });
  }

  private loadData(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    forkJoin({
      fieldGroups: this.fieldGroupsService.listFieldGroups(),
      fields: this.fieldGroupsService.listFields(),
      groups: this.fieldGroupsService.listGroups(),
      categories: this.fieldGroupsService.listCategories(),
    }).subscribe({
      next: (result) => {
        this.fieldGroups.set(result.fieldGroups.data ?? []);
        this.fields.set(result.fields.data ?? []);
        this.groups.set(result.groups.data ?? []);
        this.categories.set(result.categories.data ?? []);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading field groups:', error);
        this.errorMessage.set(this.translate.instant('fieldGroups.toast.errorLoad'));
        this.loading.set(false);
      },
    });
  }

  private extractApiMessage(error: unknown): string {
    const maybeError = error as {
      error?: { message?: string; error?: string };
      message?: string;
    };

    const message = maybeError?.error?.message
      || maybeError?.error?.error
      || maybeError?.message
      || '';

    return typeof message === 'string' ? message.trim() : '';
  }

  private rebuildStaticText(): void {
    this.columns[0].header = this.translate.instant('fieldGroups.labels.name');
    this.columns[1].header = this.translate.instant('fieldGroups.labels.fields');
    this.columns[2].header = this.translate.instant('fieldGroups.labels.version');
    this.columns[3].header = this.translate.instant('fieldGroups.labels.status');
    this.columns[3].format = (value) =>
      value === 'INACTIVE'
        ? this.translate.instant('common.status.inactive')
        : this.translate.instant('common.status.active');
    this.columns[4].header = this.translate.instant('common.labels.actions');
    const actionButtons: Array<{ label: string; actionKey: string; variant: 'secondary' }> = [];
    if (this.canEditFieldGroup()) {
      actionButtons.push({ label: this.translate.instant('common.actions.edit'), actionKey: 'edit', variant: 'secondary' });
    }
    if (this.canDeleteFieldGroup()) {
      actionButtons.push({ label: this.translate.instant('common.actions.delete'), actionKey: 'delete', variant: 'secondary' });
    }
    this.columns[4].actionButtons = actionButtons;
  }
}
