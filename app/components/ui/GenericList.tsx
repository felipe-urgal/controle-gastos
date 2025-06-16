import React, { ReactNode, useState } from "react";

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
  emptyMessage?: string;
  headerSummary?: SummaryConfig[];
  footerSummary?: SummaryConfig[];
  expandable?: boolean;
  renderExpandedContent?: (item: T) => ReactNode;
  onRowClick?: (item: T) => void;
};

export const GenericList = <T extends { id: string }>({
  items,
  columns,
  renderItemActions,
  emptyMessage = "Nenhum item encontrado",
  headerSummary,
  footerSummary,
  expandable = false,
  renderExpandedContent,
  onRowClick,
}: GenericListProps<T>) => {
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleRowClick = (item: T, e: React.MouseEvent) => {
    // Verifica se o clique veio de um botão ou elemento filho que não deve propagar
    const isActionElement = (e.target as HTMLElement).closest('button, a, [data-no-propagation]');
    if (!isActionElement && onRowClick) {
      onRowClick(item);
    }
    if (!isActionElement && expandable) {
      toggleExpand(item.id);
    }
  };

  const visibleColumns = columns.filter(column => !column.hidden);

  return (
    <div className="flex-1 overflow-y-auto">
      <table className="w-full">
        {/* Header Summary */}
        {headerSummary && items.length > 0 && (
          <thead className="bg-gray-800 border border-gray-700 sticky border-t-0 border-r-0 border-l-0">
            <tr>
              {headerSummary.map((summary, index) => (
                <td 
                  key={`header-summary-${index}`}
                  className={`px-4 py-3 ${summary.className || ''}`}
                  colSpan={summary.colSpan}
                >
                  {summary.content}
                </td>
              ))}
            </tr>
          </thead>
        )}

        {/* Main Header */}
        <thead className="bg-gray-800 sticky top-0">
          <tr>
            {visibleColumns.map(column => (
              <th 
                key={`header-${column.key}`}
                className={`px-4 py-3 text-left text-gray-400 text-sm ${column.className || ''}`}
              >
                {column.header}
              </th>
            ))}
            {renderItemActions && (
              <th className="px-3 text-right text-gray-400 text-sm"></th>
            )}
          </tr>
        </thead>

        {/* Table Body */}
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={visibleColumns.length + (renderItemActions ? 1 : 0)} className="text-center text-gray-600 py-5">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            items.map(item => (
              <React.Fragment key={`item-fragment-${item.id}`}>
                <tr 
                  onClick={(e) => handleRowClick(item, e)}
                  className={`${expandable || onRowClick ? 'cursor-pointer' : ''} transition-colors border-b border-gray-700 ${expandedItems[item.id] ? 'border-b-0' : 'hover:bg-gray-800/50'}`}
                >
                  {visibleColumns.map(column => (
                    <td 
                      key={`${item.id}-${column.key}`}
                      className={`px-4 py-3 ${column.className || ''}`}
                    >
                      {column.content(item)}
                    </td>
                  ))}
                  
                  {renderItemActions && (
                    <td className="px-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end">
                        {renderItemActions(item)}
                      </div>
                    </td>
                  )}
                </tr>

                {expandable && expandedItems[item.id] && renderExpandedContent && (
                  <tr 
                    className="border-b border-gray-700"
                    role="separator"
                  >
                    <td colSpan={visibleColumns.length + (renderItemActions ? 1 : 0)} className="px-4 py-3">
                      {renderExpandedContent(item)}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))
          )}
        </tbody>

        {/* Footer Summary */}
        {footerSummary && items.length > 20 && (
          <tfoot className="bg-gray-800 border-t border-gray-700 sticky bottom-0">
            <tr>
              {footerSummary.map((summary, index) => (
                <td 
                  key={`footer-summary-${index}`}
                  className={`px-4 py-3 ${summary.className || ''}`}
                  colSpan={summary.colSpan}
                >
                  {summary.content}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
};