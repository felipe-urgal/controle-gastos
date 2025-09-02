"use client"

import React, { ReactNode, useState } from "react";
import { FaChevronDown, FaCheck } from 'react-icons/fa';

type ColumnConfig<T> = {
  key: string;
  header: string | ReactNode;
  content: (item: T) => ReactNode;
  className?: string;
  hidden?: boolean;
};

type SummaryConfig = {
  content: ReactNode;
  colSpan?: number;
  className?: string;
};

type GenericListProps<T> = {
  items: T[];
  columns: ColumnConfig<T>[];
  renderItemActions?: (item: T) => ReactNode;
  headerSummary?: SummaryConfig[];
  footerSummary?: SummaryConfig[];
  expandable?: boolean;
  renderExpandedContent?: (item: T) => ReactNode;
  itemClassName?: string;
  headerClassName?: string;
  expandedItems?: Set<string>;
  onToggleExpand?: (id: string) => void;
  title?: string;
  description?: string;
  selectable?: boolean;
  selectedItems?: Set<string>;
  onSelectItem?: (id: string) => void;
  onSelectAll?: () => void;
  batchActions?: ReactNode;
};

const GenericList = <T extends { id: string }>({
  items,
  columns,
  renderItemActions,
  headerSummary,
  footerSummary,
  expandable = false,
  renderExpandedContent,
  itemClassName = "",
  headerClassName = "",
  expandedItems,
  onToggleExpand,
  title,
  description,
  selectable = false,
  selectedItems = new Set(),
  onSelectItem,
  onSelectAll,
  batchActions,
}: GenericListProps<T>) => {
  const [internalExpandedItems, setInternalExpandedItems] = useState<Set<string>>(new Set());
  const [internalSelectedItems, setInternalSelectedItems] = useState<Set<string>>(new Set());

  // Usar expandedItems controlado externamente ou estado interno
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

  return (
    <div className="overflow-hidden">
      {/* Batch Actions Bar */}
      {selectable && currentSelectedItems.size > 0 && batchActions && (
        <div className="bg-blue-50 border-b border-blue-200 px-4 py-1">
          <div className="flex items-center justify-end">
            {/*<div className="text-sm text-blue-800">
              {currentSelectedItems.size} item{currentSelectedItems.size !== 1 ? 's' : ''} selecionado{currentSelectedItems.size !== 1 ? 's' : ''}
            </div>*/}
            <div className="flex items-center space-x-2">
              {batchActions}
            </div>
          </div>
        </div>
      )}

      {/* Header with title and description */}
      {(title || description) && (
        <div className="px-4 sm:px-6 lg:px-8 pt-4 pb-2 border-b border-gray-100">
          {title && <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-1">{title}</h2>}
          {description && <p className="text-sm text-gray-500">{description}</p>}
        </div>
      )}
      
      {/* Header Summary */}
      {headerSummary && items.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100 px-4 sm:px-6 lg:px-8 py-3">
          <div className="grid grid-cols-12 gap-3">
            {headerSummary.map((summary, index) => (
              <div 
                key={`header-summary-${index}`}
                className={`col-span-${summary.colSpan || 12} ${summary.className || ''}`}
              >
                <div className="text-xs sm:text-sm font-medium text-gray-700">
                  {summary.content}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="overflow-x-visible">
        <table className="w-full">
          {/* Main Header */}
          <thead className={`bg-gradient-to-br from-indigo-800 via-purple-800 to-pink-700 bg-opacity-80 text-pink-200 ${headerClassName}`}>
            <tr>
              {selectable && (
                <th className="px-3 py-3 w-12">
                  <div className="flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={input => {
                        if (input) {
                          input.indeterminate = someSelected;
                        }
                      }}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 rounded-4"
                    />
                  </div>
                </th>
              )}
              {visibleColumns.map(column => (
                <th 
                  key={`header-${column.key}`}
                  className={`px-4 sm:px-6 py-3 text-left font-semibold tracking-wider text-xs sm:text-sm text-gray-100 ${column.className || ''}`}
                >
                  <div className="flex items-center">
                    {column.header}
                  </div>
                </th>
              ))}
              {(renderItemActions || expandable) && (
                <th className="px-4 sm:px-6 py-3 w-24"></th>
              )}
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-gray-100">
            {items.length === 0 ? (
              <tr>
                <td 
                  colSpan={visibleColumns.length + (selectable ? 1 : 0) + ((renderItemActions || expandable) ? 1 : 0)} 
                  className="px-4 sm:px-6 py-8 text-center"
                >
                  <div className="flex flex-col items-center justify-center text-gray-400 py-4">
                    <h3 className="text-sm font-medium text-gray-600">Nenhum registro encontrado</h3>
                  </div>
                </td>
              </tr>
            ) : (
              items.map(item => (
                <React.Fragment key={`item-fragment-${item.id}`}>
                  <tr 
                    className={`group transition-all duration-200 ${isExpanded(item.id) ? 'transition-colors duration-200 border-0' : ''} ${isSelected(item.id) ? 'bg-red-400/50' : ''} ${itemClassName}`}
                  >
                    {selectable && (
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center">
                          <button
                            onClick={() => toggleSelect(item.id)}
                            className={`relative flex h-5 w-5 items-center justify-center rounded-lg border-2 transition-all duration-300 ${
                              isSelected(item.id)
                                ? 'border-blue-500 bg-blue-500 text-white shadow-lg shadow-blue-500/25 transform'
                                : 'border-gray-300 bg-white/80 text-transparent hover:border-blue-300 hover:bg-blue-50/50 group-hover:border-gray-400'
                            }`}
                          >
                            {isSelected(item.id) && (
                              <FaCheck className="h-3 w-3 transform transition-transform duration-300" />
                            )}
                          </button>
                        </div>
                      </td>
                    )}
                    
                    {visibleColumns.map(column => (
                      <td 
                        key={`${item.id}-${column.key}`}
                        className={`px-4 sm:px-6 py-3 text-xs sm:text-sm text-gray-900 transition-colors duration-200 ${column.className || ''}`}
                      >
                        {column.content(item)}
                      </td>
                    ))}

                    {(renderItemActions || expandable) && (
                      <td className="px-2 sm:px-4 py-3"> 
                        <div className="flex items-center space-x-1 justify-end">
                          {renderItemActions && (
                            <>
                              {renderItemActions(item)}
                            </>
                          )}
                          

                          {expandable && (
                            <button 
                              className="cursor-pointer p-1.5 sm:p-2 rounded-lg bg-white border border-gray-200 hover:bg-blue-50 text-blue-500 hover:text-blue-600 transition-all duration-200 shadow-sm"
                              onClick={() => toggleExpand(item.id)}
                            >
                              <FaChevronDown
                                className={`h-3 w-3 transition-transform duration-300 ${
                                  isExpanded(item.id) ? "rotate-180 text-blue-500" : "rotate-0 text-gray-400 hover:text-blue-500"
                                }`}
                              />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>

                  {expandable && isExpanded(item.id) && renderExpandedContent && (
                    <tr className="">
                      <td 
                        colSpan={visibleColumns.length + (selectable ? 1 : 0) + ((renderItemActions || expandable) ? 1 : 0)} 
                        className="px-0"
                      > 
                        <div className="">
                          {renderExpandedContent(item)}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            )}
          </tbody>

          {/* Footer Summary */}
          {footerSummary && items.length > 0 && (
            <tfoot className="bg-gradient-to-r from-gray-50 to-gray-100 border-t border-gray-100">
              <tr>
                <td 
                  colSpan={visibleColumns.length + (selectable ? 1 : 0) + ((renderItemActions || expandable) ? 1 : 0)} 
                  className="px-4 sm:px-6 py-3"
                >
                  <div className="grid grid-cols-12 gap-3">
                    {footerSummary.map((summary, index) => (
                      <div 
                        key={`footer-summary-${index}`}
                        className={`col-span-${summary.colSpan || 12} text-xs sm:text-sm font-medium text-gray-700 ${summary.className || ''}`}
                      >
                        {summary.content}
                      </div>
                    ))}
                  </div>
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
};

export default GenericList;