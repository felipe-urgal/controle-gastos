'use client';

import Link from 'next/link';
import { ModalShell } from '@/app/components/overlays/modal-shell';
import { useEffect, useRef, useState, ReactNode } from 'react';
import { FaArrowDown, FaArrowUp, FaCopy, FaCreditCard, FaExchangeAlt, FaExternalLinkAlt, FaFileImport, FaSearch } from 'react-icons/fa';
import { FilterField } from '@/app/components/navigation/dynamic-filters';
import { Button, Input, Select } from '@/app/components/ui';
import { statusConfig } from '@/app/lib/constants/transaction.constants';
import { normalizeTagDisplayName } from '@/app/lib/tags/tag-name';
import { monthOptions, yearOptions } from '@/app/lib/date/constants';
import { getTransferDirectionLabel, isTransferTransaction } from '@/app/lib/transactions/transaction-presentation';
import { tagService } from '@/app/services/tag-service';
import { TransactionDTO } from '@/app/types/transaction';
import { TagDTO } from '@/app/types/tag';
import { formatTransactionAmount } from '@/app/components/pages/transactions/index/transactions-view-helpers';

export function PeriodDialog({ month, year, loading, onApply, onClose }: { month: number; year: number; loading: boolean; onApply: (month: number, year: number) => void; onClose: () => void }) {
  const now = new Date();
  const [draftMonth, setDraftMonth] = useState(Number.isInteger(month) && month >= 1 && month <= 12 ? month : now.getMonth() + 1);
  const [draftYear, setDraftYear] = useState(Number.isInteger(year) && year > 0 ? year : now.getFullYear());

  return (
    <ModalShell
      variant="fullscreen-sheet"
      eyebrow="Período"
      title="Selecionar mês"
      description="Escolha o período usado na listagem de transações."
      closeLabel="Fechar seleção de período"
      maxWidthClass="sm:max-w-[430px]"
      onClose={onClose}
      footer={
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" className="bg-[var(--orbit-primary)] text-white hover:bg-[var(--orbit-primary-hover)]" onClick={() => { onApply(draftMonth, draftYear); onClose(); }}>Aplicar período</Button>
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Select label="Mês" value={draftMonth} onChange={(value) => setDraftMonth(Number(value))} options={monthOptions} disabled={loading} />
        <Select label="Ano" value={draftYear} onChange={(value) => setDraftYear(Number(value))} options={yearOptions} disabled={loading} />
      </div>
    </ModalShell>
  );
}

export function FilterDialog({ fields, values, loading, total, onApply, onClose }: { fields: FilterField[]; values: Record<string, any>; loading: boolean; total?: number; onApply: (values: Record<string, any>) => void; onClose: () => void }) {
  const [draftValues, setDraftValues] = useState<Record<string, any>>(() => ({ ...values }));
  const activeCount = Object.values(draftValues).filter((value) => value !== undefined && value !== null && value !== '').length;

  return (
    <ModalShell
      variant="fullscreen-sheet"
      eyebrow="Refinar transações"
      title="Filtros"
      description={`${activeCount} filtro${activeCount === 1 ? '' : 's'} selecionado${activeCount === 1 ? '' : 's'}${total !== undefined ? ` · ${total} resultado${total === 1 ? '' : 's'}` : ''}`}
      closeLabel="Fechar filtros"
      maxWidthClass="sm:max-w-[720px]"
      onClose={onClose}
      footer={
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button size="sm" variant="ghost" onClick={() => setDraftValues({})} disabled={activeCount === 0}>Limpar filtros</Button>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <Button variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button variant="primary" className="bg-[var(--orbit-primary)] text-white hover:bg-[var(--orbit-primary-hover)]" onClick={() => { onApply(draftValues); onClose(); }}>Aplicar filtros</Button>
          </div>
        </div>
      }
    >
      <TransactionFilterFields fields={fields} values={draftValues} loading={loading} onChange={(key, value) => setDraftValues((previous) => ({ ...previous, [key]: value }))} />
      <Link
        href="/transacoes/importar"
        className="mt-5 flex min-h-11 items-center justify-center gap-2 rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-semibold text-[var(--foreground)] sm:hidden"
      >
        <FaFileImport aria-hidden="true" /> Importar CSV/OFX/QFX/QIF/XLSX
      </Link>
    </ModalShell>
  );
}

export function TagFilterField({
  value,
  onChange,
}: {
  value?: string;
  onChange: (value: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<Array<Pick<TagDTO, 'id' | 'name' | 'isActive'>>>([]);
  const [selected, setSelected] = useState<Pick<TagDTO, 'id' | 'name' | 'isActive'> | null>(null);
  const [searching, setSearching] = useState(false);
  const requestSequence = useRef(0);

  useEffect(() => {
    if (!value) return;

    let active = true;
    tagService
      .getById(value)
      .then((response) => {
        if (!active) return;
        setSelected(response.data);
      })
      .catch(() => {
        if (active) setSelected(null);
      });

    return () => {
      active = false;
    };
  }, [value]);

  const selectedTag = selected?.id === value ? selected : null;

  useEffect(() => {
    const requestId = ++requestSequence.current;
    const timeout = window.setTimeout(() => {
      setSearching(true);
      tagService
        .getActiveOptions(normalizeTagDisplayName(query))
        .then((response) => {
          if (requestId !== requestSequence.current) return;
          setOptions(response.data.items ?? []);
        })
        .catch(() => {
          if (requestId === requestSequence.current) setOptions([]);
        })
        .finally(() => {
          if (requestId === requestSequence.current) setSearching(false);
        });
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [query]);

  return (
    <div className="min-w-0">
      <Input
        label="Tag"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Buscar tag"
      />

      {selectedTag ? (
        <div className="mt-2 flex min-h-11 items-center justify-between gap-2 rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3">
          <span className="min-w-0 truncate text-sm font-semibold">
            #{selectedTag.name}{!selectedTag.isActive ? ' · arquivada' : ''}
          </span>
          <Button variant="ghost" size="xs" onClick={() => onChange('')}>
            Limpar
          </Button>
        </div>
      ) : null}

      <div className="mt-2 max-h-40 overflow-y-auto rounded-[10px] border border-[var(--border)] bg-[var(--surface)]">
        {searching ? (
          <p className="p-3 text-xs text-[var(--text-muted)]">Buscando tags…</p>
        ) : options.length === 0 ? (
          <p className="p-3 text-xs text-[var(--text-muted)]">Nenhuma tag encontrada.</p>
        ) : (
          options.map((tag) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => {
                setSelected(tag);
                setQuery('');
                onChange(tag.id);
              }}
              className="flex min-h-11 w-full items-center px-3 text-left text-sm hover:bg-[var(--surface-subtle)]"
            >
              #{tag.name}
            </button>
          ))
        )}
      </div>
    </div>
  );
}

export function TransactionFilterFields({ fields, values, loading, onChange }: { fields: FilterField[]; values: Record<string, any>; loading: boolean; onChange: (key: string, value: any) => void }) {
  const searchField = fields.find((field) => field.type === 'search');
  const otherFields = fields.filter((field) => field.type !== 'search');

  return (
    <div className="space-y-5">
      {searchField?.type === 'search' && (
        <Input value={values[searchField.key] || ''} onChange={(event) => onChange(searchField.key, event.target.value)} placeholder={searchField.placeholder} aria-label={searchField.placeholder ?? 'Pesquisar'} icon={<FaSearch />} disabled={loading} />
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {otherFields.map((field) => {
          if (field.type === 'select') {
            const grouped = Array.isArray(field.options) && field.options.length > 0 && 'options' in field.options[0];
            return <Select key={field.key} label={field.label} value={values[field.key]} onChange={(value) => onChange(field.key, value)} options={field.options} placeholder="Todos" grouped={grouped} disabled={loading} />;
          }

          if (field.type === 'custom') {
            return <div key={field.key}>{field.render(values[field.key], (value) => onChange(field.key, value))}</div>;
          }

          return null;
        })}
      </div>
    </div>
  );
}

export function TransactionDetailLayer({ transaction, showValues, onClose }: { transaction: TransactionDTO; showValues: boolean; onClose: () => void }) {
  return (
    <ModalShell
      variant="side-panel"
      eyebrow="Detalhe contextual"
      title={transaction.description || 'Transação'}
      closeLabel="Fechar detalhe"
      maxWidthClass="sm:max-w-[440px]"
      onClose={onClose}
    >
      <div className="-mx-5"><OrbitTransactionDetail transaction={transaction} showValues={showValues} /></div>
    </ModalShell>
  );
}

export function OrbitTransactionDetail({ transaction, showValues, compact = false }: { transaction: TransactionDTO; showValues: boolean; compact?: boolean }) {
  const isIncome = transaction.type === 'INCOME';
  const isTransfer = isTransferTransaction(transaction);
  const isCardPayment = transaction.kind === 'CARD_PAYMENT';
  const date = new Date(transaction.year, transaction.month - 1, transaction.day);
  const iconTone = isTransfer || isCardPayment
    ? 'bg-[var(--orbit-primary-subtle)] text-[var(--orbit-primary)]'
    : isIncome
      ? 'bg-[var(--primary-subtle)] text-[var(--income)]'
      : 'bg-[var(--danger-subtle)] text-[var(--expense)]';
  const amountTone = isTransfer || isCardPayment
    ? 'text-[var(--orbit-primary)]'
    : isIncome
      ? 'text-[var(--income)]'
      : 'text-[var(--expense)]';

  return (
    <div className={compact ? 'p-4' : 'p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]'}>
      <div className="flex items-start gap-3">
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-[13px] ${iconTone}`} aria-hidden="true">{isTransfer ? <FaExchangeAlt /> : isCardPayment ? <FaCreditCard /> : isIncome ? <FaArrowUp /> : <FaArrowDown />}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-bold text-[var(--foreground)]">{transaction.description || 'Sem descrição'}</p>
          <p className="mt-0.5 text-sm text-[var(--text-muted)]">{isTransfer ? getTransferDirectionLabel(transaction) : isCardPayment ? 'Pagamento de fatura' : isIncome ? 'Receita' : 'Despesa'}</p>
        </div>
      </div>

      <p className={`money mt-5 break-words text-3xl font-bold tracking-tight ${amountTone}`}>{formatTransactionAmount(transaction, showValues)}</p>
      <div className="mt-2"><StatusPill status={transaction.status} /></div>

      <dl className="mt-5 overflow-hidden rounded-[13px] border border-[var(--border)]">
        <DetailRow label="Data">{new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(date)}</DetailRow>
        <DetailRow label="Conta">{transaction.account?.name ?? '—'}{transaction.account?.currency ? ` · ${transaction.account.currency}` : ''}</DetailRow>
        {isTransfer ? (
          <DetailRow label="Contraparte">{transaction.counterpartAccount?.name ?? 'Contraparte indisponível'}{transaction.counterpartAccount?.currency ? ` · ${transaction.counterpartAccount.currency}` : ''}</DetailRow>
        ) : isCardPayment ? (
          <DetailRow label="Tipo">Pagamento de fatura</DetailRow>
        ) : (
          <DetailRow label="Categoria">{transaction.category?.name ?? '—'}</DetailRow>
        )}
        <DetailRow label="Status">{statusConfig[transaction.status as keyof typeof statusConfig]?.label ?? transaction.status}</DetailRow>
      </dl>

      <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3 lg:grid-cols-1">
        {isTransfer && transaction.transferId && (
          <Link href={`/transacoes/alterar/${transaction.id}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]">Editar transferência</Link>
        )}
        {!isTransfer && !isCardPayment && (
          <>
            <Link href={`/transacoes/alterar/${transaction.id}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]">Editar</Link>
            <Link href={`/transacoes/nova?duplicate=${encodeURIComponent(transaction.id)}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"><FaCopy aria-hidden="true" /> Duplicar</Link>
            <Link href={`/modelos?source=${encodeURIComponent(transaction.id)}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]">Salvar modelo</Link>
          </>
        )}
        <Link href={`/transacoes/show/${transaction.id}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"><FaExternalLinkAlt aria-hidden="true" /> Detalhes</Link>
      </div>
    </div>
  );
}

export function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return <div className="flex min-h-12 items-center justify-between gap-4 border-b border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 last:border-b-0"><dt className="text-sm text-[var(--text-muted)]">{label}</dt><dd className="min-w-0 text-right text-sm font-semibold text-[var(--foreground)]">{children}</dd></div>;
}

export function StatusPill({ status }: { status: TransactionDTO['status'] }) {
  const label = statusConfig[status as keyof typeof statusConfig]?.label ?? status;
  const tone = status === 'COMPLETED'
    ? 'border-[var(--income)]/30 bg-[var(--primary-subtle)] text-[var(--income)]'
    : status === 'PENDING'
      ? 'border-[var(--warning)]/35 bg-[var(--warning-subtle)] text-[var(--pending)]'
      : 'border-[var(--border-strong)] bg-[var(--surface-subtle)] text-[var(--text-muted)]';

  return <span className={`inline-flex min-h-6 items-center rounded-full border px-2 text-xs font-bold ${tone}`}>{label}</span>;
}
