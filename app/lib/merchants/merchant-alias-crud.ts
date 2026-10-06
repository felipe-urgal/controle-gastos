import { ZodError } from "zod";

import { failure, success } from "@/app/lib/api-response";
import { parseJsonBody } from "@/app/lib/api/request-json";
import { getAuthenticatedUserId } from "@/app/lib/auth";
import { isUnauthorizedError } from "@/app/lib/auth/auth-errors";
import { HttpError, isHttpError } from "@/app/lib/http-error";
import { toMerchantAliasDTO } from "@/app/lib/merchants/merchant-alias-dto";
import { normalizeMerchantAliasValue } from "@/app/lib/merchants/merchant-alias-matching";
import { createMerchantAliasSchema } from "@/app/lib/merchants/merchant-alias-schema";
import { prisma } from "@/app/lib/prisma";

export async function listMerchantAliases(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const url = new URL(request.url);
    const merchantId = url.searchParams.get("merchantId") ?? undefined;
    const aliases = await prisma.merchantAlias.findMany({
      where: { userId, ...(merchantId ? { merchantId } : {}) },
      include: { merchant: { select: { id: true, name: true, isActive: true } } },
      orderBy: [{ priority: "asc" }, { id: "asc" }],
    });
    return success({ items: aliases.map(toMerchantAliasDTO) });
  } catch (error) {
    if (isUnauthorizedError(error)) return failure("Não autorizado", 401);
    return failure("Não foi possível carregar aliases", 500);
  }
}

export async function createMerchantAlias(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const input = createMerchantAliasSchema.parse(await parseJsonBody(request));
    const normalizedPattern = normalizeMerchantAliasValue(input.pattern);
    const storedPattern = input.pattern.trim().replace(/\s+/g, " ");

    const alias = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        SELECT pg_advisory_xact_lock(
          hashtext(${"merchant-alias:" + userId}),
          hashtext(${input.operator + ":" + normalizedPattern})
        )
      `;

      const merchant = await tx.merchant.findFirst({
        where: { id: input.merchantId, userId, isActive: true },
        select: { id: true },
      });
      if (!merchant) {
        throw new HttpError(
          "Estabelecimento inválido ou inativo",
          400,
          "INVALID_MERCHANT",
        );
      }

      const duplicate = await tx.merchantAlias.findFirst({
        where: {
          userId,
          operator: input.operator,
          normalizedPattern,
        },
        select: {
          id: true,
          merchantId: true,
          merchant: { select: { name: true } },
        },
      });

      if (duplicate?.merchantId === input.merchantId) {
        throw new HttpError(
          "Alias equivalente já existe neste estabelecimento",
          409,
          "MERCHANT_ALIAS_EQUIVALENT",
        );
      }

      if (duplicate) {
        throw new HttpError(
          `Alias equivalente já pertence a "${duplicate.merchant.name}"`,
          409,
          "MERCHANT_ALIAS_OWNED_BY_OTHER_MERCHANT",
        );
      }

      return tx.merchantAlias.create({
        data: {
          userId,
          merchantId: input.merchantId,
          operator: input.operator,
          pattern: storedPattern,
          normalizedPattern,
          priority: input.priority,
        },
        include: {
          merchant: { select: { id: true, name: true, isActive: true } },
        },
      });
    });

    return success(toMerchantAliasDTO(alias), "Alias criado com sucesso", 201);
  } catch (error) {
    if (isUnauthorizedError(error)) return failure("Não autorizado", 401);
    if (error instanceof ZodError) {
      return failure(error.issues[0]?.message ?? "Dados inválidos", 400);
    }
    if (isHttpError(error)) {
      return failure(error.message, error.status, error.code);
    }
    return failure("Não foi possível criar o alias", 500);
  }
}

export async function deleteMerchantAlias(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getAuthenticatedUserId();
    const { id } = await params;
    const alias = await prisma.merchantAlias.findFirst({
      where: { id, userId },
      select: { id: true },
    });
    if (!alias) return failure("Alias não encontrado", 404);
    await prisma.merchantAlias.delete({ where: { id } });
    return success({ id }, "Alias removido com sucesso");
  } catch (error) {
    if (isUnauthorizedError(error)) return failure("Não autorizado", 401);
    return failure("Não foi possível remover o alias", 500);
  }
}
