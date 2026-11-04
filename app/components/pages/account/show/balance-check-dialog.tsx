'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { Alert } from '@/app/components/feedback';
import { ModalShell } from '@/app/components/overlays/modal-shell';
import { Button, Input, MoneyInput, Select } from '@/app/components/ui';
import {
  buildAdjustmentPayload,
  evaluateBalanceCheck,
  parseStatementBalanceToCents,
  type BalanceCheck,
} from '@/app/lib/accounts/balance-check';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import { errorMessage } from '@/app/lib/error-message';
import {
  formatIsoLogicalDate,
  formatPtBrLogicalDate,
  parseIsoLogicalDate,
  todayLogicalDate,
  compareLogicalDates,
} from '@/app/lib/date/logical-date';
import { TRANSACTIONS_CHANGED_EVENT } from '@/app/lib/transactions/transaction-events';
import { accountService } from '@/app/services/account-service';
import { categoryService } from '@/app/services/category-service';
import { transactionService } from '@/app/services/transaction-service';
import type { AccountModel } from '@/app/types/account';
import type { CategoryModel } from '@/app/types/category';

type Phase =
  | { kind: 'form' }
  | { kind: 'checking' }
  | { kind: 'result'; check: BalanceCheck; date: ReturnType<typeof todayLogicalDate> }
  | { kind: 'adjusting'; check: BalanceCheck; date: ReturnType<typeof todayLogicalDate> }
  | { kind: 'done'; adjusted: number };

/**
 * Compara o saldo do extrato do banco com o saldo que o app calcula até uma data. Se não bater, mostra a diferença e
 * oferece um lançamento de ajuste (receita ou despesa), que só é criado depois do clique em "Criar ajuste".
 */
