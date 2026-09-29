import { z } from 'zod';
export const transactionTemplateCreateSchema = z.object({
  name: z.string().trim().min(1, 'Informe um nome').max(80),
  type: z.enum(['INCOME', 'EXPENSE']),
  description: z.string().trim().max(255).default(''),
  amount: z.number().int().positive().nullable().optional(),
  status: z.enum(['COMPLETED', 'PENDING', 'CANCELLED']).default('COMPLETED'),
  isFavorite: z.boolean().default(false),
  position: z.number().int().min(0).max(10_000).default(0),
  accountId: z.string().uuid().nullable().optional(),
  categoryId: z.string().uuid().nullable().optional(),
});
export const transactionTemplateUpdateSchema = transactionTemplateCreateSchema.partial();
