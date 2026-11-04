'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { FaBell, FaChartLine, FaChartPie, FaCreditCard, FaFileInvoiceDollar, FaMobileAlt, FaMoneyBillWave } from 'react-icons/fa';

import {
  NOTIFICATION_TYPE_COPY,
  PREFERENCE_TYPES,
} from '@/app/components/pages/notification/notification-model';
import { SettingsPanel, SettingsRow } from '@/app/components/pages/user/show/settings-row';
import { ActiveToggle, Button } from '@/app/components/ui';
import { errorMessage } from '@/app/lib/error-message';
import {
  derivePushStatus,
  readPushState,
  subscribeThisDevice,
  unsubscribeThisDevice,
  type PushStatus,
} from '@/app/lib/pwa/push-subscription';
import { notificationService } from '@/app/services/notification-service';
import { pushService } from '@/app/services/push-service';
import type { NotificationPreferenceDTO, NotificationType } from '@/app/types/notification';

const ICONS: Partial<Record<NotificationType, ReactNode>> = {
  CARD_STATEMENT_DUE: <FaCreditCard />,
  COMMITMENT_DUE: <FaFileInvoiceDollar />,
  INCOME_OVERDUE: <FaMoneyBillWave />,
  BUDGET_LIMIT: <FaChartPie />,
  FORECAST_NEGATIVE: <FaChartLine />,
};

type Channel = 'inApp' | 'email' | 'push';
type Feedback = { type: 'success' | 'error'; message: string };
type PushConfig = { configured: boolean; publicKey: string | null };

const PUSH_STATUS_TEXT: Record<PushStatus, string> = {
  unsupported:
    'Este navegador não permite notificações push. No iPhone, instale o app na tela inicial para ativá-las.',
  unconfigured: 'As notificações push ainda não estão ativas neste servidor.',
  denied: 'A permissão de notificações está bloqueada. Libere nas configurações do navegador para ativar.',
  off: 'Desativadas neste aparelho. Ative para receber os avisos como notificação.',
  on: 'Ativadas neste aparelho.',
};

function ChannelSwitch({
  caption,
  label,
  isActive,
  disabled,
  saving,
  onToggle,
}: {
  caption: string;
  label: string;
  isActive: boolean;
  disabled: boolean;
  saving: boolean;
  onToggle: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-[var(--text-muted)]" aria-hidden="true">{caption}</span>
      <ActiveToggle
        appearance="switch"
        isActive={isActive}
        onToggle={onToggle}
        disabled={disabled}
        label={label}
        activeLabel={saving ? 'Salvando…' : 'Ativado'}
        inactiveLabel={saving ? 'Salvando…' : 'Desativado'}
      />
    </div>
  );
}

