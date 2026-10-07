import { Prisma, type Transaction as PrismaTransaction } from "@prisma/client";
import { z, ZodError } from "zod";

import { parseJsonBody } from "@/app/lib/api/request-json";
import { failure, success } from "@/app/lib/api-response";
import { getAuthenticatedUserId } from "@/app/lib/auth";
import { isUnauthorizedError } from "@/app/lib/auth/auth-errors";
import { logicalDateParts } from "@/app/lib/payroll/payroll-date";
import {
  pageInfo,
  payrollSearchParams,
} from "@/app/lib/payroll/payroll-query";
import { prisma } from "@/app/lib/prisma";

const linkSchema = z.object({
  payrollDocumentId: z.string().uuid(),
  transactionId: z.string().uuid(),
});

const filterSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  status: z
    .enum(["MATCHED", "SUGGESTED", "UNMATCHED", "REVIEW_REQUIRED"])
    .optional(),
  employer: z.string().trim().max(160).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
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

function foldEvidence(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]/gi, "")
    .toUpperCase();
}

function bankEvidence(
  metadata: Prisma.JsonValue | null,
  accountName: string,
) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }

  const bank =
    typeof (metadata as Record<string, unknown>).bank === "string"
      ? String((metadata as Record<string, unknown>).bank)
      : "";
  const agency =
    typeof (metadata as Record<string, unknown>).agency === "string"
      ? String((metadata as Record<string, unknown>).agency)
      : "";
  const account =
    typeof (metadata as Record<string, unknown>).account === "string"
      ? String((metadata as Record<string, unknown>).account)
      : "";

  if (!bank && !agency && !account) return null;

  const normalizedBank = foldEvidence(bank);
  const normalizedAccountName = foldEvidence(accountName);
  const bankNameMatch =
    bank.length > 0
      ? normalizedAccountName.includes(normalizedBank) ||
        normalizedBank.includes(normalizedAccountName)
      : null;

  return {
    bankNameMatch,
    agencyMatch: null,
    accountMatch: null,
    score: bankNameMatch === true ? 1 : 0,
    explanation:
      bankNameMatch === true
        ? "O nome da conta cadastrada é compatível com o banco informado no holerite; evidência apenas auxiliar."
        : bank
          ? "O banco informado no holerite não foi confirmado pelo nome da conta cadastrada; o vínculo continua dependendo das invariantes financeiras e de confirmação explícita."
          : "Agência/conta do holerite não são comparáveis ao cadastro atual; metadado mantido apenas como contexto.",
  };
}

function transactionSummary(
  transaction: {
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
  },
  evidence: ReturnType<typeof bankEvidence> = null,
) {
  return {
    id: transaction.id,
    amountCents: transaction.amount,
    type: transaction.type,
    status: transaction.status,
    description: transaction.description,
    date: dateLabel(transaction),
    reconciliationStatus: transaction.reconciliationStatus,
    evidence,
    account: {
      id: transaction.account.id,
      name: transaction.account.name,
      currency: transaction.account.currency,
    },
  };
}

type PayrollTransactionReconciliationDb = Pick<
  Prisma.TransactionClient,
  "payrollDocument" | "transaction"
>;

