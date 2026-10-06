import { Prisma } from "@prisma/client";
import { ZodError } from "zod";

import { parseJsonBody } from "@/app/lib/api/request-json";
import { failure, success } from "@/app/lib/api-response";
import { getAuthenticatedUserId } from "@/app/lib/auth";
import { isUnauthorizedError } from "@/app/lib/auth/auth-errors";
import {
  adjustDebtSchema,
  createDebtSchema,
  recordDebtPaymentSchema,
  updateDebtSchema,
} from "@/app/lib/debts/debt-schema";
import {
  formatIsoLogicalDate,
  getLastDayOfMonth,
  logicalDateFromUtcInstant,
  parseIsoLogicalDate,
  type LogicalDate,
} from "@/app/lib/date/logical-date";
import { HttpError, isHttpError } from "@/app/lib/http-error";
import {
  assertIdempotencyPayload,
  hashIdempotencyKey,
  hashIdempotencyPayload,
  requireIdempotencyKey,
} from "@/app/lib/idempotency";
import { prisma } from "@/app/lib/prisma";

const MAX_SERIALIZABLE_ATTEMPTS = 3;
const HISTORY_PAGE_SIZE = 20;
const HISTORY_MAX_PAGE_SIZE = 50;

const debtSummaryInclude = {
  _count: { select: { adjustments: true } },
} satisfies Prisma.DebtInclude;

type DebtSummary = Prisma.DebtGetPayload<{
  include: typeof debtSummaryInclude;
}>;

const adjustmentSelect = {
  id: true,
  previousBalance: true,
  newBalance: true,
  delta: true,
  kind: true,
  description: true,
  effectiveYear: true,
  effectiveMonth: true,
  effectiveDay: true,
  transactionId: true,
  transaction: {
    select: {
      id: true,
      amount: true,
      description: true,
      year: true,
      month: true,
      day: true,
      account: {
        select: {
          id: true,
          name: true,
          currency: true,
        },
      },
    },
  },
  createdAt: true,
} satisfies Prisma.DebtAdjustmentSelect;

type DebtAdjustmentRecord = Prisma.DebtAdjustmentGetPayload<{
  select: typeof adjustmentSelect;
}>;

function dueDateParts(value: string | null | undefined) {
  if (value === undefined) return {};
  if (value === null) {
    return { dueYear: null, dueMonth: null, dueDay: null };
  }
  const parsed = parseIsoLogicalDate(value);
  if (!parsed) throw new HttpError("Data de vencimento inválida", 400);
  return {
    dueYear: parsed.year,
    dueMonth: parsed.month,
    dueDay: parsed.day,
  };
}

function dueDateFromParts(debt: {
  dueYear: number | null;
  dueMonth: number | null;
  dueDay: number | null;
}) {
  if (debt.dueYear === null || debt.dueMonth === null || debt.dueDay === null) {
    return null;
  }
  return formatIsoLogicalDate({
    year: debt.dueYear,
    month: debt.dueMonth,
    day: debt.dueDay,
  });
}

function effectiveDateParts(value?: string) {
  const parsed = value
    ? parseIsoLogicalDate(value)
    : logicalDateFromUtcInstant(new Date());
  if (!parsed) throw new HttpError("Data efetiva inválida", 400);
  return {
    effectiveYear: parsed.year,
    effectiveMonth: parsed.month,
    effectiveDay: parsed.day,
  };
}

function effectiveDateFromParts(adjustment: {
  effectiveYear: number | null;
  effectiveMonth: number | null;
  effectiveDay: number | null;
}) {
  if (
    adjustment.effectiveYear === null ||
    adjustment.effectiveMonth === null ||
    adjustment.effectiveDay === null
  ) {
    return null;
  }
  return formatIsoLogicalDate({
    year: adjustment.effectiveYear,
    month: adjustment.effectiveMonth,
    day: adjustment.effectiveDay,
  });
}

function hasAnyScheduleField(input: {
  installmentAmount: number | null;
  dueDate: string | null;
  remainingInstallments: number | null;
}) {
  return (
    input.installmentAmount !== null ||
    input.dueDate !== null ||
    input.remainingInstallments !== null
  );
}

