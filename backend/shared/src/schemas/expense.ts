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
  })
  .refine((d) => Boolean(d.categoryKey || d.categoryId), {
    message: "يجب تحديد الفئة",
    path: ["categoryId"],
  });

export const updateExpenseSchema = expenseCategoryRef
  .extend({
    amount: z.coerce.number().min(0).optional(),
    description: z.string().optional().nullable(),
    expenseDate: z.union([z.string().date(), z.string().datetime()]).optional(),
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
