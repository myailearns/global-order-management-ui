import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import {
  FormControlsModule,
  GomAlertToastService,
} from '@gomlibs/ui';
import { OfferService } from '../../services';
import { OfferProgramSettings, OfferType, OfferStatus, DeliveryStackingPolicy } from '../../models';
import { DEFAULT_OFFER_STACKING_MODE } from '../constants/offer-program.constants';

/**
 * Program Settings Dialog Component
 * Tenant-level configuration for offer programs (auto-enabled offers, loyalty expiry, etc.)
 */
@Component({
  selector: 'gom-program-settings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TranslateModule,
    FormControlsModule,
  ],
  templateUrl: './program-settings.component.html',
  styleUrl: './program-settings.component.scss',
})
export class ProgramSettingsComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(GomAlertToastService);
  private readonly translate = inject(TranslateService);
  private readonly offerService = inject(OfferService);

  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly initialSettings = signal<OfferProgramSettings | null>(null);
  readonly activeB1g1OfferCount = signal(0);
  readonly showB1g1PreventionAlert = computed(() => {
    const hasActiveB1g1Offers = this.activeB1g1OfferCount() > 0;
    const autoEnableB1g1 = this.settingsForm?.controls?.['autoEnableB1G1']?.value ?? false;
    return hasActiveB1g1Offers && !autoEnableB1g1;
  });
  readonly autoOrderDiscountModeOptions = [
    {
      value: 'BEST_SINGLE_ELIGIBLE_TIER',
      label: 'Best single eligible tier (recommended)',
    },
    {
      value: 'STACK_ELIGIBLE_TIERS',
      label: 'Stack eligible tiers',
    },
  ];

  settingsForm!: FormGroup;

  ngOnInit(): void {
    this.initializeForm();
  }

  private initializeForm(): void {
    this.settingsForm = this.fb.group({
      offerProgramEnabled: [true],
      autoEnableB1G1: [false],
      autoEnableCoupon: [true],
      includeB1G1ItemsInCouponBase: [true],
      includeB1G1ItemsInAutoOfferBase: [true],
      enableCouponStacking: [false],
      enableB1G1Stacking: [false],
      maxCouponsPerOrder: [1, [Validators.required, Validators.min(1)]],
      showB1G1OnProductCards: [true],
      showB1G1HomeSection: [true],
      maxB1G1HomeItems: [null, [Validators.min(1)]],
      autoOrderDiscountApplicationMode: ['BEST_SINGLE_ELIGIBLE_TIER', [Validators.required]],
      offerStackingMode: [DEFAULT_OFFER_STACKING_MODE],
      loyaltyEnabled: [false],
      enablePointsWithDiscount: [true],
      enableCouponWithLoyalty: [true],
      pointsConversionPoints: [1, [Validators.required, Validators.min(0.1)]],
      pointsConversionAmount: [100, [Validators.required, Validators.min(1)]],
      redemptionRatePoints: [100, [Validators.required, Validators.min(1)]],
      redemptionRateAmount: [50, [Validators.required, Validators.min(1)]],
      pointValidity: [365, [Validators.required, Validators.min(1)]],
      // Delivery offer stacking policies
      deliveryStackingPolicy: [DeliveryStackingPolicy.STACKABLE_WITH_AUTO],
      canStackDeliveryWithAuto: [true],
      canStackDeliveryWithCoupon: [false],
    });

    this.loadSettings();
    this.loadActiveB1g1OfferCount();
  }

  private loadActiveB1g1OfferCount(): void {
    this.offerService.listOffers({
      type: OfferType.BUY_X_GET_Y,
      status: OfferStatus.ACTIVE,
      limit: 200,
      page: 1,
      sortBy: 'updatedAt',
      sortOrder: 'desc',
    }).subscribe({
      next: (offers) => {
        this.activeB1g1OfferCount.set((offers || []).length);
      },
      error: () => {
        this.activeB1g1OfferCount.set(0);
      },
    });
  }

  private loadSettings(): void {
    this.loading.set(true);
    this.offerService.getProgramSettings().subscribe({
      next: (settings) => {
        this.initialSettings.set(settings);
        const formValue = this.transformSettingsToFormValue(settings);
        this.settingsForm.patchValue(formValue);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading settings:', error);
        this.errorMessage.set(this.translate.instant('gom.offers.error_load'));
        this.loading.set(false);
      },
    });
  }

  private transformSettingsToFormValue(settings: OfferProgramSettings): Record<string, unknown> {
    return {
      ...settings,
      pointsConversionPoints: settings.pointsConversion?.points ?? 1,
      pointsConversionAmount: settings.pointsConversion?.amount ?? 100,
      redemptionRatePoints: settings.redemptionRate?.points ?? 100,
      redemptionRateAmount: settings.redemptionRate?.amount ?? 50,
    };
  }

  private transformFormValueToSettings(formValue: Record<string, any>): OfferProgramSettings {
    const {
      pointsConversionPoints,
      pointsConversionAmount,
      redemptionRatePoints,
      redemptionRateAmount,
      ...rest
    } = formValue;

    return {
      ...rest,
      pointsConversion: {
        points: Number(pointsConversionPoints || 1),
        amount: Number(pointsConversionAmount || 100),
      },
      redemptionRate: {
        points: Number(redemptionRatePoints || 100),
        amount: Number(redemptionRateAmount || 50),
      },
    } as OfferProgramSettings;
  }

  save(): void {
    if (!this.settingsForm.valid) {
      this.errorMessage.set(this.translate.instant('gom.offers.validation_error'));
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const payload = this.transformFormValueToSettings(this.settingsForm.getRawValue());

    this.offerService.updateProgramSettings(payload).subscribe({
      next: (saved) => {
        this.initialSettings.set(saved);
        const formValue = this.transformSettingsToFormValue(saved);
        this.settingsForm.patchValue(formValue);
        this.successMessage.set(this.translate.instant('gom.offers.settings_saved'));
        this.toast.success(this.translate.instant('gom.offers.settings_saved'));
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error saving settings:', error);
        this.errorMessage.set(this.translate.instant('gom.offers.error_save_settings'));
        this.loading.set(false);
      },
    });
  }

  reset(): void {
    const initial = this.initialSettings();
    if (initial) {
      const formValue = this.transformSettingsToFormValue(initial);
      this.settingsForm.patchValue(formValue);
    } else {
      this.initializeForm();
    }
    this.errorMessage.set(null);
    this.successMessage.set(null);
  }
}
