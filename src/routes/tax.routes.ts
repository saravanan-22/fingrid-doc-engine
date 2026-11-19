import { Router, Request, Response } from 'express';
import { ItrAnalyzer } from '../tax/itr-analyzer.js';
import { Gstr3bAnalyzer } from '../tax/gstr-analyzer.js';
import { ThreeWayTriangulator } from '../tax/triangulator.js';
import { TaxSampleGenerator } from '../tax/sample-generator.js';

export const taxRouter = Router();

/**
 * Multi-Year ITR Analysis
 */
taxRouter.post('/itr/analyze', (req: Request, res: Response) => {
  try {
    const { pan = 'AABCA8741E', entityName = 'Apex Precision Engineering Pvt Ltd', filings } = req.body;
    const filingsToAnalyze = Array.isArray(filings) && filings.length > 0
      ? filings
      : TaxSampleGenerator.generateThreeYearItr();

    const result = ItrAnalyzer.analyze(pan, entityName, filingsToAnalyze);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

/**
 * GSTR-3B 12-Month Analysis
 */
taxRouter.post('/gstr3b/analyze', (req: Request, res: Response) => {
  try {
    const { gstin = '27AABCA8741E1Z3', entityName = 'Apex Precision Engineering Pvt Ltd', monthlyReturns } = req.body;
    const returnsToAnalyze = Array.isArray(monthlyReturns) && monthlyReturns.length > 0
      ? monthlyReturns
      : TaxSampleGenerator.generateTwelveMonthGstr3b();

    const result = Gstr3bAnalyzer.analyze(gstin, entityName, returnsToAnalyze);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

/**
 * Three-Way Triangulation: Banking vs GST vs ITR
 */
taxRouter.post('/triangulate', (req: Request, res: Response) => {
  try {
    const {
      borrowerPan = 'AABCA8741E',
      entityName = 'Apex Precision Engineering Pvt Ltd',
      comparisonPeriod = 'FY 2024-25',
      bankingTurnoverAnnualized = 282000000,
      gstTurnoverAnnualized = 285000000,
      itrGrossTurnover = 285000000,
    } = req.body;

    const result = ThreeWayTriangulator.triangulate(
      borrowerPan,
      entityName,
      comparisonPeriod,
      bankingTurnoverAnnualized,
      gstTurnoverAnnualized,
      itrGrossTurnover
    );

    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});
