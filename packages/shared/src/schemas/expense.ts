import { z } from "zod";

export const createExpenseCategorySchema = z.object({
  label: z.string().min(1, "اسم الفئة مطلوب"),
});

const expenseCategoryRef = z.object({
  categoryKey: z.string().min(1).optional(),
  categoryId: z.string().uuid().optional(),
});

export const createExpenseSchema = expenseCategoryRef
  .extend({
    periodId: z.string().uuid(),
    amount: z.coerce.number().min(0),
    description: z.string().optional().nullable(),
    expenseDate: z.union([z.string().date(), z.string().datetime()]).optional(),
    onCredit: z.boolean().optional().default(false),
    vendorName: z.string().optional().nullable(),
    invoiceNumber: z.string().optional().nullable(),
  })
  .refine((d) => Boolean(d.categoryKey || d.categoryId), {
    message: "يجب تحديد الفئة",
    path: ["categoryId"],
  })
  .refine((d) => !d.onCredit || (d.vendorName && d.vendorName.trim().length > 0), {
    message: "اسم التاجر مطلوب للشراء بالذم",
    path: ["vendorName"],
  });

export const updateExpenseSchema = expenseCategoryRef
  .extend({
    amount: z.coerce.number().min(0).optional(),
    description: z.string().optional().nullable(),
    expenseDate: z.union([z.string().date(), z.string().datetime()]).optional(),
    onCredit: z.boolean().optional(),
    vendorName: z.string().optional().nullable(),
    invoiceNumber: z.string().optional().nullable(),
  })
  .partial()
  .refine(
    (d) =>
      d.categoryKey === undefined &&
      d.categoryId === undefined
        ? true
        : Boolean(d.categoryKey || d.categoryId),
    { message: "يجب تحديد الفئة", path: ["categoryId"] }
  );

export const expensePeriodQuerySchema = z.object({
  categoryId: z.string().uuid().optional(),
});

export type CreateExpenseCategoryInput = z.infer<typeof createExpenseCategorySchema>;
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;
