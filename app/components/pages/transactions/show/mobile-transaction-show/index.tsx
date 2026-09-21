'use client';

import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Link from 'next/link';
import {
  FaArrowDown,
  FaArrowLeft,
  FaArrowUp,
  FaCalendarAlt,
  FaCheck,
  FaClock,
  FaCopy,
  FaCreditCard,
  FaEdit,
  FaExchangeAlt,
  FaFileAlt,
  FaInfoCircle,
  FaLayerGroup,
  FaBolt,
  FaTag,
  FaTimes,
  FaTrashAlt,
  FaWallet,
} from 'react-icons/fa';

import { IconRenderer } from '@/app/components/ui';
import { useAuth } from '@/app/context';
import { statusConfig } from '@/app/lib/constants/transaction.constants';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import { formatPtBrLogicalDate } from '@/app/lib/transactions/monthly-recurrence';
import {
  getTransferCounterpartLabel,
  getTransferDirectionLabel,
  isTransferTransaction,
} from '@/app/lib/transactions/transaction-presentation';
import type { TransactionDTO } from '@/app/types/transaction';

type Props = {
  transaction: TransactionDTO;
  backUrl: string;
  isDeleting?: boolean;
  allowMutations: boolean;
  onRequestDelete: () => void;
};

function reconciliationLabel(value: TransactionDTO['reconciliationStatus']) {
  if (value === 'RECONCILED') return 'Conciliada';
  if (value === 'CLEARED') return 'Compensada';
  return 'Não conciliada';
}

function statusMessage(status: TransactionDTO['status'], accountName: string) {
  if (status === 'COMPLETED') {
    return {
      title: 'Lançamento concluído e contabilizado no saldo.',
      description: `Esta transação já foi considerada em seus relatórios e no saldo da sua conta ${accountName}.`,
      tone: 'border-cyan-400/60',
      icon: 'bg-cyan-300 text-slate-950',
    };
  }

  if (status === 'PENDING') {
    return {
      title: 'Lançamento pendente.',
      description: 'Esta transação ainda não foi considerada como concluída no período.',
      tone: 'border-[var(--warning)]/55',
      icon: 'bg-[var(--warning)] text-[var(--background)]',
    };
  }

  return {
    title: 'Lançamento cancelado.',
    description: 'Esta transação permanece no histórico, mas está marcada como cancelada.',
    tone: 'border-[var(--expense)]/55',
    icon: 'bg-[var(--expense)] text-white',
  };
}

