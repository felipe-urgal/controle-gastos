import { AccountItem } from "./AccountItem";

interface Account {
  id: string;
  name: string;
  type: string;
  balance: number;
  currency: string;
  userId: string;
}

type AccountListProps = {
  accounts: Account[];
  onDelete: (id: string) => Promise<void>;
  deletingId?: string | null;
};

export const AccountList = ({ 
  accounts, 
  onDelete,
  deletingId
}: AccountListProps) => {
  if (accounts.length === 0) {
    return (
      <div className="text-center text-gray-500 mt-7">
        Nenhuma conta encontrada
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100">
      {accounts.map((account) => (
        <AccountItem
          key={account.id}
          account={account}
          onDelete={onDelete}
          isDeleting={deletingId === account.id}
        />
      ))}
    </div>
  );
};