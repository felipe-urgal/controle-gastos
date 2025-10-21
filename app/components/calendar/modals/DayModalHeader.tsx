import { HiX, HiPlus } from "react-icons/hi";

import { useThemeColors } from "@/app/hook";

import { Button } from "@/app/components";

interface DayModalHeaderProps {
  selectedDate: Date | string;
  onClose: () => void;
  onAddClick: () => void;
  className?: string;
  showWeekday?: boolean;
  addButtonText?: string;
  closeButtonVariant?: "secondary" | "ghost" | "danger";
}

export default function DayModalHeader({
  selectedDate,
  onClose,
  onAddClick,
  className = "",
  showWeekday = true,
  addButtonText,
  closeButtonVariant = "ghost"
}: DayModalHeaderProps) {
  const theme = useThemeColors();

  // Converte para Date se for string
  const date = typeof selectedDate === 'string' ? new Date(selectedDate) : selectedDate;

  // Formata a data
  const formattedDate = date?.toLocaleDateString('pt-BR', { 
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  const formattedWeekday = date?.toLocaleDateString('pt-BR', { 
    weekday: 'long'
  });

  return (
    <div className={`p-4 border-b ${theme.bg.secondary} ${theme.border.primary} ${className}`}>
      <div className="flex justify-between items-center">
        <div className="flex-1 text-center">
          <h3 className={`text-lg font-bold ${theme.text.primary} truncate`}>
            {formattedDate}
          </h3>
          {showWeekday && formattedWeekday && (
            <p className={`text-sm ${theme.text.secondary} mt-1 capitalize`}>
              {formattedWeekday}
            </p>
          )}
        </div>
        <div className="flex items-center space-x-2 ml-2">
          <Button
            onClick={onAddClick}
            variant="success"
            size="sm"
            icon={<HiPlus className="w-4 h-4" />}
            className="rounded-full !p-2"
            title={addButtonText || "Nova Transação"}
          />
          <Button
            onClick={onClose}
            variant={closeButtonVariant}
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
