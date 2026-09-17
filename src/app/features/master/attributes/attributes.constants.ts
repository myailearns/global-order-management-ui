import { GomSelectOption } from '@gomlibs/ui';

export const ATTRIBUTE_DEFAULT_STATUS = 'ACTIVE' as const;

export const ATTRIBUTE_STATUS_OPTIONS: GomSelectOption[] = [
  { label: 'common.status.active', value: 'ACTIVE' },
  { label: 'common.status.inactive', value: 'INACTIVE' },
];

export const ATTRIBUTE_UI_TEXT = {
  pageTitle: 'attributes.title',
  addLabel: 'attributes.add',
  searchPlaceholder: 'attributes.search',
  emptyMessage: 'attributes.empty',
  actionsLabel: 'common.labels.actions',
  viewAction: 'common.actions.view',
  editAction: 'common.actions.edit',
  deleteAction: 'common.actions.delete',
  close: 'common.actions.close',
  save: 'common.actions.save',
  create: 'common.actions.create',
  update: 'common.actions.update',
  statusLabel: 'attributes.labels.status',
  nameLabel: 'attributes.labels.name',
  keyLabel: 'attributes.labels.key',
  allowedValuesLabel: 'attributes.labels.allowedValues',
  deleteTitle: 'attributes.deleteConfirm.title',
  deleteMessage: 'attributes.deleteConfirm.message',
  formTitleCreate: 'attributes.form.titleCreate',
  formTitleEdit: 'attributes.form.titleEdit',
  successCreate: 'attributes.toast.successCreate',
  successUpdate: 'attributes.toast.successUpdate',
  successDelete: 'attributes.toast.successDelete',
  errorLoad: 'attributes.toast.errorLoad',
  errorSave: 'attributes.toast.errorSave',
  errorDelete: 'attributes.toast.errorDelete',
  validationName: 'attributes.validation.nameRequired',
  validationKey: 'attributes.validation.keyRequired',
  validationAllowedValues: 'attributes.validation.allowedValuesRequired',
  closeErrorBanner: 'common.messages.closeErrorBanner',
} as const;