function assertScheduleConsistency(input: {
  installmentAmount: number | null;
  dueDate: string | null;
  remainingInstallments: number | null;
}) {
  const values = [
    input.installmentAmount,
    input.dueDate,
    input.remainingInstallments,
  ];
  const present = values.filter((value) => value !== null).length;

  if (present !== 0 && present !== values.length) {
    throw new HttpError(
      "Para usar parcelas, informe valor da parcela, próximo vencimento e parcelas restantes; caso contrário deixe os três campos vazios",
      400,
      "DEBT_SCHEDULE_INCOMPLETE",
    );
  }
}

function nextMonthlyDueDate(current: LogicalDate) {
  const rawMonth = current.month + 1;
  const year = current.year + Math.floor((rawMonth - 1) / 12);
  const month = ((rawMonth - 1) % 12) + 1;
  return {
    year,
    month,
    day: Math.min(current.day, getLastDayOfMonth(year, month)),
  };
}

async function findOwnedDebtSummary(userId: string, id: string) {
  return prisma.debt.findFirst({
    where: { id, userId },
    include: debtSummaryInclude,
  });
}

function toAdjustmentResult(adjustment: DebtAdjustmentRecord) {
  return {
    id: adjustment.id,
    previousBalance: adjustment.previousBalance,
    newBalance: adjustment.newBalance,
    delta: adjustment.delta,
    kind: adjustment.kind,
    description: adjustment.description,
    effectiveDate: effectiveDateFromParts(adjustment),
    transactionId: adjustment.transactionId,
    transaction: adjustment.transaction,
    createdAt: adjustment.createdAt,
  };
}

function toDebtResult(
  debt: DebtSummary,
  options?: {
    adjustments?: DebtAdjustmentRecord[];
    adjustmentHistory?: {
      page: number;
      limit: number;
      total: number;
      hasMore: boolean;
    };
  },
) {
  const scheduleActive = debt.status === "ACTIVE";

  return {
    id: debt.id,
    name: debt.name,
    currency: debt.currency,
    balance: debt.balance,
    installmentAmount: scheduleActive ? debt.installmentAmount : null,
    dueDate: scheduleActive ? dueDateFromParts(debt) : null,
    remainingInstallments: scheduleActive ? debt.remainingInstallments : null,
    institution: debt.institution,
    description: debt.description,
    status: debt.status,
    adjustmentCount: debt._count.adjustments,
    adjustments: options?.adjustments?.map(toAdjustmentResult),
    adjustmentHistory: options?.adjustmentHistory,
    createdAt: debt.createdAt,
    updatedAt: debt.updatedAt,
  };
}

function historyPage(request: Request) {
  const url = new URL(request.url);
  const page = Number(url.searchParams.get("page") ?? "1");
  const limit = Number(url.searchParams.get("limit") ?? String(HISTORY_PAGE_SIZE));

  if (
    !Number.isInteger(page) ||
    page < 1 ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > HISTORY_MAX_PAGE_SIZE
  ) {
    throw new HttpError("Paginação de histórico inválida", 400, "INVALID_QUERY");
  }

  return { page, limit };
}

export async function listDebtsForUser(userId: string) {
  const items = await prisma.debt.findMany({
    where: { userId },
    include: debtSummaryInclude,
    orderBy: [
      { status: "asc" },
      { currency: "asc" },
      { updatedAt: "desc" },
      { id: "asc" },
    ],
  });
  return items.map((item) => toDebtResult(item));
}

export async function getDebts() {
  try {
    const userId = await getAuthenticatedUserId();
    const items = await listDebtsForUser(userId);
    return success({ items, total: items.length });
  } catch (error) {
    return handleDebtError(error, "Erro ao carregar dívidas");
  }
}

