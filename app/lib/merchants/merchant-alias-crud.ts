import type { Prisma } from "@prisma/client";
import { ZodError, z } from "zod";

import { failure, success } from "@/app/lib/api-response";
import { parseJsonBody } from "@/app/lib/api/request-json";
import { getAuthenticatedUserId } from "@/app/lib/auth";
import { isUnauthorizedError } from "@/app/lib/auth/auth-errors";
import { HttpError, isHttpError } from "@/app/lib/http-error";
import { toMerchantAliasDTO } from "@/app/lib/merchants/merchant-alias-dto";
import { normalizeMerchantAliasValue } from "@/app/lib/merchants/merchant-alias-matching";
import { createMerchantAliasSchema } from "@/app/lib/merchants/merchant-alias-schema";
import { prisma } from "@/app/lib/prisma";

type AliasInput = z.infer<typeof createMerchantAliasSchema>;

const aliasListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().trim().max(120).optional(),
  merchantId: z.uuid().optional(),
  merchantSearch: z.string().trim().max(120).optional(),
});

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
  await tx.$queryRaw`
    SELECT 1::int AS locked
    FROM pg_advisory_xact_lock(
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

async function assertOwnedMerchantForUpdate(
  tx: Prisma.TransactionClient,
  userId: string,
  merchantId: string,
  currentMerchantId: string,
) {
  const merchant = await tx.merchant.findFirst({
    where: {
      id: merchantId,
      userId,
      ...(merchantId === currentMerchantId ? {} : { isActive: true }),
    },
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

async function findEquivalentAlias(
  tx: Prisma.TransactionClient,
  userId: string,
  input: AliasInput,
  normalizedPattern: string,
  exceptId?: string,
) {
  return tx.merchantAlias.findFirst({
    where: {
      userId,
      operator: input.operator,
      normalizedPattern,
      ...(exceptId ? { id: { not: exceptId } } : {}),
    },
    select: {
      id: true,
      merchantId: true,
      merchant: { select: { name: true } },
    },
  });
}

function equivalentAliasError(
  duplicate: Awaited<ReturnType<typeof findEquivalentAlias>>,
  merchantId: string,
) {
  if (!duplicate) return null;
  if (duplicate.merchantId === merchantId) {
    return new HttpError(
      "Alias equivalente já existe neste estabelecimento",
      409,
      "MERCHANT_ALIAS_EQUIVALENT",
    );
  }
  return new HttpError(
    `Alias equivalente já pertence a "${duplicate.merchant.name}"`,
    409,
    "MERCHANT_ALIAS_OWNED_BY_OTHER_MERCHANT",
  );
}

export async function listMerchantAliases(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const url = new URL(request.url);
    const query = aliasListQuerySchema.parse(
      Object.fromEntries(url.searchParams.entries()),
    );

    const where: Prisma.MerchantAliasWhereInput = {
      userId,
      ...(query.merchantId ? { merchantId: query.merchantId } : {}),
      ...(query.search
        ? { pattern: { contains: query.search, mode: "insensitive" } }
        : {}),
      ...(query.merchantSearch
        ? {
            merchant: {
              is: {
                userId,
                name: {
                  contains: query.merchantSearch,
                  mode: "insensitive",
                },
              },
            },
          }
        : {}),
    };

    const [total, aliases] = await Promise.all([
      prisma.merchantAlias.count({ where }),
      prisma.merchantAlias.findMany({
        where,
        include: aliasInclude,
        orderBy: [
          { merchant: { name: "asc" } },
          { priority: "asc" },
          { id: "asc" },
        ],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);

    return success({
      items: aliases.map(toMerchantAliasDTO),
      total,
      page: query.page,
      pageSize: query.pageSize,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    });
  } catch (error) {
    if (isUnauthorizedError(error)) return failure("Não autorizado", 401);
    if (error instanceof ZodError) {
      return failure(error.issues[0]?.message ?? "Filtros inválidos", 400);
    }
    return failure("Não foi possível carregar aliases", 500);
  }
}

export async function createMerchantAlias(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const input = createMerchantAliasSchema.parse(await parseJsonBody(request));
    const { normalizedPattern, storedPattern } = normalizeAliasInput(input);

    const alias = await prisma.$transaction(async (tx) => {
      await lockAliasIdentity(tx, userId, input, normalizedPattern);
      await assertOwnedActiveMerchant(tx, userId, input.merchantId);

      const duplicate = await findEquivalentAlias(
        tx,
        userId,
        input,
        normalizedPattern,
      );
      const duplicateError = equivalentAliasError(
        duplicate,
        input.merchantId,
      );
      if (duplicateError) throw duplicateError;

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

export async function updateMerchantAlias(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getAuthenticatedUserId();
    const { id } = await params;
    const input = createMerchantAliasSchema.parse(await parseJsonBody(request));
    const { normalizedPattern, storedPattern } = normalizeAliasInput(input);

    const alias = await prisma.$transaction(async (tx) => {
      const current = await tx.merchantAlias.findFirst({
        where: { id, userId },
        select: { id: true, merchantId: true },
      });
      if (!current) {
        throw new HttpError("Alias não encontrado", 404, "MERCHANT_ALIAS_NOT_FOUND");
      }

      await lockAliasIdentity(tx, userId, input, normalizedPattern);
      await assertOwnedMerchantForUpdate(
        tx,
        userId,
        input.merchantId,
        current.merchantId,
      );

      const duplicate = await findEquivalentAlias(
        tx,
        userId,
        input,
        normalizedPattern,
        current.id,
      );
      const duplicateError = equivalentAliasError(
        duplicate,
        input.merchantId,
      );
      if (duplicateError) throw duplicateError;

      return tx.merchantAlias.update({
        where: { id: current.id },
        data: {
          merchantId: input.merchantId,
          operator: input.operator,
          pattern: storedPattern,
          normalizedPattern,
          priority: input.priority,
        },
        include: aliasInclude,
      });
    });

    return success(toMerchantAliasDTO(alias), "Alias atualizado com sucesso");
  } catch (error) {
    if (isUnauthorizedError(error)) return failure("Não autorizado", 401);
    if (error instanceof ZodError) {
      return failure(error.issues[0]?.message ?? "Dados inválidos", 400);
    }
    if (isHttpError(error)) {
      return failure(error.message, error.status, error.code);
    }
    return failure("Não foi possível atualizar o alias", 500);
  }
}

export async function reassignMerchantAliasWithTx(
  tx: Prisma.TransactionClient,
  userId: string,
  input: AliasInput,
) {
  const { normalizedPattern, storedPattern } = normalizeAliasInput(input);

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

    await tx.merchantAliasEvent.create({
      data: {
        action: "CREATED",
        aliasId: created.id,
        sourceMerchantId: null,
        targetMerchantId: input.merchantId,
        operator: input.operator,
        pattern: storedPattern,
        normalizedPattern,
        userId,
      },
    });

    return { alias: created, reclassified: false, mergedCount: 0 };
  }

  const target =
    equivalents.find((alias) => alias.merchantId === input.merchantId) ??
    equivalents[0];
  const changedSources = equivalents.filter(
    (alias) => alias.merchantId !== input.merchantId,
  );
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

  if (changedSources.length > 0) {
    await tx.merchantAliasEvent.createMany({
      data: changedSources.map((source) => ({
        action: "REASSIGNED",
        aliasId: source.id,
        sourceMerchantId: source.merchantId,
        targetMerchantId: input.merchantId,
        operator: input.operator,
        pattern: storedPattern,
        normalizedPattern,
        userId,
      })),
    });
  }

  return {
    alias,
    reclassified: target.merchantId !== input.merchantId,
    mergedCount: duplicateIds.length,
  };
}

export async function reassignMerchantAlias(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const input = createMerchantAliasSchema.parse(await parseJsonBody(request));

    const result = await prisma.$transaction((tx) =>
      reassignMerchantAliasWithTx(tx, userId, input),
    );

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
