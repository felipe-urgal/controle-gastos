'use client';

import { useState } from 'react';
import { FaEye, FaPalette } from 'react-icons/fa';

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

  return (
    <section
      className="ds-panel overflow-hidden"
      aria-labelledby="profile-preferences-title"
      aria-busy={isSavingVisibility || undefined}
    >
      <div className="border-b border-[var(--border)] px-4 py-4 sm:px-5">
        <h2 id="profile-preferences-title" className="text-xl font-semibold text-[var(--foreground)]">
          Preferências
        </h2>
        <p className="mt-1 text-base leading-relaxed text-[var(--text-muted)]">
          Ajuste como informações financeiras e a aparência são apresentadas neste dispositivo.
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
                Controle se saldos e valores ficam visíveis nas telas financeiras.
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
              <FaPalette />
            </span>
            <div>
              <h3 className="text-base font-semibold text-[var(--foreground)]">Tema</h3>
              <p className="mt-0.5 text-sm leading-relaxed text-[var(--text-muted)]">
                Esta preferência fica neste navegador e não altera seus dados financeiros.
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
