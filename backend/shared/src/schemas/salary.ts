import { z } from "zod";

export const weekDetailInputSchema = z.object({
  daysOff: z.coerce.number().min(0).default(0),
  overtimeHours: z.coerce.number().min(0).default(0),
});

export const upsertSalarySchema = z.object({
  periodId: z.string().uuid(),
  employeeId: z.string().uuid(),
  weeks: z.array(weekDetailInputSchema).min(1).max(4),
});

export type WeekDetailInput = z.infer<typeof weekDetailInputSchema>;
export type UpsertSalaryInput = z.infer<typeof upsertSalarySchema>;
