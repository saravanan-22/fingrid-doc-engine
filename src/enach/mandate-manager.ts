import {
  IMandateRegistrationRequest,
  IMandateRecord,
  MandateAuthMode,
} from './types.js';
import { MockEnachProvider } from './providers/mock.js';
import { IEnachProvider } from './providers/gateway.js';

export class MandateManager {
  private static instance: MandateManager;
  private mandates: Map<string, IMandateRecord> = new Map();
  private provider: IEnachProvider;

  private constructor(provider?: IEnachProvider) {
    this.provider = provider || MockEnachProvider.getInstance();
  }

  public static getInstance(provider?: IEnachProvider): MandateManager {
    if (!MandateManager.instance) {
      MandateManager.instance = new MandateManager(provider);
    }
    return MandateManager.instance;
  }

  /**
   * Initiates a new eNACH Mandate Registration workflow
   */
  public async initiateMandate(request: IMandateRegistrationRequest): Promise<IMandateRecord> {
    // Basic IFSC validation
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    if (!ifscRegex.test(request.bankDetails.ifscCode)) {
      throw new Error(`Invalid Indian IFSC code format: ${request.bankDetails.ifscCode}. Must match ^[A-Z]{4}0[A-Z0-9]{6}$`);
    }

    if (!request.bankDetails.accountNumber || request.bankDetails.accountNumber.length < 8) {
      throw new Error('Bank account number must be at least 8 digits long');
    }

    // Default max mandate amount to 1.5x monthly EMI if not provided
    const maxAmount = request.maxMandateAmount || Math.round(request.monthlyEmiAmount * 1.5);
    const authMode = request.authMode || 'NET_BANKING';
    const frequency = request.frequency || 'MNTH';

    const providerResult = await this.provider.createMandate(request);

    const mandate: IMandateRecord = {
      mandateId: providerResult.mandateId,
      loanAccountId: request.loanAccountId,
      customerName: request.customerName,
      customerEmail: request.customerEmail,
      customerMobile: request.customerMobile,
      customerPan: request.customerPan,
      status: 'INVITATION_SENT',
      authMode,
      authUrl: providerResult.authUrl,
      maxAmount,
      monthlyEmiAmount: request.monthlyEmiAmount,
      frequency,
      bankDetails: request.bankDetails,
      startDate: request.startDate,
      endDate: request.endDate,
      createdAt: new Date().toISOString(),
      auditTrail: [
        {
          timestamp: new Date().toISOString(),
          action: 'MANDATE_INITIATED',
          details: {
            authMode,
            maxAmount,
            monthlyEmiAmount: request.monthlyEmiAmount,
            bankName: request.bankDetails.bankName,
          },
        },
        {
          timestamp: new Date().toISOString(),
          action: 'INVITATION_SENT',
          details: {
            authUrl: providerResult.authUrl,
            sentTo: request.customerMobile,
          },
        },
      ],
    };

    this.mandates.set(mandate.mandateId, mandate);
    return mandate;
  }

  /**
   * Retrieves a mandate record by its unique mandate ID
   */
  public getMandate(mandateId: string): IMandateRecord | undefined {
    return this.mandates.get(mandateId);
  }

  /**
   * Retrieves all mandates registered under a loan account ID
   */
  public getMandatesByLoanAccount(loanAccountId: string): IMandateRecord[] {
    return Array.from(this.mandates.values()).filter(m => m.loanAccountId === loanAccountId);
  }

  /**
   * Retrieves the active mandate for a given loan account
   */
  public getActiveMandate(loanAccountId: string): IMandateRecord | undefined {
    return Array.from(this.mandates.values()).find(
      m => m.loanAccountId === loanAccountId && m.status === 'ACTIVE'
    );
  }

  /**
   * Authenticates / Approves a mandate (simulated or gateway webhook)
   */
  public async authenticateMandate(
    mandateId: string,
    authMode?: MandateAuthMode,
    simulateStatus: 'ACCEPT' | 'REJECT' = 'ACCEPT'
  ): Promise<{ success: boolean; mandate: IMandateRecord; error?: string }> {
    const mandate = this.mandates.get(mandateId);
    if (!mandate) {
      throw new Error(`Mandate ${mandateId} not found`);
    }

    if (mandate.status === 'ACTIVE') {
      return { success: true, mandate };
    }

    const selectedAuthMode = authMode || mandate.authMode;
    mandate.authMode = selectedAuthMode;

    const authResult = await this.provider.authorizeMandate(mandateId, selectedAuthMode, simulateStatus);

    if (authResult.success && authResult.umrn) {
      mandate.status = 'ACTIVE';
      mandate.umrn = authResult.umrn;
      mandate.activatedAt = new Date().toISOString();
      mandate.auditTrail.push({
        timestamp: mandate.activatedAt,
        action: 'MANDATE_ACTIVATED',
        details: {
          umrn: authResult.umrn,
          authMode: selectedAuthMode,
        },
      });

      return { success: true, mandate };
    } else {
      mandate.status = 'REJECTED';
      mandate.rejectedReason = authResult.error || 'Authentication declined by customer or Destination Bank';
      mandate.auditTrail.push({
        timestamp: new Date().toISOString(),
        action: 'MANDATE_REJECTED',
        details: {
          reason: mandate.rejectedReason,
          authMode: selectedAuthMode,
        },
      });

      return { success: false, mandate, error: mandate.rejectedReason };
    }
  }

  /**
   * Cancels / Revokes an existing mandate
   */
  public async cancelMandate(mandateId: string, reason: string): Promise<IMandateRecord> {
    const mandate = this.mandates.get(mandateId);
    if (!mandate) {
      throw new Error(`Mandate ${mandateId} not found`);
    }

    if (mandate.status === 'CANCELLED') {
      return mandate;
    }

    if (mandate.umrn) {
      await this.provider.cancelMandate(mandateId, mandate.umrn, reason);
    }

    mandate.status = 'CANCELLED';
    mandate.auditTrail.push({
      timestamp: new Date().toISOString(),
      action: 'MANDATE_CANCELLED',
      details: { reason },
    });

    return mandate;
  }

  /**
   * Lists all mandates in the system
   */
  public listAllMandates(): IMandateRecord[] {
    return Array.from(this.mandates.values());
  }

  /**
   * Clear in-memory storage (useful for isolated unit testing)
   */
  public clear(): void {
    this.mandates.clear();
  }
}
