import { Router, Request, Response } from 'express';
import { createHash } from 'crypto';
import { EsignOrchestrator } from '../esign/orchestrator.js';
import { MockEsignProvider } from '../esign/providers/mock.js';
import { AnchorParser } from '../esign/anchor-parser.js';
import { DocumentRenderer } from '../engine/renderer.js';

export const esignRouter = Router();
const orchestrator = EsignOrchestrator.getInstance();
const renderer = new DocumentRenderer();

/**
 * Initiate an eSign request for a generated document
 */
esignRouter.post('/initiate', async (req: Request, res: Response) => {
  try {
    const { templateId, data, signers, options, provider } = req.body;
    if (!templateId || !data || !signers || !Array.isArray(signers) || signers.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'templateId, data, and an array of signers are required',
      });
    }

    // Render document
    const renderResult = renderer.render(templateId, data, options);
    const anchors = AnchorParser.parseAnchors(renderResult.html);

    const esignReq = {
      documentId: renderResult.documentId,
      documentTitle: `${templateId.toUpperCase()} - ${data.borrower?.entityName || data.companyName || 'Document'}`,
      documentBuffer: Buffer.from(renderResult.html, 'utf-8'),
      signers,
      anchors,
      expiryDays: 7,
      metadata: { templateId },
    };

    const response = await orchestrator.initiateSigning(esignReq, provider);

    res.json({
      success: true,
      esignId: response.esignId,
      documentId: response.documentId,
      status: response.status,
      provider: response.provider,
      signers: response.signers,
      expiresAt: response.expiresAt,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

/**
 * Get status of an ongoing eSign workflow
 */
esignRouter.get('/status/:esignId', async (req: Request, res: Response) => {
  try {
    const { esignId } = req.params;
    const provider = orchestrator.getProvider();
    const status = await provider.getSignatureStatus(esignId);
    res.json({ success: true, status });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

/**
 * Audit trail for an eSign workflow: who signed, when, and the document fingerprint
 */
esignRouter.get('/audit-trail/:esignId', async (req: Request, res: Response) => {
  try {
    const { esignId } = req.params;
    const provider = orchestrator.getProvider();
    const status = await provider.getSignatureStatus(esignId);
    const signedDoc = await provider.downloadSignedDocument(esignId);
    res.json({
      success: true,
      auditTrail: {
        ...status,
        provider: provider.providerName,
        documentSha256: createHash('sha256').update(signedDoc).digest('hex'),
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    res.status(404).json({ success: false, error: (err as Error).message });
  }
});

/**
 * Webhook handler for eSign completion callbacks
 */
esignRouter.post('/webhook', async (req: Request, res: Response) => {
  try {
    const providerName = req.query.provider as string | undefined;
    const event = await orchestrator.handleWebhook(req.body, req.headers, providerName);
    res.json({ success: true, receivedEvent: event.event });
  } catch (err) {
    res.status(400).json({ success: false, error: (err as Error).message });
  }
});

/**
 * Mock Signing Endpoint - allows simulating signature ceremonies locally in browser
 */
esignRouter.get('/mock-sign/:esignId/:signerId', (req: Request, res: Response) => {
  try {
    const { esignId, signerId } = req.params;
    const session = MockEsignProvider.simulateSign(esignId, signerId);

    res.setHeader('Content-Type', 'text/html');
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>FinGrid eSign Verification</title>
        <style>
          body { font-family: -apple-system, sans-serif; background: #f1f5f9; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
          .card { background: white; padding: 32px; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); max-width: 480px; width: 100%; text-align: center; }
          .badge { background: #dcfce7; color: #15803d; padding: 4px 12px; border-radius: 999px; font-weight: 600; font-size: 13px; display: inline-block; margin-bottom: 16px; }
          h2 { color: #0f172a; margin-top: 0; }
          p { color: #64748b; font-size: 14px; line-height: 1.5; }
          .meta { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 12px; text-align: left; font-size: 13px; margin: 20px 0; }
          .btn { background: #1e3a8a; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; text-decoration: none; display: inline-block; font-weight: 600; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="badge">✓ eSign Completed Successfully</div>
          <h2>Document Authenticated</h2>
          <p>Your digital signature has been cryptographically applied to FinGrid financial document.</p>
          <div class="meta">
            <div><strong>eSign Ref:</strong> ${esignId}</div>
            <div><strong>Signer ID:</strong> ${signerId}</div>
            <div><strong>Status:</strong> ${session.status}</div>
            <div><strong>Timestamp:</strong> ${new Date().toISOString()}</div>
          </div>
          <p style="font-size: 12px; color: #94a3b8;">FinGrid Aadhaar/DSC Simulated Security Protocol</p>
        </div>
      </body>
      </html>
    `);
  } catch (err) {
    res.status(404).send(`<h3>Signing failed: ${(err as Error).message}</h3>`);
  }
});
