import assert from 'node:assert';
import { test, describe } from 'node:test';
import { TransactionCategorizer } from '../src/bsa/categorizer.js';
import { BankStatementAnalyzer } from '../src/bsa/analyzer.js';
import { BsaSampleGenerator } from '../src/bsa/sample-generator.js';

describe('FinGrid Bank Statement Analysis (BSA) Engine', () => {
  describe('Narration Categorization & Bounce Classifier', () => {
    test('Correctly identifies outward cheque/NACH bounces', () => {
      const cat1 = TransactionCategorizer.categorize('RETURN CHG/ACH RET/INSUFFICIENT FUNDS', 'DEBIT');
      assert.strictEqual(cat1.category, 'OUTWARD_BOUNCE');
      assert.strictEqual(cat1.isBounce, true);
      assert.strictEqual(cat1.bounceType, 'OUTWARD');

      const cat2 = TransactionCategorizer.categorize('ECS RETURN MANDATE 10928 UNPAID', 'DEBIT');
      assert.strictEqual(cat2.category, 'OUTWARD_BOUNCE');
      assert.strictEqual(cat2.bounceType, 'OUTWARD');
    });

    test('Correctly identifies inward customer cheque bounces', () => {
      const cat = TransactionCategorizer.categorize('INWARD RET CHQ NO 89012 DEPOSITED', 'DEBIT');
      assert.strictEqual(cat.category, 'INWARD_BOUNCE');
      assert.strictEqual(cat.isBounce, true);
      assert.strictEqual(cat.bounceType, 'INWARD');
    });

    test('Identifies loan EMI deductions and detects lender names', () => {
      const catTata = TransactionCategorizer.categorize('ACH/TATA CAP FINANCIAL/LOAN449102/AUTO-DEBIT', 'DEBIT');
      assert.strictEqual(catTata.category, 'LOAN_EMI');
      assert.strictEqual(catTata.entityIdentified, 'Tata Capital');

      const catBajaj = TransactionCategorizer.categorize('NACH/BAJAJ FIN LTD/SME-TL-8891/MONTHLY EMI', 'DEBIT');
      assert.strictEqual(catBajaj.category, 'LOAN_EMI');
      assert.strictEqual(catBajaj.entityIdentified, 'Bajaj Finance');
    });

    test('Identifies GST and Advance Tax payments', () => {
      const cat = TransactionCategorizer.categorize('CBDT/GST PMT/CHALLAN 27AAAC91002/MAHARASHTRA GST', 'DEBIT');
      assert.strictEqual(cat.category, 'TAX_PAYMENT');
    });
  });

  describe('Financial Metrics, AMB & CAM Auto-Hydration', () => {
    test('Computes 6-month AMB, annualized turnover, and discovers un-reported active loans', () => {
      const sampleTxns = BsaSampleGenerator.generateHdfcStatement(false);
      assert.ok(sampleTxns.length >= 48, 'Should have 48 transactions across 6 months');

      const result = BankStatementAnalyzer.analyze('HDFC Bank Ltd', 'XXXXXX9012', sampleTxns);

      assert.strictEqual(result.monthsAnalyzed, 6);
      assert.strictEqual(result.bankName, 'HDFC Bank Ltd');
      assert.ok(result.totalBankingTurnover > 30000000);
      assert.ok(result.annualizedTurnover > 60000000);
      assert.ok(result.averageMonthlyBalance > 4000000);
      assert.strictEqual(result.outwardChequeBounces, 0);
      assert.strictEqual(result.cleanBankingFlag, true);
      assert.strictEqual(result.underwritingDecision, 'APPROVE');

      // Check discovered recurring loans
      assert.strictEqual(result.discoveredActiveLoans.length, 2);
      const lenders = result.discoveredActiveLoans.map(l => l.lenderPattern);
      assert.ok(lenders.includes('Tata Capital'));
      assert.ok(lenders.includes('Bajaj Finance'));

      // Check CAM report section conversion
      const camSection = BankStatementAnalyzer.toCamReportSection(result);
      assert.strictEqual(camSection.bankName, 'HDFC Bank Ltd');
      assert.strictEqual(camSection.cleanBankingFlag, true);
      assert.strictEqual(camSection.outwardChequeBounces, 0);
      assert.strictEqual(camSection.annualTurnoverCredited, result.annualizedTurnover);
    });

    test('Flags outward bounces and triggers credit deviation', () => {
      const sampleWithBounce = BsaSampleGenerator.generateHdfcStatement(true);
      const result = BankStatementAnalyzer.analyze('HDFC Bank Ltd', 'XXXXXX9012', sampleWithBounce);

      assert.strictEqual(result.outwardChequeBounces, 1);
      assert.strictEqual(result.cleanBankingFlag, false);
      assert.strictEqual(result.underwritingDecision, 'DEVIATION_REQUIRED');
      assert.ok(result.decisionRationale.some(r => r.includes('outward bounce')));
    });
  });
});
