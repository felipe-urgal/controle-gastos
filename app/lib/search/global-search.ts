import { success } from '@/app/lib/api-response';
import { apiFailureFromError } from '@/app/lib/api/api-error-response';
import { parseQuery } from '@/app/lib/api/query';
import { getAuthenticatedUserId } from '@/app/lib/auth';
import { Prisma } from '@prisma/client';

import { prisma } from '@/app/lib/prisma';
import { consumeGlobalSearchRateLimit } from '@/app/lib/search/global-search-rate-limit';
import { searchNamedEntityGroups } from '@/app/lib/search/global-search-entities';
import { scoreGlobalSearchMatch } from '@/app/lib/search/global-search-ranking';
import {
  GLOBAL_SEARCH_LIMIT_PER_GROUP,
  GLOBAL_SEARCH_TOTAL_LIMIT,
  globalSearchQuerySchema,
} from '@/app/lib/search/global-search-schema';
import type {
  GlobalSearchData,
  GlobalSearchGroup,
  GlobalSearchResult,
  GlobalSearchResultType,
} from '@/app/types/global-search';

function parseRequest(request: Request) {
  return parseQuery(request, globalSearchQuerySchema, { q: '' });
}

function group(
  type: GlobalSearchResultType,
  items: GlobalSearchResult[],
): GlobalSearchGroup {
  return { type, items };
}

const FUZZY_SIMILARITY_THRESHOLD = 0.35;
export const GLOBAL_SEARCH_P95_BUDGET_MS = 500;
export const GLOBAL_SEARCH_SLOW_THRESHOLD_MS = 750;

const relevance = scoreGlobalSearchMatch;

function rankNamedResults<T extends { id: string; name: string; isActive: boolean }>(
  items: T[],
  query: string,
  secondaryText: (item: T) => string | null = () => null,
): T[] {
  return items
    .map((item) => ({
      item,
      score: Math.max(relevance(item.name, query), relevance(secondaryText(item) ?? '', query) - 25),
    }))
    .sort((a, b) => b.score - a.score
      || Number(b.item.isActive) - Number(a.item.isActive)
      || a.item.name.localeCompare(b.item.name, 'pt-BR')
      || a.item.id.localeCompare(b.item.id))
    .slice(0, GLOBAL_SEARCH_LIMIT_PER_GROUP)
    .map(({ item }) => item);
}

function emitSearchTelemetry(input: {
  durationMs: number; queryLength: number; fuzzyUsed: boolean;
  status: 'ok' | 'rate_limited' | 'error';
  groupCounts?: Record<string, number>;
}) {
  // Do not log the search term, account identifiers, monetary values or titles.
  const record = {
    event: 'global_search_request', ...input,
    slow: input.durationMs >= GLOBAL_SEARCH_SLOW_THRESHOLD_MS,
    p95BudgetMs: GLOBAL_SEARCH_P95_BUDGET_MS,
  };
  if (record.slow) console.warn(JSON.stringify(record));
  else console.info(JSON.stringify(record));
}

