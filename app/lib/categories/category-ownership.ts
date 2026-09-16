import type { Prisma } from "@prisma/client";

import { HttpError } from "@/app/lib/http-error";

export async function getOwnedCategoryOrThrow(
  tx: Prisma.TransactionClient,
  userId: string,
  categoryId: string,
) {
  const category = await tx.category.findFirst({
    where: {
      id: categoryId,
      userId,
    },
  });

  if (!category) {
    throw new HttpError("Categoria inválida", 400);
  }

  return category;
}
