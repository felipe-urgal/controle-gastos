import { TransactionItem } from "./TransactionItem";
import { TransactionModel } from "@/app/types/transaction";

type TransactionListProps = {
  transactions: TransactionModel[];
  onDelete: (transaction: TransactionModel) => Promise<void>;
};

export const TransactionList = ({ transactions, onDelete }: TransactionListProps) => {

  return (
    <div className="flex-1 overflow-y-auto">
      <table className="w-full">
        <thead className="bg-gray-800">
          <tr>
            <th className="hidden lg:table-cell px-4 py-3 text-left text-gray-400 text-sm">Data</th>
            <th className="px-4 py-3 text-left text-gray-400 text-sm">Descrição</th>
            <th className="hidden lg:table-cell px-4 py-3 text-left text-gray-400 text-sm">Categoria</th>
            <th className="hidden lg:table-cell px-4 py-3 text-left text-gray-400 text-sm">Conta</th>
            <th className="px-4 py-3 text-right text-gray-400 text-sm">Valor</th>
            <th className="px-3 text-right text-gray-400 text-sm">Ações</th>
          </tr>
        </thead>
        <tbody>
          {transactions.length === 0 ? (
            <tr>
              <td colSpan={6} className="text-center text-gray-600 py-5">
                Nenhuma transação encontrada
              </td>
            </tr>
          ) : (
            transactions.map(transaction => (
              <TransactionItem 
                key={transaction.id} 
                transaction={transaction} 
                onDelete={onDelete}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};