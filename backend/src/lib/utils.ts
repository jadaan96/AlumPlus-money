import { Decimal } from "@prisma/client/runtime/library";

export function toNumber(value: Decimal | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  return Number(value);
}

export function calcRemaining(
  total: number,
  received: number,
  provided?: number | null
): number {
  const computed = total - received;
  if (provided !== null && provided !== undefined) {
    const diff = Math.abs(provided - computed);
    if (diff > 0.01) {
      // allow manual override but prefer computed when close
    }
    return provided;
  }
  return computed;
}

export function periodLabel(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function parsePeriodFromFilename(filename: string): { year: number; month: number } | null {
  const match = filename.match(/(\d{4})[-_\s]?(\d{1,2})|شهر\s*(\d{1,2})/i);
  if (!match) return null;
  if (match[1] && match[2]) {
    return { year: parseInt(match[1], 10), month: parseInt(match[2], 10) };
  }
  if (match[3]) {
    const year = new Date().getFullYear();
    return { year, month: parseInt(match[3], 10) };
  }
  return null;
}
