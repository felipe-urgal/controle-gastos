// app/components/AccountPreview.tsx
import { useTheme } from '@/app/context/ThemeContext';
import { IconRenderer } from '@/app/components';
import { formatCurrency } from '@/app/utils/format';

interface AccountPreviewProps {
  formData: {
    name: string;
    balance: number;
    type: string;
    currency: string;
    color: string;
    icon: string;
    description: string;
    isActive: boolean;
  };
}

const typeLabels: { [key: string]: string } = {
  CREDIT_DEBIT: 'Crédito/Débito',
  INVESTMENT: 'Investimento',
};

export default function AccountPreview({ formData }: AccountPreviewProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const colors = {
    bg: {
      secondary: isDark ? 'bg-gray-800' : 'bg-gray-50',
      tertiary: isDark ? 'bg-gray-700' : 'bg-gray-100',
    },
    text: {
      primary: isDark ? 'text-gray-100' : 'text-gray-900',
      secondary: isDark ? 'text-gray-300' : 'text-gray-600',
      tertiary: isDark ? 'text-gray-400' : 'text-gray-500',
    },
    border: {
      primary: isDark ? 'border-gray-700' : 'border-gray-200',
      credit_debit: isDark ? 'border-blue-700' : 'border-blue-200',
      investment: isDark ? 'border-purple-700' : 'border-purple-200',
    },
    state: {
      hover: isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100',
    }
  };

  const getBorderColor = () => {
    if (!formData.isActive) return colors.border.primary;
    return formData.type === 'CREDIT_DEBIT' ? colors.border.credit_debit : colors.border.investment;
  };

  const getTypeBadgeColor = () => {
    return formData.type === 'CREDIT_DEBIT' 
      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' 
      : 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
  };

  return (
    <div className={`p-3 sm:p-4 rounded-xl border ${colors.border.primary} ${colors.bg.secondary} transition-all`}>
      <h3 className={`text-sm font-semibold mb-3 ${colors.text.secondary} flex items-center gap-2`}>
        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
        Pré-visualização
      </h3>
      
      {/* Card Principal */}
      <div className={`p-3 sm:p-4 rounded-lg border-1 border-l-0 ${getBorderColor()} ${colors.state.hover} transition-all relative mb-4`}>
        {/* Indicador de cor */}
        <div 
          className="absolute top-0 left-0 w-2 h-full rounded-l-lg"
          style={{ backgroundColor: formData.color }}
        />

        <div className="flex items-start gap-3 ml-3">
          {/* Ícone */}
          <div 
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center text-white flex-shrink-0 shadow-sm"
            style={{ backgroundColor: formData.color }}
          >
            <IconRenderer 
              iconName={formData.icon} 
              className="w-4 h-4 sm:w-5 sm:h-5"
            />
          </div>
          
          {/* Conteúdo */}
          <div className="flex-1 min-w-0">
            {/* Linha 1: Nome e Status */}
            <div className="flex items-center gap-2 mb-2">
              <span className={`font-semibold truncate text-sm sm:text-base ${colors.text.primary}`}>
                {formData.name || 'Nome da Conta'}
              </span>
              {!formData.isActive && (
                <span className="text-xs px-2 py-1 bg-gray-500 text-white rounded-full flex-shrink-0">
                  Inativa
                </span>
              )}
            </div>

            {/* Linha 2: Tipo e Moeda */}
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className={`text-xs px-2 py-1 rounded-full ${getTypeBadgeColor()} flex-shrink-0`}>
                {typeLabels[formData.type] || formData.type}
              </span>
              <span className={`text-xs ${colors.text.tertiary} flex-shrink-0`}>
                {formData.currency}
              </span>
            </div>

            {/* Descrição */}
            {formData.description && (
              <div className="mb-2">
                <span className={`text-xs ${colors.text.tertiary} line-clamp-1`}>
                  {formData.description}
                </span>
              </div>
            )}

            {/* Saldo - Mobile */}
            <div className="sm:hidden">
              <span className={`text-sm font-semibold ${
                formData.balance >= 0 
                  ? 'text-green-600 dark:text-green-400' 
                  : 'text-red-600 dark:text-red-400'
              }`}>
                {formatCurrency(formData.balance, formData.currency)}
              </span>
            </div>
          </div>

          {/* Saldo - Desktop */}
          <div className="hidden sm:block flex-shrink-0">
            <span className={`text-base font-semibold ${
              formData.balance >= 0 
                ? 'text-green-600 dark:text-green-400' 
                : 'text-red-600 dark:text-red-400'
            }`}>
              {formatCurrency(formData.balance, formData.currency)}
            </span>
          </div>
        </div>
      </div>
      
      {/* Informações de Configuração */}
      {/*<div className="space-y-3">
        <h4 className={`text-xs font-medium uppercase tracking-wide ${colors.text.tertiary}`}>
          Configurações
        </h4>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className={`p-3 rounded-lg ${colors.bg.tertiary} flex items-center gap-3`}>
            <div 
              className="w-6 h-6 rounded border border-gray-300 dark:border-gray-600 flex-shrink-0"
              style={{ backgroundColor: formData.color }}
            />
            <div className="flex-1 min-w-0">
              <span className={`text-xs font-medium ${colors.text.secondary} block`}>Cor</span>
              <span className={`text-xs ${colors.text.tertiary} truncate block`}>{formData.color}</span>
            </div>
          </div>
          
          <div className={`p-3 rounded-lg ${colors.bg.tertiary} flex items-center gap-3`}>
            <div className="w-6 h-6 rounded bg-gray-200 dark:bg-gray-600 flex items-center justify-center flex-shrink-0">
              <IconRenderer 
                iconName={formData.icon} 
                size={10}
                className={colors.text.secondary}
              />
            </div>
            <div className="flex-1 min-w-0">
              <span className={`text-xs font-medium ${colors.text.secondary} block`}>Ícone</span>
              <span className={`text-xs ${colors.text.tertiary} truncate block capitalize`}>
                {formData.icon.replace('-', ' ')}
              </span>
            </div>
          </div>
        </div>

        <div className={`p-3 rounded-lg ${colors.bg.tertiary} flex items-center justify-between`}>
          <span className={`text-xs font-medium ${colors.text.secondary}`}>Status da Conta</span>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            formData.isActive 
              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
              : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
          }`}>
            {formData.isActive ? 'Ativa' : 'Inativa'}
          </span>
        </div>

        <div className={`p-3 rounded-lg ${colors.bg.tertiary}`}>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className={`font-medium ${colors.text.secondary} block mb-1`}>Tipo</span>
              <span className={colors.text.tertiary}>
                {typeLabels[formData.type] || formData.type}
              </span>
            </div>
            <div>
              <span className={`font-medium ${colors.text.secondary} block mb-1`}>Moeda</span>
              <span className={colors.text.tertiary}>
                {formData.currency}
              </span>
            </div>
            <div className="col-span-2">
              <span className={`font-medium ${colors.text.secondary} block mb-1`}>Saldo</span>
              <span className={`font-semibold ${
                formData.balance >= 0 
                  ? 'text-green-600 dark:text-green-400' 
                  : 'text-red-600 dark:text-red-400'
              }`}>
                {formatCurrency(formData.balance, formData.currency)}
              </span>
            </div>
          </div>
        </div>
      </div>*/}

      {/* Indicador de Preview - Mobile */}
      <div className="sm:hidden mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-center gap-2">
          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
          <span className={`text-xs ${colors.text.tertiary}`}>
            Preview em tempo real
          </span>
        </div>
      </div>
    </div>
  );
}