export async function createDebt(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const input = createDebtSchema.parse(await parseJsonBody(request));
    const schedule = {
      installmentAmount: input.installmentAmount ?? null,
      dueDate: input.dueDate ?? null,
      remainingInstallments: input.remainingInstallments ?? null,
    };
    assertScheduleConsistency(schedule);
    const date = dueDateParts(schedule.dueDate);
    const effectiveDate = effectiveDateParts();

    const id = await prisma.$transaction(async (tx) => {
      const debt = await tx.debt.create({
        data: {
          userId,
          name: input.name,
          currency: input.currency,
          balance: input.balance,
          installmentAmount: schedule.installmentAmount,
          remainingInstallments: schedule.remainingInstallments,
          institution: input.institution || null,
          description: input.description || null,
          ...date,
        },
        select: { id: true },
      });

      await tx.debtAdjustment.create({
        data: {
          userId,
          debtId: debt.id,
          previousBalance: 0,
          newBalance: input.balance,
          delta: input.balance,
          kind: "INITIAL_BALANCE",
          description: "Saldo inicial",
          ...effectiveDate,
        },
      });
      return debt.id;
    });

    const created = await findOwnedDebtSummary(userId, id);
    if (!created) return failure("Dívida não encontrada", 404);
    return success(toDebtResult(created), "Dívida criada com sucesso", 201);
  } catch (error) {
    return handleDebtError(error, "Erro ao criar dívida");
  }
}

export async function getDebt(
  request: Request,
  context?: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!context) return failure("Dívida não encontrada", 404);
    const { id } = await context.params;
    const { page, limit } = historyPage(request);

    const debt = await findOwnedDebtSummary(userId, id);
    if (!debt) return failure("Dívida não encontrada", 404);

    const adjustments = await prisma.debtAdjustment.findMany({
      where: { userId, debtId: debt.id },
      select: adjustmentSelect,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
    });

    return success(
      toDebtResult(debt, {
        adjustments,
        adjustmentHistory: {
          page,
          limit,
          total: debt._count.adjustments,
          hasMore: page * limit < debt._count.adjustments,
        },
      }),
    );
  } catch (error) {
    return handleDebtError(error, "Erro ao carregar dívida");
  }
}

export async function updateDebt(
  request: Request,
  context?: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!context) return failure("Dívida não encontrada", 404);
    const { id } = await context.params;
    const input = updateDebtSchema.parse(await parseJsonBody(request));
    const existing = await findOwnedDebtSummary(userId, id);
    if (!existing) return failure("Dívida não encontrada", 404);

    if (existing.status === "ARCHIVED" && input.status !== "ACTIVE") {
      throw new HttpError(
        "Restaure a dívida antes de alterá-la",
        409,
        "DEBT_ARCHIVED",
      );
    }

    if (input.status === "ARCHIVED" && existing.balance !== 0) {
      throw new HttpError(
        "Quite a dívida antes de arquivá-la",
        409,
        "DEBT_ARCHIVE_WITH_BALANCE",
      );
    }

    const scheduleChanged =
      input.installmentAmount !== undefined ||
      input.dueDate !== undefined ||
      input.remainingInstallments !== undefined;

    const mergedSchedule = {
      installmentAmount:
        input.installmentAmount !== undefined
          ? input.installmentAmount
          : existing.installmentAmount,
      dueDate:
        input.dueDate !== undefined ? input.dueDate : dueDateFromParts(existing),
      remainingInstallments:
        input.remainingInstallments !== undefined
          ? input.remainingInstallments
          : existing.remainingInstallments,
    };

    if (scheduleChanged) {
      assertScheduleConsistency(mergedSchedule);
      if (
        existing.status !== "ACTIVE" &&
        hasAnyScheduleField(mergedSchedule)
      ) {
        throw new HttpError(
          "Restaure a dívida com saldo positivo antes de configurar novas parcelas",
          409,
          "DEBT_SCHEDULE_INACTIVE",
        );
      }
    }

    const restoredStatus =
      input.status === "ACTIVE" && existing.status === "ARCHIVED"
        ? existing.balance > 0
          ? "ACTIVE"
          : "PAID"
        : input.status;

    const clearingSchedule = input.status === "ARCHIVED";

    const updated = await prisma.debt.update({
      where: { id: existing.id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.installmentAmount !== undefined
          ? { installmentAmount: input.installmentAmount }
          : {}),
        ...(input.remainingInstallments !== undefined
          ? { remainingInstallments: input.remainingInstallments }
          : {}),
        ...(input.institution !== undefined
          ? { institution: input.institution || null }
          : {}),
        ...(input.description !== undefined
          ? { description: input.description || null }
          : {}),
        ...(restoredStatus !== undefined ? { status: restoredStatus } : {}),
        ...dueDateParts(input.dueDate),
        ...(clearingSchedule
          ? {
              installmentAmount: null,
              remainingInstallments: null,
              dueYear: null,
              dueMonth: null,
              dueDay: null,
            }
          : {}),
      },
      include: debtSummaryInclude,
    });

    return success(toDebtResult(updated), "Dívida atualizada com sucesso");
  } catch (error) {
    return handleDebtError(error, "Erro ao atualizar dívida");
  }
}

