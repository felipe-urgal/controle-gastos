export type NotificationType =
  | 'CARD_STATEMENT_DUE'
  | 'COMMITMENT_DUE'
  | 'INCOME_OVERDUE'
  | 'BUDGET_LIMIT'
  | 'FORECAST_NEGATIVE'
  | 'GOAL_DEADLINE'
  | 'SUMMARY';

export type NotificationSeverity = 'INFO' | 'WARNING' | 'URGENT';

export type NotificationDTO = {
  id: string;
  type: NotificationType;
  severity: NotificationSeverity;
  title: string;
  body: string;
  href: string;
  createdAt: string;
  readAt: string | null;
};

export type NotificationListData = {
  items: NotificationDTO[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  unreadCount: number;
};

export type NotificationPreferenceDTO = {
  type: NotificationType;
  inApp: boolean;
  email: boolean;
  push: boolean;
  /** `true` enquanto o usuário não escolheu: vale o padrão do tipo. */
  isDefault: boolean;
};
