import {
  IBankTransaction,
  IBankAnalysisResult,
  IMonthlyBankingSummary,
  IDiscoveredEmiObligation,
} from './types.js';
import { TransactionCategorizer } from './categorizer.js';

export class BankStatementAnalyzer {
  public static analyze(
    bankName: string,
    accountNumberMasked: string,
    rawTransactions: Array<{
      date: string;
      narration: string;
      type: 'CREDIT' | 'DEBIT';
      amount: number;
      balance: number;
      referenceNumber?: string;
    }>
  ): IBankAnalysisResult {
    if (!rawTransactions || rawTransactions.length === 0) {
      throw new Error('No bank transactions provided for analysis');
    }

    // Sort chronologically
    const sorted = [...rawTransactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // 1. Process and Categorize Transactions
    const categorizedTxns: IBankTransaction[] = sorted.map((t, idx) => {
      const cat = TransactionCategorizer.categorize(t.narration, t.type);
      return {
        id: `TXN-${idx + 1}`,
        date: t.date,
        narration: t.narration,
        referenceNumber: t.referenceNumber,
        type: t.type,
        amount: Math.abs(t.amount),
        balance: t.balance,
        category: cat.category,
        isBounce: cat.isBounce,
        bounceType: cat.bounceType,
        entityIdentified: cat.entityIdentified,
      };
    });

    // 2. Group by Month (YYYY-MM)
    const monthMap = new Map<string, IBankTransaction[]>();
    for (const t of categorizedTxns) {
      const monthKey = t.date.substring(0, 7);
      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, []);
      }
      monthMap.get(monthKey)!.push(t);
    }

    const monthlyBreakdown: IMonthlyBankingSummary[] = [];
    let totalBankingTurnover = 0;
    let totalCashDeposits = 0;
    let totalCashWithdrawals = 0;
    let totalCreditsSum = 0;
    let totalDebitsSum = 0;
    let totalInwardBounces = 0;
    let totalOutwardBounces = 0;
    let ambSum = 0;
    let lowestMonthlyBalance = Infinity;

    const emiTracker = new Map<string, { totalAmount: number; count: number; amounts: number[] }>();

    for (const [month, txns] of monthMap.entries()) {
      let mCredits = 0;
      let mDebits = 0;
      let mNetTurnover = 0;
      let mInwardBounces = 0;
      let mOutwardBounces = 0;
      let mHighestBal = -Infinity;
      let mLowestBal = Infinity;
      let balanceSum = 0;

      for (const t of txns) {
        if (t.balance > mHighestBal) mHighestBal = t.balance;
        if (t.balance < mLowestBal) mLowestBal = t.balance;
        balanceSum += t.balance;

        if (t.type === 'CREDIT') {
          mCredits += t.amount;
          totalCreditsSum += t.amount;

          // Turnover excludes contra transfers and loan disbursals
          if (t.category !== 'INTERNAL_CONTRA' && t.category !== 'LOAN_DISBURSAL') {
            mNetTurnover += t.amount;
            totalBankingTurnover += t.amount;
          }

          if (t.category === 'CASH_DEPOSIT') {
            totalCashDeposits += t.amount;
          }
        } else {
          mDebits += t.amount;
          totalDebitsSum += t.amount;

          if (t.category === 'CASH_WITHDRAWAL') {
            totalCashWithdrawals += t.amount;
          }

          // Track recurring EMIs
          if (t.category === 'LOAN_EMI' && t.entityIdentified) {
            if (!emiTracker.has(t.entityIdentified)) {
              emiTracker.set(t.entityIdentified, { totalAmount: 0, count: 0, amounts: [] });
            }
            const record = emiTracker.get(t.entityIdentified)!;
            record.totalAmount += t.amount;
            record.count++;
            record.amounts.push(t.amount);
          }
        }

        if (t.isBounce) {
          if (t.bounceType === 'OUTWARD') {
            mOutwardBounces++;
            totalOutwardBounces++;
          } else {
            mInwardBounces++;
            totalInwardBounces++;
          }
        }
      }

      const mAmb = balanceSum / txns.length;
      ambSum += mAmb;
      if (mLowestBal < lowestMonthlyBalance) lowestMonthlyBalance = mLowestBal;

      monthlyBreakdown.push({
        month,
        totalCredits: mCredits,
        totalDebits: mDebits,
        netTurnover: mNetTurnover,
        averageBalance: Math.round(mAmb),
        highestBalance: mHighestBal,
        lowestBalance: mLowestBal === Infinity ? 0 : mLowestBal,
        inwardBounceCount: mInwardBounces,
        outwardBounceCount: mOutwardBounces,
        totalTransactionsCount: txns.length,
      });
    }

