import { useAuth } from "@/app/context";
import { useThemeColors } from "@/app/hook";
import { formatCurrency } from '@/app/utils';

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
    <div className={`grid grid-cols-4 sm:grid-cols-3 ${className}`}>
      {displayItems.map((item, index) => (
        <SummaryCard
          key={index}
          label={item.label}
          value={item.value}
          type={item.type}
          formatCurrency={formatCurrency}
          isFirst={index === 0}
          isLast={index === displayItems.length - 1}
          totalItems={displayItems.length}
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
  isFirst?: boolean;
  isLast?: boolean;
  totalItems?: number;
}

function SummaryCard({ 
  label, 
  value, 
  type = 'neutral', 
  formatCurrency, 
  fullWidth = false,
  className = "",
  isFirst = false,
  isLast = false,
  totalItems = 0
}: SummaryCardProps) {
  const theme = useThemeColors();
  const { user } = useAuth();

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

  const getBorderRadius = () => {
    if (totalItems <= 1) return 'rounded-xl';
    if (isFirst) return 'rounded-s-xl';
    if (isLast) return 'rounded-e-xl';
    return '';
  };

  return (
    <div 
      className={`pl-3 py-1 transition-colors ${getTypeStyles()} ${getBorderRadius()} ${fullWidth ? 'col-span-2 sm:col-span-3' : ''} ${className}`}
      title={label}
    >
      <p className="text-[10px] font-medium opacity-80 mb-1">{label}</p>
      <p className="text-xs font-bold">
        {user?.showValues ? formatCurrency(value) : '*****'}
      </p>
    </div>
  );
}
