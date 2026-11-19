import crypto from 'node:crypto';
import { IEnachProvider } from './gateway.js';
import {
  IMandateRegistrationRequest,
  IPresentationDebitRequest,
  IPresentationDebitResult,
  MandateAuthMode,
  INpciReturnCodeDetails,
} from '../types.js';

export const NPCI_RETURN_CODES: Record<string, INpciReturnCodeDetails> = {
  AM04: {
    code: 'AM04',
    description: 'Insufficient Balance / Funds in Account',
    category: 'FUNDS',
    retryable: true,
    recommendedAction: 'Notify borrower via SMS/WhatsApp. Auto-schedule representation after 3 days on salary cycle.',
  },
  AC01: {
    code: 'AC01',
    description: 'Account Closed / Transferred',
    category: 'ACCOUNT_STATUS',
    retryable: false,
    recommendedAction: 'Stop presentation. Request updated bank account details and re-register new eNACH mandate.',
  },
  AC04: {
    code: 'AC04',
    description: 'Account Blocked / Frozen by Regulatory Order',
    category: 'ACCOUNT_STATUS',
    retryable: false,
    recommendedAction: 'Escalate to credit risk team. Legal recovery notice under Section 25 of PASA Act.',
  },
  MD01: {
    code: 'MD01',
    description: 'Mandate Cancelled / Revoked by Customer',
    category: 'MANDATE_STATUS',
    retryable: false,
    recommendedAction: 'Customer revoked auto-debit consent. Initiate default collection process.',
  },
  MD02: {
    code: 'MD02',
    description: 'Stop Payment Instructions by Customer for this Installment',
    category: 'MANDATE_STATUS',
    retryable: false,
    recommendedAction: 'Customer raised stop payment with Destination Bank. Engage customer relationship officer.',
  },
  MD07: {
    code: 'MD07',
    description: 'Mandate End Date Expired',
    category: 'MANDATE_STATUS',
    retryable: false,
    recommendedAction: 'End date reached. Re-execute loan extension or fresh mandate registration.',
  },
};

export class MockEnachProvider implements IEnachProvider {
  name = 'MOCK_NPCI_GATEWAY';

  private static instance: MockEnachProvider;

  public static getInstance(): MockEnachProvider {
    if (!MockEnachProvider.instance) {
      MockEnachProvider.instance = new MockEnachProvider();
    }
    return MockEnachProvider.instance;
  }

  /**
   * Generates a 20-character NPCI-compliant UMRN (Unique Mandate Reference Number)
   * Format: "NPCI" + 16 alphanumeric characters
   */
  public generateUmrn(): string {
    const randomHex = crypto.randomBytes(8).toString('hex').toUpperCase();
    return `NPCI${randomHex}`;
  }

  public async createMandate(request: IMandateRegistrationRequest): Promise<{
    mandateId: string;
    authUrl: string;
    status: string;
  }> {
    const mandateId = `MND_${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
    const authUrl = `/api/v1/enach/mock-auth/${mandateId}`;

    return {
      mandateId,
      authUrl,
      status: 'INVITATION_SENT',
    };
  }

  public async authorizeMandate(
    mandateId: string,
    authMode: MandateAuthMode,
    simulateStatus: 'ACCEPT' | 'REJECT' = 'ACCEPT'
  ): Promise<{
    success: boolean;
    umrn?: string;
    error?: string;
  }> {
    if (simulateStatus === 'REJECT') {
      return {
        success: false,
        error: `Customer declined e-mandate authentication via ${authMode} at Destination Bank portal.`,
      };
    }

    const umrn = this.generateUmrn();
    return {
      success: true,
      umrn,
    };
  }

  public async presentDebit(
    request: IPresentationDebitRequest,
    simulateReturnCode?: string
  ): Promise<IPresentationDebitResult> {
    const presentationId = `PRS_${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
    const now = new Date().toISOString();

    if (simulateReturnCode && NPCI_RETURN_CODES[simulateReturnCode]) {
      const returnMeta = NPCI_RETURN_CODES[simulateReturnCode];
      let retryDate: string | undefined;

      if (returnMeta.retryable) {
        const retry = new Date();
        retry.setDate(retry.getDate() + 3);
        retryDate = retry.toISOString().split('T')[0];
      }

      return {
        presentationId,
        mandateId: request.mandateId,
        umrn: request.umrn,
        loanAccountId: request.loanAccountId,
        amount: request.amount,
        dueDate: request.dueDate,
        settlementStatus: 'RETURNED',
        clearingReference: `NPCI_RET_${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
        returnCode: simulateReturnCode,
        returnReason: returnMeta.description,
        recoveryAction: returnMeta.recommendedAction,
        settledAt: undefined,
        retryScheduledDate: retryDate,
        retryCount: 0,
      };
    }

    return {
      presentationId,
      mandateId: request.mandateId,
      umrn: request.umrn,
      loanAccountId: request.loanAccountId,
      amount: request.amount,
      dueDate: request.dueDate,
      settlementStatus: 'SUCCESS',
      clearingReference: `NPCI_CLR_${Date.now()}_${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
      settledAt: now,
      retryCount: 0,
    };
  }

  public async cancelMandate(
    mandateId: string,
    umrn: string,
    reason: string
  ): Promise<{ success: boolean; message: string }> {
    return {
      success: true,
      message: `Mandate ${mandateId} with UMRN ${umrn} successfully revoked on NPCI ONMAGS. Reason: ${reason}`,
    };
  }
}
