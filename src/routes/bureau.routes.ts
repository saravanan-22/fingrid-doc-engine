import { Router, Request, Response } from 'express';
import { BureauAnalyzer } from '../bureau/analyzer.js';
import { MockBureauProvider } from '../bureau/providers/mock.js';
import { CibilProvider } from '../bureau/providers/cibil.js';
import { ExperianProvider } from '../bureau/providers/experian.js';
import { IBureauFetchRequest, IUnifiedBureauReport } from '../bureau/types.js';

export const bureauRouter = Router();

async function resolveBureauReport(reqPayload: IBureauFetchRequest): Promise<IUnifiedBureauReport> {
  const provider = (reqPayload.provider || 'MOCK').toUpperCase();
  if (provider === 'CIBIL') {
    return CibilProvider.fetchReport(reqPayload);
  }
  if (provider === 'EXPERIAN') {
    return ExperianProvider.fetchReport(reqPayload);
  }
  return MockBureauProvider.fetchReport(reqPayload);
}

/**
 * Fetch and return normalized bureau report
 */
bureauRouter.post('/fetch', async (req: Request, res: Response) => {
  try {
    const { name, pan, entityType = 'INDIVIDUAL', provider = 'MOCK' } = req.body;
    if (!name || !pan) {
      return res.status(400).json({ success: false, error: 'name and pan are required' });
    }

    const report = await resolveBureauReport(req.body);
    res.json({ success: true, report });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

/**
 * Fetch bureau data and run underwriting risk scorecard
 */
bureauRouter.post('/analyze', async (req: Request, res: Response) => {
  try {
    const { name, pan } = req.body;
    if (!name || !pan) {
      return res.status(400).json({ success: false, error: 'name and pan are required' });
    }

    const report = await resolveBureauReport(req.body);
    const analysis = BureauAnalyzer.analyzeReport(report);

    res.json({
      success: true,
      reportSummary: {
        reportId: report.reportId,
        provider: report.provider,
        reportType: report.reportType,
      },
      analysis,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

/**
 * Bridge endpoint: Takes borrower info, analyzes bureau, and formats CAM Report section
 */
bureauRouter.post('/cam-bridge', async (req: Request, res: Response) => {
  try {
    const { name, pan, entityType = 'COMMERCIAL' } = req.body;
    const report = await resolveBureauReport({ ...req.body, entityType });
    const analysis = BureauAnalyzer.analyzeReport(report);

    const camBureauSection = {
      cmrRank: analysis.cmrRank || 'CMR-3 (Low Risk)',
      cibilCommercialScore: analysis.score,
      delinquencySummary: analysis.dpdSummaryText,
      totalActiveDebt: analysis.totalActiveDebt,
      monthlyEmiObligation: analysis.totalMonthlyEmi,
      unsecuredRatio: analysis.unsecuredDebtPercentage,
      underwritingDecision: analysis.underwritingDecision,
      recommendationNotes: analysis.decisionRationale,
    };

    res.json({
      success: true,
      camBureauSection,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});
