import { success } from '@/app/lib/api-response';
import { apiFailureFromError } from '@/app/lib/api/api-error-response';
import { parseQuery } from '@/app/lib/api/query';
import { getAuthenticatedUserId } from '@/app/lib/auth';
import { Prisma } from '@prisma/client';

import { prisma } from '@/app/lib/prisma';
import { consumeGlobalSearchRateLimit } from '@/app/lib/search/global-search-rate-limit';
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

async function fuzzyTransactionIds(
  userId: string,
  query: string,
  excludeIds: string[],
) {
  if (query.length < 3) return [];

  const rows = await prisma.$queryRaw<Array<{ id: string; score: number }>>(
    Prisma.sql`
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
    `,
  );

  return rows.map((row) => row.id);
}

export async function getGlobalSearchForUser(
  userId: string,
  query: string,
): Promise<GlobalSearchData> {
  const contains = { contains: query, mode: 'insensitive' as const };

  const [exactTransactions, accounts, categories, importRules] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        userId,
        OR: [
          { description: contains },
          { merchant: { is: { userId, name: contains } } },
          {
            merchant: {
              is: {
                userId,
                aliases: { some: { userId, pattern: contains } },
              },
            },
          },
          { tagLinks: { some: { userId, tag: { name: contains } } } },
        ],
      },
      select: {
        id: true,
        description: true,
        kind: true,
        status: true,
        transferRole: true,
        year: true,
        month: true,
        day: true,
        account: { select: { name: true } },
        category: { select: { name: true } },
        tagLinks: { select: { tag: { select: { name: true } } }, take: 3 },
      },
      orderBy: [
        { year: 'desc' },
        { month: 'desc' },
        { day: 'desc' },
        { createdAt: 'desc' },
        { id: 'desc' },
      ],
      take: GLOBAL_SEARCH_LIMIT_PER_GROUP,
    }),
    prisma.account.findMany({
      where: {
        userId,
        OR: [{ name: contains }, { description: contains }],
      },
      select: {
        id: true,
        name: true,
        type: true,
        currency: true,
        isActive: true,
      },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      take: GLOBAL_SEARCH_LIMIT_PER_GROUP,
    }),
    prisma.category.findMany({
      where: {
        userId,
        OR: [{ name: contains }, { description: contains }],
      },
      select: {
        id: true,
        name: true,
        type: true,
        isActive: true,
      },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      take: GLOBAL_SEARCH_LIMIT_PER_GROUP,
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
      take: GLOBAL_SEARCH_LIMIT_PER_GROUP,
    }),
  ]);

  const missingTransactionSlots =
    GLOBAL_SEARCH_LIMIT_PER_GROUP - exactTransactions.length;
  const fuzzyIds =
    missingTransactionSlots > 0
      ? (
          await fuzzyTransactionIds(
            userId,
            query,
            exactTransactions.map((item) => item.id),
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
            account: { select: { name: true } },
            category: { select: { name: true } },
            tagLinks: { select: { tag: { select: { name: true } } }, take: 3 },
          },
        })
      : [];

  const fuzzyById = new Map(fuzzyTransactions.map((item) => [item.id, item]));
  const transactions = [
    ...exactTransactions,
    ...fuzzyIds.flatMap((id) => {
      const item = fuzzyById.get(id);
      return item ? [item] : [];
    }),
  ];

  const groups: GlobalSearchGroup[] = [
    group(
      'TRANSACTION',
      transactions.map((item) => ({
        id: item.id,
        type: 'TRANSACTION',
        title: item.description,
        subtitle: [
          item.kind === 'TRANSFER' ? `Transferência · ${item.transferRole === 'SOURCE' ? 'Origem' : 'Destino'}` : item.kind === 'CARD_PAYMENT' ? 'Pagamento de fatura' : 'Transação',
          item.status === 'PENDING' ? 'Pendente' : item.status === 'CANCELLED' ? 'Cancelada' : null,
          `${String(item.day).padStart(2, '0')}/${String(item.month).padStart(2, '0')}/${item.year}`,
          item.account.name,
          item.category?.name ?? null,
          ...item.tagLinks.map((link) => `#${link.tag.name}`),
        ]
          .filter(Boolean)
          .join(' · '),
        href: `/transacoes/show/${item.id}`,
      })),
    ),
    group(
      'ACCOUNT',
      accounts.map((item) => ({
        id: item.id,
        type: 'ACCOUNT',
        title: item.name,
        subtitle: `${item.currency} · ${item.isActive ? 'Ativa' : 'Inativa'}`,
        href: `/contas/show/${item.id}`,
      })),
    ),
    group(
      'CATEGORY',
      categories.map((item) => ({
        id: item.id,
        type: 'CATEGORY',
        title: item.name,
        subtitle: `${item.type === 'INCOME' ? 'Receita' : 'Despesa'} · ${item.isActive ? 'Ativa' : 'Inativa'}`,
        href: `/categorias/show/${item.id}`,
      })),
    ),
    group(
      'IMPORT_RULE',
      importRules.map((item) => ({
        id: item.id,
        type: 'IMPORT_RULE',
        title: item.name,
        subtitle: `${item.category.name} · ${item.descriptionPattern} · ${item.isActive ? 'Ativa' : 'Inativa'}`,
        href: '/transacoes/importar/regras',
      })),
    ),
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
  try {
    const userId = await getAuthenticatedUserId();
    const { q } = parseRequest(request);
    const rate = await consumeGlobalSearchRateLimit(userId);
    if (rate.limited) {
      return Response.json(
        { success: false, error: { code: 'GLOBAL_SEARCH_RATE_LIMITED', message: 'Muitas buscas. Tente novamente em instantes.' } },
        { status: 429, headers: { 'Retry-After': String(rate.retryAfterSeconds) } },
      );
    }
    return success(await getGlobalSearchForUser(userId, q));
  } catch (error) {
    return apiFailureFromError(error, {
      fallbackMessage: 'Erro ao realizar busca',
      zodMessage: 'Busca inválida',
    });
  }
}
