"use client"

import { AccountModel } from '@/app/types/account';
import { formatCurrency, AccountType } from "@/app/utils/format";
import { useAuth } from '@/app/context/AuthContext';
import { useState } from "react";
import { GenericList } from "@/app/components";

type AccountListProps = {
  accounts: AccountModel[];
  onDeleteBatch: (ids: string[]) => void; // Agora é obrigatório
  isDeleting?: boolean;
  onEdit: (account: AccountModel) => void;
  isEditing?: boolean;
};

const AccountList = ({ accounts, onDeleteBatch, isDeleting = false, onEdit, isEditing = false  }: AccountListProps) => {
  const { user } = useAuth();
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  const columns = [
    {
      key: 'name',
      header: 'Nome da Conta',
      content: (account: AccountModel) => account.name,
    },
  ];

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

  const handleEditItem = (account: AccountModel) => {
    onEdit(account);
  };

  return (
    <GenericList
      items={accounts}
      columns={columns}
      expandable={true}
      selectable={true}
      selectedItems={selectedItems}
      onSelectItem={handleSelectItem}
      onSelectAll={handleSelectAll}
      batchActions={{
        visible: selectedItems.size > 0,
        onDelete: handleDeleteBatch,
        deleteLabel: "Excluir",
        isDeleting: isDeleting,
        selectedCount: selectedItems.size
      }}
      itemActions={{
        onEdit: handleEditItem,
        editLabel: "Editar",
        isEditing: isEditing,
        showDelete: false,
        onDelete: undefined
      }}
      renderExpandedContent={renderExpandedContent}
    />
  );
};

export default AccountList;