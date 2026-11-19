import { IGstr3bMonth, IGstr3bAnalysisResult } from './types.js';

export class Gstr3bAnalyzer {
  public static analyze(
    gstin: string,
    entityName: string,
    monthlyReturns: IGstr3bMonth[]
  ): IGstr3bAnalysisResult {
    if (!monthlyReturns || monthlyReturns.length === 0) {
      throw new Error('At least one GSTR-3B monthly return is required for analysis');
    }

    const sorted = [...monthlyReturns].sort((a, b) => a.month.localeCompare(b.month));

    let totalTurnover = 0;
    let totalTaxLiability = 0;
    let totalCashTaxPaid = 0;
    let lateFilingsCount = 0;

    let highestTurnover = { month: sorted[0].month, amount: -Infinity };
    let lowestTurnover = { month: sorted[0].month, amount: Infinity };

    for (const m of sorted) {
      totalTurnover += m.totalOutwardTurnover;
      totalTaxLiability += m.totalTaxLiability;
      totalCashTaxPaid += m.taxPaidInCash;

      if (m.isFiledLate) lateFilingsCount++;

      if (m.totalOutwardTurnover > highestTurnover.amount) {
        highestTurnover = { month: m.month, amount: m.totalOutwardTurnover };
      }
      if (m.totalOutwardTurnover < lowestTurnover.amount) {
        lowestTurnover = { month: m.month, amount: m.totalOutwardTurnover };
      }
    }

    const monthsAnalyzed = sorted.length;
    const averageMonthlyTurnover = Math.round(totalTurnover / monthsAnalyzed);
    const overallCashTaxRatioPercent = totalTaxLiability > 0
      ? parseFloat(((totalCashTaxPaid / totalTaxLiability) * 100).toFixed(1))
      : 0;

    const onTimeCount = monthsAnalyzed - lateFilingsCount;
    const filingRegularityScorePercent = Math.round((onTimeCount / monthsAnalyzed) * 100);

    // Policy Decisioning
    const decisionRationale: string[] = [];
    let underwritingDecision: 'APPROVE' | 'REJECT' | 'DEVIATION_REQUIRED' = 'APPROVE';

    if (lateFilingsCount >= 4) {
      underwritingDecision = 'REJECT';
      decisionRationale.push(`Severe GST filing non-compliance: ${lateFilingsCount} of ${monthsAnalyzed} months filed belatedly.`);
    } else if (lateFilingsCount >= 2) {
      underwritingDecision = 'DEVIATION_REQUIRED';
      decisionRationale.push(`${lateFilingsCount} delayed GSTR-3B filings recorded. Requires operational deviation approval.`);
    }

    // ITC Dependency check: Cash Tax < 3% for a large turnover firm
    if (overallCashTaxRatioPercent < 3 && totalTurnover > 10000000) {
      if (underwritingDecision !== 'REJECT') underwritingDecision = 'DEVIATION_REQUIRED';
      decisionRationale.push(`Very low cash GST payment (${overallCashTaxRatioPercent}% of tax liability paid via cash ledger; 97%+ ITC dependency). Verify supplier legitimacy.`);
    }

    if (underwritingDecision === 'APPROVE') {
      decisionRationale.push(`Consistent GST compliance (${filingRegularityScorePercent}% on-time), healthy cash tax payments (${overallCashTaxRatioPercent}%), and annualized taxable supplies of ₹${(averageMonthlyTurnover * 12).toLocaleString('en-IN')}.`);
    }

    return {
      gstin,
      entityName,
      monthsAnalyzed,
      totalAnnualGstTurnover: totalTurnover,
      averageMonthlyTurnover,
      totalCashTaxPaid,
      overallCashTaxRatioPercent,
      lateFilingsCount,
      filingRegularityScorePercent,
      highestTurnoverMonth: highestTurnover,
      lowestTurnoverMonth: lowestTurnover,
      monthlyBreakdown: sorted,
      underwritingDecision,
      decisionRationale,
    };
  }
}
