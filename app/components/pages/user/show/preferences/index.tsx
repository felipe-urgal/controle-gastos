'use client';

import { useState } from 'react';
import { FaClock, FaEye, FaPalette } from 'react-icons/fa';

import { SettingsPanel, SettingsRow } from '@/app/components/pages/user/show/settings-row';
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
    <SettingsPanel
      id="profile-preferences-title"
      title="Preferências"
      description="Preferências da conta acompanham seu login. A aparência é local a este navegador."
      busy={isSavingVisibility || isSavingPeriodicSummary}
    >
      <SettingsRow
        icon={<FaEye />}
        title="Exibir valores financeiros"
        description="Controla se saldos e valores ficam visíveis nas telas financeiras."
        inlineControl
        control={
          <ActiveToggle
            appearance="switch"
            isActive={user.showValues}
            onToggle={(value) => void handleShowValuesChange(value)}
            disabled={isSavingVisibility}
            label="Exibir valores"
            activeLabel={isSavingVisibility ? 'Salvando…' : 'Visíveis'}
            inactiveLabel={isSavingVisibility ? 'Salvando…' : 'Ocultos'}
          />
        }
      />
      <SettingsRow
        icon={<FaClock />}
        title="Resumo semanal"
        description={
          <>
            Gera um resumo dentro do app, de segunda a domingo. O histórico existente é preservado ao desativar.{' '}
            {user.periodicSummaryLastProcessedAt
              ? `Último processamento: ${new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(user.periodicSummaryLastProcessedAt))}.`
              : 'Ainda não há processamento registrado.'}
          </>
        }
        inlineControl
        control={
          <ActiveToggle
            appearance="switch"
            isActive={user.periodicSummaryEnabled}
            onToggle={(value) => void handlePeriodicSummaryChange(value)}
            disabled={isSavingPeriodicSummary}
            label="Gerar resumo semanal"
            activeLabel={isSavingPeriodicSummary ? 'Salvando…' : 'Ativado'}
            inactiveLabel={isSavingPeriodicSummary ? 'Salvando…' : 'Desativado'}
          />
        }
      />
      <SettingsRow
        icon={<FaPalette />}
        title="Tema"
        description="Preferência deste navegador: não é sincronizada com sua conta."
        control={
          <div className="min-w-[14rem]">
            <Select
              ariaLabel="Aparência"
              value={theme}
              onChange={(value) => setTheme(value as 'light' | 'dark' | 'system')}
              options={[
                { value: 'dark', label: 'Escuro' },
                { value: 'light', label: 'Claro' },
                { value: 'system', label: 'Usar preferência do sistema' },
              ]}
            />
          </div>
        }
      />
      <p
        role={feedback?.type === 'error' ? 'alert' : 'status'}
        aria-live="polite"
        className={`min-h-5 px-4 pb-4 text-sm sm:px-5 ${feedback?.type === 'error' ? 'text-[var(--expense)]' : 'text-[var(--text-muted)]'}`}
      >
        {feedback?.message}
      </p>
    </SettingsPanel>
  );
}
