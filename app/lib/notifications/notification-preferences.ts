import type { NotificationType } from "@prisma/client";

import {
  NOTIFICATION_DEFAULTS,
  type NotificationChannels,
} from "@/app/lib/notifications/notification-model";

export type NotificationPreferenceRow = { type: NotificationType } & NotificationChannels;

/** Canais ligados para um tipo: a escolha gravada do usuário, ou o padrão do tipo. */
export function resolveChannels(
  type: NotificationType,
  rows: readonly NotificationPreferenceRow[],
): NotificationChannels {
  const row = rows.find((item) => item.type === type);
  if (!row) return NOTIFICATION_DEFAULTS[type];
  return { inApp: row.inApp, email: row.email, push: row.push };
}

/** O aviso só existe se algum canal estiver ligado para o tipo. */
export function isTypeEnabled(type: NotificationType, rows: readonly NotificationPreferenceRow[]) {
  const channels = resolveChannels(type, rows);
  return channels.inApp || channels.email || channels.push;
}
