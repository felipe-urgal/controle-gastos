import type { User } from '@/app/types/user';

export type SettingsSection = 'profile' | 'preferences' | 'security' | 'integrations' | 'data' | 'risk';

export const settingsSections: Array<{ id: SettingsSection; label: string; danger?: boolean }> = [
  { id: 'profile', label: 'Perfil' },
  { id: 'preferences', label: 'Preferências' },
  { id: 'security', label: 'Segurança' },
  { id: 'integrations', label: 'Integrações' },
  { id: 'data', label: 'Dados e sessão' },
  { id: 'risk', label: 'Zona de risco', danger: true },
];

export type AccountStatusItem = {
  key: 'twoFactor' | 'values' | 'weekly';
  label: string;
  value: string;
  /** `attention` pede ação do usuário; `neutral` é só informação. */
  tone: 'ok' | 'attention' | 'neutral';
  section: SettingsSection;
};

export function accountStatus(user: Pick<User, 'totpEnabled' | 'showValues' | 'periodicSummaryEnabled'>): AccountStatusItem[] {
  return [
    {
      key: 'twoFactor',
      label: 'Verificação em duas etapas',
      value: user.totpEnabled ? 'Ativada' : 'Desativada',
      tone: user.totpEnabled ? 'ok' : 'attention',
      section: 'security',
    },
    { key: 'values', label: 'Valores financeiros', value: user.showValues === false ? 'Ocultos' : 'Visíveis', tone: 'neutral', section: 'preferences' },
    { key: 'weekly', label: 'Resumo semanal', value: user.periodicSummaryEnabled ? 'Ativado' : 'Desativado', tone: 'neutral', section: 'preferences' },
  ];
}

/** Sugestão de segurança mostrada no topo: só quando o 2FA está desativado. */
export function securityTip(user: Pick<User, 'totpEnabled'>) {
  return user.totpEnabled
    ? null
    : { message: 'Proteja sua conta. Ative a verificação em duas etapas para exigir um código além da senha.', section: 'security' as const };
}

export function userInitial(name: string) {
  return name.trim().charAt(0).toUpperCase() || 'U';
}

export function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('pt-BR');
}
