import { useAuth } from "@/app/context/AuthContext";
import { useTheme } from "@/app/context/ThemeContext";

interface SummaryCardsProps {
  totalIncome: number;
  totalExpenses: number;
}

export default function SummaryCards({
  totalIncome,
  totalExpenses,
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

  return (
    <div className="mt-3 grid grid-cols-3 gap-2">
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
        type={totalIncome - totalExpenses >= 0 ? "income" : "expense"}
        formatCurrency={formatCurrency}
      />
    </div>
  );
}

interface SummaryCardProps {
  label: string;
  value: number;
  theme: string;
  type: 'income' | 'expense';
  formatCurrency: (amount: number) => string;
  fullWidth?: boolean;
}

function SummaryCard({ label, value, theme, type, formatCurrency, fullWidth = false }: SummaryCardProps) {
  const getStyles = () => {
    const baseStyles = "py-1 rounded-full text-center border";
    
    const typeStyles = {
      income: theme === 'dark' ? 'bg-green-900/20 border-green-800 text-green-400' : 'bg-green-50 border-green-200 text-green-600',
      expense: theme === 'dark' ? 'bg-red-900/20 border-red-800 text-red-400' : 'bg-red-50 border-red-200 text-red-600',
    };

    return `${baseStyles} ${typeStyles[type]} ${fullWidth ? 'col-span-2' : ''}`;
  };

  return (
    <div className={getStyles()} title={label}>
      {/*<p className="text-xs font-semibold">{label}</p>*/}
      <p className="text-xs font-bold truncate">
        {formatCurrency(value)}
      </p>
    </div>
  );
}