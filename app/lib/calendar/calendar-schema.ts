import { z } from 'zod';

export const calendarQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
  accountId: z.string().uuid().optional(),
});

export type CalendarQueryInput = z.infer<typeof calendarQuerySchema>;
