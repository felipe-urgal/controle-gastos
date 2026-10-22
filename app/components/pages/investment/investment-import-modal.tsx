'use client';

import { useMemo, useState } from 'react';
import { FaFileImport } from 'react-icons/fa';

import { ModalShell } from '@/app/components/overlays/modal-shell';
import { formatCurrency } from '@/app/lib/currency/format-currency';
import {
  investmentService,
  type InvestmentImportPreview,
} from '@/app/services/investment-service';
import type { InvestmentAccountOption } from '@/app/types/investment';
import { Button, MoneyText, Select } from '@/app/components/ui';

type Props = {
  accounts: InvestmentAccountOption[];
  showValues: boolean;
  onClose: () => void;
  onImported: () => Promise<void>;
};

export function InvestmentImportModal({
  accounts,
  showValues,
  onClose,
  onImported,
}: Props) {
  const defaultAccount =
    accounts.find((account) => account.isActive && account.currency === 'BRL') ??
    accounts.find((account) => account.isActive);
  const [accountId, setAccountId] = useState(defaultAccount?.id ?? '');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<InvestmentImportPreview | null>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');

  const groups = useMemo(() => {
    if (!preview) return [];
    const bySymbol = new Map<
      string,
      {
        symbol: string;
        count: number;
        valid: number;
        duplicates: number;
        amountCents: number;
        quantity: number;
        assetExists: boolean;
      }
    >();

    for (const item of preview.items) {
      const group = bySymbol.get(item.symbol) ?? {
        symbol: item.symbol,
        count: 0,
        valid: 0,
        duplicates: 0,
        amountCents: 0,
        quantity: 0,
        assetExists: item.assetExists,
      };
      group.count += 1;
      if (item.errors.length === 0 && !item.duplicate) group.valid += 1;
      if (item.duplicate) group.duplicates += 1;
      group.amountCents +=
        item.kind === 'OPERATIONS' ? item.amountCents : item.netAmountCents;
      const quantity = Number(item.quantity);
      if (Number.isFinite(quantity)) group.quantity += quantity;
      group.assetExists ||= item.assetExists;
      bySymbol.set(item.symbol, group);
    }

    return [...bySymbol.values()].sort((a, b) =>
      a.symbol.localeCompare(b.symbol),
    );
  }, [preview]);

  async function generatePreview() {
    if (!file || !accountId) return;
    setError('');
    setWorking(true);
    try {
      const response = await investmentService.previewImport(file, accountId);
      setPreview(response.data);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Não foi possível analisar o arquivo',
      );
    } finally {
      setWorking(false);
    }
  }

  async function confirmImport() {
    if (!preview) return;
    setError('');
    setWorking(true);
    try {
      await investmentService.confirmImport({
        accountId: preview.accountId,
        previewToken: preview.previewToken,
        items: preview.items.map((item) => ({
          ...item,
          selected: item.errors.length === 0 && !item.duplicate,
        })),
      });
      await onImported();
      onClose();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Não foi possível importar os investimentos',
      );
    } finally {
      setWorking(false);
    }
  }

  return (
    <ModalShell
      variant="fullscreen-sheet"
      title="Importar investimentos"
      description="CSV/XLSX da B3 ou nota de corretagem PDF da Nu Investimentos."
      onClose={onClose}
      closeDisabled={working}
      maxWidthClass="max-w-3xl"
    >
      {error && (
        <p
          role="alert"
          className="mt-4 rounded-[14px] border border-[var(--expense)]/30 bg-[var(--danger-subtle)] p-3 text-sm text-[var(--expense)]"
        >
          {error}
        </p>
      )}

      {!preview ? (
        <div className="mt-5 space-y-4">
          <Select
            label="Conta de investimento"
            value={accountId}
            onChange={(value) => setAccountId(String(value))}
            placeholder="Selecione"
            options={accounts
              .filter((account) => account.isActive)
              .map((account) => ({
                value: account.id,
                label: `${account.name} · ${account.currency}`,
              }))}
            disabled={working}
          />

          <label>
            <span className="ds-label mb-2 block">Arquivo</span>
            <input
              type="file"
              accept=".csv,.xlsx,.pdf"
              disabled={working}
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
                setPreview(null);
              }}
              className="ds-control min-h-11 w-full px-3 py-2"
            />
          </label>

          <p className="text-xs leading-relaxed text-[var(--text-muted)]">
            O formato é detectado automaticamente. Ativos inexistentes são
            criados em BRL/B3. Registros já importados são ignorados.
          </p>

          <Button size="cta" pill fullWidth onClick={generatePreview} disabled={!file || !accountId || working}>
            <FaFileImport aria-hidden="true" />
            {working ? 'Analisando...' : 'Analisar arquivo'}
          </Button>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          {preview.detectedSource && (
            <div className="rounded-[14px] border border-[var(--border)] bg-[var(--surface-raised)] p-3 text-sm text-[var(--foreground)]">
              Arquivo detectado: <strong>{preview.detectedSource === 'NUBANK_BROKERAGE_NOTE' ? 'Notas de corretagem Nu Investimentos' : 'Extrato B3'}</strong>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Summary label="Registros" value={preview.summary.total} />
            <Summary label="Novos" value={preview.summary.valid} />
            <Summary label="Duplicados" value={preview.summary.duplicates} />
            <Summary label="Inválidos" value={preview.summary.invalid} />
          </div>

          <div className="rounded-[16px] border border-[var(--border)]">
            <div className="border-b border-[var(--border)] px-4 py-3">
              <strong className="text-sm text-[var(--foreground)]">
                {preview.kind === 'INCOMES' ? 'Proventos' : 'Movimentações'} ·{' '}
                {preview.fileName}
              </strong>
            </div>
            <div className="divide-y divide-[var(--border)]">
              {groups.map((group) => (
                <div
                  key={group.symbol}
                  className="grid gap-2 px-4 py-3 sm:grid-cols-[1fr_auto_auto] sm:items-center"
                >
                  <span>
                    <strong className="block text-sm text-[var(--foreground)]">
                      {group.symbol}
                    </strong>
                    <span className="text-xs text-[var(--text-muted)]">
                      {group.count} registro(s)
                      {!group.assetExists ? ' · novo ativo' : ''}
                      {group.duplicates > 0
                        ? ` · ${group.duplicates} duplicado(s)`
                        : ''}
                    </span>
                  </span>
                  <span className="text-sm text-[var(--text-muted)]">
                    {group.quantity.toLocaleString('pt-BR', {
                      maximumFractionDigits: 8,
                    })}{' '}
                    un.
                  </span>
                  <strong className="money text-sm text-[var(--foreground)]">
                    {showValues
                      ? formatCurrency(group.amountCents, 'BRL')
                      : '••••'}
                  </strong>
                </div>
              ))}
            </div>
          </div>

          {preview.brokerageNotes && preview.brokerageNotes.length > 0 && (
            <div className="rounded-[16px] border border-[var(--border)]">
              <div className="border-b border-[var(--border)] px-4 py-3">
                <strong className="text-sm text-[var(--foreground)]">Notas detectadas</strong>
              </div>
              <div className="divide-y divide-[var(--border)]">
                {preview.brokerageNotes.map((note) => (
                  <div key={note.noteNumber} className="grid gap-1 px-4 py-3 text-sm sm:grid-cols-[1fr_auto]">
                    <span>
                      <strong className="block text-[var(--foreground)]">Nota {note.noteNumber}</strong>
                      <span className="text-xs text-[var(--text-muted)]">
                        {note.tradeDate} · {note.businesses} negócio(s)
                        {note.brokerCnpj ? ` · ${note.brokerCnpj}` : ''}
                      </span>
                    </span>
                    <span className="text-right text-xs text-[var(--text-muted)]">
                      <MoneyText>
                        {`Taxas: ${showValues ? formatCurrency(note.feesCents, 'BRL') : '••••'}${note.irrfCents > 0 ? ` · IRRF: ${showValues ? formatCurrency(note.irrfCents, 'BRL') : '••••'}` : ''}`}
                      </MoneyText>
                      {note.irrfCents > 0 && (
                        <span className="mt-1 block">
                          {note.taxDestination === 'IRRF'
                            ? 'Destino fiscal: IRRF importado automaticamente'
                            : note.taxDestination === 'REVIEW_REQUIRED'
                              ? 'Destino fiscal: revisão obrigatória'
                              : 'Sem registro fiscal'}
                        </span>
                      )}
                      {note.taxDestination === 'REVIEW_REQUIRED' && (
                        <span className="mt-1 block max-w-sm">{note.taxReason}</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {preview.summary.invalid > 0 && (
            <div className="rounded-[14px] border border-[var(--expense)]/30 bg-[var(--danger-subtle)] p-3 text-xs text-[var(--expense)]">
              {preview.items
                .filter((item) => item.errors.length > 0)
                .slice(0, 5)
                .map((item) => (
                  <p key={item.index}>
                    Linha {item.index + 2}: {item.errors.join(' ')}
                  </p>
                ))}
            </div>
          )}

          <p className="text-xs leading-relaxed text-[var(--text-muted)]">
            Somente registros válidos e ainda não importados serão gravados.
            Proventos ficam no domínio de investimentos e não criam receitas
            em Transações.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" size="cta" pill onClick={() => {
                setPreview(null);
                setError('');
              }} disabled={working}>
              Voltar
            </Button>
            <Button size="cta" pill onClick={confirmImport} disabled={working || preview.summary.valid === 0}>
              {working
                ? 'Importando...'
                : `Importar ${preview.summary.valid} registro(s)`}
            </Button>
          </div>
        </div>
      )}
    </ModalShell>
  );
}

function Summary({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[14px] bg-[var(--surface-raised)] p-3">
      <span className="block text-xs text-[var(--text-muted)]">{label}</span>
      <strong className="mt-1 block text-lg text-[var(--foreground)]">
        {value}
      </strong>
    </div>
  );
}
