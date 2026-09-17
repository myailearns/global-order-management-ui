import { GomSelectOption } from '@gomlibs/ui';

export const PRICING_TEMPLATE_DEFAULT_STATUS = 'ACTIVE' as const;

export const PRICING_TEMPLATE_STATUS_OPTIONS: GomSelectOption[] = [
  { label: 'common.status.active', value: 'ACTIVE' },
  { label: 'common.status.inactive', value: 'INACTIVE' },
];

export const PRICING_TEMPLATE_UI_TEXT = {
  pageTitle: 'pricingTemplates.title',
  addLabel: 'pricingTemplates.add',
  searchPlaceholder: 'pricingTemplates.search',
  emptyMessage: 'pricingTemplates.empty',
  actionsLabel: 'common.labels.actions',
  editAction: 'common.actions.edit',
  deleteAction: 'common.actions.delete',
  close: 'common.actions.close',
  create: 'common.actions.create',
  update: 'common.actions.update',
  nameLabel: 'pricingTemplates.labels.name',
  descriptionLabel: 'pricingTemplates.labels.description',
  statusLabel: 'pricingTemplates.labels.status',
  fieldKeysLabel: 'pricingTemplates.labels.fieldKeys',
  categoriesLabel: 'pricingTemplates.labels.categories',
  actualPriceFormulaLabel: 'pricingTemplates.labels.actualPriceFormula',
  sellingPriceFormulaLabel: 'pricingTemplates.labels.sellingPriceFormula',
  anchorPriceFormulaLabel: 'pricingTemplates.labels.anchorPriceFormula',
  deleteTitle: 'pricingTemplates.deleteConfirm.title',
  deleteMessage: 'pricingTemplates.deleteConfirm.message',
  formTitleCreate: 'pricingTemplates.form.titleCreate',
  formTitleEdit: 'pricingTemplates.form.titleEdit',
  successCreate: 'pricingTemplates.toast.successCreate',
  successUpdate: 'pricingTemplates.toast.successUpdate',
  successDelete: 'pricingTemplates.toast.successDelete',
  errorLoad: 'pricingTemplates.toast.errorLoad',
  errorSave: 'pricingTemplates.toast.errorSave',
  errorDelete: 'pricingTemplates.toast.errorDelete',
  validationName: 'pricingTemplates.validation.nameRequired',
  validationFormulas: 'pricingTemplates.validation.formulasRequired',
  closeErrorBanner: 'common.messages.closeErrorBanner',
} as const;
