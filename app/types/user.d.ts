export interface User {
  id: string;
  name: string;
  email: string;
  emailVerifiedAt?: string | null;
  showValues: boolean;
  periodicSummaryEnabled: boolean;
  periodicSummaryFrequency: 'WEEKLY';
  totpEnabled: boolean;
  createdAt: string;
  updatedAt: string;
};
