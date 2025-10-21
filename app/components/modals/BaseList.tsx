// app/components/lists/BaseList.tsx
'use client';

import { ReactNode } from 'react';

import { Button } from '@/app/components';

import { useThemeColors } from '@/app/hook';

interface BaseListProps<T> {
  filteredItems: T[];
  loading: boolean;
  emptyIcon: ReactNode;
  emptyTitle: string;
  emptyDescription: string;
  addButtonText: string;
  onAdd: () => void;
  renderItem: (item: T) => ReactNode;
  itemName?: string;
}

export default function BaseList<T extends { id: string; isActive: boolean }>({
  filteredItems,
  loading,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  addButtonText,
  onAdd,
  renderItem,
  itemName = 'item'
}: BaseListProps<T>) {
  const colors = useThemeColors();

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className={`mt-2 ${colors.text.tertiary}`}>Carregando {itemName}s...</p>
      </div>
    );
  }

  if (filteredItems.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        {emptyIcon}
        <h3 className={`text-lg font-medium ${colors.text.primary} mb-2`}>
          {emptyTitle}
        </h3>
        <p className={`text-center ${colors.text.tertiary} mb-4 max-w-sm`}>
          {emptyDescription}
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={onAdd}
          className="border border-dashed hover:border-solid"
        >
          {addButtonText}
        </Button>
      </div>
    );
  }

  return (
    <div className="p-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filteredItems.map((item) => renderItem(item))}
      </div>
    </div>
  );
}
