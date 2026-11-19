import { z } from 'zod';

export const SignerSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Signer name is required'),
  email: z.string().email('Invalid signer email'),
  phone: z.string().optional(),
  role: z.string(),
  sequence: z.number().int().positive().optional().default(1),
  signatureType: z.enum(['AADHAAR_ESIGN', 'DSC', 'ELECTRONIC_SIGNATURE', 'VIRTUAL_SIGN']).optional().default('AADHAAR_ESIGN'),
});

export const BorrowerProfileSchema = z.object({
  entityName: z.string().min(1, 'Borrower entity name is required'),
  entityType: z.enum(['PROPRIETORSHIP', 'PARTNERSHIP', 'PRIVATE_LIMITED', 'PUBLIC_LIMITED', 'LLP', 'INDIVIDUAL']),
  pan: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid PAN format'),
  gstin: z.string().optional(),
  cin: z.string().optional(),
  dateOfIncorporation: z.string().optional(),
  registeredAddress: z.string(),
  businessActivity: z.string(),
  promoters: z.array(z.object({
    name: z.string(),
    designation: z.string(),
    shareholdingPercentage: z.number().min(0).max(100),
    cibilScore: z.number().optional(),
    netWorth: z.number().optional(),
  })).optional().default([]),
});

export const LenderInfoSchema = z.object({
  name: z.string().default('FinGrid Capital Services Pvt Ltd'),
  cin: z.string().default('U65999MH2021PTC384729'),
  registeredOffice: z.string().default('Unit 802, FinTech Tower, Bandra Kurla Complex, Mumbai, Maharashtra 400051'),
  rbiRegNumber: z.string().default('N-13.02341 (NBFC-ND-SI)'),
  supportEmail: z.string().email().default('helpdesk@fingrid.example.com'),
  supportPhone: z.string().default('+91 22 6900 4500'),
});
