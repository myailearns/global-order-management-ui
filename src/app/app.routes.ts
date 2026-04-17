import { Routes } from '@angular/router';
import { CategoriesComponent } from './features/master/categories';
import { FieldsComponent } from './features/master/fields';
import { FieldGroupsComponent } from './features/master/field-groups';
import { UnitsComponent } from './features/master/units';
import { TaxProfilesComponent } from './features/master/tax-profiles';
import { GroupsComponent } from './features/product/groups/groups.component';
import { StockComponent } from './features/product/stock';
import { VariantsComponent } from './features/product/variants';
import { PacksComponent } from './features/product/packs';
import { OrdersComponent } from './features/order/orders';
import { CreateOrderComponent } from './features/order/create-order';
import { RidersComponent } from './features/delivery/riders';
import { CourierPartnersComponent } from './features/delivery/courier-partners';
import { EmployeeCodeConfigComponent } from './features/settings/employee-code-config';
import { ServiceablePincodesConfigComponent } from './features/settings/serviceable-pincodes-config';
import { CustomersComponent } from './features/customer/customers';
import { CustomerGroupsComponent } from './features/customer/customer-groups';
import { SaasAccountsComponent } from './features/saas-platform/accounts/saas-accounts.component';
import { FeatureCatalogComponent } from './features/saas-platform/entitlements/feature-catalog.component';
import { PackagePlansComponent } from './features/saas-platform/entitlements/package-plans.component';
import { TenantEntitlementsComponent } from './features/saas-platform/entitlements/tenant-entitlements.component';
import { RolesListComponent } from './features/saas-tenant-admin/roles/list/roles-list.component';
import { RoleMatrixComponent } from './features/saas-tenant-admin/roles/matrix';
import { AccessDeniedComponent } from './features/auth/access-denied/access-denied.component';
import { AuthEntryComponent } from './features/auth/auth-entry/auth-entry.component';
import { AuthLandingComponent } from './features/auth/auth-landing/auth-landing.component';
import { PlatformLoginComponent } from './features/auth/platform-login/platform-login.component';
import { TenantLoginComponent } from './features/auth/tenant-login/tenant-login.component';
import { guestOnlyGuard, protectedRouteGuard } from './core/auth/auth.guards';

export const routes: Routes = [
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
				data: { actor: 'tenant', capability: 'product' },
			},
			{
				path: 'product/stock',
				component: StockComponent,
				data: { actor: 'tenant', capability: 'product' },
			},
			{
				path: 'product/variants',
				component: VariantsComponent,
				data: { actor: 'tenant', capability: 'product' },
			},
			{
				path: 'product/packs',
				component: PacksComponent,
				data: { actor: 'tenant', capability: 'product' },
			},
			{
				path: 'orders/list',
				component: OrdersComponent,
				data: {
					actor: 'tenant',
					capability: 'orders',
					title: 'Orders',
					description: 'Create and manage operational orders across channels.',
					ctaLabel: 'Create Order',
				},
			},
			{
				path: 'orders/create',
				component: CreateOrderComponent,
				data: {
					actor: 'tenant',
					capability: 'orders',
					title: 'Create Order',
					description: 'Billing style order entry with multi-item support.',
					ctaLabel: 'Place Order',
				},
			},
			{
				path: 'delivery/riders',
				component: RidersComponent,
				data: {
					actor: 'tenant',
					capability: 'delivery',
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
				},
			},
			{
				path: 'settings/employee-code',
				component: EmployeeCodeConfigComponent,
				data: {
					actor: 'tenant',
					capability: 'settings-core',
					title: 'Employee Code Config',
					description: 'Configure how employee codes are generated for riders.',
				},
			},
			{
				path: 'settings/serviceable-pincodes',
				component: ServiceablePincodesConfigComponent,
				data: {
					actor: 'tenant',
					capability: 'settings-core',
					title: 'Serviceable Pincodes',
					description: 'Configure home-delivery serviceable pincodes and fallback suggestions.',
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
