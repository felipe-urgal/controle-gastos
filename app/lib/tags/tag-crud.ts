import { baseCrudHandler } from "@/app/lib/api/base-crud-handler";
import { HttpError } from "@/app/lib/http-error";
import { prisma } from "@/app/lib/prisma";
import { createTagSchema, updateTagSchema } from "@/app/lib/tags/tag-schema";

async function assertUniqueName(userId: string, name: string, exceptId?: string) {
  const duplicate = await prisma.tag.findFirst({
    where: {
      userId,
      name,
      ...(exceptId ? { id: { not: exceptId } } : {}),
    },
    select: { id: true },
  });

  if (duplicate) {
    throw new HttpError("Já existe uma tag com esse nome", 409, "TAG_NAME_CONFLICT");
  }
}

export const tagCrud = baseCrudHandler({
  model: (db) => db.tag,
  entityName: "Tag",
  createSchema: createTagSchema,
  updateSchema: updateTagSchema,
  orderBy: [{ name: "asc" }, { id: "asc" }],
  async beforeCreate(data, userId) {
    await assertUniqueName(userId, data.name);
    return prisma.tag.create({ data: { ...data, userId } });
  },
  async beforeUpdate(data, entity, userId) {
    if (data.name) await assertUniqueName(userId, data.name, entity.id);
    return data;
  },
});
