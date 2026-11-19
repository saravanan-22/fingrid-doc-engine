export type TransactionType = 'CREDIT' | 'DEBIT';

export type TransactionCategory =
  | 'BUSINESS_SALES'
  | 'SALARY'
  | 'LOAN_DISBURSAL'
  | 'INTERNAL_CONTRA'
  | 'CASH_DEPOSIT'
  | 'INTEREST_CREDIT'
  | 'OTHER_CREDIT'
  | 'LOAN_EMI'
  | 'TAX_PAYMENT'
  | 'VENDOR_PAYMENT'
  | 'SALARY_PAYOUT'
  | 'UTILITY_BILL'
  | 'CASH_WITHDRAWAL'
  | 'BANK_CHARGES'
  | 'INWARD_BOUNCE'
  | 'OUTWARD_BOUNCE'
  | 'OTHER_DEBIT';

export interface IBankTransaction {
  id: string;
  date: string; // YYYY-MM-DD
  narration: string;
  referenceNumber?: string;
  type: TransactionType;
  amount: number;
  balance: number;
  category: TransactionCategory;
  isBounce?: boolean;
  bounceType?: 'INWARD' | 'OUTWARD';
  entityIdentified?: string; // e.g. "HDFC Bank", "Bajaj Finance", "GST Portal"
}

export interface IMonthlyBankingSummary {
  month: string; // e.g. "2024-04"
  totalCredits: number;
  totalDebits: number;
  netTurnover: number; // Excludes internal contra & loan disbursals
  averageBalance: number; // AMB / ABB
  highestBalance: number;
  lowestBalance: number;
  inwardBounceCount: number;
  outwardBounceCount: number;
  totalTransactionsCount: number;
}

export interface IDiscoveredEmiObligation {
  lenderPattern: string;
  approximateEmiAmount: number;
  frequencyMonths: number;
  totalPaid: number;
}

export interface IBankAnalysisResult {
  bankName: string;
  accountNumberMasked: string;
  statementPeriodStart: string;
  statementPeriodEnd: string;
  monthsAnalyzed: number;

  // Turnover & Balance Analytics
  totalBankingTurnover: number;
  annualizedTurnover: number;
  averageMonthlyBalance: number; // Overall AMB
  lowestMonthlyBalance: number;

  // Bounces & Operational Discipline
  inwardChequeBounces: number;
  outwardChequeBounces: number;
  cleanBankingFlag: boolean;

  // Cash Flow & Risk Breakdown
  cashDepositRatioPercent: number;
  cashWithdrawalRatioPercent: number;
  totalEmiDebits: number;
  discoveredActiveLoans: IDiscoveredEmiObligation[];

  // Monthly Progression
  monthlyBreakdown: IMonthlyBankingSummary[];

  // Underwriting Decision
  underwritingDecision: 'APPROVE' | 'REJECT' | 'DEVIATION_REQUIRED';
  decisionRationale: string[];
}
