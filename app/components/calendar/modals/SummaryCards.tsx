import { useAuth } from "@/app/context/AuthContext";
import { useTheme } from "@/app/context/ThemeContext";

interface SummaryCardsProps {
  activeTab: 'transactions' | 'investments';
  totalIncome: number;
  totalExpenses: number;
  totalBuys: number;
  totalSells: number;
  totalDividends: number;
  netInvestment: number;
}

export default function SummaryCards({
  activeTab,
  totalIncome,
  totalExpenses,
  totalBuys,
  totalSells,
  totalDividends,
  netInvestment
}: SummaryCardsProps) {
  const { user } = useAuth();
  const { resolvedTheme } = useTheme();

  const formatCurrency = (amount: number) => {
    if (!user?.showValues) return '*****';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  };

  if (activeTab === 'transactions') {
    return (
      <div className="mt-3 grid grid-cols-2 gap-2">
        <SummaryCard
          label="Receitas"
          value={totalIncome}
          theme={resolvedTheme}
          type="income"
          formatCurrency={formatCurrency}
        />
        <SummaryCard
          label="Despesas"
          value={totalExpenses}
          theme={resolvedTheme}
          type="expense"
          formatCurrency={formatCurrency}
        />
        <SummaryCard
          label="Saldo do dia"
          value={totalIncome - totalExpenses}
          theme={resolvedTheme}
          type={totalIncome - totalExpenses >= 0 ? "balancePositive" : "balanceNegative"}
          formatCurrency={formatCurrency}
          fullWidth
        />
      </div>
    );
  }

  return (
    <div className="mt-3 grid grid-cols-2 gap-2">
      <SummaryCard
        label="Compras"
        value={totalBuys}
        theme={resolvedTheme}
        type="buy"
        formatCurrency={formatCurrency}
      />
      <SummaryCard
        label="Vendas"
        value={totalSells}
        theme={resolvedTheme}
        type="sell"
        formatCurrency={formatCurrency}
      />
      <SummaryCard
        label="Dividendos"
        value={totalDividends}
        theme={resolvedTheme}
        type="dividend"
        formatCurrency={formatCurrency}
      />
      <SummaryCard
        label="Líquido"
        value={netInvestment}
        theme={resolvedTheme}
        type={netInvestment >= 0 ? "netPositive" : "netNegative"}
        formatCurrency={formatCurrency}
      />
    </div>
  );
}

interface SummaryCardProps {
  label: string;
  value: number;
  theme: string;
  type: 'income' | 'expense' | 'balancePositive' | 'balanceNegative' | 'buy' | 'sell' | 'dividend' | 'netPositive' | 'netNegative';
  formatCurrency: (amount: number) => string;
  fullWidth?: boolean;
}

function SummaryCard({ label, value, theme, type, formatCurrency, fullWidth = false }: SummaryCardProps) {
  const getStyles = () => {
    const baseStyles = "py-1 rounded-full text-center border";
    
    const typeStyles = {
      income: theme === 'dark' ? 'bg-green-900/20 border-green-800 text-green-400' : 'bg-green-50 border-green-200 text-green-600',
      expense: theme === 'dark' ? 'bg-red-900/20 border-red-800 text-red-400' : 'bg-red-50 border-red-200 text-red-600',
      balancePositive: theme === 'dark' ? 'bg-blue-900/20 border-blue-800 text-blue-300' : 'bg-blue-50 border-blue-200 text-blue-700',
      balanceNegative: theme === 'dark' ? 'bg-orange-900/20 border-orange-800 text-orange-300' : 'bg-orange-50 border-orange-200 text-orange-700',
      buy: theme === 'dark' ? 'bg-blue-900/20 border-blue-800 text-blue-400' : 'bg-blue-50 border-blue-200 text-blue-600',
      sell: theme === 'dark' ? 'bg-orange-900/20 border-orange-800 text-orange-400' : 'bg-orange-50 border-orange-200 text-orange-600',
      dividend: theme === 'dark' ? 'bg-purple-900/20 border-purple-800 text-purple-400' : 'bg-purple-50 border-purple-200 text-purple-600',
      netPositive: theme === 'dark' ? 'bg-indigo-900/20 border-indigo-800 text-indigo-300' : 'bg-indigo-50 border-indigo-200 text-indigo-700',
      netNegative: theme === 'dark' ? 'bg-red-900/20 border-red-800 text-red-300' : 'bg-red-50 border-red-200 text-red-700',
    };

    return `${baseStyles} ${typeStyles[type]} ${fullWidth ? 'col-span-2' : ''}`;
  };

  return (
    <div className={getStyles()}>
      <p className="text-xs font-semibold">{label}</p>
      <p className="text-sm font-bold truncate">
        {formatCurrency(value)}
      </p>
    </div>
  );
}