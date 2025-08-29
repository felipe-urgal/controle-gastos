// app/components/dashboard/AccountCard.tsx
"use client"

import { useState } from "react";
import { 
  FaCreditCard, 
  FaChartLine, 
  FaPiggyBank, 
  FaMoneyBillAlt,
  FaChevronDown,
  FaChevronUp,
  FaDollarSign,
  FaPlusCircle,
  FaMinusCircle
} from "react-icons/fa";

interface CategoryData {
  categoryId: string | null;
  categoryName: string;
  total: number;
}

interface InvestmentTickerData {
  ticker: string | null; // Allow null values
  total: number;
}

interface AccountByType {
  income: { 
    total: number; 
    byCategory: CategoryData[];
  };
  expense: { 
    total: number; 
    byCategory: CategoryData[];
  };
  investment: {
    buy: { total: number; byTicker?: InvestmentTickerData[] };
    sell: { total: number; byTicker?: InvestmentTickerData[] };
    net: number;
    dividend: number;
  };
}

interface AccountData {
  accountId: string;
  accountName: string;
  accountType: string;
  total: number;
  byType: AccountByType;
}

interface AccountCardProps {
  account: AccountData;
  compact?: boolean;
  expanded?: boolean;
}

const AccountCard = ({ account, compact = false, expanded = false }: AccountCardProps) => {
  const [isExpanded, setIsExpanded] = useState(expanded);
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getAccountTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      CHECKING: "Conta Corrente",
      SAVINGS: "Poupança",
      INVESTMENT: "Investimentos",
      CREDIT: "Cartão de Crédito",
      OTHER: "Outro"
    };
    return types[type] || type;
  };

  const getAccountIcon = (type: string) => {
    const icons: Record<string, React.ElementType> = {
      CHECKING: FaMoneyBillAlt,
      SAVINGS: FaPiggyBank,
      INVESTMENT: FaChartLine,
      CREDIT: FaCreditCard,
      OTHER: FaDollarSign
    };
    const IconComponent = icons[type] || FaDollarSign;
    return <IconComponent className="w-4 h-4" />;
  };

  const getAccountColor = (type: string) => {
    const colors: Record<string, string> = {
      CHECKING: "text-blue-600 bg-blue-100",
      SAVINGS: "text-green-600 bg-green-100",
      INVESTMENT: "text-purple-600 bg-purple-100",
      CREDIT: "text-orange-600 bg-orange-100",
      OTHER: "text-gray-600 bg-gray-100"
    };
    return colors[type] || "text-gray-600 bg-gray-100";
  };

  const getAccountGradient = (type: string) => {
    const gradients: Record<string, string> = {
      CHECKING: "from-blue-50 to-blue-100 border-blue-200",
      SAVINGS: "from-green-50 to-green-100 border-green-200",
      INVESTMENT: "from-purple-50 to-purple-100 border-purple-200",
      CREDIT: "from-orange-50 to-orange-100 border-orange-200",
      OTHER: "from-gray-50 to-gray-100 border-gray-200"
    };
    return gradients[type] || "from-gray-50 to-gray-100 border-gray-200";
  };

  // Calcular percentual para cada categoria
  const calculatePercentage = (amount: number, total: number) => {
    if (total === 0) return 0;
    return (amount / total) * 100;
  };

  return (
    <div className={`bg-gradient-to-br ${getAccountGradient(account.accountType)} rounded-2xl shadow-sm overflow-hidden border transition-all duration-300 hover:shadow-md`}>
      <div 
        className="p-5 cursor-pointer" 
        onClick={() => !expanded && setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className={`p-3 rounded-xl ${getAccountColor(account.accountType)} shadow-inner`}>
              {getAccountIcon(account.accountType)}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{account.accountName}</h3>
              <p className="text-sm text-gray-600">{getAccountTypeLabel(account.accountType)}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <p className={`text-lg font-bold ${account.total >= 0 ? 'text-green-700' : 'text-red-600'}`}>
              {formatCurrency(account.total)}
            </p>
            {!expanded && (
              <button className="text-gray-500 hover:text-gray-700 transition-colors p-1 rounded-full hover:bg-white/50">
                {isExpanded ? <FaChevronUp size={14} /> : <FaChevronDown size={14} />}
              </button>
            )}
          </div>
        </div>
      </div>
      
      {(isExpanded || expanded) && (
        <div className="border-t border-white/50 bg-white/70 backdrop-blur-sm p-5">
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-white/80 rounded-xl p-4 shadow-xs border border-gray-100">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Receitas</p>
              <p className="text-green-600 font-bold text-lg">{formatCurrency(account.byType.income.total)}</p>
            </div>
            <div className="bg-white/80 rounded-xl p-4 shadow-xs border border-gray-100">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Despesas</p>
              <p className="text-red-600 font-bold text-lg">{formatCurrency(account.byType.expense.total)}</p>
            </div>
          </div>
          
          {/* Categorias de Receitas */}
          {account.byType.income.byCategory.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center mb-3">
                <FaPlusCircle className="text-green-500 mr-2" size={14} />
                <p className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Receitas por Categoria</p>
              </div>
              <div className="space-y-2">
                {account.byType.income.byCategory
                  .filter(cat => cat.total > 0)
                  .sort((a, b) => b.total - a.total)
                  .map((category, index) => (
                    <div key={category.categoryId || `income-${index}`} className="flex justify-between items-center bg-green-50/70 p-2 rounded-lg">
                      <span className="text-sm text-gray-700 truncate">{category.categoryName}</span>
                      <div className="flex items-center">
                        <span className="text-xs text-gray-500 mr-2">
                          {calculatePercentage(category.total, account.byType.income.total).toFixed(1)}%
                        </span>
                        <span className="text-sm font-medium text-green-700">
                          {formatCurrency(category.total)}
                        </span>
                      </div>
                    </div>
                  ))
                }
              </div>
            </div>
          )}
          
          {/* Categorias de Despesas */}
          {account.byType.expense.byCategory.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center mb-3">
                <FaMinusCircle className="text-red-500 mr-2" size={14} />
                <p className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Despesas por Categoria</p>
              </div>
              <div className="space-y-2">
                {account.byType.expense.byCategory
                  .filter(cat => cat.total > 0)
                  .sort((a, b) => b.total - a.total)
                  .map((category, index) => (
                    <div key={category.categoryId || `expense-${index}`} className="flex justify-between items-center bg-red-50/70 p-2 rounded-lg">
                      <span className="text-sm text-gray-700 truncate">{category.categoryName}</span>
                      <div className="flex items-center">
                        <span className="text-xs text-gray-500 mr-2">
                          {calculatePercentage(category.total, account.byType.expense.total).toFixed(1)}%
                        </span>
                        <span className="text-sm font-medium text-red-700">
                          {formatCurrency(category.total)}
                        </span>
                      </div>
                    </div>
                  ))
                }
              </div>
            </div>
          )}
          
          {account.accountType === "INVESTMENT" && (
            <div className="mb-5">
              <p className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Investimentos</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/80 rounded-xl p-3 shadow-xs border border-gray-100 text-center">
                  <p className="text-xs text-gray-500 mb-1">Compras</p>
                  <p className="text-purple-600 text-sm font-semibold">
                    {formatCurrency(account.byType.investment.buy.total)}
                  </p>
                </div>
                <div className="bg-white/80 rounded-xl p-3 shadow-xs border border-gray-100 text-center">
                  <p className="text-xs text-gray-500 mb-1">Vendas</p>
                  <p className="text-purple-600 text-sm font-semibold">
                    {formatCurrency(account.byType.investment.sell.total)}
                  </p>
                </div>
                <div className="bg-white/80 rounded-xl p-3 shadow-xs border border-gray-100 text-center">
                  <p className="text-xs text-gray-500 mb-1">Líquido</p>
                  <p className={`text-sm font-semibold ${account.byType.investment.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(account.byType.investment.net)}
                  </p>
                </div>
                <div className="bg-white/80 rounded-xl p-3 shadow-xs border border-gray-100 text-center">
                  <p className="text-xs text-gray-500 mb-1">Dividendos</p>
                  <p className="text-green-600 text-sm font-semibold">
                    {formatCurrency(account.byType.investment.dividend)}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {!compact && (
            <div className="text-right">
              <button className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors px-4 py-2 rounded-lg bg-blue-50 hover:bg-blue-100">
                Ver detalhes completos
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AccountCard;