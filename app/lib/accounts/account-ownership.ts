import type { Prisma } from "@prisma/client";

import { HttpError } from "@/app/lib/http-error";

export async function getOwnedActiveAccountOrThrow(
  tx: Prisma.TransactionClient,
  userId: string,
  accountId: string,
) {
  const account = await tx.account.findFirst({
    where: {
      id: accountId,
      userId,
      isActive: true,
    },
  });

  if (!account) {
    throw new HttpError("Conta inválida ou inativa", 400);
  }

  return account;
}
