export type MandateAuthMode = 'NET_BANKING' | 'DEBIT_CARD' | 'AADHAAR' | 'UPI_AUTOPAY';

export type MandateFrequency = 'MNTH' | 'QURT' | 'ADHO';

export type MandateStatus =
  | 'CREATED'
  | 'INVITATION_SENT'
  | 'PENDING_AUTH'
  | 'ACTIVE'
  | 'REJECTED'
  | 'EXPIRED'
  | 'CANCELLED';

export type SettlementStatus = 'SUCCESS' | 'RETURNED' | 'PENDING' | 'PROCESSING';

export interface IBankDetails {
  bankName: string;
  ifscCode: string;
  accountNumber: string;
  accountType: 'SAVINGS' | 'CURRENT';
  holderName: string;
}

export interface IMandateRegistrationRequest {
  loanAccountId: string;
  customerName: string;
  customerEmail: string;
  customerMobile: string;
  customerPan: string;
  bankDetails: IBankDetails;
  monthlyEmiAmount: number;
  maxMandateAmount?: number; // Defaults to 1.5x EMI or 2x EMI
  frequency?: MandateFrequency;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  authMode?: MandateAuthMode;
  callbackUrl?: string;
}

export interface IMandateRecord {
  mandateId: string;
  umrn?: string; // 20-digit Unique Mandate Reference Number assigned by NPCI
  loanAccountId: string;
  customerName: string;
  customerEmail: string;
  customerMobile: string;
  customerPan: string;
  status: MandateStatus;
  authMode: MandateAuthMode;
  authUrl?: string;
  maxAmount: number;
  monthlyEmiAmount: number;
  frequency: MandateFrequency;
  bankDetails: IBankDetails;
  startDate: string;
  endDate: string;
  createdAt: string;
  activatedAt?: string;
  rejectedReason?: string;
  auditTrail: Array<{ timestamp: string; action: string; details?: any }>;
}

export interface IPresentationDebitRequest {
  mandateId: string;
  umrn: string;
  loanAccountId: string;
  amount: number;
  dueDate: string;
  installmentNumber: number;
}

export interface IPresentationDebitResult {
  presentationId: string;
  mandateId: string;
  umrn: string;
  loanAccountId: string;
  amount: number;
  dueDate: string;
  settlementStatus: SettlementStatus;
  clearingReference?: string;
  returnCode?: string; // e.g. "AM04" (Insufficient Funds), "AC01" (Account Closed)
  returnReason?: string;
  recoveryAction?: string;
  settledAt?: string;
  retryScheduledDate?: string;
  retryCount: number;
}

export interface IPreDebitNotification {
  notificationId: string;
  mandateId: string;
  loanAccountId: string;
  customerMobile: string;
  customerEmail: string;
  umrn: string;
  amount: number;
  debitDate: string;
  sentAt: string;
  complianceStatus: 'SENT_COMPLIANT' | 'FAILED';
  channel: 'SMS_AND_EMAIL';
  messageText: string;
}

export interface IPresentationBatch {
  batchId: string;
  presentationDate: string;
  totalDebits: number;
  totalAmount: number;
  items: IPresentationDebitRequest[];
  createdAt: string;
  status: 'GENERATED' | 'SUBMITTED' | 'PROCESSING' | 'PROCESSED';
}

export interface IPresentationBatchResult {
  batchId: string;
  presentationDate: string;
  totalPresented: number;
  totalAmountPresented: number;
  successfulDebitsCount: number;
  successfulAmount: number;
  bouncedDebitsCount: number;
  bouncedAmount: number;
  results: IPresentationDebitResult[];
  processedAt: string;
}

export interface INpciReturnCodeDetails {
  code: string;
  description: string;
  category: 'FUNDS' | 'ACCOUNT_STATUS' | 'MANDATE_STATUS' | 'TECHNICAL';
  retryable: boolean;
  recommendedAction: string;
}
