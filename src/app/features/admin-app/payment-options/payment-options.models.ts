export type PaymentMethod = 'UPI' | 'CASH' | 'BANK_TRANSFER';
export type PaymentOrderType = 'inStore' | 'pickup' | 'delivery';

export interface EnabledPaymentMethods {
  upi: boolean;
  cash: boolean;
  bankTransfer: boolean;
}

export interface UpiAccount {
  id: string;
  providerName: string;
  upiId: string;
  qrCodeUrl: string;
  active: boolean;
}

export interface BankAccount {
  id: string;
  bankName: string;
  accountHolderName: string;
  accountNumberLast4: string;
  ifscCode: string;
  branchName: string;
  active: boolean;
}

export interface BankAccountUpdate extends BankAccount {
  accountNumber?: string;
  confirmAccountNumber?: string;
}

export interface PaymentOptionsConfig {
  enabledMethods: EnabledPaymentMethods;
  upiAccounts: UpiAccount[];
  bankAccounts: BankAccount[];
  orderTypeMethods: Record<PaymentOrderType, PaymentMethod[]>;
  updatedAt?: string | null;
}

export interface PaymentOptionsUpdate extends Omit<PaymentOptionsConfig, 'bankAccounts' | 'updatedAt'> {
  bankAccounts: BankAccountUpdate[];
}

export interface PaymentOptionsResponse {
  success: boolean;
  data: PaymentOptionsConfig;
  message: string;
}
