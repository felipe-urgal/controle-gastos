import { Category } from "@prisma/client";

type CategoryWithCount = Category & { _count?: { transactions: number }};

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
    transactionsCount: category._count?.transactions ?? 0,
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
  };
};
