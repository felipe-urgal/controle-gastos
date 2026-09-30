import { ZodError } from "zod";

import { parseJsonBody } from "@/app/lib/api/request-json";
import { failure, success } from "@/app/lib/api-response";
import { getAuthenticatedUserId } from "@/app/lib/auth";
import { isUnauthorizedError } from "@/app/lib/auth/auth-errors";
import {
  adjustDebtSchema,
  createDebtSchema,
  updateDebtSchema,
} from "@/app/lib/debts/debt-schema";
import { HttpError, isHttpError } from "@/app/lib/http-error";
import { prisma } from "@/app/lib/prisma";

function dueDateParts(value: string | null | undefined) {
  if (value === undefined) return {};
  if (value === null) {
    return { dueYear: null, dueMonth: null, dueDay: null };
  }
  const [dueYear, dueMonth, dueDay] = value.split("-").map(Number);
  return { dueYear, dueMonth, dueDay };
}

function dueDateFromParts(debt: {
  dueYear: number | null;
  dueMonth: number | null;
  dueDay: number | null;
}) {
  if (debt.dueYear === null || debt.dueMonth === null || debt.dueDay === null) {
    return null;
  }
  return `${String(debt.dueYear).padStart(4, "0")}-${String(debt.dueMonth).padStart(2, "0")}-${String(debt.dueDay).padStart(2, "0")}`;
}

async function findOwnedDebt(userId: string, id: string) {
  return prisma.debt.findFirst({
    where: { id, userId },
    include: {
      _count: { select: { adjustments: true } },
      adjustments: {
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 50,
        select: {
          id: true,
          previousBalance: true,
          newBalance: true,
          delta: true,
          description: true,
          createdAt: true,
        },
      },
    },
  });
}

function toDebtResult(debt: NonNullable<Awaited<ReturnType<typeof findOwnedDebt>>>) {
  return {
    id: debt.id,
    name: debt.name,
    currency: debt.currency,
    balance: debt.balance,
    installmentAmount: debt.installmentAmount,
    dueDate: dueDateFromParts(debt),
    remainingInstallments: debt.remainingInstallments,
    institution: debt.institution,
    description: debt.description,
    status: debt.status,
    adjustmentCount: debt._count.adjustments,
    adjustments: debt.adjustments,
    createdAt: debt.createdAt,
    updatedAt: debt.updatedAt,
  };
}

export async function listDebtsForUser(userId: string) {
  const items = await prisma.debt.findMany({
    where: { userId },
    include: {
      _count: { select: { adjustments: true } },
      adjustments: {
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 1,
        select: {
          id: true,
          previousBalance: true,
          newBalance: true,
          delta: true,
          description: true,
          createdAt: true,
        },
      },
    },
    orderBy: [
      { status: "asc" },
      { currency: "asc" },
      { updatedAt: "desc" },
      { id: "asc" },
    ],
  });
  return items.map(toDebtResult);
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
    const date = dueDateParts(input.dueDate);

    const id = await prisma.$transaction(async (tx) => {
      const debt = await tx.debt.create({
        data: {
          userId,
          name: input.name,
          currency: input.currency,
          balance: input.balance,
          installmentAmount: input.installmentAmount ?? null,
          remainingInstallments: input.remainingInstallments ?? null,
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
          description: "Saldo inicial",
        },
      });
      return debt.id;
    });

    const created = await findOwnedDebt(userId, id);
    if (!created) return failure("Dívida não encontrada", 404);
    return success(toDebtResult(created), "Dívida criada com sucesso", 201);
  } catch (error) {
    return handleDebtError(error, "Erro ao criar dívida");
  }
}

export async function getDebt(
  _request: Request,
  context?: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!context) return failure("Dívida não encontrada", 404);
    const { id } = await context.params;
    const debt = await findOwnedDebt(userId, id);
    if (!debt) return failure("Dívida não encontrada", 404);
    return success(toDebtResult(debt));
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
    const existing = await findOwnedDebt(userId, id);
    if (!existing) return failure("Dívida não encontrada", 404);

    if (input.status === "ARCHIVED" && existing.balance !== 0) {
      throw new HttpError(
        "Quite a dívida antes de arquivá-la",
        409,
        "DEBT_ARCHIVE_WITH_BALANCE",
      );
    }

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
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...dueDateParts(input.dueDate),
      },
      include: {
        _count: { select: { adjustments: true } },
        adjustments: {
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: 50,
        },
      },
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
          description: input.description || null,
        },
      });
    });

    const updated = await findOwnedDebt(userId, existing.id);
    if (!updated) return failure("Dívida não encontrada", 404);
    return success(toDebtResult(updated), "Saldo devedor ajustado com sucesso");
  } catch (error) {
    return handleDebtError(error, "Erro ao ajustar saldo devedor");
  }
}

export async function payDebt(
  _request: Request,
  context?: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!context) return failure("Dívida não encontrada", 404);
    const { id } = await context.params;
    const existing = await prisma.debt.findFirst({
      where: { id, userId },
      select: { id: true, balance: true, status: true },
    });
    if (!existing) return failure("Dívida não encontrada", 404);
    if (existing.status === "ARCHIVED") {
      throw new HttpError("Dívida arquivada", 409, "DEBT_ARCHIVED");
    }

    await prisma.$transaction(async (tx) => {
      const changed = await tx.debt.updateMany({
        where: {
          id: existing.id,
          userId,
          balance: existing.balance,
          status: { not: "ARCHIVED" },
        },
        data: { balance: 0, status: "PAID" },
      });
      if (changed.count !== 1) {
        throw new HttpError(
          "O saldo foi alterado por outra operação. Recarregue e tente novamente",
          409,
          "DEBT_STALE_BALANCE",
        );
      }

      if (existing.balance !== 0) {
        await tx.debtAdjustment.create({
          data: {
            userId,
            debtId: existing.id,
            previousBalance: existing.balance,
            newBalance: 0,
            delta: -existing.balance,
            description: "Quitação",
          },
        });
      }
    });

    const updated = await findOwnedDebt(userId, existing.id);
    if (!updated) return failure("Dívida não encontrada", 404);
    return success(toDebtResult(updated), "Dívida marcada como quitada");
  } catch (error) {
    return handleDebtError(error, "Erro ao quitar dívida");
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
