import { TransactionItem } from "./TransactionItem";
import { Transacao } from "@/app/services/transacoesService";
import { Categoria } from "@/app/types/transacao";

type TransactionListProps = {
  transactions: Transacao[];
  categories: Categoria[];
  onDelete: (id: number) => Promise<void>;
  deletingId?: number | null;
};

export const TransactionList = ({ 
  transactions, 
  categories,
  onDelete,
  deletingId
}: TransactionListProps) => {
  if (transactions.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        Nenhuma transação encontrada
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100">
      {transactions.map((transaction) => (
        <TransactionItem
          key={transaction.id}
          transaction={transaction}
          categories={categories}
          onDelete={onDelete}
          isDeleting={deletingId === transaction.id}
        />
      ))}
    </div>
  );
};