    const monthsAnalyzed = monthlyBreakdown.length || 1;
    const overallAmb = Math.round(ambSum / monthsAnalyzed);
    const annualizedTurnover = Math.round((totalBankingTurnover / monthsAnalyzed) * 12);

    const cashDepositRatioPercent = totalCreditsSum > 0
      ? parseFloat(((totalCashDeposits / totalCreditsSum) * 100).toFixed(1))
      : 0;
    const cashWithdrawalRatioPercent = totalDebitsSum > 0
      ? parseFloat(((totalCashWithdrawals / totalDebitsSum) * 100).toFixed(1))
      : 0;

    // Discovered Recurring EMI Loans
    const discoveredActiveLoans: IDiscoveredEmiObligation[] = [];
    let totalEmiDebits = 0;

    for (const [lender, info] of emiTracker.entries()) {
      totalEmiDebits += info.totalAmount;
      discoveredActiveLoans.push({
        lenderPattern: lender,
        approximateEmiAmount: Math.round(info.totalAmount / info.count),
        frequencyMonths: info.count,
        totalPaid: info.totalAmount,
      });
    }

    // 3. Underwriting Policy Rules
    const decisionRationale: string[] = [];
    let underwritingDecision: 'APPROVE' | 'REJECT' | 'DEVIATION_REQUIRED' = 'APPROVE';

    if (totalOutwardBounces >= 3) {
      underwritingDecision = 'REJECT';
      decisionRationale.push(`High default risk: ${totalOutwardBounces} outward cheque/mandate bounces detected.`);
    } else if (totalOutwardBounces > 0) {
      underwritingDecision = 'DEVIATION_REQUIRED';
      decisionRationale.push(`${totalOutwardBounces} outward bounce(s) detected. Requires Credit Manager deviation approval.`);
    }

    if (cashDepositRatioPercent > 40) {
      if (underwritingDecision !== 'REJECT') underwritingDecision = 'DEVIATION_REQUIRED';
      decisionRationale.push(`High cash deposit intensity (${cashDepositRatioPercent}% of credits is cash). Verify business legitimacy.`);
    }

    if (overallAmb < 50000 && annualizedTurnover > 10000000) {
      if (underwritingDecision !== 'REJECT') underwritingDecision = 'DEVIATION_REQUIRED';
      decisionRationale.push(`Low Average Bank Balance (AMB: ₹${overallAmb.toLocaleString('en-IN')}) relative to turnover.`);
    }

    if (underwritingDecision === 'APPROVE') {
      decisionRationale.push(`Healthy banking conduct: Zero outward bounces, robust AMB (₹${overallAmb.toLocaleString('en-IN')}), and clean turnover.`);
    }

    const cleanBankingFlag = totalOutwardBounces === 0;

    return {
      bankName,
      accountNumberMasked,
      statementPeriodStart: sorted[0].date,
      statementPeriodEnd: sorted[sorted.length - 1].date,
      monthsAnalyzed,
      totalBankingTurnover,
      annualizedTurnover,
      averageMonthlyBalance: overallAmb,
      lowestMonthlyBalance: lowestMonthlyBalance === Infinity ? 0 : lowestMonthlyBalance,
      inwardChequeBounces: totalInwardBounces,
      outwardChequeBounces: totalOutwardBounces,
      cleanBankingFlag,
      cashDepositRatioPercent,
      cashWithdrawalRatioPercent,
      totalEmiDebits,
      discoveredActiveLoans,
      monthlyBreakdown,
      underwritingDecision,
      decisionRationale,
    };
  }

  /**
   * Formats BSA result directly into Section 6 of the CAM Report
   */
  public static toCamReportSection(bsa: IBankAnalysisResult): {
    bankName: string;
    accountNumberMasked: string;
    annualTurnoverCredited: number;
    averageMonthlyBalance: number;
    inwardChequeBounces: number;
    outwardChequeBounces: number;
    cleanBankingFlag: boolean;
  } {
    return {
      bankName: bsa.bankName,
      accountNumberMasked: bsa.accountNumberMasked,
      annualTurnoverCredited: bsa.annualizedTurnover,
      averageMonthlyBalance: bsa.averageMonthlyBalance,
      inwardChequeBounces: bsa.inwardChequeBounces,
      outwardChequeBounces: bsa.outwardChequeBounces,
      cleanBankingFlag: bsa.cleanBankingFlag,
    };
  }
}
