import { ITriangulationResult } from './types.js';

export class ThreeWayTriangulator {
  /**
   * Reconciles Banking Turnover (BSA) vs GST Turnover (GSTR-3B) vs ITR Revenue
   */
  public static triangulate(
    borrowerPan: string,
    entityName: string,
    comparisonPeriod: string,
    bankingTurnoverAnnualized: number,
    gstTurnoverAnnualized: number,
    itrGrossTurnover: number
  ): ITriangulationResult {
    if (!gstTurnoverAnnualized || gstTurnoverAnnualized === 0) {
      throw new Error('GST Annualized Turnover cannot be zero for triangulation');
    }

    const gstVsBankDiff = Math.abs(bankingTurnoverAnnualized - gstTurnoverAnnualized);
    const gstVsBankVariancePercent = parseFloat(((gstVsBankDiff / gstTurnoverAnnualized) * 100).toFixed(1));

    const itrVsGstDiff = Math.abs(itrGrossTurnover - gstTurnoverAnnualized);
    const itrVsGstVariancePercent = parseFloat(((itrVsGstDiff / gstTurnoverAnnualized) * 100).toFixed(1));

    const itrVsBankDiff = Math.abs(itrGrossTurnover - bankingTurnoverAnnualized);
    const itrVsBankVariancePercent = bankingTurnoverAnnualized > 0
      ? parseFloat(((itrVsBankDiff / bankingTurnoverAnnualized) * 100).toFixed(1))
      : 0;

    // Anomaly Flags
    // Banking credits significantly exceed GST sales -> Churn / Circular trading / Non-business credits
    const circularRevenueRiskFlag = bankingTurnoverAnnualized > gstTurnoverAnnualized * 1.30;

    // GST sales significantly exceed banking credits -> Un-cleared debtors / Bogus invoicing / Cash evasion
    const underreportingRiskFlag = gstTurnoverAnnualized > bankingTurnoverAnnualized * 1.30;

    let reconciliationStatus: 'RECONCILED' | 'ACCEPTABLE_DEVIATION' | 'UNRECONCILED_HIGH_RISK' = 'RECONCILED';
    if (gstVsBankVariancePercent <= 15 && itrVsGstVariancePercent <= 15) {
      reconciliationStatus = 'RECONCILED';
    } else if (gstVsBankVariancePercent <= 25 && itrVsGstVariancePercent <= 25) {
      reconciliationStatus = 'ACCEPTABLE_DEVIATION';
    } else {
      reconciliationStatus = 'UNRECONCILED_HIGH_RISK';
    }

    // Underwriting Decision
    const decisionRationale: string[] = [];
    let underwritingDecision: 'APPROVE' | 'REJECT' | 'DEVIATION_REQUIRED' = 'APPROVE';

    if (reconciliationStatus === 'UNRECONCILED_HIGH_RISK') {
      underwritingDecision = 'REJECT';
      if (circularRevenueRiskFlag) {
        decisionRationale.push(`Knockout: Banking turnover exceeds GST outward supplies by ${gstVsBankVariancePercent}%. High likelihood of circular fund rotation.`);
      } else {
        decisionRationale.push(`Knockout: Severe revenue mismatch across GST (₹${gstTurnoverAnnualized.toLocaleString('en-IN')}) and Banking (₹${bankingTurnoverAnnualized.toLocaleString('en-IN')}).`);
      }
    } else if (reconciliationStatus === 'ACCEPTABLE_DEVIATION') {
      underwritingDecision = 'DEVIATION_REQUIRED';
      decisionRationale.push(`Moderate turnover variance (${gstVsBankVariancePercent}% between GST & Banking). Acceptable under Credit Head deviation policy.`);
    } else {
      decisionRationale.push(`Excellent 3-way reconciliation: GST (₹${gstTurnoverAnnualized.toLocaleString('en-IN')}), Banking (₹${bankingTurnoverAnnualized.toLocaleString('en-IN')}), and ITR (₹${itrGrossTurnover.toLocaleString('en-IN')}) are closely aligned with only ${gstVsBankVariancePercent}% variance.`);
    }

    return {
      borrowerPan,
      entityName,
      comparisonPeriod,
      bankingTurnoverAnnualized,
      gstTurnoverAnnualized,
      itrGrossTurnover,
      gstVsBankVariancePercent,
      itrVsGstVariancePercent,
      itrVsBankVariancePercent,
      circularRevenueRiskFlag,
      underreportingRiskFlag,
      reconciliationStatus,
      underwritingDecision,
      decisionRationale,
    };
  }
}
