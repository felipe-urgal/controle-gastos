"use client"

import { useState } from "react";
import { GenericList } from "@/app/components";
import { CategoryModel } from '@/app/types/category'
import { FaTrash, FaPencilAlt } from "react-icons/fa";

type CategoryListProps = {
  categories: CategoryModel[];
  onDeleteBatch: (ids: string[]) => void;
  isDeleting?: boolean;
  onEdit: (category: CategoryModel) => void; // Função para abrir o modal de edição
};

const CategoryList = ({ categories, onDeleteBatch, isDeleting = false, onEdit }: CategoryListProps) => {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  const columns = [
    {
      key: 'name',
      header: 'Nome da Categoria',
      content: (category: CategoryModel) => category.name,
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

  // Ação para editar - agora abre o modal em vez de navegar
  const renderItemActions = (category: CategoryModel) => (
    <div className="flex items-center space-x-1">
      <button
        onClick={(e) => {
          e.stopPropagation();
          onEdit(category); // Chama a função para abrir o modal de edição
        }}
        className="cursor-pointer p-1.5 sm:p-2 rounded-lg bg-white border border-gray-200 hover:bg-blue-50 text-blue-500 hover:text-blue-600 transition-all duration-200 shadow-sm"
        aria-label="Editar categoria"
        title="Editar categoria"
      >
        <FaPencilAlt className="h-3 w-3" />
      </button>
    </div>
  );

  const batchActions = (
    <div className="flex items-center space-x-3">
      <button
        onClick={handleDeleteBatch}
        disabled={isDeleting || selectedItems.size === 0}
        className="flex items-center space-x-2 px-4 py-2.5 
                   bg-white/90 backdrop-blur-sm 
                   text-rose-700 
                   rounded-xl 
                   hover:bg-rose-50/80 
                   hover:border-rose-300/70
                   hover:text-rose-800
                   hover:shadow-lg hover:shadow-rose-100/50
                   disabled:opacity-40 
                   disabled:cursor-not-allowed 
                   disabled:hover:bg-white/90
                   disabled:hover:text-rose-700
                   disabled:hover:shadow-none
                   transition-all duration-300 
                   group"
      >
        <div className="relative">
          <FaTrash className="h-3 w-3 transition-transform duration-300" />
          {isDeleting && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-rose-300 border-t-rose-600"></div>
            </div>
          )}
        </div>
        <span className="text-sm font-medium">Excluir</span>
        
        {/* Badge elegante com contador */}
        <span className="flex h-5 w-5 items-center justify-center rounded-full 
                        bg-rose-100/80 text-rose-700 text-xs font-semibold
                        group-hover:bg-rose-200/80 group-hover:text-rose-800
                        transition-colors duration-300">
          {selectedItems.size}
        </span>
      </button>
    </div>
  );

  return (
    <GenericList
      items={categories}
      columns={columns}
      expandable={false}
      renderItemActions={renderItemActions}
      selectable={true}
      selectedItems={selectedItems}
      onSelectItem={handleSelectItem}
      onSelectAll={handleSelectAll}
      batchActions={batchActions}
    />
  );
};

export default CategoryList;
