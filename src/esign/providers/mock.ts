import { BaseEsignProvider, IEsignStatusResponse } from './base.js';
import {
  IEsignDocumentRequest,
  IEsignDocumentResponse,
  IEsignWebhookPayload,
  EsignStatus,
  ISignerInfo,
} from '../types.js';
import { v4 as uuidv4 } from 'uuid';

interface IMockSession {
  esignId: string;
  documentId: string;
  title: string;
  status: EsignStatus;
  signers: ISignerInfo[];
  createdAt: string;
  expiresAt: string;
  buffer: Buffer;
}

export class MockEsignProvider extends BaseEsignProvider {
  readonly providerName = 'MOCK';
  private static sessions: Map<string, IMockSession> = new Map();

  async createSignatureRequest(request: IEsignDocumentRequest): Promise<IEsignDocumentResponse> {
    const esignId = `MOCK-ESIGN-${uuidv4().substring(0, 8).toUpperCase()}`;
    const createdAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + (request.expiryDays || 7) * 86400000).toISOString();

    const signersWithUrls: ISignerInfo[] = request.signers.map(s => ({
      ...s,
      status: 'PENDING',
      signingUrl: `http://localhost:4000/api/v1/esign/mock-sign/${esignId}/${s.id}`,
    }));

    const session: IMockSession = {
      esignId,
      documentId: request.documentId,
      title: request.documentTitle,
      status: 'REQUESTED',
      signers: signersWithUrls,
      createdAt,
      expiresAt,
      buffer: request.documentBuffer,
    };

    MockEsignProvider.sessions.set(esignId, session);

    return {
      esignId,
      documentId: request.documentId,
      status: 'REQUESTED',
      signers: signersWithUrls,
      createdAt,
      expiresAt,
      provider: 'MOCK',
      auditCertificateUrl: `http://localhost:4000/api/v1/esign/audit-trail/${esignId}`,
    };
  }

  async getSignatureStatus(esignId: string): Promise<IEsignStatusResponse> {
    const session = MockEsignProvider.sessions.get(esignId);
    if (!session) {
      throw new Error(`Mock eSign session not found: ${esignId}`);
    }

    return {
      esignId: session.esignId,
      documentId: session.documentId,
      status: session.status,
      signers: session.signers.map(s => ({
        id: s.id,
        email: s.email,
        status: s.status,
        signedAt: s.signedAt,
      })),
    };
  }

  async downloadSignedDocument(esignId: string): Promise<Buffer> {
    const session = MockEsignProvider.sessions.get(esignId);
    if (!session) {
      throw new Error(`Mock eSign session not found: ${esignId}`);
    }

    // Return the document buffer with simulated signature stamp metadata
    const auditStamp = `\n<!-- FINGRID VERIFIED DIGITAL SIGNATURE: ${esignId} - TAMPER-PROOF SHA-256 SEAL -->\n`;
    return Buffer.concat([session.buffer, Buffer.from(auditStamp, 'utf-8')]);
  }

  verifyWebhookSignature(payload: any, headers: Record<string, string | string[] | undefined>): boolean {
    return true; // Mock provider always verifies for testing
  }

  parseWebhookEvent(rawPayload: any): IEsignWebhookPayload {
    return {
      event: rawPayload.event || 'DOCUMENT_SIGNED',
      esignId: rawPayload.esignId,
      documentId: rawPayload.documentId,
      signerId: rawPayload.signerId,
      timestamp: rawPayload.timestamp || new Date().toISOString(),
      raw: rawPayload,
    };
  }

  // Helper method to simulate a signer completing signature in test/dev
  public static simulateSign(esignId: string, signerId: string): IMockSession {
    const session = this.sessions.get(esignId);
    if (!session) throw new Error(`Session ${esignId} not found`);

    const signer = session.signers.find(s => s.id === signerId);
    if (!signer) throw new Error(`Signer ${signerId} not found in session`);

    signer.status = 'SIGNED';
    signer.signedAt = new Date().toISOString();

    const allSigned = session.signers.every(s => s.status === 'SIGNED');
    session.status = allSigned ? 'SIGNED' : 'PARTIALLY_SIGNED';

    return session;
  }
}
