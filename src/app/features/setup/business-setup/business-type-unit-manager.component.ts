import { Component, DestroyRef, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  GomAlertToastService,
  GomButtonComponent,
  GomModalComponent,
  GomTableColumn,
  GomTableComponent,
  GomTableRow,
} from '@gomlibs/ui';
import { BusinessTypeUnit, BusinessTypeUnitsService } from './business-type-units.service';

interface BusinessTypeUnitRow extends GomTableRow {
  id: string;
  unit: BusinessTypeUnit;
  name: string;
  symbol: string;
  baseUnit: string;
  conversionFactor: string;
  source: string;
  status: string;
}

@Component({
  selector: 'gom-business-type-unit-manager',
  standalone: true,
  imports: [TranslateModule, GomButtonComponent, GomModalComponent, GomTableComponent],
  templateUrl: './business-type-unit-manager.component.html',
  styleUrl: './business-type-unit-manager.component.scss',
})
export class BusinessTypeUnitManagerComponent implements OnInit {
  private readonly unitsService = inject(BusinessTypeUnitsService);
  private readonly toast = inject(GomAlertToastService);
  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);

  businessTypeId = input.required<string>();
  businessTypeName = input.required<string>();
  closeManager = output<void>();
  unitsUpdated = output<void>();

  readonly modalOpen = signal(true);
  readonly loading = signal(false);
  readonly units = signal<BusinessTypeUnit[]>([]);
  readonly counts = signal({ all: 0, enabled: 0, disabled: 0 });
  readonly togglingUnitId = signal<string | null>(null);
  readonly errorMessage = signal('');

  readonly modalTitle = computed(() => this.translate.instant(
    'businessSetup.unitManager.title',
    { businessType: this.businessTypeName() },
  ));

  readonly rows = computed<BusinessTypeUnitRow[]>(() => this.units().map((unit) => ({
    id: unit.platformUnitId,
    unit,
    name: unit.name,
    symbol: unit.symbol,
    baseUnit: unit.baseUnitName
      ? `${unit.baseUnitName} (${unit.baseUnitSymbol})`
      : this.translate.instant('businessSetup.unitManager.baseUnit.none'),
    conversionFactor: String(unit.conversionFactor),
    source: this.translate.instant('businessSetup.unitManager.source.platform'),
    status: this.translate.instant(
      unit.enabled
        ? 'businessSetup.unitManager.status.enabled'
        : 'businessSetup.unitManager.status.disabled',
    ),
  })));

  readonly columns: GomTableColumn<BusinessTypeUnitRow>[] = [
    {
      key: 'name',
      header: this.translate.instant('businessSetup.unitManager.columns.name'),
      sortable: true,
      filterable: true,
    },
    {
      key: 'symbol',
      header: this.translate.instant('businessSetup.unitManager.columns.symbol'),
      sortable: true,
      width: '7rem',
    },
    {
      key: 'baseUnit',
      header: this.translate.instant('businessSetup.unitManager.columns.baseUnit'),
      sortable: true,
      width: '12rem',
    },
    {
      key: 'conversionFactor',
      header: this.translate.instant('businessSetup.unitManager.columns.conversionFactor'),
      sortable: true,
      width: '10rem',
    },
    {
      key: 'source',
      header: this.translate.instant('businessSetup.unitManager.columns.source'),
      filterable: true,
      width: '9rem',
    },
    {
      key: 'status',
      header: this.translate.instant('businessSetup.unitManager.columns.status'),
      sortable: true,
      filterable: true,
      width: '8rem',
      chipTone: (_value, row) => row.unit.enabled ? 'success' : 'neutral',
    },
    {
      key: 'id',
      header: this.translate.instant('businessSetup.unitManager.columns.actions'),
      width: '10rem',
      actionButtons: [
        {
          label: (row) => this.translate.instant(
            this.togglingUnitId() === row.id
              ? 'businessSetup.unitManager.actions.updating'
              : row.unit.enabled
                ? 'businessSetup.unitManager.actions.disable'
                : 'businessSetup.unitManager.actions.enable',
          ),
          icon: (row) => row.unit.enabled ? 'ri-forbid-line' : 'ri-check-line',
          actionKey: 'toggle',
          variant: 'secondary',
          disabled: () => this.togglingUnitId() !== null,
        },
      ],
    },
  ];

  ngOnInit(): void {
    this.loadUnits();
  }

  loadUnits(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.unitsService.listUnits(this.businessTypeId())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ data }) => {
          this.units.set(data.items || []);
          this.counts.set(data.counts || { all: 0, enabled: 0, disabled: 0 });
          this.loading.set(false);
        },
        error: (error) => {
          this.loading.set(false);
          const message = error?.error?.message
            || this.translate.instant('businessSetup.unitManager.messages.loadError');
          this.errorMessage.set(message);
          this.toast.error(message);
        },
      });
  }

  onRowAction(event: { actionKey: string; row: BusinessTypeUnitRow }): void {
    if (event.actionKey === 'toggle') {
      this.toggleUnit(event.row.unit);
    }
  }

  toggleUnit(unit: BusinessTypeUnit): void {
    if (this.togglingUnitId()) {
      return;
    }

    const enabled = !unit.enabled;
    this.togglingUnitId.set(unit.platformUnitId);
    this.unitsService.updateUnit(this.businessTypeId(), unit.platformUnitId, { enabled })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ data }) => {
          this.units.set(data.items || []);
          this.counts.set(data.counts || { all: 0, enabled: 0, disabled: 0 });
          this.togglingUnitId.set(null);
          this.toast.success(this.translate.instant(
            enabled
              ? 'businessSetup.unitManager.messages.enabled'
              : 'businessSetup.unitManager.messages.disabled',
            { name: unit.name },
          ));
          this.unitsUpdated.emit();
        },
        error: (error) => {
          this.togglingUnitId.set(null);
          this.toast.error(
            error?.error?.message
              || this.translate.instant('businessSetup.unitManager.messages.updateError'),
          );
        },
      });
  }

  close(): void {
    this.modalOpen.set(false);
    this.closeManager.emit();
  }
}
