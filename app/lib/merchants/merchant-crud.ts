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

async function assertUniqueMerchantName(
  userId: string,
  name: string,
  exceptId?: string,
) {
  const duplicate = await prisma.merchant.findFirst({
    where: {
      userId,
      name: { equals: name, mode: "insensitive" },
      ...(exceptId ? { id: { not: exceptId } } : {}),
    },
    select: { id: true },
  });

  if (duplicate) {
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
    await assertUniqueMerchantName(userId, data.name);
    return prisma.merchant.create({
      data: { ...data, userId },
      include: merchantInclude,
    });
  },
  async beforeUpdate(data, entity, userId) {
    if (data.name) {
      await assertUniqueMerchantName(userId, data.name, entity.id);
    }
    return data;
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
