import type { Prisma } from "@prisma/client";

import { baseCrudHandler } from "@/app/lib/api/base-crud-handler";
import { HttpError } from "@/app/lib/http-error";
import { toMerchantDTO } from "@/app/lib/merchants/merchant-dto";
import {
  createMerchantSchema,
  updateMerchantSchema,
} from "@/app/lib/merchants/merchant-schema";
import { prisma } from "@/app/lib/prisma";

const merchantInclude = {
  _count: { select: { transactions: true, aliases: true } },
} as const;

function normalizeMerchantNameIdentity(name: string) {
  return name
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("pt-BR");
}

async function lockMerchantName(
  tx: Prisma.TransactionClient,
  userId: string,
  normalizedName: string,
) {
  await tx.$queryRaw`
    SELECT pg_advisory_xact_lock(
      hashtext(${"merchant-name:" + userId}),
      hashtext(${normalizedName})
    )
  `;
}

async function assertUniqueMerchantName(
  tx: Prisma.TransactionClient,
  userId: string,
  name: string,
  exceptId?: string,
) {
  const normalizedName = normalizeMerchantNameIdentity(name);
  await lockMerchantName(tx, userId, normalizedName);

  const candidates = await tx.merchant.findMany({
    where: {
      userId,
      ...(exceptId ? { id: { not: exceptId } } : {}),
    },
    select: { id: true, name: true },
  });

  if (
    candidates.some(
      (candidate) =>
        normalizeMerchantNameIdentity(candidate.name) === normalizedName,
    )
  ) {
    throw new HttpError(
      "Já existe um estabelecimento com esse nome",
      409,
      "MERCHANT_NAME_CONFLICT",
    );
  }
}

export const merchantCrud = baseCrudHandler({
  model: (db) => db.merchant,
  entityName: "Estabelecimento",
  createSchema: createMerchantSchema,
  updateSchema: updateMerchantSchema,
  filterableFields: ["isActive"],
  searchableFields: ["name"],
  orderBy: [{ isActive: "desc" }, { name: "asc" }, { id: "asc" }],
  limit: true,
  include: merchantInclude,
  async beforeCreate(data, userId) {
    return prisma.$transaction(async (tx) => {
      await assertUniqueMerchantName(tx, userId, data.name);
      return tx.merchant.create({
        data: { ...data, userId },
        include: merchantInclude,
      });
    });
  },
  async customUpdate({ data, entity, userId, include }) {
    if (!data.name) {
      return prisma.merchant.update({
        where: { id: entity.id, userId },
        data,
        include,
      });
    }

    return prisma.$transaction(async (tx) => {
      await assertUniqueMerchantName(tx, userId, data.name, entity.id);
      return tx.merchant.update({
        where: { id: entity.id, userId },
        data,
        include,
      });
    });
  },
  async beforeDelete(entity) {
    if ((entity._count?.transactions ?? 0) > 0) {
      throw new HttpError(
        "Estabelecimento possui transações vinculadas. Desative-o para preservar o histórico.",
        409,
        "MERCHANT_IN_USE",
      );
    }

    if ((entity._count?.aliases ?? 0) > 0) {
      throw new HttpError(
        "Remova ou mova os aliases antes de excluir este estabelecimento.",
        409,
        "MERCHANT_HAS_ALIASES",
      );
    }
  },
  mapper: toMerchantDTO,
});
