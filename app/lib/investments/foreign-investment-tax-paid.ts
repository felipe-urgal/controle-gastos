import { z, ZodError } from "zod";

import { failure, success } from "@/app/lib/api-response";
import { getAuthenticatedUserId } from "@/app/lib/auth";
import { isUnauthorizedError } from "@/app/lib/auth/auth-errors";
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
  amountCents: z.number().int().positive(),
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

    if (input.eventType === "INCOME") {
      const income = await prisma.investmentIncome.findFirst({
        where: {
          id: input.eventId,
          userId,
          asset: { taxLocation: "ABROAD" },
        },
        include: {
          asset: { select: { id: true, symbol: true, taxLocation: true } },
        },
      });

      if (!income) return failure("Rendimento no exterior não encontrado", 404);
      if (income.type !== "DIVIDEND" && income.type !== "INTEREST") {
        return failure(
          "Somente dividendos ou juros classificados podem receber crédito de imposto exterior",
          409,
        );
      }
      if (income.year !== input.paidYear) {
        return failure(
          "Nesta versão, o imposto pago deve pertencer ao mesmo ano-calendário do rendimento",
          409,
        );
      }

      const created = await prisma.investmentForeignTaxPaid.create({
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

      return success(
        serialize(created),
        "Imposto pago no exterior registrado",
        201,
      );
    }

    const event = await prisma.investmentFiscalEvent.findFirst({
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

    if (!event) return failure("Venda no exterior não encontrada", 404);
    if (event.year !== input.paidYear) {
      return failure(
        "Nesta versão, o imposto pago deve pertencer ao mesmo ano-calendário da venda",
        409,
      );
    }

    const created = await prisma.investmentForeignTaxPaid.create({
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

    return success(
      serialize(created),
      "Imposto pago no exterior registrado",
      201,
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return failure(error.issues[0]?.message ?? "Dados inválidos", 400);
    }
    if (isUnauthorizedError(error)) return failure("Não autenticado", 401);
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
