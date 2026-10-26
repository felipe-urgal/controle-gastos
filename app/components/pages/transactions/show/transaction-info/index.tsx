'use client';

import { motion, useAnimationControls, useReducedMotion } from 'framer-motion';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { FaArrowDown, FaArrowUp, FaCreditCard, FaExchangeAlt, FaLayerGroup } from 'react-icons/fa';

import { IconRenderer } from '@/app/components/ui';
import { CARD_EASE, Odometer, reducedTransition } from '@/app/components/ui/motion';
import { useAuth } from '@/app/context';
import { statusConfig } from '@/app/lib/constants/transaction.constants';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import { TransactionInfoProps } from '@/app/lib/interface/transaction.interface';
import { formatPtBrLogicalDate } from '@/app/lib/transactions/monthly-recurrence';
import {
  getTransferDirectionLabel,
  isTransferTransaction,
} from '@/app/lib/transactions/transaction-presentation';
import type { TransactionAccountDTO } from '@/app/types/transaction';

const cardClassName = 'rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)]';
const linkClassName =
  'group/link relative font-semibold text-[var(--primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]';

/** Sublinhado dos links: se desenha da esquerda para a direita ao passar o mouse ou focar. */
function LinkUnderline() {
  return (
    <span
      aria-hidden="true"
      className="absolute -bottom-0.5 left-0 h-px w-full origin-left scale-x-0 bg-current transition-transform duration-300 ease-out group-hover/link:scale-x-100 group-focus-visible/link:scale-x-100 motion-reduce:transition-none"
    />
  );
}

/** Gesto do ícone do tipo, o mesmo do formulário: a seta de saída cai, a de entrada sobe e a transferência troca de lado. */
function TypeGlyph({ kind, children }: { kind: 'expense' | 'income' | 'transfer' | 'card'; children: ReactNode }) {
  const initial = kind === 'expense' ? { y: -10 } : kind === 'income' ? { y: 10 } : kind === 'transfer' ? { rotate: -180 } : { scale: 0.6 };
  return (
    <motion.span
      className="flex"
      initial={initial}
      animate={{ y: 0, rotate: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 380, damping: 12, delay: 0.35 }}
    >
      {children}
    </motion.span>
  );
}

const MotionLink = motion.create(Link);

const rowStack = { hidden: {}, shown: { transition: { staggerChildren: 0.08, delayChildren: 0.55 } } };
const rowItem = { hidden: { opacity: 0, x: -10 }, shown: { opacity: 1, x: 0, transition: { duration: 0.35, ease: CARD_EASE } } };

