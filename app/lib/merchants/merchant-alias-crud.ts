import type { Prisma } from "@prisma/client";
import { ZodError } from "zod";

import { failure, success } from "@/app/lib/api-response";
import { parseJsonBody } from "@/app/lib/api/request-json";
import { getAuthenticatedUserId } from "@/app/lib/auth";
import { isUnauthorizedError } from "@/app/lib/auth/auth-errors";
import { HttpError, isHttpError } from "@/app/lib/http-error";
import { toMerchantAliasDTO } from "@/app/lib/merchants/merchant-alias-dto";
import { normalizeMerchantAliasValue } from "@/app/lib/merchants/merchant-alias-matching";
import { createMerchantAliasSchema } from "@/app/lib/merchants/merchant-alias-schema";
import { prisma } from "@/app/lib/prisma";

type AliasInput = {
  merchantId: string;
  operator: "EQUALS" | "STARTS_WITH" | "CONTAINS";
  pattern: string;
  priority: number;
};

function normalizeAliasInput(input: AliasInput) {
  return {
    normalizedPattern: normalizeMerchantAliasValue(input.pattern),
    storedPattern: input.pattern.trim().replace(/\s+/g, " "),
  };
}

async function lockAliasIdentity(
  tx: Prisma.TransactionClient,
  userId: string,
  input: Pick<AliasInput, "operator">,
  normalizedPattern: string,
) {
  await tx.$executeRaw`
    SELECT pg_advisory_xact_lock(
      hashtext(${"merchant-alias:" + userId}),
      hashtext(${input.operator + ":" + normalizedPattern})
    )
  `;
}

async function assertOwnedActiveMerchant(
  tx: Prisma.TransactionClient,
  userId: string,
  merchantId: string,
) {
  const merchant = await tx.merchant.findFirst({
    where: { id: merchantId, userId, isActive: true },
    select: { id: true },
  });
  if (!merchant) {
    throw new HttpError(
      "Estabelecimento inválido ou inativo",
      400,
      "INVALID_MERCHANT",
    );
  }
}

const aliasInclude = {
  merchant: { select: { id: true, name: true, isActive: true } },
} as const;

export async function listMerchantAliases(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const url = new URL(request.url);
    const merchantId = url.searchParams.get("merchantId") ?? undefined;
    const aliases = await prisma.merchantAlias.findMany({
      where: { userId, ...(merchantId ? { merchantId } : {}) },
      include: aliasInclude,
      orderBy: [{ priority: "asc" }, { id: "asc" }],
    });
    return success({ items: aliases.map(toMerchantAliasDTO) });
  } catch (error) {
    if (isUnauthorizedError(error)) return failure("Não autorizado", 401);
    return failure("Não foi possível carregar aliases", 500);
  }
}

export async function createMerchantAlias(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const input = createMerchantAliasSchema.parse(
      await parseJsonBody(request),
    ) as AliasInput;
    const { normalizedPattern, storedPattern } = normalizeAliasInput(input);

    const alias = await prisma.$transaction(async (tx) => {
      await lockAliasIdentity(tx, userId, input, normalizedPattern);
      await assertOwnedActiveMerchant(tx, userId, input.merchantId);

      const duplicate = await tx.merchantAlias.findFirst({
        where: {
          userId,
          operator: input.operator,
          normalizedPattern,
        },
        select: {
          id: true,
          merchantId: true,
          merchant: { select: { name: true } },
        },
      });

      if (duplicate?.merchantId === input.merchantId) {
        throw new HttpError(
          "Alias equivalente já existe neste estabelecimento",
          409,
          "MERCHANT_ALIAS_EQUIVALENT",
        );
      }

      if (duplicate) {
        throw new HttpError(
          `Alias equivalente já pertence a "${duplicate.merchant.name}"`,
          409,
          "MERCHANT_ALIAS_OWNED_BY_OTHER_MERCHANT",
        );
      }

      return tx.merchantAlias.create({
        data: {
          userId,
          merchantId: input.merchantId,
          operator: input.operator,
          pattern: storedPattern,
          normalizedPattern,
          priority: input.priority,
        },
        include: aliasInclude,
      });
    });

    return success(toMerchantAliasDTO(alias), "Alias criado com sucesso", 201);
  } catch (error) {
    if (isUnauthorizedError(error)) return failure("Não autorizado", 401);
    if (error instanceof ZodError) {
      return failure(error.issues[0]?.message ?? "Dados inválidos", 400);
    }
    if (isHttpError(error)) {
      return failure(error.message, error.status, error.code);
    }
    return failure("Não foi possível criar o alias", 500);
  }
}

export async function reassignMerchantAlias(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const input = createMerchantAliasSchema.parse(
      await parseJsonBody(request),
    ) as AliasInput;
    const { normalizedPattern, storedPattern } = normalizeAliasInput(input);

    const result = await prisma.$transaction(async (tx) => {
      await lockAliasIdentity(tx, userId, input, normalizedPattern);
      await assertOwnedActiveMerchant(tx, userId, input.merchantId);

      const equivalents = await tx.merchantAlias.findMany({
        where: {
          userId,
          operator: input.operator,
          normalizedPattern,
        },
        include: aliasInclude,
        orderBy: { id: "asc" },
      });

      if (equivalents.length === 0) {
        const created = await tx.merchantAlias.create({
          data: {
            userId,
            merchantId: input.merchantId,
            operator: input.operator,
            pattern: storedPattern,
            normalizedPattern,
            priority: input.priority,
          },
          include: aliasInclude,
        });
        return { alias: created, reclassified: false, mergedCount: 0 };
      }

      const target =
        equivalents.find((alias) => alias.merchantId === input.merchantId) ??
        equivalents[0];
      const duplicateIds = equivalents
        .filter((alias) => alias.id !== target.id)
        .map((alias) => alias.id);

      if (duplicateIds.length > 0) {
        await tx.merchantAlias.deleteMany({
          where: { userId, id: { in: duplicateIds } },
        });
      }

      const alias = await tx.merchantAlias.update({
        where: { id: target.id },
        data: {
          merchantId: input.merchantId,
          pattern: storedPattern,
          priority: input.priority,
        },
        include: aliasInclude,
      });

      return {
        alias,
        reclassified: target.merchantId !== input.merchantId,
        mergedCount: duplicateIds.length,
      };
    });

    return success(
      {
        alias: toMerchantAliasDTO(result.alias),
        reclassified: result.reclassified,
        mergedCount: result.mergedCount,
      },
      result.reclassified
        ? "Alias reclassificado com sucesso"
        : "Alias confirmado com sucesso",
    );
  } catch (error) {
    if (isUnauthorizedError(error)) return failure("Não autorizado", 401);
    if (error instanceof ZodError) {
      return failure(error.issues[0]?.message ?? "Dados inválidos", 400);
    }
    if (isHttpError(error)) {
      return failure(error.message, error.status, error.code);
    }
    return failure("Não foi possível reclassificar o alias", 500);
  }
}

export async function deleteMerchantAlias(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getAuthenticatedUserId();
    const { id } = await params;
    const alias = await prisma.merchantAlias.findFirst({
      where: { id, userId },
      select: { id: true },
    });
    if (!alias) return failure("Alias não encontrado", 404);
    await prisma.merchantAlias.delete({ where: { id } });
    return success({ id }, "Alias removido com sucesso");
  } catch (error) {
    if (isUnauthorizedError(error)) return failure("Não autorizado", 401);
    return failure("Não foi possível remover o alias", 500);
  }
}