export async function adjustDebt(
  request: Request,
  context?: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!context) return failure("Dívida não encontrada", 404);
    const { id } = await context.params;
    const input = adjustDebtSchema.parse(await parseJsonBody(request));

    const existing = await prisma.debt.findFirst({
      where: { id, userId },
      select: { id: true, balance: true, status: true },
    });
    if (!existing) return failure("Dívida não encontrada", 404);
    if (existing.status === "ARCHIVED") {
      throw new HttpError(
        "Dívidas arquivadas não podem receber ajustes",
        409,
        "DEBT_ARCHIVED",
      );
    }
    if (existing.balance === input.newBalance) {
      throw new HttpError(
        "O novo saldo deve ser diferente do saldo atual",
        400,
        "DEBT_BALANCE_UNCHANGED",
      );
    }

    const effectiveDate = effectiveDateParts(input.effectiveDate);

    await prisma.$transaction(async (tx) => {
      const changed = await tx.debt.updateMany({
        where: {
          id: existing.id,
          userId,
          balance: existing.balance,
          status: { not: "ARCHIVED" },
        },
        data: {
          balance: input.newBalance,
          status: input.newBalance === 0 ? "PAID" : "ACTIVE",
          ...(input.newBalance === 0
            ? {
                installmentAmount: null,
                remainingInstallments: null,
                dueYear: null,
                dueMonth: null,
                dueDay: null,
              }
            : {}),
        },
      });
      if (changed.count !== 1) {
        throw new HttpError(
          "O saldo foi alterado por outra operação. Recarregue e tente novamente",
          409,
          "DEBT_STALE_BALANCE",
        );
      }

      await tx.debtAdjustment.create({
        data: {
          userId,
          debtId: existing.id,
          previousBalance: existing.balance,
          newBalance: input.newBalance,
          delta: input.newBalance - existing.balance,
          kind: "MANUAL_ADJUSTMENT",
          description: input.description || null,
          ...effectiveDate,
        },
      });
    });

    const updated = await findOwnedDebtSummary(userId, existing.id);
    if (!updated) return failure("Dívida não encontrada", 404);
    return success(
      toDebtResult(updated),
      "Saldo devedor ajustado sem movimentar contas",
    );
  } catch (error) {
    return handleDebtError(error, "Erro ao ajustar saldo devedor");
  }
}

async function findIdempotentDebtPayment(
  userId: string,
  idempotencyKeyHash: string,
) {
  return prisma.debtAdjustment.findFirst({
    where: { userId, idempotencyKeyHash },
    select: {
      debtId: true,
      requestHash: true,
    },
  });
}

async function replayDebtPayment(
  userId: string,
  debtId: string,
  idempotencyKeyHash: string,
  requestHash: string,
) {
  const existing = await findIdempotentDebtPayment(userId, idempotencyKeyHash);
  if (!existing) return null;
  assertIdempotencyPayload(existing.requestHash, requestHash);
  if (existing.debtId !== debtId) {
    throw new HttpError(
      "Chave de idempotência já utilizada em outra dívida",
      409,
      "IDEMPOTENCY_PAYLOAD_CONFLICT",
    );
  }

  const debt = await findOwnedDebtSummary(userId, debtId);
  if (!debt) throw new HttpError("Dívida não encontrada", 404);
  return toDebtResult(debt);
}

