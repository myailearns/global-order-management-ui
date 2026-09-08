import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, Router, Routes } from '@angular/router';
import { CategoriesComponent } from './features/master/categories';
import { FieldsComponent } from './features/master/fields';
import { FieldGroupsComponent } from './features/master/field-groups';
import { AttributesComponent } from './features/master/attributes';
import { AttributeSetsComponent } from './features/master/attribute-sets';
import { UnitsComponent } from './features/master/units';
import { PricingTemplatesComponent } from './features/master/pricing-templates';
import { TaxProfilesComponent } from './features/master/tax-profiles';
import { GroupsComponent } from './features/product/groups/groups.component';
import { BulkUploadGroupsComponent } from './features/product/groups/bulk-upload/bulk-upload-groups.component';
import { StockComponent } from './features/product/stock';
import { VariantsComponent } from './features/product/variants';
import { PacksComponent } from './features/product/packs';
import { ProductCollectionsComponent } from './features/product/product-collections';
import { PricingComponent } from './features/pricing/pricing/pricing.component';
import { PriceHistoryComponent } from './features/pricing/price-history/price-history.component';
import { OrdersComponent } from './features/order/orders';
import { CreateOrderComponent } from './features/order/create-order';
import { NewCareOrderComponent } from './features/order/new-care-order';
import { CreateOrderSettingsComponent } from './features/admin-app/create-order-settings/create-order-settings.component';
import { BillingSettingsComponent } from './features/admin-app/billing-settings/billing-settings.component';
import { BusinessDetailsComponent } from './features/admin-app/business-details/business-details.component';
import { PaymentOptionsComponent } from './features/admin-app/payment-options/payment-options.component';
import { RidersComponent } from './features/delivery/riders';
import { CourierPartnersComponent } from './features/delivery/courier-partners';
import { EmployeeCodeConfigComponent } from './features/settings/employee-code-config';
import { ServiceablePincodesConfigComponent } from './features/settings/serviceable-pincodes-config';
import { StorefrontConfigComponent } from './features/settings/storefront-config';
import { DeliveryManagementComponent } from './features/settings/delivery-management/delivery-management.component';
import { ReturnPolicyConfigComponent } from './features/settings/return-policy-config';
import { PushNotificationsComponent } from './features/settings/push-notifications/push-notifications.component';
import { NotificationOpsComponent } from './features/settings/notification-ops/notification-ops.component';
import { NotificationSettingsComponent } from './features/settings/notification-settings';
import { PinSecurityConfigComponent } from './features/settings/pin-security-config';
import { CustomersComponent } from './features/customer/customers';
import { CustomerGroupsComponent } from './features/customer/customer-groups';
import { SaasAccountsComponent } from './features/saas-platform/accounts/saas-accounts.component';
import { PlatformUsersComponent } from './features/saas-platform/users/platform-users.component';
import { FeatureCatalogComponent } from './features/saas-platform/entitlements/feature-catalog.component';
import { PackagePlansComponent } from './features/saas-platform/entitlements/package-plans.component';
import { TierManagementComponent } from './features/saas-platform/entitlements/tier-management.component';
import { TenantEntitlementsComponent } from './features/saas-platform/entitlements/tenant-entitlements.component';
import { RolesListComponent } from './features/saas-tenant-admin/roles/list/roles-list.component';
import { RoleMatrixComponent } from './features/saas-tenant-admin/roles/matrix';
import { PlatformTemplatesComponent } from './features/saas-platform/templates/platform-templates.component';
import { BusinessTemplatesComponent } from './features/saas-platform/business-templates/business-templates.component';
import { MediaLibraryComponent } from './shared/components/media-library/media-library.component';
import { BrowseTemplatesComponent } from './features/templates/browse-templates.component';
import { AccessDeniedComponent } from './features/auth/access-denied/access-denied.component';
import { AuthEntryComponent } from './features/auth/auth-entry/auth-entry.component';
import { AuthLandingComponent } from './features/auth/auth-landing/auth-landing.component';
import { PlatformLoginComponent } from './features/auth/platform-login/platform-login.component';
import { TenantLoginComponent } from './features/auth/tenant-login/tenant-login.component';
import { guestOnlyGuard, protectedRouteGuard } from './core/auth/auth.guards';

