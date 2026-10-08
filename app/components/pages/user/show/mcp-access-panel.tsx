'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { FaCopy, FaKey, FaTrash } from 'react-icons/fa';

import { Button, Input } from '@/app/components/ui';
import { mcpService } from '@/app/services/mcp-service';
import type {
  McpAccessTokenSummary,
  McpCreateTokenInput,
} from '@/app/types/mcp';

function dateLabel(value: string | null) {
  if (!value) return 'Nunca';
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

export default function McpAccessPanel({
  totpEnabled,
}: {
  totpEnabled: boolean;
}) {
  const [items, setItems] = useState<McpAccessTokenSummary[]>([]);
  const [totalActive, setTotalActive] = useState(0);
  const [filter, setFilter] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [loadFailed, setLoadFailed] = useState(false);
  const [copyStatus, setCopyStatus] = useState('');
  const [name, setName] = useState('Meu cliente MCP');
  const [expiresInDays, setExpiresInDays] =
    useState<McpCreateTokenInput['expiresInDays']>(90);
  const [currentPassword, setCurrentPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [createdToken, setCreatedToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function loadTokens() {
    try {
      const response = await mcpService.listTokens();
      setItems(response.data.items);
      setTotalActive(response.data.totalActive);
      setLoadFailed(false);
      setError('');
    } catch (requestError) {
      setLoadFailed(true);
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Não foi possível carregar os tokens MCP.',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    void mcpService
      .listTokens()
      .then((response) => {
        if (cancelled) return;
        setItems(response.data.items);
        setTotalActive(response.data.totalActive);
        setError('');
      })
      .catch((requestError) => {
        if (cancelled) return;
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Não foi possível carregar os tokens MCP.',
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setCreatedToken('');

    if (!name.trim() || !currentPassword) {
      setError('Informe um nome e sua senha atual.');
      return;
    }

    const token = totpCode.trim();
    const recovery = recoveryCode.trim();
    if (totpEnabled && Boolean(token) === Boolean(recovery)) {
      setError('Informe um código do autenticador ou um recovery code, mas não os dois.');
      return;
    }

    setSaving(true);
    try {
      const response = await mcpService.createToken({
        name: name.trim(),
        expiresInDays,
        currentPassword,
        token: token || undefined,
        recoveryCode: recovery || undefined,
      });
      setCreatedToken(response.data.token);
      setCurrentPassword('');
      setTotpCode('');
      setRecoveryCode('');
      await loadTokens();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Não foi possível criar o token MCP.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleRevoke(id: string) {
    setError('');
    setRevokingId(id);
    try {
      await mcpService.revokeToken(id);
      await loadTokens();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Não foi possível revogar o token MCP.',
      );
    } finally {
      setRevokingId(null);
    }
  }

  async function copyCreatedToken() {
    setCopyStatus('');
    try {
      if (!navigator.clipboard) throw new Error('clipboard-unavailable');
      await navigator.clipboard.writeText(createdToken);
      setCopyStatus('Token copiado.');
    } catch {
      setCopyStatus('Não foi possível copiar automaticamente. Selecione e copie o token manualmente.');
    }
  }

  const visibleItems = items.filter((item) =>
    filter === 'ACTIVE' ? item.status === 'ACTIVE' : item.status !== 'ACTIVE',
  );

  return (
    <section className="ds-panel overflow-hidden" aria-labelledby="mcp-access-title">
      <div className="space-y-5 p-4 sm:p-5">
        <div>
          <div className="flex items-center gap-2">
            <FaKey className="text-[var(--primary)]" aria-hidden="true" />
            <h2 id="mcp-access-title" className="text-xl font-semibold text-[var(--foreground)]">
              Acesso MCP somente leitura
            </h2>
          </div>
          <p className="mt-1 text-base leading-relaxed text-[var(--text-muted)]">
            Gere um token separado para conectar um cliente MCP às consultas financeiras. O token não permite criar, editar ou excluir dados.
          </p>
        </div>

        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-raised)] p-4">
          <p className="text-sm font-semibold text-[var(--foreground)]">Endpoint MCP</p>
          <code className="mt-2 block break-all text-sm text-[var(--text-muted)]">
            /api/mcp
          </code>
          <p className="mt-2 text-xs leading-relaxed text-[var(--text-muted)]">
            Envie o token no header Authorization como Bearer. Escopo fixo: finance:read.
          </p>
          <p className="mt-2 text-xs leading-relaxed text-[var(--text-muted)]">
            O token retorna valores financeiros reais (transações, saldos, patrimônio e previsão). Ocultar valores na interface não limita os dados acessíveis por este token. Trocar a senha não revoga tokens; redefinir a senha por recuperação revoga todos.
          </p>
        </div>

        <form onSubmit={handleCreate} className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Nome do token"
              value={name}
              maxLength={80}
              onChange={(event) => setName(event.currentTarget.value)}
              disabled={saving}
              required
            />
            <label className="block">
              <span className="ds-label mb-2 block">Validade</span>
              <select
                value={expiresInDays}
                onChange={(event) =>
                  setExpiresInDays(Number(event.target.value) as McpCreateTokenInput['expiresInDays'])
                }
                className="ds-control min-h-11 w-full px-3"
                disabled={saving}
              >
                <option value={30}>30 dias</option>
                <option value={90}>90 dias</option>
                <option value={180}>180 dias</option>
                <option value={365}>365 dias</option>
              </select>
            </label>
          </div>

          <Input
            label="Senha atual"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.currentTarget.value)}
            disabled={saving}
            required
          />

          {totpEnabled && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Código do autenticador"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={totpCode}
                onChange={(event) => setTotpCode(event.currentTarget.value)}
                disabled={saving}
                placeholder="000000"
              />
              <Input
                label="Recovery code"
                value={recoveryCode}
                onChange={(event) => setRecoveryCode(event.currentTarget.value)}
                disabled={saving}
                placeholder="XXXX-XXXX-XXXX-XXXX-XXXX"
              />
            </div>
          )}

          <div>
            <Button type="submit" icon={<FaKey />} disabled={saving}>
              {saving ? 'Gerando...' : 'Gerar token MCP'}
            </Button>
          </div>
        </form>

        {createdToken && (
          <div className="rounded-[var(--radius-lg)] border border-[var(--primary)]/35 bg-[var(--primary-subtle)] p-4">
            <p className="text-sm font-semibold text-[var(--foreground)]">
              Copie este token agora
            </p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              O segredo completo não será exibido novamente.
            </p>
            <code className="mt-3 block break-all rounded-[var(--radius-md)] bg-[var(--surface)] p-3 text-xs text-[var(--foreground)]">
              {createdToken}
            </code>
            <Button
              type="button"
              variant="outline"
              icon={<FaCopy />}
              className="mt-3"
              onClick={() => void copyCreatedToken()}
            >
              Copiar token
            </Button>
            {copyStatus && (
              <p role="status" className="mt-2 text-xs text-[var(--text-muted)]">
                {copyStatus}
              </p>
            )}
          </div>
        )}

        {error && (
          <div role="alert" className="space-y-2">
            <p className="text-sm leading-relaxed text-[var(--expense)]">{error}</p>
            {loadFailed && (
              <Button type="button" size="sm" variant="outline" onClick={() => void loadTokens()}>
                Tentar novamente
              </Button>
            )}
          </div>
        )}

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
            Tokens ({totalActive} {totalActive === 1 ? 'ativo' : 'ativos'})
          </h3>

          <div className="mt-3 flex gap-2" role="group" aria-label="Filtrar tokens">
            <Button
              type="button"
              size="sm"
              variant={filter === 'ACTIVE' ? 'primary' : 'outline'}
              aria-pressed={filter === 'ACTIVE'}
              onClick={() => setFilter('ACTIVE')}
            >
              Ativos
            </Button>
            <Button
              type="button"
              size="sm"
              variant={filter === 'INACTIVE' ? 'primary' : 'outline'}
              aria-pressed={filter === 'INACTIVE'}
              onClick={() => setFilter('INACTIVE')}
            >
              Expirados/revogados
            </Button>
          </div>

          {loading ? (
            <p className="mt-3 text-sm text-[var(--text-muted)]">Carregando...</p>
          ) : visibleItems.length === 0 ? (
            <p className="mt-3 text-sm text-[var(--text-muted)]">
              Nenhum token MCP nesta lista.
            </p>
          ) : (
            <div className="mt-3 divide-y divide-[var(--border)] rounded-[var(--radius-lg)] border border-[var(--border)]">
              {visibleItems.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <strong className="text-sm text-[var(--foreground)]">{item.name}</strong>
                      <span className="rounded-full bg-[var(--surface-raised)] px-2 py-0.5 text-[11px] font-semibold text-[var(--text-muted)]">
                        {item.status === 'ACTIVE'
                          ? 'Ativo'
                          : item.status === 'EXPIRED'
                            ? 'Expirado'
                            : 'Revogado'}
                      </span>
                    </div>
                    <p className="mt-1 break-all text-xs text-[var(--text-muted)]">
                      {item.tokenPrefix}•••• · {item.scope}
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      Expira: {dateLabel(item.expiresAt)} · Último uso: {dateLabel(item.lastUsedAt)}
                    </p>
                  </div>
                  {item.status === 'ACTIVE' && (
                    <Button
                      type="button"
                      variant="outline"
                      icon={<FaTrash />}
                      disabled={revokingId === item.id}
                      onClick={() => void handleRevoke(item.id)}
                    >
                      {revokingId === item.id ? 'Revogando...' : 'Revogar'}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
