import { GomSelectOption } from '@gomlibs/ui';

export const FIELD_DEFAULT_STATUS = 'ACTIVE' as const;
export const FIELD_DEFAULT_TYPE = 'NUMBER' as const;

export const FIELD_STATUS_OPTIONS: GomSelectOption[] = [
  { label: 'common.status.active', value: 'ACTIVE' },
  { label: 'common.status.inactive', value: 'INACTIVE' },
];

export const FIELD_TYPE_OPTIONS: GomSelectOption[] = [
  { label: 'fields.types.number', value: 'NUMBER' },
  { label: 'fields.types.percentage', value: 'PERCENTAGE' },
  { label: 'fields.types.text', value: 'TEXT' },
  { label: 'fields.types.longText', value: 'LONG_TEXT' },
];

export const FIELD_REQUIRED_OPTIONS: GomSelectOption[] = [
  { label: 'fields.required.required', value: 'true' },
  { label: 'fields.required.optional', value: 'false' },
];

export const FIELD_UI_TEXT = {
  pageTitle: 'fields.title',
  addField: 'fields.add',
  actionsLabel: 'common.labels.actions',
  viewAction: 'common.actions.view',
  editAction: 'common.actions.edit',
  deleteAction: 'common.actions.delete',
  searchPlaceholder: 'fields.search',
  emptyMessage: 'fields.empty',
  deleteTitle: 'fields.deleteConfirm.title',
  deleteMessage: 'fields.deleteConfirm.message',
  confirmDelete: 'common.actions.delete',
  close: 'common.actions.close',
  closeErrorBanner: 'common.messages.closeErrorBanner',
  detailFallbackTitle: 'fields.details.titleFallback',
  detailCloseAria: 'fields.details.closeAria',
  detailEditAria: 'fields.details.editAria',
  detailDeleteAria: 'fields.details.deleteAria',
  formTitleCreate: 'fields.form.titleCreate',
  formTitleEdit: 'fields.form.titleEdit',
  formSubmitCreate: 'common.actions.create',
  formSubmitUpdate: 'common.actions.update',
  formCancelAria: 'fields.form.cancelAria',
  formCreateAria: 'fields.form.createAria',
  formUpdateAria: 'fields.form.updateAria',
  emptyValue: '-',
  statusLabel: 'fields.labels.status',
  nameLabel: 'fields.labels.name',
  keyLabel: 'fields.labels.key',
  typeLabel: 'fields.labels.type',
  defaultValueLabel: 'fields.labels.defaultValue',
  isRequiredLabel: 'fields.labels.isRequired',
  usedInFieldGroupsLabel: 'fields.labels.usedInFieldGroups',
  notUsedInFieldGroups: 'fields.labels.notUsedInFieldGroups',
  yes: 'fields.required.required',
  no: 'fields.required.optional',
  errorLoad: 'fields.toast.errorLoad',
  errorSave: 'fields.toast.errorSave',
  errorDelete: 'fields.toast.errorDelete',
  errorDeleteMissingId: 'fields.toast.errorDeleteMissingId',
  errorSaveMissingId: 'fields.toast.errorSaveMissingId',
  successCreate: 'fields.toast.successCreate',
  successUpdate: 'fields.toast.successUpdate',
  successDelete: 'fields.toast.successDelete',
} as const;
