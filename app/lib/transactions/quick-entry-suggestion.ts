import { matchMerchantAlias } from "@/app/lib/merchants/merchant-alias-matching";
import { findMatchingMerchantAliasesForUser } from "@/app/lib/merchants/merchant-alias-query";
import { prisma } from "@/app/lib/prisma";

export type QuickEntrySuggestionSource = "SAME_DESCRIPTION" | "MERCHANT" | "LAST_ACCOUNT" | "NONE";

export type QuickEntrySuggestion = {
  accountId: string | null;
  categoryId: string | null;
  merchantId: string | null;
  merchantName: string | null;
  /** De onde veio a sugestão, para a prévia explicar ("igual ao último lançamento…"). */
  source: QuickEntrySuggestionSource;
};

const NO_SUGGESTION: QuickEntrySuggestion = {
  accountId: null,
  categoryId: null,
  merchantId: null,
  merchantName: null,
  source: "NONE",
};

const RECENT_ORDER = [
  { year: "desc" },
  { month: "desc" },
  { day: "desc" },
  { createdAt: "desc" },
  { id: "desc" },
] as const;

/**
 * Sugere conta, categoria e estabelecimento para uma frase de lançamento rápido, só com o que o
 * próprio usuário já tem: o último lançamento com a mesma descrição, o último do estabelecimento
 * reconhecido pelos aliases e, na falta disso, a conta usada por último. Tudo escopado ao dono;
 * conta ou categoria inativa nunca é sugerida; a categoria só vale se for do tipo pedido.
 */
export async function suggestQuickEntry(
  userId: string,
  input: { description: string; type: "EXPENSE" | "INCOME" },
): Promise<QuickEntrySuggestion> {
  const description = input.description.trim();

  const base = {
    userId,
    kind: "NORMAL" as const,
    status: { not: "CANCELLED" as const },
    account: { is: { userId, isActive: true } },
  };
  const withCategory = {
    category: { is: { userId, isActive: true, type: input.type } },
  };
  const select = {
    accountId: true,
    categoryId: true,
    merchantId: true,
    merchant: { select: { name: true, isActive: true } },
  } as const;

  let merchantId: string | null = null;
  let merchantName: string | null = null;
  if (description.length >= 2) {
    const aliases = await findMatchingMerchantAliasesForUser(userId, description);
    const match = matchMerchantAlias(aliases, description);
    if (match && !match.conflict) {
      merchantId = match.merchantId;
      merchantName = match.merchantName;
    }
  }

  const sameDescription =
    description.length >= 1
      ? await prisma.transaction.findFirst({
          where: { ...base, ...withCategory, description: { equals: description, mode: "insensitive" } },
          orderBy: [...RECENT_ORDER],
          select,
        })
      : null;

  if (sameDescription) {
    return {
      accountId: sameDescription.accountId,
      categoryId: sameDescription.categoryId,
      merchantId: merchantId ?? (sameDescription.merchant?.isActive ? sameDescription.merchantId : null),
      merchantName: merchantName ?? (sameDescription.merchant?.isActive ? sameDescription.merchant.name : null),
      source: "SAME_DESCRIPTION",
    };
  }

  if (merchantId) {
    const byMerchant = await prisma.transaction.findFirst({
      where: { ...base, ...withCategory, merchantId },
      orderBy: [...RECENT_ORDER],
      select,
    });
    if (byMerchant) {
      return {
        accountId: byMerchant.accountId,
        categoryId: byMerchant.categoryId,
        merchantId,
        merchantName,
        source: "MERCHANT",
      };
    }
  }

  const last = await prisma.transaction.findFirst({
    where: base,
    orderBy: [...RECENT_ORDER],
    select: { accountId: true },
  });
  if (last) {
    return { ...NO_SUGGESTION, accountId: last.accountId, merchantId, merchantName, source: "LAST_ACCOUNT" };
  }

  return { ...NO_SUGGESTION, merchantId, merchantName };
}
