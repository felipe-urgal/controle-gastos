import { HiTrash } from "react-icons/hi";
import { useTheme } from "@/app/context/ThemeContext";
import { Investment } from "@/app/types/calendar";
import { Button } from "@/app/components"; // ajuste o caminho conforme necessário

interface InvestmentsListProps {
  investments: Investment[];
  onEdit: (investment: Investment) => void;
  onDelete: (investment: Investment) => void;
  user: any;
}

export default function InvestmentsList({ 
  investments, 
  onEdit, 
  onDelete, 
  user 
}: InvestmentsListProps) {
  const { resolvedTheme } = useTheme();

  const formatCurrency = (amount: string, currency: string = 'BRL') => {
    if (!user?.showValues) return '*****';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency
    }).format(parseFloat(amount));
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'BUY': return 'text-blue-600';
      case 'SELL': return 'text-orange-600';
      case 'DIVIDEND': return 'text-purple-600';
      default: return 'text-gray-600';
    }
  };

  const getTypeBgColor = (type: string) => {
    switch (type) {
      case 'BUY': return 'bg-blue-100 text-blue-800';
      case 'SELL': return 'bg-orange-100 text-orange-800';
      case 'DIVIDEND': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const colors = {
    text: resolvedTheme === 'dark' ? 'text-gray-100' : 'text-gray-800',
    border: resolvedTheme === 'dark' ? 'border-gray-700' : 'border-gray-200',
    hover: resolvedTheme === 'dark' ? 'hover:bg-gray-800' : 'hover:bg-gray-50',
  };

  return (
    <div className="p-2 sm:p-4">
      {investments.map((investment) => (
        <div
          key={investment.id}
          className={`flex items-center justify-between p-3 border-b last:border-b-0 ${colors.hover} transition-all duration-200 group cursor-pointer`}
          onClick={() => onEdit(investment)}
        >
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
              investment.type === 'BUY' ? 'bg-blue-500' : 
              investment.type === 'SELL' ? 'bg-orange-500' : 'bg-purple-500'
            }`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <div className="min-w-0">
                  <p className={`font-semibold ${colors.text} text-sm truncate`}>
                    {investment.description}
                  </p>
                  {investment.ticker && (
                    <span className={`${
                      resolvedTheme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                    } px-1.5 py-0.5 rounded text-xs`}>
                      {investment.ticker}
                    </span>
                  )}
                </div>
                <p className={`text-base font-bold ${getTypeColor(investment.type)} flex-shrink-0 ml-2`}>
                  {formatCurrency(investment.amount, investment.account?.currency)}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1 text-xs text-gray-500">
                <span className={`px-1.5 py-0.5 rounded ${getTypeBgColor(investment.type)}`}>
                  {investment.type === 'BUY' ? 'Compra' : 
                   investment.type === 'SELL' ? 'Venda' : 'Dividendo'}
                </span>
                {investment.quantity && investment.unitPrice && (
                  <span>{investment.quantity} × {formatCurrency(investment.unitPrice)}</span>
                )}
                <span className="truncate">{investment.account?.name}</span>
              </div>
            </div>
          </div>
          
          <div className="flex space-x-1 ml-2 flex-shrink-0">
            <Button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(investment);
              }}
              variant="ghost"
              size="xs"
              icon={<HiTrash className="w-3.5 h-3.5" />}
              className="!p-1.5 text-red-500 hover:text-red-600"
              title="Excluir investimento"
            />
          </div>
        </div>
      ))}
    </div>
  );
}
