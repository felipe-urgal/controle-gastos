'use client';

import { useCallback, useEffect, useState } from 'react';

import { Alert } from '@/app/components/feedback';
import { SettingsPanel } from '@/app/components/pages/user/show/settings-row';
import { Button } from '@/app/components/ui';
import { errorMessage } from '@/app/lib/error-message';
import {
  securityService,
  type AuthSessionItem,
  type SecurityEventItem,
  type SecurityEventType,
} from '@/app/services/security-service';

const EVENT_LABELS: Record<SecurityEventType, string> = {
  LOGIN: 'Login',
  PASSWORD_CHANGED: 'Senha alterada',
  PASSWORD_RESET: 'Senha redefinida por e-mail',
  TWO_FACTOR_ENABLED: 'Verificação em duas etapas ativada',
  TWO_FACTOR_DISABLED: 'Verificação em duas etapas desativada',
  SESSIONS_REVOKED: 'Sessões encerradas',
};

function dateTime(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}

/**
 * Aparelhos com login ativo (dá para encerrar um ou todos os outros) e o histórico recente de eventos de segurança:
 * login, troca de senha, duas etapas e sessões encerradas. Não mostra IP nem dados além do aparelho.
 */
export default function SessionsPanel() {
  const [sessions, setSessions] = useState<AuthSessionItem[] | null>(null);
  const [events, setEvents] = useState<SecurityEventItem[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    try {
      const [sessionsResponse, eventsResponse] = await Promise.all([securityService.listSessions(), securityService.listEvents()]);
      setSessions(sessionsResponse.data.items);
      setEvents(eventsResponse.data.items);
    } catch (cause) {
      setSessions((current) => current ?? []);
      setEvents((current) => current ?? []);
      setError(errorMessage(cause, 'Não foi possível carregar as sessões e o histórico.'));
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeout);
  }, [load]);

  async function act(action: () => Promise<string>) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      setNotice(await action());
      await load();
    } catch (cause) {
      setError(errorMessage(cause, 'Não foi possível concluir.'));
    } finally {
      setBusy(false);
    }
  }

  const others = (sessions ?? []).filter((session) => !session.current);

  return (
    <SettingsPanel
      id="sessions-title"
      title="Sessões e atividade"
      description="Aparelhos conectados à sua conta e o que aconteceu nela recentemente."
    >
      <div className="grid gap-4 p-4 sm:p-5" aria-live="polite">
        {error && <Alert variant="error" message={error} />}
        {notice && <Alert variant="success" message={notice} />}

        <div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-bold">Aparelhos conectados</h3>
            {others.length > 0 && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => void act(async () => `${(await securityService.revokeOtherSessions()).data.revoked} sessão(ões) encerrada(s).`)}
              >
                Encerrar as outras sessões
              </Button>
            )}
          </div>
          {sessions === null ? (
            <p className="mt-2 text-sm text-[var(--text-muted)]">Carregando…</p>
          ) : sessions.length === 0 ? (
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Nenhuma sessão listada. Logins feitos antes desta função aparecem aqui só depois de entrar de novo.
            </p>
          ) : (
            <ul className="mt-2 divide-y divide-[var(--border)] rounded-[var(--radius-md)] border border-[var(--border)]">
              {sessions.map((session) => (
                <li key={session.id} className="flex flex-wrap items-center gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">
                      {session.device}
                      {session.current && (
                        <span className="ml-2 rounded-full bg-[var(--primary-subtle)] px-2 py-0.5 text-xs font-bold text-[var(--primary)]">Este aparelho</span>
                      )}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">
                      Entrou em {dateTime(session.createdAt)} · visto por último em {dateTime(session.lastSeenAt)}
                    </p>
                  </div>
                  {!session.current && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      aria-label={`Encerrar a sessão de ${session.device}`}
                      onClick={() => void act(async () => {
                        await securityService.revokeSession(session.id);
                        return 'Sessão encerrada.';
                      })}
                    >
                      Encerrar
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h3 className="text-sm font-bold">Atividade recente</h3>
          {events === null ? (
            <p className="mt-2 text-sm text-[var(--text-muted)]">Carregando…</p>
          ) : events.length === 0 ? (
            <p className="mt-2 text-sm text-[var(--text-muted)]">Nada registrado ainda.</p>
          ) : (
            <ul className="mt-2 divide-y divide-[var(--border)] rounded-[var(--radius-md)] border border-[var(--border)]">
              {events.slice(0, 15).map((event) => (
                <li key={event.id} className="flex flex-wrap items-baseline justify-between gap-2 p-3 text-sm">
                  <span className="font-semibold">{EVENT_LABELS[event.type]}</span>
                  <span className="text-xs text-[var(--text-muted)]">
                    {dateTime(event.createdAt)}
                    {event.device ? ` · ${event.device}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-xs text-[var(--text-muted)]">
            Se algo aqui não foi você, troque a senha e encerre as outras sessões.
          </p>
        </div>
      </div>
    </SettingsPanel>
  );
}
