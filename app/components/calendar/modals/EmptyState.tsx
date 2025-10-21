import { HiSearch, HiPlus } from "react-icons/hi";

import { useThemeColors } from "@/app/hook";

import { Button } from "@/app/components";

interface EmptyStateProps {
  type?: 'transactions' | 'categories' | 'budgets' | 'generic';
  hasItems?: boolean;
  onAddClick?: () => void;
  title?: string;
  description?: string;
  buttonText?: string;
  icon?: React.ReactNode;
  className?: string;
  showButton?: boolean;
}

export default function EmptyState({ 
  type = 'generic',
  hasItems = false,
  onAddClick,
  title,
  description,
  buttonText,
  icon,
  className = "",
  showButton = true
}: EmptyStateProps) {
  const theme = useThemeColors();

  const defaultMessages = {
    transactions: {
      title: hasItems ? 'Nenhuma transação encontrada' : 'Nenhuma transação cadastrada',
      description: hasItems ? 'Tente ajustar os filtros de busca' : 'Comece adicionando sua primeira transação',
      button: 'Nova Transação'
    },
    categories: {
      title: hasItems ? 'Nenhuma categoria encontrada' : 'Nenhuma categoria cadastrada',
      description: hasItems ? 'Tente ajustar os filtros de busca' : 'Organize suas finanças com categorias',
      button: 'Nova Categoria'
    },
    budgets: {
      title: hasItems ? 'Nenhum orçamento encontrado' : 'Nenhum orçamento definido',
      description: hasItems ? 'Tente ajustar os filtros de busca' : 'Controle seus gastos com orçamentos',
      button: 'Criar Orçamento'
    },
    generic: {
      title: hasItems ? 'Nenhum item encontrado' : 'Nenhum item cadastrado',
      description: hasItems ? 'Tente ajustar os critérios de busca' : 'Adicione seu primeiro item',
      button: 'Adicionar Item'
    }
  };

  const message = defaultMessages[type];
  const displayTitle = title || message.title;
  const displayDescription = description || message.description;
  const displayButtonText = buttonText || message.button;

  const defaultIcon = icon || <HiSearch className="w-5 h-5" />;

  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center ${className}`}>
      <div className={`w-16 h-16 ${theme.bg.secondary} rounded-full flex items-center justify-center mb-4`}>
        <div className={theme.text.tertiary}>
          {defaultIcon}
        </div>
      </div>
      
      <h4 className={`text-lg font-semibold ${theme.text.primary} mb-2`}>
        {displayTitle}
      </h4>
      
      <p className={`text-sm ${theme.text.secondary} mb-6 max-w-sm`}>
        {displayDescription}
      </p>
      
      {showButton && !hasItems && onAddClick && (
        <Button
          onClick={onAddClick}
          variant="outline"
          size="md"
          icon={<HiPlus className="w-4 h-4" />}
          iconPosition="left"
          className={`border border-dashed hover:border-solid transition-all duration-200 ${theme.border.primary} hover:${theme.button.primary.bg.split(' ')[0]}`}
        >
          {displayButtonText}
        </Button>
      )}
    </div>
  );
}
