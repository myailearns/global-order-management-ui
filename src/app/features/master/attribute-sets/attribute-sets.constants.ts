import { GomSelectOption } from '@gomlibs/ui';

export const ATTRIBUTE_SET_DEFAULT_STATUS = 'ACTIVE' as const;

export const ATTRIBUTE_SET_STATUS_OPTIONS: GomSelectOption[] = [
  { label: 'common.status.active', value: 'ACTIVE' },
  { label: 'common.status.inactive', value: 'INACTIVE' },
];

export const ATTRIBUTE_SET_REQUIRED_OPTIONS: GomSelectOption[] = [
  { label: 'attributeSets.required.inherit', value: 'null' },
  { label: 'attributeSets.required.required', value: 'true' },
  { label: 'attributeSets.required.optional', value: 'false' },
];

export const ATTRIBUTE_SET_UI_TEXT = {
  pageTitle: 'attributeSets.title',
  addLabel: 'attributeSets.add',
  searchPlaceholder: 'attributeSets.search',
  emptyMessage: 'attributeSets.empty',
  actionsLabel: 'common.labels.actions',
  editAction: 'common.actions.edit',
  deleteAction: 'common.actions.delete',
  close: 'common.actions.close',
  create: 'common.actions.create',
  update: 'common.actions.update',
  nameLabel: 'attributeSets.labels.name',
  descriptionLabel: 'attributeSets.labels.description',
  statusLabel: 'attributeSets.labels.status',
  categoriesLabel: 'attributeSets.labels.categories',
  attributesLabel: 'attributeSets.labels.attributes',
  deleteTitle: 'attributeSets.deleteConfirm.title',
  deleteMessage: 'attributeSets.deleteConfirm.message',
  formTitleCreate: 'attributeSets.form.titleCreate',
  formTitleEdit: 'attributeSets.form.titleEdit',
  successCreate: 'attributeSets.toast.successCreate',
  successUpdate: 'attributeSets.toast.successUpdate',
  successDelete: 'attributeSets.toast.successDelete',
  errorLoad: 'attributeSets.toast.errorLoad',
  errorSave: 'attributeSets.toast.errorSave',
  errorDelete: 'attributeSets.toast.errorDelete',
  validationName: 'attributeSets.validation.nameRequired',
  validationAttributes: 'attributeSets.validation.attributesRequired',
  closeErrorBanner: 'common.messages.closeErrorBanner',
} as const;
