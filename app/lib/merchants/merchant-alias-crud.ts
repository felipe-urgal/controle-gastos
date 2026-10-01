import { ZodError } from "zod";

import { failure, success } from "@/app/lib/api-response";
import { getAuthenticatedUserId } from "@/app/lib/auth";
import { isUnauthorizedError } from "@/app/lib/auth/auth-errors";
import { HttpError } from "@/app/lib/http-error";
import { isHttpError } from "@/app/lib/http-error";
import { normalizeMerchantAliasValue } from "@/app/lib/merchants/merchant-alias-matching";
import { toMerchantAliasDTO } from "@/app/lib/merchants/merchant-alias-dto";
import { createMerchantAliasSchema } from "@/app/lib/merchants/merchant-alias-schema";
import { prisma } from "@/app/lib/prisma";
import { parseJsonBody } from "@/app/lib/api/request-json";

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
    const merchant = await prisma.merchant.findFirst({
      where: { id: input.merchantId, userId, isActive: true },
      select: { id: true },
    });
    if (!merchant) throw new HttpError("Estabelecimento inválido ou inativo", 400, "INVALID_MERCHANT");

    const normalizedPattern = normalizeMerchantAliasValue(input.pattern);
    const duplicate = await prisma.merchantAlias.findFirst({
      where: {
        userId,
        merchantId: input.merchantId,
        operator: input.operator,
        normalizedPattern,
      },
      select: { id: true },
    });
    if (duplicate) throw new HttpError("Alias equivalente já existe", 409, "MERCHANT_ALIAS_CONFLICT");

    const alias = await prisma.merchantAlias.create({
      data: {
        userId,
        merchantId: input.merchantId,
        operator: input.operator,
        pattern: input.pattern.trim().replace(/\s+/g, " "),
        normalizedPattern,
        priority: input.priority,
      },
      include: { merchant: { select: { id: true, name: true, isActive: true } } },
    });
    return success(toMerchantAliasDTO(alias), "Alias criado com sucesso", 201);
  } catch (error) {
    if (isUnauthorizedError(error)) return failure("Não autorizado", 401);
    if (error instanceof ZodError) return failure(error.issues[0]?.message ?? "Dados inválidos", 400);
    if (isHttpError(error)) return failure(error.message, error.status, error.code);
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
    const alias = await prisma.merchantAlias.findFirst({ where: { id, userId }, select: { id: true } });
    if (!alias) return failure("Alias não encontrado", 404);
    await prisma.merchantAlias.delete({ where: { id } });
    return success({ id }, "Alias removido com sucesso");
  } catch (error) {
    if (isUnauthorizedError(error)) return failure("Não autorizado", 401);
    return failure("Não foi possível remover o alias", 500);
  }
}
