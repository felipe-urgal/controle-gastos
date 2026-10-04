import { Prisma } from "@prisma/client";
import { z, ZodError } from "zod";

import { parseJsonBody } from "@/app/lib/api/request-json";
import { failure, success } from "@/app/lib/api-response";
import { getAuthenticatedUserId } from "@/app/lib/auth";
import { isUnauthorizedError } from "@/app/lib/auth/auth-errors";
import { prisma } from "@/app/lib/prisma";

const querySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
});

const linkSchema = z.object({
  paymentId: z.string().uuid(),
  transactionId: z.string().uuid(),
});

function dateLabel(value: { year: number; month: number; day: number }) {
  return [
    String(value.year).padStart(4, "0"),
    String(value.month).padStart(2, "0"),
    String(value.day).padStart(2, "0"),
  ].join("-");
}

function transactionSummary(transaction: {
  id: string;
  amount: number;
  type: string;
  kind: string;
  status: string;
  description: string;
  year: number;
  month: number;
  day: number;
  reconciliationStatus: string;
  account: { id: string; name: string; currency: string };
}) {
  return {
    id: transaction.id,
    amountCents: transaction.amount,
    type: transaction.type,
    kind: transaction.kind,
    status: transaction.status,
    description: transaction.description,
    date: dateLabel(transaction),
    reconciliationStatus: transaction.reconciliationStatus,
    account: transaction.account,
  };
}

function isEligibleTransaction(
  payment: {
    amountCents: number;
    currency: string;
    paidYear: number;
    paidMonth: number;
    paidDay: number;
  },
  transaction: {
    userId: string;
    amount: number;
    type: string;
    kind: string;
    status: string;
    year: number;
    month: number;
    day: number;
    account: { currency: string };
  },
  userId: string,
) {
  return (
    transaction.userId === userId &&
    transaction.type === "EXPENSE" &&
    transaction.kind === "NORMAL" &&
    transaction.status === "COMPLETED" &&
    transaction.amount === payment.amountCents &&
    transaction.account.currency === payment.currency &&
    transaction.year === payment.paidYear &&
    transaction.month === payment.paidMonth &&
    transaction.day === payment.paidDay
  );
}

export async function getInvestmentTaxPaymentReconciliationForUser(
  userId: string,
  year: number,
) {
  const payments = await prisma.investmentTaxPayment.findMany({
    where: { userId, competenceYear: year },
    include: {
      transaction: {
        include: {
          account: {
            select: { id: true, name: true, currency: true },
          },
        },
      },
    },
    orderBy: [
      { competenceMonth: "asc" },
      { paidYear: "asc" },
      { paidMonth: "asc" },
      { paidDay: "asc" },
      { createdAt: "asc" },
      { id: "asc" },
    ],
  });

  return Promise.all(
    payments.map(async (payment) => {
      const base = {
        paymentId: payment.id,
        assetType: payment.assetType,
        currency: payment.currency,
        amountCents: payment.amountCents,
        competenceYear: payment.competenceYear,
        competenceMonth: payment.competenceMonth,
        code: payment.code,
        paidDate: dateLabel({
          year: payment.paidYear,
          month: payment.paidMonth,
          day: payment.paidDay,
        }),
        note: payment.note,
        receiptReference: payment.receiptReference,
      };

      if (payment.transaction) {
        const valid = isEligibleTransaction(payment, payment.transaction, userId);
        return {
          ...base,
          status: valid ? ("MATCHED" as const) : ("REVIEW_REQUIRED" as const),
          reason: valid
            ? null
            : "A transação vinculada mudou e não corresponde mais ao valor, moeda ou data do DARF.",
          matchedTransaction: transactionSummary(payment.transaction),
          candidates: [],
        };
      }

      const candidates = await prisma.transaction.findMany({
        where: {
          userId,
          type: "EXPENSE",
          kind: "NORMAL",
          status: "COMPLETED",
          amount: payment.amountCents,
          year: payment.paidYear,
          month: payment.paidMonth,
          day: payment.paidDay,
          investmentTaxPayment: null,
          account: { currency: payment.currency },
        },
        include: {
          account: {
            select: { id: true, name: true, currency: true },
          },
        },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      });

      return {
        ...base,
        status:
          candidates.length === 1
            ? ("SUGGESTED" as const)
            : candidates.length > 1
              ? ("REVIEW_REQUIRED" as const)
              : ("UNMATCHED" as const),
        reason:
          candidates.length > 1
            ? "Mais de uma saída bancária com o mesmo valor, moeda e data foi encontrada."
            : candidates.length === 0
              ? "Nenhuma saída bancária compatível foi encontrada na data de pagamento."
              : null,
        matchedTransaction: null,
        candidates: candidates.map(transactionSummary),
      };
    }),
  );
}

