import { Prisma } from "@prisma/client";

import { baseCrudHandler } from "@/app/lib/api/base-crud-handler";
import { HttpError } from "@/app/lib/http-error";
import { prisma } from "@/app/lib/prisma";
import { normalizeTagNameKey } from "@/app/lib/tags/tag-name";
import { createTagSchema, updateTagSchema } from "@/app/lib/tags/tag-schema";

function tagNameConflict() {
  return new HttpError(
    "Já existe uma tag com esse nome",
    409,
    "TAG_NAME_CONFLICT",
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
  orderBy: [{ name: "asc" }, { id: "asc" }],
  async beforeCreate(data, userId) {
    const normalizedName = normalizeTagNameKey(data.name);
    await assertUniqueName(userId, normalizedName);

    try {
      return await prisma.tag.create({
        data: { ...data, normalizedName, userId },
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
      });
    } catch (error) {
      rethrowTagWriteError(error);
    }
  },
  mapper(entity) {
    const { normalizedName: _normalizedName, ...tag } = entity;
    return tag;
  },
});
