"use client"

import { useRouter } from "next/navigation";
import { AccountModel } from '@/app/types/account';
import { formatCurrency, AccountType } from "@/app/utils/format";
import { FaTrash, FaPencilAlt } from "react-icons/fa";
import { GenericList } from "@/app/components";

type AccountListProps = {
  accounts: AccountModel[];
  onDelete: (id: string) => void;
  isDeleting?: boolean;
};

const AccountList = ({ accounts, onDelete, isDeleting = false }: AccountListProps) => {
  const router = useRouter();

  const columns = [
    {
      key: 'name',
      header: 'Nome da Conta',
      content: (account: AccountModel) => account.name,
    },
  ];

  const renderItemActions = (account: AccountModel) => (
    <div className="flex items-center space-x-1">
      <button
        onClick={(e) => {
          e.stopPropagation();
          router.push(`/contas/${account.id}`);
        }}
        className="cursor-pointer p-2 rounded-lg bg-white border border-gray-200 hover:bg-blue-50 text-blue-500 hover:text-blue-600 transition-all duration-200 shadow-sm"
        aria-label="Editar conta"
      >
        <FaPencilAlt className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(account.id);
        }}
        disabled={isDeleting}
        className="cursor-pointer p-2 rounded-lg bg-white border border-gray-200 hover:bg-rose-50 text-rose-500 hover:text-rose-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        aria-label="Excluir conta"
      >
        {isDeleting ? (
          <div className="animate-spin inline-block h-3.5 w-3.5 border-2 border-t-transparent border-current rounded-full"></div>
        ) : (
          <FaTrash className="h-3.5 w-3.5" />
        )}
      </button>
    </div>
  );

  const renderExpandedContent = (account: AccountModel) => {
    const typeText = AccountType.find(type => type.id === account.type)?.name || 'Unknown';
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-1 px-6 pb-3">
        <div className="flex flex-col mb-1">
          <span className="text-xs text-gray-600 mb-1">Tipo:</span>
          <span className="text-sm text-gray-600">
            {typeText}
          </span>
        </div>
        <div className="flex flex-col mb-1">
          <span className="text-xs text-gray-600 mb-1">Saldo:</span>
          <span className={`text-sm ${Number(account.balance) < 0 ? 'text-rose-600' : Number(account.balance) === 0 ? 'text-gray-600' : 'text-emerald-600'}`}>
            {formatCurrency(account.balance)}
          </span>
        </div>
      </div>
    );
  };

  return (
    <GenericList
      items={accounts}
      columns={columns}
      renderItemActions={renderItemActions}
      expandable={true}
      renderExpandedContent={renderExpandedContent}
    />
  );
};

export default AccountList;