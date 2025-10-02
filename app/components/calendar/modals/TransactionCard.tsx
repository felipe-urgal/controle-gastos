"use client";

import { FaTrash, FaEdit, FaReceipt } from 'react-icons/fa';
import { Transaction } from '@/app/types/calendar';
import { Button, IconRenderer } from '@/app/components';
import { useThemeColors } from '@/app/hook/useThemeColors';

interface TransactionCardProps {
  transaction: Transaction;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
  loading?: boolean;
  clickable?: boolean;
  compact?: boolean;
  user: any;
}

export default function TransactionCard({
  transaction,
  onEdit,
  onDelete,
  loading,
  clickable = true,
  compact = false,
  user
}: TransactionCardProps) {
  
  const handleClick = () => {
    if (clickable && onEdit) {
      onEdit(transaction);
    }
  };

  const colors = useThemeColors();

  const formatCurrency = (amount: number | string, currency: string = 'BRL') => {
    if (!user?.showValues) return '*****';
    
    // Converter de centavos para reais
    const amountInReais = Number(amount) / 100;
    
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency
    }).format(amountInReais);
  };

  const getTypeColor = () => {
    return transaction.type === 'INCOME' 
      ? 'text-green-600 dark:text-green-400' 
      : 'text-red-600 dark:text-red-400';
  };

  const getStatusBadge = () => {
    const statusConfig = {
      PENDING: { 
        label: 'Pendente', 
        color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' 
      },
      COMPLETED: { 
        label: 'Concluído', 
        color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' 
      },
      CANCELLED: { 
        label: 'Cancelado', 
        color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' 
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

  // Versão compacta para listas densas
  if (compact) {
    return (
      <div 
        className={`
          p-3 rounded-xl border-l-4 transition-all relative
          ${clickable ? 'cursor-pointer active:scale-95' : ''}
          ${transaction.type === 'INCOME'
            ? 'border-l-green-500 bg-green-50 dark:bg-green-900/10' 
            : 'border-l-red-500 bg-red-50 dark:bg-red-900/10'
          }
          ${colors.state.hover}
        `}
        onClick={handleClick}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div 
              className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${
                transaction.type === 'INCOME' 
                  ? 'bg-green-500 text-white' 
                  : 'bg-red-500 text-white'
              }`}
            >
              <IconRenderer 
                iconName={transaction.category?.icon || 'receipt'} 
                size={14}
              />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`font-semibold truncate ${colors.text.primary}`}>
                  {transaction.description}
                </span>
                {getStatusBadge()}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-xs px-2 py-1 rounded-full ${
                  transaction.type === 'INCOME' 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                    : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
                }`}>
                  {transaction.type === 'INCOME' ? '💰 Receita' : '💸 Despesa'}
                </span>
                <span className={`text-xs ${colors.text.tertiary}`}>
                  {transaction.category?.name || 'Sem categoria'}
                </span>
              </div>
            </div>
          </div>

          {/* Valor e Ações compactas */}
          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
            <span className={`text-sm font-semibold ${getTypeColor()}`}>
              {formatCurrency(transaction.amount, transaction.account?.currency)}
            </span>
            
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
        ${transaction.type === 'INCOME'
          ? 'border-l-green-500 bg-gradient-to-r from-green-50 to-white dark:from-green-900/10 dark:to-gray-900' 
          : 'border-l-red-500 bg-gradient-to-r from-red-50 to-white dark:from-red-900/10 dark:to-gray-900'
        }
        ${colors.state.hover} shadow-sm hover:shadow-md
      `}
      onClick={handleClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {/* Ícone com cor */}
          <div 
            className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg ${
              transaction.type === 'INCOME' 
                ? 'bg-green-500 text-white' 
                : 'bg-red-500 text-white'
            }`}
          >
            <IconRenderer 
              iconName={transaction.category?.icon || 'receipt'} 
              size={16}
            />
          </div>
          
          {/* Conteúdo principal */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
              <span className={`font-bold text-lg truncate ${colors.text.primary}`}>
                {transaction.description}
              </span>
              
              <div className="flex flex-wrap gap-2">
                {/* Badge de tipo */}
                <span className={`text-sm px-3 py-1.5 rounded-full font-medium ${
                  transaction.type === 'INCOME' 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                    : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                }`}>
                  {transaction.type === 'INCOME' ? '💰 Receita' : '💸 Despesa'}
                </span>

                {/* Badge de status */}
                {getStatusBadge()}
              </div>
            </div>

            {/* Metadados */}
            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                  <IconRenderer 
                    iconName={transaction.category?.icon || 'receipt'} 
                    size={8}
                    className="text-gray-600 dark:text-gray-300"
                  />
                </div>
                <span className={`text-xs capitalize ${colors.text.tertiary}`}>
                  {transaction.category?.name || 'Sem categoria'}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <FaReceipt className="w-3 h-3 text-gray-400" />
                <span className={`text-xs ${colors.text.tertiary}`}>
                  {transaction.account?.name || 'Sem conta'}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className={`text-xs font-medium ${colors.text.tertiary}`}>
                  {formatDate(transaction.day, transaction.month, transaction.year)}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Lado direito - Valor e Ações */}
        <div className="hidden sm:flex sm:flex-col sm:items-end sm:gap-3 flex-shrink-0">
          {/* Valor */}
          <span className={`text-lg font-bold ${getTypeColor()}`}>
            {formatCurrency(transaction.amount, transaction.account?.currency)}
          </span>

          {/* Ações */}
          <div className="flex items-center gap-1">
            {/* Botão Editar - Visível apenas no hover em desktop */}
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
            
            {/* Botão Excluir */}
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
          </div>
        </div>
      </div>

      {/* Valor Mobile */}
      <div className="sm:hidden flex items-center justify-between mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
        <span className={`text-base font-semibold ${getTypeColor()}`}>
          {formatCurrency(transaction.amount, transaction.account?.currency)}
        </span>
      </div>

      {/* Ações Mobile - Barra inferior */}
      <div className="sm:hidden flex items-center justify-between mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
          <span>Toque para editar</span>
        </div>
        
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
      </div>

      {/* Efeito de loading */}
      {loading && (
        <div className="absolute inset-0 bg-white/50 dark:bg-gray-900/50 rounded-2xl flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  );
}