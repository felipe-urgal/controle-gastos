import { z } from 'zod';

import { SUPPORTED_CURRENCIES } from '@/app/types/financial-summary';

export const manualExchangeRateInputSchema = z.object({
  from: z.enum(SUPPORTED_CURRENCIES),
  to: z.enum(SUPPORTED_CURRENCIES),
  numerator: z.number().int().positive().max(1_000_000_000),
  denominator: z.number().int().positive().max(1_000_000_000),
  referenceDate: z.object({
    year: z.number().int().min(2000).max(2100),
    month: z.number().int().min(1).max(12),
    day: z.number().int().min(1).max(31),
  }),
});

export type ManualExchangeRateInput = z.infer<
  typeof manualExchangeRateInputSchema
>;

export const ptaxExchangeRateInputSchema = z.object({
  from: z.enum(SUPPORTED_CURRENCIES),
  to: z.enum(SUPPORTED_CURRENCIES),
  quoteSide: z.enum(['BUY', 'SELL']).default('SELL'),
  referenceDate: z.object({
    year: z.number().int().min(2000).max(2100),
    month: z.number().int().min(1).max(12),
    day: z.number().int().min(1).max(31),
  }),
});
