/** ساعات تُخصم من الإضافي عن كل يوم عطلة (وساعات الدوام اليومية الثابتة) */
export const HOURS_DEDUCTED_PER_DAY_OFF = 9;

/** ساعات الدوام اليومية الاعتيادية — ثابتة */
export const STANDARD_DAILY_HOURS = 9;

/** معامل أجر الساعة الإضافية */
export const OVERTIME_MULTIPLIER = 1.25;

/** ساعات العمل الأسبوعية الاعتيادية (6 أيام × 9 ساعات) */
export const STANDARD_WEEKLY_HOURS = 54;

export interface WeekSalaryInput {
  daysOff: number;
  overtimeHours: number;
}

export interface WeekSalaryBreakdown {
  daysOff: number;
  regularHours: number;
  overtimeHours: number;
  hourlyRate: number;
  netOvertimeHours: number;
  overtimeAtPremiumHours: number;
  overtimeAtNormalHours: number;
  overtimeHourlyRate: number;
  overtimePay: number;
  overtimePayAtPremium: number;
  overtimePayAtNormal: number;
  baseWeeklySalary: number;
  total: number;
}

export function calculateWeeklySalary(
  weeklySalary: number,
  input: WeekSalaryInput
): WeekSalaryBreakdown {
  const daysOff = Math.max(0, input.daysOff);
  const overtimeHours = Math.max(0, input.overtimeHours);
  const regularHours = STANDARD_DAILY_HOURS;
  const hourlyRate =
    STANDARD_WEEKLY_HOURS > 0 ? weeklySalary / STANDARD_WEEKLY_HOURS : 0;

  const deductedFromDaysOff = daysOff * HOURS_DEDUCTED_PER_DAY_OFF;
  const netOvertimeHours = Math.max(0, overtimeHours - deductedFromDaysOff);

  // الدوام ثابت 9 ساعات: إذا الإضافي الصافي أكبر، الفرق بسعر عادي والباقي بمعامل 1.25
  let overtimeAtPremiumHours = netOvertimeHours;
  let overtimeAtNormalHours = 0;
  if (regularHours < netOvertimeHours) {
    overtimeAtPremiumHours = regularHours;
    overtimeAtNormalHours = netOvertimeHours - regularHours;
  }

  const overtimeHourlyRate = hourlyRate * OVERTIME_MULTIPLIER;
  const overtimePayAtPremium = overtimeAtPremiumHours * overtimeHourlyRate;
  const overtimePayAtNormal = overtimeAtNormalHours * hourlyRate;
  const overtimePay = overtimePayAtPremium + overtimePayAtNormal;
  const total = weeklySalary + overtimePay;

  return {
    daysOff,
    regularHours,
    overtimeHours,
    hourlyRate: round2(hourlyRate),
    netOvertimeHours: round2(netOvertimeHours),
    overtimeAtPremiumHours: round2(overtimeAtPremiumHours),
    overtimeAtNormalHours: round2(overtimeAtNormalHours),
    overtimeHourlyRate: round2(overtimeHourlyRate),
    overtimePay: round2(overtimePay),
    overtimePayAtPremium: round2(overtimePayAtPremium),
    overtimePayAtNormal: round2(overtimePayAtNormal),
    baseWeeklySalary: round2(weeklySalary),
    total: round2(total),
  };
}

export function calculateMonthlySalary(
  weeklySalary: number,
  weeks: WeekSalaryInput[]
): { weeks: WeekSalaryBreakdown[]; total: number } {
  const breakdowns = weeks.map((w) => calculateWeeklySalary(weeklySalary, w));
  const total = round2(breakdowns.reduce((s, w) => s + w.total, 0));
  return { weeks: breakdowns, total };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
