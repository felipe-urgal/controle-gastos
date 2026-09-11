'use client';

import { useRef, useState } from 'react';
import {
  FaBalanceScale,
  FaCheck,
  FaCheckCircle,
  FaHistory,
  FaUndo,
} from 'react-icons/fa';

import { Button, Input } from '@/app/components/ui';
import { useAuth } from '@/app/context';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import { reconciliationService } from '@/app/services/reconciliation-service';
import type { AccountModel } from '@/app/types/account';
import type {
  ReconciliationInput,
  ReconciliationItem,
  ReconciliationPreview,
} from '@/app/types/reconciliation';

interface ReconciliationPanelProps {
  account: AccountModel;
  onChanged?: () => Promise<void> | void;
}

function logicalToday() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

function parseLogicalDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error('Informe uma data de corte válida');

  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

function parseCurrencyToCents(value: string) {
  const normalized = value
    .trim()
    .replace(/[^\d,.-]/g, '')
    .replace(/\.(?=.*\.)/g, '')
    .replace(/\./g, '')
    .replace(',', '.');

  if (!normalized || normalized === '-' || normalized === '.' || normalized === '-.') {
    throw new Error('Informe o saldo final do extrato');
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) {
    throw new Error('Informe o saldo final do extrato');
  }

  return Math.round(parsed * 100);
}

function itemDate(item: ReconciliationItem) {
  return `${String(item.day).padStart(2, '0')}/${String(item.month).padStart(2, '0')}/${item.year}`;
}

