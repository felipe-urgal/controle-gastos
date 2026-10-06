import { ZodError } from "zod";

import { failure, success } from "@/app/lib/api-response";
import { parseJsonBody } from "@/app/lib/api/request-json";
import { getAuthenticatedUserId } from "@/app/lib/auth";
import { isUnauthorizedError } from "@/app/lib/auth/auth-errors";
import {
  matchMerchantAlias,
  merchantAliasMatches,
  merchantAliasPatternsCanOverlap,
  normalizeMerchantAliasValue,
  type MerchantAliasMatchCandidate,
} from "@/app/lib/merchants/merchant-alias-matching";
import { findMatchingMerchantAliasesForUser } from "@/app/lib/merchants/merchant-alias-query";
import { previewMerchantAliasSchema } from "@/app/lib/merchants/merchant-alias-preview-schema";
import { prisma } from "@/app/lib/prisma";

export async function previewMerchantAliasForUser(
  userId: string,
  rawInput: unknown,
) {
  const input = previewMerchantAliasSchema.parse(rawInput);
  const normalizedPattern = normalizeMerchantAliasValue(input.pattern);

  const merchant = await prisma.merchant.findFirst({
    where: { id: input.merchantId, userId, isActive: true },
    select: { id: true, name: true },
  });
  if (!merchant) {
    return {
      status: 400 as const,
      data: null,
      error: "Estabelecimento inválido ou inativo",
    };
  }

  const aliases = await prisma.merchantAlias.findMany({
    where: {
      userId,
      ...(input.aliasId ? { id: { not: input.aliasId } } : {}),
    },
    select: {
      id: true,
      merchantId: true,
      operator: true,
      pattern: true,
      normalizedPattern: true,
      priority: true,
      merchant: {
        select: { id: true, name: true, isActive: true },
      },
    },
    orderBy: [{ priority: "asc" }, { id: "asc" }],
  });

  const exactEquivalent =
    aliases.find(
      (alias) =>
        alias.operator === input.operator &&
        alias.normalizedPattern === normalizedPattern,
    ) ?? null;

  const candidate: MerchantAliasMatchCandidate = {
    id: "__candidate__",
    merchantId: input.merchantId,
    merchantName: merchant.name,
    operator: input.operator,
    normalizedPattern,
    priority: input.priority,
  };

  const overlapping = aliases
    .filter(
      (alias) =>
        alias.merchantId !== input.merchantId &&
        merchantAliasPatternsCanOverlap(candidate, {
          operator: alias.operator,
          normalizedPattern: alias.normalizedPattern,
        }),
    )
    .map((alias) => ({
      aliasId: alias.id,
      pattern: alias.pattern,
      operator: alias.operator,
      priority: alias.priority,
      merchant: alias.merchant,
      exact:
        alias.operator === input.operator &&
        alias.normalizedPattern === normalizedPattern,
    }));

  let test: null | {
    matchesCandidate: boolean;
    conflict: boolean;
    winner: {
      aliasId: string;
      merchantId: string;
      merchantName: string;
    } | null;
    candidates: Array<{
      aliasId: string;
      merchantId: string;
      merchantName: string;
      operator: string;
      pattern: string;
      candidate: boolean;
    }>;
  } = null;

  if (input.description) {
    const persisted = (
      await findMatchingMerchantAliasesForUser(userId, input.description)
    ).filter((alias) => alias.id !== input.aliasId);
    const matchesCandidate = merchantAliasMatches(
      candidate.operator,
      candidate.normalizedPattern,
      input.description,
    );
    const candidates = matchesCandidate ? [...persisted, candidate] : persisted;
    const match = matchMerchantAlias(candidates, input.description);

    const patternsById = new Map(
      aliases.map((alias) => [alias.id, alias.pattern]),
    );
    patternsById.set(candidate.id, input.pattern.trim());

    const byId = new Map(candidates.map((alias) => [alias.id, alias]));
    const orderedIds =
      match?.matchingAliasIds ?? candidates.map((alias) => alias.id);
    const ordered = orderedIds
      .map((id) => byId.get(id))
      .filter((alias): alias is MerchantAliasMatchCandidate => Boolean(alias));

    test = {
      matchesCandidate,
      conflict: match?.conflict ?? false,
      winner: match
        ? {
            aliasId: match.aliasId,
            merchantId: match.merchantId,
            merchantName: match.merchantName,
          }
        : null,
      candidates: ordered.map((alias) => ({
        aliasId: alias.id,
        merchantId: alias.merchantId,
        merchantName: alias.merchantName,
        operator: alias.operator,
        pattern: patternsById.get(alias.id) ?? alias.normalizedPattern,
        candidate: alias.id === candidate.id,
      })),
    };
  }

  return {
    status: 200 as const,
    data: {
      normalizedPattern,
      exactEquivalent: exactEquivalent
        ? {
            aliasId: exactEquivalent.id,
            pattern: exactEquivalent.pattern,
            operator: exactEquivalent.operator,
            merchant: exactEquivalent.merchant,
          }
        : null,
      overlapCount: overlapping.length,
      overlaps: overlapping.slice(0, 20),
      test,
      canSave: exactEquivalent === null,
      canMove:
        exactEquivalent !== null &&
        exactEquivalent.merchantId !== input.merchantId,
    },
    error: null,
  };
}

export async function previewMerchantAlias(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const result = await previewMerchantAliasForUser(
      userId,
      await parseJsonBody(request),
    );
    if (!result.data) {
      return failure(result.error ?? "Dados inválidos", result.status);
    }
    return success(result.data);
  } catch (error) {
    if (isUnauthorizedError(error)) return failure("Não autorizado", 401);
    if (error instanceof ZodError) {
      return failure(error.issues[0]?.message ?? "Dados inválidos", 400);
    }
    return failure("Não foi possível analisar o alias", 500);
  }
}
