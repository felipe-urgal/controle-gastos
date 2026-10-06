import type { Prisma } from "@prisma/client";

import { HttpError } from "@/app/lib/http-error";

type AssertOwnedTagsOptions = {
  allowInactiveIds?: readonly string[];
};

export async function assertOwnedTags(
  db: Prisma.TransactionClient,
  userId: string,
  tagIds: readonly string[],
  options: AssertOwnedTagsOptions = {},
) {
  if (tagIds.length === 0) return;

  const uniqueIds = [...new Set(tagIds)];
  const tags = await db.tag.findMany({
    where: { userId, id: { in: uniqueIds } },
    select: { id: true, isActive: true },
  });

  if (tags.length !== uniqueIds.length) {
    throw new HttpError(
      "Uma ou mais tags não pertencem ao usuário",
      400,
      "INVALID_TAGS",
    );
  }

  const allowedInactive = new Set(options.allowInactiveIds ?? []);
  if (tags.some((tag) => !tag.isActive && !allowedInactive.has(tag.id))) {
    throw new HttpError(
      "Uma ou mais tags estão arquivadas e não podem ser adicionadas a novos vínculos",
      409,
      "TAG_ARCHIVED",
    );
  }
}

export async function attachTagsToTransactions(
  db: Prisma.TransactionClient,
  userId: string,
  transactionIds: readonly string[],
  tagIds: readonly string[],
) {
  if (transactionIds.length === 0 || tagIds.length === 0) return;

  await assertOwnedTags(db, userId, tagIds);
  await db.transactionTag.createMany({
    data: transactionIds.flatMap((transactionId) =>
      tagIds.map((tagId) => ({ userId, transactionId, tagId })),
    ),
  });
}
