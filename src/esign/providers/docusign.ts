import { BaseEsignProvider, IEsignStatusResponse } from './base.js';
import {
  IEsignDocumentRequest,
  IEsignDocumentResponse,
  IEsignWebhookPayload,
} from '../types.js';
import { config } from '../../config.js';

export class DocuSignEsignProvider extends BaseEsignProvider {
  readonly providerName = 'DOCUSIGN';

  async createSignatureRequest(request: IEsignDocumentRequest): Promise<IEsignDocumentResponse> {
    const { accountId, baseUrl } = config.esign.docusign;
    const documentBase64 = request.documentBuffer.toString('base64');

    const envelopeDefinition = {
      emailSubject: `FinGrid Signature Request: ${request.documentTitle}`,
      documents: [
        {
          documentBase64,
          name: `${request.documentTitle}.pdf`,
          fileExtension: 'pdf',
          documentId: '1',
        },
      ],
      recipients: {
        signers: request.signers.map((s, idx) => ({
          email: s.email,
          name: s.name,
          recipientId: String(idx + 1),
          routingOrder: String(s.sequence || idx + 1),
          tabs: {
            signHereTabs: [
              {
                anchorString: `[[sig:${s.id}]]`,
                anchorUnits: 'pixels',
                anchorXOffset: '0',
                anchorYOffset: '0',
              },
            ],
          },
        })),
      },
      status: 'sent',
    };

    // If no DocuSign account configured, return mock envelope
    if (!accountId) {
      console.warn('DocuSign credentials missing. Falling back to simulated DocuSign envelope.');
      return {
        esignId: `DS-MOCK-${Date.now()}`,
        documentId: request.documentId,
        status: 'REQUESTED',
        signers: request.signers.map(s => ({ ...s, status: 'PENDING' })),
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 10 * 86400000).toISOString(),
        provider: 'DOCUSIGN',
      };
    }

    const response = await fetch(`${baseUrl}/v2.1/accounts/${accountId}/envelopes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.esign.docusign.clientSecret}`,
      },
      body: JSON.stringify(envelopeDefinition),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`DocuSign API error: ${err}`);
    }

    const data = (await response.json()) as any;
    return {
      esignId: data.envelopeId,
      documentId: request.documentId,
      status: 'REQUESTED',
      signers: request.signers.map(s => ({ ...s, status: 'PENDING' })),
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 10 * 86400000).toISOString(),
      provider: 'DOCUSIGN',
    };
  }

  async getSignatureStatus(esignId: string): Promise<IEsignStatusResponse> {
    return {
      esignId,
      documentId: esignId,
      status: 'PENDING',
      signers: [],
    };
  }

  async downloadSignedDocument(esignId: string): Promise<Buffer> {
    return Buffer.from('');
  }

  verifyWebhookSignature(payload: any, headers: Record<string, string | string[] | undefined>): boolean {
    return true;
  }

  parseWebhookEvent(rawPayload: any): IEsignWebhookPayload {
    return {
      event: rawPayload.event === 'envelope-completed' ? 'DOCUMENT_SIGNED' : 'DOCUMENT_REJECTED',
      esignId: rawPayload.data?.envelopeId,
      documentId: rawPayload.data?.envelopeSummary?.customFields?.documentId,
      timestamp: new Date().toISOString(),
      raw: rawPayload,
    };
  }
}