export async function getPayrollTransactionReconciliationForUser(
  userId: string,
  filters: { year?: number; employer?: string } = {},
  db: PayrollTransactionReconciliationDb = prisma,
) {
  const documents = await db.payrollDocument.findMany({
    where: {
      userId,
      lifecycleStatus: "ACTIVE",
      ...(filters.year ? { year: filters.year } : {}),
      ...(filters.employer
        ? {
            OR: [
              { employerCnpj: { contains: filters.employer } },
              {
                employerName: {
                  contains: filters.employer,
                  mode: "insensitive",
                },
              },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      documentType: true,
      paymentType: true,
      employerName: true,
      employerCnpj: true,
      year: true,
      month: true,
      netPaidCents: true,
      bankMetadata: true,
      createdAt: true,
      transactionLink: {
        select: {
          transaction: {
            select: {
              id: true,
              userId: true,
              amount: true,
              type: true,
              kind: true,
              status: true,
              description: true,
              year: true,
              month: true,
              day: true,
              reconciliationStatus: true,
              account: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                  currency: true,
                },
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

  const unmatched = documents.filter(
    (document) =>
      document.netPaidCents !== null && document.transactionLink === null,
  );

  const searchClauses = new Map<string, {
    amount: number;
    OR: ReturnType<typeof candidateWindow>;
  }>();
  for (const document of unmatched) {
    const amount = document.netPaidCents;
    if (amount === null) continue;
    const key = [amount, document.year, document.month].join("|");
    if (!searchClauses.has(key)) {
      searchClauses.set(key, {
        amount,
        OR: candidateWindow(document.year, document.month),
      });
    }
  }

  const candidateTransactions =
    searchClauses.size === 0
      ? []
      : await db.transaction.findMany({
          where: {
            userId,
            kind: "NORMAL",
            type: "INCOME",
            status: "COMPLETED",
            account: {
              type: "CREDIT_DEBIT",
              currency: "BRL",
            },
            payrollTransactionLink: null,
            OR: [...searchClauses.values()],
          },
          select: {
            id: true,
            amount: true,
            type: true,
            status: true,
            description: true,
            year: true,
            month: true,
            day: true,
            createdAt: true,
            reconciliationStatus: true,
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

  return documents.map((document) => {
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
        matchedTransaction: transactionSummary(
          transaction,
          bankEvidence(document.bankMetadata, transaction.account.name),
        ),
        candidates: [],
      };
    }

    const candidates = candidateTransactions
      .filter(
        (transaction) =>
          transaction.amount === document.netPaidCents &&
          inPaymentWindow(transaction, {
            year: document.year,
            month: document.month,
          }),
      )
      .map((transaction) => ({
        transaction,
        evidence: bankEvidence(
          document.bankMetadata,
          transaction.account.name,
        ),
      }))
      .sort((left, right) => {
        const score =
          (right.evidence?.score ?? 0) - (left.evidence?.score ?? 0);
        if (score !== 0) return score;
        const leftDate = [
          left.transaction.year,
          left.transaction.month,
          left.transaction.day,
          left.transaction.id,
        ].join("-");
        const rightDate = [
          right.transaction.year,
          right.transaction.month,
          right.transaction.day,
          right.transaction.id,
        ].join("-");
        return leftDate.localeCompare(rightDate);
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
          ? "Mais de um crédito financeiramente compatível foi encontrado; metadados bancários podem apenas ordenar os candidatos, nunca confirmar automaticamente."
          : candidates.length === 0
            ? "Nenhum crédito bancário financeiramente compatível foi encontrado na janela da competência."
            : candidates[0]?.evidence?.explanation ?? null,
      matchedTransaction: null,
      candidates: candidates.map(({ transaction, evidence }) =>
        transactionSummary(transaction, evidence),
      ),
    };
  });
}

export async function getPayrollTransactionReconciliation(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const query = filterSchema.parse(payrollSearchParams(request));
    const selectedYear = query.year ?? logicalDateParts().year;
    const items = await getPayrollTransactionReconciliationForUser(userId, {
      year: selectedYear,
      employer: query.employer,
    });
    const filtered = query.status
      ? items.filter((item) => item.status === query.status)
      : items;
    const start = (query.page - 1) * query.limit;
    const pageItems = filtered.slice(start, start + query.limit);

    return success({
      items: pageItems,
      pageInfo: pageInfo({
        page: query.page,
        limit: query.limit,
        fetched:
          filtered.length > start + query.limit
            ? query.limit + 1
            : pageItems.length,
      }),
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return failure(error.issues[0]?.message ?? "Filtros inválidos", 400);
    }
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
