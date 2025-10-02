import { HiSearch, HiPlus } from "react-icons/hi";
import { useTheme } from "@/app/context/ThemeContext";
import { Button } from "@/app/components"; // ajuste o caminho conforme necessário

interface EmptyStateProps {
  type: 'transactions';
  hasItems: boolean;
  onAddClick: () => void;
}

export default function EmptyState({ type, hasItems, onAddClick }: EmptyStateProps) {
  const { resolvedTheme } = useTheme();

  const colors = {
    bg: resolvedTheme === 'dark' ? 'bg-gray-800' : 'bg-gray-50',
    text: resolvedTheme === 'dark' ? 'text-gray-300' : 'text-gray-600',
    textSecondary: resolvedTheme === 'dark' ? 'text-gray-400' : 'text-gray-500',
  };

  const messages = {
    transactions: {
      title: hasItems ? 'Nenhuma transação encontrada' : 'Nenhuma transação',
      description: hasItems ? 'Ajuste os filtros' : 'Adicione uma nova transação',
      button: 'Criar Transação'
    },
  };

  const message = messages[type];

  return (
    <div className="flex flex-col items-center justify-center p-6 text-center">
      <div className={`w-12 h-12 ${colors.bg} rounded-full flex items-center justify-center mb-3`}>
        <HiSearch className={`w-4 h-4 ${colors.textSecondary}`} />
      </div>
      <h4 className={`text-sm font-semibold ${colors.text} mb-1`}>
        {message.title}
      </h4>
      <p className={`text-sm ${colors.textSecondary} mb-3`}>
        {message.description}
      </p>
      {!hasItems && (
        <Button
          onClick={onAddClick}
          variant="ghost"
          size="sm"
          icon={<HiPlus  />}
          iconPosition="left"
          className="border border-dashed hover:border-solid"
        >
          {message.button}
        </Button>
      )}
    </div>
  );
}
