export interface User {
  id: string;
  name: string;
  email: string;
  emailVerifiedAt?: string | null;
  pendingEmail?: string | null;
  pendingEmailRequestedAt?: string | null;
  pendingEmailExpiresAt?: string | null;
  showValues: boolean;
  periodicSummaryEnabled: boolean;
  periodicSummaryFrequency: 'WEEKLY';
  periodicSummaryLastProcessedAt?: string | null;
  totpEnabled: boolean;
  createdAt: string;
  updatedAt: string;
};
