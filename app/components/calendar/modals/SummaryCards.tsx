import { useAuth } from "@/app/context/AuthContext";
import { useThemeColors } from "@/app/hook/useThemeColors";

interface SummaryCardsProps {
  totalIncome?: number;
  totalExpenses?: number;
  className?: string;
  showBalance?: boolean;
  items?: Array<{
    label: string;
    value: number;
    type?: 'income' | 'expense' | 'neutral';
  }>;
}

export default function SummaryCards({
  totalIncome = 0,
  totalExpenses = 0,
  className = "",
  showBalance = true,
  items
}: SummaryCardsProps) {
  const { user } = useAuth();

  const formatCurrency = (amount: number) => {
    if (!user?.showValues) return '*****';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  };

  const displayItems = items || [
    {
      label: "Receitas",
      value: totalIncome,
      type: "income" as const
    },
    {
      label: "Despesas", 
      value: totalExpenses,
      type: "expense" as const
    },
    ...(showBalance ? [{
      label: "Saldo do dia",
      value: totalIncome - totalExpenses,
      type: (totalIncome - totalExpenses >= 0 ? "income" : "expense") as "income" | "expense"
    }] : [])
  ];

  return (
    <div className={`grid grid-cols-2 sm:grid-cols-3 gap-2 ${className}`}>
      {displayItems.map((item, index) => (
        <SummaryCard
          key={index}
          label={item.label}
          value={item.value}
          type={item.type}
          formatCurrency={formatCurrency}
        />
      ))}
    </div>
  );
}

interface SummaryCardProps {
  label: string;
  value: number;
  type?: 'income' | 'expense' | 'neutral';
  formatCurrency: (amount: number) => string;
  fullWidth?: boolean;
  className?: string;
}

function SummaryCard({ 
  label, 
  value, 
  type = 'neutral', 
  formatCurrency, 
  fullWidth = false,
  className = ""
}: SummaryCardProps) {
  const theme = useThemeColors();

  const getTypeStyles = () => {
    const styles = {
      income: theme.colors.income,
      expense: theme.colors.expense,
      neutral: {
        bg: theme.bg.secondary,
        border: theme.border.primary,
        text: theme.text.primary
      }
    };

    const currentStyle = styles[type];
    
    return `${currentStyle.bg} ${currentStyle.border} ${currentStyle.text}`;
  };

  return (
    <div 
      className={`py-2 px-3 rounded-lg text-center border transition-colors ${getTypeStyles()} ${fullWidth ? 'col-span-2 sm:col-span-3' : ''} ${className}`}
      title={label}
    >
      <p className="text-xs font-medium opacity-80 mb-1">{label}</p>
      <p className="text-sm font-bold truncate">
        {formatCurrency(value)}
      </p>
    </div>
  );
}