export async function getInvestmentTaxPaymentReconciliation(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const url = new URL(request.url);
    const input = querySchema.parse({ year: url.searchParams.get("year") });
    return success(
      await getInvestmentTaxPaymentReconciliationForUser(userId, input.year),
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return failure(error.issues[0]?.message ?? "Ano inválido", 400);
    }
    if (isUnauthorizedError(error)) return failure("Não autenticado", 401);
    return failure("Não foi possível carregar a conciliação dos DARFs", 500);
  }
}

export async function linkInvestmentTaxPaymentTransaction(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const input = linkSchema.parse(await parseJsonBody(request));

    const result = await prisma.$transaction(
      async (tx) => {
        const payment = await tx.investmentTaxPayment.findFirst({
          where: { id: input.paymentId, userId },
          select: {
            id: true,
            amountCents: true,
            currency: true,
            paidYear: true,
            paidMonth: true,
            paidDay: true,
            transactionId: true,
          },
        });

        if (!payment) {
          return { error: failure("DARF não encontrado", 404) };
        }

        if (payment.transactionId) {
          if (payment.transactionId === input.transactionId) {
            return {
              data: {
                paymentId: payment.id,
                transactionId: input.transactionId,
                created: false,
              },
            };
          }
          return {
            error: failure("Este DARF já está vinculado a outra transação", 409),
          };
        }

        const transaction = await tx.transaction.findFirst({
          where: { id: input.transactionId, userId },
          include: {
            account: {
              select: { id: true, name: true, currency: true },
            },
            investmentTaxPayment: {
              select: { id: true },
            },
          },
        });

        if (!transaction) {
          return { error: failure("Transação não encontrada", 404) };
        }
        if (transaction.investmentTaxPayment) {
          return {
            error: failure(
              "Esta transação já está vinculada a outro DARF",
              409,
            ),
          };
        }
        if (!isEligibleTransaction(payment, transaction, userId)) {
          return {
            error: failure(
              "A transação não corresponde ao valor, moeda, data ou tipo exigidos pelo DARF",
              409,
            ),
          };
        }

        const updated = await tx.investmentTaxPayment.updateMany({
          where: {
            id: payment.id,
            userId,
            transactionId: null,
          },
          data: { transactionId: transaction.id },
        });

        if (updated.count !== 1) {
          return {
            error: failure(
              "O estado da conciliação mudou; recarregue e tente novamente",
              409,
            ),
          };
        }

        return {
          data: {
            paymentId: payment.id,
            transactionId: transaction.id,
            created: true,
          },
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    if ("error" in result) return result.error;
    return success(
      result.data,
      result.data.created
        ? "DARF vinculado à saída bancária"
        : "Vínculo já existente",
      result.data.created ? 201 : 200,
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return failure(error.issues[0]?.message ?? "Dados inválidos", 400);
    }
    if (isUnauthorizedError(error)) return failure("Não autenticado", 401);
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2002" || error.code === "P2034")
    ) {
      return failure(
        "O estado da conciliação mudou; recarregue e tente novamente",
        409,
      );
    }
    return failure("Não foi possível vincular o DARF", 500);
  }
}

export async function unlinkInvestmentTaxPaymentTransaction(
  _request: Request,
  context?: { params: Promise<{ paymentId: string }> },
) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!context) return failure("DARF não encontrado", 404);
    const { paymentId } = await context.params;

    const updated = await prisma.investmentTaxPayment.updateMany({
      where: { id: paymentId, userId, transactionId: { not: null } },
      data: { transactionId: null },
    });

    return success(
      { removed: updated.count > 0 },
      updated.count > 0 ? "Vínculo removido" : "Nenhum vínculo ativo",
    );
  } catch (error) {
    if (isUnauthorizedError(error)) return failure("Não autenticado", 401);
    return failure("Não foi possível desfazer o vínculo do DARF", 500);
  }
}
