import { Prisma, type Transaction as PrismaTransaction } from "@prisma/client";
import { z, ZodError } from "zod";

import { parseJsonBody } from "@/app/lib/api/request-json";
import { failure, success } from "@/app/lib/api-response";
import { getAuthenticatedUserId } from "@/app/lib/auth";
import { isUnauthorizedError } from "@/app/lib/auth/auth-errors";
import { prisma } from "@/app/lib/prisma";

const linkSchema = z.object({
  payrollDocumentId: z.string().uuid(),
  transactionId: z.string().uuid(),
});

function nextMonth(year: number, month: number) {
  return month === 12
    ? { year: year + 1, month: 1 }
    : { year, month: month + 1 };
}

function inPaymentWindow(
  value: Pick<PrismaTransaction, "year" | "month" | "day">,
  competence: { year: number; month: number },
) {
  if (value.year === competence.year && value.month === competence.month) {
    return true;
  }
  const next = nextMonth(competence.year, competence.month);
  return (
    value.year === next.year &&
    value.month === next.month &&
    value.day <= 10
  );
}

function candidateWindow(year: number, month: number) {
  const next = nextMonth(year, month);
  return [
    { year, month },
    { year: next.year, month: next.month, day: { lte: 10 } },
  ];
}

function dateLabel(value: { year: number; month: number; day: number }) {
  return [
    String(value.year).padStart(4, "0"),
    String(value.month).padStart(2, "0"),
    String(value.day).padStart(2, "0"),
  ].join("-");
}

type PayrollCreditCandidate = {
  kind: string;
  type: string;
  status: string;
  account: {
    type: string;
    currency: string;
  };
};

function isEligiblePayrollCredit(transaction: PayrollCreditCandidate) {
  return (
    transaction.kind === "NORMAL" &&
    transaction.type === "INCOME" &&
    transaction.status === "COMPLETED" &&
    transaction.account.type === "CREDIT_DEBIT" &&
    transaction.account.currency === "BRL"
  );
}

function transactionSummary(transaction: {
  id: string;
  amount: number;
  type: string;
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
    status: transaction.status,
    description: transaction.description,
    date: dateLabel(transaction),
    reconciliationStatus: transaction.reconciliationStatus,
    account: {
      id: transaction.account.id,
      name: transaction.account.name,
      currency: transaction.account.currency,
    },
  };
}

export async function getPayrollTransactionReconciliationForUser(
  userId: string,
) {
  const documents = await prisma.payrollDocument.findMany({
    where: { userId, lifecycleStatus: "ACTIVE" },
    include: {
      transactionLink: {
        include: {
          transaction: {
            include: {
              account: {
                select: { id: true, name: true, type: true, currency: true },
              },
            },
          },
        },
      },
    },
    orderBy: [
      { year: "desc" },
      { month: "desc" },
      { createdAt: "desc" },
      { id: "desc" },
    ],
  });

  return Promise.all(
    documents.map(async (document) => {
      if (document.netPaidCents === null) {
        return {
          documentId: document.id,
          documentType: document.documentType,
          paymentType: document.paymentType,
          employerName: document.employerName,
          employerCnpj: document.employerCnpj,
          year: document.year,
          month: document.month,
          netPaidCents: null,
          status: "REVIEW_REQUIRED" as const,
          reason:
            "O documento não possui valor líquido informado para conciliar com uma transação.",
          matchedTransaction: null,
          candidates: [],
        };
      }

      if (document.transactionLink) {
        const transaction = document.transactionLink.transaction;
        const valid =
          transaction.userId === userId &&
          isEligiblePayrollCredit(transaction) &&
          transaction.amount === document.netPaidCents &&
          inPaymentWindow(transaction, {
            year: document.year,
            month: document.month,
          });

        return {
          documentId: document.id,
          documentType: document.documentType,
          paymentType: document.paymentType,
          employerName: document.employerName,
          employerCnpj: document.employerCnpj,
          year: document.year,
          month: document.month,
          netPaidCents: document.netPaidCents,
          status: valid ? ("MATCHED" as const) : ("REVIEW_REQUIRED" as const),
          reason: valid
            ? null
            : "A transação vinculada mudou e não corresponde mais ao pagamento líquido/competência.",
          matchedTransaction: transactionSummary(transaction),
          candidates: [],
        };
      }

      const candidates = await prisma.transaction.findMany({
        where: {
          userId,
          kind: "NORMAL",
          type: "INCOME",
          status: "COMPLETED",
          amount: document.netPaidCents,
          account: {
            type: "CREDIT_DEBIT",
            currency: "BRL",
          },
          payrollTransactionLink: null,
          OR: candidateWindow(document.year, document.month),
        },
        include: {
          account: {
            select: { id: true, name: true, type: true, currency: true },
          },
        },
        orderBy: [
          { year: "asc" },
          { month: "asc" },
          { day: "asc" },
          { createdAt: "asc" },
          { id: "asc" },
        ],
      });

      return {
        documentId: document.id,
        documentType: document.documentType,
        paymentType: document.paymentType,
        employerName: document.employerName,
        employerCnpj: document.employerCnpj,
        year: document.year,
        month: document.month,
        netPaidCents: document.netPaidCents,
        status:
          candidates.length === 1
            ? ("SUGGESTED" as const)
            : candidates.length > 1
              ? ("REVIEW_REQUIRED" as const)
              : ("UNMATCHED" as const),
        reason:
          candidates.length > 1
            ? "Mais de um crédito com o mesmo valor foi encontrado na janela da competência."
            : candidates.length === 0
              ? "Nenhum crédito bancário com o mesmo valor foi encontrado na janela da competência."
              : null,
        matchedTransaction: null,
        candidates: candidates.map(transactionSummary),
      };
    }),
  );
}

