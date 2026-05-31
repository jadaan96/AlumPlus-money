import { Prisma } from "@prisma/client";
import { toNumber } from "./utils";

type CreditExpense = { amount: Prisma.Decimal; onCredit: boolean };
type VendorPayment = {
  amount: Prisma.Decimal;
  isVendorCredit: boolean;
  expenseId: string | null;
};

export function totalCreditPurchases(expenses: CreditExpense[]): number {
  return expenses
    .filter((e) => e.onCredit)
    .reduce((s, e) => s + toNumber(e.amount), 0);
}

/** مدفوعات الذمم (إجمالي — غير مربوطة بفاتورة واحدة) + مدفوعات قديمة مربوطة بفاتورة */
export function totalVendorCreditPaid(payments: VendorPayment[]): number {
  return payments
    .filter((p) => p.isVendorCredit || p.expenseId)
    .reduce((s, p) => s + toNumber(p.amount), 0);
}

export function vendorPayablesRemaining(
  expenses: CreditExpense[],
  payments: VendorPayment[]
): number {
  const credit = totalCreditPurchases(expenses);
  const paid = totalVendorCreditPaid(payments);
  return Math.max(0, Math.round((credit - paid) * 100) / 100);
}
