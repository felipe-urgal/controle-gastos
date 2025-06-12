import { TransactionItem } from "./TransactionItem";
import { TransactionModel } from "@/app/types/transaction";

type TransactionListProps = {
  transactions: TransactionModel[];
  onDelete: (id: string) => void;
};

export const TransactionList = ({ transactions, onDelete }: TransactionListProps) => {
  // Cálculos de totais otimizados
  const { totalIncome, totalExpense, totalInvestment } = transactions.reduce(
    (acc, transaction) => {
      const amount = Number(transaction.amount);
      
      if (transaction.type === "INCOME") {
        acc.totalIncome += amount;
      } else if (transaction.type === "EXPENSE") {
        acc.totalExpense += amount;
      } else if (transaction.type === "INVESTMENT") {
        if (transaction.investmentType === 'BUY') {
          acc.totalInvestment += amount;
        } else {
          acc.totalInvestment -= amount;
        }
      }
      
      return acc;
    },
    { totalIncome: 0, totalExpense: 0, totalInvestment: 0 }
  );

  return (
    <div className="flex-1 overflow-y-auto">
      <table className="w-full">

        {transactions.length > 0 && (
          <thead className="bg-gray-800 border border-gray-700 sticky border-t-0 border-r-0 border-l-0">
            <tr>
              <td className="px-4 py-3 text-right font-semibold text-green-400 text-xs lg:text-sm">
                Renda: {formatCurrency(totalIncome)}
              </td>
              <td className="px-3 hidden lg:table-cell border-r border-gray-700"></td>
              <td className="px-4 py-3 text-right font-semibold text-red-400 text-xs lg:text-sm">
                Despesa: {formatCurrency(totalExpense)}
              </td>
              <td className="px-3 hidden lg:table-cell border-r border-gray-700"></td>
              <td className="px-4 py-3 text-right font-semibold text-blue-400 text-xs lg:text-sm">
                Investimento: {formatCurrency(totalInvestment)}
              </td>
              <td className="px-3 hidden lg:table-cell"></td>
            </tr>
          </thead>
        )}

        <thead className="bg-gray-800 sticky top-0">
          <tr>
            <th className="hidden lg:table-cell px-4 py-3 text-left text-gray-400 text-xs lg:text-sm">Data</th>
            <th className="px-4 py-3 text-left text-gray-400 text-xs lg:text-sm">Descrição</th>
            <th className="hidden lg:table-cell px-4 py-3 text-left text-gray-400 text-xs lg:text-sm">Categoria</th>
            <th className="hidden lg:table-cell px-4 py-3 text-left text-gray-400 text-xs lg:text-sm">Conta</th>
            <th className="px-4 py-3 text-right text-gray-400 text-xs lg:text-sm">Valor</th>
            <th className="px-3 text-right text-gray-400 text-xs lg:text-sm">Ações</th>
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

        {transactions.length > 20 && (
          <tfoot className="bg-gray-800 border-t border-gray-700 sticky bottom-0">
            <tr>
              <td className="px-4 py-3 text-right font-semibold text-green-400 text-xs lg:text-sm">
                Renda: {formatCurrency(totalIncome)}
              </td>
              <td className="px-3 hidden lg:table-cell"></td>
              <td className="px-4 py-3 text-right font-semibold text-red-400 text-xs lg:text-sm">
                Despesa: {formatCurrency(totalExpense)}
              </td>
              <td className="px-3 hidden lg:table-cell"></td>
              <td className="px-4 py-3 text-right font-semibold text-blue-400 text-xs lg:text-sm">
                Investimento: {formatCurrency(totalInvestment)}
              </td>
              <td className="px-3 hidden lg:table-cell"></td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
};

// Função de formatação de moeda
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}