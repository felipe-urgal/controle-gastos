'use client';

import {
  KeyboardEvent,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FaArrowLeft, FaPlus, FaTimes } from 'react-icons/fa';

import { PageEmpty, PageLoading } from '@/app/components/feedback';
import {
  SummaryCards,
  TransactionsList,
} from '@/app/components/pages/calendar/modals';
import { TransactionForm } from '@/app/components/pages/transactions';
import { ConfirmationModal } from '@/app/components/overlays';
import { Button } from '@/app/components/ui';
import { useDayTransactions } from '@/app/hooks/calendar/use-day-transactions';
import { transactionService } from '@/app/services/transaction-service';
import { Transaction } from '@/app/types/calendar';

interface DayModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate?: Date;
  transactions: Transaction[];
  isLoading: boolean;
  onRefreshCalendar?: () => Promise<void> | void;
}

type Mode = 'list' | 'create' | 'edit';

export default function DayModal({
  isOpen,
  onClose,
  selectedDate,
  transactions,
  isLoading,
  onRefreshCalendar,
}: DayModalProps) {
  const [mode, setMode] = useState<Mode>('list');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  const {
    transactions: list,
    totals,
    isEmpty,
  } = useDayTransactions({
    initialTransactions: transactions,
    isOpen,
  });

  useEffect(() => {
    if (!isOpen) {
      setMode('list');
      setSelectedTransaction(null);
      setTransactionToDelete(null);
      return;
    }

    const previousFocus = document.activeElement as HTMLElement | null;
    const frame = requestAnimationFrame(() => dialogRef.current?.focus());
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const formattedDate = selectedDate
    ? format(selectedDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })
    : 'Data selecionada';
  const capitalizedDate =
    formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);

  const title =
    mode === 'list'
      ? 'Transações do dia'
      : mode === 'edit'
        ? 'Editar transação'
        : 'Nova transação';

  const handleEdit = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setMode('edit');
  };

  const handleDelete = (transaction: Transaction) => {
    setTransactionToDelete(transaction);
  };

  const handleConfirmDelete = async () => {
    if (!transactionToDelete?.id) return;

    setIsDeleting(true);
    try {
      await transactionService.delete(transactionToDelete.id);
      await onRefreshCalendar?.();
      setTransactionToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSuccess = async () => {
    await onRefreshCalendar?.();
    setMode('list');
    setSelectedTransaction(null);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape' && !isDeleting && !transactionToDelete) {
      event.preventDefault();
      onClose();
      return;
    }

    if (event.key !== 'Tab' || transactionToDelete) return;

    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );

    if (!focusable?.length) {
      event.preventDefault();
      dialogRef.current?.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const activeElement = document.activeElement;

    if (activeElement === dialogRef.current) {
      event.preventDefault();
      (event.shiftKey ? last : first).focus();
    } else if (event.shiftKey && activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return createPortal(
    <>
      <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
        <div
          className="absolute inset-0 bg-[var(--overlay)]"
          aria-hidden="true"
          onClick={isDeleting ? undefined : onClose}
        />

        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          aria-busy={isDeleting || undefined}
          tabIndex={-1}
          onKeyDown={handleKeyDown}
          className="relative flex h-[92dvh] max-h-[calc(100dvh-env(safe-area-inset-top))] w-full flex-col overflow-hidden rounded-t-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-surface)] sm:h-[85vh] sm:max-h-[760px] sm:max-w-5xl sm:rounded-[var(--radius-xl)]"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <header className="flex items-start justify-between gap-4 border-b border-[var(--border)] px-4 py-4 sm:px-5">
            <div className="min-w-0">
              <h2 id={titleId} className="text-xl font-semibold text-[var(--foreground)]">
                {title}
              </h2>
              <p
                id={descriptionId}
                className="mt-1 truncate text-sm leading-relaxed text-[var(--text-muted)] sm:text-base"
              >
                {capitalizedDate}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {(mode === 'create' || mode === 'edit') && (
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<FaArrowLeft />}
                  onClick={() => {
                    setMode('list');
                    setSelectedTransaction(null);
                  }}
                  aria-label="Voltar para transações do dia"
                />
              )}

              {mode === 'list' && (
                <Button
                  variant="primary"
                  size="sm"
                  icon={<FaPlus />}
                  onClick={() => setMode('create')}
                  className="hidden sm:inline-flex"
                >
                  Nova transação
                </Button>
              )}

              {mode === 'list' && (
                <Button
                  variant="primary"
                  size="sm"
                  icon={<FaPlus />}
                  onClick={() => setMode('create')}
                  aria-label="Nova transação"
                  className="sm:hidden"
                />
              )}

              <Button
                variant="ghost"
                size="sm"
                icon={<FaTimes />}
                onClick={onClose}
                disabled={isDeleting}
                aria-label="Fechar transações do dia"
              />
            </div>
          </header>

          {mode === 'list' ? (
            <>
              <SummaryCards
                totalIncome={totals.totalIncome}
                totalExpenses={totals.totalExpenses}
              />

              <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
                {isLoading ? (
                  <PageLoading type="list" />
                ) : isEmpty ? (
                  <PageEmpty
                    title="Nenhuma transação neste dia"
                    description="Use Nova transação para registrar uma movimentação já preenchida com esta data."
                  />
                ) : (
                  <TransactionsList
                    transactions={list}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    isBusy={isDeleting}
                  />
                )}
              </div>
            </>
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
              <TransactionForm
                isEditing={mode === 'edit'}
                transaction={selectedTransaction ?? undefined}
                initialDate={selectedDate}
                onCancelOverride={() => {
                  setMode('list');
                  setSelectedTransaction(null);
                }}
                onSuccess={handleSuccess}
              />
            </div>
          )}
        </div>
      </div>

      <ConfirmationModal
        isOpen={!!transactionToDelete}
        onClose={() => setTransactionToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Remover transação"
        message="Esta transação será removida permanentemente. Deseja continuar?"
        isLoading={isDeleting}
      />
    </>,
    document.body,
  );
}
