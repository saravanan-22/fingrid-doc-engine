import { z } from 'zod';
import { SignerSchema } from './common.js';

export const SanctionLetterSchema = z.object({
  sanctionRefNumber: z.string(),
  sanctionDate: z.string(),
  validUntil: z.string(),

  borrower: z.object({
    name: z.string(),
    pan: z.string(),
    contactPerson: z.string().optional(),
    address: z.string(),
    email: z.string().email(),
    mobile: z.string(),
  }),

  loanTerms: z.object({
    facilityName: z.string(),
    sanctionedAmount: z.number().positive(),
    interestRatePercent: z.number().positive(),
    interestType: z.enum(['FIXED', 'FLOATING']),
    tenureMonths: z.number().int().positive(),
    monthlyEmi: z.number().positive(),
    processingFee: z.number().nonnegative(),
    documentationCharges: z.number().nonnegative(),
    penalChargesPerMonth: z.number().default(2.0),
  }),

  disbursementConditions: z.array(z.string()).default([]),
  specialCovenants: z.array(z.string()).default([]),

  signers: z.array(SignerSchema).default([]),
});

export type ISanctionLetterInput = z.infer<typeof SanctionLetterSchema>;
