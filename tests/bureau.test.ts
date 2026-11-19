import assert from 'node:assert';
import { test, describe } from 'node:test';
import { DpdParser } from '../src/bureau/dpd-parser.js';
import { BureauAnalyzer } from '../src/bureau/analyzer.js';
import { MockBureauProvider } from '../src/bureau/providers/mock.js';

describe('FinGrid Bureau Engine & Underwriting Scorecard', () => {
  describe('DPD (Days Past Due) Parser', () => {
    test('Parses legacy 3-character monthly DPD strings', () => {
      // 4 months: 0 DPD, 30 DPD, 60 DPD, STD
      const historyStr = '000030060STD';
      const parsed = DpdParser.parseHistoryString(historyStr);

      assert.strictEqual(parsed.length, 4);
      assert.strictEqual(parsed[0].dpd, 0);
      assert.strictEqual(parsed[0].isDelinquent, false);

      assert.strictEqual(parsed[1].dpd, 30);
      assert.strictEqual(parsed[1].isDelinquent, true);
      assert.strictEqual(parsed[1].assetClass, 'SMA_0');

      assert.strictEqual(parsed[2].dpd, 60);
      assert.strictEqual(parsed[2].assetClass, 'SMA_1');

      assert.strictEqual(parsed[3].dpd, 0);
      assert.strictEqual(parsed[3].assetClass, 'STD');
    });

    test('Computes max DPD within specified historical time window', () => {
      // Month 1: 0, Month 2: 90, Month 15: 180
      let str = '000090' + '000'.repeat(12) + '180';
      const parsed = DpdParser.parseHistoryString(str);

      const max12 = DpdParser.getMaxDpdInWindow(parsed, 12);
      const max36 = DpdParser.getMaxDpdInWindow(parsed, 36);

      assert.strictEqual(max12, 90);
      assert.strictEqual(max36, 180);
    });
  });

  describe('Underwriting Decisioning & Policy Rules', () => {
    test('Approves Prime Borrower with Score 785 and clean tradelines', () => {
      const report = MockBureauProvider.fetchReport({
        entityType: 'INDIVIDUAL',
        name: 'Arjun M. Rao',
        pan: 'ABCDE1234F',
      });

      const analysis = BureauAnalyzer.analyzeReport(report);

      assert.strictEqual(analysis.score, 785);
      assert.strictEqual(analysis.scoreBand, 'EXCELLENT');
      assert.strictEqual(analysis.maxDpdPast12Months, 0);
      assert.strictEqual(analysis.derogatoryFlags.hasSuitFiled, false);
      assert.strictEqual(analysis.derogatoryFlags.hasWrittenOff, false);
      assert.strictEqual(analysis.underwritingDecision, 'APPROVE');
      assert.ok(analysis.totalActiveDebt > 0);
    });

    test('Rejects Subprime Borrower with written-off accounts and high DPD', () => {
      const report = MockBureauProvider.fetchReport({
        entityType: 'INDIVIDUAL',
        name: 'Delinquent Borrower Profile',
        pan: 'XYZAB9876Q',
      });

      const analysis = BureauAnalyzer.analyzeReport(report);

      assert.ok(analysis.score < 650);
      assert.strictEqual(analysis.scoreBand, 'POOR');
      assert.strictEqual(analysis.derogatoryFlags.hasWrittenOff, true);
      assert.strictEqual(analysis.underwritingDecision, 'REJECT');
      assert.ok(analysis.decisionRationale.some(r => r.includes('Knockout')));
    });

    test('Commercial Entity generates CMR Rank and Active Debt exposure', () => {
      const report = MockBureauProvider.fetchReport({
        entityType: 'COMMERCIAL',
        name: 'Shree Balaji Logistics Pvt Ltd',
        pan: 'AABCS9012D',
      });

      const analysis = BureauAnalyzer.analyzeReport(report);
      assert.strictEqual(analysis.cmrRank, 'CMR-2');
      assert.ok(analysis.totalMonthlyEmi > 0);
      assert.strictEqual(analysis.underwritingDecision, 'APPROVE');
    });
  });
});
