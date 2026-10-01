import type { Prisma } from "@prisma/client";

import { HttpError } from "@/app/lib/http-error";

type MerchantReader = Pick<Prisma.TransactionClient, "merchant">;

export async function getOwnedActiveMerchantOrThrow(
  db: MerchantReader,
  userId: string,
  merchantId: string,
) {
  const merchant = await db.merchant.findFirst({
    where: { id: merchantId, userId, isActive: true },
  });

  if (!merchant) {
    throw new HttpError("Estabelecimento inválido", 400, "INVALID_MERCHANT");
  }

  return merchant;
}
