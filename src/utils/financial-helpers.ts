/**
 * Financial utility functions for FinGrid Document Engine
 * Supports Indian Numbering System (Lakhs/Crores), INR Currency Formatting,
 * Financial Ratio Calculations, and Number-to-Words.
 */

export function formatINR(value: number | string | undefined | null, includeDecimals = true): string {
  if (value === undefined || value === null || isNaN(Number(value))) {
    return '₹0.00';
  }
  const num = Number(value);
  const isNegative = num < 0;
  const absNum = Math.abs(num);

  const parts = absNum.toFixed(includeDecimals ? 2 : 0).split('.');
  let integerPart = parts[0];
  const decimalPart = parts[1] ? `.${parts[1]}` : '';

  // Indian Numbering System: Last 3 digits, then groups of 2 digits
  if (integerPart.length > 3) {
    const lastThree = integerPart.substring(integerPart.length - 3);
    const otherDigits = integerPart.substring(0, integerPart.length - 3);
    const formattedOther = otherDigits.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    integerPart = `${formattedOther},${lastThree}`;
  }

  return `${isNegative ? '-' : ''}₹${integerPart}${decimalPart}`;
}

export function formatNumber(value: number | string | undefined | null, decimals = 2): string {
  if (value === undefined || value === null || isNaN(Number(value))) {
    return '0';
  }
  return Number(value).toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function numberToWordsIndian(value: number | string | undefined | null): string {
  if (value === undefined || value === null || isNaN(Number(value))) {
    return 'Zero Rupees Only';
  }

  const num = Math.round(Number(value));
  if (num === 0) return 'Zero Rupees Only';

  const singleDigits = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertTwoDigits(n: number): string {
    if (n < 20) return singleDigits[n];
    const unit = n % 10;
    return `${tens[Math.floor(n / 10)]}${unit ? `-${singleDigits[unit]}` : ''}`.trim();
  }

  function convertThreeDigits(n: number): string {
    const hundred = Math.floor(n / 100);
    const remainder = n % 100;
    let res = '';
    if (hundred > 0) {
      res += `${singleDigits[hundred]} Hundred`;
    }
    if (remainder > 0) {
      if (res) res += ' ';
      res += convertTwoDigits(remainder);
    }
    return res;
  }

  const crores = Math.floor(num / 10000000);
  const lakhs = Math.floor((num % 10000000) / 100000);
  const thousands = Math.floor((num % 100000) / 1000);
  const hundreds = num % 1000;

  const resultParts: string[] = [];

  if (crores > 0) {
    resultParts.push(`${convertThreeDigits(crores)} Crore`);
  }
  if (lakhs > 0) {
    resultParts.push(`${convertTwoDigits(lakhs)} Lakh`);
  }
  if (thousands > 0) {
    resultParts.push(`${convertTwoDigits(thousands)} Thousand`);
  }
  if (hundreds > 0) {
    resultParts.push(convertThreeDigits(hundreds));
  }

  return `${resultParts.join(' ')} Rupees Only`.trim();
}

export function formatDate(dateInput: string | Date | undefined | null, format = 'DD-MMM-YYYY'): string {
  if (!dateInput) return '-';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const fullMonths = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const day = String(d.getDate()).padStart(2, '0');
  const monthAbbr = months[d.getMonth()];
  const monthFull = fullMonths[d.getMonth()];
  const monthNum = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();

  if (format === 'DD-MM-YYYY') return `${day}-${monthNum}-${year}`;
  if (format === 'MMMM DD, YYYY') return `${monthFull} ${day}, ${year}`;
  return `${day} ${monthAbbr} ${year}`;
}

export function calculateRatio(numerator: number, denominator: number, decimals = 2): string {
  if (!denominator || denominator === 0) return 'N/A';
  return (numerator / denominator).toFixed(decimals);
}

export function calculateYoY(current: number, previous: number): {
  diff: number;
  percentage: number;
  direction: 'UP' | 'DOWN' | 'NEUTRAL';
  formatted: string;
} {
  const diff = current - previous;
  if (!previous || previous === 0) {
    return { diff, percentage: 0, direction: 'NEUTRAL', formatted: '0.0%' };
  }
  const pct = (diff / Math.abs(previous)) * 100;
  return {
    diff,
    percentage: Math.abs(pct),
    direction: pct > 0 ? 'UP' : pct < 0 ? 'DOWN' : 'NEUTRAL',
    formatted: `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`,
  };
}
