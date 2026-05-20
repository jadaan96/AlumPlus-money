import { z } from "zod";

export const createPaymentSchema = z.object({
  periodId: z.string().uuid(),
  invoiceNumber: z.string().optional().nullable(),
  amount: z.coerce.number().min(0),
  paymentDate: z.union([z.string().date(), z.string().datetime()]).optional(),
  employeeId: z.string().uuid().optional().nullable(),
  rankReceived: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const updatePaymentSchema = createPaymentSchema
  .omit({ periodId: true })
  .partial();

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type UpdatePaymentInput = z.infer<typeof updatePaymentSchema>;