export default function ReconciliationPanel({
  account,
  onChanged,
}: ReconciliationPanelProps) {
  const { user } = useAuth();
  const showValues = user?.showValues !== false;
  const [isOpen, setIsOpen] = useState(false);
  const [cutoff, setCutoff] = useState(logicalToday);
  const [statementBalance, setStatementBalance] = useState('');
  const [preview, setPreview] = useState<ReconciliationPreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmUndo, setConfirmUndo] = useState(false);
  const statusRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement | HTMLAnchorElement>(null);
  const cutoffRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  function focusStatus() {
    requestAnimationFrame(() => statusRef.current?.focus({ preventScroll: true }));
  }

  function openPanel() {
    setStatementBalance(
      showValues ? formatCurrency(account.balance, account.currency) : '',
    );
    setPreview(null);
    setError(null);
    setMessage(null);
    setConfirmUndo(false);
    setIsOpen(true);
    requestAnimationFrame(() => cutoffRef.current?.focus({ preventScroll: true }));
  }

  function closePanel() {
    setIsOpen(false);
    setPreview(null);
    setError(null);
    setMessage(null);
    setConfirmUndo(false);
    requestAnimationFrame(() => triggerRef.current?.focus({ preventScroll: true }));
  }

  function buildInput(): ReconciliationInput {
    const date = parseLogicalDate(cutoff);
    return {
      ...date,
      statementBalance: parseCurrencyToCents(statementBalance),
    };
  }

  async function loadPreview(input = buildInput()) {
    setLoadingPreview(true);
    setError(null);
    try {
      const response = await reconciliationService.preview(account.id, input);
      setPreview(response.data);
      return response.data;
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Não foi possível calcular a reconciliação',
      );
      return null;
    } finally {
      setLoadingPreview(false);
    }
  }

  async function handlePreview() {
    setMessage(null);
    setConfirmUndo(false);
    try {
      await loadPreview();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Revise os dados informados');
    }
  }

  async function updateItem(item: ReconciliationItem, next: 'UNCLEARED' | 'CLEARED') {
    setBusyAction(item.id);
    setError(null);
    setMessage(null);
    try {
      await reconciliationService.updateTransaction(item.id, next);
      setMessage(
        next === 'CLEARED'
          ? 'Transação marcada como conferida.'
          : 'Transação voltou para não conferida.',
      );
      await onChanged?.();
      await loadPreview();
      focusStatus();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Não foi possível atualizar a conferência',
      );
      focusStatus();
    } finally {
      setBusyAction(null);
    }
  }

  async function confirmReconciliation() {
    let input: ReconciliationInput;
    try {
      input = buildInput();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Revise os dados informados');
      return;
    }

    setBusyAction('confirm');
    setError(null);
    setMessage(null);
    try {
      const response = await reconciliationService.confirm(account.id, input);
      setMessage(
        response.data.reconciledCount > 0
          ? `${response.data.reconciledCount} lançamento${response.data.reconciledCount === 1 ? '' : 's'} reconciliado${response.data.reconciledCount === 1 ? '' : 's'} com sucesso.`
          : 'Nenhum lançamento novo precisava ser reconciliado.',
      );
      await onChanged?.();
      await loadPreview(input);
      focusStatus();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Não foi possível confirmar a reconciliação',
      );
      focusStatus();
    } finally {
      setBusyAction(null);
    }
  }

  async function undoLatest() {
    const latest = preview?.latestReconciliation;
    if (!latest) return;

    setBusyAction('undo');
    setError(null);
    setMessage(null);
    try {
      const response = await reconciliationService.undo(account.id, latest.reconciledAt);
      setMessage(
        response.data.idempotent
          ? 'Esse fechamento já estava desfeito.'
          : response.data.restoredCount === 1
            ? '1 lançamento voltou para Conferida.'
            : `${response.data.restoredCount} lançamentos voltaram para Conferida.`,
      );
      setConfirmUndo(false);
      await onChanged?.();
      await loadPreview();
      focusStatus();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Não foi possível desfazer o fechamento',
      );
      focusStatus();
    } finally {
      setBusyAction(null);
    }
  }

  if (!isOpen) {
    return (
      <section className="ds-panel p-5 sm:p-6" aria-labelledby="reconciliation-heading">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 id="reconciliation-heading" className="text-xl font-semibold text-[var(--foreground)]">
              Reconciliação do extrato
            </h3>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[var(--text-muted)]">
              Confira lançamentos contra o extrato sem alterar o saldo realizado da conta.
            </p>
          </div>
          <Button
            ref={triggerRef}
            variant="outline"
            icon={<FaBalanceScale />}
            onClick={openPanel}
          >
            Iniciar reconciliação
          </Button>
        </div>
      </section>
    );
  }

  const canConfirm =
    preview?.difference === 0 && (preview?.clearedItems.length ?? 0) > 0;
  const latest = preview?.latestReconciliation;
  const hiddenValue = '••••';

  return (
    <section
      className="ds-panel overflow-hidden"
      aria-labelledby="reconciliation-heading"
    >
      <div className="border-b border-[var(--border)] px-5 py-4 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 id="reconciliation-heading" className="text-xl font-semibold text-[var(--foreground)]">
              Reconciliação do extrato
            </h3>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[var(--text-muted)]">
              Marque os lançamentos encontrados no extrato e confirme somente quando a diferença for exatamente zero.
            </p>
            {!showValues && (
              <p className="mt-2 text-sm text-[var(--text-subtle)]">
                Valores derivados permanecem ocultos. O saldo do extrato informado por você é usado somente para conferir o fechamento.
              </p>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={closePanel}>
            Fechar painel
          </Button>
        </div>
      </div>

      <div className="space-y-5 p-5 sm:p-6">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
          <Input
            ref={cutoffRef}
            id="reconciliation-cutoff"
            label="Data final do extrato"
            type="date"
            value={cutoff}
            onChange={(event) => setCutoff(event.target.value)}
            disabled={Boolean(busyAction)}
          />
          <Input
            id="reconciliation-statement-balance"
            label={`Saldo final do extrato · ${account.currency}`}
            value={statementBalance}
            onChange={(event) => setStatementBalance(event.target.value)}
            onBlur={() => {
              try {
                setStatementBalance(
                  formatCurrency(parseCurrencyToCents(statementBalance), account.currency),
                );
              } catch {
                // A validação visível acontece ao calcular.
              }
            }}
            inputMode="decimal"
            disabled={Boolean(busyAction)}
          />
          <Button
            variant="primary"
            onClick={() => void handlePreview()}
            isLoading={loadingPreview}
            loadingText="Calculando"
            disabled={Boolean(busyAction)}
          >
            Calcular diferença
          </Button>
        </div>

        <div
          ref={statusRef}
          tabIndex={-1}
          className="outline-none"
          aria-live="polite"
        >
          {error && (
            <p role="alert" className="rounded-[var(--radius-md)] border border-[var(--danger)]/40 bg-[var(--danger-subtle)] p-3 text-sm text-[var(--expense)]">
              {error}
            </p>
          )}
          {message && (
            <p className="rounded-[var(--radius-md)] border border-[var(--primary)]/35 bg-[var(--primary-subtle)] p-3 text-sm text-[var(--foreground)]">
              {message}
            </p>
          )}
        </div>

        {preview && (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Resumo da reconciliação">
              <Metric
                label="Saldo do extrato"
                value={showValues ? formatCurrency(preview.statementBalance, account.currency) : hiddenValue}
              />
              <Metric
                label="Saldo conferido"
                value={showValues ? formatCurrency(preview.clearedBalance, account.currency) : hiddenValue}
              />
              <Metric
                label="Saldo realizado"
                value={showValues ? formatCurrency(preview.realizedBalance, account.currency) : hiddenValue}
              />
              <Metric
                label="Diferença"
                value={showValues ? formatCurrency(preview.difference, account.currency) : hiddenValue}
                emphasized
                success={preview.difference === 0}
              />
            </div>

            <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-raised)] p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-[var(--foreground)]">
                    {preview.difference === 0 ? 'Extrato conferido' : 'Ainda há diferença'}
                  </p>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    {preview.difference === 0
                      ? 'A diferença está em zero. O fechamento promove somente os itens marcados como Conferida.'
                      : 'Revise os itens abaixo até o saldo conferido coincidir exatamente com o extrato.'}
                  </p>
                </div>
                <Button
                  variant="success"
                  icon={<FaCheckCircle />}
                  onClick={() => void confirmReconciliation()}
                  disabled={!canConfirm || Boolean(busyAction)}
                  isLoading={busyAction === 'confirm'}
                  loadingText="Confirmando"
                >
                  Confirmar reconciliação
                </Button>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <TransactionGroup
                title="Não conferidas"
                description="Lançamentos concluídos até a data de corte que ainda não foram encontrados no extrato."
                items={preview.unclearedItems}
                empty="Nenhum lançamento não conferido neste recorte."
                accountCurrency={account.currency}
                showValues={showValues}
                actionLabel="Marcar conferida"
                actionIcon={<FaCheck />}
                busyAction={busyAction}
                onAction={(item) => void updateItem(item, 'CLEARED')}
              />
              <TransactionGroup
                title="Conferidas neste fechamento"
                description="Itens encontrados no extrato atual e ainda reversíveis antes da confirmação."
                items={preview.clearedItems}
                empty="Nenhum lançamento marcado como conferido ainda."
                accountCurrency={account.currency}
                showValues={showValues}
                actionLabel="Desmarcar"
                actionIcon={<FaUndo />}
                busyAction={busyAction}
                onAction={(item) => void updateItem(item, 'UNCLEARED')}
              />
            </div>

            {latest && (
              <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-raised)] p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="inline-flex items-center gap-2 font-semibold text-[var(--foreground)]">
                      <FaHistory aria-hidden="true" />
                      Último fechamento ativo
                    </p>
                    <p className="mt-1 text-sm text-[var(--text-muted)]">
                      {latest.transactionCount} lançamento{latest.transactionCount === 1 ? '' : 's'} reconciliado{latest.transactionCount === 1 ? '' : 's'} em {new Date(latest.reconciledAt).toLocaleString('pt-BR')}.
                    </p>
                    {latest.cutoff && (
                      <p className="mt-1 text-sm text-[var(--text-subtle)]">
                        Extrato até {String(latest.cutoff.day).padStart(2, '0')}/{String(latest.cutoff.month).padStart(2, '0')}/{latest.cutoff.year}
                        {latest.statementBalance !== null
                          ? ` · ${showValues ? formatCurrency(latest.statementBalance, account.currency) : hiddenValue}`
                          : ''}
                      </p>
                    )}
                  </div>
                  {!confirmUndo ? (
                    <Button
                      variant="outline"
                      size="sm"
                      icon={<FaUndo />}
                      onClick={() => setConfirmUndo(true)}
                    >
                      Desfazer último fechamento
                    </Button>
                  ) : (
                    <div className="max-w-sm rounded-[var(--radius-md)] border border-[var(--warning)]/45 bg-[var(--surface-subtle)] p-3">
                      <p className="text-sm leading-relaxed text-[var(--foreground)]">
                        Isso retorna somente este lote para <strong>Conferida</strong>. Valores e status financeiro não mudam.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          variant="warning"
                          size="sm"
                          onClick={() => void undoLatest()}
                          isLoading={busyAction === 'undo'}
                          loadingText="Desfazendo"
                        >
                          Confirmar desfazer
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setConfirmUndo(false)}
                          disabled={busyAction === 'undo'}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

function Metric({
  label,
  value,
  emphasized = false,
  success = false,
}: {
  label: string;
  value: string;
  emphasized?: boolean;
  success?: boolean;
}) {
  return (
    <div className={`rounded-[var(--radius-md)] border p-4 ${emphasized ? 'border-[var(--border-strong)] bg-[var(--surface-subtle)]' : 'border-[var(--border)] bg-[var(--surface-raised)]'}`}>
      <p className="text-sm font-medium text-[var(--text-muted)]">{label}</p>
      <p className={`mt-2 break-words text-xl font-bold ${success ? 'text-[var(--income)]' : 'text-[var(--foreground)]'}`}>
        {value}
      </p>
    </div>
  );
}

function TransactionGroup({
  title,
  description,
  items,
  empty,
  accountCurrency,
  showValues,
  actionLabel,
  actionIcon,
  busyAction,
  onAction,
}: {
  title: string;
  description: string;
  items: ReconciliationItem[];
  empty: string;
  accountCurrency: string;
  showValues: boolean;
  actionLabel: string;
  actionIcon: React.ReactNode;
  busyAction: string | null;
  onAction: (item: ReconciliationItem) => void;
}) {
  return (
    <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-raised)]">
      <div className="border-b border-[var(--border)] p-4">
        <h4 className="font-semibold text-[var(--foreground)]">{title}</h4>
        <p className="mt-1 text-sm leading-relaxed text-[var(--text-muted)]">{description}</p>
      </div>
      {items.length === 0 ? (
        <p className="p-4 text-sm text-[var(--text-muted)]">{empty}</p>
      ) : (
        <ul className="max-h-[360px] divide-y divide-[var(--border)] overflow-y-auto">
          {items.map((item) => (
            <li key={item.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="truncate font-medium text-[var(--foreground)]">
                  {item.description || 'Sem descrição'}
                </p>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  {itemDate(item)} · {item.kind === 'TRANSFER' ? 'Transferência' : item.type === 'INCOME' ? 'Receita' : 'Despesa'} · {item.type === 'INCOME' ? '+' : '-'}{showValues ? formatCurrency(item.amount, accountCurrency) : '••••'}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                icon={actionIcon}
                onClick={() => onAction(item)}
                isLoading={busyAction === item.id}
                disabled={Boolean(busyAction) && busyAction !== item.id}
              >
                {actionLabel}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
