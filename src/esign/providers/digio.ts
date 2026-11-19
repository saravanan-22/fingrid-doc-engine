import { BaseEsignProvider, IEsignStatusResponse } from './base.js';
import {
  IEsignDocumentRequest,
  IEsignDocumentResponse,
  IEsignWebhookPayload,
  EsignStatus,
} from '../types.js';
import { config } from '../../config.js';
import crypto from 'crypto';

export class DigioEsignProvider extends BaseEsignProvider {
  readonly providerName = 'DIGIO';

  private getBaseUrl(): string {
    return config.esign.digio.environment === 'production'
      ? 'https://api.digio.in/v2'
      : 'https://ext.digio.in:444/v2';
  }

  private getAuthHeader(): string {
    const creds = `${config.esign.digio.clientId}:${config.esign.digio.clientSecret}`;
    return `Basic ${Buffer.from(creds).toString('base64')}`;
  }

  async createSignatureRequest(request: IEsignDocumentRequest): Promise<IEsignDocumentResponse> {
    const signersPayload = request.signers.map(s => ({
      identifier: s.email || s.phone,
      name: s.name,
      reason: `FinGrid ${request.documentTitle} Approval`,
      sign_type: s.signatureType === 'DSC' ? 'dsc' : 'aadhaar',
      expire_in_days: request.expiryDays || 10,
    }));

    const body = {
      signers: signersPayload,
      expire_in_days: request.expiryDays || 10,
      display_on_page: 'all',
      notify_signers: true,
      send_sign_link: true,
      file_name: `${request.documentId}.pdf`,
    };

    const formData = new FormData();
    const pdfBlob = new Blob([request.documentBuffer], { type: 'application/pdf' });
    formData.append('file', pdfBlob, `${request.documentId}.pdf`);
    formData.append('request', JSON.stringify(body));

    const response = await fetch(`${this.getBaseUrl()}/client/document/upload`, {
      method: 'POST',
      headers: {
        Authorization: this.getAuthHeader(),
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Digio upload error (${response.status}): ${errorText}`);
    }

    const data = (await response.json()) as any;

    return {
      esignId: data.id,
      documentId: request.documentId,
      status: 'REQUESTED',
      signers: request.signers.map((s, idx) => ({
        ...s,
        status: 'PENDING',
        signingUrl: data.signing_parties?.[idx]?.signature_link,
      })),
      createdAt: data.created_at || new Date().toISOString(),
      expiresAt: data.expire_on || new Date().toISOString(),
      provider: 'DIGIO',
    };
  }

  async getSignatureStatus(esignId: string): Promise<IEsignStatusResponse> {
    const response = await fetch(`${this.getBaseUrl()}/client/document/${esignId}`, {
      method: 'GET',
      headers: {
        Authorization: this.getAuthHeader(),
      },
    });

    if (!response.ok) {
      throw new Error(`Digio status failed: ${response.statusText}`);
    }

    const data = (await response.json()) as any;
    let status: EsignStatus = 'PENDING';
    if (data.agreement_status === 'completed') status = 'SIGNED';
    else if (data.agreement_status === 'rejected') status = 'REJECTED';
    else if (data.agreement_status === 'expired') status = 'EXPIRED';

    return {
      esignId: data.id,
      documentId: data.file_name?.replace('.pdf', '') || data.id,
      status,
      signers: (data.signing_parties || []).map((p: any) => ({
        id: p.identifier,
        email: p.identifier,
        status: p.status === 'signed' ? 'SIGNED' : 'PENDING',
        signedAt: p.signed_at,
      })),
    };
  }

  async downloadSignedDocument(esignId: string): Promise<Buffer> {
    const response = await fetch(`${this.getBaseUrl()}/client/document/download?document_id=${esignId}`, {
      headers: {
        Authorization: this.getAuthHeader(),
      },
    });

    if (!response.ok) {
      throw new Error(`Digio download failed: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  verifyWebhookSignature(payload: any, headers: Record<string, string | string[] | undefined>): boolean {
    const signature = headers['x-digio-signature'];
    if (!signature || typeof signature !== 'string') return false;

    const hmac = crypto.createHmac('sha256', config.esign.webhookSecret);
    const calculated = hmac.update(JSON.stringify(payload)).digest('hex');
    return calculated === signature;
  }

  parseWebhookEvent(rawPayload: any): IEsignWebhookPayload {
    return {
      event: rawPayload.event === 'agreement_completed' ? 'DOCUMENT_SIGNED' : 'DOCUMENT_REJECTED',
      esignId: rawPayload.payload?.document?.id,
      documentId: rawPayload.payload?.document?.file_name?.replace('.pdf', ''),
      timestamp: new Date().toISOString(),
      raw: rawPayload,
    };
  }
}
