import { prisma } from '@/app/lib/prisma';
import { scoreGlobalSearchMatch } from '@/app/lib/search/global-search-ranking';
import { GLOBAL_SEARCH_LIMIT_PER_GROUP } from '@/app/lib/search/global-search-schema';
import type { GlobalSearchGroup } from '@/app/types/global-search';

const CANDIDATE_LIMIT = GLOBAL_SEARCH_LIMIT_PER_GROUP * 10;

// Fetch a bounded set normally. When it is full, include name-prefix matches
// so that an exact/prefix record does not disappear behind 50 alphabetical hits.
async function fetchCandidates<T extends { id: string }>(
  load: () => Promise<T[]>,
  loadPrefix: () => Promise<T[]>,
): Promise<T[]> {
  const rows = await load();
  if (rows.length < CANDIDATE_LIMIT) return rows;
  const prefixes = await loadPrefix();
  return [...new Map([...rows, ...prefixes].map((item) => [item.id, item])).values()];
}

function rankCatalog<T extends { id: string; name: string }>(
  rows: T[],
  term: string,
  secondary: (item: T) => string | null = () => null,
  active: (item: T) => boolean = () => true,
): T[] {
  return rows.map((item) => ({
    item,
    score: Math.max(
      scoreGlobalSearchMatch(item.name, term),
      scoreGlobalSearchMatch(secondary(item) ?? '', term) - 25,
    ),
  })).sort((a, b) =>
    b.score - a.score ||
    Number(active(b.item)) - Number(active(a.item)) ||
    a.item.name.localeCompare(b.item.name, 'pt-BR') ||
    a.item.id.localeCompare(b.item.id)
  ).slice(0, GLOBAL_SEARCH_LIMIT_PER_GROUP).map(({ item }) => item);
}

