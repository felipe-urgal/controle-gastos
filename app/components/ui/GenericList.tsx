"use client"

import React, { ReactNode, useState } from "react";
import { FaChevronDown, FaTrash, FaPencilAlt } from 'react-icons/fa';

type ColumnConfig<T> = {
  key: string;
  header: string | ReactNode;
  content: (item: T) => ReactNode;
  className?: string;
  hidden?: boolean;
};

type BatchActionsConfig = {
  visible: boolean;
  onDelete?: () => void;
  onEdit?: () => void;
  deleteLabel?: string;
  editLabel?: string;
  isDeleting?: boolean;
  isEditing?: boolean;
  selectedCount?: number;
  className?: string;
};

type ItemActionsConfig<T> = {
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  editLabel?: string;
  deleteLabel?: string;
  isEditing?: boolean;
  isDeleting?: boolean;
  showEdit?: boolean;
  showDelete?: boolean;
};

type GenericListProps<T> = {
  items: T[];
  columns: ColumnConfig<T>[];
  renderItemActions?: (item: T) => ReactNode;
  expandable?: boolean;
  renderExpandedContent?: (item: T) => ReactNode;
  itemClassName?: string;
  expandedItems?: Set<string>;
  onToggleExpand?: (id: string) => void;
  selectable?: boolean;
  selectedItems?: Set<string>;
  onSelectItem?: (id: string) => void;
  onSelectAll?: () => void;
  batchActions?: BatchActionsConfig;
  itemActions?: ItemActionsConfig<T>;
};

