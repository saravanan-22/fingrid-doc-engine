export type ItrFormType = 'ITR_1' | 'ITR_2' | 'ITR_3' | 'ITR_4' | 'ITR_5' | 'ITR_6';
export type FilingSection = '139(1)' | '139(4)' | '139(5)' | '142(1)' | '148';

export interface IItrFiling {
  assessmentYear: string; // e.g. "AY 2025-26"
  financialYear: string;  // e.g. "FY 2024-25"
  formType: ItrFormType;
  filingDate: string; // YYYY-MM-DD
  dueDate: string;
  filingSection: FilingSection;
  isBelated: boolean;
  acknowledgementNumber: string;

  // Income & Profitability Metrics
  grossReceiptsOrTurnover: number;
  grossTotalIncome: number;
  totalTaxableIncome: number;
  profitBeforeTax: number;
  profitAfterTax: number;
  depreciation: number;
  cashAccruals: number; // PAT + Depreciation

  // Taxes
  totalTaxPaid: number;
  advanceTaxPaid: number;
  tdsCredit: number;
  selfAssessmentTaxPaid: number;
  effectiveTaxRatePercent: number;
}

export interface IGstr3bMonth {
  month: string; // e.g. "2025-04"
  filingDate: string;
  dueDate: string;
  isFiledLate: boolean;
  delayInDays: number;

  // Table 3.1: Outward Supplies (Turnover)
  taxableSupplies31a: number; // Core commercial sales
  zeroRatedSupplies31b: number; // Exports
  exemptNilSupplies31c: number;
  totalOutwardTurnover: number;

  // Tax Liabilities
  totalTaxLiability: number;
  itcUtilized: number;
  taxPaidInCash: number; // Table 6.1 cash ledger
  cashTaxRatioPercent: number; // (taxPaidInCash / totalTaxLiability) * 100
}

export interface IItrAnalysisResult {
  pan: string;
  entityName: string;
  filingsCount: number;
  latestTurnover: number;
  latestProfitAfterTax: number;
  latestCashAccruals: number;
  threeYearTurnoverCagr: number;
  averageNetProfitMargin: number;
  belatedFilingsCount: number;
  filingDiscipline: 'EXCELLENT' | 'GOOD' | 'POOR';
  filings: IItrFiling[];
  underwritingDecision: 'APPROVE' | 'REJECT' | 'DEVIATION_REQUIRED';
  decisionRationale: string[];
}

export interface IGstr3bAnalysisResult {
  gstin: string;
  entityName: string;
  monthsAnalyzed: number;
  totalAnnualGstTurnover: number;
  averageMonthlyTurnover: number;
  totalCashTaxPaid: number;
  overallCashTaxRatioPercent: number;
  lateFilingsCount: number;
  filingRegularityScorePercent: number; // e.g. 100% = on-time
  highestTurnoverMonth: { month: string; amount: number };
  lowestTurnoverMonth: { month: string; amount: number };
  monthlyBreakdown: IGstr3bMonth[];
  underwritingDecision: 'APPROVE' | 'REJECT' | 'DEVIATION_REQUIRED';
  decisionRationale: string[];
}

export interface ITriangulationResult {
  borrowerPan: string;
  entityName: string;
  comparisonPeriod: string;

  // The Three Pillars
  bankingTurnoverAnnualized: number; // From BSA
  gstTurnoverAnnualized: number;     // From GSTR-3B Table 3.1a
  itrGrossTurnover: number;          // From ITR Revenue from Operations

  // Variances & Deviation Ratios
  gstVsBankVariancePercent: number; // |Bank - GST| / GST * 100
  itrVsGstVariancePercent: number;  // |ITR - GST| / GST * 100
  itrVsBankVariancePercent: number; // |ITR - Bank| / Bank * 100

  // Anomaly Radar
  circularRevenueRiskFlag: boolean; // Bank >> GST
  underreportingRiskFlag: boolean;  // GST >> Bank or ITR >> GST
  reconciliationStatus: 'RECONCILED' | 'ACCEPTABLE_DEVIATION' | 'UNRECONCILED_HIGH_RISK';

  underwritingDecision: 'APPROVE' | 'REJECT' | 'DEVIATION_REQUIRED';
  decisionRationale: string[];
}