// Prefiltering only by transactions.description/ILIKE would drop valid fuzzy
// matches originating from merchant names, aliases or tags (including typos).
// Keep all four fields in the candidate set until a measured, equivalent
// indexed preselection strategy is available; see the real-query EXPLAIN test.
export function buildGlobalSearchFuzzyQuery(userId: string, query: string, excludeIds: string[]): Prisma.Sql {
  return Prisma.sql`
      SELECT
        t.id,
        GREATEST(
          word_similarity(${query}, t.description),
          word_similarity(${query}, COALESCE(m.name, '')),
          COALESCE((
            SELECT MAX(word_similarity(${query}, ma.pattern))
            FROM merchant_aliases ma
            WHERE ma."merchant_id" = t."merchant_id"
              AND ma."userId" = ${userId}
          ), 0),
          COALESCE((
            SELECT MAX(word_similarity(${query}, tag.name))
            FROM transaction_tags tt
            JOIN tags tag ON tag.id = tt."tag_id"
            WHERE tt."transaction_id" = t.id
              AND tt."userId" = ${userId}
          ), 0)
        ) AS score
      FROM transactions t
      LEFT JOIN merchants m
        ON m.id = t."merchant_id"
       AND m."userId" = ${userId}
      WHERE t."userId" = ${userId}
        AND t.id NOT IN (${Prisma.join(excludeIds.length ? excludeIds : ['__none__'])})
        AND GREATEST(
          word_similarity(${query}, t.description),
          word_similarity(${query}, COALESCE(m.name, '')),
          COALESCE((
            SELECT MAX(word_similarity(${query}, ma.pattern))
            FROM merchant_aliases ma
            WHERE ma."merchant_id" = t."merchant_id"
              AND ma."userId" = ${userId}
          ), 0),
          COALESCE((
            SELECT MAX(word_similarity(${query}, tag.name))
            FROM transaction_tags tt
            JOIN tags tag ON tag.id = tt."tag_id"
            WHERE tt."transaction_id" = t.id
              AND tt."userId" = ${userId}
          ), 0)
        ) >= ${FUZZY_SIMILARITY_THRESHOLD}
      ORDER BY score DESC, t.year DESC, t.month DESC, t.day DESC, t."created_at" DESC, t.id DESC
      LIMIT ${GLOBAL_SEARCH_LIMIT_PER_GROUP}
  `;
}

async function fuzzyTransactionIds(
  userId: string,
  query: string,
  excludeIds: string[],
) {
  if (query.length < 3) return [];

  const rows = await prisma.$queryRaw<Array<{ id: string; score: number }>>(
    buildGlobalSearchFuzzyQuery(userId, query, excludeIds),
  );

  return rows.map((row) => row.id);
}

