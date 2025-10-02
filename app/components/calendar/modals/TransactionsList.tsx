"use client"

import { useState } from 'react';
import { FaPlus, FaReceipt } from 'react-icons/fa';
import { useThemeColors } from '@/app/hook/useThemeColors';
import { Transaction } from "@/app/types/calendar";
import { Button, TransactionCard } from '@/app/components';

interface TransactionsListProps {
  transactions: Transaction[];
  filteredTransactions: Transaction[];
  loading: boolean;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
  onError: (error: string) => void;
  onSuccess: (success: string) => void;
  user: any;
}

export default function TransactionsList({ 
  transactions,
  filteredTransactions,
  loading,
  onEdit, 
  onDelete, 
  onError,
  onSuccess,
  user 
}: TransactionsListProps) {
  const colors = useThemeColors();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (transaction: Transaction) => {
    if (!confirm('Tem certeza que deseja excluir esta transação?')) return;

    setDeletingId(transaction.id);
    try {
      const response = await fetch('/api/transactions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: transaction.id }),
      });

      if (response.ok) {
        onDelete(transaction);
        onSuccess('Transação excluída com sucesso!');
      } else {
        onError('Erro ao excluir transação');
      }
    } catch (err: any) {
      onError(err?.message || 'Erro ao excluir transação');
      console.error('Erro ao excluir transação:', err);
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className={`mt-2 ${colors.text.tertiary}`}>Carregando transações...</p>
      </div>
    );
  }

  if (filteredTransactions.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <FaReceipt className="text-gray-400 text-4xl mb-4" />
        <p className={`text-center ${colors.text.tertiary} mb-4`}>
          {transactions.length === 0 
            ? 'Nenhuma transação encontrada' 
            : 'Nenhuma transação encontrada com os filtros atuais'
          }
        </p>
        <Button
          variant="primary"
          size="md"
          onClick={() => onEdit({} as Transaction)}
          icon={<FaPlus size={14} />}
        >
          Adicionar Primeira Transação
        </Button>
      </div>
    );
  }

  return (
    <div className="p-3">
      <div className="grid grid-cols-1 gap-3">
        {filteredTransactions.map((transaction) => (
          <TransactionCard
            key={transaction.id}
            transaction={transaction}
            onEdit={onEdit}
            onDelete={handleDelete}
            loading={deletingId === transaction.id}
            user={user}
          />
        ))}
      </div>
    </div>
  );
}