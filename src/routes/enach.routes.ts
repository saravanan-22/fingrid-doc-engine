import { Router, Request, Response } from 'express';
import { MandateManager } from '../enach/mandate-manager.js';
import { PresentationEngine } from '../enach/presentation-engine.js';
import { MandateAuthMode } from '../enach/types.js';

export const enachRouter = Router();

const mandateManager = MandateManager.getInstance();
const presentationEngine = PresentationEngine.getInstance();

/**
 * POST /api/v1/enach/mandates/initiate
 * Initiates an eNACH e-mandate registration workflow
 */
enachRouter.post('/mandates/initiate', async (req: Request, res: Response): Promise<void> => {
  try {
    const mandate = await mandateManager.initiateMandate(req.body);
    res.status(201).json({
      success: true,
      message: 'Mandate registration initiated. Customer auth invitation link ready.',
      data: mandate,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to initiate mandate registration',
    });
  }
});

/**
 * GET /api/v1/enach/mandates
 * Lists all registered mandates
 */
enachRouter.get('/mandates', (_req: Request, res: Response): void => {
  const mandates = mandateManager.listAllMandates();
  res.json({
    success: true,
    count: mandates.length,
    data: mandates,
  });
});

/**
 * GET /api/v1/enach/mandates/:mandateId
 * Fetches mandate status and details by ID
 */
enachRouter.get('/mandates/:mandateId', (req: Request, res: Response): void => {
  const mandate = mandateManager.getMandate(req.params.mandateId);
  if (!mandate) {
    res.status(404).json({ success: false, error: 'Mandate not found' });
    return;
  }
  res.json({ success: true, data: mandate });
});

/**
 * POST /api/v1/enach/mandates/:mandateId/authenticate
 * Approves or rejects customer mandate authentication
 */