export default function MobileTransactionShow({
  transaction,
  backUrl,
  isDeleting = false,
  allowMutations,
  onRequestDelete,
}: Props) {
  const { user } = useAuth();
  const showValues = user?.showValues !== false;
  const transactionDate = new Date(transaction.year, transaction.month - 1, transaction.day);
  const createdAt = new Date(transaction.createdAt);
  const updatedAt = new Date(transaction.updatedAt);
  const isTransfer = isTransferTransaction(transaction);
  const isIncome = transaction.type === 'INCOME';
  const isInstallment = transaction.series?.type === 'INSTALLMENT';
  const status = statusConfig[transaction.status as keyof typeof statusConfig] || statusConfig.COMPLETED;
  const callout = statusMessage(transaction.status, transaction.account.name);
  const statusIcon =
    transaction.status === 'COMPLETED'
      ? <FaCheck aria-hidden="true" />
      : transaction.status === 'PENDING'
        ? <FaClock aria-hidden="true" />
        : <FaTimes aria-hidden="true" />;

  const amount = showValues
    ? formatCurrency(transaction.amount, transaction.account.currency)
    : '••••';
  const sign = isTransfer
    ? transaction.transferRole === 'DESTINATION'
      ? '+'
      : transaction.transferRole === 'SOURCE'
        ? '-'
        : ''
    : isIncome
      ? '+'
      : '-';

  const amountTone = isTransfer
    ? 'text-[var(--orbit-primary)]'
    : isIncome
      ? 'text-[var(--income)]'
      : 'text-[var(--expense)]';

  const heroIcon = isTransfer
    ? <FaExchangeAlt aria-hidden="true" />
    : transaction.category
      ? <IconRenderer iconName={transaction.category.icon || 'tag'} size={24} />
      : isIncome
        ? <FaArrowUp aria-hidden="true" />
        : <FaArrowDown aria-hidden="true" />;

  const heroIconStyle = isTransfer
    ? undefined
    : transaction.category?.color
      ? { color: transaction.category.color }
      : undefined;

  return (
    <div
      className={`space-y-3 pb-3 transition-opacity duration-150 ${
        isDeleting ? 'pointer-events-none opacity-50' : ''
      }`}
    >
      <header className="flex min-h-12 items-center gap-2">
        <Link
          href={backUrl}
          aria-label="Voltar"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-[11px] text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
        >
          <FaArrowLeft aria-hidden="true" />
        </Link>
        <h1 className="min-w-0 flex-1 truncate text-center text-xl font-bold tracking-tight text-[var(--foreground)]">
          {isTransfer ? 'Detalhes da transferência' : 'Detalhes da transação'}
        </h1>
        {allowMutations && (
          <Link
            href={`/transacoes/alterar/${transaction.id}`}
            aria-label="Editar transação"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-[11px] border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
          >
            <FaEdit aria-hidden="true" />
          </Link>
        )}
      </header>

      <section
        className="relative overflow-hidden rounded-[20px] border border-[var(--orbit-primary)]/55 p-4"
        style={{
          background:
            'linear-gradient(135deg, color-mix(in srgb, var(--orbit-primary) 52%, var(--surface)) 0%, color-mix(in srgb, #2563eb 27%, var(--surface)) 58%, color-mix(in srgb, var(--orbit-primary) 24%, var(--surface)) 100%)',
        }}
        aria-labelledby="mobile-transaction-title"
      >
        <div className="pointer-events-none absolute bottom-4 right-5 hidden text-[78px] text-[var(--orbit-primary)] opacity-20 min-[360px]:block" aria-hidden="true">
          {heroIcon}
        </div>

        <div className="relative z-[1] flex items-start gap-3">
          <span
            className="grid h-16 w-16 shrink-0 place-items-center rounded-full border border-white/20 bg-white/10 text-2xl text-white shadow-[inset_0_0_24px_rgba(255,255,255,.08)]"
            style={heroIconStyle}
            aria-hidden="true"
          >
            {heroIcon}
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h2 id="mobile-transaction-title" className="truncate text-xl font-bold text-[var(--foreground)]">
                  {transaction.description || 'Sem descrição'}
                </h2>
                <p className="mt-1 flex min-w-0 items-center gap-1.5 truncate text-sm text-white/70">
                  <FaWallet className="shrink-0 text-[10px]" aria-hidden="true" />
                  <span className="truncate">{transaction.account.name}</span>
                </p>
              </div>
              <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${status.color}`}>
                <span className="text-[10px]" aria-hidden="true">{statusIcon}</span>
                {status.label}
              </span>
            </div>

            <strong className={`mt-5 block break-words text-[40px] font-black leading-none tracking-tight text-white`}>
              {sign}{amount}
            </strong>
            {!showValues ? (
              <p className="mt-2 text-xs text-white/65">Valores ocultos pelas suas preferências.</p>
            ) : (
              <p className="mt-2 text-sm text-white/65">Pequenas escolhas, grandes conquistas.</p>
            )}
          </div>
        </div>
      </section>

      <MobileInfoCard title="Sobre" icon={<FaFileAlt />}>
        <MobileInfoRow
          label="Tipo"
          value={isTransfer ? getTransferDirectionLabel(transaction) || 'Transferência' : isIncome ? 'Receita' : 'Despesa'}
          icon={isTransfer ? <FaExchangeAlt /> : isIncome ? <FaArrowUp /> : <FaArrowDown />}
          valueClassName={amountTone}
        />
        {!isTransfer && transaction.category && (
          <MobileInfoRow
            label="Categoria"
            value={transaction.category.name}
            icon={<FaTag />}
            iconValue={
              <IconRenderer
                iconName={transaction.category.icon || 'tag'}
                size={15}
                color={transaction.category.color}
              />
            }
          />
        )}
        {isTransfer && (
          <MobileInfoRow
            label="Contraparte"
            value={getTransferCounterpartLabel(transaction) || 'Contraparte indisponível'}
            icon={<FaExchangeAlt />}
          />
        )}
        <MobileInfoRow
          label="Data"
          value={format(transactionDate, 'dd/MM/yyyy', { locale: ptBR })}
          icon={<FaCalendarAlt />}
        />
        <MobileInfoRow
          label="Horário"
          value={format(createdAt, 'HH:mm')}
          icon={<FaClock />}
        />
      </MobileInfoCard>

      <MobileInfoCard title="Conta e origem" icon={<FaCreditCard />}>
        <MobileInfoRow
          label="Conta"
          value={transaction.account.name}
          icon={<FaWallet />}
          iconValue={
            <span
              className="grid h-6 w-6 place-items-center rounded-[7px] text-white"
              style={{ backgroundColor: transaction.account.color || 'var(--orbit-primary)' }}
            >
              <IconRenderer iconName={transaction.account.icon || 'wallet'} size={12} />
            </span>
          }
        />
        <MobileInfoRow
          label="Moeda"
          value={transaction.account.currency}
          icon={<span className="text-xs font-bold">R$</span>}
        />
        {isTransfer ? (
          <MobileInfoRow
            label="Origem"
            value={
              transaction.transferRole === 'DESTINATION'
                ? transaction.counterpartAccount?.name ?? 'Contraparte indisponível'
                : transaction.account.name
            }
            icon={<FaExchangeAlt />}
          />
        ) : (
          <MobileInfoRow
            label="Origem"
            value="Não registrada"
            icon={<FaInfoCircle />}
          />
        )}
      </MobileInfoCard>

      <MobileInfoCard title="Mais informações" icon={<FaTag />}>
        <MobileInfoRow
          label="Criada em"
          value={format(createdAt, 'dd/MM/yyyy · HH:mm')}
          icon={<FaCalendarAlt />}
        />
        <MobileInfoRow
          label="Atualizada em"
          value={format(updatedAt, 'dd/MM/yyyy · HH:mm')}
          icon={<FaClock />}
        />
        <MobileInfoRow
          label={transaction.series ? (isInstallment ? 'Parcelamento' : 'Recorrência') : 'Conciliação'}
          value={
            transaction.series
              ? isInstallment
                ? `Parcela ${transaction.seriesIndex ?? '?'} de ${transaction.series.occurrenceCount}`
                : `${transaction.series.occurrenceCount} ocorrências`
              : reconciliationLabel(transaction.reconciliationStatus)
          }
          icon={transaction.series ? <FaLayerGroup /> : <FaCheck />}
        />
      </MobileInfoCard>

      {transaction.series && (
        <section className="rounded-[16px] border border-[var(--orbit-primary)]/30 bg-[var(--primary-subtle)] p-4">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--orbit-primary)] text-white">
              <FaLayerGroup aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <strong className="text-sm text-[var(--foreground)]">
                {isInstallment
                  ? `Parcela ${transaction.seriesIndex ?? '?'} de ${transaction.series.occurrenceCount}`
                  : 'Lançamento recorrente'}
              </strong>
              <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
                {formatPtBrLogicalDate(transaction.series.start)} até {formatPtBrLogicalDate(transaction.series.end)}.
                {' '}Editar altera somente esta {isInstallment ? 'parcela' : 'ocorrência'}.
              </p>
            </div>
          </div>
        </section>
      )}

      <section
        className={`rounded-[16px] border p-4 ${callout.tone}`}
        style={{
          background:
            'linear-gradient(110deg, color-mix(in srgb, #06b6d4 16%, var(--surface)) 0%, color-mix(in srgb, #2563eb 16%, var(--surface)) 100%)',
        }}
        aria-label="Estado do lançamento"
      >
        <div className="flex items-start gap-3">
          <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${callout.icon}`}>
            {statusIcon}
          </span>
          <div>
            <strong className="text-sm text-[var(--foreground)]">{callout.title}</strong>
            <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">{callout.description}</p>
          </div>
        </div>
      </section>

      {allowMutations ? (
        <section className="rounded-[16px] border border-[var(--border)] bg-[var(--surface)] p-3.5" aria-labelledby="mobile-transaction-actions">
          <h2 id="mobile-transaction-actions" className="flex items-center gap-2 text-sm font-bold text-[var(--foreground)]">
            <FaBolt className="text-[var(--orbit-primary)]" aria-hidden="true" />
            Próximas ações
          </h2>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Link
              href={`/transacoes/alterar/${transaction.id}`}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[11px] bg-[var(--orbit-primary)] px-3 text-sm font-bold text-[var(--orbit-on-primary)]"
            >
              <FaEdit aria-hidden="true" /> Editar
            </Link>
            <Link
              href={`/transacoes/nova?duplicate=${encodeURIComponent(transaction.id)}`}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[11px] border border-[var(--border-strong)] bg-[var(--surface-raised)] px-3 text-sm font-bold text-[var(--foreground)]"
            >
              <FaCopy aria-hidden="true" /> Duplicar
            </Link>
            <button
              type="button"
              onClick={onRequestDelete}
              disabled={isDeleting}
              className="col-span-2 inline-flex min-h-12 items-center justify-center gap-2 rounded-[11px] border border-[var(--expense)] bg-transparent px-3 text-sm font-bold text-[var(--expense)] disabled:opacity-50"
            >
              <FaTrashAlt aria-hidden="true" /> Excluir transação
            </button>
          </div>
        </section>
      ) : (
        <section className="rounded-[16px] border border-[var(--border)] bg-[var(--surface)] p-4">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--orbit-primary-subtle)] text-[var(--orbit-primary)]">
              <FaExchangeAlt aria-hidden="true" />
            </span>
            <div>
              <strong className="text-sm text-[var(--foreground)]">Transferência vinculada</strong>
              <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
                Esta tela é somente leitura para transferências. A contraparte permanece vinculada à mesma operação.
              </p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function MobileInfoCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[16px] border border-[var(--border)] bg-[var(--surface)] p-4">
      <h2 className="flex items-center gap-2 text-base font-bold text-[var(--foreground)]">
        <span className="text-[var(--orbit-primary)]" aria-hidden="true">{icon}</span>
        {title}
      </h2>
      <dl className="mt-3 divide-y divide-[var(--border)]">{children}</dl>
    </section>
  );
}

function MobileInfoRow({
  label,
  value,
  icon,
  iconValue,
  valueClassName = 'text-[var(--foreground)]',
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  iconValue?: React.ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="grid min-h-10 grid-cols-[minmax(0,.78fr)_minmax(0,1.22fr)] items-center gap-3 py-2 first:pt-0 last:pb-0">
      <dt className="text-sm text-[var(--text-muted)]">{label}</dt>
      <dd className={`flex min-w-0 items-center justify-end gap-2 break-words text-right text-sm font-semibold ${valueClassName}`}>
        <span className="shrink-0 text-[var(--text-subtle)]" aria-hidden="true">{iconValue ?? icon}</span>
        <span className="min-w-0 break-words">{value}</span>
      </dd>
    </div>
  );
}
