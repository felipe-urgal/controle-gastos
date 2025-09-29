import { HiTrash } from "react-icons/hi";
import { useTheme } from "@/app/context/ThemeContext";
import { Transaction } from "@/app/types/calendar";

interface TransactionsListProps {
  transactions: Transaction[];
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
  user: any;
}

export default function TransactionsList({ 
  transactions, 
  onEdit, 
  onDelete, 
  user 
}: TransactionsListProps) {
  const { resolvedTheme } = useTheme();

  const formatCurrency = (amount: string, currency: string = 'BRL') => {
    if (!user?.showValues) return '*****';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency
    }).format(parseFloat(amount));
  };

  const getTypeColor = (type: string) => {
    return type === 'INCOME' ? 'text-green-600' : 'text-red-600';
  };

  const colors = {
    text: resolvedTheme === 'dark' ? 'text-gray-100' : 'text-gray-800',
    textSecondary: resolvedTheme === 'dark' ? 'text-gray-300' : 'text-gray-600',
    border: resolvedTheme === 'dark' ? 'border-gray-700' : 'border-gray-200',
    hover: resolvedTheme === 'dark' ? 'hover:bg-gray-800' : 'hover:bg-gray-50',
    categoryBg: resolvedTheme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600',
  };

  return (
    <div className="p-2 sm:p-4">
      {transactions.map((transaction) => (
        <div
          key={transaction.id}
          className={`flex items-center justify-between p-3 border-b last:border-b-0 ${colors.border} ${colors.hover} transition-all duration-200 group cursor-pointer`}
          onClick={() => onEdit(transaction)}
        >
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
              transaction.type === 'INCOME' ? 'bg-green-500' : 'bg-red-500'
            }`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <p className={`font-semibold ${colors.text} text-sm truncate`}>
                  {transaction.description}
                </p>
                <div className="flex flex-col items-end">
                  <p className={`text-base font-bold ${getTypeColor(transaction.type)}`}>
                    {formatCurrency(transaction.amount, transaction.account?.currency)}
                  </p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(transaction);
                    }}
                    className={`p-2 text-red-500 ${
                      resolvedTheme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-red-50'
                    } rounded transition-colors`}
                    title="Excluir transação"
                  >
                    <HiTrash className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1 text-xs text-gray-500">
                <span className={`${colors.categoryBg} px-1.5 py-0.5 rounded`}>
                  {transaction.category?.name || 'Sem categoria'}
                </span>
                <span className="truncate">{transaction.account?.name}</span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}