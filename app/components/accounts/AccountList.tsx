import { AccountItem } from "./AccountItem";
import { AccountModel } from '@/app/types/account'

type AccountListProps = {
  accounts: AccountModel[];
  onDelete: (id: string) => Promise<void>;
};

export const AccountList = ({ accounts, onDelete }: AccountListProps) => {
   if (accounts.length === 0) {
    return (
      <div className="text-center text-gray-500 mt-7">
        Nenhuma conta encontrada
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <table className="w-full">
        <thead className="bg-gray-800 text-gray-400 text-sm hidden md:table-header-group">
          <tr>
            <th className="px-4 py-3 text-left">Tipo da Conta</th>
            <th className="px-4 py-3 text-left">Nome</th>
            <th className="px-4 py-3 text-right">Valor</th>
            <th className="px-4 py-3 text-right">Ação</th>
          </tr>
        </thead>
        <tbody>
          {accounts.map(account => (
            <AccountItem 
              key={account.id} 
              account={account} 
              onDelete={onDelete}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
};