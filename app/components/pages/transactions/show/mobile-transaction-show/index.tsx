'use client';

import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { createContext, useContext } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Link from 'next/link';
import {
  FaArrowDown,
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

import { MobileAppBar } from '@/app/components/layout';
import { IconButton, IconLink, IconRenderer } from '@/app/components/ui';
import { CARD_EASE, CARD_VIEWPORT, DropIn, Odometer, reducedTransition } from '@/app/components/ui/motion';
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

/** Efeito de cada cartão de informação: `print` (revela de cima para baixo), `rise` (sobe com mola) e `wipe` (linhas reveladas da esquerda). */
type InfoEffect = 'print' | 'rise' | 'wipe';

const rowVariants: Record<InfoEffect, Variants> = {
  print: { hidden: { opacity: 0, x: -10 }, shown: { opacity: 1, x: 0, transition: { duration: 0.35, ease: CARD_EASE } } },
  rise: { hidden: {}, shown: {} },
  wipe: {
    hidden: { clipPath: 'inset(0 100% 0 0)' },
    shown: { clipPath: 'inset(0 0% 0 0)', transitionEnd: { clipPath: 'none' }, transition: { duration: 0.5, ease: CARD_EASE } },
  },
};
const RowEffectContext = createContext<InfoEffect>('print');

export default function MobileTransactionShow({
  transaction,
  backUrl,
  isDeleting = false,
  allowMutations,
  onRequestDelete,
}: Props) {
  const reduce = useReducedMotion();
  const { user } = useAuth();
  const showValues = user?.showValues !== false;
  const transactionDate = new Date(transaction.year, transaction.month - 1, transaction.day);
  const createdAt = new Date(transaction.createdAt);
  const isTransfer = isTransferTransaction(transaction);
  const isCardPayment = transaction.kind === 'CARD_PAYMENT';
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

  const amountTone = isTransfer || isCardPayment
    ? 'text-[var(--primary)]'
    : isIncome
      ? 'text-[var(--income)]'
      : 'text-[var(--expense)]';

  const iconTone = isTransfer || isCardPayment
    ? 'bg-[var(--primary-subtle)] text-[var(--primary)]'
    : isIncome
      ? 'bg-[var(--primary-subtle)] text-[var(--income)]'
      : 'bg-[var(--danger-subtle)] text-[var(--expense)]';

  const heroIcon = isTransfer
    ? <FaExchangeAlt aria-hidden="true" />
    : isCardPayment
      ? <FaCreditCard aria-hidden="true" />
      : transaction.category
      ? <IconRenderer iconName={transaction.category.icon || 'tag'} size={24} />
      : isIncome
        ? <FaArrowUp aria-hidden="true" />
        : <FaArrowDown aria-hidden="true" />;

  return (
    <motion.div
      className={`space-y-[14px] pb-3 ${isDeleting ? 'pointer-events-none' : ''}`}
      // Ao excluir, a ficha se dissolve: encolhe, perde nitidez e cai um pouco antes de voltar para a lista.
      animate={isDeleting ? { opacity: 0.3, scale: 0.97, y: 14, filter: 'blur(5px)' } : { opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
      transition={reducedTransition(reduce, { duration: 0.45, ease: CARD_EASE })}
    >
      <MobileAppBar
        title={isTransfer ? 'Transferência' : isCardPayment ? 'Pagamento de fatura' : 'Transação'}
        backHref={backUrl}
        backLabel="Voltar para transações"
        action={
          allowMutations ? (
            <div className="flex">
              <DropIn order={0}>
                <IconLink label="Editar transação" href={`/transacoes/alterar/${transaction.id}`} icon={<FaEdit />} tone="primary" />
              </DropIn>
              <DropIn order={1} pulse>
                <IconButton label="Excluir transação" title="Excluir transação" icon={<FaTrashAlt />} tone="danger" onClick={onRequestDelete} disabled={isDeleting} />
              </DropIn>
            </div>
          ) : undefined
        }
      />

      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reducedTransition(reduce, { duration: 0.45, ease: CARD_EASE })}
        className="grid gap-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-surface)]"
        aria-labelledby="mobile-transaction-title"
      >
        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
          <motion.span
            className={`grid h-12 w-12 shrink-0 place-items-center rounded-[var(--radius-lg)] text-xl ${iconTone}`}
            aria-hidden="true"
            initial={{ scale: 1.9, rotate: -18, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 420, damping: 15, delay: 0.1 }}
          >
            {heroIcon}
          </motion.span>

          <div className="min-w-0">
            <h2 id="mobile-transaction-title" className="truncate text-lg font-bold">
              {transaction.description || 'Sem descrição'}
            </h2>
            <p className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[var(--text-muted)]">
              <motion.span
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-semibold ${status.color}`}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 14, delay: 0.3 }}
              >
                <span className="text-xs" aria-hidden="true">{statusIcon}</span>
                {status.label}
              </motion.span>
              <span className="truncate">{transaction.account.name}</span>
            </p>
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold text-[var(--text-muted)]">
            {isTransfer ? getTransferDirectionLabel(transaction) || 'Transferência' : isCardPayment ? 'Pagamento de fatura' : isIncome ? 'Receita' : 'Despesa'}
          </p>
          <strong className={`money mt-1 block break-words text-4xl font-semibold leading-none tracking-[-0.035em] ${amountTone}`}>
            {showValues ? <Odometer text={`${sign}${amount}`} /> : <>{sign}{amount}</>}
          </strong>
          {!showValues && (
            <p className="mt-2 text-xs text-[var(--text-subtle)]">Valores ocultos pelas suas preferências.</p>
          )}
        </div>
      </motion.section>

      <MobileInfoCard title="Sobre" icon={<FaFileAlt />} effect="print">
        <MobileInfoRow
          label="Tipo"
          value={isTransfer ? getTransferDirectionLabel(transaction) || 'Transferência' : isCardPayment ? 'Pagamento de fatura' : isIncome ? 'Receita' : 'Despesa'}
          icon={isTransfer ? <FaExchangeAlt /> : isIncome ? <FaArrowUp /> : <FaArrowDown />}
          valueClassName={amountTone}
        />
        {!isTransfer && !isCardPayment && transaction.category && (
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

      <MobileInfoCard title="Conta e origem" icon={<FaCreditCard />} effect="rise">
        <MobileInfoRow
          label="Conta"
          value={transaction.account.name}
          icon={<FaWallet />}
          iconValue={
            <span
              className="grid h-6 w-6 place-items-center rounded-[var(--radius-sm)] text-white"
              style={{ backgroundColor: transaction.account.color || 'var(--primary)' }}
            >
              <IconRenderer iconName={transaction.account.icon || 'wallet'} size={12} />
            </span>
          }
        />
        <MobileInfoRow
          label="Moeda"
          value={transaction.account.currency}
          icon={<span className="text-xs font-bold">{transaction.account.currency}</span>}
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
        ) : isCardPayment ? (
          <MobileInfoRow
            label="Origem"
            value="Fluxo de pagamento da fatura"
            icon={<FaCreditCard />}
          />
        ) : (
          <MobileInfoRow
            label="Origem"
            value="Não registrada"
            icon={<FaInfoCircle />}
          />
        )}
      </MobileInfoCard>

      <MobileInfoCard title="Mais informações" icon={<FaTag />} effect="wipe">
        <MobileInfoRow
          label="Criada em"
          value={format(createdAt, 'dd/MM/yyyy · HH:mm')}
          icon={<FaCalendarAlt />}
        />
        <MobileInfoRow
          label="Observações"
          value="Não registradas"
          icon={<FaInfoCircle />}
        />
        <MobileInfoRow
          label="Etiquetas"
          value={transaction.tags?.length ? transaction.tags.map((tag) => `#${tag.name}`).join(' · ') : 'Nenhuma'}
          icon={<FaTag />}
        />
      </MobileInfoCard>

      {transaction.series && (
        <motion.section
          className="rounded-[var(--radius-lg)] border border-[var(--primary)]/30 bg-[var(--primary-subtle)] p-4"
          initial={{ opacity: 0, x: -24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={CARD_VIEWPORT}
          transition={reducedTransition(reduce, { type: 'spring', stiffness: 260, damping: 24 })}
        >
          <div className="flex items-start gap-3">
            <motion.span
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--primary)] text-white"
              initial={{ rotate: -90, scale: 0.4 }}
              whileInView={{ rotate: 0, scale: 1 }}
              viewport={CARD_VIEWPORT}
              transition={reducedTransition(reduce, { type: 'spring', stiffness: 420, damping: 13, delay: 0.15 })}
            >
              <FaLayerGroup aria-hidden="true" />
            </motion.span>
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
        </motion.section>
      )}

      <motion.section
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={CARD_VIEWPORT}
        transition={reducedTransition(reduce, { duration: 0.45, ease: CARD_EASE })}
        className={`rounded-[var(--radius-lg)] border p-4 ${callout.tone}`}
        style={{
          background:
            'linear-gradient(110deg, color-mix(in srgb, #06b6d4 16%, var(--surface)) 0%, color-mix(in srgb, #2563eb 16%, var(--surface)) 100%)',
        }}
        aria-label="Estado do lançamento"
      >
        <div className="flex items-start gap-3">
          <span className={`relative grid h-10 w-10 shrink-0 place-items-center rounded-full ${callout.icon}`}>
            {transaction.status === 'PENDING' && !reduce && (
              <motion.span
                aria-hidden="true"
                className="absolute inset-0 rounded-full bg-[var(--warning)]"
                initial={{ scale: 1, opacity: 0.4 }}
                animate={{ scale: 1.6, opacity: 0 }}
                transition={{ duration: 1.6, ease: 'easeOut', repeat: Infinity, repeatDelay: 0.8 }}
              />
            )}
            <motion.span
              className="relative flex"
              initial={{ scale: 0.4, rotate: -45 }}
              whileInView={{ scale: 1, rotate: 0 }}
              viewport={CARD_VIEWPORT}
              transition={reducedTransition(reduce, { type: 'spring', stiffness: 460, damping: 12, delay: 0.2 })}
            >
              {statusIcon}
            </motion.span>
          </span>
          <div>
            <strong className="text-sm text-[var(--foreground)]">{callout.title}</strong>
            <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">{callout.description}</p>
          </div>
        </div>
      </motion.section>

      {allowMutations ? (
        <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-3.5" aria-labelledby="mobile-transaction-actions">
          <h2 id="mobile-transaction-actions" className="flex items-center gap-2 text-sm font-bold text-[var(--foreground)]">
            <FaBolt className="text-[var(--primary)]" aria-hidden="true" />
            Próximas ações
          </h2>
          <motion.div
            className="mt-3 grid grid-cols-2 gap-2"
            initial="hidden"
            whileInView="shown"
            viewport={CARD_VIEWPORT}
            variants={{ hidden: {}, shown: { transition: { staggerChildren: 0.1 } } }}
          >
            {/* Os botões "pulam" para o lugar, um depois do outro. */}
            <motion.div variants={{ hidden: { opacity: 0, scale: 0.8 }, shown: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 460, damping: 16 } } }}>
              <Link
                href={`/transacoes/nova?duplicate=${encodeURIComponent(transaction.id)}`}
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--surface-raised)] px-3 text-sm font-bold text-[var(--foreground)]"
              >
                <FaCopy aria-hidden="true" /> Duplicar
              </Link>
            </motion.div>
            <motion.div variants={{ hidden: { opacity: 0, scale: 0.8 }, shown: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 460, damping: 16 } } }}>
              <Link
                href={`/modelos?source=${encodeURIComponent(transaction.id)}`}
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--surface-raised)] px-3 text-sm font-bold text-[var(--foreground)]"
              >
                Salvar como modelo
              </Link>
            </motion.div>
          </motion.div>
        </section>
      ) : (
        <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--primary-subtle)] text-[var(--primary)]">
              {isCardPayment ? <FaCreditCard aria-hidden="true" /> : <FaExchangeAlt aria-hidden="true" />}
            </span>
            <div>
              <strong className="text-sm text-[var(--foreground)]">
                {isCardPayment ? 'Pagamento de fatura' : 'Transferência vinculada'}
              </strong>
              <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
                {isCardPayment
                  ? 'Esta movimentação é somente leitura aqui e permanece vinculada ao fluxo de pagamento da fatura.'
                  : 'Esta tela é somente leitura para transferências. A contraparte permanece vinculada à mesma operação.'}
              </p>
              {isTransfer && transaction.transferId && (
                <Link
                  href={`/transacoes/alterar/${transaction.id}`}
                  className="mt-3 inline-flex min-h-10 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border-strong)] px-3 text-xs font-bold text-[var(--foreground)]"
                >
                  Editar transferência
                </Link>
              )}
            </div>
          </div>
        </section>
      )}
    </motion.div>
  );
}

