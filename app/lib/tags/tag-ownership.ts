import type { Prisma } from "@prisma/client";

import { HttpError } from "@/app/lib/http-error";

export async function assertOwnedTags(
  db: Prisma.TransactionClient,
  userId: string,
  tagIds: readonly string[],
) {
  if (tagIds.length === 0) return;

  const owned = await db.tag.count({
    where: { userId, id: { in: [...tagIds] } },
  });

  if (owned !== tagIds.length) {
    throw new HttpError(
      "Uma ou mais tags não pertencem ao usuário",
      400,
      "INVALID_TAGS",
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
