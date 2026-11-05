'use client';

import { useState } from 'react';

import { monthTitle } from '@/app/components/pages/monthly-closing/monthly-closing-model';
import { Button } from '@/app/components/ui';
import { monthlyClosingService } from '@/app/services/monthly-closing-service';
import type { MonthlyClosingLock } from '@/app/types/monthly-closing';

const cardClassName = 'rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5';

/**
 * Travar significa encerrado; não marca nada como reconciliado. Enquanto o mês está
 * travado, nenhum lançamento nasce, muda ou some nele (o servidor recusa com 409).
 */
export default function MonthLockCard({
  year,
  month,
  lock,
  hasPendingItems,
  onChange,
}: {
  year: number;
  month: number;
  lock: MonthlyClosingLock;
  hasPendingItems: boolean;
  onChange: (lock: MonthlyClosingLock) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const label = monthTitle(year, month);

  async function toggle() {
    setBusy(true);
    setError(null);
    try {
      const response = lock.locked
        ? await monthlyClosingService.unlock({ year, month })
        : await monthlyClosingService.lock({ year, month });
      onChange(response.data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível alterar o mês');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="month-lock-title" className={cardClassName}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 id="month-lock-title" className="text-base font-bold">
            {lock.locked ? `${label.charAt(0).toUpperCase()}${label.slice(1)} está travado` : `Travar ${label}`}
          </h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            {lock.locked
              ? 'Nenhum lançamento pode ser criado, editado ou excluído neste mês. Reabra para alterar.'
              : hasPendingItems
                ? 'Ainda há itens a revisar neste mês. Se travar agora, reabra o mês para concluí-los.'
                : 'Encerra o mês: depois de travado, ninguém altera lançamentos nele até você reabrir.'}
          </p>
        </div>
        <Button
          variant={lock.locked ? 'outline' : 'primary'}
          onClick={toggle}
          isLoading={busy}
          loadingText={lock.locked ? 'Reabrindo…' : 'Travando…'}
          className="shrink-0"
        >
          {lock.locked ? 'Reabrir mês' : 'Travar mês'}
        </Button>
      </div>
      {error && (
        <p role="alert" className="mt-3 text-sm text-[var(--expense)]">
          {error}
        </p>
      )}
    </section>
  );
}
