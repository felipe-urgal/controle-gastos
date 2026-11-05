'use client';

import { useEffect, useMemo, useState } from 'react';

import { Alert } from '@/app/components/feedback';
import { Button, MoneyInput } from '@/app/components/ui';
import { RiseArticle } from '@/app/components/ui/motion';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import { parseMoneyInputToCents } from '@/app/lib/currency/parse-money-input';
import { errorMessage } from '@/app/lib/error-message';
import {
  projectNetWorthTarget,
  type NetWorthTargetPoint,
  type NetWorthTargetProjection,
} from '@/app/lib/net-worth/net-worth-target-domain';
import { netWorthService } from '@/app/services/net-worth-service';
import type { SupportedCurrency } from '@/app/types/financial-summary';

function reachLabel(year: number, month: number) {
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function projectionText(projection: NetWorthTargetProjection, money: (cents: number) => string, windowMonths: number) {
  switch (projection.status) {
    case 'REACHED':
      return 'Meta atingida.';
    case 'INSUFFICIENT_HISTORY':
      return 'Ainda não dá para projetar: precisamos de pelo menos 3 meses com patrimônio conhecido na janela exibida.';
    case 'NOT_GROWING':
      return `No ritmo médio dos últimos ${windowMonths} meses (${money(projection.monthlyPace)} por mês), a meta não é atingida.`;
    case 'TOO_FAR':
      return `No ritmo médio dos últimos ${windowMonths} meses (+${money(projection.monthlyPace)} por mês), a meta fica a mais de 50 anos.`;
    case 'ON_TRACK':
      return `No ritmo médio dos últimos ${windowMonths} meses (+${money(projection.monthlyPace)} por mês), você chega lá em ${reachLabel(projection.reachYear, projection.reachMonth)} (${projection.months} ${projection.months === 1 ? 'mês' : 'meses'}).`;
  }
}

/**
 * Meta de patrimônio por moeda com projeção "quando chego lá" pelo ritmo da janela exibida.
 * O ritmo é uma média do passado, não uma previsão: a tela diz de onde vem o número.
 */
export function NetWorthTargetCard({
  currency,
  current,
  points,
  end,
  windowMonths,
  showValues,
}: {
  currency: SupportedCurrency;
  current: number;
  points: NetWorthTargetPoint[];
  end: { year: number; month: number };
  windowMonths: number;
  showValues: boolean;
}) {
  const [targets, setTargets] = useState<Record<string, number> | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    netWorthService
      .getTargets()
      .then((response) => {
        if (active) setTargets(Object.fromEntries(response.data.map((item) => [item.currency, item.amount])));
      })
      .catch((cause) => {
        if (!active) return;
        setTargets({});
        setError(errorMessage(cause, 'Não foi possível carregar a meta.'));
      });
    return () => {
      active = false;
    };
  }, []);

  const target = targets?.[currency] ?? null;
  const money = (cents: number) => (showValues ? formatCurrency(cents, currency) : '••••');
  const projection = useMemo(
    () => (target === null ? null : projectNetWorthTarget({ points, current, target, end })),
    [current, end, points, target],
  );

  async function save() {
    const amount = parseMoneyInputToCents(draft);
    if (amount === null) {
      setError('Informe um valor maior que zero.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await netWorthService.saveTarget({ currency, amount });
      setTargets((previous) => ({ ...(previous ?? {}), [currency]: amount }));
      setEditing(false);
    } catch (cause) {
      setError(errorMessage(cause, 'Não foi possível salvar a meta.'));
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    setSaving(true);
    setError('');
    try {
      await netWorthService.removeTarget(currency);
      setTargets((previous) => {
        const next = { ...(previous ?? {}) };
        delete next[currency];
        return next;
      });
      setEditing(false);
    } catch (cause) {
      setError(errorMessage(cause, 'Não foi possível remover a meta.'));
    } finally {
      setSaving(false);
    }
  }

  if (targets === null) return null;

  const progress = target ? Math.max(0, Math.min(100, Math.round((current / target) * 100))) : 0;

  return (
    <RiseArticle className="min-w-0 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-surface)] sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[var(--foreground)]">Meta de patrimônio</h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">Defina quanto quer ter e veja quando chega lá no ritmo atual.</p>
        </div>
        {!editing && (
          <Button
            type="button"
            variant="outline"
            size="compact"
            onClick={() => {
              setDraft('');
              setError('');
              setEditing(true);
            }}
          >
            {target === null ? 'Definir meta' : 'Alterar'}
          </Button>
        )}
      </div>

      {editing && (
        <div className="mt-4 space-y-3">
          <MoneyInput label={`Meta em ${currency}`} currency={currency} value={draft} onValueChange={setDraft} placeholder="1.000.000,00" disabled={saving} />
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => void save()} isLoading={saving} disabled={saving}>Salvar</Button>
            <Button type="button" variant="secondary" onClick={() => setEditing(false)} disabled={saving}>Cancelar</Button>
            {target !== null && (
              <Button type="button" variant="danger" onClick={() => void remove()} disabled={saving}>Remover meta</Button>
            )}
          </div>
        </div>
      )}

      {target !== null && !editing && projection && (
        <div className="mt-4 space-y-3">
          <div>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="money font-semibold">{money(current)}</span>
              <span className="money text-[var(--text-muted)]">meta {money(target)}</span>
            </div>
            <div
              className="mt-2 h-2.5 overflow-hidden rounded-full bg-[var(--surface-subtle)]"
              role="progressbar"
              aria-label="Progresso da meta de patrimônio"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
            >
              <div className="h-full rounded-full bg-[var(--income)]" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-1 text-xs text-[var(--text-muted)]">{progress}% da meta</p>
          </div>
          <p className="text-sm">{projectionText(projection, money, windowMonths)}</p>
        </div>
      )}

      {error && (
        <div className="mt-3">
          <Alert variant="error" message={error} />
        </div>
      )}
    </RiseArticle>
  );
}
