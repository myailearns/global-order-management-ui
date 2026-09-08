import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import {
  GomAlertToastService,
  GomButtonComponent,
  GomInputComponent,
  GomModalComponent,
  GomSwitchComponent,
} from '@gomlibs/ui';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { MediaAssetService } from '../../saas-platform/media/media-asset.service';
import {
  BankAccount,
  BankAccountUpdate,
  EnabledPaymentMethods,
  PaymentMethod,
  PaymentOptionsConfig,
  PaymentOptionsUpdate,
  PaymentOrderType,
  UpiAccount,
} from './payment-options.models';
import { PaymentOptionsService } from './payment-options.service';

const EMPTY_CONFIG: PaymentOptionsUpdate = {
  enabledMethods: { upi: false, cash: false, bankTransfer: false },
  upiAccounts: [],
  bankAccounts: [],
  orderTypeMethods: { inStore: [], pickup: [], delivery: [] },
};

@Component({
  selector: 'gom-payment-options',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    GomButtonComponent,
    GomInputComponent,
    GomModalComponent,
    GomSwitchComponent,
  ],
  templateUrl: './payment-options.component.html',
  styleUrl: './payment-options.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentOptionsComponent implements OnInit {
  private static readonly MAX_QR_BYTES = 5 * 1024 * 1024;
  private readonly service = inject(PaymentOptionsService);
  private readonly mediaService = inject(MediaAssetService);
  private readonly authSession = inject(AuthSessionService);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(GomAlertToastService);
  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly uploadingQr = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly config = signal<PaymentOptionsUpdate>(structuredClone(EMPTY_CONFIG));
  readonly savedConfig = signal<PaymentOptionsUpdate>(structuredClone(EMPTY_CONFIG));
  readonly dirty = signal(false);
  readonly upiModalOpen = signal(false);
  readonly bankModalOpen = signal(false);
  readonly editingUpiId = signal<string | null>(null);
  readonly editingBankId = signal<string | null>(null);
  readonly canEdit = computed(() => this.authSession.hasCapability('orders'));

  readonly methods: PaymentMethod[] = ['UPI', 'CASH', 'BANK_TRANSFER'];
  readonly orderTypes: PaymentOrderType[] = ['inStore', 'pickup', 'delivery'];

  readonly upiForm = this.fb.nonNullable.group({
    providerName: ['', [Validators.required, Validators.maxLength(100)]],
    upiId: ['', [Validators.required, Validators.pattern(/^[a-z0-9._-]{2,256}@[a-z0-9.-]{2,64}$/i)]],
    qrCodeUrl: [''],
    active: [true],
  });

  readonly bankForm = this.fb.nonNullable.group({
    bankName: ['', [Validators.required, Validators.maxLength(120)]],
    accountHolderName: ['', [Validators.required, Validators.maxLength(160)]],
    accountNumber: ['', [Validators.pattern(/^\d{6,24}$/)]],
    confirmAccountNumber: [''],
    ifscCode: ['', [Validators.required, Validators.pattern(/^[A-Z]{4}0[A-Z0-9]{6}$/i)]],
    branchName: ['', [Validators.required, Validators.maxLength(120)]],
    active: [true],
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.service.get().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: ({ data }) => {
        const config = this.toEditable(data);
        this.config.set(config);
        this.savedConfig.set(structuredClone(config));
        this.dirty.set(false);
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(this.apiError(error, 'paymentOptions.messages.loadError'));
      },
    });
  }

  setMethod(method: keyof EnabledPaymentMethods, enabled: boolean): void {
    if (!this.canEdit()) return;
    this.config.update((value) => {
      const enabledMethods = { ...value.enabledMethods, [method]: enabled };
      const apiMethod = this.apiMethod(method);
      const orderTypeMethods = { ...value.orderTypeMethods };
      if (!enabled) {
        this.orderTypes.forEach((orderType) => {
          orderTypeMethods[orderType] = orderTypeMethods[orderType].filter((item) => item !== apiMethod);
        });
      }
      return { ...value, enabledMethods, orderTypeMethods };
    });
    this.dirty.set(true);
  }

  methodEnabled(method: PaymentMethod): boolean {
    const enabled = this.config().enabledMethods;
    if (method === 'UPI') return enabled.upi;
    if (method === 'CASH') return enabled.cash;
    return enabled.bankTransfer;
  }

  orderMethodEnabled(orderType: PaymentOrderType, method: PaymentMethod): boolean {
    return this.config().orderTypeMethods[orderType].includes(method);
  }

  setOrderMethod(orderType: PaymentOrderType, method: PaymentMethod, selected: boolean): void {
    if (!this.canEdit() || !this.methodEnabled(method)) return;
    this.config.update((value) => {
      const current = value.orderTypeMethods[orderType];
      const next = selected ? [...new Set([...current, method])] : current.filter((item) => item !== method);
      return { ...value, orderTypeMethods: { ...value.orderTypeMethods, [orderType]: next } };
    });
    this.dirty.set(true);
  }

  openUpi(account?: UpiAccount): void {
    this.editingUpiId.set(account?.id || null);
    this.upiForm.reset({
      providerName: account?.providerName || '', upiId: account?.upiId || '',
      qrCodeUrl: account?.qrCodeUrl || '', active: account?.active ?? true,
    });
    this.upiModalOpen.set(true);
  }

  saveUpi(): void {
    this.upiForm.markAllAsTouched();
    if (this.upiForm.invalid) return;
    const formValue = this.upiForm.getRawValue();
    const id = this.editingUpiId() || crypto.randomUUID();
    this.config.update((value) => {
      const account = { id, ...formValue };
      const accounts = this.editingUpiId()
        ? value.upiAccounts.map((item) => item.id === id ? account : item)
        : [...value.upiAccounts, account];
      return { ...value, upiAccounts: accounts };
    });
    this.dirty.set(true);
    this.upiModalOpen.set(false);
  }

  deleteUpi(id: string): void {
    if (!confirm(this.translate.instant('paymentOptions.confirmDelete'))) return;
    this.config.update((value) => ({ ...value, upiAccounts: value.upiAccounts.filter((item) => item.id !== id) }));
    this.dirty.set(true);
  }

  openBank(account?: BankAccountUpdate): void {
    this.editingBankId.set(account?.id || null);
    this.bankForm.reset({
      bankName: account?.bankName || '', accountHolderName: account?.accountHolderName || '',
      accountNumber: '', confirmAccountNumber: '', ifscCode: account?.ifscCode || '',
      branchName: account?.branchName || '', active: account?.active ?? true,
    });
    this.updateBankNumberValidators(Boolean(account));
    this.bankModalOpen.set(true);
  }

  saveBank(): void {
    this.bankForm.markAllAsTouched();
    const values = this.bankForm.getRawValue();
    if (values.accountNumber !== values.confirmAccountNumber) {
      this.bankForm.controls.confirmAccountNumber.setErrors({ mismatch: true });
    }
    if (this.bankForm.invalid) return;
    const id = this.editingBankId() || crypto.randomUUID();
    this.config.update((value) => {
      const previous = value.bankAccounts.find((item) => item.id === id);
      const account: BankAccountUpdate = {
        id, bankName: values.bankName, accountHolderName: values.accountHolderName,
        accountNumberLast4: values.accountNumber ? values.accountNumber.slice(-4) : previous?.accountNumberLast4 || '',
        ifscCode: values.ifscCode.toUpperCase(), branchName: values.branchName, active: values.active,
        ...(values.accountNumber ? { accountNumber: values.accountNumber, confirmAccountNumber: values.confirmAccountNumber } : {}),
      };
      const accounts = this.editingBankId()
        ? value.bankAccounts.map((item) => item.id === id ? account : item)
        : [...value.bankAccounts, account];
      return { ...value, bankAccounts: accounts };
    });
    this.dirty.set(true);
    this.bankModalOpen.set(false);
  }

  deleteBank(id: string): void {
    if (!confirm(this.translate.instant('paymentOptions.confirmDelete'))) return;
    this.config.update((value) => ({ ...value, bankAccounts: value.bankAccounts.filter((item) => item.id !== id) }));
    this.dirty.set(true);
  }

  uploadQr(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > PaymentOptionsComponent.MAX_QR_BYTES) {
      this.toast.error(this.translate.instant('paymentOptions.messages.invalidQr'));
      return;
    }
    this.uploadingQr.set(true);
    this.mediaService.uploadTenantMedia(file, file.name).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (asset) => {
        this.upiForm.controls.qrCodeUrl.setValue(asset.url);
        this.uploadingQr.set(false);
      },
      error: () => {
        this.uploadingQr.set(false);
        this.toast.error(this.translate.instant('paymentOptions.messages.uploadError'));
      },
    });
  }

  reset(): void {
    this.config.set(structuredClone(this.savedConfig()));
    this.dirty.set(false);
  }

  save(): void {
    if (!this.canEdit() || this.saving()) return;
    this.saving.set(true);
    this.errorMessage.set(null);
    this.service.update(this.config()).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: ({ data }) => {
        const config = this.toEditable(data);
        this.config.set(config);
        this.savedConfig.set(structuredClone(config));
        this.dirty.set(false);
        this.saving.set(false);
        this.toast.success(this.translate.instant('paymentOptions.messages.saved'));
      },
      error: (error) => {
        this.saving.set(false);
        this.errorMessage.set(this.apiError(error, 'paymentOptions.messages.saveError'));
      },
    });
  }

  fieldError(control: AbstractControl): string {
    if (!control.touched || !control.invalid) return '';
    if (control.hasError('required')) return this.translate.instant('paymentOptions.validation.required');
    if (control.hasError('mismatch')) return this.translate.instant('paymentOptions.validation.accountMismatch');
    return this.translate.instant('paymentOptions.validation.invalid');
  }

  private updateBankNumberValidators(editing: boolean): void {
    const validators = editing ? [Validators.pattern(/^\d{6,24}$/)] : [Validators.required, Validators.pattern(/^\d{6,24}$/)];
    this.bankForm.controls.accountNumber.setValidators(validators);
    this.bankForm.controls.confirmAccountNumber.setValidators(editing ? [] : [Validators.required]);
    this.bankForm.controls.accountNumber.updateValueAndValidity();
    this.bankForm.controls.confirmAccountNumber.updateValueAndValidity();
  }

  private apiMethod(method: keyof EnabledPaymentMethods): PaymentMethod {
    if (method === 'upi') return 'UPI';
    if (method === 'cash') return 'CASH';
    return 'BANK_TRANSFER';
  }

  private toEditable(data: PaymentOptionsConfig): PaymentOptionsUpdate {
    return { ...data, bankAccounts: data.bankAccounts.map((item: BankAccount) => ({ ...item })) };
  }

  private apiError(error: { error?: { message?: string } }, fallbackKey: string): string {
    return error?.error?.message || this.translate.instant(fallbackKey);
  }
}
