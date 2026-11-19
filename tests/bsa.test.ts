import assert from 'node:assert';
import { test, describe } from 'node:test';
import { TransactionCategorizer } from '../src/bsa/categorizer.js';
import { BankStatementAnalyzer } from '../src/bsa/analyzer.js';
import { BsaSampleGenerator } from '../src/bsa/sample-generator.js';
import { DocumentRenderer } from '../src/engine/renderer.js';
import { TemplateLoader } from '../src/engine/template-loader.js';

describe('FinGrid Professional Bank Statement Analysis (BSA) Engine', () => {
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

  describe('Full Institutional Metrics, EOD Balances & Forensics', () => {
    test('Computes 6-month AMB, EOD milestones (5th, 10th, 15th, 20th, 25th), and counterparty lists', () => {
      const sampleTxns = BsaSampleGenerator.generateHdfcStatement(false);
      assert.ok(sampleTxns.length >= 48, 'Should have 48 transactions across 6 months');

      const result = BankStatementAnalyzer.analyze('HDFC Bank Ltd', 'XXXXXX9012', sampleTxns);

      assert.strictEqual(result.monthsAnalyzed, 6);
      assert.strictEqual(result.bankName, 'HDFC Bank Ltd');
      assert.strictEqual(result.bankingHealthGrade, 'A+');
      assert.ok(result.totalBankingTurnover > 30000000);
      assert.ok(result.annualizedTurnover > 60000000);
      assert.ok(result.averageMonthlyBalance > 4000000);
      assert.strictEqual(result.outwardChequeBounces, 0);
      assert.strictEqual(result.cleanBankingFlag, true);
      assert.strictEqual(result.underwritingDecision, 'APPROVE');

      // Verify EOD Milestone balances
      const firstMonth = result.monthlyBreakdown[0];
      assert.ok(firstMonth.eodMilestones.day5 > 0);
      assert.ok(firstMonth.eodMilestones.day10 > 0);
      assert.ok(firstMonth.eodMilestones.day15 > 0);
      assert.ok(firstMonth.eodMilestones.monthEnd > 0);

      // Verify Counterparties
      assert.ok(result.topCreditors.length > 0);
      assert.ok(result.topDebtors.length > 0);

      // Check discovered recurring loans
      assert.strictEqual(result.discoveredActiveLoans.length, 2);
      const lenders = result.discoveredActiveLoans.map(l => l.lenderPattern);
      assert.ok(lenders.includes('Tata Capital'));
      assert.ok(lenders.includes('Bajaj Finance'));
    });

    test('Flags outward bounces, captures detailed bounce audit records, and triggers deviation', () => {
      const sampleWithBounce = BsaSampleGenerator.generateHdfcStatement(true);
      const result = BankStatementAnalyzer.analyze('HDFC Bank Ltd', 'XXXXXX9012', sampleWithBounce);

      assert.strictEqual(result.outwardChequeBounces, 1);
      assert.strictEqual(result.cleanBankingFlag, false);
      assert.strictEqual(result.underwritingDecision, 'DEVIATION_REQUIRED');
      assert.strictEqual(result.detailedBounceEvents.length, 1);
      assert.strictEqual(result.detailedBounceEvents[0].bounceType, 'OUTWARD');
      assert.ok(result.detailedBounceEvents[0].reason.includes('Insufficient Balance'));
    });
  });

  describe('Institutional Bank Statement Analysis Report Template', () => {
    test('Renders professional Bank Analysis Report document with sample data', () => {
      const loader = TemplateLoader.getInstance();
      const renderer = new DocumentRenderer();

      const sample = loader.getSampleData('bank-analysis-report');
      assert.ok(sample, 'Bank Analysis Report sample data must exist');

      const result = renderer.render('bank-analysis-report', sample);
      assert.ok(result.html.includes('INSTITUTIONAL BANK STATEMENT ANALYSIS'));
      assert.ok(result.html.includes('GRADE A+ (94%)'));
      assert.ok(result.html.includes('Apex Precision Engineering Pvt Ltd'));
      assert.ok(result.html.includes('End-of-Day (EOD) Milestone Balances'));
      assert.ok(result.html.includes('TOP 5 CREDITOR INFLOWS'));
      assert.ok(result.html.includes('Apex Forgings Aerospace'));
    });
  });
});
