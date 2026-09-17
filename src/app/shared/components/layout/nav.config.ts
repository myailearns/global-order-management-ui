import { AppCapability, UserActor } from '../../../core/auth/auth-session.model';

export interface NavItem {
  label: string;
  route: string;
  icon: string;
  translationKey: string;
  section: 'Master Setup' | 'Marketplace' | 'Product Setup' | 'Order Management' | 'Account Management' | 'Admin App' | 'Web App' | 'Settings' | 'Notifications';
  actor: UserActor;
  capability?: AppCapability;
  featureKeys?: string[];
}

export const NAV_ICONS = {
  categories: 'ri-price-tag-3-line',
  fields: 'ri-layout-grid-line',
  fieldGroups: 'ri-folders-line',
  attributes: 'ri-price-tag-3-line',
  attributeSets: 'ri-shape-line',
  pricingTemplates: 'ri-money-dollar-circle-line',
  units: 'ri-scales-3-line',
  taxProfiles: 'ri-percent-line',
  categoryTemplates: 'ri-store-2-line',
  groupCreation: 'ri-folder-add-line',
  productCollections: 'ri-folder-3-line',
  stock: 'ri-stock-line',
  variants: 'ri-price-tag-3-line',
  packs: 'ri-box-3-line',
  simplePricing: 'ri-money-rupee-circle-line',
  mediaLibrary: 'ri-image-line',
  orders: 'ri-file-list-3-line',
  customers: 'ri-user-3-line',
  customerGroups: 'ri-team-line',
  riders: 'ri-bike-line',
  courierPartners: 'ri-truck-line',
  employeeCode: 'ri-settings-3-line',
  storefront: 'ri-store-line',
  branding: 'ri-palette-line',
  homePage: 'ri-home-2-line',
  catalog: 'ri-layout-4-line',
  checkoutPayments: 'ri-bank-card-line',
  deliveryManagement: 'ri-truck-line',
  returnPolicy: 'ri-arrow-go-back-line',
  pinSecurityPolicy: 'ri-lock-line',
  notificationsSetting: 'ri-notification-3-line',
  saasAccounts: 'ri-building-2-line',
  saasPackages: 'ri-stack-line',
  platformUsers: 'ri-user-settings-line',
  saasFeatures: 'ri-function-line',
  tenantEntitlements: 'ri-shield-keyhole-line',
  platformTenantRoles: 'ri-shield-user-line',
  platformTemplates: 'ri-file-copy-2-line',
  businessTemplates: 'ri-store-2-line',
  platformMedia: 'ri-image-line',
  tenantDashboard: 'ri-dashboard-line',
  tenantUsers: 'ri-user-settings-line',
  offers: 'ri-coupon-2-line',
  roles: 'ri-shield-check-line',
  createOrderSettings: 'ri-settings-3-line',
  billing: 'ri-bill-line',
  businessDetails: 'ri-store-2-line',
  paymentOptions: 'ri-bank-card-line',
} as const;

