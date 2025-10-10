"use client"

import { FaPlus, FaReceipt } from 'react-icons/fa';
import { useThemeColors } from '@/app/hook/useThemeColors';
import { Button, TransactionCard } from '@/app/components';

interface TransactionsListProps {
  transactions?: any[];
  filteredTransactions?: any[];
  loading?: boolean;
  onEdit?: (transaction: any) => void;
  onDelete?: (transaction: any) => void;
  user?: any;
  className?: string;
  showEmptyState?: boolean;
  emptyStateMessage?: string;
  emptyStateButtonText?: string;
}

export default function TransactionsList({ 
  transactions = [],
  filteredTransactions,
  loading = false,
  onEdit, 
  onDelete, 
  user,
  className = "",
  showEmptyState = true,
  emptyStateMessage,
  emptyStateButtonText = "Adicionar Primeira Transação"
}: TransactionsListProps) {
  const theme = useThemeColors();
  const displayTransactions = filteredTransactions || transactions;

  if (loading) {
    return (
      <div className={`p-6 text-center ${className}`}>
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className={`mt-2 ${theme.text.tertiary}`}>Carregando transações...</p>
      </div>
    );
  }

  if (displayTransactions.length === 0 && showEmptyState) {
    const defaultMessage = transactions.length === 0 
      ? 'Nenhuma transação encontrada' 
      : 'Nenhuma transação encontrada com os filtros atuais';

    return (
      <div className={`flex-1 flex flex-col items-center justify-center p-6 ${className}`}>
        <FaReceipt className={`${theme.text.tertiary} text-4xl mb-4`} />
        <p className={`text-center ${theme.text.tertiary} mb-4`}>
          {emptyStateMessage || defaultMessage}
        </p>
        {onEdit && (
          <Button
            variant="primary"
            size="md"
            onClick={() => onEdit({})}
            icon={<FaPlus size={14} />}
          >
            {emptyStateButtonText}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={`p-3 ${className}`}>
      <div className="grid grid-cols-1 gap-3">
        {displayTransactions.map((transaction, index) => (
          <TransactionCard
            key={transaction.id || transaction._id || `transaction-${index}`}
            transaction={transaction}
            onEdit={onEdit}
            onDelete={onDelete}
            loading={loading}
            user={user}
          />
        ))}
      </div>
    </div>
  );
}
