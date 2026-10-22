import type { Category } from "@prisma/client";

import type { CategoryActivity } from "@/app/lib/categories/category-activity";

type CategoryWithCount = Category & {
  _count?: { transactions: number };
  transactionsCount?: number;
  activity?: CategoryActivity;
};

export function toCategoryDTO(category: CategoryWithCount) {
  return {
    id: category.id,
    name: category.name,
    color: category.color,
    icon: category.icon,
    isActive: category.isActive,
    type: category.type,
    description: category.description,
    position: category.position,
    transactionsCount:
      category.transactionsCount ?? category._count?.transactions ?? 0,
    /** Só vem na leitura de uma categoria. */
    activity: category.activity ?? null,
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
  };
}
