import { z } from 'zod';
import { SignerSchema } from './common.js';

export const PlLineItemSchema = z.object({
  particulars: z.string(),
  noteRef: z.string().optional(),
  currentPeriod: z.number(),
  previousPeriod: z.number(),
  isSubtotal: z.boolean().optional().default(false),
  isTotal: z.boolean().optional().default(false),
});

export const ProfitAndLossSchema = z.object({
  companyName: z.string(),
  cin: z.string().optional(),
  statementTitle: z.string().default('Statement of Profit and Loss'),
  accountingPeriod: z.string(), // e.g. "For the year ended 31 March 2025"
  unit: z.enum(['₹ Exact', '₹ in Lakhs', '₹ in Crores']).default('₹ in Lakhs'),

  currentPeriodHeader: z.string(), // e.g. "31-Mar-2025 (Audited)"
  previousPeriodHeader: z.string(), // e.g. "31-Mar-2024 (Audited)"

  incomeSection: z.object({
    title: z.string().default('I. Revenue'),
    items: z.array(PlLineItemSchema),
    totalRevenueCurrent: z.number(),
    totalRevenuePrevious: z.number(),
  }),

  expenseSection: z.object({
    title: z.string().default('II. Expenses'),
    items: z.array(PlLineItemSchema),
    totalExpensesCurrent: z.number(),
    totalExpensesPrevious: z.number(),
  }),

  taxSection: z.object({
    profitBeforeTaxCurrent: z.number(),
    profitBeforeTaxPrevious: z.number(),
    taxExpensesCurrent: z.number(),
    taxExpensesPrevious: z.number(),
    profitAfterTaxCurrent: z.number(),
    profitAfterTaxPrevious: z.number(),
  }),

  signers: z.array(SignerSchema).default([]),
});

export type IProfitAndLossInput = z.infer<typeof ProfitAndLossSchema>;
