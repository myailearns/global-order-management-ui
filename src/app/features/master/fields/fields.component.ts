import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { forkJoin, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { GomAlertToastService } from '@gomlibs/ui';
import { GomConfirmationModalComponent } from '@gomlibs/ui';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { FIELD_DEFAULT_STATUS, FIELD_DEFAULT_TYPE, FIELD_UI_TEXT } from './fields.constants';
import { Field, FieldGroupUpdatePayload, FieldGroupUsage, FieldsService } from './fields.service';
import { FieldAction, FieldsListComponent } from './list/fields-list.component';
import { FieldFormData, FieldFormSubmitData, FieldGroupAssignOption, FieldsFormComponent } from './form/fields-form.component';
import { FieldsViewComponent } from './view/fields-view.component';

@Component({
  selector: 'gom-fields',
  standalone: true,
  imports: [CommonModule, TranslateModule, FieldsListComponent, FieldsFormComponent, FieldsViewComponent, GomConfirmationModalComponent],
  templateUrl: './fields.component.html',
  styleUrl: './fields.component.scss',
})
export class FieldsComponent implements OnInit {
  private readonly fieldsService = inject(FieldsService);
  private readonly toast = inject(GomAlertToastService);
  private readonly translate = inject(TranslateService);
  private readonly authSession = inject(AuthSessionService);

  readonly text = FIELD_UI_TEXT;
  readonly defaultStatus = FIELD_DEFAULT_STATUS;
  readonly defaultType = FIELD_DEFAULT_TYPE;
  readonly canViewField = computed(() => this.authSession.hasFeature('field.list'));
  readonly canCreateField = computed(() => this.authSession.hasFeature('field.create'));
  readonly canEditField = computed(() => this.authSession.hasFeature('field.edit'));
  readonly canDeleteField = computed(() => this.authSession.hasFeature('field.delete'));
  readonly canViewFieldGroups = computed(() => this.authSession.hasFeature('fieldGroup.list'));

  fields = signal<Field[]>([]);
  fieldGroups = signal<FieldGroupUsage[]>([]);
  loading = signal(false);
  formOpen = signal(false);
  selectedField = signal<Field | null>(null);
  viewOpen = signal(false);
  viewingField = signal<Field | null>(null);
  pendingDeleteField = signal<Field | null>(null);
  deleteConfirmOpen = signal(false);
  errorMessage = signal<string | null>(null);

  readonly fieldGroupUsageByFieldId = computed<Record<string, string[]>>(() => {
    const usage: Record<string, string[]> = {};

    for (const fieldGroup of this.fieldGroups()) {
      for (const item of fieldGroup.fields || []) {
        const fieldId = String(item.fieldId);
        if (!usage[fieldId]) {
          usage[fieldId] = [];
        }

        if (!usage[fieldId].includes(fieldGroup.name)) {
          usage[fieldId].push(fieldGroup.name);
        }
      }
    }

    return usage;
  });

  readonly fieldGroupAssignOptions = computed<FieldGroupAssignOption[]>(() =>
    this.fieldGroups()
      .filter((group) => group.status !== 'INACTIVE')
      .map((group) => ({ id: group._id, name: group.name }))
  );

  ngOnInit(): void {
    this.loadFields();
  }

  loadFields(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    const fieldsRequest = this.canViewField()
      ? this.fieldsService.getFields()
      : of({ success: true, data: [], meta: { page: 1, limit: 0, total: 0, totalPages: 0 } });

    const fieldGroupsRequest = this.canViewFieldGroups()
      ? this.fieldsService.getFieldGroups()
      : of({ success: true, data: [], meta: { page: 1, limit: 0, total: 0, totalPages: 0 } });

    forkJoin({
      fields: fieldsRequest,
      fieldGroups: fieldGroupsRequest,
    }).subscribe({
      next: (response) => {
        this.fields.set(response.fields.data ?? []);
        this.fieldGroups.set(response.fieldGroups.data ?? []);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading fields:', error);
        this.errorMessage.set(this.translate.instant(this.text.errorLoad));
        this.loading.set(false);
      },
    });
  }

  onAddNew(): void {
    if (!this.canCreateField()) {
      return;
    }
    this.onViewClose();
    this.selectedField.set(null);
    this.formOpen.set(true);
  }

  onAction(action: FieldAction): void {
    if (action.action === 'view') {
      this.viewingField.set(action.field);
      this.viewOpen.set(true);
      return;
    }

    if (action.action === 'edit') {
      if (!this.canEditField()) {
        return;
      }
      this.onViewClose();
      this.selectedField.set(action.field);
      this.formOpen.set(true);
      return;
    }

    if (action.action === 'delete') {
      if (!this.canDeleteField()) {
        return;
      }
      this.requestDeleteField(action.field);
    }
  }

  private requestDeleteField(field: Field): void {
    this.onViewClose();
    this.pendingDeleteField.set(field);
    this.deleteConfirmOpen.set(true);
  }

  onViewClose(): void {
    this.viewOpen.set(false);
    this.viewingField.set(null);
  }

  onViewEdit(field: Field): void {
    if (!this.canEditField()) {
      return;
    }
    this.onViewClose();
    this.selectedField.set(field);
    this.formOpen.set(true);
  }

  onViewDelete(field: Field): void {
    if (!this.canDeleteField()) {
      return;
    }
    this.onViewClose();
    this.requestDeleteField(field);
  }

  onDeleteCancelled(): void {
    this.deleteConfirmOpen.set(false);
    this.pendingDeleteField.set(null);
  }

  onDeleteConfirmed(): void {
    if (!this.canDeleteField()) {
      this.onDeleteCancelled();
      return;
    }

    const field = this.pendingDeleteField();
    if (!field) {
      return;
    }

    if (!field._id) {
      this.errorMessage.set(this.translate.instant(this.text.errorDeleteMissingId));
      this.onDeleteCancelled();
      return;
    }

    this.deleteConfirmOpen.set(false);
    this.loading.set(true);
    this.errorMessage.set(null);

    this.fieldsService.inactivateField(field._id).subscribe({
      next: () => {
        this.pendingDeleteField.set(null);
        this.toast.success(this.translate.instant(this.text.successDelete));
        this.loadFields();
      },
      error: (error) => {
        console.error('Error deleting field:', error);
        const message = this.extractApiMessage(error) || this.translate.instant(this.text.errorDelete);
        this.errorMessage.set(message);
        this.toast.error(message);
        this.pendingDeleteField.set(null);
        this.loading.set(false);
      },
    });
  }

  onFormSubmit(formData: FieldFormSubmitData): void {
    const selected = this.selectedField();
    const isEdit = !!selected?._id;
    const canProceed = isEdit ? this.canEditField() : this.canCreateField();
    if (!canProceed) {
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    if (isEdit && !selected?._id) {
      this.errorMessage.set(this.translate.instant(this.text.errorSaveMissingId));
      this.loading.set(false);
      return;
    }

    const request = selected?._id
      ? this.fieldsService.updateField(selected._id, formData.payload)
      : this.fieldsService.createField(formData.payload);

    request.subscribe({
      next: (response) => {
        const fieldId = response?.data?._id;

        if (!fieldId) {
          this.formOpen.set(false);
          this.selectedField.set(null);
          this.toast.success(this.translate.instant(isEdit ? this.text.successUpdate : this.text.successCreate));
          this.loadFields();
          return;
        }

        this.syncFieldGroupAssignments(fieldId, formData.fieldGroupIds)
          .subscribe({
            next: () => {
              this.formOpen.set(false);
              this.selectedField.set(null);
              this.toast.success(this.translate.instant(isEdit ? this.text.successUpdate : this.text.successCreate));
              this.loadFields();
            },
            error: (error) => {
              console.error('Error syncing field-group assignments:', error);
              this.errorMessage.set(this.translate.instant(this.text.errorSave));
              this.toast.error(this.translate.instant(this.text.errorSave));
              this.loading.set(false);
            },
          });
      },
      error: (error) => {
        console.error('Error saving field:', error);
        this.errorMessage.set(this.translate.instant(this.text.errorSave));
        this.toast.error(this.translate.instant(this.text.errorSave));
        this.loading.set(false);
      },
    });
  }

  getSelectedFieldFormData(): FieldFormData | null {
    const field = this.selectedField();
    if (!field) {
      return null;
    }

    return {
      name: field.name,
      key: field.key,
      type: field.type || this.defaultType,
      defaultValue: field.defaultValue ?? '',
      isRequired: field.isRequired ?? false,
      status: field.status || this.defaultStatus,
    };
  }

  getSelectedFieldAssignedFieldGroupIds(): string[] {
    const fieldId = this.selectedField()?._id;
    if (!fieldId) {
      return [];
    }

    return this.fieldGroups()
      .filter((group) => (group.fields || []).some((item) => String(item.fieldId) === String(fieldId)))
      .map((group) => group._id);
  }

  onFormCancel(): void {
    this.formOpen.set(false);
    this.selectedField.set(null);
  }

  getDeleteMessage(): string {
    return this.translate.instant(this.text.deleteMessage, { name: this.pendingDeleteField()?.name || '' });
  }

  getViewingFieldGroupUsage(): string[] {
    const fieldId = this.viewingField()?._id;
    if (!fieldId) {
      return [];
    }

    return this.fieldGroupUsageByFieldId()[fieldId] || [];
  }

  private syncFieldGroupAssignments(fieldId: string, selectedFieldGroupIds: string[]) {
    const selectedSet = new Set(selectedFieldGroupIds.map(String));
    const currentlyAssigned = this.fieldGroups()
      .filter((group) => (group.fields || []).some((item) => String(item.fieldId) === String(fieldId)))
      .map((group) => String(group._id));
    const currentSet = new Set(currentlyAssigned);

    const affectedGroupIds = new Set<string>([
      ...[...selectedSet].filter((id) => !currentSet.has(id)),
      ...[...currentSet].filter((id) => !selectedSet.has(id)),
    ]);

    if (!affectedGroupIds.size) {
      return of(null);
    }

    const updateRequests = [...affectedGroupIds]
      .map((groupId) => {
        const group = this.fieldGroups().find((item) => String(item._id) === groupId);
        if (!group) {
          return null;
        }

        const existing = [...(group.fields || [])]
          .filter((item) => !!item?.fieldId)
          .map((item) => ({
            fieldId: String(item.fieldId),
            order: Number(item.order || 0),
            defaultValue: item.defaultValue ?? null,
            requiredOverride: item.requiredOverride ?? null,
          }));

        const withoutTarget = existing.filter((item) => item.fieldId !== String(fieldId));
        let nextFields = [...withoutTarget];

        if (selectedSet.has(groupId)) {
          const alreadyPresent = withoutTarget.some((item) => item.fieldId === String(fieldId));
          if (!alreadyPresent) {
            nextFields.push({
              fieldId: String(fieldId),
              order: withoutTarget.length + 1,
              defaultValue: null,
              requiredOverride: null,
            });
          }
        }

        const sortedNextFields = [...nextFields].sort((a, b) => a.order - b.order);
        nextFields = sortedNextFields.map((item, index) => ({ ...item, order: index + 1 }));

        const payload: FieldGroupUpdatePayload = {
          fields: nextFields,
        };

        return this.fieldsService.updateFieldGroup(group._id, payload);
      })
      .filter((request) => !!request);

    if (!updateRequests.length) {
      return of(null);
    }

    return forkJoin(updateRequests).pipe(switchMap(() => of(null)));
  }

  private extractApiMessage(error: unknown): string {
    const maybeError = error as {
      error?: { message?: string; error?: string };
      message?: string;
    };

    const message = maybeError?.error?.message || maybeError?.error?.error || maybeError?.message || '';
    return typeof message === 'string' ? message.trim() : '';
  }
}
