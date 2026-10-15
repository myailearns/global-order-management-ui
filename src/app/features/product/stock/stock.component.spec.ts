import { ActivatedRoute } from '@angular/router';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';

import { GomAlertToastService } from '@gomlibs/ui';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { StockComponent } from './stock.component';
import { Group, StockService } from './stock.service';

describe('StockComponent price approval flow', () => {
  let component: StockComponent;
  let stockService: jasmine.SpyObj<StockService>;

  const pendingResponse = (total: number) => ({
    success: true,
    data: [],
    pagination: {
      page: 1,
      limit: total,
      total,
      hasMore: false,
      totalPages: 1,
      canLoadAll: true,
    },
  });

  const pendingGroupsResponse = (totalPending: number, groups: Array<{ groupId: string; groupName: string; pendingCount: number; lastCreatedAt: string }>) => ({
    success: true,
    data: {
      totalPending,
      groups,
    },
  });

  const activeGroup = (
    id: string,
    name: string,
    overrides: Partial<Group> = {}
  ): Group => ({
    _id: id,
    name,
    baseUnitId: 'unit-1',
    allowedUnitIds: [],
    resolvedFields: [],
    status: 'ACTIVE',
    groupType: 'MEASURED',
    pricingRefreshMode: 'MANUAL_REFRESH',
    ...overrides,
  });

  beforeEach(() => {
    stockService = jasmine.createSpyObj<StockService>('StockService', [
      'listPricingRefreshSuggestions',
      'getPendingGroupsSummary',
      'updateGroupResolvedFields',
      'getSummary',
      'getCostingMethodConfig',
      'getHistory',
      'addStock',
      'listVariantsByGroup',
      'getVariantStockSummary',
    ]);

    stockService.listPricingRefreshSuggestions.and.returnValue(of(pendingResponse(0) as any));
    stockService.getPendingGroupsSummary.and.returnValue(of(pendingGroupsResponse(0, []) as any));
    stockService.updateGroupResolvedFields.and.returnValue(of({ success: true } as any));
    stockService.getSummary.and.returnValue(of({ data: { onHand: 0, reserved: 0, available: 0, baseUnit: { _id: 'unit-1', name: 'Unit', symbol: 'U' }, reorderLevel: 0, avgCostPerBaseUnit: 0, inventoryCostBasisTotal: 0, lastLandedCostPerBaseUnit: 0, isLowStock: false } } as any));
    stockService.getCostingMethodConfig.and.returnValue(of({ data: { groupId: 'group-a', groupName: 'Group A', supportedMethods: ['WAC'], tenantDefaultMethod: 'WAC', groupCostingMethod: 'WAC', effectiveMethod: 'WAC', effectiveScope: 'GROUP' } } as any));
    stockService.getHistory.and.returnValue(of({ data: [], pagination: { page: 1, limit: 50, total: 0, hasMore: false, totalPages: 1, canLoadAll: true } } as any));
    stockService.addStock.and.returnValue(of({ success: true, data: {} } as any));
    stockService.listVariantsByGroup.and.returnValue(of({ data: [] } as any));
    stockService.getVariantStockSummary.and.returnValue(of({ data: [] } as any));

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        {
          provide: StockService,
          useValue: stockService,
        },
        {
          provide: GomAlertToastService,
          useValue: jasmine.createSpyObj<GomAlertToastService>('GomAlertToastService', ['success', 'error', 'warning', 'info']),
        },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: {
                get: () => null,
              },
            },
          },
        },
        {
          provide: AuthSessionService,
          useValue: {
            hasFeature: () => true,
            getFeatureConfigNumber: () => null,
          },
        },
      ],
    });

    component = TestBed.runInInjectionContext(() => new StockComponent());
    component.groups.set([
      activeGroup('group-a', 'Group A'),
      activeGroup('group-b', 'Group B'),
    ]);
  });

  it('opens price approval for the clicked group instead of stale selected group', () => {
    spyOn(component, 'loadStockData').and.stub();
    spyOn(component, 'loadPendingCount').and.stub();
    component.selectedGroupId.set('group-a');

    stockService.listPricingRefreshSuggestions.and.callFake((groupId: string) =>
      of(pendingResponse(groupId === 'group-b' ? 2 : 0) as any)
    );

    component.openPriceApprovalForGroup('group-b', 'Group B');

    expect(component.selectedGroupId()).toBe('group-b');
    expect(stockService.listPricingRefreshSuggestions).toHaveBeenCalledWith('group-b');
    expect(component.priceApprovalOpen()).toBeTrue();
  });

  it('refreshes selected group state after approval completion instead of force-clearing everything', () => {
    const loadPendingCountSpy = spyOn(component, 'loadPendingCount').and.stub();
    const loadStockDataSpy = spyOn(component, 'loadStockData').and.stub();

    component.selectedGroupId.set('group-a');
    component.totalPendingPricingSuggestionsCount.set(2);
    component.priceApprovalOpen.set(true);

    component.onPriceApprovalCompleted();

    expect(component.priceApprovalOpen()).toBeFalse();
    expect(loadPendingCountSpy).toHaveBeenCalledWith('group-a');
    expect(loadStockDataSpy).toHaveBeenCalledWith('group-a');
    expect(component.totalPendingPricingSuggestionsCount()).toBe(2);
  });

  it('uses tenant-wide pending total to drive grouped inbox visibility', () => {
    component.pendingInboxExpanded.set(false);
    stockService.getPendingGroupsSummary.and.returnValues(
      of(pendingGroupsResponse(3, [
        { groupId: 'group-a', groupName: 'Group A', pendingCount: 1, lastCreatedAt: '2026-06-27T00:00:00.000Z' },
        { groupId: 'group-b', groupName: 'Group B', pendingCount: 2, lastCreatedAt: '2026-06-27T01:00:00.000Z' },
      ]) as any),
      of(pendingGroupsResponse(0, []) as any)
    );

    component.loadPendingGroupsSummary();
    expect(component.totalPendingPricingSuggestionsCount()).toBe(3);
    expect(component.pendingGroupSummaries().length).toBe(2);
    expect(component.pendingInboxExpanded()).toBeTrue();

    component.loadPendingGroupsSummary();
    expect(component.totalPendingPricingSuggestionsCount()).toBe(0);
    expect(component.pendingGroupSummaries()).toEqual([]);
    expect(component.pendingInboxExpanded()).toBeFalse();
  });

  it('keeps stock-save polling pinned to the source group even if selection changes before completion', () => {
    const stockRequest$ = new Subject<unknown>();
    const loadStockDataSpy = spyOn(component, 'loadStockData').and.stub();
    const closeAddStockSpy = spyOn(component, 'closeAddStock').and.stub();
    const scheduleRefreshSpy = spyOn<any>(component, 'schedulePendingSuggestionsModalRefresh').and.stub();

    component.selectedGroupId.set('group-a');
    component.pendingPricingSuggestionsCount.set(0);

    (component as any).executeStockSaveRequest(stockRequest$.asObservable(), [{ fieldId: 'field-1', value: 10 }]);

    component.selectedGroupId.set('group-b');
    stockRequest$.next({ success: true });
    stockRequest$.complete();

    expect(stockService.updateGroupResolvedFields).toHaveBeenCalledWith('group-a', [{ fieldId: 'field-1', value: 10 }]);
    expect(loadStockDataSpy).toHaveBeenCalledWith('group-a');
    expect(closeAddStockSpy).toHaveBeenCalled();
    expect(scheduleRefreshSpy).toHaveBeenCalledWith('group-a', true);
  });

  it('loads per-variant stock inputs for HYBRID groups', () => {
    component.groups.set([
      activeGroup('hybrid-group', 'Sunflower Oil', { groupType: 'HYBRID' }),
    ]);
    component.selectedGroupId.set('hybrid-group');

    component.openAddStock();

    expect(component.isVariantTrackedGroup()).toBeTrue();
    expect(stockService.listVariantsByGroup).toHaveBeenCalledWith('hybrid-group');
    expect(stockService.getVariantStockSummary).toHaveBeenCalledWith('hybrid-group');
    expect(component.addStockOpen()).toBeTrue();
  });

  it('converts HYBRID pack counts to the variant measured quantity when saving', () => {
    spyOn(component, 'loadStockData').and.stub();
    spyOn(component, 'loadPendingCount').and.stub();
    component.groups.set([
      activeGroup('hybrid-group', 'Sunflower Oil', {
        groupType: 'HYBRID',
        baseUnitId: 'litre',
        allowedUnitIds: ['millilitre'],
      }),
    ]);
    component.units.set([
      { _id: 'litre', name: 'Litre', symbol: 'L', status: 'ACTIVE' },
      { _id: 'millilitre', name: 'Millilitre', symbol: 'ml', conversionFactor: 1000, status: 'ACTIVE' },
    ]);
    component.selectedGroupId.set('hybrid-group');
    component.groupVariants.set([
      {
        _id: 'gold-drop-low-500ml',
        name: 'Sunflower Oil - Gold Drop - Low - 500ml',
        quantity: 500,
        convertedQuantity: 0.5,
        unitId: 'millilitre',
        status: 'ACTIVE',
      },
    ]);
    component.variantAllocationQtys.set({ 'gold-drop-low-500ml': 10 });

    component.saveAddStock();

    expect(stockService.addStock).toHaveBeenCalledWith(expect.objectContaining({
      groupId: 'hybrid-group',
      variantId: 'gold-drop-low-500ml',
      quantity: 5000,
      unitId: 'millilitre',
    }));
  });
});