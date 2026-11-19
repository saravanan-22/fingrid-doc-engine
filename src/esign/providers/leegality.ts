import { BaseEsignProvider, IEsignStatusResponse } from './base.js';
import {
  IEsignDocumentRequest,
  IEsignDocumentResponse,
  IEsignWebhookPayload,
  EsignStatus,
} from '../types.js';
import { config } from '../../config.js';

export class LeegalityEsignProvider extends BaseEsignProvider {
  readonly providerName = 'LEEGALITY';

  private getBaseUrl(): string {
    return config.esign.leegality.environment === 'production'
      ? 'https://api.leegality.com/v2.1'
      : 'https://sandbox.leegality.com/v2.1';
  }

  async createSignatureRequest(request: IEsignDocumentRequest): Promise<IEsignDocumentResponse> {
    const invitees = request.signers.map(s => ({
      name: s.name,
      email: s.email,
      phone: s.phone,
      signType: s.signatureType === 'DSC' ? 'DSC' : 'Aadhaar',
    }));

    const payload = {
      file: request.documentBuffer.toString('base64'),
      fileName: `${request.documentId}.pdf`,
      invitees,
      expiryDays: request.expiryDays || 7,
    };

    const response = await fetch(`${this.getBaseUrl()}/document/sign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Token': config.esign.leegality.authToken,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Leegality error (${response.status}): ${err}`);
    }

    const data = (await response.json()) as any;
    return {
      esignId: data.data?.documentId || data.documentId,
      documentId: request.documentId,
      status: 'REQUESTED',
      signers: request.signers.map(s => ({ ...s, status: 'PENDING' })),
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
      provider: 'LEEGALITY',
    };
  }

  async getSignatureStatus(esignId: string): Promise<IEsignStatusResponse> {
    const response = await fetch(`${this.getBaseUrl()}/document/details?documentId=${esignId}`, {
      headers: { 'X-Auth-Token': config.esign.leegality.authToken },
    });
    const data = (await response.json()) as any;
    return {
      esignId,
      documentId: data.data?.fileName || esignId,
      status: data.data?.status === 'COMPLETED' ? 'SIGNED' : 'PENDING',
      signers: [],
    };
  }

  async downloadSignedDocument(esignId: string): Promise<Buffer> {
    const response = await fetch(`${this.getBaseUrl()}/document/download?documentId=${esignId}`, {
      headers: { 'X-Auth-Token': config.esign.leegality.authToken },
    });
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  verifyWebhookSignature(payload: any, headers: Record<string, string | string[] | undefined>): boolean {
    return true;
  }

  parseWebhookEvent(rawPayload: any): IEsignWebhookPayload {
    return {
      event: rawPayload.status === 'COMPLETED' ? 'DOCUMENT_SIGNED' : 'DOCUMENT_REJECTED',
      esignId: rawPayload.documentId,
      documentId: rawPayload.documentId,
      timestamp: new Date().toISOString(),
      raw: rawPayload,
    };
  }
}
