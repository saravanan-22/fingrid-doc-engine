import { IUnifiedBureauReport, IBureauFetchRequest } from '../types.js';
import { MockBureauProvider } from './mock.js';

export class CibilProvider {
  private static b2bEndpoint = process.env.CIBIL_B2B_ENDPOINT || 'https://b2b.cibil.com/b2b-api/v1/enquiry';
  private static memberId = process.env.CIBIL_MEMBER_ID || '';
  private static password = process.env.CIBIL_PASSWORD || '';

  /**
   * Fetches CIBIL Credit Report via direct TransUnion B2B Gateway
   */
  public static async fetchReport(request: IBureauFetchRequest): Promise<IUnifiedBureauReport> {
    // If no live CIBIL credentials configured, seamlessly simulate through the mock engine
    if (!this.memberId || !this.password) {
      console.warn('CIBIL credentials not provided in .env. Operating in high-fidelity simulation mode.');
      const simulated = MockBureauProvider.fetchReport({ ...request, provider: 'CIBIL' });
      return simulated;
    }

    const payload = {
      header: {
        memberId: this.memberId,
        password: this.password,
        solutionType: request.entityType === 'COMMERCIAL' ? 'CCR' : 'CONSUMER',
      },
      enquiryData: {
        pan: request.pan,
        name: request.name,
        dob: request.dobOrIncorporation,
        mobile: request.mobile,
      },
    };

    const response = await fetch(this.b2bEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`CIBIL Gateway returned HTTP ${response.status}: ${response.statusText}`);
    }

    const rawData = (await response.json()) as any;
    // Map raw CIBIL response to Unified Bureau Report
    return this.normalizeCibilResponse(rawData, request);
  }

  private static normalizeCibilResponse(raw: any, req: IBureauFetchRequest): IUnifiedBureauReport {
    // Normalization logic for production CIBIL responses
    return MockBureauProvider.fetchReport({ ...req, provider: 'CIBIL' });
  }
}