async function registerDebtPaymentTransaction(
  userId: string,
  debtId: string,
  input: ReturnType<typeof recordDebtPaymentSchema.parse>,
  idempotencyKeyHash: string,
  requestHash: string,
) {
  return prisma.$transaction(
    async (tx) => {
      const replay = await tx.debtAdjustment.findFirst({
        where: { userId, idempotencyKeyHash },
        select: { debtId: true, requestHash: true },
      });
      if (replay) {
        assertIdempotencyPayload(replay.requestHash, requestHash);
        if (replay.debtId !== debtId) {
          throw new HttpError(
            "Chave de idempotência já utilizada em outra dívida",
            409,
            "IDEMPOTENCY_PAYLOAD_CONFLICT",
          );
        }
        return { replayed: true };
      }

      const debt = await tx.debt.findFirst({
        where: { id: debtId, userId },
        select: {
          id: true,
          currency: true,
          balance: true,
          status: true,
          installmentAmount: true,
          dueYear: true,
          dueMonth: true,
          dueDay: true,
          remainingInstallments: true,
        },
      });
      if (!debt) throw new HttpError("Dívida não encontrada", 404);
      if (debt.status === "ARCHIVED") {
        throw new HttpError("Dívida arquivada", 409, "DEBT_ARCHIVED");
      }
      if (debt.balance <= 0 || debt.status === "PAID") {
        throw new HttpError(
          "A dívida já está quitada",
          409,
          "DEBT_ALREADY_PAID",
        );
      }
      if (input.amount > debt.balance) {
        throw new HttpError(
          "O pagamento não pode exceder o saldo devedor",
          400,
          "DEBT_PAYMENT_EXCEEDS_BALANCE",
        );
      }

      if (input.transactionId) {
        const linkedTransaction = await tx.transaction.findFirst({
          where: {
            id: input.transactionId,
            userId,
            kind: "NORMAL",
            type: "EXPENSE",
            status: "COMPLETED",
          },
          select: {
            id: true,
            amount: true,
            account: { select: { currency: true } },
          },
        });
        if (
          !linkedTransaction ||
          linkedTransaction.amount !== input.amount ||
          linkedTransaction.account.currency !== debt.currency
        ) {
          throw new HttpError(
            "A movimentação vinculada deve ser uma despesa concluída, própria, da mesma moeda e do mesmo valor",
            400,
            "DEBT_PAYMENT_TRANSACTION_INVALID",
          );
        }
      }

      const completeSchedule =
        debt.installmentAmount !== null &&
        debt.dueYear !== null &&
        debt.dueMonth !== null &&
        debt.dueDay !== null &&
        debt.remainingInstallments !== null;

      if (
        completeSchedule &&
        debt.installmentAmount !== null &&
        input.amount < Math.min(debt.installmentAmount, debt.balance)
      ) {
        throw new HttpError(
          "Em dívida parcelada, o pagamento deve cobrir ao menos a parcela atual; use ajuste manual para correções de saldo",
          400,
          "DEBT_PAYMENT_BELOW_INSTALLMENT",
        );
      }

      if (
        completeSchedule &&
        debt.remainingInstallments === 1 &&
        input.amount !== debt.balance
      ) {
        throw new HttpError(
          "A última parcela deve quitar o saldo; ajuste o cronograma antes se houve renegociação",
          409,
          "DEBT_LAST_INSTALLMENT_MUST_SETTLE",
        );
      }

      const newBalance = debt.balance - input.amount;
      const paid = newBalance === 0;
      const scheduleUpdate: Prisma.DebtUpdateManyMutationInput = {};

      if (paid) {
        Object.assign(scheduleUpdate, {
          installmentAmount: null,
          remainingInstallments: null,
          dueYear: null,
          dueMonth: null,
          dueDay: null,
        });
      } else if (
        completeSchedule &&
        debt.dueYear !== null &&
        debt.dueMonth !== null &&
        debt.dueDay !== null &&
        debt.remainingInstallments !== null
      ) {
        const remainingInstallments = debt.remainingInstallments - 1;
        if (remainingInstallments < 1) {
          throw new HttpError(
            "O cronograma terminou antes do saldo; ajuste a dívida antes de registrar o pagamento",
            409,
            "DEBT_SCHEDULE_EXHAUSTED",
          );
        }
        const nextDue = nextMonthlyDueDate({
          year: debt.dueYear,
          month: debt.dueMonth,
          day: debt.dueDay,
        });
        Object.assign(scheduleUpdate, {
          remainingInstallments,
          dueYear: nextDue.year,
          dueMonth: nextDue.month,
          dueDay: nextDue.day,
        });
      }

      const changed = await tx.debt.updateMany({
        where: {
          id: debt.id,
          userId,
          balance: debt.balance,
          status: { not: "ARCHIVED" },
        },
        data: {
          balance: newBalance,
          status: paid ? "PAID" : "ACTIVE",
          ...scheduleUpdate,
        },
      });
      if (changed.count !== 1) {
        throw new HttpError(
          "A dívida mudou por outra operação. Recarregue e tente novamente",
          409,
          "DEBT_STALE_BALANCE",
        );
      }

      await tx.debtAdjustment.create({
        data: {
          userId,
          debtId: debt.id,
          previousBalance: debt.balance,
          newBalance,
          delta: -input.amount,
          kind: "PAYMENT",
          description:
            input.description || (paid ? "Quitação" : "Pagamento registrado"),
          ...effectiveDateParts(input.effectiveDate),
          idempotencyKeyHash,
          requestHash,
          transactionId: input.transactionId ?? null,
        },
      });

      return { replayed: false };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

export async function payDebt(
  request: Request,
  context?: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!context) return failure("Dívida não encontrada", 404);
    const { id } = await context.params;
    const input = recordDebtPaymentSchema.parse(await parseJsonBody(request));
    const key = requireIdempotencyKey(request);
    const idempotencyKeyHash = hashIdempotencyKey(key);
    const requestHash = hashIdempotencyPayload({
      debtId: id,
      amount: input.amount,
      description: input.description ?? null,
      effectiveDate: input.effectiveDate ?? null,
      transactionId: input.transactionId ?? null,
    });

    const previous = await replayDebtPayment(
      userId,
      id,
      idempotencyKeyHash,
      requestHash,
    );
    if (previous) {
      return success(previous, "Pagamento já registrado");
    }

    for (let attempt = 0; attempt < MAX_SERIALIZABLE_ATTEMPTS; attempt += 1) {
      try {
        const result = await registerDebtPaymentTransaction(
          userId,
          id,
          input,
          idempotencyKeyHash,
          requestHash,
        );
        const updated = await findOwnedDebtSummary(userId, id);
        if (!updated) return failure("Dívida não encontrada", 404);
        return success(
          toDebtResult(updated),
          result.replayed
            ? "Pagamento já registrado"
            : "Pagamento registrado sem criar movimentação financeira",
        );
      } catch (error) {
        const retryable =
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2034";
        if (retryable && attempt < MAX_SERIALIZABLE_ATTEMPTS - 1) {
          continue;
        }
        if (retryable) {
          throw new HttpError(
            "A dívida mudou durante o pagamento. Recarregue e tente novamente",
            409,
            "DEBT_CONCURRENT_CHANGE",
          );
        }
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          const replay = await replayDebtPayment(
            userId,
            id,
            idempotencyKeyHash,
            requestHash,
          );
          if (replay) {
            return success(replay, "Pagamento já registrado");
          }
          throw new HttpError(
            "A movimentação financeira já está vinculada a outro pagamento",
            409,
            "DEBT_PAYMENT_TRANSACTION_ALREADY_LINKED",
          );
        }
        throw error;
      }
    }

    throw new HttpError(
      "A dívida mudou durante o pagamento. Recarregue e tente novamente",
      409,
      "DEBT_CONCURRENT_CHANGE",
    );
  } catch (error) {
    return handleDebtError(error, "Erro ao registrar pagamento da dívida");
  }
}

export async function removeDebt(
  _request: Request,
  context?: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!context) return failure("Dívida não encontrada", 404);
    const { id } = await context.params;
    const debt = await prisma.debt.findFirst({
      where: { id, userId },
      select: {
        id: true,
        _count: { select: { adjustments: true } },
      },
    });
    if (!debt) return failure("Dívida não encontrada", 404);
    if (debt._count.adjustments > 1) {
      throw new HttpError(
        "Dívida com histórico de ajustes não pode ser excluída; quite e arquive para preservar a auditoria",
        409,
        "DEBT_HAS_HISTORY",
      );
    }

    await prisma.debt.delete({ where: { id: debt.id } });
    return success(null, "Dívida excluída com sucesso");
  } catch (error) {
    return handleDebtError(error, "Erro ao excluir dívida");
  }
}

function handleDebtError(error: unknown, fallback: string) {
  if (error instanceof ZodError) {
    return failure(error.issues[0]?.message ?? "Dados inválidos", 400);
  }
  if (isHttpError(error)) {
    return failure(error.message, error.status, error.code);
  }
  if (isUnauthorizedError(error)) {
    return failure("Não autenticado", 401);
  }
  return failure(fallback, 500);
}
