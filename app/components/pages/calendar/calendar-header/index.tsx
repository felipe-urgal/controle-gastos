'use client';

import { FaBullseye, FaWallet } from 'react-icons/fa';

import { Button, Select } from '@/app/components/ui';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import { Account } from '@/app/types/calendar';

interface CalendarHeaderProps {
  selectedAccount: string | 'all';
  accounts: Account[];
  onGoToToday: () => void;
  onAccountChange: (accountId: string | number) => void;
  isLoading: boolean;
}

export default function CalendarHeader({
  selectedAccount,
  accounts,
  onGoToToday,
  onAccountChange,
  isLoading,
}: CalendarHeaderProps) {
  const accountOptions = [
    { value: 'all', label: 'Todas as contas' },
    ...accounts.map((account) => {
      const balance =
        typeof account.balance === 'number'
          ? account.balance
          : Number(account.balance) || 0;

      return {
        value: account.id,
        label: `${account.name || 'Conta'} • ${formatCurrency(balance, account.currency || 'BRL')}`,
      };
    }),
  ];

  return (
    <section
      className="ds-panel flex gap-4 p-3 flex-row items-end justify-between sm:p-5"
      aria-label="Filtros do calendário"
    >
      <div className="w-full sm:max-w-md">
        <Select
          label="Conta"
          options={accountOptions}
          value={selectedAccount}
          onChange={onAccountChange}
          disabled={isLoading}
          icon={<FaWallet />}
        />
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={onGoToToday}
        disabled={isLoading}
        icon={<FaBullseye />}
        className="w-full sm:w-auto"
      >
        Ir para hoje
      </Button>
    </section>
  );
}
