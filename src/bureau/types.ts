export type BureauProviderType = 'CIBIL' | 'EXPERIAN' | 'CRIF' | 'EQUIFAX' | 'MOCK';
export type BureauReportType = 'CONSUMER' | 'COMMERCIAL';

export type AssetClassification = 'STD' | 'SUB' | 'DBT' | 'LSS' | 'SMA_0' | 'SMA_1' | 'SMA_2';

export interface IDpdMonth {
  monthIndex: number; // 1 = latest, 36 = oldest
  dateString?: string;
  dpd: number; // 0, 30, 60, 90, etc.
  rawCode: string; // e.g. "000", "030", "STD", "SUB", "XXX"
  assetClass: AssetClassification;
  isDelinquent: boolean;
}

export interface ITradeline {
  accountId: string;
  lenderName: string;
  accountType: 'HOME_LOAN' | 'AUTO_LOAN' | 'PERSONAL_LOAN' | 'CREDIT_CARD' | 'BUSINESS_LOAN' | 'OVERDRAFT' | 'TERM_LOAN' | 'OTHER';
  isSecured: boolean;
  sanctionedAmount: number;
  currentBalance: number;
  overdueAmount: number;
  monthlyEmi: number;
  openDate: string;
  closedDate?: string;
  accountStatus: 'ACTIVE' | 'CLOSED' | 'SETTLED' | 'WRITTEN_OFF' | 'SUIT_FILED';
  paymentHistoryString: string; // Legacy 36-month string e.g. "000000000030000..."
  parsedDpd?: IDpdMonth[];
  maxDpd: number;
  assetClassification: AssetClassification;
  derogatoryFlag?: 'SUIT_FILED' | 'WRITTEN_OFF' | 'WILFUL_DEFAULT' | 'NONE';
}

export interface IInquiryRecord {
  inquiryDate: string;
  lenderName: string;
  purpose: string;
  amountRequested?: number;
}

export interface IUnifiedBureauReport {
  reportId: string;
  provider: BureauProviderType;
  reportType: BureauReportType;
  generatedAt: string;
  borrower: {
    name: string;
    pan: string;
    dobOrIncorporation?: string;
    mobile?: string;
    address?: string;
  };
  score: {
    scoreValue: number; // 300 to 900 for consumer
    scoringModel: string; // e.g. "CIBIL TransUnion Score 2.0"
    cmrRank?: string; // e.g. "CMR-1" to "CMR-10" for MSME/Commercial
    scoreExclusionReason?: string;
  };
  tradelines: ITradeline[];
  inquiries: IInquiryRecord[];
}

export interface IBureauAnalysisResult {
  borrowerPan: string;
  provider: BureauProviderType;
  score: number;
  cmrRank?: string;
  scoreBand: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
  
  // Debt & Leverage Analytics
  totalActiveDebt: number;
  totalMonthlyEmi: number;
  securedDebt: number;
  unsecuredDebt: number;
  unsecuredDebtPercentage: number;
  activeAccountsCount: number;
  closedAccountsCount: number;

  // Delinquency & DPD Analytics
  maxDpdPast12Months: number;
  maxDpdPast36Months: number;
  totalOverdueAmount: number;
  dpdSummaryText: string;

  // Inquiries & Credit Hunger
  inquiriesLast30Days: number;
  inquiriesLast90Days: number;
  creditHungerFlag: boolean;

  // Risk Knockouts & Derogatory Factors
  derogatoryFlags: {
    hasSuitFiled: boolean;
    hasWrittenOff: boolean;
    hasSettled: boolean;
    hasWilfulDefault: boolean;
  };

  // Underwriting Decision
  underwritingDecision: 'APPROVE' | 'REJECT' | 'DEVIATION_REQUIRED';
  decisionRationale: string[];
}

export interface IBureauFetchRequest {
  entityType: 'INDIVIDUAL' | 'COMMERCIAL';
  name: string;
  pan: string;
  dobOrIncorporation?: string;
  mobile?: string;
  address?: string;
  provider?: BureauProviderType;
}
