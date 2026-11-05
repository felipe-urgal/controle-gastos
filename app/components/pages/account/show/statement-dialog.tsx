'use client';

import { useMemo, useState } from 'react';

import { Alert } from '@/app/components/feedback';
import { ModalShell } from '@/app/components/overlays/modal-shell';
import { Button, Input } from '@/app/components/ui';
import { formatIsoLogicalDate, todayLogicalDate } from '@/app/lib/date/logical-date';
import { errorMessage } from '@/app/lib/error-message';
import { accountService } from '@/app/services/account-service';
import type { AccountModel } from '@/app/types/account';

/** Baixa o extrato da conta em CSV para um período: saldo inicial, lançamentos concluídos com saldo corrente e saldo final. */
export default function StatementDialog({
  account,
  onClose,
}: {
  account: Pick<AccountModel, 'id' | 'name'>;
  onClose: () => void;
}) {
  const today = useMemo(() => todayLogicalDate(), []);
  const [from, setFrom] = useState(formatIsoLogicalDate({ ...today, day: 1 }));
  const [to, setTo] = useState(formatIsoLogicalDate(today));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function download() {
    if (!from || !to) {
      setError('Informe as duas datas.');
      return;
    }
    if (from > to) {
      setError('A data inicial deve ser anterior à final.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await accountService.downloadStatement(account.id, from, to);
      onClose();
    } catch (cause) {
      setError(errorMessage(cause, 'Não foi possível exportar o extrato.'));
      setBusy(false);
    }
  }

  return (
    <ModalShell
      title="Exportar extrato"
      description={`Extrato de ${account.name} em CSV, com o saldo corrente depois de cada lançamento.`}
      onClose={onClose}
      closeDisabled={busy}
      maxWidthClass="max-w-lg"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>Cancelar</Button>
          <Button type="button" onClick={() => void download()} isLoading={busy} disabled={busy}>Baixar CSV</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="De" type="date" value={from} onChange={(event) => setFrom(event.target.value)} disabled={busy} />
          <Input label="Até" type="date" value={to} onChange={(event) => setTo(event.target.value)} disabled={busy} />
        </div>
        <p className="text-xs text-[var(--text-muted)]">
          Só entram os lançamentos concluídos (os mesmos que formam o saldo). Valores com ponto decimal; negativo é saída.
        </p>
        {error && <Alert variant="error" message={error} />}
      </div>
    </ModalShell>
  );
}
