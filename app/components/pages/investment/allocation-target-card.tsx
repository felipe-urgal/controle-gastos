'use client';

import { useEffect, useMemo, useState } from 'react';

import { Alert } from '@/app/components/feedback';
import { Button, Input } from '@/app/components/ui';
import { RiseArticle } from '@/app/components/ui/motion';
import { assetTypes, typeLabel } from '@/app/components/pages/investment/investments-helpers';
import type { AllocationSlice } from '@/app/components/pages/investment/investments-model';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import { errorMessage } from '@/app/lib/error-message';
import {
  contributionByClass,
  rebalancePlan,
  validateAllocationTargets,
  type AllocationTarget,
} from '@/app/lib/investments/allocation-target-domain';
import { investmentService } from '@/app/services/investment-service';
import type { SupportedCurrency } from '@/app/types/financial-summary';
import type { InvestmentAssetType } from '@/app/types/investment';

const percent = (value: number) => `${value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 1 })}%`;

/**
 * Alocação alvo por classe de ativo (por moeda) contra o que a carteira tem hoje: quanto falta ou sobra em cada
 * classe e o menor aporte que equilibra tudo sem vender nada. Só descreve a conta; nenhuma ordem é criada.
 */
export function AllocationTargetCard({
  currency,
  allocation,
  showValues,
}: {
  currency: SupportedCurrency;
  allocation: AllocationSlice[];
  showValues: boolean;
}) {
  const [saved, setSaved] = useState<Record<string, AllocationTarget[]> | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    investmentService
      .getAllocationTargets()
      .then((response) => {
        if (!active) return;
        const byCurrency: Record<string, AllocationTarget[]> = {};
        for (const item of response.data) {
          (byCurrency[item.currency] ??= []).push({ assetType: item.assetType, percent: item.percent });
        }
        setSaved(byCurrency);
      })
      .catch((cause) => {
        if (!active) return;
        setSaved({});
        setError(errorMessage(cause, 'Não foi possível carregar a alocação alvo.'));
      });
    return () => {
      active = false;
    };
  }, []);

  const targets = useMemo(() => saved?.[currency] ?? [], [currency, saved]);
  const money = (cents: number) => (showValues ? formatCurrency(cents, currency) : '••••');
  const plan = useMemo(
    () => rebalancePlan({ holdings: allocation.map((slice) => ({ assetType: slice.type, value: slice.value })), targets }),
    [allocation, targets],
  );
  const contributions = useMemo(() => contributionByClass(plan), [plan]);

  function startEditing() {
    setDraft(Object.fromEntries(targets.map((target) => [target.assetType, String(target.percent)])));
    setError('');
    setEditing(true);
  }

  const draftTargets: AllocationTarget[] = assetTypes.flatMap((item) => {
    const raw = (draft[item.value] ?? '').trim();
    return raw === '' ? [] : [{ assetType: item.value as InvestmentAssetType, percent: Number(raw) }];
  });
  const draftMessage = validateAllocationTargets(draftTargets);
  const draftSum = draftTargets.reduce((sum, target) => sum + (Number.isFinite(target.percent) ? target.percent : 0), 0);

  async function persist(next: AllocationTarget[]) {
    setSaving(true);
    setError('');
    try {
      await investmentService.saveAllocationTargets(currency, next);
      setSaved((previous) => ({ ...(previous ?? {}), [currency]: next }));
      setEditing(false);
    } catch (cause) {
      setError(errorMessage(cause, 'Não foi possível salvar a alocação alvo.'));
    } finally {
      setSaving(false);
    }
  }

  if (saved === null) return null;

  return (
    <RiseArticle className="min-w-0 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-surface)] sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[var(--foreground)]">Alocação alvo</h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Defina quanto de cada classe você quer ter em {currency} e veja o que falta para chegar lá.
          </p>
        </div>
        {!editing && (
          <Button type="button" size="compact" variant="outline" onClick={startEditing}>
            {targets.length === 0 ? 'Definir meta' : 'Alterar'}
          </Button>
        )}
      </div>

      {editing && (
        <div className="mt-4 grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            {assetTypes.map((item) => (
              <Input
                key={item.value}
                label={`${item.label} (%)`}
                type="number"
                min={1}
                max={100}
                value={draft[item.value] ?? ''}
                onChange={(event) => setDraft((current) => ({ ...current, [item.value]: event.target.value }))}
                disabled={saving}
                placeholder="0"
              />
            ))}
          </div>
          <p aria-live="polite" className={`text-xs ${draftMessage && draftTargets.length > 0 ? 'font-semibold text-[var(--warning)]' : 'text-[var(--text-muted)]'}`}>
            Soma: {draftSum}%{draftTargets.length > 0 && draftSum !== 100 ? ' (precisa fechar em 100%)' : ''}. Deixe em branco as classes que não entram na meta.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => void persist(draftTargets)} isLoading={saving} disabled={saving || draftMessage !== null}>
              {draftTargets.length === 0 ? 'Remover meta' : 'Salvar'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setEditing(false)} disabled={saving}>Cancelar</Button>
          </div>
        </div>
      )}

      {!editing && targets.length > 0 && (
        <div className="mt-4 grid gap-3">
          <ul className="divide-y divide-[var(--border)] rounded-[var(--radius-md)] border border-[var(--border)]">
            {plan.rows.map((row) => (
              <li key={row.assetType} className="grid gap-1 p-3 sm:grid-cols-[1fr_auto] sm:items-center">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{typeLabel(row.assetType)}</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    Hoje {percent(row.currentShare)} · meta {row.targetPercent > 0 ? percent(row.targetPercent) : 'sem meta'}
                  </p>
                </div>
                <p className={`money text-sm sm:text-right ${row.difference > 0 ? 'text-[var(--income)]' : row.difference < 0 ? 'text-[var(--warning)]' : 'text-[var(--text-muted)]'}`}>
                  {row.difference === 0
                    ? 'Na meta'
                    : row.difference > 0
                      ? `Faltam ${money(row.difference)}`
                      : `${money(Math.abs(row.difference))} acima`}
                </p>
              </li>
            ))}
          </ul>

          {plan.untargetedValue > 0 ? (
            <p className="text-sm text-[var(--text-muted)]">
              {money(plan.untargetedValue)} estão em classes sem meta; só reorganizar a carteira resolve, aportar não.
            </p>
          ) : plan.contributionToBalance === 0 ? (
            <p className="text-sm font-semibold text-[var(--income)]">A carteira está na meta.</p>
          ) : plan.contributionToBalance !== null ? (
            <p className="text-sm">
              Para equilibrar <strong>sem vender nada</strong>, aporte <strong className="money">{money(plan.contributionToBalance)}</strong>:{' '}
              {contributions.map((item) => `${money(item.amount)} em ${typeLabel(item.assetType)}`).join(', ')}.
            </p>
          ) : null}
        </div>
      )}

      {!editing && targets.length === 0 && (
        <p className="mt-4 text-sm text-[var(--text-muted)]">Sem meta definida para {currency}.</p>
      )}

      {error && (
        <div className="mt-3">
          <Alert variant="error" message={error} />
        </div>
      )}
    </RiseArticle>
  );
}
