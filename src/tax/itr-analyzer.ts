import { IItrFiling, IItrAnalysisResult } from './types.js';

export class ItrAnalyzer {
  public static analyze(
    pan: string,
    entityName: string,
    filings: IItrFiling[]
  ): IItrAnalysisResult {
    if (!filings || filings.length === 0) {
      throw new Error('At least one ITR filing record is required for analysis');
    }

    // Sort chronologically by Assessment Year
    const sorted = [...filings].sort((a, b) => a.assessmentYear.localeCompare(b.assessmentYear));
    const latest = sorted[sorted.length - 1];

    let belatedCount = 0;
    let patMarginSum = 0;

    for (const f of sorted) {
      if (f.isBelated || f.filingSection === '139(4)') {
        belatedCount++;
      }
      const margin = f.grossReceiptsOrTurnover > 0
        ? (f.profitAfterTax / f.grossReceiptsOrTurnover) * 100
        : 0;
      patMarginSum += margin;
    }

    const averageNetProfitMargin = parseFloat((patMarginSum / sorted.length).toFixed(1));

    // 3-Year CAGR Calculation
    let threeYearTurnoverCagr = 0;
    if (sorted.length >= 2) {
      const oldest = sorted[0];
      const years = sorted.length - 1;
      if (oldest.grossReceiptsOrTurnover > 0 && latest.grossReceiptsOrTurnover > 0) {
        const growthMultiple = latest.grossReceiptsOrTurnover / oldest.grossReceiptsOrTurnover;
        threeYearTurnoverCagr = parseFloat(((Math.pow(growthMultiple, 1 / years) - 1) * 100).toFixed(1));
      }
    }

    let filingDiscipline: 'EXCELLENT' | 'GOOD' | 'POOR' = 'EXCELLENT';
    if (belatedCount === 0) filingDiscipline = 'EXCELLENT';
    else if (belatedCount === 1) filingDiscipline = 'GOOD';
    else filingDiscipline = 'POOR';

    // Underwriting Decision
    const decisionRationale: string[] = [];
    let underwritingDecision: 'APPROVE' | 'REJECT' | 'DEVIATION_REQUIRED' = 'APPROVE';

    if (latest.profitAfterTax < 0 && latest.cashAccruals < 0) {
      underwritingDecision = 'REJECT';
      decisionRationale.push(`Cash loss incurred in latest financial year (PAT: ₹${latest.profitAfterTax.toLocaleString('en-IN')}).`);
    } else if (belatedCount >= 2) {
      underwritingDecision = 'DEVIATION_REQUIRED';
      decisionRationale.push(`Habitual delayed ITR filings (${belatedCount} of ${sorted.length} years filed belatedly u/s 139(4)).`);
    }

    if (threeYearTurnoverCagr < -15) {
      if (underwritingDecision !== 'REJECT') underwritingDecision = 'DEVIATION_REQUIRED';
      decisionRationale.push(`Declining business turnover trend (3-Year CAGR: ${threeYearTurnoverCagr}%).`);
    }

    if (underwritingDecision === 'APPROVE') {
      decisionRationale.push(`Stable income trajectory: ${sorted.length}-Year CAGR of ${threeYearTurnoverCagr}%, Net Profit Margin of ${averageNetProfitMargin}%, and on-time statutory filing discipline.`);
    }

    return {
      pan,
      entityName,
      filingsCount: sorted.length,
      latestTurnover: latest.grossReceiptsOrTurnover,
      latestProfitAfterTax: latest.profitAfterTax,
      latestCashAccruals: latest.cashAccruals,
      threeYearTurnoverCagr,
      averageNetProfitMargin,
      belatedFilingsCount: belatedCount,
      filingDiscipline,
      filings: sorted,
      underwritingDecision,
      decisionRationale,
    };
  }
}
