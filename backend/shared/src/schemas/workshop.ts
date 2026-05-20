import { z } from "zod";
import { WORKSHOP_STATUSES } from "../constants";

const optionalDate = z
  .union([z.string().datetime(), z.string().date(), z.literal(""), z.null()])
  .optional()
  .transform((v) => (v === "" || v === null || v === undefined ? null : v));

export const workshopBaseSchema = z.object({
  name: z.string().min(1, "اسم الورشة مطلوب"),
  totalAmount: z.coerce.number().min(0).default(0),
  location: z.string().optional().nullable(),
  receivedAmount: z.coerce.number().min(0).default(0),
  remainingAmount: z.coerce.number().optional().nullable(),
  deliveryDate: optionalDate,
  receivedDate: optionalDate,
  status: z.enum(WORKSHOP_STATUSES).default("COLLECTING"),
  sectionType: z.string().optional().nullable(),
  source: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  link: z.string().optional().nullable(),
});

export const createWorkshopSchema = workshopBaseSchema.extend({
  periodId: z.string().uuid(),
});

export const updateWorkshopSchema = workshopBaseSchema.partial();

export const workshopQuerySchema = z.object({
  search: z.string().optional(),
  status: z.enum(WORKSHOP_STATUSES).optional(),
});

export type CreateWorkshopInput = z.infer<typeof createWorkshopSchema>;
export type UpdateWorkshopInput = z.infer<typeof updateWorkshopSchema>;
