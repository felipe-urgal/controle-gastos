import { FaArrowDown, FaArrowUp, FaCalendarAlt, FaChevronRight, FaWallet } from 'react-icons/fa';

const transactions = [
  {
    description: 'Salário',
    category: 'Receita',
    amount: '+ R$ 4.200,00',
    status: 'Concluída',
    kind: 'income' as const,
  },
  {
    description: 'Mercado',
    category: 'Alimentação',
    amount: '- R$ 275,80',
    status: 'Concluída',
    kind: 'expense' as const,
  },
  {
    description: 'Aluguel',
    category: 'Moradia',
    amount: '- R$ 1.450,00',
    status: 'Pendente',
    kind: 'pending' as const,
  },
];

export default function FinancialMock() {
  return (
    <div className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-surface)]">
      <div className="flex items-center justify-between gap-4 border-b border-[var(--border)] px-5 py-4 sm:px-6">
        <div className="min-w-0">
          <p className="text-sm font-medium text-[var(--text-muted)]">Transações</p>
          <p className="mt-0.5 truncate text-lg font-semibold text-[var(--foreground)]">Agosto de 2026</p>
        </div>
        <span className="rounded-full border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-1.5 text-sm font-medium text-[var(--text-muted)]">
          Exemplo
        </span>
      </div>

      <div className="grid gap-px border-b border-[var(--border)] bg-[var(--border)] sm:grid-cols-3">
        <div className="bg-[var(--surface)] p-4 sm:p-5">
          <div className="flex items-center gap-2 text-sm font-medium text-[var(--text-muted)]">
            <FaWallet aria-hidden="true" />
            Conta principal
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-[var(--foreground)]">R$ 2.474,20</p>
        </div>
        <div className="bg-[var(--surface)] p-4 sm:p-5">
          <div className="flex items-center gap-2 text-sm font-medium text-[var(--text-muted)]">
            <FaArrowUp className="text-[var(--income)]" aria-hidden="true" />
            Receitas
          </div>
          <p className="mt-2 text-xl font-semibold text-[var(--income)]">R$ 4.200,00</p>
        </div>
        <div className="bg-[var(--surface)] p-4 sm:p-5">
          <div className="flex items-center gap-2 text-sm font-medium text-[var(--text-muted)]">
            <FaArrowDown className="text-[var(--expense)]" aria-hidden="true" />
            Despesas
          </div>
          <p className="mt-2 text-xl font-semibold text-[var(--expense)]">R$ 1.725,80</p>
        </div>
      </div>

      <div className="px-4 py-2 sm:px-5">
        <div className="flex min-h-11 items-center justify-between gap-3 border-b border-[var(--border)] px-1 text-sm font-semibold uppercase tracking-[0.08em] text-[var(--text-subtle)]">
          <span>Movimentações recentes</span>
          <FaCalendarAlt aria-hidden="true" />
        </div>

        <div className="divide-y divide-[var(--border)]">
          {transactions.map((transaction) => (
            <div key={transaction.description} className="flex items-center gap-3 py-4">
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                  transaction.kind === 'income'
                    ? 'bg-[var(--primary-subtle)] text-[var(--income)]'
                    : transaction.kind === 'expense'
                      ? 'bg-[var(--danger-subtle)] text-[var(--expense)]'
                      : 'bg-[var(--warning-subtle)] text-[var(--pending)]'
                }`}
                aria-hidden="true"
              >
                {transaction.kind === 'income' ? <FaArrowUp /> : <FaArrowDown />}
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-semibold text-[var(--foreground)]">{transaction.description}</p>
                <p className="mt-0.5 truncate text-sm text-[var(--text-muted)]">
                  {transaction.category} · {transaction.status}
                </p>
              </div>

              <p
                className={`shrink-0 text-right text-base font-semibold ${
                  transaction.kind === 'income' ? 'text-[var(--income)]' : 'text-[var(--foreground)]'
                }`}
              >
                {transaction.amount}
              </p>
              <FaChevronRight className="hidden shrink-0 text-[var(--text-subtle)] sm:block" aria-hidden="true" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
