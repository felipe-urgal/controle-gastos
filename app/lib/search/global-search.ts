import { success } from '@/app/lib/api-response';
import { apiFailureFromError } from '@/app/lib/api/api-error-response';
import { parseQuery } from '@/app/lib/api/query';
import { getAuthenticatedUserId } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';
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

export async function getGlobalSearchForUser(
  userId: string,
  query: string,
): Promise<GlobalSearchData> {
  const contains = { contains: query, mode: 'insensitive' as const };

  const [transactions, accounts, categories, importRules] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        userId,
        OR: [
          { description: contains },
          { tagLinks: { some: { userId, tag: { name: contains } } } },
        ],
      },
      select: {
        id: true,
        description: true,
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
          { normalizedDescription: contains },
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

  const groups: GlobalSearchGroup[] = [
    group(
      'TRANSACTION',
      transactions.map((item) => ({
        id: item.id,
        type: 'TRANSACTION',
        title: item.description,
        subtitle: [
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
    return success(await getGlobalSearchForUser(userId, q));
  } catch (error) {
    return apiFailureFromError(error, {
      fallbackMessage: 'Erro ao realizar busca',
      zodMessage: 'Busca inválida',
    });
  }
}
