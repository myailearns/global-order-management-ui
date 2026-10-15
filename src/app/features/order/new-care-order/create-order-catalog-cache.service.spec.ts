import { TestBed } from '@angular/core/testing';

import { ProductsTabCategoryDetail, ProductsTabContext } from '../orders/orders.service';
import { CreateOrderCatalogCacheService, CreateOrderCatalogScope } from './create-order-catalog-cache.service';

describe('CreateOrderCatalogCacheService', () => {
  let service: CreateOrderCatalogCacheService;
  let scope: CreateOrderCatalogScope;

  const context: ProductsTabContext = {
    collections: [{
      id: 'collection-1',
      name: 'Featured',
      categories: [{ id: 'category-1', name: 'Dairy' }],
    }],
    others: { key: 'others', categories: [] },
  };

  const detail: ProductsTabCategoryDetail = {
    category: { id: 'category-1', name: 'Dairy' },
    groups: [{ id: 'group-1', name: 'Milk', variantCount: 1 }],
    activeGroupId: 'group-1',
    variants: [{
      id: 'variant-1',
      groupId: 'group-1',
      groupName: 'Milk',
      name: 'One litre milk',
      quantity: 1,
      unitId: 'unit-1',
      unitSymbol: 'L',
      convertedQuantity: 1,
      effectivePrice: { sellingPrice: 50, anchorPrice: 55 },
      status: 'ACTIVE',
    }],
    pagination: { page: 1, limit: 100, total: 1, hasMore: false, totalPages: 1 },
  };

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CreateOrderCatalogCacheService);
    scope = {
      tenantId: `tenant-${crypto.randomUUID()}`,
      storeSlug: 'store-a',
    };
  });

  afterEach(async () => {
    await service.clear(scope);
  });

  it('stores and restores a complete catalog with Last Updated metadata', async () => {
    const saved = await service.replace(scope, context, { 'category-1': detail });
    const restored = await service.get(scope);

    expect(saved.lastUpdated).toBeTruthy();
    expect(restored?.context).toEqual(context);
    expect(restored?.categoryDetails['category-1']).toEqual(detail);
    expect(restored?.lastUpdated).toBe(saved.lastUpdated);
  });

  it('isolates catalogs by tenant and store', async () => {
    await service.replace(scope, context, { 'category-1': detail });

    expect(await service.get({ ...scope, tenantId: 'another-tenant' })).toBeNull();
    expect(await service.get({ ...scope, storeSlug: 'another-store' })).toBeNull();
  });

  it('clears only the selected catalog scope', async () => {
    const secondScope = { ...scope, storeSlug: 'store-b' };
    await service.replace(scope, context, { 'category-1': detail });
    await service.replace(secondScope, context, { 'category-1': detail });

    await service.clear(scope);

    expect(await service.get(scope)).toBeNull();
    expect(await service.get(secondScope)).not.toBeNull();
    await service.clear(secondScope);
  });
});
