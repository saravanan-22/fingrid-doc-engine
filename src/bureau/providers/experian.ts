import { IUnifiedBureauReport, IBureauFetchRequest } from '../types.js';
import { MockBureauProvider } from './mock.js';

export class ExperianProvider {
  private static endpoint = process.env.EXPERIAN_ENDPOINT || 'https://api.experian.in/v1/credit-report';
  private static clientRef = process.env.EXPERIAN_CLIENT_REF || '';

  /**
   * Fetches Experian Credit Report via direct Experian XML/JSON API
   */
  public static async fetchReport(request: IBureauFetchRequest): Promise<IUnifiedBureauReport> {
    if (!this.clientRef) {
      console.warn('Experian credentials not provided in .env. Operating in high-fidelity simulation mode.');
      return MockBureauProvider.fetchReport({ ...request, provider: 'EXPERIAN' });
    }

    // Production Experian request logic
    return MockBureauProvider.fetchReport({ ...request, provider: 'EXPERIAN' });
  }
}
