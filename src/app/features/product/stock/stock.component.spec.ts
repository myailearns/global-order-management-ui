import { ActivatedRoute } from '@angular/router';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';

import { GomAlertToastService } from '@gomlibs/ui';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { StockComponent } from './stock.component';
import { Group, StockService } from './stock.service';

describe('StockComponent', () => {
  let component: StockComponent;
  let stockService: jasmine.SpyObj<StockService>;

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
    ...overrides,
  });

  beforeEach(() => {
    stockService = jasmine.createSpyObj<StockService>('StockService', [
      'getSummary',
      'getCostingMethodConfig',
      'getHistory',
      'addStock',
      'listVariantsByGroup',
      'getVariantStockSummary',
    ]);

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

  it('keeps stock-save reload pinned to the source group even if selection changes before completion', () => {
    const stockRequest$ = new Subject<unknown>();
    const loadStockDataSpy = spyOn(component, 'loadStockData').and.stub();
    const closeAddStockSpy = spyOn(component, 'closeAddStock').and.stub();

    component.selectedGroupId.set('group-a');

    (component as any).executeStockSaveRequest(stockRequest$.asObservable());

    component.selectedGroupId.set('group-b');
    stockRequest$.next({ success: true });
    stockRequest$.complete();

    expect(loadStockDataSpy).toHaveBeenCalledWith('group-a');
    expect(closeAddStockSpy).toHaveBeenCalled();
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