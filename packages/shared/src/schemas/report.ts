import { z } from "zod";

export const financialReportQuerySchema = z.object({
  periodIds: z.string().optional(),
  all: z.string().optional(),
});

export type FinancialReportQuery = z.infer<typeof financialReportQuerySchema>;
