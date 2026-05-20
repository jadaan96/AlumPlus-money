export const WORKSHOP_STATUSES = [
  "COLLECTING",
  "COMPLETED",
  "OVERDUE",
  "CANCELLED",
] as const;

export type WorkshopStatus = (typeof WORKSHOP_STATUSES)[number];

export const WORKSHOP_STATUS_LABELS: Record<WorkshopStatus, string> = {
  COLLECTING: "قيد التحصيل",
  COMPLETED: "مكتمل",
  OVERDUE: "متأخر",
  CANCELLED: "ملغي",
};

export const EXPENSE_CATEGORY_KEYS = [
  "abajurat",
  "accessories",
  "fuel",
  "glass",
  "misc",
] as const;

export type ExpenseCategoryKey = (typeof EXPENSE_CATEGORY_KEYS)[number];

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategoryKey, string> = {
  abajurat: "اباجورات",
  accessories: "اكسسوارات",
  fuel: "بنزين",
  glass: "الزجاج",
  misc: "متفرقات",
};
