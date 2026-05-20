import { prisma } from "./prisma";
import { toNumber } from "./utils";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export type PeriodSummary = {
  workshopsCount: number;
  workshopsTotal: number;
  workshopsReceived: number;
  workshopsRemaining: number;
  expensesTotal: number;
  salariesTotal: number;
  paymentsTotal: number;
  paymentsToEmployees: number;
  paymentsGeneral: number;
  netCashFlow: number;
  salaryRemaining: number;
};

export async function getPeriodSummary(periodId: string): Promise<PeriodSummary> {
  const [workshops, expenses, salaries, payments] = await Promise.all([
    prisma.workshop.findMany({ where: { periodId } }),
    prisma.expense.findMany({ where: { periodId } }),
    prisma.salaryEntry.findMany({ where: { periodId } }),
    prisma.payment.findMany({ where: { periodId } }),
  ]);

  const workshopsTotal = workshops.reduce((s, w) => s + toNumber(w.totalAmount), 0);
  const workshopsReceived = workshops.reduce((s, w) => s + toNumber(w.receivedAmount), 0);
  const workshopsRemaining = workshops.reduce((s, w) => s + toNumber(w.remainingAmount), 0);
  const expensesTotal = expenses.reduce((s, e) => s + toNumber(e.amount), 0);
  const salariesTotal = salaries.reduce((s, e) => s + toNumber(e.total), 0);
  const paymentsTotal = payments.reduce((s, p) => s + toNumber(p.amount), 0);
  const paymentsToEmployees = payments
    .filter((p) => p.employeeId)
    .reduce((s, p) => s + toNumber(p.amount), 0);
  const paymentsGeneral = round2(paymentsTotal - paymentsToEmployees);

  const netCashFlow = round2(workshopsReceived - expensesTotal - paymentsTotal);
  const salaryRemaining = round2(salariesTotal - paymentsToEmployees);

  return {
    workshopsCount: workshops.length,
    workshopsTotal: round2(workshopsTotal),
    workshopsReceived: round2(workshopsReceived),
    workshopsRemaining: round2(workshopsRemaining),
    expensesTotal: round2(expensesTotal),
    salariesTotal: round2(salariesTotal),
    paymentsTotal: round2(paymentsTotal),
    paymentsToEmployees: round2(paymentsToEmployees),
    paymentsGeneral,
    netCashFlow,
    salaryRemaining,
  };
}

export function sumPeriodSummaries(summaries: PeriodSummary[]): PeriodSummary {
  const total = summaries.reduce(
    (acc, s) => ({
      workshopsCount: acc.workshopsCount + s.workshopsCount,
      workshopsTotal: acc.workshopsTotal + s.workshopsTotal,
      workshopsReceived: acc.workshopsReceived + s.workshopsReceived,
      workshopsRemaining: acc.workshopsRemaining + s.workshopsRemaining,
      expensesTotal: acc.expensesTotal + s.expensesTotal,
      salariesTotal: acc.salariesTotal + s.salariesTotal,
      paymentsTotal: acc.paymentsTotal + s.paymentsTotal,
      paymentsToEmployees: acc.paymentsToEmployees + s.paymentsToEmployees,
      paymentsGeneral: acc.paymentsGeneral + s.paymentsGeneral,
      netCashFlow: acc.netCashFlow + s.netCashFlow,
      salaryRemaining: acc.salaryRemaining + s.salaryRemaining,
    }),
    {
      workshopsCount: 0,
      workshopsTotal: 0,
      workshopsReceived: 0,
      workshopsRemaining: 0,
      expensesTotal: 0,
      salariesTotal: 0,
      paymentsTotal: 0,
      paymentsToEmployees: 0,
      paymentsGeneral: 0,
      netCashFlow: 0,
      salaryRemaining: 0,
    }
  );
  return {
    workshopsCount: total.workshopsCount,
    workshopsTotal: round2(total.workshopsTotal),
    workshopsReceived: round2(total.workshopsReceived),
    workshopsRemaining: round2(total.workshopsRemaining),
    expensesTotal: round2(total.expensesTotal),
    salariesTotal: round2(total.salariesTotal),
    paymentsTotal: round2(total.paymentsTotal),
    paymentsToEmployees: round2(total.paymentsToEmployees),
    paymentsGeneral: round2(total.paymentsGeneral),
    netCashFlow: round2(total.netCashFlow),
    salaryRemaining: round2(total.salaryRemaining),
  };
}
