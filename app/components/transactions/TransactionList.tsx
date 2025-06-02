import { TransactionItem } from "./TransactionItem";
import { TransactionModel } from "@/app/types/transaction";

type TransactionListProps = {
  transactions: TransactionModel[];
  onDelete: (transaction: TransactionModel) => Promise<void>;
};

export const TransactionList = ({ transactions, onDelete }: TransactionListProps) => {
  if (transactions.length === 0) {
    return (
      <div className="text-center text-gray-500 mt-7">
        Nenhuma transação encontrada
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <table className="w-full">
        <thead className="bg-gray-800 text-gray-400 text-sm md:table-header-group">
          <tr>
            <th className="px-4 py-3 text-left">Data</th>
            <th className="px-4 py-3 text-left">Descrição</th>
            <th className="px-4 py-3 text-left">Categoria</th>
            <th className="px-4 py-3 text-left">Conta</th>
            <th className="px-4 py-3 text-right">Valor</th>
            <th className="px-3 text-right">Ações</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map(transaction => (
            <TransactionItem 
              key={transaction.id} 
              transaction={transaction} 
              onDelete={onDelete}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
};