export default function TransactionInfo({
  transaction,
  isDeleting = false,
}: TransactionInfoProps) {
  const reduce = useReducedMotion();
  // Hover do ícone do tipo: dá uma volta completa.
  const spin = useAnimationControls();
  const { user } = useAuth();
  const showValues = user?.showValues !== false;
  const transactionDate = new Date(transaction.year, transaction.month - 1, transaction.day);
  const longDate = format(transactionDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  const isIncome = transaction.type === 'INCOME';
  const isTransfer = isTransferTransaction(transaction);
  const isCardPayment = transaction.kind === 'CARD_PAYMENT';
  const isNormal = !isTransfer && !isCardPayment;
  const status =
    statusConfig[transaction.status as keyof typeof statusConfig] || statusConfig.COMPLETED;
  const isInstallment = transaction.series?.type === 'INSTALLMENT';
  const currency = transaction.account.currency;
  const money = (cents: number) => (showValues ? formatCurrency(cents, currency) : '••••');
  const allocations = transaction.allocations ?? [];
  const hasSideContent = allocations.length > 1 || Boolean(transaction.series) || !isNormal;
  const kindLabel = isTransfer
    ? getTransferDirectionLabel(transaction)
    : isCardPayment
      ? 'Pagamento de fatura'
      : isIncome
        ? 'Receita'
        : 'Despesa';
  const amountTone = !isNormal
    ? 'text-[var(--primary)]'
    : isIncome
      ? 'text-[var(--income)]'
      : 'text-[var(--expense)]';
  const iconTone = !isNormal
    ? 'bg-[var(--primary-subtle)] text-[var(--primary)]'
    : isIncome
      ? 'bg-[var(--primary-subtle)] text-[var(--income)]'
      : 'bg-[var(--danger-subtle)] text-[var(--expense)]';

  return (
    <motion.div
      className={`w-full space-y-4 pb-5 ${isDeleting ? 'pointer-events-none' : ''}`}
      // Ao excluir, a ficha se dissolve: encolhe, perde nitidez e cai um pouco antes de voltar para a lista.
      animate={isDeleting ? { opacity: 0.3, scale: 0.97, y: 14, filter: 'blur(5px)' } : { opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
      transition={reducedTransition(reduce, { duration: 0.45, ease: CARD_EASE })}
    >
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reducedTransition(reduce, { duration: 0.45, ease: CARD_EASE })}
        aria-labelledby="transaction-detail-heading"
        className="grid gap-5 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-surface)] sm:p-5"
      >
        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3.5">
          <motion.span
            className={`grid h-12 w-12 place-items-center rounded-[var(--radius-lg)] text-lg ${iconTone}`}
            aria-hidden="true"
            initial={{ scale: 1.9, rotate: -18, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 420, damping: 15, delay: 0.1 }}
            onHoverStart={() => void spin.start({ rotate: [0, 360], transition: { duration: 0.6, ease: 'easeInOut' } })}
          >
            <motion.span className="flex" animate={spin}>
              <TypeGlyph kind={isTransfer ? 'transfer' : isCardPayment ? 'card' : isIncome ? 'income' : 'expense'}>
                {isTransfer ? <FaExchangeAlt /> : isCardPayment ? <FaCreditCard /> : isIncome ? <FaArrowUp /> : <FaArrowDown />}
              </TypeGlyph>
            </motion.span>
          </motion.span>
          <div className="min-w-0">
            <h2 id="transaction-detail-heading" className="break-words text-xl font-bold tracking-tight">
              {transaction.description || 'Sem descrição'}
            </h2>
            <p className="text-sm text-[var(--text-muted)]">
              <motion.span
                className={`mr-2 inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-semibold ${status.color}`}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                whileHover={{ scale: [1, 1.2, 1], transition: { duration: 0.4, delay: 0 } }}
                transition={{ type: 'spring', stiffness: 500, damping: 14, delay: 0.3 }}
              >
                {transaction.status === 'PENDING' && !reduce && (
                  <motion.span
                    aria-hidden="true"
                    className="h-1.5 w-1.5 rounded-full bg-current"
                    animate={{ opacity: [1, 0.3, 1], scale: [1, 0.7, 1] }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                  />
                )}
                {status.label}
              </motion.span>
              {longDate}
              {isInstallment && transaction.seriesIndex
                ? ` · Parcela ${transaction.seriesIndex}/${transaction.series?.occurrenceCount}`
                : ''}
            </p>
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold text-[var(--text-muted)]">{kindLabel}</p>
          <strong className={`money mt-1 block break-words text-4xl font-semibold leading-none tracking-[-0.035em] sm:text-5xl ${amountTone}`}>
            {showValues ? <Odometer text={`${isNormal ? (isIncome ? '+' : '−') : ''}${money(transaction.amount)}`} /> : (
              <>
                {isNormal ? (isIncome ? '+' : '−') : ''}
                {money(transaction.amount)}
              </>
            )}
          </strong>
          {!showValues && (
            <p className="mt-2 text-xs text-[var(--text-subtle)]">Valores ocultos pelas suas preferências.</p>
          )}
        </div>
      </motion.section>

      <div className={`grid items-start gap-4 ${hasSideContent ? 'lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]' : ''}`}>
        {hasSideContent && <div className="space-y-4">
          {allocations.length > 1 && (
            <section className={cardClassName} aria-labelledby="transaction-allocations-heading">
              <div className="flex flex-wrap items-baseline justify-between gap-2 px-4 pb-2 pt-4 sm:px-5">
                <h2 id="transaction-allocations-heading" className="text-base font-bold">Divisão por categoria</h2>
                <p className="text-xs text-[var(--text-muted)]">{allocations.length} categorias</p>
              </div>
              <ul className="divide-y divide-[var(--border)] border-t border-[var(--border)]">
                {allocations.map((allocation) => (
                  <li key={allocation.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5 sm:px-5">
                    <span className="inline-flex min-w-0 items-center gap-2 text-sm font-semibold">
                      <IconRenderer iconName={allocation.category.icon || 'tag'} size={16} color={allocation.category.color} />
                      <span className="break-words">{allocation.category.name}</span>
                    </span>
                    <span className="money text-sm font-semibold">{money(allocation.amount)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {transaction.series && (
            <section className={`${cardClassName} p-4 sm:p-5`} aria-labelledby="transaction-series-heading">
              <div className="flex items-start gap-3">
                <FaLayerGroup className="mt-1 shrink-0 text-[var(--primary)]" aria-hidden="true" />
                <div>
                  <h2 id="transaction-series-heading" className="text-base font-bold">
                    {isInstallment
                      ? `Parcela ${transaction.seriesIndex ?? '?'} de ${transaction.series.occurrenceCount}`
                      : 'Ocorrência de uma série'}
                  </h2>
                  <p className="mt-1 text-sm leading-relaxed text-[var(--text-muted)]">
                    {isInstallment && transaction.series.description ? `“${transaction.series.description}” · ` : `${transaction.series.occurrenceCount} ocorrências · `}
                    {formatPtBrLogicalDate(transaction.series.start)} até {formatPtBrLogicalDate(transaction.series.end)}.
                    Editar altera somente {isInstallment ? 'esta parcela' : 'esta ocorrência'}.
                  </p>
                </div>
              </div>
            </section>
          )}

          {!isNormal && (
            <p className={`${cardClassName} p-4 text-sm leading-relaxed text-[var(--text-muted)] sm:p-5`}>
              {isTransfer
                ? 'Esta é uma perna de uma transferência ligada. A contraparte é somente leitura aqui e alterações da operação usam o fluxo dedicado de transferências.'
                : 'Este lançamento foi criado pelo fluxo de pagamento da fatura e é somente leitura no CRUD comum de transações.'}
            </p>
          )}
        </div>}

        {/* A ficha é "impressa": revela de cima para baixo, e cada linha aparece em sequência. */}
        <motion.section
          className={cardClassName}
          aria-labelledby="transaction-context-heading"
          initial={{ clipPath: 'inset(0 0 100% 0)' }}
          animate={{ clipPath: 'inset(0 0 0% 0)', transitionEnd: { clipPath: 'none' } }}
          transition={reducedTransition(reduce, { duration: 0.9, ease: CARD_EASE, delay: 0.25 })}
        >
          <h2 id="transaction-context-heading" className="px-4 pb-2 pt-4 text-base font-bold sm:px-5">Sobre este lançamento</h2>
          <motion.dl className="grid gap-3 px-4 pb-4 text-sm sm:px-5" variants={rowStack} initial="hidden" animate="shown">
            <Row label="Data">{longDate}</Row>

            <Row label="Conta">
              <AccountLabel account={transaction.account} href={`/contas/show/${transaction.account.id}`} />
            </Row>

            {isTransfer && (
              <Row label="Conta contraparte">
                {transaction.counterpartAccount ? (
                  <AccountLabel account={transaction.counterpartAccount} href={`/contas/show/${transaction.counterpartAccount.id}`} />
                ) : (
                  'Contraparte indisponível'
                )}
              </Row>
            )}

            {isNormal && transaction.merchant && (
              <Row label="Estabelecimento">
                <Link href={`/estabelecimentos/show/${transaction.merchant.id}`} className={linkClassName}>
                  {transaction.merchant.name}
                  <LinkUnderline />
                </Link>
                {!transaction.merchant.isActive ? ' · inativo' : ''}
              </Row>
            )}

            {isNormal && transaction.category && (
              <Row label="Categoria">
                <MotionLink href={`/categorias/show/${transaction.category.id}`} whileHover="hover" className={`${linkClassName} inline-flex min-w-0 items-center gap-2`}>
                  <motion.span className="flex" variants={{ hover: { scale: 1.35, rotate: 14 } }} transition={{ type: 'spring', stiffness: 500, damping: 12 }}>
                  <motion.span
                    className="flex"
                    initial={{ scale: 0, rotate: -30 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 12, delay: 1 }}
                  >
                    <IconRenderer iconName={transaction.category.icon || 'tag'} size={16} color={transaction.category.color} />
                  </motion.span>
                  </motion.span>
                  <span className="break-words">{transaction.category.name}</span>
                  <LinkUnderline />
                </MotionLink>
              </Row>
            )}

            {transaction.tags?.length ? (
              <Row label="Tags">
                <span className="flex flex-wrap justify-end gap-1.5">
                  {transaction.tags.map((tag, tagIndex) => (
                    <motion.span
                      key={tag.id}
                      className="rounded-full bg-[var(--surface-subtle)] px-2 py-0.5 text-xs"
                      initial={{ scale: 0, rotate: -12 }}
                      animate={{ scale: 1, rotate: 0 }}
                      whileHover={{ y: -3, rotate: 6, transition: { type: 'spring', stiffness: 500, damping: 14, delay: 0 } }}
                      transition={{ type: 'spring', stiffness: 500, damping: 14, delay: 1.05 + tagIndex * 0.08 }}
                    >
                      #{tag.name}
                    </motion.span>
                  ))}
                </span>
              </Row>
            ) : null}

            {transaction.importSource && <Row label="Origem">Importada de {transaction.importSource}</Row>}
            <Row label="Criada em">{format(new Date(transaction.createdAt), 'dd/MM/yyyy HH:mm')}</Row>
            <Row label="Atualizada em">{format(new Date(transaction.updatedAt), 'dd/MM/yyyy HH:mm')}</Row>
          </motion.dl>
        </motion.section>
      </div>
    </motion.div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <motion.div className="flex justify-between gap-4" variants={rowItem} whileHover="hover">
      {/* Ao passar o mouse, o rótulo se afasta e o valor ganha destaque. */}
      <motion.dt className="shrink-0 text-[var(--text-muted)]" variants={{ hover: { x: -4, opacity: 0.65 } }}>{label}</motion.dt>
      <motion.dd className="min-w-0 break-words text-right font-semibold" style={{ transformOrigin: 'right center' }} variants={{ hover: { scale: 1.04 } }} transition={{ type: 'spring', stiffness: 400, damping: 18 }}>{children}</motion.dd>
    </motion.div>
  );
}

function AccountLabel({ account, href }: { account: TransactionAccountDTO; href: string }) {
  return (
    <MotionLink href={href} whileHover="hover" className={`${linkClassName} inline-flex min-w-0 items-center gap-2`}>
      <motion.span className="flex shrink-0" variants={{ hover: { scale: 1.3 } }} transition={{ type: 'spring', stiffness: 500, damping: 12 }}>
      <motion.span
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: account.color ?? 'var(--surface-subtle)' }}
        aria-hidden="true"
        animate={{ scale: [1, 1.3, 1] }}
        transition={{ duration: 0.5, delay: 0.95 }}
      >
        <IconRenderer iconName={account.icon || 'wallet'} size={13} className="text-white" />
      </motion.span>
      </motion.span>
      <span className="break-words">{account.name} · {account.currency}</span>
      <LinkUnderline />
    </MotionLink>
  );
}
