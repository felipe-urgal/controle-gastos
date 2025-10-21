"use client";

import { FaTrash, FaEdit, FaReceipt } from 'react-icons/fa';

import { Button, IconRenderer } from '@/app/components';

import { useThemeColors } from '@/app/hook';

interface TransactionCardProps {
  transaction: any;
  onEdit?: (transaction: any) => void;
  onDelete?: (transaction: any) => void;
  loading?: boolean;
  clickable?: boolean;
  compact?: boolean;
  user?: any;
  className?: string;
  showActions?: boolean;
}

export default function TransactionCard({
  transaction,
  onEdit,
  onDelete,
  loading = false,
  clickable = true,
  compact = false,
  user,
  className = "",
  showActions = true
}: TransactionCardProps) {
  const theme = useThemeColors();

  const handleClick = () => {
    if (clickable && onEdit) {
      onEdit(transaction);
    }
  };

  const formatCurrency = (amount: number | string, currency: string = 'BRL') => {
    if (!user?.showValues) return '*****';
    
    const amountInReais = Number(amount) / 100;
    
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency
    }).format(amountInReais);
  };

  const getTypeColor = () => {
    return transaction.type === 'INCOME' 
      ? theme.colors.income.text 
      : theme.colors.expense.text;
  };

  const getTypeStyles = () => {
    return transaction.type === 'INCOME' 
      ? {
          border: 'border-l-green-500',
          bg: 'bg-gradient-to-r from-green-50 to-white dark:from-green-900/10 dark:to-gray-900',
          iconBg: 'bg-green-500 text-white',
          badge: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
        }
      : {
          border: 'border-l-red-500',
          bg: 'bg-gradient-to-r from-red-50 to-white dark:from-red-900/10 dark:to-gray-900',
          iconBg: 'bg-red-500 text-white',
          badge: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
        };
  };

  const getStatusBadge = () => {
    const statusConfig = {
      PENDING: { 
        label: 'Pendente', 
        color: `${theme.colors.warning.text} ${theme.colors.warning.bg}`
      },
      COMPLETED: { 
        label: 'Concluído', 
        color: `${theme.colors.success.text} ${theme.colors.success.bg}`
      },
      CANCELLED: { 
        label: 'Cancelado', 
        color: `${theme.colors.error.text} ${theme.colors.error.bg}`
      }
    };
    
    const config = statusConfig[transaction.status as keyof typeof statusConfig] || statusConfig.PENDING;
    
    return (
      <span className={`text-xs px-2 py-1 rounded-full font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const formatDate = (day: number, month: number, year: number) => {
    return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
  };

  const typeStyles = getTypeStyles();

  // Versão compacta
  if (compact) {
    return (
      <div 
        className={`
          p-3 rounded-xl border-l-4 transition-all relative
          ${clickable ? 'cursor-pointer active:scale-95' : ''}
          ${theme.state.hover}
          ${className}
        `}
        style={{ borderColor: transaction.category.color }}
        onClick={handleClick}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div 
              className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${typeStyles.iconBg}`}
            >
              <IconRenderer 
                iconName={transaction.category?.icon || 'receipt'} 
                size={14}
              />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`font-semibold truncate ${theme.text.primary}`}>
                  {transaction.description}
                </span>
                {getStatusBadge()}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-xs px-2 py-1 rounded-full ${typeStyles.badge}`}>
                  {transaction.type === 'INCOME' ? 'Receita' : 'Despesa'}
                </span>
                <span className={`text-xs ${theme.text.tertiary}`}>
                  {transaction.category?.name || 'Sem categoria'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
            <span className={`text-sm font-semibold ${getTypeColor()}`}>
              {formatCurrency(transaction.amount, transaction.account?.currency)}
            </span>
            
            {showActions && onDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => { 
                  e.stopPropagation(); 
                  onDelete(transaction); 
                }}
                icon={<FaTrash size={14} />}
                className="!p-2"
                title="Excluir transação"
              />
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`
        p-4 rounded-2xl border-l-6 transition-all relative
        ${clickable ? 'cursor-pointer active:scale-[0.98]' : ''}
        ${theme.state.hover} shadow-sm hover:shadow-md
        ${className}
      `}
      style={{ borderColor: transaction.category?.color }}
      onClick={handleClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div 
            className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg ${typeStyles.iconBg}`}
            style={{ backgroundColor: transaction.category?.color || '#3B82F6' }}
          >
            <IconRenderer 
              iconName={transaction.category?.icon || 'receipt'} 
              size={16}
            />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
              <span className={`font-bold text-lg truncate ${theme.text.primary}`}>
                {transaction.description}
              </span>
              
              <div className="flex flex-wrap gap-2">
                 <span className={`text-sm px-3 py-1.5 rounded-full font-medium ${
                  transaction.category?.type === 'INCOME' 
                    ? theme.colors.income.text
                    : theme.colors.expense.text
                }`}>
                  {transaction.type === 'INCOME' ? 'Receita' : 'Despesa'}
                </span>
                {getStatusBadge()}
              </div>
            </div>

            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-1.5">
                <div 
                  className={`w-4 h-4 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center ${typeStyles.iconBg}`}
                  style={{ backgroundColor: transaction.category?.color || '#3B82F6' }}
                >
                  <IconRenderer 
                    iconName={transaction.category?.icon || 'receipt'} 
                    size={8}
                  />
                </div>
                <span className={`text-xs capitalize ${theme.text.tertiary}`}>
                  {transaction.category?.name || 'Sem categoria'}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <FaReceipt className="w-3 h-3 text-gray-400" />
                <span className={`text-xs ${theme.text.tertiary}`}>
                  {transaction.account?.name || 'Sem conta'}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className={`text-xs font-medium ${theme.text.tertiary}`}>
                  {formatDate(transaction.day, transaction.month, transaction.year)}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="hidden sm:flex sm:flex-col sm:items-end sm:gap-3 flex-shrink-0">
          <span className={`text-lg font-bold ${getTypeColor()}`}>
            {formatCurrency(transaction.amount, transaction.account?.currency)}
          </span>

          {showActions && (
            <div className="flex items-center gap-1">
              {onEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    onEdit(transaction); 
                  }}
                  icon={<FaEdit size={14} />}
                  className="!p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Editar transação"
                />
              )}
              
              {onDelete && (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    onDelete(transaction); 
                  }}
                  disabled={loading}
                  icon={<FaTrash size={14} />}
                  className="!p-2 sm:!p-3 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 transition-all"
                  title="Excluir transação"
                />
              )}
            </div>
          )}
        </div>
      </div>

      <div className="sm:hidden flex items-center justify-between mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
        <span className={`text-base font-semibold ${getTypeColor()}`}>
          {formatCurrency(transaction.amount, transaction.account?.currency)}
        </span>
      </div>

      <div className="sm:hidden flex items-center justify-between mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
          <span>Toque para editar</span>
        </div>
        
        {showActions && onDelete && (
          <div className="flex items-center gap-2">
            <Button
              variant="danger"
              size="sm"
              onClick={(e) => { 
                e.stopPropagation(); 
                onDelete(transaction); 
              }}
              disabled={loading}
              icon={<FaTrash size={12} />}
              className="!p-2 text-xs"
              title="Excluir"
            >
              Excluir
            </Button>
          </div>
        )}
      </div>

      {loading && (
        <div className="absolute inset-0 bg-white/50 dark:bg-gray-900/50 rounded-2xl flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  );
}