// Catalogs are independent and never load monetary fields or large relations.
export async function searchNamedEntityGroups(
  userId: string,
  query: string,
): Promise<GlobalSearchGroup[]> {
  const contains = { contains: query, mode: 'insensitive' as const };
  const prefix = { startsWith: query, mode: 'insensitive' as const };
  const tagQuery = query.replace(/^#/, '');
  const tagContains = { contains: tagQuery, mode: 'insensitive' as const };
  const tagPrefix = { startsWith: tagQuery, mode: 'insensitive' as const };
  const take = CANDIDATE_LIMIT;
  const orderBy = [{ name: 'asc' as const }, { id: 'asc' as const }];
  const merchantSelect = { id: true, name: true, isActive: true } as const;
  const tagSelect = { id: true, name: true, isActive: true } as const;
  const debtSelect = { id: true, name: true, institution: true, status: true } as const;
  const templateSelect = {
    id: true, name: true, description: true, isFavorite: true,
    account: { select: { isActive: true } },
    category: { select: { isActive: true } },
  } as const;
  const goalSelect = { id: true, name: true, description: true, status: true } as const;

  const [rawMerchants, rawTags, rawDebts, rawTemplates, rawGoals] = await Promise.all([
    fetchCandidates(
      () => prisma.merchant.findMany({ where: { userId, name: contains }, select: merchantSelect, orderBy, take }),
      () => prisma.merchant.findMany({ where: { userId, name: prefix }, select: merchantSelect, orderBy, take: GLOBAL_SEARCH_LIMIT_PER_GROUP }),
    ),
    fetchCandidates(
      () => prisma.tag.findMany({ where: { userId, name: tagContains }, select: tagSelect, orderBy, take }),
      () => prisma.tag.findMany({ where: { userId, name: tagPrefix }, select: tagSelect, orderBy, take: GLOBAL_SEARCH_LIMIT_PER_GROUP }),
    ),
    fetchCandidates(
      () => prisma.debt.findMany({ where: { userId, OR: [{ name: contains }, { institution: contains }] }, select: debtSelect, orderBy, take }),
      () => prisma.debt.findMany({ where: { userId, name: prefix }, select: debtSelect, orderBy, take: GLOBAL_SEARCH_LIMIT_PER_GROUP }),
    ),
    fetchCandidates(
      () => prisma.transactionTemplate.findMany({ where: { userId, OR: [{ name: contains }, { description: contains }] }, select: templateSelect, orderBy, take }),
      () => prisma.transactionTemplate.findMany({ where: { userId, name: prefix }, select: templateSelect, orderBy, take: GLOBAL_SEARCH_LIMIT_PER_GROUP }),
    ),
    fetchCandidates(
      () => prisma.financialGoal.findMany({ where: { userId, OR: [{ name: contains }, { description: contains }] }, select: goalSelect, orderBy, take }),
      () => prisma.financialGoal.findMany({ where: { userId, name: prefix }, select: goalSelect, orderBy, take: GLOBAL_SEARCH_LIMIT_PER_GROUP }),
    ),
  ]);

  const merchants = rankCatalog(rawMerchants, query, () => null, (item) => item.isActive);
  const tags = rankCatalog(rawTags, tagQuery, () => null, (item) => item.isActive);
  const debts = rankCatalog(rawDebts, query, (item) => item.institution, (item) => item.status === 'ACTIVE');
  const templates = rankCatalog(rawTemplates, query, (item) => item.description);
  const goals = rankCatalog(rawGoals, query, (item) => item.description, (item) => item.status === 'ACTIVE');

  const groups: GlobalSearchGroup[] = [
    {
      type: 'MERCHANT',
      items: merchants.map((item) => ({
        id: item.id, type: 'MERCHANT', title: item.name,
        subtitle: item.isActive ? 'Ativo' : 'Inativo',
        href: `/estabelecimentos?merchantId=${encodeURIComponent(item.id)}`,
      })),
    },
    {
      type: 'TAG',
      items: tags.map((item) => ({
        id: item.id, type: 'TAG', title: `#${item.name}`,
        subtitle: item.isActive ? 'Ativa' : 'Arquivada',
        href: `/tags?tagId=${encodeURIComponent(item.id)}`,
      })),
    },
    {
      type: 'DEBT',
      items: debts.map((item) => {
        const matchInstitution = !scoreGlobalSearchMatch(item.name, query) &&
          !!item.institution && scoreGlobalSearchMatch(item.institution, query) > 0;
        return {
          id: item.id, type: 'DEBT', title: item.name,
          subtitle: [
            item.status === 'ACTIVE' ? 'Ativa' : item.status === 'PAID' ? 'Quitada' : 'Arquivada',
            matchInstitution ? `Instituição: ${item.institution}` : null,
          ].filter(Boolean).join(' · '),
          ...(matchInstitution ? { matchedField: 'institution', matchedText: item.institution } : {}),
          href: `/dividas?debtId=${encodeURIComponent(item.id)}`,
        };
      }),
    },
    {
      type: 'TEMPLATE',
      items: templates.map((item) => {
        const matchDescription = !scoreGlobalSearchMatch(item.name, query) &&
          !!item.description && scoreGlobalSearchMatch(item.description, query) > 0;
        return {
          id: item.id, type: 'TEMPLATE', title: item.name,
          subtitle: [
            item.isFavorite ? 'Favorito' : 'Modelo',
            item.account && !item.account.isActive ? 'Conta inativa' : null,
            item.category && !item.category.isActive ? 'Categoria inativa' : null,
            matchDescription ? 'Correspondência na descrição' : null,
          ].filter(Boolean).join(' · '),
          // Never echo freeform descriptions: users may include amounts in them.
          ...(matchDescription ? { matchedField: 'description', matchedText: query } : {}),
          href: `/modelos?templateId=${encodeURIComponent(item.id)}`,
        };
      }),
    },
    {
      type: 'GOAL',
      items: goals.map((item) => {
        const matchDescription = !scoreGlobalSearchMatch(item.name, query) &&
          !!item.description && scoreGlobalSearchMatch(item.description, query) > 0;
        return {
          id: item.id, type: 'GOAL', title: item.name,
          subtitle: [
            item.status === 'ACTIVE' ? 'Ativa' : item.status === 'COMPLETED' ? 'Concluída' : 'Arquivada',
            matchDescription ? 'Correspondência na descrição' : null,
          ].filter(Boolean).join(' · '),
          // Never echo freeform descriptions: users may include amounts in them.
          ...(matchDescription ? { matchedField: 'description', matchedText: query } : {}),
          href: `/metas?goalId=${encodeURIComponent(item.id)}`,
        };
      }),
    },
  ];
  return groups.filter((group) => group.items.length > 0);
}
