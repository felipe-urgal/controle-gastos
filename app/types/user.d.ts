export interface User {
  id: string;
  name: string;
  email: string;
  emailVerifiedAt?: string | null;
  showValues: boolean;
  totpEnabled: boolean;
  createdAt: string;
  updatedAt: string;
};
