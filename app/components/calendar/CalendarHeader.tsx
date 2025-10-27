"use client";

import { HiChevronLeft, HiChevronRight } from "react-icons/hi";
import { Account } from '@/app/types/calendar';
import { useThemeColors } from '@/app/hook';
import { monthNames, formatCurrency } from '@/app/utils';
import { ViewToggle, Select, Button } from '@/app/components';
import { useAuth } from '@/app/context';

interface CalendarHeaderProps {
  currentDate: Date;
  selectedAccount: string | 'all';
  accounts: Account[];
  onGoToPreviousMonth: () => void;
  onGoToNextMonth: () => void;
  onGoToToday: () => void;
  onAccountChange: (accountId: string | number) => void;
  onViewChange: (view: 'month' | 'list' | 'stats') => void;
  currentView: 'month' | 'list' | 'stats';
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
  onViewChange,
  currentView,
  isLoading
}: CalendarHeaderProps) {
  const colors = useThemeColors();
  const { user } = useAuth();

  // Preparar as opções para o Select
  const accountOptions = accounts.map(account => {
    const balance = typeof account.balance === 'number' ? account.balance : Number(account.balance) || 0;
    
    return {
      id: account.id,
      value: account.id,
      label: `${account.name}: ${user?.showValues ? formatCurrency(balance) : '*****'}`,
      name: account.name
    };
  });

  return (
    <div className={`
      flex items-center justify-between p-4 border-b ${colors.border.primary} 
      flex-shrink-0 sticky top-0 ${colors.bg.modal} z-10
      shadow-sm sm:shadow-none pt-safe mb-2
    `}>
      <div className={`flex flex-col sm:flex-row items-center sm:justify-between gap-3 w-full ${colors.border.primary}`}>
        {/* Lado Esquerdo - Navegação do Mês */}
        <div className="flex items-center justify-between sm:justify-start gap-3 w-full lg:w-auto">
          {/* Título do Mês e Botão Hoje */}
          <Button
            onClick={onGoToToday}
            disabled={isLoading}
            variant="primary"
            size="sm"
            className="px-4 lg:px-8"
          >
            Hoje
          </Button>

          <div className="hidden lg:flex items-center gap-1 flex-shrink-0">
            <Button
              onClick={onGoToPreviousMonth}
              disabled={isLoading}
              variant="ghost"
              size="sm"
              icon={<HiChevronLeft className="w-6 h-6" />}
              aria-label="Mês anterior"
            />
            
            <Button
              onClick={onGoToNextMonth}
              disabled={isLoading}
              variant="ghost"
              size="sm"
              icon={<HiChevronRight className="w-6 h-6" />}
              aria-label="Próximo mês"
            />
          </div>

          <h2 className={`text-4xl md:text-3xl lg:text-3xl font-bold ${colors.text.primary} whitespace-nowrap truncate min-w-0 ${isLoading ? 'opacity-70' : ''}`}>
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
        </div>

        {/* Lado Direito - Filtros e Navegação Desktop */}
        <div className="flex items-center justify-between sm:justify-end gap-2 w-full lg:w-auto">
          {/* Toggle de Visualização */}
          <ViewToggle currentView={currentView} onViewChange={onViewChange} disabled={isLoading} />

          {/* Filtro de Contas */}
          <div className="flex-1 sm:flex-none min-w-0 w-55">
            <Select
              options={accountOptions}
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
        </div>
      </div>
    </div>
  );
}
