import { z } from "zod";

export const createEmployeeSchema = z.object({
  name: z.string().min(1, "اسم الموظف مطلوب"),
  active: z.boolean().default(true),
  weeklySalary: z.coerce.number().min(0, "الراتب الأسبوعي مطلوب").default(0),
});

export const updateEmployeeSchema = createEmployeeSchema.partial();

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