export const routes: Routes = [
	{
		path: 'login/:tenantCode',
		canActivate: [
			(route: ActivatedRouteSnapshot) => {
				const tenantCode = route.paramMap.get('tenantCode') || '';
				return inject(Router).createUrlTree(['/auth/tenant-login'], { queryParams: { tenantCode } });
			},
		],
		component: AuthEntryComponent,
	},
	{
		path: 'auth',
		children: [
			{
				path: '',
				component: AuthEntryComponent,
				canActivate: [guestOnlyGuard],
			},
			{
				path: 'platform-login',
				component: PlatformLoginComponent,
				canActivate: [guestOnlyGuard],
			},
			{
				path: 'tenant-login',
				component: TenantLoginComponent,
				canActivate: [guestOnlyGuard],
			},
			{
				path: 'access-denied',
				component: AccessDeniedComponent,
			},
		],
	},
	{
		path: '',
		pathMatch: 'full',
		component: AuthLandingComponent,
	},
	{
		path: '',
		canActivateChild: [protectedRouteGuard],
		children: [
			{
				path: 'masters/categories',
				component: CategoriesComponent,
				data: { actor: 'tenant', capability: 'masters', featureKeys: ['category.list', 'category.create', 'category.edit', 'category.delete'] },
			},
			{
				path: 'masters/fields',
				component: FieldsComponent,
				data: {
					actor: 'tenant',
					capability: 'masters',
					featureKeys: ['field.list', 'field.create', 'field.edit', 'field.delete'],
					title: 'Fields',
					description: 'Define atomic pricing fields like buy price, transport, and profit.',
					ctaLabel: 'Add Field',
				},
			},
			{
				path: 'masters/field-groups',
				component: FieldGroupsComponent,
				data: {
					actor: 'tenant',
					capability: 'masters',
					featureKeys: ['fieldGroup.list', 'fieldGroup.create', 'fieldGroup.edit', 'fieldGroup.delete'],
					title: 'Field Groups',
					description: 'Build reusable field templates to speed up group creation.',
					ctaLabel: 'Create Field Group',
				},
			},
			{
				path: 'masters/attributes',
				component: AttributesComponent,
				data: {
					actor: 'tenant',
					capability: 'masters',
					featureKeys: ['attribute.list', 'attribute.create', 'attribute.edit', 'attribute.delete'],
					title: 'Attributes',
					description: 'Create reusable product option definitions used by groups and variants.',
					ctaLabel: 'Add Attribute',
				},
			},
			{
				path: 'masters/attribute-sets',
				component: AttributeSetsComponent,
				data: {
					actor: 'tenant',
					capability: 'masters',
					featureKeys: ['attributeSet.list', 'attributeSet.create', 'attributeSet.edit', 'attributeSet.delete'],
					title: 'Attribute Sets',
					description: 'Bundle reusable attributes into product option sets for groups.',
					ctaLabel: 'Add Attribute Set',
				},
			},
			{
				path: 'masters/units',
				component: UnitsComponent,
				data: {
					actor: 'tenant',
					capability: 'masters',
					featureKeys: ['unit.list', 'unit.create', 'unit.edit', 'unit.delete'],
					title: 'Units',
					description: 'Configure base and allowed units with conversion values.',
					ctaLabel: 'Add Unit',
				},
			},
			{
				path: 'masters/pricing-templates',
				component: PricingTemplatesComponent,
				data: {
					actor: 'tenant',
					capability: 'masters',
					featureKeys: ['pricingTemplate.list', 'pricingTemplate.create', 'pricingTemplate.edit', 'pricingTemplate.delete'],
					title: 'Pricing Templates',
					description: 'Define reusable price rules for groups and variants.',
					ctaLabel: 'Add Pricing Template',
				},
			},
			{
				path: 'masters/tax-profiles',
				component: TaxProfilesComponent,
				data: {
					actor: 'tenant',
					capability: 'masters',
					featureKeys: ['taxProfile.list', 'taxProfile.create', 'taxProfile.edit'],
					title: 'Tax Profiles',
					description: 'Manage centralized tax rules for group and order pricing.',
					ctaLabel: 'Add Tax Profile',
				},
			},
			{
				path: 'product/groups',
				component: GroupsComponent,
				data: { actor: 'tenant', capability: 'product', featureKeys: ['group.list'] },
			},
			{
				path: 'product/groups/bulk-upload',
				component: BulkUploadGroupsComponent,
				data: { actor: 'tenant', capability: 'product', featureKeys: ['group.create', 'group.bulk_create'] },
			},
			{
				path: 'product/stock',
				component: StockComponent,
				data: { actor: 'tenant', capability: 'product', featureKeys: ['stock.list'] },
			},
			{
				path: 'product/variants',
				component: VariantsComponent,
				data: { actor: 'tenant', capability: 'product', featureKeys: ['variant.list'] },
			},
			{
				path: 'product/packs',
				component: PacksComponent,
				data: { actor: 'tenant', capability: 'product', featureKeys: ['pack.list'] },
			},
			{
				path: 'pricing/simple',
				component: PricingComponent,
				data: {
					actor: 'tenant',
					capability: 'product',
					featureKeys: ['variant.list'],
					title: 'Pricing',
					description: 'Manage product prices, costs, and profit margins.',
				},
			},
			{
				path: 'pricing/history',
				component: PriceHistoryComponent,
				data: {
					actor: 'tenant',
					capability: 'product',
					featureKeys: ['variant.list'],
					title: 'Price History',
					description: 'View product and group price history with trend analytics.',
				},
			},
			{
				path: 'product/product-collections',
				component: ProductCollectionsComponent,
				data: {
					actor: 'tenant',
					capability: 'product',
					featureKeys: [
						'productCollection.list',
						'productCollection.create',
						'productCollection.edit',
						'productCollection.delete',
						'productCollection.assign',
					],
				},
			},
			{
				path: 'product/media',
				component: MediaLibraryComponent,
				data: { actor: 'tenant', capability: 'product', mode: 'tenant', featureKeys: ['media.list'] },
			},
			{
				path: 'orders/list',
				component: OrdersComponent,
				data: {
					actor: 'tenant',
					capability: 'orders',				featureKeys: ['order.list', 'order.view', 'order.create', 'order.update', 'order.delete'],					title: 'Orders',
					description: 'Create and manage operational orders across channels.',
					ctaLabel: 'Create Order',
				},
			},
			{
				path: 'orders/create',
				component: NewCareOrderComponent,
				data: {
					actor: 'tenant',
					capability: 'orders',				featureKeys: ['order.create'],					title: 'New Care Order',
					description: 'New order flow coming soon.',
					ctaLabel: 'Coming Soon',
				},
			},
			{
				path: 'orders/create-legacy',
				component: CreateOrderComponent,
				data: {
					actor: 'tenant',
					capability: 'orders',				featureKeys: ['order.create'],					title: 'Create Order (Legacy)',
					description: 'Legacy billing style order entry kept for reference.',
					ctaLabel: 'Place Order',
				},
			},
			{
				path: 'admin-app/create-order-settings',
				component: CreateOrderSettingsComponent,
				data: {
					actor: 'tenant',
					capability: 'orders',
					title: 'Create Order Settings',
					description: 'Configure the create order experience.',
				},
			},
			{
				path: 'admin-app/billing',
				component: BillingSettingsComponent,
				data: {
					actor: 'tenant',
					capability: 'orders',
					title: 'Billing',
					description: 'Configure billing settings for order processing.',
				},
			},
			{
				path: 'admin-app/business-details',
				component: BusinessDetailsComponent,
				data: {
					actor: 'tenant',
					capability: 'tenant-admin',
					featureKeys: ['roles.view', 'roles.edit'],
					title: 'Business Details',
					description: 'Configure tenant business information.',
				},
			},
			{
				path: 'admin-app/payment-options',
				component: PaymentOptionsComponent,
				data: {
					actor: 'tenant',
					capability: 'orders',
					title: 'Payment Options',
					description: 'Configure payment options for order processing.',
				},
			},
			{
				path: 'delivery/riders',
				component: RidersComponent,
				data: {
					actor: 'tenant',
					capability: 'delivery',
					featureKeys: ['rider.list'],
					title: 'Riders',
					description: 'Manage rider master data and availability states.',
					ctaLabel: 'Add Rider',
				},
			},
			{
				path: 'delivery/courier-partners',
				component: CourierPartnersComponent,
				data: {
					actor: 'tenant',
					capability: 'delivery',
					featureKeys: ['courierPartner.list'],
					title: 'Courier Partners',
					description: 'Manage courier partner master data used in dispatch flows.',
					ctaLabel: 'Add Courier Partner',
				},
			},
			{
				path: 'customers/list',
				component: CustomersComponent,
				data: {
					actor: 'tenant',
					capability: 'customers',
					title: 'Customers',
					description: 'Track customer order history, spend and repeat purchase insights.',
					featureKeys: ['customer.list'],
				},
			},
			{
				path: 'customers/groups',
				component: CustomerGroupsComponent,
				data: {
					actor: 'tenant',
					capability: 'customer-groups',
					title: 'Customer Groups',
					description: 'Manage manual customer segments for targeted outreach.',
					featureKeys: ['customerGroup.list'],
				},
			},
			{
				path: 'settings/employee-code',
				component: EmployeeCodeConfigComponent,
				data: {
					actor: 'tenant',
					capability: 'tenant-admin',
				featureKeys: ['employeeCode.view', 'employeeCode.config'],
					title: 'Employee Code Config',
					description: 'Configure how employee codes are generated for riders.',
				},
			},
			{
				path: 'settings/serviceable-pincodes',
				component: ServiceablePincodesConfigComponent,
				data: {
					actor: 'tenant',
					capability: 'tenant-admin',
					featureKeys: ['pincode.config'],
					title: 'Serviceable Pincodes',
					description: 'Configure home-delivery serviceable pincodes and fallback suggestions.',
				},
			},
			{
				path: 'settings/storefront',
				component: StorefrontConfigComponent,
				data: {
					actor: 'tenant',
					capability: 'tenant-admin',
					featureKeys: ['storefront.config'],
					title: 'Customer Storefront',
					description: 'Configure your public-facing online store — branding, layout, banners, and payment methods.',
				},
			},
			{
				path: 'settings/delivery-management',
				component: DeliveryManagementComponent,
				data: {
					actor: 'tenant',
					capability: 'tenant-admin',
					featureKeys: ['delivery.management'],
					title: 'Delivery Management',
					description: 'Configure delivery options, pickup locations, serviceability zones, and order cancellation policies.',
				},
			},
			{
				path: 'settings/return-policy',
				component: ReturnPolicyConfigComponent,
				data: {
					actor: 'tenant',
					capability: 'tenant-admin',
					featureKeys: ['returnPolicy.config'],
					title: 'Return & Exchange Policy',
					description: 'Configure whether your store accepts returns, refunds, and exchanges.',
				},
			},
			{
				path: 'settings/pin-security',
				component: PinSecurityConfigComponent,
				data: {
					actor: 'tenant',
					capability: 'tenant-admin',
					featureKeys: ['security.config'],
					title: 'PIN Security Policy',
					description: 'Configure authentication attempts, lockout duration, and unlock policies for PIN-based customer access.',
				},
			},
			{
				path: 'settings/push-notifications',
				component: PushNotificationsComponent,
				data: {
					actor: 'tenant',
					capability: 'tenant-admin',
					featureKeys: ['notification.broadcast'],
					title: 'Push Notifications',
					description: 'Broadcast offers and announcements to all subscribed customers.',
				},
			},
			{
				path: 'settings/notification-settings',
				component: NotificationSettingsComponent,
				data: {
					actor: 'tenant',
					capability: 'tenant-admin',
					featureKeys: ['notification.manage'],
					title: 'Notification Settings',
					description: 'Configure admin email notifications for order lifecycle updates.',
				},
			},
			{
				path: 'settings/notification-ops',
				component: NotificationOpsComponent,
				data: {
					actor: 'tenant',
					capability: 'tenant-admin',
					featureKeys: ['notification.manage'],
					title: 'Notification Operations',
					description: 'Monitor delivery status, SLA metrics, and manually retry failed notifications across channels.',
				},
			},
			{
				path: 'settings/saas-accounts',
				component: SaasAccountsComponent,
				data: {
					actor: 'platform',
					capability: 'platform-admin',
					title: 'SaaS Accounts',
					description: 'Create and manage SaaS tenant accounts and trial lifecycle.',
				},
			},
			{
				path: 'settings/saas-packages',
				component: PackagePlansComponent,
				data: {
					actor: 'platform',
					capability: 'platform-admin',
					title: 'SaaS Packages',
					description: 'Manage package plans and the feature bundles offered per tier.',
				},
			},
			{
				path: 'saas-platform/packages/:packageId/tiers',
				component: TierManagementComponent,
				data: {
					actor: 'platform',
					capability: 'platform-admin',
					title: 'SaaS Package Tiers',
					description: 'Manage tiers and tier-level feature bundles for a package.',
				},
			},
			{
				path: 'settings/platform-users',
				component: PlatformUsersComponent,
				data: {
					actor: 'platform',
					capability: 'platform-admin',
					title: 'Platform Users',
					description: 'Manage platform super-admin, admin, and support users.',
				},
			},
			{
				path: 'settings/saas-features',
				component: FeatureCatalogComponent,
				data: {
					actor: 'platform',
					capability: 'platform-admin',
					title: 'SaaS Features',
					description: 'Create and maintain entitlement-ready feature catalog entries.',
				},
			},
			{
				path: 'settings/tenant-entitlements',
				component: TenantEntitlementsComponent,
				data: {
					actor: 'platform',
					capability: 'platform-admin',
					title: 'Tenant Entitlements',
					description: 'Lookup and edit tenant package and add-on entitlement state.',
				},
			},
			{
				path: 'settings/tenant-roles',
				component: RolesListComponent,
				data: {
					actor: 'platform',
					capability: 'platform-admin',
					title: 'saas.admin.roles.title',
					platformMode: true,
				},
			},
			{
				path: 'settings/tenant-roles/matrix',
				component: RoleMatrixComponent,
				data: {
					actor: 'platform',
					capability: 'platform-admin',
					title: 'saas.admin.roles.title',
					platformMode: true,
				},
			},
			{
				path: 'settings/platform-templates',
				component: PlatformTemplatesComponent,
				data: {
					actor: 'platform',
					capability: 'platform-admin',
					title: 'Platform Templates',
					description: 'Manage template categories, fields, units, and tax profiles for tenant subscription.',
				},
			},
			{
				path: 'settings/business-templates',
				component: BusinessTemplatesComponent,
				data: {
					actor: 'platform',
					capability: 'platform-admin',
					title: 'Business Templates',
					description: 'Create business type bundles like Grocery, Restaurant, Services for one-click tenant onboarding.',
				},
			},
			{
				path: 'settings/platform-media',
				component: MediaLibraryComponent,
				data: {
					actor: 'platform',
					capability: 'platform-admin',
					title: 'Platform Media',
					description: 'Manage shared platform images available to all tenants.',
					mode: 'platform',
				},
			},
			{
				path: 'templates/browse',
				component: BrowseTemplatesComponent,
				data: {
					actor: 'tenant',
					capability: 'masters',
					featureKeys: ['template.browse', 'template.subscribe', 'template.unsubscribe'],
					title: 'Category Templates',
					description: 'Browse and subscribe to platform category templates.',
				},
			},
			{
				path: 'saas-admin',
				data: { actor: 'tenant', capability: 'tenant-admin' },
				loadChildren: () =>
					import('./features/saas-tenant-admin/saas-tenant-admin.routes').then(
						(m) => m.SAAS_TENANT_ADMIN_ROUTES
					),
			},
		],
	},
	{
		path: '**',
		redirectTo: '',
	},
];
