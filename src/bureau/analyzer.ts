import { IUnifiedBureauReport, IBureauAnalysisResult } from './types.js';
import { DpdParser } from './dpd-parser.js';

export class BureauAnalyzer {
  /**
   * Evaluates raw bureau report and runs underwriting credit policy rules
   */
  public static analyzeReport(report: IUnifiedBureauReport): IBureauAnalysisResult {
    const { score, tradelines, inquiries, borrower } = report;
    const scoreVal = score.scoreValue;

    // 1. Determine Score Band
    let scoreBand: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' = 'FAIR';
    if (scoreVal >= 750) scoreBand = 'EXCELLENT';
    else if (scoreVal >= 700) scoreBand = 'GOOD';
    else if (scoreVal >= 650) scoreBand = 'FAIR';
    else scoreBand = 'POOR';

    // 2. Tradeline Aggregations
    let totalActiveDebt = 0;
    let totalMonthlyEmi = 0;
    let securedDebt = 0;
    let unsecuredDebt = 0;
    let activeAccountsCount = 0;
    let closedAccountsCount = 0;
    let totalOverdueAmount = 0;

    let hasSuitFiled = false;
    let hasWrittenOff = false;
    let hasSettled = false;
    let hasWilfulDefault = false;

    let maxDpd36 = 0;
    let maxDpd12 = 0;

    for (const tl of tradelines) {
      if (tl.accountStatus === 'ACTIVE') {
        activeAccountsCount++;
        totalActiveDebt += tl.currentBalance;
        totalMonthlyEmi += tl.monthlyEmi;

        if (tl.isSecured) {
          securedDebt += tl.currentBalance;
        } else {
          unsecuredDebt += tl.currentBalance;
        }
      } else {
        closedAccountsCount++;
      }

      totalOverdueAmount += tl.overdueAmount;

      // Check Derogatory Flags
      if (tl.derogatoryFlag === 'SUIT_FILED' || tl.accountStatus === 'SUIT_FILED') hasSuitFiled = true;
      if (tl.derogatoryFlag === 'WRITTEN_OFF' || tl.accountStatus === 'WRITTEN_OFF') hasWrittenOff = true;
      if (tl.derogatoryFlag === 'WILFUL_DEFAULT') hasWilfulDefault = true;
      if (tl.accountStatus === 'SETTLED') hasSettled = true;

      // Parse 36-Month DPD
      const parsedMonths = DpdParser.parseHistoryString(tl.paymentHistoryString);
      const tlMaxDpd36 = DpdParser.getMaxDpdInWindow(parsedMonths, 36);
      const tlMaxDpd12 = DpdParser.getMaxDpdInWindow(parsedMonths, 12);

      if (tlMaxDpd36 > maxDpd36) maxDpd36 = tlMaxDpd36;
      if (tlMaxDpd12 > maxDpd12) maxDpd12 = tlMaxDpd12;
    }

    const unsecuredPercentage = totalActiveDebt > 0 ? (unsecuredDebt / totalActiveDebt) * 100 : 0;

    // 3. Credit Inquiries (Credit Hunger)
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 86400000);

    let inquiriesLast30Days = 0;
    let inquiriesLast90Days = 0;

    for (const inq of inquiries) {
      const inqDate = new Date(inq.inquiryDate);
      if (inqDate >= thirtyDaysAgo) inquiriesLast30Days++;
      if (inqDate >= ninetyDaysAgo) inquiriesLast90Days++;
    }

    const creditHungerFlag = inquiriesLast30Days >= 3;

    // 4. Policy Rules & Decisioning Engine
    const decisionRationale: string[] = [];
    let underwritingDecision: 'APPROVE' | 'REJECT' | 'DEVIATION_REQUIRED' = 'APPROVE';

    // Knockout Rule: Derogatory Flags
    if (hasSuitFiled || hasWilfulDefault) {
      underwritingDecision = 'REJECT';
      decisionRationale.push('Knockout: Legal suit filed or wilful default reported on tradelines.');
    } else if (hasWrittenOff) {
      underwritingDecision = 'REJECT';
      decisionRationale.push('Knockout: Written-off loan accounts found in bureau record.');
    }

    // Knockout Rule: Score < 650
    if (scoreVal < 650) {
      underwritingDecision = 'REJECT';
      decisionRationale.push(`Bureau score (${scoreVal}) is below minimum policy cutoff of 650.`);
    }

    // Delinquency Rules
    if (maxDpd12 >= 90) {
      underwritingDecision = 'REJECT';
      decisionRationale.push(`90+ DPD (NPA) delinquency recorded within last 12 months (Max DPD: ${maxDpd12}).`);
    } else if (maxDpd12 > 0 && maxDpd12 <= 60 && underwritingDecision !== 'REJECT') {
      underwritingDecision = 'DEVIATION_REQUIRED';
      decisionRationale.push(`Delinquency recorded in past 12 months (Max DPD: ${maxDpd12}). Credit risk deviation required.`);
    }

    // High Unsecured Ratio Rule
    if (unsecuredPercentage > 65 && totalActiveDebt > 500000 && underwritingDecision === 'APPROVE') {
      underwritingDecision = 'DEVIATION_REQUIRED';
      decisionRationale.push(`High unsecured debt ratio (${unsecuredPercentage.toFixed(1)}% of total debt). Requires secondary review.`);
    }

    // Credit Hunger Rule
    if (creditHungerFlag && underwritingDecision === 'APPROVE') {
      underwritingDecision = 'DEVIATION_REQUIRED';
      decisionRationale.push(`Elevated credit inquiries (${inquiriesLast30Days} hard inquiries in last 30 days indicates credit hunger).`);
    }

    if (underwritingDecision === 'APPROVE') {
      decisionRationale.push(`Strong credit bureau profile: Score ${scoreVal} (${scoreBand}), zero 30+ DPD in last 12 months.`);
    }

    // Human-readable DPD summary for reports
    const dpdSummaryText = maxDpd12 === 0
      ? 'Clean repayment history with zero 30+ DPD delinquencies in the last 36 months.'
      : `Peak delinquency of ${maxDpd12} DPD recorded in the trailing 12-month period (Historical 36m peak: ${maxDpd36} DPD).`;

    return {
      borrowerPan: borrower.pan,
      provider: report.provider,
      score: scoreVal,
      cmrRank: score.cmrRank,
      scoreBand,
      totalActiveDebt,
      totalMonthlyEmi,
      securedDebt,
      unsecuredDebt,
      unsecuredDebtPercentage: parseFloat(unsecuredPercentage.toFixed(1)),
      activeAccountsCount,
      closedAccountsCount,
      maxDpdPast12Months: maxDpd12,
      maxDpdPast36Months: maxDpd36,
      totalOverdueAmount,
      dpdSummaryText,
      inquiriesLast30Days,
      inquiriesLast90Days,
      creditHungerFlag,
      derogatoryFlags: {
        hasSuitFiled,
        hasWrittenOff,
        hasSettled,
        hasWilfulDefault,
      },
      underwritingDecision,
      decisionRationale,
    };
  }
}
