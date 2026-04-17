import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { GomAlertToastService } from '../../../shared/components/alert';
import { GomConfirmationModalComponent } from '../../../shared/components/modal';
import { GomSelectOption } from '../../../shared/components/form-controls';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { UNIT_UI_TEXT } from './units.constants';
import { CategoryOption, Unit, UnitPayload, UnitsService } from './units.service';
import { UnitAction, UnitsListComponent } from './list/units-list.component';
import { UnitAssignOption, UnitFormData, UnitsFormComponent } from './form/units-form.component';
import { UnitsViewComponent } from './view/units-view.component';

@Component({
  selector: 'gom-units',
  standalone: true,
  imports: [CommonModule, TranslateModule, UnitsListComponent, UnitsFormComponent, UnitsViewComponent, GomConfirmationModalComponent],
  templateUrl: './units.component.html',
  styleUrl: './units.component.scss',
})
export class UnitsComponent implements OnInit {
  private readonly unitsService = inject(UnitsService);
  private readonly toast = inject(GomAlertToastService);
  private readonly translate = inject(TranslateService);
  private readonly authSession = inject(AuthSessionService);

  readonly text = UNIT_UI_TEXT;
  readonly units = signal<Unit[]>([]);
  readonly categories = signal<CategoryOption[]>([]);
  readonly loading = signal(false);
  readonly canCreateUnit = computed(() => this.authSession.hasFeature('unit.create'));
  readonly canEditUnit = computed(() => this.authSession.hasFeature('unit.edit'));
  readonly canDeleteUnit = computed(() => this.authSession.hasFeature('unit.delete'));
  readonly formOpen = signal(false);
  readonly selectedUnit = signal<Unit | null>(null);
  readonly viewOpen = signal(false);
  readonly viewingUnit = signal<Unit | null>(null);
  readonly pendingDeleteUnit = signal<Unit | null>(null);
  readonly deleteConfirmOpen = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly categoryOptions = computed<GomSelectOption[]>(() =>
    this.categories()
      .filter((c) => c.status === 'ACTIVE')
      .map((c) => ({ value: c._id, label: c.name }))
  );

  readonly baseUnitNameById = computed<Record<string, string>>(() =>
    this.units().reduce<Record<string, string>>((acc, unit) => {
      if (unit._id) {
        acc[unit._id] = `${unit.name} (${unit.symbol})`;
      }
      return acc;
    }, {})
  );

  readonly unitAssignOptions = computed<UnitAssignOption[]>(() =>
    this.units()
      .filter((unit) => unit.status !== 'INACTIVE')
      .map((unit) => ({ id: unit._id || '', name: `${unit.name} (${unit.symbol})` }))
      .filter((unit) => !!unit.id)
  );

  readonly selectedUnitFormData = computed<UnitFormData | null>(() => {
    const unit = this.selectedUnit();
    if (!unit) {
      return null;
    }

    return {
      id: unit._id,
      name: unit.name,
      symbol: unit.symbol,
      baseUnitId: unit.baseUnitId,
      conversionFactor: unit.conversionFactor,
      status: unit.status,
      categoryIds: unit.categoryIds ? [...unit.categoryIds] : [],
    };
  });

  ngOnInit(): void {
    this.loadUnits();
  }

  loadUnits(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    forkJoin({
      units: this.unitsService.getUnits(),
      categories: this.unitsService.listCategories(),
    }).subscribe({
      next: (result) => {
        this.units.set(result.units.data ?? []);
        this.categories.set(result.categories.data ?? []);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading units:', error);
        this.errorMessage.set(this.translate.instant(this.text.errorLoad));
        this.loading.set(false);
      },
    });
  }

  onAddNew(): void {
    if (!this.canCreateUnit()) {
      return;
    }
    this.onViewClose();
    this.selectedUnit.set(null);
    this.formOpen.set(true);
  }

