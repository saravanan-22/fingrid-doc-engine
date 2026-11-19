import { BaseEsignProvider } from './providers/base.js';
import { MockEsignProvider } from './providers/mock.js';
import { DigioEsignProvider } from './providers/digio.js';
import { LeegalityEsignProvider } from './providers/leegality.js';
import { DocuSignEsignProvider } from './providers/docusign.js';
import {
  IEsignDocumentRequest,
  IEsignDocumentResponse,
  IEsignWebhookPayload,
  EsignStatus,
} from './types.js';
import { config } from '../config.js';

export interface IDocumentRecord {
  documentId: string;
  esignId?: string;
  templateId: string;
  status: EsignStatus;
  createdAt: string;
  updatedAt: string;
  signedDocumentUrl?: string;
  auditTrail: Array<{ timestamp: string; action: string; actor?: string; details?: any }>;
}

export class EsignOrchestrator {
  private static instance: EsignOrchestrator;
  private providers: Map<string, BaseEsignProvider> = new Map();
  private documents: Map<string, IDocumentRecord> = new Map();

  private constructor() {
    this.registerProvider(new MockEsignProvider());
    this.registerProvider(new DigioEsignProvider());
    this.registerProvider(new LeegalityEsignProvider());
    this.registerProvider(new DocuSignEsignProvider());
  }

  public static getInstance(): EsignOrchestrator {
    if (!EsignOrchestrator.instance) {
      EsignOrchestrator.instance = new EsignOrchestrator();
    }
    return EsignOrchestrator.instance;
  }

  public registerProvider(provider: BaseEsignProvider): void {
    this.providers.set(provider.providerName, provider);
  }

  public getProvider(name?: string): BaseEsignProvider {
    const providerName = (name || config.esign.provider).toUpperCase();
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(`eSign provider not registered: ${providerName}. Available: ${Array.from(this.providers.keys()).join(', ')}`);
    }
    return provider;
  }

  public async initiateSigning(
    request: IEsignDocumentRequest,
    providerName?: string
  ): Promise<IEsignDocumentResponse> {
    const provider = this.getProvider(providerName);
    const response = await provider.createSignatureRequest(request);

    // Save document state in local registry
    const now = new Date().toISOString();
    const docRecord: IDocumentRecord = {
      documentId: request.documentId,
      esignId: response.esignId,
      templateId: request.metadata?.templateId || 'unknown',
      status: response.status,
      createdAt: now,
      updatedAt: now,
      auditTrail: [
        {
          timestamp: now,
          action: 'SIGNING_INITIATED',
          actor: 'System',
          details: { provider: provider.providerName, signers: request.signers.map(s => s.email) },
        },
      ],
    };

    this.documents.set(request.documentId, docRecord);
    return response;
  }

  public async handleWebhook(
    rawPayload: any,
    headers: Record<string, string | string[] | undefined>,
    providerName?: string
  ): Promise<IEsignWebhookPayload> {
    const provider = this.getProvider(providerName);

    if (!provider.verifyWebhookSignature(rawPayload, headers)) {
      throw new Error(`Invalid webhook signature from ${provider.providerName}`);
    }

    const event = provider.parseWebhookEvent(rawPayload);
    const docRecord = Array.from(this.documents.values()).find(
      d => d.esignId === event.esignId || d.documentId === event.documentId
    );

    if (docRecord) {
      docRecord.updatedAt = new Date().toISOString();
      if (event.event === 'DOCUMENT_SIGNED') {
        docRecord.status = 'SIGNED';
      } else if (event.event === 'DOCUMENT_REJECTED') {
        docRecord.status = 'REJECTED';
      }

      docRecord.auditTrail.push({
        timestamp: event.timestamp,
        action: event.event,
        actor: event.signerEmail || event.signerId || 'ExternalSigner',
        details: event.raw,
      });
    }

    return event;
  }

  public getDocumentRecord(documentId: string): IDocumentRecord | undefined {
    return this.documents.get(documentId);
  }

  public listDocuments(): IDocumentRecord[] {
    return Array.from(this.documents.values());
  }
}
