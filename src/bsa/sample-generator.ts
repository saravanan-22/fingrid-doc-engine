export class BsaSampleGenerator {
  public static generateHdfcStatement(hasBounces = false): Array<{
    date: string;
    narration: string;
    type: 'CREDIT' | 'DEBIT';
    amount: number;
    balance: number;
    referenceNumber?: string;
  }> {
    const transactions = [];
    let currentBalance = 4250000;

    const months = ['2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11'];

    for (const m of months) {
      // 1. Business Sales Credit via NEFT
      currentBalance += 1850000;
      transactions.push({
        date: `${m}-03`,
        narration: 'NEFT-CR-AXIS001928-APEX FORGINGS PVT LTD-INVOICE 891',
        type: 'CREDIT' as const,
        amount: 1850000,
        balance: currentBalance,
        referenceNumber: `NEFT${Date.now()}`,
      });

      // 2. Business Sales Credit via RTGS
      currentBalance += 3200000;
      transactions.push({
        date: `${m}-07`,
        narration: 'RTGS-CR-HDFC000012-L&T DEFENCE SYSTEMS-PAYMENT FOR BATCH 4',
        type: 'CREDIT' as const,
        amount: 3200000,
        balance: currentBalance,
        referenceNumber: `RTGS${Date.now()}`,
      });

      // 3. Regular Loan EMI to Tata Capital
      currentBalance -= 185000;
      transactions.push({
        date: `${m}-10`,
        narration: 'ACH/TATA CAP FINANCIAL/LOAN449102/AUTO-DEBIT',
        type: 'DEBIT' as const,
        amount: 185000,
        balance: currentBalance,
      });

      // 4. Regular Loan EMI to Bajaj Finance
      currentBalance -= 142000;
      transactions.push({
        date: `${m}-12`,
        narration: 'NACH/BAJAJ FIN LTD/SME-TL-8891/MONTHLY EMI',
        type: 'DEBIT' as const,
        amount: 142000,
        balance: currentBalance,
      });

      // 5. Vendor Raw Material Payments
      currentBalance -= 2100000;
      transactions.push({
        date: `${m}-16`,
        narration: 'RTGS-DR-KOTAK009-TATA STEEL LIMITED-RAW MATERIAL COILS',
        type: 'DEBIT' as const,
        amount: 2100000,
        balance: currentBalance,
      });

      // 6. GST Tax Payment
      currentBalance -= 480000;
      transactions.push({
        date: `${m}-20`,
        narration: 'CBDT/GST PMT/CHALLAN 27AAAC91002/MAHARASHTRA GST',
        type: 'DEBIT' as const,
        amount: 480000,
        balance: currentBalance,
      });

      // 7. UPI Business Collections
      currentBalance += 420000;
      transactions.push({
        date: `${m}-25`,
        narration: 'UPI/319280192810/MERCHANT SETTLEMENT/PAYTM QR',
        type: 'CREDIT' as const,
        amount: 420000,
        balance: currentBalance,
      });

      // 8. Occasional Cash Withdrawal for Factory Petty Cash
      currentBalance -= 50000;
      transactions.push({
        date: `${m}-28`,
        narration: 'ATM-WDL/HDFC BANK BKC/SELF FACTORY PETTY CASH',
        type: 'DEBIT' as const,
        amount: 50000,
        balance: currentBalance,
      });

      // If simulated with bounces, inject an outward return
      if (hasBounces && m === '2026-10') {
        currentBalance -= 350;
        transactions.push({
          date: `${m}-14`,
          narration: 'RETURN CHG/ACH RET/INSUFFICIENT FUNDS/MANDATE 99201',
          type: 'DEBIT' as const,
          amount: 350,
          balance: currentBalance,
        });
      }
    }

    return transactions;
  }
}
