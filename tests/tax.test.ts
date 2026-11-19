import assert from 'node:assert';
import { test, describe } from 'node:test';
import { ItrAnalyzer } from '../src/tax/itr-analyzer.js';
import { Gstr3bAnalyzer } from '../src/tax/gstr-analyzer.js';
import { ThreeWayTriangulator } from '../src/tax/triangulator.js';
import { TaxSampleGenerator } from '../src/tax/sample-generator.js';

describe('FinGrid ITR, GSTR-3B & Three-Way Triangulation Engine', () => {
  describe('ITR (Income Tax Returns) Analyzer', () => {
    test('Analyzes 3-year ITR filings, CAGR growth, cash accruals, and filing discipline', () => {
      const filings = TaxSampleGenerator.generateThreeYearItr();
      assert.strictEqual(filings.length, 3);

      const result = ItrAnalyzer.analyze('AABCA8741E', 'Apex Precision Engineering Pvt Ltd', filings);

      assert.strictEqual(result.filingsCount, 3);
      assert.strictEqual(result.latestTurnover, 285000000);
      assert.strictEqual(result.latestProfitAfterTax, 26800000);
      assert.strictEqual(result.latestCashAccruals, 35600000); // PAT (26.8M) + Depr (8.8M)
      assert.ok(result.threeYearTurnoverCagr > 20, 'Should have > 20% CAGR');
      assert.strictEqual(result.belatedFilingsCount, 0);
      assert.strictEqual(result.filingDiscipline, 'EXCELLENT');
      assert.strictEqual(result.underwritingDecision, 'APPROVE');
    });

    test('Flags belated ITR filings and triggers risk deviation', () => {
      const filings = TaxSampleGenerator.generateThreeYearItr();
      filings[1].isBelated = true;
      filings[1].filingSection = '139(4)';
      filings[2].isBelated = true;
      filings[2].filingSection = '139(4)';

      const result = ItrAnalyzer.analyze('AABCA8741E', 'Late Filing Entity', filings);
      assert.strictEqual(result.belatedFilingsCount, 2);
      assert.strictEqual(result.filingDiscipline, 'POOR');
      assert.strictEqual(result.underwritingDecision, 'DEVIATION_REQUIRED');
      assert.ok(result.decisionRationale.some(r => r.includes('delayed ITR filings')));
    });
  });

  describe('GSTR-3B Monthly Returns Analyzer', () => {
    test('Analyzes 12-month GSTR-3B filings, outward taxable supplies, and cash tax payment ratio', () => {
      const gstrData = TaxSampleGenerator.generateTwelveMonthGstr3b();
      assert.strictEqual(gstrData.length, 12);

      const result = Gstr3bAnalyzer.analyze('27AABCA8741E1Z3', 'Apex Precision Engineering Pvt Ltd', gstrData);

      assert.strictEqual(result.monthsAnalyzed, 12);
      assert.ok(result.totalAnnualGstTurnover > 250000000);
      assert.strictEqual(result.overallCashTaxRatioPercent, 22.0);
      assert.strictEqual(result.lateFilingsCount, 0);
      assert.strictEqual(result.filingRegularityScorePercent, 100);
      assert.strictEqual(result.underwritingDecision, 'APPROVE');
    });

    test('Flags low cash tax ratio (excessive ITC pass-through dependency)', () => {
      const gstrData = TaxSampleGenerator.generateTwelveMonthGstr3b().map(m => ({
        ...m,
        taxPaidInCash: Math.round(m.totalTaxLiability * 0.01), // Only 1% cash tax
        itcUtilized: Math.round(m.totalTaxLiability * 0.99),
        cashTaxRatioPercent: 1.0,
      }));

      const result = Gstr3bAnalyzer.analyze('27AABCA8741E1Z3', 'Low Cash Entity', gstrData);
      assert.ok(result.overallCashTaxRatioPercent < 3);
      assert.strictEqual(result.underwritingDecision, 'DEVIATION_REQUIRED');
      assert.ok(result.decisionRationale.some(r => r.includes('low cash GST payment')));
    });
  });

  describe('Three-Way Triangulation Engine (Banking vs GST vs ITR)', () => {
    test('Reconciles when Banking, GST, and ITR turnovers align within 15% tolerance', () => {
      const result = ThreeWayTriangulator.triangulate(
        'AABCA8741E',
        'Apex Precision Engineering Pvt Ltd',
        'FY 2024-25',
        282000000, // Bank Turnover
        285000000, // GST 3B Turnover
        285000000  // ITR Turnover
      );

      assert.strictEqual(result.reconciliationStatus, 'RECONCILED');
      assert.ok(result.gstVsBankVariancePercent < 2.0);
      assert.strictEqual(result.circularRevenueRiskFlag, false);
      assert.strictEqual(result.underreportingRiskFlag, false);
      assert.strictEqual(result.underwritingDecision, 'APPROVE');
    });

    test('Detects circular revenue anomaly when Banking credits heavily exceed GST sales', () => {
      const result = ThreeWayTriangulator.triangulate(
        'AABCA8741E',
        'Circular Trading Co',
        'FY 2024-25',
        420000000, // Bank credits ₹42 Cr
        250000000, // GST Turnover only ₹25 Cr (68% variance!)
        250000000  // ITR Turnover ₹25 Cr
      );

      assert.strictEqual(result.circularRevenueRiskFlag, true);
      assert.strictEqual(result.reconciliationStatus, 'UNRECONCILED_HIGH_RISK');
      assert.strictEqual(result.underwritingDecision, 'REJECT');
      assert.ok(result.decisionRationale.some(r => r.includes('circular fund rotation')));
    });
  });
});