function MobileInfoCard({
  title,
  icon,
  effect,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  effect: InfoEffect;
  children: React.ReactNode;
}) {
  const reduce = useReducedMotion();
  const className = 'rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4';
  const heading = (
    <h2 className="flex items-center gap-2 text-base font-bold text-[var(--foreground)]">
      <span className="text-[var(--primary)]" aria-hidden="true">{icon}</span>
      {title}
    </h2>
  );
  const stagger = { hidden: {}, shown: { transition: { staggerChildren: 0.08, delayChildren: effect === 'print' ? 0.5 : 0.2 } } };
  const list = (
    <motion.dl className="mt-3 divide-y divide-[var(--border)]" variants={stagger}>
      <RowEffectContext.Provider value={effect}>{children}</RowEffectContext.Provider>
    </motion.dl>
  );

  if (effect === 'print') {
    // Mostra a ficha "impressa": revela de cima para baixo e as linhas aparecem em sequência.
    return (
      <motion.section
        className={className}
        initial={{ clipPath: 'inset(0 0 100% 0)' }}
        animate={{ clipPath: 'inset(0 0 0% 0)', transitionEnd: { clipPath: 'none' } }}
        transition={reducedTransition(reduce, { duration: 0.8, ease: CARD_EASE, delay: 0.3 })}
      >
        {heading}
        <motion.div initial="hidden" animate="shown">{list}</motion.div>
      </motion.section>
    );
  }

  // Abaixo da dobra: o cartão observa a viewport (ele, e não o conteúdo recortado, é o alvo do whileInView).
  return (
    <motion.section
      className={className}
      initial={effect === 'rise' ? { opacity: 0, y: 28 } : 'hidden'}
      whileInView={effect === 'rise' ? { opacity: 1, y: 0 } : 'shown'}
      viewport={CARD_VIEWPORT}
      transition={reducedTransition(reduce, { type: 'spring', stiffness: 220, damping: 22 })}
    >
      {heading}
      {list}
    </motion.section>
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
  const effect = useContext(RowEffectContext);

  return (
    <motion.div className="grid min-h-10 grid-cols-[minmax(0,.78fr)_minmax(0,1.22fr)] items-center gap-3 py-2 first:pt-0 last:pb-0" variants={rowVariants[effect]}>
      <dt className="text-sm text-[var(--text-muted)]">{label}</dt>
      <dd className={`flex min-w-0 items-center justify-end gap-2 break-words text-right text-sm font-semibold ${valueClassName}`}>
        <span className="shrink-0 text-[var(--text-subtle)]" aria-hidden="true">{iconValue ?? icon}</span>
        <span className="min-w-0 break-words">{value}</span>
      </dd>
    </motion.div>
  );
}
