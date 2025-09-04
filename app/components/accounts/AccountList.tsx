"use client"

import { AccountModel } from '@/app/types/account';
import { formatCurrency, AccountType } from "@/app/utils/format";
import { FaTrash, FaPencilAlt } from "react-icons/fa";
import { useAuth } from '@/app/context/AuthContext';
import { useState } from "react";
import { GenericList } from "@/app/components";

type AccountListProps = {
  accounts: AccountModel[];
  onDeleteBatch: (ids: string[]) => void; // Agora é obrigatório
  isDeleting?: boolean;
  onEdit: (account: AccountModel) => void;
};

const AccountList = ({ accounts, onDeleteBatch, isDeleting = false, onEdit }: AccountListProps) => {
  const { user } = useAuth();
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

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
          onEdit(account); // Chama a função para abrir o modal de edição
        }}
        className="cursor-pointer p-1.5 sm:p-2 rounded-lg bg-white border border-gray-200 hover:bg-blue-50 text-blue-500 hover:text-blue-600 transition-all duration-200 shadow-sm"
        aria-label="Editar conta"
      >
        <FaPencilAlt className="h-3 w-3" />
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
            {user?.showValues ? formatCurrency(account.balance) : "******"}
          </span>
        </div>
      </div>
    );
  };

  const handleSelectItem = (id: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedItems.size === accounts.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(accounts.map(cat => cat.id)));
    }
  };

  const handleDeleteBatch = () => {
    if (selectedItems.size > 0) {
      onDeleteBatch(Array.from(selectedItems));
    }
  };

  const batchActions = (
    <div className="flex items-center space-x-3">
      {/*<span className="text-sm font-medium text-blue-800">
        {selectedItems.size} selecionado{selectedItems.size !== 1 ? 's' : ''}
      </span>*/}
      
      <button
        onClick={handleDeleteBatch}
        disabled={isDeleting}
        className="flex items-center space-x-2 px-4 py-2.5 
                   bg-white/90 backdrop-blur-sm 
                   // border border-rose-200/60
                   text-rose-700 
                   rounded-xl 
                   hover:bg-rose-50/80 
                   hover:border-rose-300/70
                   hover:text-rose-800
                   hover:shadow-lg hover:shadow-rose-100/50
                   disabled:opacity-40 
                   disabled:cursor-not-allowed 
                   disabled:hover:bg-white/90
                   disabled:hover:border-rose-200/60
                   disabled:hover:text-rose-700
                   disabled:hover:shadow-none
                   transition-all duration-300 
                   group"
      >
        <div className="relative">
          <FaTrash className="h-3 w-3 transition-transform duration-300" />
          {isDeleting && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-rose-300 border-t-rose-600"></div>
            </div>
          )}
        </div>
        <span className="text-sm font-medium">Excluir</span>
        
        {/* Badge elegante com contador */}
        <span className="flex h-5 w-5 items-center justify-center rounded-full 
                        bg-rose-100/80 text-rose-700 text-xs font-semibold
                        group-hover:bg-rose-200/80 group-hover:text-rose-800
                        transition-colors duration-300">
          {selectedItems.size}
        </span>
      </button>
    </div>
  );

  return (
    <GenericList
      items={accounts}
      columns={columns}
      expandable={true}
      renderItemActions={renderItemActions}
      renderExpandedContent={renderExpandedContent}
      selectable={true}
      selectedItems={selectedItems}
      onSelectItem={handleSelectItem}
      onSelectAll={handleSelectAll}
      batchActions={batchActions}
    />
  );
};

export default AccountList;