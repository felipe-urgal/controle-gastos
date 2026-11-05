import { z } from "zod";

import { apiFailureFromError } from "@/app/lib/api/api-error-response";
import { parseJsonBody } from "@/app/lib/api/request-json";
import { success } from "@/app/lib/api-response";
import { getAuthenticatedUserId } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";

const currencySchema = z.enum(["BRL", "USD", "EUR"]);

const putTargetSchema = z.object({
  currency: currencySchema,
  amount: z
    .number()
    .int("O valor deve usar centavos inteiros")
    .positive("A meta deve ser maior que zero")
    .max(2_147_483_647, "O valor excede o limite suportado"),
});

const deleteTargetSchema = z.object({ currency: currencySchema });

export type NetWorthTargetDTO = { currency: "BRL" | "USD" | "EUR"; amount: number };

export async function listNetWorthTargets(userId: string): Promise<NetWorthTargetDTO[]> {
  const rows = await prisma.netWorthTarget.findMany({
    where: { userId },
    select: { currency: true, amount: true },
    orderBy: { currency: "asc" },
  });
  return rows as NetWorthTargetDTO[];
}

export async function getNetWorthTargets() {
  try {
    const userId = await getAuthenticatedUserId();
    return success(await listNetWorthTargets(userId));
  } catch (error) {
    return apiFailureFromError(error, { fallbackMessage: "Erro ao carregar as metas de patrimônio" });
  }
}

export async function putNetWorthTarget(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const input = putTargetSchema.parse(await parseJsonBody(request));
    await prisma.netWorthTarget.upsert({
      where: { userId_currency: { userId, currency: input.currency } },
      create: { userId, ...input },
      update: { amount: input.amount },
    });
    return success(input satisfies NetWorthTargetDTO, "Meta salva");
  } catch (error) {
    return apiFailureFromError(error, {
      fallbackMessage: "Erro ao salvar a meta de patrimônio",
      zodMessage: "Dados inválidos",
    });
  }
}

export async function deleteNetWorthTarget(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const { currency } = deleteTargetSchema.parse(await parseJsonBody(request));
    await prisma.netWorthTarget.deleteMany({ where: { userId, currency } });
    return success({ currency }, "Meta removida");
  } catch (error) {
    return apiFailureFromError(error, {
      fallbackMessage: "Erro ao remover a meta de patrimônio",
      zodMessage: "Dados inválidos",
    });
  }
}