enachRouter.post('/mandates/:mandateId/authenticate', async (req: Request, res: Response): Promise<void> => {
  try {
    const { authMode, action } = req.body as { authMode?: MandateAuthMode; action?: 'ACCEPT' | 'REJECT' };
    const result = await mandateManager.authenticateMandate(
      req.params.mandateId,
      authMode,
      action || 'ACCEPT'
    );

    res.json({
      success: result.success,
      message: result.success
        ? `Mandate successfully authenticated via ${result.mandate.authMode}. NPCI UMRN issued: ${result.mandate.umrn}`
        : `Mandate authentication rejected: ${result.error}`,
      data: result.mandate,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/v1/enach/mandates/:mandateId/cancel
 * Revokes / cancels an active mandate
 */
enachRouter.post('/mandates/:mandateId/cancel', async (req: Request, res: Response): Promise<void> => {
  try {
    const reason = req.body.reason || 'Requested by customer or lender';
    const mandate = await mandateManager.cancelMandate(req.params.mandateId, reason);
    res.json({
      success: true,
      message: 'Mandate successfully cancelled',
      data: mandate,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/v1/enach/notifications/send-pre-debit
 * Dispatches RBI-compliant 24-hour pre-debit alert
 */
enachRouter.post('/notifications/send-pre-debit', (req: Request, res: Response): void => {
  try {
    const { mandateId, amount, debitDate } = req.body;
    if (!mandateId || !amount || !debitDate) {
      res.status(400).json({ success: false, error: 'mandateId, amount, and debitDate are required' });
      return;
    }

    const notification = presentationEngine.sendPreDebitNotification(mandateId, amount, debitDate);
    res.status(201).json({
      success: true,
      message: 'RBI 24-hour pre-debit alert dispatched successfully',
      data: notification,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/v1/enach/presentations/single
 * Presents a single loan EMI installment debit to NPCI
 */
enachRouter.post('/presentations/single', async (req: Request, res: Response): Promise<void> => {
  try {
    const { simulateReturnCode, bypassNotificationCheck, ...debitRequest } = req.body;
    const result = await presentationEngine.presentSingleDebit(debitRequest, {
      simulateReturnCode,
      bypassNotificationCheck,
    });

    res.json({
      success: result.settlementStatus === 'SUCCESS',
      data: result,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/v1/enach/presentations/batch
 * Presents a batch clearing run for a scheduled EMI due date
 */
enachRouter.post('/presentations/batch', async (req: Request, res: Response): Promise<void> => {
  try {
    const { presentationDate, items, simulateReturns } = req.body;
    if (!presentationDate || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ success: false, error: 'presentationDate and non-empty items array are required' });
      return;
    }

    const batch = presentationEngine.createBatch(presentationDate, items);
    const summary = await presentationEngine.processBatch(batch.batchId, simulateReturns, true);

    res.json({
      success: true,
      message: `Batch presented: ${summary.successfulDebitsCount} successful, ${summary.bouncedDebitsCount} returned`,
      data: summary,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/v1/enach/presentations/:presentationId/retry
 * Schedules retry representation for a returned debit
 */
enachRouter.post('/presentations/:presentationId/retry', (req: Request, res: Response): void => {
  try {
    const { daysAhead } = req.body;
    const result = presentationEngine.scheduleRetry(req.params.presentationId, daysAhead || 3);
    res.json({
      success: true,
      message: `Retry scheduled for ${result.retryScheduledDate} (Attempt #${result.retryCount})`,
      data: result,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/v1/enach/mock-auth/:mandateId
 * Renders an interactive NPCI ONMAGS authentication simulation portal
 */
enachRouter.get('/mock-auth/:mandateId', (req: Request, res: Response): void => {
  const mandate = mandateManager.getMandate(req.params.mandateId);
  if (!mandate) {
    res.status(404).send('<h1>Mandate Not Found</h1>');
    return;
  }

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>NPCI e-Mandate Authentication | FinGrid</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #f8fafc; padding: 40px 20px; }
    .card { max-width: 620px; margin: 0 auto; background: #1e293b; border-radius: 12px; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); border: 1px solid #334155; }
    .logo-row { display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #334155; padding-bottom: 16px; margin-bottom: 24px; }
    .title { font-size: 20px; font-weight: 700; color: #38bdf8; }
    .badge { background: #0369a1; color: #e0f2fe; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; }
    .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #334155; font-size: 14px; }
    .label { color: #94a3b8; }
    .value { font-weight: 600; color: #f1f5f9; }
    .modes { margin: 24px 0 16px; display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
    .btn { padding: 12px; border-radius: 8px; border: none; font-weight: 600; font-size: 13px; cursor: pointer; transition: all 0.2s; }
    .btn-auth { background: #0284c7; color: white; }
    .btn-auth:hover { background: #0369a1; }
    .btn-reject { background: #ef4444; color: white; grid-column: span 2; margin-top: 8px; }
    .btn-reject:hover { background: #dc2626; }
    .rbi-note { font-size: 11px; color: #64748b; margin-top: 20px; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo-row">
      <div class="title">🏛️ NPCI e-Mandate (eNACH)</div>
      <div class="badge">ONMAGS v2.4</div>
    </div>
    
    <div style="margin-bottom: 20px;">
      <p style="margin: 0; color: #cbd5e1; font-size: 15px;">Authenticate recurring auto-debit consent for <strong>FinGrid Lending Ltd</strong>.</p>
    </div>

    <div class="detail-row"><span class="label">Mandate ID</span><span class="value">${mandate.mandateId}</span></div>
    <div class="detail-row"><span class="label">Borrower Name</span><span class="value">${mandate.customerName}</span></div>
    <div class="detail-row"><span class="label">Loan Account</span><span class="value">${mandate.loanAccountId}</span></div>
    <div class="detail-row"><span class="label">Destination Bank</span><span class="value">${mandate.bankDetails.bankName} (${mandate.bankDetails.ifscCode})</span></div>
    <div class="detail-row"><span class="label">Bank A/C Number</span><span class="value">••••${mandate.bankDetails.accountNumber.slice(-4)}</span></div>
    <div class="detail-row"><span class="label">Monthly EMI Amount</span><span class="value">₹${mandate.monthlyEmiAmount.toLocaleString('en-IN')}</span></div>
    <div class="detail-row"><span class="label">Max Mandate Cap</span><span class="value" style="color: #4ade80;">₹${mandate.maxAmount.toLocaleString('en-IN')}</span></div>
    <div class="detail-row"><span class="label">Validity Period</span><span class="value">${mandate.startDate} to ${mandate.endDate}</span></div>
    <div class="detail-row"><span class="label">Current Status</span><span class="value" style="color: #f59e0b;">${mandate.status}</span></div>

    <div class="modes">
      <button class="btn btn-auth" onclick="authenticate('NET_BANKING')">🌐 Net Banking</button>
      <button class="btn btn-auth" onclick="authenticate('DEBIT_CARD')">💳 Debit Card + OTP</button>
      <button class="btn btn-auth" onclick="authenticate('AADHAAR')">🆔 Aadhaar OTP (UIDAI)</button>
      <button class="btn btn-auth" onclick="authenticate('UPI_AUTOPAY')">📱 UPI AutoPay</button>
      <button class="btn btn-reject" onclick="authenticate(null, 'REJECT')">❌ Decline / Reject Mandate</button>
    </div>

    <div class="rbi-note">
      🔒 Regulated by Reserve Bank of India & National Payments Corporation of India (NPCI). 24h pre-debit alert mandatory before every installment clearing.
    </div>
  </div>

  <script>
    async function authenticate(authMode, action = 'ACCEPT') {
      try {
        const res = await fetch('/api/v1/enach/mandates/${mandate.mandateId}/authenticate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ authMode, action })
        });
        const data = await res.json();
        if (data.success) {
          alert('Mandate Activated Successfully! NPCI UMRN: ' + data.data.umrn);
          window.location.reload();
        } else {
          alert('Authentication Status: ' + (data.message || data.error));
          window.location.reload();
        }
      } catch (err) {
        alert('Network Error: ' + err.message);
      }
    }
  </script>
</body>
</html>
  `;
  res.send(html);
});
