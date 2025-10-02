import { HiX, HiPlus } from "react-icons/hi";
import { useTheme } from "@/app/context/ThemeContext";
import { Button } from "@/app/components"; // ajuste o caminho conforme necessário

interface DayModalHeaderProps {
  selectedDate: Date;
  onClose: () => void;
  onAddClick: () => void;
}

export default function DayModalHeader({
  selectedDate,
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
    <div className={`p-3 border-b ${colors.bg} ${colors.border}`}>
      <div className="flex justify-between items-center">
        <div className="flex-1 text-center">
          <h3 className={`text-lg font-bold ${colors.text} truncate`}>
            {selectedDate?.toLocaleDateString('pt-BR', { 
              day: '2-digit',
              month: '2-digit',
              year: 'numeric'
            })}
          </h3>
        </div>
        <div className="flex items-center space-x-2 ml-2">
          <Button
            onClick={onAddClick}
            variant="success"
            size="sm"
            icon={<HiPlus className="w-4 h-4" />}
            className="rounded-full !p-2"
            title="Nova 'Transação"
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