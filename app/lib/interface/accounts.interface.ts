import { AccountModel } from '@/app/types/account';

export interface AccountFormProps {
  account?: AccountModel;
  isEditing: boolean;
};

export interface AccountCardProps {
  account: AccountModel;
  viewMode: "grid" | "list";
  searchTerm?: string;
};

export interface ViewProps {
  account: AccountModel;
  searchTerm?: string;
};

export interface AccountInfoProps {
  account: AccountModel;
  isDeleting: boolean;
  typeLabels: Record<string, string>;
};
