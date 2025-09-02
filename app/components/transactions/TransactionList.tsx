"use client"

import React, { useState } from "react";

// components
import { GenericList } from "@/app/components";

// types
import { TransactionModel } from "@/app/types/transaction";

// Icons
import { 
  FaTrash, 
  FaPencilAlt,
  FaCalendar, 
  FaTag, 
  FaCreditCard, 
  FaMoneyBillWave, 
  FaFolder
} from "react-icons/fa";

// Toast
import { toast } from "react-toastify";

// Utils
import { useRouter } from "next/navigation";
import { useAuth } from '@/app/context/AuthContext';
import { formatCurrency } from "@/app/utils/format";

type TransactionListProps = {
  transactions: TransactionModel[];
  onDelete: (id: string) => Promise<void> | void;
  onDeleteBatch: (ids: string[]) => void; // Agora é obrigatório
  isDeleting?: boolean;
};

const TransactionList = ({ transactions, onDelete, onDeleteBatch, isDeleting = false }: TransactionListProps) => {
  const router = useRouter();
  const { user } = useAuth();
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  // Colunas
  const columns = [
    {
      key: "transactionDate",
      header: "Data",
      content: (transaction: TransactionModel) => {
        if (!transaction.transactionDate) return "";
        const date = new Date(transaction.transactionDate);
        const dia = date.getDate().toString().padStart(2, "0");
        const mes = (date.getMonth() + 1).toString().padStart(2, "0");
        
        return (
          <div className="hidden lg:flex flex-col">
            <span className="text-gray-900 text-sm font-medium">{`${dia}/${mes}`}</span>
            <span className="text-gray-900 text-xs">{date.getFullYear()}</span>
          </div>
        );
      },
      className: "hidden lg:table-cell",
    },
    {
      key: "description",
      header: "Descrição",
      content: (transaction: TransactionModel) => transaction.description,
    },
    {
      key: "category",
      header: "Categoria",
      content: (transaction: TransactionModel) => transaction.category?.name ? transaction.category.name: null,
      className: "hidden lg:table-cell",
    },
    {
      key: "amount",
      header: "Valor",
      content: (transaction: TransactionModel) => (
        <span
          className={`font-semibold text-sm ${
            transaction.type === "INCOME" ? "text-green-800" : "text-red-800"
          }`}
        >
          {user?.showValues ? formatCurrency(transaction.amount) : "******"}
        </span>
      ),
      // className: "hidden lg:table-cell",
    },
  ];

  // Actions
  const renderItemActions = (transaction: TransactionModel) => {
    const handleEditar = (e: React.MouseEvent) => {
      e.stopPropagation();
      router.push(`/transacoes/${transaction.id}`);
    };
    const handleDelete = async (e: React.MouseEvent) => {
      e.stopPropagation();
      try {
        await onDelete(transaction.id);
      } catch (error) {
        toast.error("Erro ao excluir transação");
        console.error("Erro ao excluir transação:", error);
      }
    };
    return (
      <div className="flex items-center space-x-1">
        <button
          onClick={handleEditar}
          className="cursor-pointer p-1.5 sm:p-2 rounded-lg bg-white border border-gray-200 hover:bg-blue-50 text-blue-500 hover:text-blue-600 transition-all duration-200 shadow-sm"
          aria-label="Editar transação"
        >
          <FaPencilAlt className="h-3 w-3" />
        </button>
        <button
          onClick={handleDelete}
          className="cursor-pointer p-1.5 sm:p-2 rounded-lg bg-white border border-gray-200 hover:bg-rose-50 text-rose-500 hover:text-rose-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          aria-label="Excluir transação"
        >
          <FaTrash className="h-3 w-3" />
        </button>
      </div>
    );
  };

  const renderExpandedContent = (transaction: TransactionModel) => {
    if (!transaction) return null;
    
    const date = new Date(transaction.transactionDate!);
    const formattedDate = date.toLocaleDateString('pt-BR');
    const dayOfWeek = date.toLocaleDateString('pt-BR', { weekday: 'short' });
    
    return (
      <div className="px-5 pb-5">
        <div className="grid grid-cols-2 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {/* Data */}
          <div className="flex flex-col min-w-0">
            <div className="flex items-center text-gray-600 mb-1">
              <FaCalendar className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" />
              <span className="text-xs font-medium">Data</span>
            </div>
            <div className="flex xs:flex-row xs:items-center gap-1.5">
              <span className="text-sm font-medium text-gray-800 truncate">{formattedDate}</span>
              <span className="text-xs font-semibold text-gray-600 bg-gray-200 px-2 py-1 rounded-full shadow-sm inline-flex justify-center xs:inline">
                {dayOfWeek}
              </span>
            </div>
          </div>

          {/* Categoria */}
          {transaction.category?.name && (
            <div className="flex flex-col min-w-0">
              <div className="flex items-center text-gray-600 mb-1">
                <FaTag className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" />
                <span className="text-xs font-medium">Categoria</span>
              </div>
              <span className="inline-flex items-center bg-indigo-50 text-indigo-700 px-2.5 py-1.5 rounded-full text-sm font-medium max-w-full truncate">
                <FaFolder className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" />
                <span className="truncate">{transaction.category.name}</span>
              </span>
            </div>
          )}

          {/* Conta */}
          {transaction.account?.name && (
            <div className="flex flex-col min-w-0">
              <div className="flex items-center text-gray-600 mb-1">
                <FaCreditCard className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" />
                <span className="text-xs font-medium">Conta</span>
              </div>
              <span className="inline-flex items-center bg-gray-100 text-gray-700 px-2.5 py-1.5 rounded-full text-sm font-medium max-w-full truncate">
                <FaMoneyBillWave className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" />
                <span className="truncate">{transaction.account.name}</span>
              </span>
            </div>
          )}

          {/* Tipo de Transação */}
          <div className="flex flex-col min-w-0">
            <div className="flex items-center text-gray-600 mb-1">
              <FaCreditCard className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" />
              <span className="text-xs font-medium">Tipo</span>
            </div>
            <span className={`inline-flex items-center px-2.5 py-1.5 rounded-full text-sm font-medium max-w-full ${
              transaction.type === "INCOME" 
                ? "bg-emerald-100 text-emerald-800" 
                : "bg-rose-100 text-rose-800"
            }`}>
              {transaction.type === "INCOME" ? "Receita" : "Despesa"}
            </span>
          </div>
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
    if (selectedItems.size === transactions.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(transactions.map(cat => cat.id)));
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
    <GenericList<TransactionModel>
      items={transactions}
      columns={columns}
      renderItemActions={renderItemActions}
      expandable
      renderExpandedContent={renderExpandedContent}
      selectable={true}
      selectedItems={selectedItems}
      onSelectItem={handleSelectItem}
      onSelectAll={handleSelectAll}
      batchActions={batchActions}
    />
  );
};

export default TransactionList;