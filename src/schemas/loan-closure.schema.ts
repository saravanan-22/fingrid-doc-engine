import { z } from 'zod';
import { SignerSchema } from './common.js';

export const LoanClosureSchema = z.object({
  nocReferenceNumber: z.string(),
  issueDate: z.string(),

  borrower: z.object({
    name: z.string(),
    customerNumber: z.string(),
    address: z.string(),
    email: z.string().email().optional(),
    mobile: z.string().optional(),
  }),

  loanDetails: z.object({
    accountNumber: z.string(),
    facilityType: z.string(),
    sanctionDate: z.string(),
    sanctionAmount: z.number().positive(),
    closureDate: z.string(),
    closureReason: z.enum(['NORMAL_CLOSURE', 'FULL_PREPAYMENT', 'BALANCE_TRANSFER', 'RESTRUCTURED_SETTLEMENT']),
    totalPrincipalRepaid: z.number(),
    outstandingDues: z.number().default(0),
  }),

  securitiesReleased: z.array(z.object({
    assetType: z.string(), // e.g. "Residential Property", "Commercial Vehicle"
    identifier: z.string(), // e.g. "Doc No. 1928/2021", "Reg No. MH-02-CB-9090"
    description: z.string(),
  })).default([]),

  rocSatisfactionNote: z.string().optional().default(
    'FinGrid Capital confirms that all charges created with the Registrar of Companies (ROC) with respect to this facility shall be satisfied via Form CHG-4.'
  ),

  branch: z.object({
    branchName: z.string(),
    city: z.string(),
    branchEmail: z.string().email(),
  }),

  signers: z.array(SignerSchema).default([]),
});

export type ILoanClosureInput = z.infer<typeof LoanClosureSchema>;
