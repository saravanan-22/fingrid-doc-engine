import {
  IMandateRegistrationRequest,
  IMandateRecord,
  IPresentationDebitRequest,
  IPresentationDebitResult,
  MandateAuthMode,
} from '../types.js';

export interface IEnachProvider {
  name: string;

  /**
   * Registers a new mandate with the gateway / sponsor bank
   */
  createMandate(request: IMandateRegistrationRequest): Promise<{
    mandateId: string;
    authUrl: string;
    status: string;
  }>;

  /**
   * Authorizes or simulates customer approval of the mandate
   */
  authorizeMandate(
    mandateId: string,
    authMode: MandateAuthMode,
    simulateStatus?: 'ACCEPT' | 'REJECT'
  ): Promise<{
    success: boolean;
    umrn?: string;
    error?: string;
  }>;

  /**
   * Presents a single debit request to the clearing house
   */
  presentDebit(
    request: IPresentationDebitRequest,
    simulateReturnCode?: string
  ): Promise<IPresentationDebitResult>;

  /**
   * Cancels an active mandate with NPCI / Destination Bank
   */
  cancelMandate(
    mandateId: string,
    umrn: string,
    reason: string
  ): Promise<{ success: boolean; message: string }>;
}
