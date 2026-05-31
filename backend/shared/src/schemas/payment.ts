import { z } from "zod";

const paymentBodySchema = z.object({
  periodId: z.string().uuid(),
  invoiceNumber: z.string().optional().nullable(),
  amount: z.coerce.number().positive(),
  paymentDate: z.union([z.string().date(), z.string().datetime()]).optional(),
  employeeId: z.string().uuid().optional().nullable(),
  expenseId: z.string().uuid().optional().nullable(),
  isVendorCredit: z.boolean().optional().default(false),
  vendorName: z.string().optional().nullable(),
  rankReceived: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const createPaymentSchema = paymentBodySchema
  .refine((d) => !(d.employeeId && d.expenseId), {
    message: "لا يمكن ربط الدفعة بموظف وفاتورة معاً",
    path: ["expenseId"],
  })
  .refine((d) => !(d.employeeId && d.isVendorCredit), {
    message: "لا يمكن ربط دفع الذمم بموظف",
    path: ["isVendorCredit"],
  })
  .refine((d) => !(d.expenseId && d.isVendorCredit), {
    message: "دفع الذمم لا يُربط بفاتورة واحدة — استخدم المبلغ الإجمالي",
    path: ["isVendorCredit"],
  });

export const updatePaymentSchema = paymentBodySchema
  .omit({ periodId: true })
  .partial()
  .refine((d) => !(d.employeeId && d.expenseId), {
    message: "لا يمكن ربط الدفعة بموظف وفاتورة معاً",
    path: ["expenseId"],
  })
  .refine((d) => !(d.employeeId && d.isVendorCredit), {
    message: "لا يمكن ربط دفع الذمم بموظف",
    path: ["isVendorCredit"],
  })
  .refine((d) => !(d.expenseId && d.isVendorCredit), {
    message: "دفع الذمم لا يُربط بفاتورة واحدة",
    path: ["isVendorCredit"],
  });

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type UpdatePaymentInput = z.infer<typeof updatePaymentSchema>;