  onAction(action: UnitAction): void {
    if (action.action === 'view') {
      this.viewingUnit.set(action.unit);
      this.viewOpen.set(true);
      return;
    }

    if (action.action === 'edit') {
      if (!this.canEditUnit()) {
        return;
      }
      this.onViewClose();
      this.selectedUnit.set(action.unit);
      this.formOpen.set(true);
      return;
    }

    if (action.action === 'delete') {
      if (!this.canDeleteUnit()) {
        return;
      }
      this.requestDeleteUnit(action.unit);
    }
  }

  onFormSubmit(payload: UnitPayload): void {
    const selected = this.selectedUnit();
    const isEdit = !!selected?._id;
    const canProceed = isEdit ? this.canEditUnit() : this.canCreateUnit();
    if (!canProceed) {
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    const request = selected?._id
      ? this.unitsService.updateUnit(selected._id, payload)
      : this.unitsService.createUnit(payload);

    request.subscribe({
      next: (response) => {
        this.formOpen.set(false);
        this.selectedUnit.set(null);

        const saved = response?.data;
        if (saved?._id) {
          this.units.update((current) => {
            const index = current.findIndex((item) => item._id === saved._id);
            if (index >= 0) {
              const copy = [...current];
              copy[index] = saved;
              return copy;
            }
            return [saved, ...current];
          });
        }

        this.toast.success(this.translate.instant(isEdit ? this.text.successUpdate : this.text.successCreate));
        this.loadUnits();
      },
      error: (error) => {
        console.error('Error saving unit:', error);
        const message = this.extractApiMessage(error) || this.translate.instant(this.text.errorSave);
        this.errorMessage.set(message);
        this.toast.error(message);
        this.loading.set(false);
      },
    });
  }

  onFormCancel(): void {
    this.formOpen.set(false);
    this.selectedUnit.set(null);
  }

  onViewClose(): void {
    this.viewOpen.set(false);
    this.viewingUnit.set(null);
  }

  onViewEdit(unit: Unit): void {
    if (!this.canEditUnit()) {
      return;
    }
    this.onViewClose();
    this.selectedUnit.set(unit);
    this.formOpen.set(true);
  }

  onViewDelete(unit: Unit): void {
    if (!this.canDeleteUnit()) {
      return;
    }
    this.onViewClose();
    this.requestDeleteUnit(unit);
  }

  onDeleteCancelled(): void {
    this.deleteConfirmOpen.set(false);
    this.pendingDeleteUnit.set(null);
  }

  onDeleteConfirmed(): void {
    if (!this.canDeleteUnit()) {
      this.onDeleteCancelled();
      return;
    }

    const unit = this.pendingDeleteUnit();
    if (!unit?._id) {
      this.errorMessage.set(this.translate.instant(this.text.errorDeleteMissingId));
      this.onDeleteCancelled();
      return;
    }

    this.deleteConfirmOpen.set(false);
    this.loading.set(true);
    this.errorMessage.set(null);

    this.unitsService.deleteUnit(unit._id, true).subscribe({
      next: () => {
        this.pendingDeleteUnit.set(null);
        this.toast.success(this.translate.instant(this.text.successDelete));
        this.loadUnits();
      },
      error: (error) => {
        console.error('Error deleting unit:', error);
        const message = this.extractApiMessage(error) || this.translate.instant(this.text.errorDelete);
        this.errorMessage.set(message);
        this.toast.error(message);
        this.pendingDeleteUnit.set(null);
        this.loading.set(false);
      },
    });
  }

  getDeleteMessage(): string {
    return this.translate.instant(this.text.deleteMessage, { name: this.pendingDeleteUnit()?.name || '' });
  }

  getViewingBaseUnitName(): string {
    const viewing = this.viewingUnit();
    if (!viewing?.baseUnitId) {
      return '';
    }

    return this.baseUnitNameById()[viewing.baseUnitId] || '';
  }

  private requestDeleteUnit(unit: Unit): void {
    this.onViewClose();
    this.pendingDeleteUnit.set(unit);
    this.deleteConfirmOpen.set(true);
  }

  private extractApiMessage(error: unknown): string {
    const maybeError = error as {
      error?: { message?: string; error?: string };
      message?: string;
    };

    const message = maybeError?.error?.message || maybeError?.error?.error || maybeError?.message || '';
    return typeof message === 'string' ? message.trim() : '';
  }
}
