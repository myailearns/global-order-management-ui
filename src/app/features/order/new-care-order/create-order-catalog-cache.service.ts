import { Injectable, signal } from '@angular/core';

import { ProductsTabCategoryDetail, ProductsTabContext } from '../orders/orders.service';

export interface CreateOrderCatalogScope {
  tenantId: string;
  storeSlug: string;
}

export interface CreateOrderCatalogCacheRecord {
  scopeKey: string;
  tenantId: string;
  storeSlug: string;
  context: ProductsTabContext;
  categoryDetails: Record<string, ProductsTabCategoryDetail>;
  lastUpdated: string;
}

@Injectable({ providedIn: 'root' })
export class CreateOrderCatalogCacheService {
  private static readonly DATABASE_NAME = 'gom-create-order-catalog';
  private static readonly DATABASE_VERSION = 1;
  private static readonly STORE_NAME = 'catalogs';
  readonly activeEnabled = signal(false);
  readonly activeLastUpdated = signal<string | null>(null);
  readonly activeRefreshing = signal(false);
  private activeRefreshHandler: (() => Promise<void>) | null = null;

  registerActiveCatalog(refreshHandler: () => Promise<void>): void {
    this.activeRefreshHandler = refreshHandler;
  }

  unregisterActiveCatalog(refreshHandler: () => Promise<void>): void {
    if (this.activeRefreshHandler === refreshHandler) {
      this.activeRefreshHandler = null;
      this.activeEnabled.set(false);
      this.activeLastUpdated.set(null);
      this.activeRefreshing.set(false);
    }
  }

  async refreshActiveCatalog(): Promise<void> {
    if (!this.activeRefreshHandler || this.activeRefreshing()) {
      return;
    }

    await this.activeRefreshHandler();
  }

  async get(scope: CreateOrderCatalogScope): Promise<CreateOrderCatalogCacheRecord | null> {
    if (!this.isIndexedDbAvailable()) {
      return null;
    }

    const db = await this.openDatabase();
    try {
      return await new Promise<CreateOrderCatalogCacheRecord | null>((resolve, reject) => {
        const transaction = db.transaction(CreateOrderCatalogCacheService.STORE_NAME, 'readonly');
        const request = transaction.objectStore(CreateOrderCatalogCacheService.STORE_NAME).get(this.toScopeKey(scope));
        request.onsuccess = () => resolve((request.result as CreateOrderCatalogCacheRecord | undefined) || null);
        request.onerror = () => reject(request.error);
      });
    } finally {
      db.close();
    }
  }

  async replace(
    scope: CreateOrderCatalogScope,
    context: ProductsTabContext,
    categoryDetails: Record<string, ProductsTabCategoryDetail>,
  ): Promise<CreateOrderCatalogCacheRecord> {
    return this.put({
      scopeKey: this.toScopeKey(scope),
      tenantId: scope.tenantId,
      storeSlug: scope.storeSlug,
      context,
      categoryDetails,
      lastUpdated: new Date().toISOString(),
    });
  }

  async clear(scope: CreateOrderCatalogScope): Promise<void> {
    if (!this.isIndexedDbAvailable()) {
      return;
    }

    const db = await this.openDatabase();
    try {
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(CreateOrderCatalogCacheService.STORE_NAME, 'readwrite');
        const request = transaction.objectStore(CreateOrderCatalogCacheService.STORE_NAME).delete(this.toScopeKey(scope));
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } finally {
      db.close();
    }
  }

  private async put(record: CreateOrderCatalogCacheRecord): Promise<CreateOrderCatalogCacheRecord> {
    if (!this.isIndexedDbAvailable()) {
      return record;
    }

    const db = await this.openDatabase();
    try {
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(CreateOrderCatalogCacheService.STORE_NAME, 'readwrite');
        const request = transaction.objectStore(CreateOrderCatalogCacheService.STORE_NAME).put(record);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
      return record;
    } finally {
      db.close();
    }
  }

  private openDatabase(): Promise<IDBDatabase> {
    return new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(
        CreateOrderCatalogCacheService.DATABASE_NAME,
        CreateOrderCatalogCacheService.DATABASE_VERSION,
      );
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(CreateOrderCatalogCacheService.STORE_NAME)) {
          db.createObjectStore(CreateOrderCatalogCacheService.STORE_NAME, { keyPath: 'scopeKey' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error('Create Order catalog database is blocked'));
    });
  }

  private toScopeKey(scope: CreateOrderCatalogScope): string {
    return `${String(scope.tenantId || '').trim().toLowerCase()}::${String(scope.storeSlug || '').trim().toLowerCase()}`;
  }

  private isIndexedDbAvailable(): boolean {
    return typeof indexedDB !== 'undefined';
  }
}
