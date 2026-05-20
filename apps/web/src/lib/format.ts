export function formatMoney(n: number): string {
  return new Intl.NumberFormat("ar-SY", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
}

export const MONTH_NAMES = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

export function formatPeriod(year: number, month: number): string {
  return `${MONTH_NAMES[month - 1]} ${year}`;
}
