"use client";

// importing types
import { Account } from "@/app/types/calendar";

// importing utils
import { formatCurrency } from "@/app/lib/currency/formatCurrency";

// importing utils
import { Button, Select } from "@/app/components/ui";

interface CalendarHeaderProps {
  selectedAccount: string | "all";
  accounts: Account[];
  onGoToToday: () => void;
  onAccountChange: (accountId: string | number) => void;
  isLoading: boolean;
};

export default function CalendarHeader({
  selectedAccount,
  accounts,
  onGoToToday,
  onAccountChange,
  isLoading,
}: CalendarHeaderProps) {
  const accountOptions = [
    ...accounts.map((account) => {
      const balance =
        typeof account.balance === "number"
          ? account.balance
          : Number(account.balance) || 0;

      return {
        value: account.id,
        label: `${account.name} • ${formatCurrency(balance)}`,
      };
    }),
  ];

  return (
    <div className="relative z-50">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <Button
            onClick={onGoToToday}
            disabled={isLoading}
          >
            Hoje
          </Button>

          <div className="w-full sm:w-80 relative z-50">
            <Select
              options={accountOptions}
              value={selectedAccount}
              onChange={onAccountChange}
              placeholder="Todas as contas"
              disabled={isLoading}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
