import { IDpdMonth, AssetClassification } from './types.js';

export class DpdParser {
  /**
   * Parses legacy 36-month CIBIL/Experian payment history string into structured monthly DPD objects.
   * Standard format: 3-character tokens per month (e.g. "000000030060STD...").
   */
  public static parseHistoryString(historyString: string, startDate?: Date): IDpdMonth[] {
    if (!historyString || typeof historyString !== 'string') {
      return [];
    }

    const cleanStr = historyString.trim();
    const tokenLength = 3;
    const months: IDpdMonth[] = [];
    const baseDate = startDate ? new Date(startDate) : new Date();

    let monthIndex = 1;
    for (let i = 0; i < cleanStr.length; i += tokenLength) {
      const token = cleanStr.substring(i, i + tokenLength).toUpperCase();
      if (!token) break;

      const dateObj = new Date(baseDate);
      dateObj.setMonth(dateObj.getMonth() - (monthIndex - 1));
      const dateString = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;

      let dpd = 0;
      let assetClass: AssetClassification = 'STD';
      let isDelinquent = false;

      if (!isNaN(Number(token))) {
        dpd = parseInt(token, 10);
        if (dpd > 0) {
          isDelinquent = true;
          if (dpd <= 30) assetClass = 'SMA_0';
          else if (dpd <= 60) assetClass = 'SMA_1';
          else if (dpd <= 90) assetClass = 'SMA_2';
          else assetClass = 'SUB';
        }
      } else {
        switch (token) {
          case 'STD':
            dpd = 0;
            assetClass = 'STD';
            break;
          case 'SUB':
            dpd = 90;
            assetClass = 'SUB';
            isDelinquent = true;
            break;
          case 'DBT':
            dpd = 180;
            assetClass = 'DBT';
            isDelinquent = true;
            break;
          case 'LSS':
            dpd = 360;
            assetClass = 'LSS';
            isDelinquent = true;
            break;
          case 'XXX':
          case '00?':
            dpd = 0;
            assetClass = 'STD';
            break;
          default:
            dpd = 0;
            assetClass = 'STD';
        }
      }

      months.push({
        monthIndex,
        dateString,
        dpd,
        rawCode: token,
        assetClass,
        isDelinquent,
      });

      monthIndex++;
    }

    return months;
  }

  /**
   * Computes max DPD in the most recent N months (e.g. 12 months, 24 months, 36 months)
   */
  public static getMaxDpdInWindow(months: IDpdMonth[], windowMonths: number): number {
    const windowSlice = months.slice(0, windowMonths);
    if (windowSlice.length === 0) return 0;
    return Math.max(...windowSlice.map(m => m.dpd));
  }
}
