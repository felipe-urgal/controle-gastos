"use client";

import { HiChevronLeft, HiChevronRight } from "react-icons/hi";
import { Account } from '@/app/types/calendar';
import { monthNames } from '@/app/utils/calendarUtils';
import { useThemeColors } from '@/app/hook/useThemeColors';
import Select from '@/app/components/ui/Select';

interface CalendarHeaderProps {
  currentDate: Date;
  selectedAccount: string | 'all';
  accounts: Account[];
  onGoToPreviousMonth: () => void;
  onGoToNextMonth: () => void;
  onGoToToday: () => void;
  onAccountChange: (accountId: string | number) => void;
  isLoading: boolean;
}

export default function CalendarHeader({
  currentDate,
  selectedAccount,
  accounts,
  onGoToPreviousMonth,
  onGoToNextMonth,
  onGoToToday,
  onAccountChange,
  isLoading
}: CalendarHeaderProps) {
  const colors = useThemeColors();

  // Preparar as opções para o Select
  const accountOptions = accounts.map(account => ({
    id: account.id,
    value: account.id,
    label: account.name,
    name: account.name
  }));

  // Estilos para estados desabilitados
  const disabledStyles = {
    button: `opacity-50 cursor-not-allowed ${colors.button.primary.bg} ${colors.button.primary.text}`,
    ghostButton: `opacity-50 cursor-not-allowed ${colors.button.ghost.bg} ${colors.button.ghost.text}`,
    text: `opacity-70`
  };

  return (
    <div className="px-3 py-3">
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 pb-2 border-b ${colors.border.primary}`}>
        {/* Lado Esquerdo - Navegação do Mês */}
        <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-4 w-full sm:w-auto">
          {/* Título do Mês e Botão Hoje */}
          <div className="flex items-center gap-2 sm:gap-3 flex-1 sm:flex-none">
            <h2 className={`text-xl sm:text-2xl font-bold ${colors.text.primary} whitespace-nowrap truncate min-w-0 ${isLoading ? disabledStyles.text : ''}`}>
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            <button
              onClick={onGoToToday}
              disabled={isLoading}
              className={`px-3 py-1.5 text-xs rounded-lg transition-all duration-200 transform focus:outline-none focus:ring-2 ${
                isLoading 
                  ? disabledStyles.button
                  : `${colors.button.primary.bg} ${colors.button.primary.text} ${colors.button.primary.shadow} hover:scale-105 active:scale-95 ${colors.button.primary.focus}`
              }`}
            >
              Hoje
            </button>
          </div>

          {/* Navegação por Mês - Mobile */}
          <div className="flex items-center gap-1 sm:hidden">
            <button
              onClick={onGoToPreviousMonth}
              disabled={isLoading}
              className={`p-2 rounded-full transition-all duration-200 transform focus:outline-none focus:ring-2 ${
                isLoading
                  ? disabledStyles.ghostButton
                  : `${colors.button.ghost.bg} ${colors.button.ghost.text} hover:scale-110 active:scale-95 ${colors.button.ghost.focus}`
              }`}
              aria-label="Mês anterior"
            >
              <HiChevronLeft className="w-6 h-6" />
            </button>
            
            <button
              onClick={onGoToNextMonth}
              disabled={isLoading}
              className={`p-2 rounded-full transition-all duration-200 transform focus:outline-none focus:ring-2 ${
                isLoading
                  ? disabledStyles.ghostButton
                  : `${colors.button.ghost.bg} ${colors.button.ghost.text} hover:scale-110 active:scale-95 ${colors.button.ghost.focus}`
              }`}
              aria-label="Próximo mês"
            >
              <HiChevronRight className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Lado Direito - Filtros e Navegação Desktop */}
        <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
          {/* Filtro de Contas - Usando o Componente Select Personalizado */}
          <div className="flex-1 sm:flex-none min-w-0 w-full sm:w-48">
            <Select
              options={[
                { id: 'all', value: 'all', label: 'Todas as contas', name: 'Todas as contas' },
                ...accountOptions
              ]}
              value={selectedAccount}
              onChange={onAccountChange}
              placeholder="Selecione uma conta"
              searchable={true}
              searchPlaceholder="Buscar contas..."
              variant="outlined"
              size="md"
              className="w-full"
              disabled={isLoading}
            />
          </div>

          {/* Navegação por Mês - Desktop */}
          <div className="hidden sm:flex items-center gap-1 flex-shrink-0">
            <button
              onClick={onGoToPreviousMonth}
              disabled={isLoading}
              className={`p-2 rounded-full transition-all duration-200 transform focus:outline-none focus:ring-2 ${
                isLoading
                  ? disabledStyles.ghostButton
                  : `${colors.button.ghost.bg} ${colors.button.ghost.text} hover:scale-110 active:scale-95 ${colors.button.ghost.focus}`
              }`}
              aria-label="Mês anterior"
            >
              <HiChevronLeft className="w-6 h-6" />
            </button>
            
            <button
              onClick={onGoToNextMonth}
              disabled={isLoading}
              className={`p-2 rounded-full transition-all duration-200 transform focus:outline-none focus:ring-2 ${
                isLoading
                  ? disabledStyles.ghostButton
                  : `${colors.button.ghost.bg} ${colors.button.ghost.text} hover:scale-110 active:scale-95 ${colors.button.ghost.focus}`
              }`}
              aria-label="Próximo mês"
            >
              <HiChevronRight className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}