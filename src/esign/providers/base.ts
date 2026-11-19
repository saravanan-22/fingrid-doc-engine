import {
  IEsignDocumentRequest,
  IEsignDocumentResponse,
  IEsignWebhookPayload,
  EsignStatus,
} from '../types.js';

export interface IEsignStatusResponse {
  esignId: string;
  documentId: string;
  status: EsignStatus;
  signers: Array<{
    id: string;
    email: string;
    status: 'PENDING' | 'SIGNED' | 'REJECTED';
    signedAt?: string;
  }>;
}

export abstract class BaseEsignProvider {
  abstract readonly providerName: 'MOCK' | 'DIGIO' | 'LEEGALITY' | 'DOCUSIGN';

  /**
   * Initializes signature ceremony with the provider
   */
  abstract createSignatureRequest(
    request: IEsignDocumentRequest
  ): Promise<IEsignDocumentResponse>;

  /**
   * Checks the status of an ongoing eSign workflow
   */
  abstract getSignatureStatus(esignId: string): Promise<IEsignStatusResponse>;

  /**
   * Downloads the completed, digitally signed PDF with cryptographic stamp
   */
  abstract downloadSignedDocument(esignId: string): Promise<Buffer>;

  /**
   * Validates inbound webhook signatures for security
   */
  abstract verifyWebhookSignature(
    payload: any,
    headers: Record<string, string | string[] | undefined>
  ): boolean;

  /**
   * Normalizes provider-specific webhook payloads into FinGrid standard format
   */
  abstract parseWebhookEvent(rawPayload: any): IEsignWebhookPayload;
}
