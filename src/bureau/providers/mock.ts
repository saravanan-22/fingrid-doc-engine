import {
  IUnifiedBureauReport,
  IBureauFetchRequest,
  ITradeline,
} from '../types.js';

export class MockBureauProvider {
  /**
   * Generates a realistic unified credit report for dev, staging, or testing
   */
  public static fetchReport(request: IBureauFetchRequest): IUnifiedBureauReport {
    const isCommercial = request.entityType === 'COMMERCIAL';
    const isPrime = !request.name.toLowerCase().includes('delinquent');

    const tradelines: ITradeline[] = isPrime
      ? [
          {
            accountId: 'TL-HDFC-HL-01',
            lenderName: 'HDFC Bank Ltd',
            accountType: 'HOME_LOAN',
            isSecured: true,
            sanctionedAmount: 6500000,
            currentBalance: 4850000,
            overdueAmount: 0,
            monthlyEmi: 58500,
            openDate: '2021-03-15',
            accountStatus: 'ACTIVE',
            // 36 months clean payments: "000000..."
            paymentHistoryString: '000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
            maxDpd: 0,
            assetClassification: 'STD',
          },
          {
            accountId: 'TL-ICICI-AL-02',
            lenderName: 'ICICI Bank Ltd',
            accountType: 'AUTO_LOAN',
            isSecured: true,
            sanctionedAmount: 1400000,
            currentBalance: 620000,
            overdueAmount: 0,
            monthlyEmi: 28400,
            openDate: '2023-08-10',
            accountStatus: 'ACTIVE',
            paymentHistoryString: '000000000000000000000000000000000000000000000000000000000000',
            maxDpd: 0,
            assetClassification: 'STD',
          },
          {
            accountId: 'TL-AXIS-CC-03',
            lenderName: 'Axis Bank Ltd',
            accountType: 'CREDIT_CARD',
            isSecured: false,
            sanctionedAmount: 350000,
            currentBalance: 42000,
            overdueAmount: 0,
            monthlyEmi: 5000,
            openDate: '2020-01-20',
            accountStatus: 'ACTIVE',
            paymentHistoryString: '000000000000000000000000000000000000000000000000000000000000',
            maxDpd: 0,
            assetClassification: 'STD',
          },
        ]
      : [
          {
            accountId: 'TL-SBI-PL-99',
            lenderName: 'State Bank of India',
            accountType: 'PERSONAL_LOAN',
            isSecured: false,
            sanctionedAmount: 500000,
            currentBalance: 240000,
            overdueAmount: 48000,
            monthlyEmi: 16000,
            openDate: '2022-05-10',
            accountStatus: 'ACTIVE',
            // Has 30 and 60 DPD in recent months:
            paymentHistoryString: '060030000000000000000000000000000000000000000000000000000000',
            maxDpd: 60,
            assetClassification: 'SMA_1',
          },
          {
            accountId: 'TL-RBL-CC-88',
            lenderName: 'RBL Bank Ltd',
            accountType: 'CREDIT_CARD',
            isSecured: false,
            sanctionedAmount: 150000,
            currentBalance: 120000,
            overdueAmount: 120000,
            monthlyEmi: 0,
            openDate: '2019-11-04',
            accountStatus: 'WRITTEN_OFF',
            paymentHistoryString: 'SUBDBTLSS0900600300000000000000000000000000000000000000000000',
            maxDpd: 180,
            assetClassification: 'DBT',
            derogatoryFlag: 'WRITTEN_OFF',
          },
        ];

    const todayStr = new Date().toISOString().split('T')[0];
    const inquiries = isPrime
      ? [
          {
            inquiryDate: todayStr,
            lenderName: 'FinGrid Capital',
            purpose: isCommercial ? 'Commercial Term Loan' : 'Personal Loan',
            amountRequested: 2500000,
          },
        ]
      : [
          { inquiryDate: todayStr, lenderName: 'Bajaj Finance', purpose: 'Personal Loan', amountRequested: 500000 },
          { inquiryDate: todayStr, lenderName: 'Tata Capital', purpose: 'Personal Loan', amountRequested: 500000 },
          { inquiryDate: todayStr, lenderName: 'HDFC Bank', purpose: 'Credit Card', amountRequested: 200000 },
          { inquiryDate: todayStr, lenderName: 'Kotak Bank', purpose: 'Personal Loan', amountRequested: 500000 },
        ];

    return {
      reportId: `BUREAU-REP-${Date.now()}`,
      provider: request.provider || 'MOCK',
      reportType: isCommercial ? 'COMMERCIAL' : 'CONSUMER',
      generatedAt: new Date().toISOString(),
      borrower: {
        name: request.name,
        pan: request.pan,
        dobOrIncorporation: request.dobOrIncorporation || '1985-06-12',
        mobile: request.mobile || '+91 98200 12345',
        address: request.address || 'BKC, Mumbai, Maharashtra 400051',
      },
      score: {
        scoreValue: isPrime ? 785 : 595,
        scoringModel: isCommercial ? 'CIBIL Commercial CCR 3.0' : 'TransUnion CIBIL Score 2.0',
        cmrRank: isCommercial ? (isPrime ? 'CMR-2' : 'CMR-8') : undefined,
      },
      tradelines,
      inquiries,
    };
  }
}