const GenericList = <T extends { id: string }>({
  items,
  columns,
  renderItemActions,
  expandable = false,
  renderExpandedContent,
  itemClassName = "",
  expandedItems,
  onToggleExpand,
  selectable = false,
  selectedItems = new Set(),
  onSelectItem,
  onSelectAll,
  batchActions,
  itemActions = {
    showEdit: true,
    showDelete: true,
    editLabel: "Editar",
    deleteLabel: "Excluir"
  },
}: GenericListProps<T>) => {
  const [internalExpandedItems, setInternalExpandedItems] = useState<Set<string>>(new Set());
  const [internalSelectedItems, setInternalSelectedItems] = useState<Set<string>>(new Set());

  const currentExpandedItems = expandedItems || internalExpandedItems;
  const currentSelectedItems = selectedItems || internalSelectedItems;

  const toggleExpand = (id: string) => {
    if (onToggleExpand) {
      onToggleExpand(id);
    } else {
      const newExpanded = new Set(internalExpandedItems);
      if (newExpanded.has(id)) {
        newExpanded.delete(id);
      } else {
        newExpanded.add(id);
      }
      setInternalExpandedItems(newExpanded);
    }
  };

  const toggleSelect = (id: string) => {
    if (onSelectItem) {
      onSelectItem(id);
    } else {
      const newSelected = new Set(internalSelectedItems);
      if (newSelected.has(id)) {
        newSelected.delete(id);
      } else {
        newSelected.add(id);
      }
      setInternalSelectedItems(newSelected);
    }
  };

  const toggleSelectAll = () => {
    if (onSelectAll) {
      onSelectAll();
    } else {
      if (currentSelectedItems.size === items.length) {
        setInternalSelectedItems(new Set());
      } else {
        setInternalSelectedItems(new Set(items.map(item => item.id)));
      }
    }
  };

  const isExpanded = (id: string) => currentExpandedItems.has(id);
  const isSelected = (id: string) => currentSelectedItems.has(id);

  const visibleColumns = columns.filter(column => !column.hidden);
  const allSelected = items.length > 0 && currentSelectedItems.size === items.length;
  const someSelected = currentSelectedItems.size > 0 && currentSelectedItems.size < items.length;

  const renderDefaultItemActions = (item: T) => (
    <div className="flex items-center space-x-2">
      <button
        onClick={(e) => {
          e.stopPropagation();
          itemActions.onEdit?.(item);
        }}
        disabled={itemActions.isEditing}
        className="p-2 rounded-md bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
        aria-label={itemActions.editLabel}
        title={itemActions.editLabel}
      >
        <FaPencilAlt size={12} />
      </button>
      {expandable && (
        <button 
          className="cursor-pointer p-2 rounded-lg bg-white border border-gray-200 hover:bg-blue-50 text-blue-500 hover:text-blue-600 transition-all duration-200 shadow-sm"
          onClick={(e) => {
            e.stopPropagation();
            toggleExpand(item.id)
          }}
        >
          <FaChevronDown
            size={12}
            className={`transition-transform duration-300 ${
              isExpanded(item.id) ? "rotate-180 text-blue-500" : "rotate-0 text-gray-400 hover:text-blue-500"
            }`}
          />
        </button>
      )}
    </div>
  );

  return (
    <>
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-gray-400 py-4 bg-white/70 rounded-md">
          <h3 className="text-sm font-medium text-gray-900">Nenhum registro encontrado</h3>
        </div>
      ) : (
        <div className="overflow-hidden">
          {batchActions?.visible && (
            <div className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {batchActions.onDelete && (
                    <button
                      onClick={batchActions.onDelete}
                      disabled={batchActions.isDeleting || currentSelectedItems.size === 0}
                      className="px-3 py-1.5 rounded-md bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white text-sm font-medium shadow-lg shadow-rose-500/20 hover:shadow-rose-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center space-x-2"
                    >
                      {batchActions.isDeleting ? (
                        <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      ) : (
                        <FaTrash size={12} />
                      )}
                      <span>{batchActions.deleteLabel || "Excluir"}</span>
                      <span className="flex h-5 w-5 items-center justify-center rounded-full 
                            bg-rose-100/80 text-rose-700 text-xs font-semibold
                            group-hover:bg-rose-200/80 group-hover:text-rose-800
                            transition-colors duration-300">
                        {selectedItems.size}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="overflow-x-auto rounded-lg">
            <table className="w-full rounded-lg">
              <thead className="bg-gradient-to-br from-indigo-800 via-purple-800 to-pink-700">
                <tr>
                  {selectable && currentSelectedItems.size > 0 && (
                    <th className="px-3 py-2 w-12 text-left">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          ref={input => {
                            if (input) {
                              input.indeterminate = someSelected;
                            }
                          }}
                          onChange={toggleSelectAll}
                          className="h-4 w-4 rounded-lg border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </div>
                    </th>
                  )}
                  
                  {visibleColumns.map(column => (
                    <th 
                      key={column.key}
                      className={`px-3 py-2 text-left text-xs font-semibold text-white tracking-wider ${column.className || ''}`}
                    >
                      {column.header}
                    </th>
                  ))}

                  <th></th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {items.length === 0 ? (
                  <tr>
                    <td className="px-3 py-2">
                      <div className="flex flex-col items-center justify-center text-gray-400">
                        <h3 className="text-sm font-medium text-gray-500">Nenhum registro encontrado</h3>
                      </div>
                    </td>
                  </tr>
                ) : (
                  items.map(item => (
                    <React.Fragment key={item.id}>
                      <tr 
                        className={`group transition-all duration-200 cursor-pointer
                          ${isSelected(item.id) 
                            ? 'bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border-l-4 border-blue-400 shadow-lg shadow-blue-100/50' 
                            : 'bg-gradient-to-br from-white to-gray-50/80 hover:bg-gradient-to-r hover:from-purple-50/60 hover:to-pink-50/60'
                          }
                          ${itemClassName}
                        `}
                        onClick={() => selectable && toggleSelect(item.id)}
                      >
                        {selectable && currentSelectedItems.size > 0 && (
                          <td className="px-3 py-2">
                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                checked={isSelected(item.id)}
                                onChange={() => toggleSelect(item.id)}
                                className="h-4 w-4 rounded-lg border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                            </div>
                          </td>
                        )}
                        
                        {visibleColumns.map(column => (
                          <td 
                            key={`${item.id}-${column.key}`}
                            className={`px-3 py-2 text-sm text-gray-900 ${column.className || ''}`}
                          >
                            {column.content(item)}
                          </td>
                        ))}

                        {(renderItemActions || itemActions.onEdit || itemActions.onDelete) && (
                          <td className="px-3 py-2">
                            <div className="flex items-center justify-end space-x-1">
                              {renderItemActions 
                                ? renderItemActions(item)
                                : renderDefaultItemActions(item)
                              }
                            </div>
                          </td>
                        )}
                      </tr>

                      {expandable && isExpanded(item.id) && renderExpandedContent && (
                        <tr>
                          <td 
                            colSpan={visibleColumns.length + (selectable ? 1 : 0) + ((renderItemActions || expandable) ? 1 : 0)} 
                            className="px-3 py-2 bg-gray-50"
                          >
                            
                            {renderExpandedContent(item)}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
};

export default GenericList;
