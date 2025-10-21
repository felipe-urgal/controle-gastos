// app/components/categories/CategoryCard.tsx
'use client';

import { CategoryModel } from '@/app/types/category';

import { BaseCard, IconRenderer } from '@/app/components';

interface CategoryCardProps {
  category: CategoryModel;
  onEdit: (category: CategoryModel) => void;
  onDelete?: (id: string) => void;
  onToggleActive?: (category: CategoryModel) => void;
  isDeleting?: boolean;
  isToggling?: boolean;
  clickable?: boolean;
  compact?: boolean;
}

export default function CategoryCard({
  category,
  onEdit,
  onDelete,
  onToggleActive,
  isDeleting,
  isToggling,
  clickable = true,
  compact = false
}: CategoryCardProps) {
  const typeLabels: { [key: string]: string } = {
    INCOME: 'Receita',
    EXPENSE: 'Despesa',
  };

  return (
    <BaseCard
      // Dados principais
      title={category.name}
      description={category.description}
      color={category.color}
      icon={category.icon || 'tag'}
      iconRenderer={(iconName, size) => (
        <IconRenderer iconName={iconName} size={size} />
      )}
      
      // Status e tipo
      isActive={category.isActive}
      type={category.type}
      typeLabels={typeLabels}

      // Ações
      onEdit={() => onEdit(category)}
      onToggleActive={onToggleActive ? () => onToggleActive(category) : undefined}
      onDelete={onDelete ? () => onDelete(category.id) : undefined}
      
      // Estados
      isDeleting={isDeleting}
      isToggling={isToggling}
      
      // Configurações
      clickable={clickable}
      compact={compact}
      showBalance={false}
    />
  );
}