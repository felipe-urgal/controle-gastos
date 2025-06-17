"use client"

// hook
import { useRouter } from "next/navigation";

// types
import { AccountModel } from '@/app/types/account';

// utils
import { formatCurrency, AccountType } from "@/app/utils/format";

// icons
import { FaTrash, FaPencilAlt } from "react-icons/fa";

// components
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
      key: 'type',
      header: 'Tipo da Conta',
      content: (account: AccountModel) => {
        const typeText = AccountType.find(type => type.id === account.type)?.name || 'Unknown';
        return <span className="text-sm text-gray-400">{typeText}</span>;
      },
      className: 'hidden lg:table-cell',
    },
    {
      key: 'name',
      header: 'Nome',
      content: (account: AccountModel) => (
        <span className="text-sm font-medium text-gray-400">{account.name}</span>
      ),
    },
    {
      key: 'balance',
      header: 'Valor',
      content: (account: AccountModel) => {
        const amountColor = Number(account.balance) < 0
          ? "text-red-400"
          : Number(account.balance) === 0
            ? "text-gray-400"
            : "text-green-400";
        
        return (
          <span className={`font-semibold ${amountColor}`}>
            {formatCurrency(account.balance)}
          </span>
        );
      },
      className: 'text-right',
    },
  ];

  const renderItemActions = (account: AccountModel) => (
    <>
      <button
        onClick={(e) => {
          e.stopPropagation();
          router.push(`/contas/${account.id}`);
        }}
        className="cursor-pointer text-blue-500 hover:text-blue-700 p-2 rounded-full hover:bg-gray-700/50 transition-colors"
        aria-label="Editar conta"
      >
        <FaPencilAlt className="h-4 w-4" />
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(account.id);
        }}
        disabled={isDeleting}
        className="cursor-pointer text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-gray-700/50 transition-colors"
        aria-label="Excluir conta"
      >
        {isDeleting ? (
          <span className="animate-spin inline-block h-4 w-4">...</span>
        ) : (
          <FaTrash className="h-4 w-4" />
        )}
      </button>
    </>
  );

  const renderExpandedContent = (account: AccountModel) => {
    const typeText = AccountType.find(type => type.id === account.type)?.name || 'Unknown';
    return (
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center flex-col text-gray-400 text-xs">
          Tipo da Conta: 
          <span className="bg-gray-700/50 p-1 text-xs rounded-md text-gray-400">{typeText}</span>
        </div>
      </div>
    );
  };

  return (
    <GenericList
      items={accounts}
      columns={columns}
      renderItemActions={renderItemActions}
      emptyMessage="Nenhuma conta encontrada"
      expandable={true}
      renderExpandedContent={renderExpandedContent}
    />
  );
};

export default AccountList
