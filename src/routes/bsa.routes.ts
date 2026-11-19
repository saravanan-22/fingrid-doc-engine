import { Router, Request, Response } from 'express';
import { BankStatementAnalyzer } from '../bsa/analyzer.js';
import { BsaSampleGenerator } from '../bsa/sample-generator.js';

export const bsaRouter = Router();

/**
 * Analyze Bank Statement transactions
 */
bsaRouter.post('/analyze', (req: Request, res: Response) => {
  try {
    const {
      bankName = 'HDFC Bank Ltd',
      accountNumberMasked = 'XXXXXX9012',
      transactions,
      hasBounces = false,
    } = req.body;

    const txnsToAnalyze = Array.isArray(transactions) && transactions.length > 0
      ? transactions
      : BsaSampleGenerator.generateHdfcStatement(hasBounces);

    const result = BankStatementAnalyzer.analyze(bankName, accountNumberMasked, txnsToAnalyze);

    res.json({
      success: true,
      result,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

/**
 * Bridge endpoint: Analyzes bank statement and formats Section 6 of the CAM Report
 */
bsaRouter.post('/cam-bridge', (req: Request, res: Response) => {
  try {
    const {
      bankName = 'HDFC Bank Ltd',
      accountNumberMasked = 'XXXXXX9012',
      transactions,
      hasBounces = false,
    } = req.body;

    const txnsToAnalyze = Array.isArray(transactions) && transactions.length > 0
      ? transactions
      : BsaSampleGenerator.generateHdfcStatement(hasBounces);

    const result = BankStatementAnalyzer.analyze(bankName, accountNumberMasked, txnsToAnalyze);
    const camBankingSection = BankStatementAnalyzer.toCamReportSection(result);

    res.json({
      success: true,
      camBankingSection,
      underwritingRecommendation: result.underwritingDecision,
      decisionRationale: result.decisionRationale,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});
