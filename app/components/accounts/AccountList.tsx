import { AccountItem } from "./AccountItem";
import { AccountModel } from '@/app/types/account'

type AccountListProps = {
  accounts: AccountModel[];
  onDelete: (id: string) => void; // Changed from Promise<void> to void
};

export const AccountList = ({ accounts, onDelete }: AccountListProps) => {
  return (
    <div className="flex-1 overflow-y-auto">
      <table className="w-full">
        <thead className="bg-gray-800">
          <tr>
            <th className="hidden lg:table-cell px-4 py-3 text-left text-gray-400 text-sm">Tipo da Conta</th>
            <th className="px-4 py-3 text-left text-gray-400 text-sm">Nome</th>
            <th className="px-4 py-3 text-right text-gray-400 text-sm">Valor</th>
            <th className="px-4 py-3 text-right text-gray-400 text-sm">Ação</th>
          </tr>
        </thead>
        <tbody>
          {accounts.length === 0 ? (
            <tr>
              <td colSpan={4} className="text-center text-gray-600 py-5">
                Nenhuma conta encontrada
              </td>
            </tr>
          ) : (
            accounts.map(account => (
              <AccountItem 
                key={account.id} 
                account={account} 
                onDelete={onDelete}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};