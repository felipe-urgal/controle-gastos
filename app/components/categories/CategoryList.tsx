"use client"

import { useState } from "react";
import { GenericList } from "@/app/components";
import { CategoryModel } from '@/app/types/category'

type CategoryListProps = {
  categories: CategoryModel[];
  onDeleteBatch: (ids: string[]) => void;
  onEdit: (category: CategoryModel) => void;
  isDeleting?: boolean;
  isEditing?: boolean;
};

const CategoryList = ({ 
  categories, 
  onDeleteBatch, 
  onEdit, 
  isDeleting = false, 
  isEditing = false 
}: CategoryListProps) => {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  const columns = [
    {
      key: 'name',
      header: 'Nome da Categoria',
      content: (category: CategoryModel) => (
        <span className="font-medium text-gray-900">
          {category.name}
        </span>
      ),
    },
  ];

  const handleSelectItem = (id: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedItems.size === categories.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(categories.map(cat => cat.id)));
    }
  };

  const handleDeleteBatch = () => {
    if (selectedItems.size > 0) {
      onDeleteBatch(Array.from(selectedItems));
    }
  };

  const handleEditItem = (category: CategoryModel) => {
    onEdit(category);
  };

  return (
    <GenericList
      items={categories}
      columns={columns}
      expandable={false}
      selectable={true}
      selectedItems={selectedItems}
      onSelectItem={handleSelectItem}
      onSelectAll={handleSelectAll}
      batchActions={{
        visible: selectedItems.size > 0,
        onDelete: handleDeleteBatch,
        deleteLabel: "Excluir",
        isDeleting: isDeleting,
        selectedCount: selectedItems.size
      }}
      itemActions={{
        onEdit: handleEditItem,
        editLabel: "Editar",
        isEditing: isEditing,
        showDelete: false,
        onDelete: undefined
      }}
    />
  );
};

export default CategoryList;
