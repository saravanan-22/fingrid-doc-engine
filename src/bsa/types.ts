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
  entityIdentified?: string;
}

export interface IEodMilestoneBalances {
  day5: number;
  day10: number; // Prime date for EMI deductions
  day15: number;
  day20: number;
  day25: number;
  monthEnd: number;
}

export interface IMonthlyBankingSummary {
  month: string; // e.g. "2026-06"
  totalCredits: number;
  totalDebits: number;
  creditTxnCount: number;
  debitTxnCount: number;
  netTurnover: number; // Excludes internal contra & loan disbursals
  averageBalance: number; // AMB / ABB
  highestBalance: number;
  lowestBalance: number;
  negativeBalanceDaysCount: number;
  lowBalanceDaysCount: number; // Days below minimum operational balance (e.g. ₹10,000)
  inwardBounceCount: number;
  outwardBounceCount: number;
  cashDepositTotal: number;
  cashWithdrawalTotal: number;
  taxPaymentsTotal: number;
  eodMilestones: IEodMilestoneBalances;
}

export interface IDiscoveredEmiObligation {
  lenderPattern: string;
  approximateEmiAmount: number;
  deductionDayOfMonth: number; // e.g. 5th, 10th
  frequencyMonths: number;
  totalPaid: number;
  loanTypeGuessed: string;
}

export interface IBounceEventDetail {
  date: string;
  narration: string;
  amount: number;
  bounceType: 'INWARD' | 'OUTWARD';
  reason: string;
  reference?: string;
}

export interface ICounterpartySummary {
  name: string;
  totalAmount: number;
  transactionCount: number;
  percentageOfTotal: number;
}

export interface IBankingForensics {
  circularTransactionsFlag: boolean;
  highCashRatioFlag: boolean;
  decliningAmbTrendFlag: boolean;
  sameDayCreditDebitChurnRatio: number;
  volatilityScore: 'LOW' | 'MODERATE' | 'HIGH';
  negativeBalanceDaysTotal: number;
  totalDaysAnalyzed: number;
}

export interface IBankAnalysisResult {
  bankName: string;
  accountNumberMasked: string;
  accountType: 'CURRENT' | 'SAVINGS' | 'OVERDRAFT' | 'CASH_CREDIT';
  currency: string;
  statementPeriodStart: string;
  statementPeriodEnd: string;
  monthsAnalyzed: number;

  // Grade & Underwriting Scorecard
  bankingHealthGrade: 'A+' | 'A' | 'B+' | 'B' | 'C' | 'D' | 'F';
  overallScorePercent: number;

  // Turnover & Balance Analytics
  totalBankingTurnover: number;
  annualizedTurnover: number;
  averageMonthlyBalance: number; // Overall AMB / ABB
  highestMonthlyBalance: number;
  lowestMonthlyBalance: number;
  creditToDebitRatio: number;

  // Bounces & Operational Discipline (Banking DPD)
  inwardChequeBounces: number;
  outwardChequeBounces: number;
  bounceRatioPercent: number; // Outward Bounces / Total Debits %
  cleanBankingFlag: boolean;
  detailedBounceEvents: IBounceEventDetail[];

  // Cash Flow & Risk Ratios
  cashDepositRatioPercent: number;
  cashWithdrawalRatioPercent: number;
  totalEmiDebits: number;
  discoveredActiveLoans: IDiscoveredEmiObligation[];

  // Counterparty Analysis
  topCreditors: ICounterpartySummary[];
  topDebtors: ICounterpartySummary[];

  // Monthly Progression & EOD Milestones
  monthlyBreakdown: IMonthlyBankingSummary[];

  // Forensics & Anomaly Radar
  forensics: IBankingForensics;

  // Underwriting Decision
  underwritingDecision: 'APPROVE' | 'REJECT' | 'DEVIATION_REQUIRED';
  decisionRationale: string[];
}