export default function BalanceCheckDialog({
  account,
  onClose,
  onAdjusted,
}: {
  account: Pick<AccountModel, 'id' | 'name' | 'currency'>;
  onClose: () => void;
  /** Chamado depois de criar o ajuste, para a tela da conta recarregar o saldo. */
  onAdjusted: () => void;
}) {
  const today = useMemo(() => todayLogicalDate(), []);
  const [dateValue, setDateValue] = useState(formatIsoLogicalDate(today));
  const [statement, setStatement] = useState('');
  const [phase, setPhase] = useState<Phase>({ kind: 'form' });
  const [error, setError] = useState('');
  const [categories, setCategories] = useState<CategoryModel[]>([]);
  const [categoryId, setCategoryId] = useState('');
  // Uma chave por tentativa de ajuste: duplo clique ou nova tentativa não cria dois lançamentos.
  const idempotencyKey = useRef('');

  const money = (cents: number) => formatCurrency(cents, account.currency);
  const busy = phase.kind === 'checking' || phase.kind === 'adjusting';

  useEffect(() => {
    let active = true;
    categoryService
      .getAll()
      .then((response) => {
        if (active) setCategories((response.data.items ?? []).filter((category) => category.isActive));
      })
      .catch(() => {
        // O erro aparece só quando o ajuste for pedido e não houver categorias.
      });
    return () => {
      active = false;
    };
  }, []);

  const adjustmentType = phase.kind === 'result' || phase.kind === 'adjusting' ? phase.check.adjustment?.type : undefined;
  const categoryOptions = useMemo(
    () =>
      categories
        .filter((category) => category.type === adjustmentType)
        .map((category) => ({ value: category.id, label: category.name })),
    [adjustmentType, categories],
  );

  async function check() {
    setError('');
    const cents = parseStatementBalanceToCents(statement);
    if (cents === null) {
      setError('Informe o saldo do extrato (pode ser negativo ou zero).');
      return;
    }
    const date = parseIsoLogicalDate(dateValue);
    if (!date) {
      setError('Informe a data do extrato.');
      return;
    }
    if (compareLogicalDates(date, today) > 0) {
      setError('A data não pode ser futura: o extrato só mostra o que já aconteceu.');
      return;
    }

    setPhase({ kind: 'checking' });
    try {
      const response = await accountService.balancePreview(account.id, date, cents);
      setCategoryId('');
      idempotencyKey.current = crypto.randomUUID();
      setPhase({ kind: 'result', check: evaluateBalanceCheck(cents, response.data.realizedBalance), date });
    } catch (cause) {
      setError(errorMessage(cause, 'Não foi possível calcular o saldo da conta.'));
      setPhase({ kind: 'form' });
    }
  }

  async function createAdjustment(current: Extract<Phase, { kind: 'result' }>) {
    setError('');
    const payload = buildAdjustmentPayload({
      check: current.check,
      accountId: account.id,
      categoryId,
      date: current.date,
    });
    if (!payload) {
      setError('Escolha a categoria do ajuste.');
      return;
    }

    setPhase({ kind: 'adjusting', check: current.check, date: current.date });
    try {
      await transactionService.createIdempotent(payload, idempotencyKey.current);
      window.dispatchEvent(new Event(TRANSACTIONS_CHANGED_EVENT));
      onAdjusted();
      setPhase({ kind: 'done', adjusted: current.check.adjustment?.amount ?? 0 });
    } catch (cause) {
      setError(errorMessage(cause, 'Não foi possível criar o ajuste.'));
      setPhase({ kind: 'result', check: current.check, date: current.date });
    }
  }

  const result = phase.kind === 'result' || phase.kind === 'adjusting' ? phase : null;

  return (
    <ModalShell
      title="Conferir saldo"
      description={`Compare o saldo do extrato do banco com o que o app calcula para ${account.name}.`}
      onClose={onClose}
      closeDisabled={busy}
      maxWidthClass="max-w-lg"
      footer={
        phase.kind === 'done' ? (
          <Button type="button" onClick={onClose}>Fechar</Button>
        ) : (
          <>
            <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>Cancelar</Button>
            {(phase.kind === 'form' || phase.kind === 'checking' || result) && (
              <Button type="button" onClick={() => void check()} isLoading={phase.kind === 'checking'} disabled={busy}>
                {result ? 'Conferir de novo' : 'Conferir'}
              </Button>
            )}
          </>
        )
      }
    >
      <div className="grid gap-4">
        {error && <Alert variant="error" message={error} />}

        {phase.kind === 'done' ? (
          <p role="status" className="text-sm">
            Ajuste de {money(phase.adjusted)} criado em {account.name}. O saldo do app agora bate com o extrato.
          </p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="Data do extrato"
                type="date"
                value={dateValue}
                max={formatIsoLogicalDate(today)}
                onChange={(event) => {
                  setDateValue(event.target.value);
                  setPhase((current) => (current.kind === 'result' ? { kind: 'form' } : current));
                }}
                disabled={busy}
              />
              <MoneyInput
                label="Saldo no extrato"
                value={statement}
                onValueChange={(value) => {
                  setStatement(value);
                  setPhase((current) => (current.kind === 'result' ? { kind: 'form' } : current));
                }}
                currency={account.currency}
                allowNegative
                disabled={busy}
              />
            </div>

            {result && (
              <section aria-label="Resultado da conferência" className="grid gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-raised)] p-4">
                <dl className="grid gap-1.5 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-[var(--text-muted)]">Saldo no extrato</dt>
                    <dd className="money font-semibold">{money(result.check.statementBalance)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-[var(--text-muted)]">Saldo no app em {formatPtBrLogicalDate(result.date)}</dt>
                    <dd className="money font-semibold">{money(result.check.appBalance)}</dd>
                  </div>
                  <div className="flex justify-between gap-3 border-t border-[var(--border)] pt-1.5">
                    <dt className="font-semibold">Diferença</dt>
                    <dd className={`money font-bold ${result.check.matches ? 'text-[var(--income)]' : 'text-[var(--expense)]'}`}>
                      {result.check.matches ? money(0) : `${result.check.difference > 0 ? '+ ' : '− '}${money(Math.abs(result.check.difference))}`}
                    </dd>
                  </div>
                </dl>

                {result.check.matches ? (
                  <p role="status" className="text-sm text-[var(--income)]">O saldo confere com o extrato.</p>
                ) : result.check.adjustment ? (
                  <div className="grid gap-3">
                    <p className="text-sm text-[var(--text-muted)]">
                      {result.check.difference > 0
                        ? 'O app tem menos do que o extrato: falta registrar alguma entrada.'
                        : 'O app tem mais do que o extrato: falta registrar alguma saída.'}{' '}
                      Antes de ajustar, vale procurar o lançamento que falta ou está errado. Se não achar, crie um ajuste de{' '}
                      <strong>{money(result.check.adjustment.amount)}</strong> ({result.check.adjustment.type === 'INCOME' ? 'receita' : 'despesa'}
                      ) em {formatPtBrLogicalDate(result.date)}.
                    </p>
                    <Select
                      label="Categoria do ajuste"
                      value={categoryId}
                      onChange={(value) => setCategoryId(String(value))}
                      options={categoryOptions}
                      placeholder={categoryOptions.length === 0 ? 'Sem categorias deste tipo' : 'Escolha a categoria'}
                      disabled={busy || categoryOptions.length === 0}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      isLoading={phase.kind === 'adjusting'}
                      disabled={busy || !categoryId}
                      onClick={() => result.kind === 'result' && void createAdjustment(result)}
                    >
                      Criar ajuste de {money(result.check.adjustment.amount)}
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-[var(--text-muted)]">
                    A diferença é grande demais para um único ajuste. Revise os lançamentos da conta.
                  </p>
                )}
              </section>
            )}
          </>
        )}
      </div>
    </ModalShell>
  );
}
