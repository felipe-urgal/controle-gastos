import type { Prisma } from "@prisma/client";
import { z } from "zod";

import {
  compareLogicalDates,
  parseIsoLogicalDate,
  type LogicalDate,
} from "@/app/lib/date/logical-date";

/** Janela máxima de um período (limpar/exportar). */
export const MAX_PERIOD_YEARS = 10;

const isoDate = z.string().refine((value) => parseIsoLogicalDate(value) !== null, "Data inválida");

export const periodRangeSchema = z
  .object({
    from: isoDate,
    to: isoDate,
    accountId: z.string().min(1).optional(),
  })
  .superRefine((value, ctx) => {
    const from = parseIsoLogicalDate(value.from);
    const to = parseIsoLogicalDate(value.to);
    if (!from || !to) return;
    if (compareLogicalDates(from, to) > 0) {
      ctx.addIssue({ code: "custom", message: "A data inicial deve ser anterior à final" });
    } else if (to.year - from.year > MAX_PERIOD_YEARS) {
      ctx.addIssue({ code: "custom", message: `O período deve ter no máximo ${MAX_PERIOD_YEARS} anos` });
    }
  });

export type PeriodRange = z.infer<typeof periodRangeSchema>;

/** Filtro inclusivo [from, to] sobre as colunas year/month/day. */
export function periodRangeWhere(range: Pick<PeriodRange, "from" | "to">): Prisma.TransactionWhereInput {
  const from = parseIsoLogicalDate(range.from) as LogicalDate;
  const to = parseIsoLogicalDate(range.to) as LogicalDate;

  return {
    AND: [
      {
        OR: [
          { year: { gt: from.year } },
          { year: from.year, month: { gt: from.month } },
          { year: from.year, month: from.month, day: { gte: from.day } },
        ],
      },
      {
        OR: [
          { year: { lt: to.year } },
          { year: to.year, month: { lt: to.month } },
          { year: to.year, month: to.month, day: { lte: to.day } },
        ],
      },
    ],
  };
}
