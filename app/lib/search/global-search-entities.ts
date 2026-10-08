import { prisma } from '@/app/lib/prisma';
import { GLOBAL_SEARCH_LIMIT_PER_GROUP } from '@/app/lib/search/global-search-schema';
import type { GlobalSearchGroup } from '@/app/types/global-search';

// Named catalogs are independent and can be read in parallel without loading
// balances, target amounts, installment values or large relations.
export async function searchNamedEntityGroups(
  userId: string,
  query: string,
): Promise<GlobalSearchGroup[]> {
  const contains = { contains: query, mode: 'insensitive' as const };
  const tagContains = { contains: query.replace(/^#/, ''), mode: 'insensitive' as const };

  const [merchants, tags, debts, templates, goals] = await Promise.all([
    prisma.merchant.findMany({
      where: { userId, name: contains },
      select: { id: true, name: true, isActive: true },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      take: GLOBAL_SEARCH_LIMIT_PER_GROUP,
    }),
    prisma.tag.findMany({
      where: { userId, name: tagContains },
      select: { id: true, name: true, isActive: true },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      take: GLOBAL_SEARCH_LIMIT_PER_GROUP,
    }),
    prisma.debt.findMany({
      where: { userId, OR: [{ name: contains }, { institution: contains }] },
      select: { id: true, name: true, status: true },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      take: GLOBAL_SEARCH_LIMIT_PER_GROUP,
    }),
    prisma.transactionTemplate.findMany({
      where: { userId, OR: [{ name: contains }, { description: contains }] },
      select: {
        id: true, name: true, isFavorite: true,
        account: { select: { isActive: true } },
        category: { select: { isActive: true } },
      },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      take: GLOBAL_SEARCH_LIMIT_PER_GROUP,
    }),
    prisma.financialGoal.findMany({
      where: { userId, OR: [{ name: contains }, { description: contains }] },
      select: { id: true, name: true, status: true },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      take: GLOBAL_SEARCH_LIMIT_PER_GROUP,
    }),
  ]);

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
      items: debts.map((item) => ({
        id: item.id, type: 'DEBT', title: item.name,
        subtitle: item.status === 'ACTIVE' ? 'Ativa' : item.status === 'PAID' ? 'Quitada' : 'Arquivada',
        href: `/dividas?debtId=${encodeURIComponent(item.id)}`,
      })),
    },
    {
      type: 'TEMPLATE',
      items: templates.map((item) => ({
        id: item.id, type: 'TEMPLATE', title: item.name,
        subtitle: [
          item.isFavorite ? 'Favorito' : 'Modelo',
          item.account && !item.account.isActive ? 'Conta inativa' : null,
          item.category && !item.category.isActive ? 'Categoria inativa' : null,
        ].filter(Boolean).join(' · '),
        href: `/modelos?templateId=${encodeURIComponent(item.id)}`,
      })),
    },
    {
      type: 'GOAL',
      items: goals.map((item) => ({
        id: item.id, type: 'GOAL', title: item.name,
        subtitle: item.status === 'ACTIVE' ? 'Ativa' : item.status === 'COMPLETED' ? 'Concluída' : 'Arquivada',
        href: `/metas?goalId=${encodeURIComponent(item.id)}`,
      })),
    },
  ];
  return groups.filter((group) => group.items.length > 0);
}
