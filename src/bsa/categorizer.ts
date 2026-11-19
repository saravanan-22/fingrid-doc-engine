import { TransactionType, TransactionCategory } from './types.js';

export interface ICategorizedResult {
  category: TransactionCategory;
  isBounce: boolean;
  bounceType?: 'INWARD' | 'OUTWARD';
  entityIdentified?: string;
}

export class TransactionCategorizer {
  // Regex rules optimized for Indian Banking narrations (SBI, HDFC, ICICI, Axis, Kotak, PNB, BoB)
  private static OUTWARD_BOUNCE_REGEX = /(?:RETURN|BOUNCE|INSUFFICIENT\s+FUNDS|ACH\s+RET|ECS\s+RET|CHQ\s+RTN|DISHONOU?R|RET\s+CHG|UNPAID|MANDATE\s+RET)/i;
  private static INWARD_BOUNCE_REGEX = /(?:INW(?:ARD)?\s+RET|CHQ\s+RET\s+DEP|INW\s+CHQ\s+RTN|RETURNED\s+CHQ)/i;

  private static EMI_LENDERS_REGEX = /(?:ACH\/|NACH\/|ECS\/|LOAN\s+EMI|BAJAJ\s+FIN|TATA\s+CAP|HDFC\s+LOAN|ICICI\s+HFC|IDFC\s+FIRST|CHOLA|MUTHOOT|MANAPPURAM|PIRAMAL|ADITYA\s+BIRLA\s+FIN|MAHINDRA\s+FIN)/i;
  private static TAX_REGEX = /(?:GST|CBDT|CHALLAN|INCOME\s+TAX|ADVANCE\s+TAX|TDS\s+PAYMENT|GOVT\s+TAX|COMMERCIAL\s+TAX)/i;
  private static CASH_DEP_REGEX = /(?:CASH\s+DEP|CDM\s+DEP|CASH\s+DEPOSIT|BY\s+CASH)/i;
  private static CASH_WDL_REGEX = /(?:ATM[\s-]WDL|CASH\s+WDL|CASH\s+WITHDRAWAL|SELF\s+CHQ)/i;
  private static CONTRA_REGEX = /(?:OWN\s+ACC|TRF\s+TO\s+SELF|CONTRA|SWEEP|INTERNAL\s+TRF)/i;
  private static SALARY_REGEX = /(?:SALARY|SAL\s+CREDIT|PAYROLL|STIPEND)/i;

  public static categorize(narration: string, type: TransactionType): ICategorizedResult {
    const text = narration.trim().toUpperCase();

    // 1. Detect Cheque / NACH Bounces (Highest Priority)
    if (this.OUTWARD_BOUNCE_REGEX.test(text)) {
      return {
        category: 'OUTWARD_BOUNCE',
        isBounce: true,
        bounceType: 'OUTWARD',
      };
    }

    if (this.INWARD_BOUNCE_REGEX.test(text)) {
      return {
        category: 'INWARD_BOUNCE',
        isBounce: true,
        bounceType: 'INWARD',
      };
    }

    // 2. Classify Debits
    if (type === 'DEBIT') {
      if (this.EMI_LENDERS_REGEX.test(text)) {
        return {
          category: 'LOAN_EMI',
          isBounce: false,
          entityIdentified: this.extractLenderName(text),
        };
      }

      if (this.TAX_REGEX.test(text)) {
        return { category: 'TAX_PAYMENT', isBounce: false, entityIdentified: 'Government Tax Authority' };
      }

      if (this.CASH_WDL_REGEX.test(text)) {
        return { category: 'CASH_WITHDRAWAL', isBounce: false };
      }

      if (this.CONTRA_REGEX.test(text)) {
        return { category: 'INTERNAL_CONTRA', isBounce: false };
      }

      return { category: 'VENDOR_PAYMENT', isBounce: false };
    }

    // 3. Classify Credits
    if (this.SALARY_REGEX.test(text)) {
      return { category: 'SALARY', isBounce: false };
    }

    if (this.CASH_DEP_REGEX.test(text)) {
      return { category: 'CASH_DEPOSIT', isBounce: false };
    }

    if (this.CONTRA_REGEX.test(text)) {
      return { category: 'INTERNAL_CONTRA', isBounce: false };
    }

    if (text.includes('LOAN DISB') || text.includes('DISBURSEMENT')) {
      return { category: 'LOAN_DISBURSAL', isBounce: false };
    }

    return { category: 'BUSINESS_SALES', isBounce: false };
  }

  private static extractLenderName(narration: string): string {
    if (narration.includes('BAJAJ')) return 'Bajaj Finance';
    if (narration.includes('TATA')) return 'Tata Capital';
    if (narration.includes('HDFC')) return 'HDFC Bank';
    if (narration.includes('ICICI')) return 'ICICI Bank';
    if (narration.includes('CHOLA')) return 'Cholamandalam Finance';
    if (narration.includes('IDFC')) return 'IDFC First Bank';
    return 'Financial Institution / NBFC';
  }
}
