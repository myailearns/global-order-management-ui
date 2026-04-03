import { Routes } from '@angular/router';
import { CategoriesComponent } from './features/master/categories';
import { FieldsComponent } from './features/master/fields';
import { FieldGroupsComponent } from './features/master/field-groups';
import { UnitsComponent } from './features/master/units';
import { GroupsComponent } from './features/product/groups/groups.component';

export const routes: Routes = [
	{
		path: '',
		pathMatch: 'full',
		redirectTo: 'masters/categories',
	},
	{
		path: 'masters/categories',
		component: CategoriesComponent,
	},
	{
		path: 'masters/fields',
		component: FieldsComponent,
		data: {
			title: 'Fields',
			description: 'Define atomic pricing fields like buy price, transport, and profit.',
			ctaLabel: 'Add Field',
		},
	},
	{
		path: 'masters/field-groups',
		component: FieldGroupsComponent,
		data: {
			title: 'Field Groups',
			description: 'Build reusable field templates to speed up group creation.',
			ctaLabel: 'Create Field Group',
		},
	},
	{
		path: 'masters/units',
		component: UnitsComponent,
		data: {
			title: 'Units',
			description: 'Configure base and allowed units with conversion values.',
			ctaLabel: 'Add Unit',
		},
	},
	{
		path: 'product/groups',
		component: GroupsComponent,
	},
	{
		path: '**',
		redirectTo: 'masters/categories',
	},
];