export async function getGlobalSearchForUser(
  userId: string,
  query: string,
  onFuzzyDecision?: (used: boolean) => void,
): Promise<GlobalSearchData> {
  const contains = { contains: query, mode: 'insensitive' as const };

  const [exactTransactions, accounts, categories, importRules, catalogGroups] = await Promise.all([
    Promise.all(([
      { description: { equals: query, mode: 'insensitive' as const } },
      { description: { startsWith: query, mode: 'insensitive' as const } },
      { description: contains },
      { OR: [
        { merchant: { is: { userId, name: contains } } },
        { merchant: { is: { userId, aliases: { some: { userId, pattern: contains } } } } },
        { tagLinks: { some: { userId, tag: { name: { contains: query.replace(/^#/, ''), mode: 'insensitive' } } } } },
      ] },
    ] as Prisma.TransactionWhereInput[]).map((match) => prisma.transaction.findMany({
      where: { userId, ...match },
      select: {
        id: true,
        description: true,
        kind: true,
        status: true,
        transferRole: true,
        year: true,
        month: true,
        day: true,
        merchant: { select: { name: true, aliases: { where: { userId }, select: { pattern: true } } } },
        account: { select: { name: true } },
        category: { select: { name: true } },
        tagLinks: { where: { userId }, select: { tag: { select: { name: true } } } },
      },
      orderBy: [
        { year: 'desc' }, { month: 'desc' }, { day: 'desc' },
        { createdAt: 'desc' }, { id: 'desc' },
      ],
      take: GLOBAL_SEARCH_LIMIT_PER_GROUP,
    }))).then((batches) => [...new Map(batches.flat().map((item) => [item.id, item])).values()]),
    prisma.account.findMany({
      where: {
        userId,
        OR: [{ name: contains }, { description: contains }],
      },
      select: {
        id: true,
        name: true,
        description: true,
        type: true,
        currency: true,
        isActive: true,
      },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      take: GLOBAL_SEARCH_LIMIT_PER_GROUP * 10,
    }),
    prisma.category.findMany({
      where: {
        userId,
        OR: [{ name: contains }, { description: contains }],
      },
      select: {
        id: true,
        name: true,
        description: true,
        type: true,
        isActive: true,
      },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      take: GLOBAL_SEARCH_LIMIT_PER_GROUP * 10,
    }),
    prisma.transactionImportRule.findMany({
      where: {
        userId,
        OR: [
          { name: contains },
          { descriptionPattern: contains },
        ],
      },
      select: {
        id: true,
        name: true,
        descriptionPattern: true,
        isActive: true,
        category: { select: { name: true } },
      },
      orderBy: [{ priority: 'asc' }, { name: 'asc' }, { id: 'asc' }],
      take: GLOBAL_SEARCH_LIMIT_PER_GROUP * 10,
    }),
    searchNamedEntityGroups(userId, query),
  ]);

  const rankedExactTransactions = exactTransactions
    .map((item) => ({
      item,
      score: Math.max(
        relevance(item.description, query),
        relevance(item.merchant?.name ?? '', query) - 25,
        ...((item.merchant?.aliases ?? []).map((alias) => relevance(alias.pattern, query) - 50)),
        ...item.tagLinks.map((link) => relevance(link.tag.name, query.replace(/^#/, '')) - 75),
      ),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, GLOBAL_SEARCH_LIMIT_PER_GROUP)
    .map(({ item }) => item);

  const missingTransactionSlots =
    GLOBAL_SEARCH_LIMIT_PER_GROUP - rankedExactTransactions.length;
  onFuzzyDecision?.(missingTransactionSlots > 0 && query.length >= 3);
  const fuzzyIds =
    missingTransactionSlots > 0
      ? (
          await fuzzyTransactionIds(
            userId,
            query,
            rankedExactTransactions.map((item) => item.id),
          )
        ).slice(0, missingTransactionSlots)
      : [];

  const fuzzyTransactions =
    fuzzyIds.length > 0
      ? await prisma.transaction.findMany({
          where: { userId, id: { in: fuzzyIds } },
          select: {
            id: true,
            description: true,
            kind: true,
            status: true,
            transferRole: true,
            year: true,
            month: true,
            day: true,
            merchant: { select: { name: true, aliases: { where: { userId }, select: { pattern: true } } } },
            account: { select: { name: true } },
            category: { select: { name: true } },
            tagLinks: { where: { userId }, select: { tag: { select: { name: true } } } },
          },
        })
      : [];

  const fuzzyById = new Map(fuzzyTransactions.map((item) => [item.id, item]));
  const transactions = [
    ...rankedExactTransactions,
    ...fuzzyIds.flatMap((id) => {
      const item = fuzzyById.get(id);
      return item ? [item] : [];
    }),
  ];

  const groups: GlobalSearchGroup[] = [
    group(
      'TRANSACTION',
      transactions.map((item) => {
        const merchantMatch = item.merchant?.name && relevance(item.merchant.name, query) > 0;
        const aliasMatch = item.merchant?.aliases.find((alias) => relevance(alias.pattern, query) > 0);
        const tagMatch = item.tagLinks.find((link) => relevance(link.tag.name, query.replace(/^#/, '')) > 0);
        const matchedField = relevance(item.description, query) > 0 ? 'description' : merchantMatch ? 'merchant' : aliasMatch ? 'alias' : tagMatch ? 'tag' : 'fuzzy';
        const matchedText = matchedField === 'description' ? item.description : merchantMatch ? item.merchant?.name : aliasMatch?.pattern ?? tagMatch?.tag.name ?? null;
        return ({
        id: item.id,
        type: 'TRANSACTION',
        matchedField,
        matchedText,
        matchKind: matchedField === 'fuzzy' ? 'fuzzy' : relevance(matchedText ?? '', query.replace(/^#/, '')) === 400 ? 'exact' : relevance(matchedText ?? '', query.replace(/^#/, '')) === 300 ? 'prefix' : 'contains',
        title: item.description,
        subtitle: [
          item.kind === 'TRANSFER' ? `Transferência · ${item.transferRole === 'SOURCE' ? 'Origem' : 'Destino'}` : item.kind === 'CARD_PAYMENT' ? 'Pagamento de fatura' : 'Transação',
          item.status === 'PENDING' ? 'Pendente' : item.status === 'CANCELLED' ? 'Cancelada' : null,
          `${String(item.day).padStart(2, '0')}/${String(item.month).padStart(2, '0')}/${item.year}`,
          item.account.name,
          item.category?.name ?? null,
          merchantMatch || aliasMatch ? item.merchant?.name : null,
          aliasMatch ? `Alias: ${aliasMatch.pattern}` : null,
          ...item.tagLinks.map((link) => `#${link.tag.name}`),
        ]
          .filter(Boolean)
          .join(' · '),
        href: `/transacoes/show/${item.id}`,
      }); }),
    ),
    group(
      'ACCOUNT',
      rankNamedResults(accounts, query, (item) => item.description).map((item) => ({
        id: item.id,
        type: 'ACCOUNT',
        title: item.name,
        subtitle: `${item.currency} · ${item.isActive ? 'Ativa' : 'Inativa'}`,
        href: `/contas/show/${item.id}`,
      })),
    ),
    group(
      'CATEGORY',
      rankNamedResults(categories, query, (item) => item.description).map((item) => ({
        id: item.id,
        type: 'CATEGORY',
        title: item.name,
        subtitle: `${item.type === 'INCOME' ? 'Receita' : 'Despesa'} · ${item.isActive ? 'Ativa' : 'Inativa'}`,
        href: `/categorias/show/${item.id}`,
      })),
    ),
    group(
      'IMPORT_RULE',
      rankNamedResults(importRules, query, (item) => item.descriptionPattern).map((item) => ({
        id: item.id,
        type: 'IMPORT_RULE',
        title: item.name,
        subtitle: `${item.category.name} · ${item.descriptionPattern} · ${item.isActive ? 'Ativa' : 'Inativa'}`,
        href: `/transacoes/importar/regras?ruleId=${encodeURIComponent(item.id)}`,
      })),
    ),
    ...catalogGroups,
  ].filter((item) => item.items.length > 0);

  const total = groups.reduce((sum, current) => sum + current.items.length, 0);

  return {
    query,
    groups,
    total,
    limitPerGroup: GLOBAL_SEARCH_LIMIT_PER_GROUP,
    totalLimit: GLOBAL_SEARCH_TOTAL_LIMIT,
  };
}

export async function getGlobalSearch(request: Request) {
  const startedAt = performance.now();
  let queryLength = 0;
  let fuzzyUsed = false;
  try {
    const userId = await getAuthenticatedUserId();
    const { q } = parseRequest(request);
    queryLength = q.length;
    const rate = await consumeGlobalSearchRateLimit(userId);
    if (rate.limited) {
      emitSearchTelemetry({ durationMs: Math.round(performance.now() - startedAt), queryLength, fuzzyUsed, status: 'rate_limited' });
      return Response.json(
        { success: false, error: { code: 'GLOBAL_SEARCH_RATE_LIMITED', message: 'Muitas buscas. Tente novamente em instantes.' } },
        { status: 429, headers: { 'Retry-After': String(rate.retryAfterSeconds) } },
      );
    }
    const data = await getGlobalSearchForUser(userId, q, (used) => { fuzzyUsed = used; });
    emitSearchTelemetry({
      durationMs: Math.round(performance.now() - startedAt),
      queryLength, fuzzyUsed, status: 'ok',
      groupCounts: Object.fromEntries(data.groups.map((group) => [group.type, group.items.length])),
    });
    return success(data);
  } catch (error) {
    emitSearchTelemetry({ durationMs: Math.round(performance.now() - startedAt), queryLength, fuzzyUsed, status: 'error' });
    return apiFailureFromError(error, {
      fallbackMessage: 'Erro ao realizar busca',
      zodMessage: 'Busca inválida',
    });
  }
}