/** Onde cada aviso chega: na central, por e-mail (resumo diário) e por push neste e em outros aparelhos. */
export default function NotificationPreferences() {
  const [preferences, setPreferences] = useState<NotificationPreferenceDTO[] | null>(null);
  const [loadError, setLoadError] = useState('');
  const [savingType, setSavingType] = useState<NotificationType | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [pushConfig, setPushConfig] = useState<PushConfig | null>(null);
  const [pushStatus, setPushStatus] = useState<PushStatus>('unconfigured');
  const [pushBusy, setPushBusy] = useState(false);

  const refreshPushStatus = useCallback(async (config: PushConfig) => {
    const state = await readPushState();
    setPushStatus(
      derivePushStatus({
        supported: state.supported,
        configured: config.configured,
        permission: state.permission,
        subscribed: state.subscription !== null,
      }),
    );
  }, []);

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

    pushService
      .getConfig()
      .then(async ({ data }) => {
        if (!active) return;
        setPushConfig(data);
        await refreshPushStatus(data);
      })
      .catch(() => {
        // Sem a configuração de push, só o controle deste aparelho some; a central e o e-mail seguem.
      });

    return () => {
      active = false;
    };
  }, [refreshPushStatus]);

  async function change(current: NotificationPreferenceDTO, channel: Channel, value: boolean) {
    if (savingType) return;
    const next = { type: current.type, inApp: current.inApp, email: current.email, push: current.push, [channel]: value };
    setSavingType(current.type);
    setFeedback(null);
    // Mostra a escolha já; se o servidor recusar, volta ao valor anterior.
    setPreferences((list) => list?.map((item) => (item.type === current.type ? { ...item, ...next } : item)) ?? list);
    try {
      const response = await notificationService.savePreferences([next]);
      setPreferences(response.data.preferences);
      setFeedback({ type: 'success', message: 'Preferência de avisos atualizada.' });
    } catch (caught) {
      setPreferences((list) => list?.map((item) => (item.type === current.type ? current : item)) ?? list);
      setFeedback({ type: 'error', message: errorMessage(caught, 'Não foi possível salvar a preferência de avisos.') });
    } finally {
      setSavingType(null);
    }
  }

  async function togglePushDevice() {
    if (pushBusy || !pushConfig?.publicKey) return;
    setPushBusy(true);
    setFeedback(null);
    try {
      if (pushStatus === 'on') {
        const endpoint = await unsubscribeThisDevice();
        if (endpoint) await pushService.unsubscribe(endpoint);
        setFeedback({ type: 'success', message: 'Notificações desativadas neste aparelho.' });
      } else {
        const subscription = await subscribeThisDevice(pushConfig.publicKey);
        await pushService.subscribe(subscription.toJSON());
        setFeedback({ type: 'success', message: 'Notificações ativadas neste aparelho.' });
      }
    } catch (caught) {
      setFeedback({ type: 'error', message: errorMessage(caught, 'Não foi possível alterar as notificações deste aparelho.') });
    } finally {
      await refreshPushStatus(pushConfig);
      setPushBusy(false);
    }
  }

  const rows = PREFERENCE_TYPES.flatMap((type) => {
    const preference = preferences?.find((item) => item.type === type);
    const copy = NOTIFICATION_TYPE_COPY[type];
    return preference && copy ? [{ preference, copy }] : [];
  });
  const pushAvailable = pushConfig?.configured === true;
  const canTogglePush = pushStatus === 'on' || pushStatus === 'off';

  return (
    <SettingsPanel
      id="notification-preferences-title"
      title="Avisos"
      description="Onde cada aviso chega: na central do app, por e-mail (um resumo por dia) e como notificação. Os avisos saem por volta das 8h; valores só aparecem no texto se a exibição de valores estiver ligada."
      busy={savingType !== null || pushBusy}
    >
      {pushAvailable && (
        <SettingsRow
          icon={<FaMobileAlt />}
          title="Notificações neste aparelho"
          description={PUSH_STATUS_TEXT[pushStatus]}
          control={
            canTogglePush ? (
              <Button
                variant={pushStatus === 'on' ? 'outline' : 'primary'}
                size="sm"
                onClick={() => void togglePushDevice()}
                disabled={pushBusy}
              >
                {pushBusy ? 'Aguarde…' : pushStatus === 'on' ? 'Desativar' : 'Ativar neste aparelho'}
              </Button>
            ) : undefined
          }
        />
      )}
      {loadError ? (
        <p role="alert" className="px-4 py-4 text-sm text-[var(--expense)] sm:px-5">{loadError}</p>
      ) : preferences === null ? (
        <div className="space-y-3 px-4 py-4 sm:px-5" role="status" aria-label="Carregando preferências de avisos">
          {[0, 1, 2].map((index) => (
            <div key={index} className="h-12 animate-pulse rounded-[var(--radius-md)] bg-[var(--skeleton)]" />
          ))}
        </div>
      ) : (
        rows.map(({ preference, copy }) => {
          const saving = savingType === preference.type;
          return (
            <SettingsRow
              key={preference.type}
              icon={ICONS[preference.type] ?? <FaBell />}
              title={copy.title}
              description={copy.description}
              control={
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
                  <ChannelSwitch
                    caption="No app"
                    label={`${copy.title}: avisar no app`}
                    isActive={preference.inApp}
                    disabled={savingType !== null}
                    saving={saving}
                    onToggle={(value) => void change(preference, 'inApp', value)}
                  />
                  <ChannelSwitch
                    caption="E-mail"
                    label={`${copy.title}: avisar por e-mail`}
                    isActive={preference.email}
                    disabled={savingType !== null}
                    saving={saving}
                    onToggle={(value) => void change(preference, 'email', value)}
                  />
                  {pushAvailable && (
                    <ChannelSwitch
                      caption="Push"
                      label={`${copy.title}: avisar por notificação push`}
                      isActive={preference.push}
                      disabled={savingType !== null}
                      saving={saving}
                      onToggle={(value) => void change(preference, 'push', value)}
                    />
                  )}
                </div>
              }
            />
          );
        })
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
