import { z, ZodError } from "zod";

import { failure, success } from "@/app/lib/api-response";
import { getAuthenticatedUserId } from "@/app/lib/auth";
import { isUnauthorizedError } from "@/app/lib/auth/auth-errors";
import { runInvestmentIdempotentMutation } from "@/app/lib/investments/investment-idempotency";
import { isHttpError } from "@/app/lib/http-error";
import { prisma } from "@/app/lib/prisma";

const supportedCurrencies = ["BRL", "USD", "EUR"] as const;

const createSchema = z.object({
  eventType: z.enum(["INCOME", "SALE"]),
  eventId: z.string().uuid(),
  countryCode: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{2}$/)
    .transform((value) => value.toUpperCase()),
  currency: z.enum(supportedCurrencies),
  amountCents: z.number().int().positive().max(2_147_483_647),
  paidYear: z.number().int().min(2024).max(2100),
  paidMonth: z.number().int().min(1).max(12),
  paidDay: z.number().int().min(1).max(31),
  eligibilityBasis: z.enum(["TREATY", "RECIPROCITY"]),
  nonRefundableConfirmed: z.literal(true),
  note: z.string().trim().max(500).nullable().optional(),
});

function validDate(year: number, month: number, day: number) {
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function serialize(record: {
  id: string;
  countryCode: string;
  currency: string;
  amountCents: number;
  paidYear: number;
  paidMonth: number;
  paidDay: number;
  eligibilityBasis: "TREATY" | "RECIPROCITY";
  nonRefundableConfirmed: boolean;
  note: string | null;
  assetId: string;
  incomeId: string | null;
  fiscalEventId: string | null;
  createdAt: Date;
}) {
  return {
    id: record.id,
    countryCode: record.countryCode,
    currency: record.currency,
    amountCents: record.amountCents,
    paidYear: record.paidYear,
    paidMonth: record.paidMonth,
    paidDay: record.paidDay,
    eligibilityBasis: record.eligibilityBasis,
    nonRefundableConfirmed: record.nonRefundableConfirmed,
    note: record.note,
    assetId: record.assetId,
    incomeId: record.incomeId,
    fiscalEventId: record.fiscalEventId,
    eventType: record.incomeId ? ("INCOME" as const) : ("SALE" as const),
    eventId: record.incomeId ?? record.fiscalEventId!,
    createdAt: record.createdAt.toISOString(),
  };
}

export async function createForeignInvestmentTaxPaid(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const input = createSchema.parse(await request.json());

    if (!validDate(input.paidYear, input.paidMonth, input.paidDay)) {
      return failure("Data de pagamento inválida", 400);
    }

    const result = await runInvestmentIdempotentMutation({
      request,
      userId,
      scope: "INVESTMENT_FOREIGN_TAX_PAID_CREATE",
      payload: input,
      execute: async (tx) => {
        if (input.eventType === "INCOME") {
          const income = await tx.investmentIncome.findFirst({
            where: {
              id: input.eventId,
              userId,
              asset: { taxLocation: "ABROAD" },
            },
            include: {
              asset: { select: { id: true, symbol: true, taxLocation: true } },
            },
          });

          if (!income) {
            throw new Error("FOREIGN_INCOME_NOT_FOUND");
          }
          if (income.type !== "DIVIDEND" && income.type !== "INTEREST") {
            throw new Error("FOREIGN_INCOME_UNSUPPORTED");
          }
          if (income.year !== input.paidYear) {
            throw new Error("FOREIGN_TAX_YEAR_MISMATCH");
          }

          const created = await tx.investmentForeignTaxPaid.create({
            data: {
              userId,
              assetId: income.assetId,
              incomeId: income.id,
              countryCode: input.countryCode,
              currency: input.currency,
              amountCents: input.amountCents,
              paidYear: input.paidYear,
              paidMonth: input.paidMonth,
              paidDay: input.paidDay,
              eligibilityBasis: input.eligibilityBasis,
              nonRefundableConfirmed: true,
              note: input.note ?? null,
            },
          });
          return { resourceId: created.id, value: created };
        }

        const event = await tx.investmentFiscalEvent.findFirst({
          where: {
            id: input.eventId,
            userId,
            type: "SELL",
            asset: { taxLocation: "ABROAD" },
          },
          include: {
            asset: { select: { id: true, symbol: true, taxLocation: true } },
          },
        });

        if (!event) throw new Error("FOREIGN_SALE_NOT_FOUND");
        if (event.year !== input.paidYear) {
          throw new Error("FOREIGN_TAX_YEAR_MISMATCH");
        }

        const created = await tx.investmentForeignTaxPaid.create({
          data: {
            userId,
            assetId: event.assetId,
            fiscalEventId: event.id,
            countryCode: input.countryCode,
            currency: input.currency,
            amountCents: input.amountCents,
            paidYear: input.paidYear,
            paidMonth: input.paidMonth,
            paidDay: input.paidDay,
            eligibilityBasis: input.eligibilityBasis,
            nonRefundableConfirmed: true,
            note: input.note ?? null,
          },
        });
        return { resourceId: created.id, value: created };
      },
      replay: (tx, resourceId) =>
        tx.investmentForeignTaxPaid.findFirst({
          where: { id: resourceId, userId },
        }),
    });

    return success(
      serialize(result.value),
      result.replayed
        ? "Imposto pago no exterior já registrado"
        : "Imposto pago no exterior registrado",
      201,
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return failure(error.issues[0]?.message ?? "Dados inválidos", 400);
    }
    if (isUnauthorizedError(error)) return failure("Não autenticado", 401);
    if (isHttpError(error)) {
      return failure(error.message, error.status, error.code);
    }
    if (error instanceof Error) {
      if (error.message === "FOREIGN_INCOME_NOT_FOUND") {
        return failure("Rendimento no exterior não encontrado", 404);
      }
      if (error.message === "FOREIGN_INCOME_UNSUPPORTED") {
        return failure(
          "Somente dividendos ou juros classificados podem receber crédito de imposto exterior",
          409,
        );
      }
      if (error.message === "FOREIGN_SALE_NOT_FOUND") {
        return failure("Venda no exterior não encontrada", 404);
      }
      if (error.message === "FOREIGN_TAX_YEAR_MISMATCH") {
        return failure(
          "Nesta versão, o imposto pago deve pertencer ao mesmo ano-calendário do evento",
          409,
        );
      }
    }
    return failure("Não foi possível registrar o imposto pago no exterior", 500);
  }
}

export async function removeForeignInvestmentTaxPaid(
  _request: Request,
  context?: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!context) return failure("Registro não encontrado", 404);
    const { id } = await context.params;

    const deleted = await prisma.investmentForeignTaxPaid.deleteMany({
      where: { id, userId },
    });

    if (deleted.count === 0) {
      return failure("Registro não encontrado", 404);
    }

    return success(null, "Imposto pago no exterior removido");
  } catch (error) {
    if (isUnauthorizedError(error)) return failure("Não autenticado", 401);
    return failure("Não foi possível remover o imposto pago no exterior", 500);
  }
}
