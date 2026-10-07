'use client';

import { useState } from 'react';
import { FaClock, FaEye, FaPalette } from 'react-icons/fa';

import { ActiveToggle, Select } from '@/app/components/ui';
import { useAuth, useTheme } from '@/app/context';
import type { User } from '@/app/types/user';

interface PreferencesProps {
  user: User;
  onUserChange: (user: User) => void;
}

type Feedback = {
  type: 'success' | 'error';
  message: string;
};

export default function Preferences({ user, onUserChange }: PreferencesProps) {
  const { updateUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const [isSavingVisibility, setIsSavingVisibility] = useState(false);
  const [isSavingPeriodicSummary, setIsSavingPeriodicSummary] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const handleShowValuesChange = async (showValues: boolean) => {
    if (isSavingVisibility || showValues === user.showValues) return;

    setIsSavingVisibility(true);
    setFeedback(null);

    try {
      await updateUser({ showValues });
      onUserChange({ ...user, showValues });
      setFeedback({
        type: 'success',
        message: 'Preferência de valores atualizada.',
      });
    } catch {
      setFeedback({
        type: 'error',
        message: 'Não foi possível atualizar a preferência de valores.',
      });
    } finally {
      setIsSavingVisibility(false);
    }
  };

  const handlePeriodicSummaryChange = async (periodicSummaryEnabled: boolean) => {
    if (
      isSavingPeriodicSummary ||
      periodicSummaryEnabled === user.periodicSummaryEnabled
    ) {
      return;
    }

    setIsSavingPeriodicSummary(true);
    setFeedback(null);

    try {
      await updateUser({ periodicSummaryEnabled });
      onUserChange({
        ...user,
        periodicSummaryEnabled,
      });
      setFeedback({
        type: 'success',
        message: 'Preferência de resumo semanal atualizada.',
      });
    } catch {
      setFeedback({
        type: 'error',
        message: 'Não foi possível atualizar o resumo semanal.',
      });
    } finally {
      setIsSavingPeriodicSummary(false);
    }
  };

  return (
    <section
      className="ds-panel overflow-hidden"
      aria-labelledby="profile-preferences-title"
      aria-busy={isSavingVisibility || isSavingPeriodicSummary || undefined}
    >
      <div className="border-b border-[var(--border)] px-4 py-4 sm:px-5">
        <h2 id="profile-preferences-title" className="text-xl font-semibold text-[var(--foreground)]">
          Preferências
        </h2>
        <p className="mt-1 text-base leading-relaxed text-[var(--text-muted)]">
          Preferências da conta acompanham seu login. A aparência é local a este navegador.
        </p>
      </div>

      <div className="space-y-5 p-4 sm:p-5">
        <div>
          <div className="mb-2 flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--surface-raised)] text-[var(--text-muted)]" aria-hidden="true">
              <FaEye />
            </span>
            <div>
              <h3 className="text-base font-semibold text-[var(--foreground)]">Valores financeiros</h3>
              <p className="mt-0.5 text-sm leading-relaxed text-[var(--text-muted)]">
                Preferência da conta: controla se saldos e valores ficam visíveis nas telas financeiras.
              </p>
            </div>
          </div>

          <ActiveToggle
            isActive={user.showValues}
            onToggle={(value) => void handleShowValuesChange(value)}
            disabled={isSavingVisibility}
            label="Exibir valores"
            activeLabel={isSavingVisibility ? 'Salvando…' : 'Visíveis'}
            inactiveLabel={isSavingVisibility ? 'Salvando…' : 'Ocultos'}
          />
        </div>

        <div className="border-t border-[var(--border)] pt-5">
          <div className="mb-2 flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--surface-raised)] text-[var(--text-muted)]" aria-hidden="true">
              <FaClock />
            </span>
            <div>
              <h3 className="text-base font-semibold text-[var(--foreground)]">Resumo financeiro periódico</h3>
              <p className="mt-0.5 text-sm leading-relaxed text-[var(--text-muted)]">
                Configuração da conta: gera um resumo semanal dentro do app. O histórico existente é preservado ao desativar.
              </p>
            </div>
          </div>

          <ActiveToggle
            isActive={user.periodicSummaryEnabled}
            onToggle={(value) => void handlePeriodicSummaryChange(value)}
            disabled={isSavingPeriodicSummary}
            label="Gerar resumo semanal"
            activeLabel={isSavingPeriodicSummary ? 'Salvando…' : 'Ativado'}
            inactiveLabel={isSavingPeriodicSummary ? 'Salvando…' : 'Desativado'}
          />
          <p className="mt-2 text-xs text-[var(--text-muted)]">
            Cadência atual: semanal, com período fechado de segunda a domingo.
            {user.periodicSummaryLastProcessedAt
              ? ` Último processamento: ${new Intl.DateTimeFormat('pt-BR', {
                  dateStyle: 'short',
                  timeStyle: 'short',
                }).format(new Date(user.periodicSummaryLastProcessedAt))}.`
              : ' Ainda não há processamento registrado.'}
          </p>
        </div>

        <div className="border-t border-[var(--border)] pt-5">
          <div className="mb-2 flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--surface-raised)] text-[var(--text-muted)]" aria-hidden="true">
              <FaPalette />
            </span>
            <div>
              <h3 className="text-base font-semibold text-[var(--foreground)]">Tema</h3>
              <p className="mt-0.5 text-sm leading-relaxed text-[var(--text-muted)]">
                Preferência deste navegador/dispositivo: não é sincronizada com sua conta.
              </p>
            </div>
          </div>

          <Select
            label="Aparência"
            value={theme}
            onChange={(value) => setTheme(value as 'light' | 'dark' | 'system')}
            options={[
              { value: 'dark', label: 'Escuro' },
              { value: 'light', label: 'Claro' },
              { value: 'system', label: 'Usar preferência do sistema' },
            ]}
          />
        </div>

        {feedback && (
          <p
            role={feedback.type === 'error' ? 'alert' : 'status'}
            aria-live="polite"
            className={`text-sm leading-relaxed ${
              feedback.type === 'error'
                ? 'text-[var(--expense)]'
                : 'text-[var(--text-muted)]'
            }`}
          >
            {feedback.message}
          </p>
        )}
      </div>
    </section>
  );
}