export async function getPayrollTransactionReconciliation() {
  try {
    const userId = await getAuthenticatedUserId();
    return success(await getPayrollTransactionReconciliationForUser(userId));
  } catch (error) {
    if (isUnauthorizedError(error)) return failure("Não autenticado", 401);
    return failure("Não foi possível carregar a conciliação bancária da folha", 500);
  }
}

export async function linkPayrollTransaction(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const input = linkSchema.parse(await parseJsonBody(request));

    const result = await prisma.$transaction(
      async (tx) => {
        const document = await tx.payrollDocument.findFirst({
          where: {
            id: input.payrollDocumentId,
            userId,
            lifecycleStatus: "ACTIVE",
          },
          select: {
            id: true,
            year: true,
            month: true,
            netPaidCents: true,
            transactionLink: {
              select: { id: true, transactionId: true },
            },
          },
        });
        if (!document) {
          return { error: failure("Documento de folha não encontrado", 404) };
        }
        if (document.netPaidCents === null) {
          return {
            error: failure(
              "Documento sem valor líquido não pode ser conciliado",
              409,
            ),
          };
        }

        if (document.transactionLink) {
          if (document.transactionLink.transactionId === input.transactionId) {
            return {
              data: {
                id: document.transactionLink.id,
                payrollDocumentId: document.id,
                transactionId: input.transactionId,
                matchedAmountCents: document.netPaidCents,
                created: false,
              },
            };
          }
          return {
            error: failure(
              "Este documento já está vinculado a outra transação",
              409,
            ),
          };
        }

        const transaction = await tx.transaction.findFirst({
          where: { id: input.transactionId, userId },
          select: {
            id: true,
            userId: true,
            amount: true,
            type: true,
            kind: true,
            status: true,
            year: true,
            month: true,
            day: true,
            account: {
              select: {
                type: true,
                currency: true,
              },
            },
            payrollTransactionLink: {
              select: { id: true, payrollDocumentId: true },
            },
          },
        });
        if (!transaction) {
          return { error: failure("Transação não encontrada", 404) };
        }
        if (transaction.payrollTransactionLink) {
          return {
            error: failure(
              "Esta transação já está vinculada a outro documento de folha",
              409,
            ),
          };
        }
        if (!isEligiblePayrollCredit(transaction)) {
          return {
            error: failure(
              "Somente créditos normais concluídos em conta de crédito/débito BRL podem ser vinculados à folha",
              409,
            ),
          };
        }
        if (transaction.amount !== document.netPaidCents) {
          return {
            error: failure(
              "O valor da transação diverge do líquido do documento",
              409,
            ),
          };
        }
        if (
          !inPaymentWindow(transaction, {
            year: document.year,
            month: document.month,
          })
        ) {
          return {
            error: failure(
              "A transação está fora da janela segura da competência",
              409,
            ),
          };
        }

        const created = await tx.payrollTransactionLink.create({
          data: {
            userId,
            payrollDocumentId: document.id,
            transactionId: transaction.id,
            matchedAmountCents: document.netPaidCents,
          },
        });

        return {
          data: {
            id: created.id,
            payrollDocumentId: created.payrollDocumentId,
            transactionId: created.transactionId,
            matchedAmountCents: created.matchedAmountCents,
            created: true,
          },
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    if ("error" in result) return result.error;
    return success(
      result.data,
      result.data.created ? "Pagamento vinculado ao crédito bancário" : "Vínculo já existente",
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
    return failure("Não foi possível vincular o pagamento", 500);
  }
}

export async function unlinkPayrollTransaction(
  _request: Request,
  context?: { params: Promise<{ documentId: string }> },
) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!context) return failure("Documento de folha não encontrado", 404);
    const { documentId } = await context.params;

    const removed = await prisma.payrollTransactionLink.deleteMany({
      where: {
        userId,
        payrollDocumentId: documentId,
        payrollDocument: { userId, lifecycleStatus: "ACTIVE" },
      },
    });

    return success(
      { removed: removed.count > 0 },
      removed.count > 0 ? "Vínculo removido" : "Nenhum vínculo ativo",
    );
  } catch (error) {
    if (isUnauthorizedError(error)) return failure("Não autenticado", 401);
    return failure("Não foi possível desfazer o vínculo", 500);
  }
}
