import { HiX, HiPlus } from "react-icons/hi";
import { useTheme } from "@/app/context/ThemeContext";
import { Button } from "@/app/components"; // ajuste o caminho conforme necessário

interface DayModalHeaderProps {
  activeTab: 'transactions' | 'investments';
  selectedDate: Date;
  transactionsCount: number;
  investmentsCount: number;
  onClose: () => void;
  onAddClick: () => void;
}

export default function DayModalHeader({
  activeTab,
  selectedDate,
  transactionsCount,
  investmentsCount,
  onClose,
  onAddClick
}: DayModalHeaderProps) {
  const { resolvedTheme } = useTheme();

  const colors = {
    text: resolvedTheme === 'dark' ? 'text-gray-100' : 'text-gray-800',
    textSecondary: resolvedTheme === 'dark' ? 'text-gray-300' : 'text-gray-600',
    bg: resolvedTheme === 'dark' ? 'bg-gray-800' : 'bg-gradient-to-r from-blue-50 to-indigo-50',
    border: resolvedTheme === 'dark' ? 'border-gray-700' : 'border-gray-200',
  };

  return (
    <div className={`p-4 border-b ${colors.bg} ${colors.border}`}>
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1 min-w-0">
          <h3 className={`text-lg font-bold ${colors.text} truncate`}>
            {activeTab === 'transactions' ? 'Transações' : 'Investimentos'} - {' '}
            {selectedDate?.toLocaleDateString('pt-BR', { 
              day: '2-digit',
              month: '2-digit',
              year: 'numeric'
            })}
          </h3>
          <p className={`text-sm ${colors.textSecondary} mt-1`}>
            {activeTab === 'transactions' 
              ? `${transactionsCount} transação${transactionsCount !== 1 ? 's' : ''}`
              : `${investmentsCount} investimento${investmentsCount !== 1 ? 's' : ''}`
            }
          </p>
        </div>
        <div className="flex items-center space-x-2 ml-2">
          <Button
            onClick={onAddClick}
            variant="success"
            size="sm"
            icon={<HiPlus className="w-4 h-4" />}
            className="rounded-full !p-2"
            title={`Novo ${activeTab === 'transactions' ? 'Transação' : 'Investimento'}`}
          />
          <Button
            onClick={onClose}
            variant="secondary"
            size="sm"
            icon={<HiX className="w-4 h-4" />}
            className="rounded-full !p-2"
            title="Fechar"
          />
        </div>
      </div>
    </div>
  );
}