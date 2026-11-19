import { z } from 'zod';
import { BorrowerProfileSchema, SignerSchema } from './common.js';

export const CamReportSchema = z.object({
  applicationId: z.string(),
  proposalDate: z.string(),
  branchName: z.string(),
  creditAnalystName: z.string(),
  relationshipManagerName: z.string(),

  borrower: BorrowerProfileSchema,

  facilityRequested: z.object({
    facilityType: z.enum(['TERM_LOAN', 'WORKING_CAPITAL_LIMIT', 'LINE_OF_CREDIT', 'EQUIPMENT_FINANCE', 'INVOICE_DISCOUNTING']),
    proposedAmount: z.number().positive(),
    recommendedAmount: z.number().positive(),
    tenureMonths: z.number().int().positive(),
    interestRatePercent: z.number().positive(),
    processingFeePercent: z.number().min(0),
    repaymentFrequency: z.enum(['MONTHLY', 'QUARTERLY', 'BULLET']),
    purpose: z.string(),
  }),

  financialSummary: z.array(z.object({
    financialYear: z.string(), // e.g. "FY24 (Audited)", "FY25 (Provisional)"
    revenueFromOperations: z.number(),
    ebitda: z.number(),
    ebitdaMarginPercent: z.number(),
    pat: z.number(),
    patMarginPercent: z.number(),
    netWorth: z.number(),
    totalDebt: z.number(),
    dscr: z.number(),
    currentRatio: z.number(),
    debtEquityRatio: z.number(),
  })),

  bankingSummary: z.object({
    bankName: z.string(),
    accountNumberMasked: z.string(),
    annualTurnoverCredited: z.number(),
    averageMonthlyBalance: z.number(),
    inwardChequeBounces: z.number().int().nonnegative(),
    outwardChequeBounces: z.number().int().nonnegative(),
    cleanBankingFlag: z.boolean().default(true),
  }),

  bureauAnalysis: z.object({
    cmrRank: z.string(), // e.g. "CMR-3 (Low Risk)"
    cibilCommercialScore: z.number().optional(),
    delinquencySummary: z.string(),
  }),

  collaterals: z.array(z.object({
    assetType: z.string(),
    description: z.string(),
    marketValue: z.number(),
    distressValue: z.number(),
    chargeType: z.enum(['EXCLUSIVE_FIRST_CHARGE', 'PARI_PASSU', 'PLEDGE', 'HYPOTHECATION']),
  })).optional().default([]),

  riskAssessment: z.object({
    industryRisk: z.enum(['LOW', 'MODERATE', 'HIGH']),
    businessRisk: z.enum(['LOW', 'MODERATE', 'HIGH']),
    financialRisk: z.enum(['LOW', 'MODERATE', 'HIGH']),
    mitigants: z.array(z.string()),
    keyStrengths: z.array(z.string()),
    keyRisks: z.array(z.string()),
  }),

  creditRecommendation: z.object({
    decision: z.enum(['SANCTION', 'REJECT', 'DEVIATION_APPROVAL']),
    rationale: z.string(),
    covenants: z.array(z.string()),
  }),

  signers: z.array(SignerSchema).default([]),
});

export type ICamReportInput = z.infer<typeof CamReportSchema>;
