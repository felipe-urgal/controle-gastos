'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { FaBell, FaChartLine, FaChartPie, FaCreditCard, FaFileInvoiceDollar, FaMoneyBillWave } from 'react-icons/fa';

import {
  NOTIFICATION_TYPE_COPY,
  PREFERENCE_TYPES,
} from '@/app/components/pages/notification/notification-model';
import { SettingsPanel, SettingsRow } from '@/app/components/pages/user/show/settings-row';
import { ActiveToggle } from '@/app/components/ui';
import { errorMessage } from '@/app/lib/error-message';
import { notificationService } from '@/app/services/notification-service';
import type { NotificationPreferenceDTO, NotificationType } from '@/app/types/notification';

const ICONS: Partial<Record<NotificationType, ReactNode>> = {
  CARD_STATEMENT_DUE: <FaCreditCard />,
  COMMITMENT_DUE: <FaFileInvoiceDollar />,
  INCOME_OVERDUE: <FaMoneyBillWave />,
  BUDGET_LIMIT: <FaChartPie />,
  FORECAST_NEGATIVE: <FaChartLine />,
};

type Feedback = { type: 'success' | 'error'; message: string };

/** Quais avisos aparecem na central. E-mail e push chegam em seguida e não têm controle aqui ainda. */
export default function NotificationPreferences() {
  const [preferences, setPreferences] = useState<NotificationPreferenceDTO[] | null>(null);
  const [loadError, setLoadError] = useState('');
  const [savingType, setSavingType] = useState<NotificationType | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  useEffect(() => {
    let active = true;
    notificationService
      .getPreferences()
      .then((response) => {
        if (active) setPreferences(response.data.preferences);
      })
      .catch((caught) => {
        if (active) setLoadError(errorMessage(caught, 'Não foi possível carregar as preferências de avisos.'));
      });
    return () => {
      active = false;
    };
  }, []);

  async function change(current: NotificationPreferenceDTO, inApp: boolean) {
    if (savingType) return;
    setSavingType(current.type);
    setFeedback(null);
    // Mostra a escolha já; se o servidor recusar, volta ao valor anterior.
    setPreferences((list) => list?.map((item) => (item.type === current.type ? { ...item, inApp } : item)) ?? list);
    try {
      const response = await notificationService.savePreferences([
        { type: current.type, inApp, email: current.email, push: current.push },
      ]);
      setPreferences(response.data.preferences);
      setFeedback({ type: 'success', message: 'Preferência de avisos atualizada.' });
    } catch (caught) {
      setPreferences((list) => list?.map((item) => (item.type === current.type ? current : item)) ?? list);
      setFeedback({ type: 'error', message: errorMessage(caught, 'Não foi possível salvar a preferência de avisos.') });
    } finally {
      setSavingType(null);
    }
  }

  const rows = PREFERENCE_TYPES.flatMap((type) => {
    const preference = preferences?.find((item) => item.type === type);
    const copy = NOTIFICATION_TYPE_COPY[type];
    return preference && copy ? [{ preference, copy }] : [];
  });

  return (
    <SettingsPanel
      id="notification-preferences-title"
      title="Avisos"
      description="O que o app avisa na central de avisos, por volta das 8h. Valores só aparecem no texto se a exibição de valores estiver ligada."
      busy={savingType !== null}
    >
      {loadError ? (
        <p role="alert" className="px-4 py-4 text-sm text-[var(--expense)] sm:px-5">{loadError}</p>
      ) : preferences === null ? (
        <div className="space-y-3 px-4 py-4 sm:px-5" role="status" aria-label="Carregando preferências de avisos">
          {[0, 1, 2].map((index) => (
            <div key={index} className="h-12 animate-pulse rounded-[var(--radius-md)] bg-[var(--skeleton)]" />
          ))}
        </div>
      ) : (
        rows.map(({ preference, copy }) => (
          <SettingsRow
            key={preference.type}
            icon={ICONS[preference.type] ?? <FaBell />}
            title={copy.title}
            description={copy.description}
            inlineControl
            control={
              <ActiveToggle
                appearance="switch"
                isActive={preference.inApp}
                onToggle={(value) => void change(preference, value)}
                disabled={savingType !== null}
                label={`Avisar: ${copy.title}`}
                activeLabel={savingType === preference.type ? 'Salvando…' : 'Ativado'}
                inactiveLabel={savingType === preference.type ? 'Salvando…' : 'Desativado'}
              />
            }
          />
        ))
      )}
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
