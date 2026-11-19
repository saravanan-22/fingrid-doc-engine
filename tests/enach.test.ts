import assert from 'node:assert';
import { test, describe, beforeEach } from 'node:test';
import { MandateManager } from '../src/enach/mandate-manager.js';
import { PresentationEngine } from '../src/enach/presentation-engine.js';
import { IMandateRegistrationRequest } from '../src/enach/types.js';

describe('FinGrid eNACH & e-Mandate System', () => {
  let mandateManager: MandateManager;
  let presentationEngine: PresentationEngine;

  const validSampleRequest: IMandateRegistrationRequest = {
    loanAccountId: 'LN-IND-2026-9041',
    customerName: 'Kavitha Ramachandran',
    customerEmail: 'kavitha.ram@apextech.in',
    customerMobile: '+919840123456',
    customerPan: 'ABCDE1234F',
    bankDetails: {
      bankName: 'HDFC Bank Ltd',
      ifscCode: 'HDFC0000060',
      accountNumber: '50100234918231',
      accountType: 'SAVINGS',
      holderName: 'Kavitha Ramachandran',
    },
    monthlyEmiAmount: 48500,
    startDate: '2026-12-05',
    endDate: '2029-11-05',
    authMode: 'NET_BANKING',
  };

  beforeEach(() => {
    mandateManager = MandateManager.getInstance();
    mandateManager.clear();
    presentationEngine = PresentationEngine.getInstance(mandateManager);
    presentationEngine.clear();
  });

  describe('Mandate Initiation & Validation', () => {
    test('Initiates a mandate with valid details, calculates 1.5x max cap, and generates auth URL', async () => {
      const mandate = await mandateManager.initiateMandate(validSampleRequest);

      assert.ok(mandate.mandateId.startsWith('MND_'));
      assert.strictEqual(mandate.status, 'INVITATION_SENT');
      assert.strictEqual(mandate.loanAccountId, 'LN-IND-2026-9041');
      assert.strictEqual(mandate.monthlyEmiAmount, 48500);
      assert.strictEqual(mandate.maxAmount, Math.round(48500 * 1.5)); // 72,750
      assert.strictEqual(mandate.frequency, 'MNTH');
      assert.strictEqual(mandate.authMode, 'NET_BANKING');
      assert.ok(mandate.authUrl?.includes(mandate.mandateId));
      assert.strictEqual(mandate.auditTrail.length, 2);
    });

    test('Validates IFSC code format and throws error on invalid Indian IFSC', async () => {
      const invalidReq = {
        ...validSampleRequest,
        bankDetails: {
          ...validSampleRequest.bankDetails,
          ifscCode: 'INVALID_IFSC_123',
        },
      };

      await assert.rejects(
        async () => mandateManager.initiateMandate(invalidReq),
        /Invalid Indian IFSC code format/
      );
    });
  });

  describe('Multi-Mode Mandate Authentication & UMRN Issuance', () => {
    test('Successfully authenticates via Net Banking and generates 20-digit NPCI UMRN', async () => {
      const mandate = await mandateManager.initiateMandate(validSampleRequest);
      const authResult = await mandateManager.authenticateMandate(mandate.mandateId, 'NET_BANKING');

      assert.strictEqual(authResult.success, true);
      assert.strictEqual(authResult.mandate.status, 'ACTIVE');
      assert.ok(authResult.mandate.umrn);
      assert.strictEqual(authResult.mandate.umrn.length, 20);
      assert.ok(authResult.mandate.umrn.startsWith('NPCI'));
      assert.ok(authResult.mandate.activatedAt);
    });

    test('Supports UPI AutoPay, Debit Card, and Aadhaar OTP authentication modes', async () => {
      const modes = ['UPI_AUTOPAY', 'DEBIT_CARD', 'AADHAAR'] as const;

      for (const mode of modes) {
        const req = { ...validSampleRequest, loanAccountId: `LN-${mode}` };
        const mandate = await mandateManager.initiateMandate(req);
        const result = await mandateManager.authenticateMandate(mandate.mandateId, mode);

        assert.strictEqual(result.success, true);
        assert.strictEqual(result.mandate.status, 'ACTIVE');
        assert.strictEqual(result.mandate.authMode, mode);
        assert.ok(result.mandate.umrn?.startsWith('NPCI'));
      }
    });

    test('Handles customer authentication rejection cleanly', async () => {
      const mandate = await mandateManager.initiateMandate(validSampleRequest);
      const authResult = await mandateManager.authenticateMandate(mandate.mandateId, 'NET_BANKING', 'REJECT');

      assert.strictEqual(authResult.success, false);
      assert.strictEqual(authResult.mandate.status, 'REJECTED');
      assert.ok(authResult.mandate.rejectedReason?.includes('declined'));
      assert.strictEqual(authResult.mandate.umrn, undefined);
    });
  });

  describe('RBI 24-Hour Pre-Debit Notification Compliance', () => {
    test('Dispatches compliant pre-debit alert with loan account, UMRN, and amount', async () => {
      const mandate = await mandateManager.initiateMandate(validSampleRequest);
      await mandateManager.authenticateMandate(mandate.mandateId);

      const notif = presentationEngine.sendPreDebitNotification(
        mandate.mandateId,
        48500,
        '2026-12-05'
      );

      assert.strictEqual(notif.complianceStatus, 'SENT_COMPLIANT');
      assert.strictEqual(notif.amount, 48500);
      assert.strictEqual(notif.debitDate, '2026-12-05');
      assert.ok(notif.messageText.includes('LN-IND-2026-9041'));
      assert.ok(notif.messageText.includes(mandate.umrn!));
      assert.strictEqual(presentationEngine.hasPreDebitNotification(mandate.mandateId, '2026-12-05'), true);
    });

    test('Enforces RBI compliance: Throws error if debit is presented without prior 24h notification', async () => {
      const mandate = await mandateManager.initiateMandate(validSampleRequest);
      await mandateManager.authenticateMandate(mandate.mandateId);

      await assert.rejects(
        async () =>
          presentationEngine.presentSingleDebit({
            mandateId: mandate.mandateId,
            umrn: mandate.umrn!,
            loanAccountId: mandate.loanAccountId,
            amount: 48500,
            dueDate: '2026-12-05',
            installmentNumber: 1,
          }),
        /RBI Compliance Violation: Pre-debit notification not dispatched/
      );
    });
  });

  describe('Presentation Engine, Clearing Cycles & Return Codes', () => {
    test('Presents single debit successfully when pre-notified and amount is within cap', async () => {
      const mandate = await mandateManager.initiateMandate(validSampleRequest);
      await mandateManager.authenticateMandate(mandate.mandateId);
      presentationEngine.sendPreDebitNotification(mandate.mandateId, 48500, '2026-12-05');

      const result = await presentationEngine.presentSingleDebit({
        mandateId: mandate.mandateId,
        umrn: mandate.umrn!,
        loanAccountId: mandate.loanAccountId,
        amount: 48500,
        dueDate: '2026-12-05',
        installmentNumber: 1,
      });

      assert.strictEqual(result.settlementStatus, 'SUCCESS');
      assert.ok(result.clearingReference?.startsWith('NPCI_CLR_'));
      assert.strictEqual(result.retryCount, 0);
    });

    test('Rejects debit when presentation amount exceeds maxMandateAmount cap', async () => {
      const mandate = await mandateManager.initiateMandate(validSampleRequest);
      await mandateManager.authenticateMandate(mandate.mandateId);
      presentationEngine.sendPreDebitNotification(mandate.mandateId, 85000, '2026-12-05');

      await assert.rejects(
        async () =>
          presentationEngine.presentSingleDebit({
            mandateId: mandate.mandateId,
            umrn: mandate.umrn!,
            loanAccountId: mandate.loanAccountId,
            amount: 85000, // Exceeds 72,750 cap
            dueDate: '2026-12-05',
            installmentNumber: 1,
          }),
        /exceeds authorized mandate maximum limit/
      );
    });

    test('Handles AM04 (Insufficient Funds) return code and schedules 3-day retry', async () => {
      const mandate = await mandateManager.initiateMandate(validSampleRequest);
      await mandateManager.authenticateMandate(mandate.mandateId);

      const result = await presentationEngine.presentSingleDebit(
        {
          mandateId: mandate.mandateId,
          umrn: mandate.umrn!,
          loanAccountId: mandate.loanAccountId,
          amount: 48500,
          dueDate: '2026-12-05',
          installmentNumber: 1,
        },
        { simulateReturnCode: 'AM04', bypassNotificationCheck: true }
      );

      assert.strictEqual(result.settlementStatus, 'RETURNED');
      assert.strictEqual(result.returnCode, 'AM04');
      assert.ok(result.returnReason?.includes('Insufficient Balance'));
      assert.ok(result.recoveryAction?.includes('Auto-schedule representation after 3 days'));
      assert.ok(result.retryScheduledDate);

      // Schedule second retry representation
      const retryResult = presentationEngine.scheduleRetry(result.presentationId, 3);
      assert.strictEqual(retryResult.retryCount, 1);
    });

    test('Executes batch presentation across multiple loans and summarizes clearing settlement', async () => {
      // Setup 3 active mandates
      const accounts = [
        { id: 'LN-BATCH-1', emi: 25000 },
        { id: 'LN-BATCH-2', emi: 35000 },
        { id: 'LN-BATCH-3', emi: 45000 },
      ];

      for (const acc of accounts) {
        const m = await mandateManager.initiateMandate({
          ...validSampleRequest,
          loanAccountId: acc.id,
          monthlyEmiAmount: acc.emi,
        });
        await mandateManager.authenticateMandate(m.mandateId);
      }

      const batch = presentationEngine.createBatch('2026-12-05', [
        { loanAccountId: 'LN-BATCH-1', amount: 25000, installmentNumber: 1 },
        { loanAccountId: 'LN-BATCH-2', amount: 35000, installmentNumber: 1 },
        { loanAccountId: 'LN-BATCH-3', amount: 45000, installmentNumber: 1 },
      ]);

      assert.strictEqual(batch.totalDebits, 3);
      assert.strictEqual(batch.totalAmount, 105000);

      // Simulate LN-BATCH-2 bouncing with AM04
      const batchResult = await presentationEngine.processBatch(batch.batchId, {
        'LN-BATCH-2': 'AM04',
      });

      assert.strictEqual(batchResult.totalPresented, 3);
      assert.strictEqual(batchResult.successfulDebitsCount, 2);
      assert.strictEqual(batchResult.bouncedDebitsCount, 1);
      assert.strictEqual(batchResult.successfulAmount, 70000); // 25k + 45k
      assert.strictEqual(batchResult.bouncedAmount, 35000); // 35k bounced
    });

    test('Cancels mandate and revokes UMRN on NPCI', async () => {
      const mandate = await mandateManager.initiateMandate(validSampleRequest);
      await mandateManager.authenticateMandate(mandate.mandateId);

      const cancelled = await mandateManager.cancelMandate(mandate.mandateId, 'Loan fully prepaid and closed');
      assert.strictEqual(cancelled.status, 'CANCELLED');
      assert.ok(cancelled.auditTrail.some(a => a.action === 'MANDATE_CANCELLED'));
    });
  });
});
