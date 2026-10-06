import { Prisma } from "@prisma/client";

import { baseCrudHandler } from "@/app/lib/api/base-crud-handler";
import { HttpError } from "@/app/lib/http-error";
import { prisma } from "@/app/lib/prisma";
import { normalizeTagNameKey } from "@/app/lib/tags/tag-name";
import { createTagSchema, updateTagSchema } from "@/app/lib/tags/tag-schema";

const tagInclude = {
  _count: { select: { transactionLinks: true } },
} as const;

function tagNameConflict() {
  return new HttpError(
    "Já existe uma tag com esse nome",
    409,
    "TAG_NAME_CONFLICT",
  );
}

function tagInUse(count: number) {
  return new HttpError(
    `Esta tag está vinculada a ${count} transação(ões). Arquive a tag para preservar o histórico.`,
    409,
    "TAG_IN_USE",
  );
}

function rethrowTagWriteError(error: unknown): never {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    throw tagNameConflict();
  }

  throw error;
}

async function assertUniqueName(
  userId: string,
  normalizedName: string,
  exceptId?: string,
) {
  const duplicate = await prisma.tag.findFirst({
    where: {
      userId,
      normalizedName,
      ...(exceptId ? { id: { not: exceptId } } : {}),
    },
    select: { id: true },
  });

  if (duplicate) throw tagNameConflict();
}

export const tagCrud = baseCrudHandler({
  model: (db) => db.tag,
  entityName: "Tag",
  createSchema: createTagSchema,
  updateSchema: updateTagSchema,
  filterableFields: ["isActive"],
  searchableFields: ["name"],
  limit: true,
  orderBy: [{ isActive: "desc" }, { name: "asc" }, { id: "asc" }],
  include: tagInclude,
  async beforeCreate(data, userId) {
    const normalizedName = normalizeTagNameKey(data.name);
    await assertUniqueName(userId, normalizedName);

    try {
      return await prisma.tag.create({
        data: { ...data, normalizedName, userId },
        include: tagInclude,
      });
    } catch (error) {
      rethrowTagWriteError(error);
    }
  },
  async beforeUpdate(data, entity, userId) {
    if (!data.name) return data;

    const normalizedName = normalizeTagNameKey(data.name);
    await assertUniqueName(userId, normalizedName, entity.id);
    return { ...data, normalizedName };
  },
  async customUpdate({ data, entity, userId }) {
    try {
      return await prisma.tag.update({
        where: { id: entity.id, userId },
        data,
        include: tagInclude,
      });
    } catch (error) {
      rethrowTagWriteError(error);
    }
  },
  async customDelete(entity, userId) {
    const transactionCount = await prisma.transactionTag.count({
      where: { userId, tagId: entity.id },
    });
    if (transactionCount > 0) throw tagInUse(transactionCount);

    const deleted = await prisma.tag.deleteMany({
      where: {
        id: entity.id,
        userId,
        transactionLinks: { none: {} },
      },
    });
    if (deleted.count !== 1) {
      const currentCount = await prisma.transactionTag.count({
        where: { userId, tagId: entity.id },
      });
      throw tagInUse(currentCount);
    }
  },
  mapper(entity) {
    const {
      normalizedName: _normalizedName,
      _count,
      ...tag
    } = entity;

    return {
      ...tag,
      transactionCount: _count?.transactionLinks ?? 0,
    };
  },
});
