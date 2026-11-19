export type SignerRole =
  | 'BORROWER'
  | 'CO_BORROWER'
  | 'AUTHORIZED_SIGNATORY'
  | 'CREDIT_HEAD'
  | 'SANCTION_OFFICER'
  | 'BRANCH_MANAGER'
  | 'LEGAL_APPROVER';

export type SignatureType =
  | 'AADHAAR_ESIGN'        // Indian Aadhaar OTP/Biometric eSign via C-DAC/NSDL/eMudhra
  | 'DSC'                  // Class 3 Digital Signature Certificate (Dongle/USB)
  | 'ELECTRONIC_SIGNATURE' // Standard Click-to-sign / OTP / DocuSign signature
  | 'VIRTUAL_SIGN';        // Draw/Type signature

export type EsignStatus =
  | 'DRAFT'
  | 'REQUESTED'
  | 'PENDING'
  | 'PARTIALLY_SIGNED'
  | 'SIGNED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'CANCELLED';

export interface ISignerInfo {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: SignerRole | string;
  sequence?: number; // Ordering for multi-party approvals
  signatureType?: SignatureType;
  status: 'PENDING' | 'SIGNED' | 'REJECTED';
  signedAt?: string;
  signingUrl?: string;
}

export interface ISignatureAnchor {
  signerId: string;
  role: string;
  page?: number;
  x?: number;
  y?: number;
  width: number;
  height: number;
  anchorText?: string;
}

export interface IEsignDocumentRequest {
  documentId: string;
  documentTitle: string;
  documentBuffer: Buffer;
  signers: ISignerInfo[];
  anchors?: ISignatureAnchor[];
  callbackUrl?: string;
  expiryDays?: number;
  metadata?: Record<string, any>;
}

export interface IEsignDocumentResponse {
  esignId: string;
  documentId: string;
  status: EsignStatus;
  signers: ISignerInfo[];
  expiresAt: string;
  createdAt: string;
  provider: 'MOCK' | 'DIGIO' | 'LEEGALITY' | 'DOCUSIGN';
  auditCertificateUrl?: string;
}

export interface IEsignWebhookPayload {
  event: 'DOCUMENT_SIGNED' | 'DOCUMENT_REJECTED' | 'DOCUMENT_EXPIRED' | 'SIGNER_SIGNED';
  esignId: string;
  documentId: string;
  signerId?: string;
  signerEmail?: string;
  timestamp: string;
  raw?: any;
}
