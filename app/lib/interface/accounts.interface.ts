import { AccountModel } from '@/app/types/account';

export interface AccountFormProps {
  account?: AccountModel;
  isEditing: boolean;
};

export interface AccountInfoProps {
  account: AccountModel;
  isDeleting: boolean;
  typeLabels: Record<string, string>;
  onReconciliationChange?: () => Promise<void> | void;
};
