"use client"

import { useRouter } from "next/navigation";
import { AccountModel } from '@/app/types/account';
import { formatCurrency, AccountType } from "@/app/utils/format";
import { FaTrash, FaPencilAlt, FaChevronDown, FaChevronUp, FaPiggyBank, FaCreditCard, FaMoneyBill, FaUniversity } from "react-icons/fa";
import { GenericList } from "@/app/components";
import { useState } from "react";

type AccountListProps = {
  accounts: AccountModel[];
  onDelete: (id: string) => void;
  isDeleting?: boolean;
};

// Função para obter o ícone com base no tipo de conta
const getAccountIcon = (type: string) => {
  switch (type) {
    case 'CHECKING':
      return <FaUniversity className="h-5 w-5 text-blue-500" />;
    case 'SAVINGS':
      return <FaPiggyBank className="h-5 w-5 text-emerald-500" />;
    case 'CREDIT':
      return <FaCreditCard className="h-5 w-5 text-violet-500" />;
    case 'CASH':
      return <FaMoneyBill className="h-5 w-5 text-amber-500" />;
    default:
      return <FaUniversity className="h-5 w-5 text-gray-400" />;
  }
};

const AccountList = ({ accounts, onDelete, isDeleting = false }: AccountListProps) => {
  const router = useRouter();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const columns = [
    {
      key: 'name',
      header: <span className="text-gray-600 text-sm font-medium">Nome da Conta</span>,
      content: (account: AccountModel) => (
        <div className="flex items-center">
          {getAccountIcon(account.type)}
          <span className="ml-2 text-sm font-medium text-gray-800">{account.name}</span>
        </div>
      ),
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
      <button
        onClick={(e) => {
          e.stopPropagation();
          toggleExpand(account.id);
        }}
        className="cursor-pointer p-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-gray-500 hover:text-gray-600 transition-all duration-200 lg:hidden shadow-sm"
        aria-label={expandedItems.has(account.id) ? "Recolher detalhes" : "Expandir detalhes"}
      >
        {expandedItems.has(account.id) ? (
          <FaChevronUp className="h-3.5 w-3.5" />
        ) : (
          <FaChevronDown className="h-3.5 w-3.5" />
        )}
      </button>
    </div>
  );

  const renderExpandedContent = (account: AccountModel) => {
    const typeText = AccountType.find(type => type.id === account.type)?.name || 'Unknown';
    return (
      <div className="flex flex-col lg:flex-row lg:items-center gap-4 p-3 bg-gray-50 rounded-lg mt-2">
        <div className="flex items-center">
          <span className="text-xs text-gray-500 mr-2 font-medium">Tipo:</span>
          <span className="text-xs font-medium text-gray-700 bg-indigo-50 py-1 px-3 rounded-full flex items-center">
            {getAccountIcon(account.type)}
            <span className="ml-1">{typeText}</span>
          </span>
        </div>
        <div className="flex items-center lg:ml-auto">
          <span className="text-xs text-gray-500 mr-2 font-medium">Saldo:</span>
          <span className={`text-xs font-semibold ${Number(account.balance) < 0 ? 'text-rose-600' : Number(account.balance) === 0 ? 'text-gray-600' : 'text-emerald-600'}`}>
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
      expandedItems={expandedItems}
      onToggleExpand={toggleExpand}
      itemClassName="transition-colors duration-150 border-b border-gray-100 last:border-b-0"
      headerClassName="bg-gray-50 text-gray-800 text-sm font-medium"
    />
  );
};

export default AccountList;