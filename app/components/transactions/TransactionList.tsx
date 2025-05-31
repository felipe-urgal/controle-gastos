import { TransactionItem } from "./TransactionItem";
import { Transacao } from "@/app/services/transacoesService";

type TransactionListProps = {
  transactions: Transacao[];
  onDelete: (id: number) => Promise<void>;
  deletingId?: number | null;
};

export const TransactionList = ({ 
  transactions, 
  onDelete,
  deletingId
}: TransactionListProps) => {
  if (transactions.length === 0) {
    return (
      <div className="text-center text-gray-500 mt-7">
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
          onDelete={onDelete}
          isDeleting={deletingId === transaction.id}
        />
      ))}
    </div>
  );
};