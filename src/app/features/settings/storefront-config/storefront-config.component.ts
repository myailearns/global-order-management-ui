import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import {
  FormControlsModule,
  GomAlertToastService,
  GomButtonComponent,
  GomTabContentComponent,
  GomTabsComponent,
  TabItem,
} from '@gomlibs/ui';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { DisableIfNoFeatureDirective } from '../../../shared/directives/disable-if-no-feature.directive';
import {
  BannerImage,
  DeliveryService,
  LayoutMode,
  PaymentMethod,
  StorefrontConfig,
} from '../../delivery/delivery.service';
import { MediaAssetService } from '../../saas-platform/media/media-asset.service';

@Component({
  selector: 'gom-storefront-config',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormControlsModule,
    DisableIfNoFeatureDirective,
    GomButtonComponent,
    GomTabsComponent,
    GomTabContentComponent,
  ],
  templateUrl: './storefront-config.component.html',
  styleUrl: './storefront-config.component.scss',
})
export class StorefrontConfigComponent implements OnInit {
  private readonly service = inject(DeliveryService);
  private readonly mediaService = inject(MediaAssetService);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(GomAlertToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly authSession = inject(AuthSessionService);

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly uploadingBanner = signal<number | null>(null);
  readonly bannerWarnings = signal<Record<number, string>>({});
  readonly uploadingLogo = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly tenantCode = signal('');
  readonly useCustomColors = signal(false);
  readonly canWrite = computed(() => this.authSession.canWrite('tenant-admin'));

  readonly tabs: TabItem[] = [
    { id: 'basic', label: 'Basic Settings' },
    { id: 'branding', label: 'Branding & Content' },
    { id: 'catalog', label: 'Catalog & Banners' },
    { id: 'commerce', label: 'Delivery & Payments' },
  ];

  readonly activeTab = signal<'basic' | 'branding' | 'catalog' | 'commerce'>('basic');

  private readonly defaultTheme = {
    primaryColor: '#0a5d8b',
    secondaryColor: '#fa5c00',
    accentColor: '#fbd03b',
  };

  private readonly BANNER_IDEAL_W = 1500;
  private readonly BANNER_IDEAL_H = 600;
  private readonly BANNER_MIN_W = 1000;
  private readonly BANNER_MIN_H = 400;
  private readonly BANNER_RATIO_MIN = 2.3;
  private readonly BANNER_RATIO_MAX = 2.7;
  private readonly BANNER_SOFT_SIZE_BYTES = 500 * 1024;
  private readonly BANNER_HARD_MAX_SIZE_BYTES = 5 * 1024 * 1024;

  readonly layoutOptions = [
    { value: 'GRID', label: 'Grid (2 columns)' },
    { value: 'GRID3', label: 'Grid (3 columns)' },
    { value: 'LIST', label: 'List (1 column)' },
  ];

  readonly paymentOptions: { value: PaymentMethod; label: string }[] = [
    { value: 'COD', label: 'Cash on Delivery' },
    { value: 'UPI', label: 'UPI' },
    { value: 'CARD', label: 'Credit / Debit Card' },
    { value: 'NET_BANKING', label: 'Net Banking' },
  ];

  readonly configForm = this.fb.group({
    enabled: [true],
    logoUrl: [''],
    storeDisplayName: [''],
    storeSlug: ['', [Validators.pattern(/^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/)]],
    primaryColor: [this.defaultTheme.primaryColor],
    secondaryColor: [this.defaultTheme.secondaryColor],
    accentColor: [this.defaultTheme.accentColor],
    layoutMode: ['GRID'],
    b1g1HomeCardsPerRow: [3, [Validators.min(1), Validators.max(8)]],
    welcomeMessage: [''],
    footerText: [''],
    whatsappSocial: [''],
    instagramSocial: [''],
    facebookSocial: [''],
    showPacks: [true],
    deliveryCharge: [0, [Validators.min(0)]],
    deliveryChargeNote: [''],
    estimatedDeliveryDays: [0, [Validators.min(0)]],
    minimumOrderValue: [0, [Validators.min(0)]],
    whatsappNumber: [''],
    paymentCOD: [true],
    paymentUPI: [false],
    paymentCARD: [false],
    paymentNET_BANKING: [false],
    banners: this.fb.array([]) as FormArray,
  });

  get banners(): FormArray {
    return this.configForm.get('banners') as FormArray;
  }

  ngOnInit(): void {
    this.loadConfig();
  }

  switchTab(tab: string | number): void {
    this.activeTab.set(tab as 'basic' | 'branding' | 'catalog' | 'commerce');
  }

  resetThemeDefaults(): void {
    if (!this.canWrite()) {
      return;
    }

    this.configForm.patchValue({
      primaryColor: this.defaultTheme.primaryColor,
      secondaryColor: this.defaultTheme.secondaryColor,
      accentColor: this.defaultTheme.accentColor,
    });
    this.useCustomColors.set(false);
  }

  enableCustomColors(): void {
    if (!this.canWrite()) {
      return;
    }

    this.useCustomColors.set(true);
  }

  private loadConfig(): void {
    this.loading.set(true);
    this.service
      .getTenantConfig()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          const tenantId = String(res.data?.tenantId || '').trim().toLowerCase();
          this.tenantCode.set(tenantId);

          const cfg = res.data?.storefrontConfig;
          if (cfg) {
            this.patchForm(cfg, tenantId);
          } else {
            this.configForm.patchValue({
              storeDisplayName: '',
              storeSlug: tenantId,
              primaryColor: this.defaultTheme.primaryColor,
              secondaryColor: this.defaultTheme.secondaryColor,
              accentColor: this.defaultTheme.accentColor,
            });
          }
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.errorMessage.set('Failed to load storefront config.');
        },
      });
  }

  private patchForm(cfg: StorefrontConfig, tenantId: string): void {
    const defaultSlug = this.toSlug(cfg.storeSlug || tenantId || '');
    const primary = String(cfg.primaryColor || this.defaultTheme.primaryColor).toLowerCase();
    const secondary = String(cfg.secondaryColor || this.defaultTheme.secondaryColor).toLowerCase();
    const accent = String(cfg.accentColor || this.defaultTheme.accentColor).toLowerCase();
    const hasCustomColors = (
      primary !== this.defaultTheme.primaryColor ||
      secondary !== this.defaultTheme.secondaryColor ||
      accent !== this.defaultTheme.accentColor
    );

    this.useCustomColors.set(hasCustomColors);

    this.configForm.patchValue({
      enabled: this.normalizeBoolean(cfg.enabled, true),
      logoUrl: cfg.logoUrl || '',
      storeDisplayName: cfg.storeDisplayName || '',
      storeSlug: defaultSlug,
      primaryColor: hasCustomColors ? primary : this.defaultTheme.primaryColor,
      secondaryColor: hasCustomColors ? secondary : this.defaultTheme.secondaryColor,
      accentColor: hasCustomColors ? accent : this.defaultTheme.accentColor,
      layoutMode: cfg.layoutMode || 'GRID',
      b1g1HomeCardsPerRow: Number(cfg.b1g1HomeCardsPerRow ?? 3),
      welcomeMessage: cfg.welcomeMessage || '',
      footerText: cfg.footerText || '',
      whatsappSocial: cfg.socialLinks?.whatsapp || '',
      instagramSocial: cfg.socialLinks?.instagram || '',
      facebookSocial: cfg.socialLinks?.facebook || '',
      showPacks: this.normalizeBoolean(cfg.showPacks, true),
      deliveryCharge: cfg.deliveryCharge ?? 0,
      deliveryChargeNote: cfg.deliveryChargeNote || '',
      estimatedDeliveryDays: cfg.estimatedDeliveryDays ?? 0,
      minimumOrderValue: cfg.minimumOrderValue ?? 0,
      whatsappNumber: cfg.whatsappNumber || '',
      paymentCOD: (cfg.paymentMethods || []).includes('COD'),
      paymentUPI: (cfg.paymentMethods || []).includes('UPI'),
      paymentCARD: (cfg.paymentMethods || []).includes('CARD'),
      paymentNET_BANKING: (cfg.paymentMethods || []).includes('NET_BANKING'),
    });

    // Rebuild banners FormArray
    this.banners.clear();
    for (const banner of cfg.bannerImages || []) {
      this.banners.push(this.createBannerGroup(banner));
    }
    this.bannerWarnings.set({});
  }

  private createBannerGroup(banner?: BannerImage): FormGroup {
    return this.fb.group({
      url: [banner?.url || '', Validators.required],
      text: [banner?.text || ''],
      sortOrder: [banner?.sortOrder ?? this.banners.length],
    });
  }

  addBanner(): void {
    if (!this.canWrite()) {
      return;
    }

    this.banners.push(this.createBannerGroup());
  }

  removeBanner(index: number): void {
    if (!this.canWrite()) {
      return;
    }

    this.banners.removeAt(index);
    this.reindexBannerWarningsAfterRemove(index);
  }

  onBannerInputChange(event: Event, index: number): void {
    if (!this.canWrite()) {
      return;
    }

    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (file) {
      if (file.size > this.BANNER_HARD_MAX_SIZE_BYTES) {
        this.toast.error('Banner file is too large. Maximum allowed size is 5 MB.');
      } else {
        this.onBannerFileSelected(file, index);
      }
    }

    input.value = '';
  }

  onBannerFileSelected(file: File, index: number): void {
    if (!this.canWrite()) {
      return;
    }

    this.inspectBannerImage(file)
      .then((audit) => {
        if (audit.blockReason) {
          this.setBannerWarning(index, audit.blockReason);
          this.toast.error(audit.blockReason);
          return;
        }

        this.setBannerWarning(index, audit.warningReason || null);
        if (audit.warningReason) {
          this.toast.warning(audit.warningReason, 'Banner advice', 5200);
        }

        this.uploadingBanner.set(index);
        this.mediaService
          .uploadTenantMedia(file, file.name)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: (asset) => {
              const group = this.banners.at(index) as FormGroup;
              group.patchValue({ url: asset.url });
              this.uploadingBanner.set(null);
              this.toast.success('Banner image uploaded.');
            },
            error: () => {
              this.uploadingBanner.set(null);
              this.toast.error('Failed to upload image.');
            },
          });
      })
      .catch(() => {
        this.toast.warning('Could not validate banner dimensions. Uploading as-is.', 'Banner advice');
        this.uploadingBanner.set(index);
        this.mediaService
          .uploadTenantMedia(file, file.name)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: (asset) => {
              const group = this.banners.at(index) as FormGroup;
              group.patchValue({ url: asset.url });
              this.uploadingBanner.set(null);
              this.toast.success('Banner image uploaded.');
            },
            error: () => {
              this.uploadingBanner.set(null);
              this.toast.error('Failed to upload image.');
            },
          });
      });
  }

  private setBannerWarning(index: number, message: string | null): void {
    this.bannerWarnings.update((current) => {
      const next = { ...current };
      if (message) {
        next[index] = message;
      } else {
        delete next[index];
      }
      return next;
    });
  }

  private reindexBannerWarningsAfterRemove(removedIndex: number): void {
    const current = this.bannerWarnings();
    const next: Record<number, string> = {};

    for (const [key, value] of Object.entries(current)) {
      const idx = Number(key);
      if (idx < removedIndex) {
        next[idx] = value;
      } else if (idx > removedIndex) {
        next[idx - 1] = value;
      }
    }

    this.bannerWarnings.set(next);
  }

  private inspectBannerImage(file: File): Promise<{ blockReason?: string; warningReason?: string }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(objectUrl);

        const width = img.naturalWidth || 0;
        const height = img.naturalHeight || 0;

        if (width < this.BANNER_MIN_W || height < this.BANNER_MIN_H) {
          resolve({
            blockReason: `Banner is too small (${width}x${height}). Minimum is ${this.BANNER_MIN_W}x${this.BANNER_MIN_H}.`,
          });
          return;
        }

        const ratio = height > 0 ? width / height : 0;
        const isRatioOutsideRange = ratio < this.BANNER_RATIO_MIN || ratio > this.BANNER_RATIO_MAX;

        if (isRatioOutsideRange) {
          resolve({
            warningReason: `Uploaded ratio is ${ratio.toFixed(2)}:1. Best result is 5:2 (~2.50:1), ideal ${this.BANNER_IDEAL_W}x${this.BANNER_IDEAL_H}.`,
          });
          return;
        }

        if (file.size > this.BANNER_SOFT_SIZE_BYTES) {
          resolve({
            warningReason: `Banner file is ${(file.size / 1024).toFixed(0)} KB. For faster mobile loading, target under 500 KB.`,
          });
          return;
        }

        resolve({});
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Failed to read image dimensions'));
      };

      img.src = objectUrl;
    });
  }

  /** Target logo canvas dimensions: 2× header display size (280×68) at 4.1:1 ratio. */
  private readonly LOGO_W = 280;
  private readonly LOGO_H = 68;

  onLogoFileSelected(file: File): void {
    if (!this.canWrite()) {
      return;
    }

    this.uploadingLogo.set(true);
    this._cropAndResizeLogo(file)
      .then((croppedFile) => {
        this.mediaService
          .uploadTenantMedia(croppedFile, croppedFile.name)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: (asset) => {
              this.configForm.patchValue({ logoUrl: asset.url });
              this.uploadingLogo.set(false);
              this.toast.success('Logo uploaded and optimised.');
            },
            error: () => {
              this.uploadingLogo.set(false);
              this.toast.error('Failed to upload logo.');
            },
          });
      })
      .catch(() => {
        // If canvas processing fails (e.g. SVG), upload original as-is
        this.mediaService
          .uploadTenantMedia(file, file.name)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: (asset) => {
              this.configForm.patchValue({ logoUrl: asset.url });
              this.uploadingLogo.set(false);
              this.toast.success('Logo uploaded.');
            },
            error: () => {
              this.uploadingLogo.set(false);
              this.toast.error('Failed to upload logo.');
            },
          });
      });
  }

  onLogoInputChange(event: Event): void {
    if (!this.canWrite()) {
      return;
    }

    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.onLogoFileSelected(file);
    }
    input.value = '';
  }

  /**
   * Center-crops the image to the target aspect ratio then resizes it
   * to LOGO_W × LOGO_H using an offscreen canvas.
   * Returns the result as a PNG File.
   */
  private _cropAndResizeLogo(file: File): Promise<File> {
    // SVG is vector — skip rasterisation, upload as-is
    if (file.type === 'image/svg+xml') return Promise.resolve(file);

    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const targetRatio = this.LOGO_W / this.LOGO_H; // ~4.12
        const srcRatio = img.naturalWidth / img.naturalHeight;

        let sx: number, sy: number, sw: number, sh: number;
        if (srcRatio > targetRatio) {
          // Image is wider than target — crop sides
          sh = img.naturalHeight;
          sw = Math.round(sh * targetRatio);
          sx = Math.round((img.naturalWidth - sw) / 2);
          sy = 0;
        } else {
          // Image is taller than target — crop top/bottom
          sw = img.naturalWidth;
          sh = Math.round(sw / targetRatio);
          sx = 0;
          sy = Math.round((img.naturalHeight - sh) / 2);
        }

        const canvas = document.createElement('canvas');
        canvas.width = this.LOGO_W;
        canvas.height = this.LOGO_H;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Canvas not supported')); return; }
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, this.LOGO_W, this.LOGO_H);

        canvas.toBlob(
          (blob) => {
            if (!blob) { reject(new Error('Canvas toBlob failed')); return; }
            const name = file.name.replace(/\.[^.]+$/, '') + '-logo.png';
            resolve(new File([blob], name, { type: 'image/png' }));
          },
          'image/png'
        );
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image load failed')); };
      img.src = url;
    });
  }

  save(): void {
    if (!this.canWrite()) {
      return;
    }

    if (this.configForm.invalid) {
      this.configForm.markAllAsTouched();
      this.errorMessage.set('Please fix validation errors before saving.');
      this.toast.error('Please fix validation errors before saving.');
      return;
    }

    const raw = this.configForm.getRawValue();
    const resolvedStoreSlug = this.toSlug(raw.storeSlug || this.tenantCode() || '');
    const primaryColor = this.useCustomColors() ? (raw.primaryColor || this.defaultTheme.primaryColor) : this.defaultTheme.primaryColor;
    const secondaryColor = this.useCustomColors() ? (raw.secondaryColor || this.defaultTheme.secondaryColor) : this.defaultTheme.secondaryColor;
    const accentColor = this.useCustomColors() ? (raw.accentColor || this.defaultTheme.accentColor) : this.defaultTheme.accentColor;

    const paymentMethods: PaymentMethod[] = [];
    if (raw.paymentCOD) paymentMethods.push('COD');
    if (raw.paymentUPI) paymentMethods.push('UPI');
    if (raw.paymentCARD) paymentMethods.push('CARD');
    if (raw.paymentNET_BANKING) paymentMethods.push('NET_BANKING');

    const payload: Partial<StorefrontConfig> = {
      enabled: this.normalizeBoolean(raw.enabled, true),
      logoUrl: raw.logoUrl || '',
      storeDisplayName: raw.storeDisplayName || '',
      storeSlug: resolvedStoreSlug,
      primaryColor,
      secondaryColor,
      accentColor,
      layoutMode: (raw.layoutMode as LayoutMode) || 'GRID',
      b1g1HomeCardsPerRow: Number(raw.b1g1HomeCardsPerRow ?? 3),
      bannerImages: (raw.banners as { url: string; text: string; sortOrder: number }[]).map((b: { url: string; text: string; sortOrder: number }, i: number) => ({
        url: b.url || '',
        text: b.text || '',
        sortOrder: b.sortOrder ?? i,
      })),
      welcomeMessage: raw.welcomeMessage || '',
      footerText: raw.footerText || '',
      socialLinks: {
        whatsapp: raw.whatsappSocial || '',
        instagram: raw.instagramSocial || '',
        facebook: raw.facebookSocial || '',
      },
      showPacks: this.normalizeBoolean(raw.showPacks, true),
      deliveryCharge: raw.deliveryCharge ?? 0,
      deliveryChargeNote: raw.deliveryChargeNote || '',
      estimatedDeliveryDays: raw.estimatedDeliveryDays ?? 0,
      minimumOrderValue: raw.minimumOrderValue ?? 0,
      whatsappNumber: raw.whatsappNumber || '',
      paymentMethods,
    };

    this.saving.set(true);
    this.errorMessage.set(null);

    this.service
      .updateStorefrontConfig(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          const tenantId = String(res.data?.tenantId || this.tenantCode()).trim().toLowerCase();
          const cfg = res.data?.storefrontConfig;
          if (cfg) {
            this.patchForm(cfg, tenantId);
          }
          this.toast.success('Storefront configuration saved.');
          this.saving.set(false);
        },
        error: (err) => {
          const msg = (err as { error?: { message?: string } })?.error?.message;
          this.errorMessage.set(msg || 'Failed to save storefront configuration.');
          this.saving.set(false);
        },
      });
  }

  private toSlug(value: string): string {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replaceAll(/[^a-z0-9-]/g, '-')
      .replaceAll(/-+/g, '-')
      .replaceAll(/^-|-$/g, '')
      .slice(0, 64);
  }

  private normalizeBoolean(value: unknown, fallback: boolean): boolean {
    if (value === true || value === false) {
      return value;
    }

    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (normalized === 'true') {
        return true;
      }
      if (normalized === 'false') {
        return false;
      }
    }

    return fallback;
  }
}
