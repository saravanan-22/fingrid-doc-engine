import { IItrFiling, IGstr3bMonth } from './types.js';

export class TaxSampleGenerator {
  public static generateThreeYearItr(): IItrFiling[] {
    return [
      {
        assessmentYear: 'AY 2023-24',
        financialYear: 'FY 2022-23',
        formType: 'ITR_6',
        filingDate: '2023-10-25',
        dueDate: '2023-10-31',
        filingSection: '139(1)',
        isBelated: false,
        acknowledgementNumber: 'ACK-23091823901',
        grossReceiptsOrTurnover: 182000000,
        grossTotalIncome: 17200000,
        totalTaxableIncome: 16800000,
        profitBeforeTax: 18800000,
        profitAfterTax: 14200000,
        depreciation: 4600000,
        cashAccruals: 18800000,
        totalTaxPaid: 4600000,
        advanceTaxPaid: 4200000,
        tdsCredit: 400000,
        selfAssessmentTaxPaid: 0,
        effectiveTaxRatePercent: 24.5,
      },
      {
        assessmentYear: 'AY 2024-25',
        financialYear: 'FY 2023-24',
        formType: 'ITR_6',
        filingDate: '2024-10-28',
        dueDate: '2024-10-31',
        filingSection: '139(1)',
        isBelated: false,
        acknowledgementNumber: 'ACK-24091824102',
        grossReceiptsOrTurnover: 224000000,
        grossTotalIncome: 24100000,
        totalTaxableIncome: 23600000,
        profitBeforeTax: 25800000,
        profitAfterTax: 19600000,
        depreciation: 6200000,
        cashAccruals: 25800000,
        totalTaxPaid: 6200000,
        advanceTaxPaid: 5800000,
        tdsCredit: 400000,
        selfAssessmentTaxPaid: 0,
        effectiveTaxRatePercent: 24.0,
      },
      {
        assessmentYear: 'AY 2025-26',
        financialYear: 'FY 2024-25',
        formType: 'ITR_6',
        filingDate: '2025-10-22',
        dueDate: '2025-10-31',
        filingSection: '139(1)',
        isBelated: false,
        acknowledgementNumber: 'ACK-25091829910',
        grossReceiptsOrTurnover: 285000000,
        grossTotalIncome: 33200000,
        totalTaxableIncome: 32500000,
        profitBeforeTax: 35600000,
        profitAfterTax: 26800000,
        depreciation: 8800000,
        cashAccruals: 35600000,
        totalTaxPaid: 8800000,
        advanceTaxPaid: 8200000,
        tdsCredit: 600000,
        selfAssessmentTaxPaid: 0,
        effectiveTaxRatePercent: 24.7,
      },
    ];
  }

  public static generateTwelveMonthGstr3b(): IGstr3bMonth[] {
    const months = [
      '2025-04', '2025-05', '2025-06', '2025-07', '2025-08', '2025-09',
      '2025-10', '2025-11', '2025-12', '2026-01', '2026-02', '2026-03',
    ];

    return months.map((m, idx) => {
      const taxableSupplies31a = 22500000 + (idx % 3) * 1500000;
      const totalTaxLiability = Math.round(taxableSupplies31a * 0.18);
      const taxPaidInCash = Math.round(totalTaxLiability * 0.22); // 22% paid via cash ledger
      const itcUtilized = totalTaxLiability - taxPaidInCash;

      return {
        month: m,
        filingDate: `${m}-18`,
        dueDate: `${m}-20`,
        isFiledLate: false,
        delayInDays: 0,
        taxableSupplies31a,
        zeroRatedSupplies31b: 0,
        exemptNilSupplies31c: 0,
        totalOutwardTurnover: taxableSupplies31a,
        totalTaxLiability,
        itcUtilized,
        taxPaidInCash,
        cashTaxRatioPercent: 22.0,
      };
    });
  }
}
