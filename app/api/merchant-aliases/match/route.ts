import { ZodError, z } from "zod";

import { parseJsonBody } from "@/app/lib/api/request-json";
import { failure, success } from "@/app/lib/api-response";
import { getAuthenticatedUserId } from "@/app/lib/auth";
import { isUnauthorizedError } from "@/app/lib/auth/auth-errors";
import { matchMerchantAlias } from "@/app/lib/merchants/merchant-alias-matching";
import { prisma } from "@/app/lib/prisma";

const schema = z.object({
  description: z.string().trim().min(2).max(255),
});

export async function POST(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const input = schema.parse(await parseJsonBody(request));
    const aliases = await prisma.merchantAlias.findMany({
      where: { userId, merchant: { isActive: true } },
      select: {
        id: true,
        merchantId: true,
        operator: true,
        normalizedPattern: true,
        priority: true,
        merchant: { select: { name: true } },
      },
      orderBy: [{ priority: "asc" }, { id: "asc" }],
    });

    const match = matchMerchantAlias(
      aliases.map((alias) => ({
        id: alias.id,
        merchantId: alias.merchantId,
        merchantName: alias.merchant.name,
        operator: alias.operator,
        normalizedPattern: alias.normalizedPattern,
        priority: alias.priority,
      })),
      input.description,
    );

    return success({
      matchedAliasId: match?.aliasId ?? null,
      merchantId: match?.conflict ? null : (match?.merchantId ?? null),
      merchantName: match?.conflict ? null : (match?.merchantName ?? null),
      conflict: match?.conflict ?? false,
    });
  } catch (error) {
    if (isUnauthorizedError(error)) return failure("Não autorizado", 401);
    if (error instanceof ZodError) {
      return failure(error.issues[0]?.message ?? "Descrição inválida", 400);
    }
    return failure("Não foi possível reconhecer o estabelecimento", 500);
  }
}