export const NAV_ITEMS: NavItem[] = [
  { label: 'Categories', route: '/masters/categories', icon: NAV_ICONS.categories, translationKey: 'app.navigation.categories', section: 'Master Setup', actor: 'tenant', capability: 'masters', featureKeys: ['category.list', 'category.create', 'category.edit', 'category.delete'] },
  { label: 'Fields', route: '/masters/fields', icon: NAV_ICONS.fields, translationKey: 'app.navigation.fields', section: 'Master Setup', actor: 'tenant', capability: 'masters', featureKeys: ['field.list', 'field.create', 'field.edit', 'field.delete'] },
  { label: 'Field Groups', route: '/masters/field-groups', icon: NAV_ICONS.fieldGroups, translationKey: 'app.navigation.fieldGroups', section: 'Master Setup', actor: 'tenant', capability: 'masters', featureKeys: ['fieldGroup.list', 'fieldGroup.create', 'fieldGroup.edit', 'fieldGroup.delete'] },
  { label: 'Attributes', route: '/masters/attributes', icon: NAV_ICONS.attributes, translationKey: 'app.navigation.attributes', section: 'Master Setup', actor: 'tenant', capability: 'masters', featureKeys: ['attribute.list', 'attribute.create', 'attribute.edit', 'attribute.delete'] },
  { label: 'Attribute Sets', route: '/masters/attribute-sets', icon: NAV_ICONS.attributeSets, translationKey: 'app.navigation.attributeSets', section: 'Master Setup', actor: 'tenant', capability: 'masters', featureKeys: ['attributeSet.list', 'attributeSet.create', 'attributeSet.edit', 'attributeSet.delete'] },
  { label: 'Pricing Templates', route: '/masters/pricing-templates', icon: NAV_ICONS.pricingTemplates, translationKey: 'app.navigation.pricingTemplates', section: 'Master Setup', actor: 'tenant', capability: 'masters', featureKeys: ['pricingTemplate.list', 'pricingTemplate.create', 'pricingTemplate.edit', 'pricingTemplate.delete'] },
  { label: 'Units', route: '/masters/units', icon: NAV_ICONS.units, translationKey: 'app.navigation.units', section: 'Master Setup', actor: 'tenant', capability: 'masters', featureKeys: ['unit.list', 'unit.create', 'unit.edit', 'unit.delete'] },
  { label: 'Tax Profiles', route: '/masters/tax-profiles', icon: NAV_ICONS.taxProfiles, translationKey: 'app.navigation.taxProfiles', section: 'Master Setup', actor: 'tenant', capability: 'masters', featureKeys: ['taxProfile.list', 'taxProfile.create', 'taxProfile.edit'] },
  { label: 'Category Templates', route: '/templates/browse', icon: NAV_ICONS.categoryTemplates, translationKey: 'app.navigation.categoryTemplates', section: 'Marketplace', actor: 'tenant', capability: 'masters', featureKeys: ['template.browse'] },
  { label: 'Groups', route: '/product/groups', icon: NAV_ICONS.groupCreation, translationKey: 'app.navigation.groupCreation', section: 'Product Setup', actor: 'tenant', capability: 'product', featureKeys: ['group.list'] },
  { label: 'Product Collections', route: '/product/product-collections', icon: NAV_ICONS.productCollections, translationKey: 'app.navigation.productCollections', section: 'Product Setup', actor: 'tenant', capability: 'product', featureKeys: ['productCollection.list'] },
  { label: 'Stock', route: '/product/stock', icon: NAV_ICONS.stock, translationKey: 'app.navigation.stock', section: 'Product Setup', actor: 'tenant', capability: 'product', featureKeys: ['stock.list'] },
  { label: 'Variants', route: '/product/variants', icon: NAV_ICONS.variants, translationKey: 'app.navigation.variants', section: 'Product Setup', actor: 'tenant', capability: 'product', featureKeys: ['variant.list'] },
  { label: 'Packs', route: '/product/packs', icon: NAV_ICONS.packs, translationKey: 'app.navigation.packs', section: 'Product Setup', actor: 'tenant', capability: 'product', featureKeys: ['pack.list'] },
  { label: 'Simple Pricing', route: '/pricing/simple', icon: NAV_ICONS.simplePricing, translationKey: 'app.navigation.simplePricing', section: 'Product Setup', actor: 'tenant', capability: 'product', featureKeys: ['variant.list'] },
  { label: 'Media Library', route: '/product/media', icon: NAV_ICONS.mediaLibrary, translationKey: 'app.navigation.mediaLibrary', section: 'Product Setup', actor: 'tenant', capability: 'product', featureKeys: ['media.list'] },
  { label: 'Orders', route: '/orders/list', icon: NAV_ICONS.orders, translationKey: 'app.navigation.orders', section: 'Order Management', actor: 'tenant', capability: 'orders', featureKeys: ['order.list'] },
  { label: 'Customers', route: '/customers/list', icon: NAV_ICONS.customers, translationKey: 'app.navigation.customers', section: 'Order Management', actor: 'tenant', capability: 'customers', featureKeys: ['customer.list'] },
  { label: 'Customer Groups', route: '/customers/groups', icon: NAV_ICONS.customerGroups, translationKey: 'app.navigation.customerGroups', section: 'Order Management', actor: 'tenant', capability: 'customer-groups', featureKeys: ['customerGroup.list'] },
  { label: 'Riders', route: '/delivery/riders', icon: NAV_ICONS.riders, translationKey: 'app.navigation.riders', section: 'Order Management', actor: 'tenant', capability: 'delivery', featureKeys: ['rider.list'] },
  { label: 'Courier Partners', route: '/delivery/courier-partners', icon: NAV_ICONS.courierPartners, translationKey: 'app.navigation.courierPartners', section: 'Order Management', actor: 'tenant', capability: 'delivery', featureKeys: ['courierPartner.list'] },
  { label: 'Employee Code', route: '/settings/employee-code', icon: NAV_ICONS.employeeCode, translationKey: 'app.navigation.employeeCode', section: 'Settings', actor: 'tenant', capability: 'tenant-admin', featureKeys: ['employeeCode.view', 'employeeCode.config'] },
  { label: 'Storefront', route: '/settings/web-app/storefront', icon: NAV_ICONS.storefront, translationKey: 'app.navigation.storefront', section: 'Web App', actor: 'tenant', capability: 'tenant-admin', featureKeys: ['storefront.config'] },
  { label: 'Branding', route: '/settings/web-app/branding', icon: NAV_ICONS.branding, translationKey: 'app.navigation.branding', section: 'Web App', actor: 'tenant', capability: 'tenant-admin', featureKeys: ['storefront.config'] },
  { label: 'Home Page', route: '/settings/web-app/home-page', icon: NAV_ICONS.homePage, translationKey: 'app.navigation.homePage', section: 'Web App', actor: 'tenant', capability: 'tenant-admin', featureKeys: ['storefront.config'] },
  { label: 'Catalog', route: '/settings/web-app/catalog', icon: NAV_ICONS.catalog, translationKey: 'app.navigation.catalog', section: 'Web App', actor: 'tenant', capability: 'tenant-admin', featureKeys: ['storefront.config'] },
  { label: 'Checkout & Payments', route: '/settings/web-app/checkout-payments', icon: NAV_ICONS.checkoutPayments, translationKey: 'app.navigation.checkoutPayments', section: 'Web App', actor: 'tenant', capability: 'tenant-admin', featureKeys: ['storefront.config'] },
  { label: 'Delivery Management', route: '/settings/delivery-management', icon: NAV_ICONS.deliveryManagement, translationKey: 'app.navigation.deliveryManagement', section: 'Settings', actor: 'tenant', capability: 'tenant-admin', featureKeys: ['delivery.management'] },
  { label: 'Return & Exchange Policy', route: '/settings/return-policy', icon: NAV_ICONS.returnPolicy, translationKey: 'app.navigation.returnPolicy', section: 'Settings', actor: 'tenant', capability: 'tenant-admin', featureKeys: ['returnPolicy.config'] },
  { label: 'PIN Security Policy', route: '/settings/pin-security', icon: NAV_ICONS.pinSecurityPolicy, translationKey: 'app.navigation.pinSecurityPolicy', section: 'Settings', actor: 'tenant', capability: 'tenant-admin', featureKeys: ['security.config'] },
  { label: 'Notifications Setting', route: '/settings/notification-settings', icon: NAV_ICONS.notificationsSetting, translationKey: 'app.navigation.notificationsSetting', section: 'Notifications', actor: 'tenant', capability: 'tenant-admin', featureKeys: ['notification.manage'] },
  { label: 'SaaS Accounts', route: '/settings/saas-accounts', icon: NAV_ICONS.saasAccounts, translationKey: 'app.navigation.saasAccounts', section: 'Settings', actor: 'platform', capability: 'platform-admin' },
  { label: 'SaaS Packages', route: '/settings/saas-packages', icon: NAV_ICONS.saasPackages, translationKey: 'app.navigation.saasPackages', section: 'Settings', actor: 'platform', capability: 'platform-admin' },
  { label: 'Platform Users', route: '/settings/platform-users', icon: NAV_ICONS.platformUsers, translationKey: 'app.navigation.platformUsers', section: 'Settings', actor: 'platform', capability: 'platform-admin' },
  { label: 'SaaS Features', route: '/settings/saas-features', icon: NAV_ICONS.saasFeatures, translationKey: 'app.navigation.saasFeatures', section: 'Settings', actor: 'platform', capability: 'platform-admin' },
  { label: 'Tenant Entitlements', route: '/settings/tenant-entitlements', icon: NAV_ICONS.tenantEntitlements, translationKey: 'app.navigation.tenantEntitlements', section: 'Settings', actor: 'platform', capability: 'platform-admin' },
  { label: 'Platform Tenant Roles', route: '/settings/tenant-roles', icon: NAV_ICONS.platformTenantRoles, translationKey: 'app.navigation.platformTenantRoles', section: 'Settings', actor: 'platform', capability: 'platform-admin' },
  { label: 'Platform Templates', route: '/settings/platform-templates', icon: NAV_ICONS.platformTemplates, translationKey: 'app.navigation.platformTemplates', section: 'Settings', actor: 'platform', capability: 'platform-admin' },
  { label: 'Business Templates', route: '/settings/business-templates', icon: NAV_ICONS.businessTemplates, translationKey: 'app.navigation.businessTemplates', section: 'Settings', actor: 'platform', capability: 'platform-admin' },
  { label: 'Platform Media', route: '/settings/platform-media', icon: NAV_ICONS.platformMedia, translationKey: 'app.navigation.platformMedia', section: 'Settings', actor: 'platform', capability: 'platform-admin' },
  { label: 'Tenant Dashboard', route: '/saas-admin/dashboard', icon: NAV_ICONS.tenantDashboard, translationKey: 'app.navigation.tenantDashboard', section: 'Settings', actor: 'tenant', capability: 'tenant-admin', featureKeys: ['dashboard.view'] },
  { label: 'Access Users', route: '/saas-admin/users', icon: NAV_ICONS.tenantUsers, translationKey: 'app.navigation.tenantUsers', section: 'Account Management', actor: 'tenant', capability: 'tenant-admin', featureKeys: ['user.list'] },
  { label: 'Offers', route: '/saas-admin/offers', icon: NAV_ICONS.offers, translationKey: 'gom.offers.title', section: 'Settings', actor: 'tenant', capability: 'tenant-admin', featureKeys: ['offer.list'] },
  { label: 'Roles', route: '/saas-admin/roles', icon: NAV_ICONS.roles, translationKey: 'app.navigation.tenantRoles', section: 'Account Management', actor: 'tenant', capability: 'tenant-admin', featureKeys: ['tenantRole.view', 'tenantRole.add', 'tenantRole.edit', 'tenantRole.delete'] },
  { label: 'Create Order Settings', route: '/admin-app/create-order-settings', icon: NAV_ICONS.createOrderSettings, translationKey: 'app.navigation.createOrderSettings', section: 'Admin App', actor: 'tenant', capability: 'orders' },
  { label: 'Billing', route: '/admin-app/billing', icon: NAV_ICONS.billing, translationKey: 'app.navigation.billing', section: 'Admin App', actor: 'tenant', capability: 'orders' },
  { label: 'Business Details', route: '/admin-app/business-details', icon: NAV_ICONS.businessDetails, translationKey: 'app.navigation.businessDetails', section: 'Admin App', actor: 'tenant', capability: 'tenant-admin', featureKeys: ['roles.view', 'roles.edit'] },
  { label: 'Payment Options', route: '/admin-app/payment-options', icon: NAV_ICONS.paymentOptions, translationKey: 'app.navigation.paymentOptions', section: 'Admin App', actor: 'tenant', capability: 'orders' },
];

export function getNavIcon(route: string, fallback = 'ri-apps-line'): string {
  return NAV_ITEMS.find((item) => item.route === route)?.icon ?? fallback;
}

export function getNavItemForPath(path: string): NavItem | undefined {
  const cleanPath = (path || '').split('?')[0].split('#')[0];

  const exact = NAV_ITEMS.find((item) => item.route === cleanPath);
  if (exact) {
    return exact;
  }

  const byPrefix = NAV_ITEMS
    .filter((item) => cleanPath.startsWith(`${item.route}/`))
    .sort((a, b) => b.route.length - a.route.length);

  return byPrefix[0];
}

export function getNavIconForPath(path: string, fallback = 'ri-apps-line'): string {
  return getNavItemForPath(path)?.icon ?? fallback;
}