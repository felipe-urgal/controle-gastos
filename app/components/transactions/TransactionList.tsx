"use client"

import React from "react";

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
  FaFolder, 
  FaDollarSign 
} from "react-icons/fa";

// Toast
import { toast } from "react-toastify";

// Utils
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/app/utils/format";

type TransactionListProps = {
  transactions: TransactionModel[];
  onDelete: (id: string) => Promise<void> | void;
};

const TransactionList = ({ transactions, onDelete }: TransactionListProps) => {
  const router = useRouter();

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
          {formatCurrency(transaction.amount)}
        </span>
      ),
      className: "hidden lg:table-cell",
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
          className="cursor-pointer p-2 rounded-lg bg-white border border-gray-200 hover:bg-blue-50 text-blue-500 hover:text-blue-600 transition-all duration-200 shadow-sm"
          aria-label="Editar transação"
        >
          <FaPencilAlt className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={handleDelete}
          className="cursor-pointer p-2 rounded-lg bg-white border border-gray-200 hover:bg-rose-50 text-rose-500 hover:text-rose-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          aria-label="Excluir transação"
        >
          <FaTrash className="h-3.5 w-3.5" />
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-1 px-6 pb-3">
        <div className="flex flex-col">
          <div className="flex items-center text-gray-800 mb-1">
            <FaCalendar />
            <span className="text-xs font-medium">Data</span>
          </div>
          <div className="flex items-start gap-1">
            <span className="text-sm font-medium text-gray-800">{formattedDate}</span>
            <span className="inline-block text-xs font-semibold text-gray-700 bg-gray-200 px-3 py-1 rounded-full shadow-sm">
              {dayOfWeek}
            </span>
          </div>
        </div>

        {/* Categoria com ícone e cor temática */}
        {transaction.category?.name && (
          <div className="flex flex-col">
            <div className="flex items-center text-gray-800 mb-1">
              <FaTag />
              <span className="text-xs font-medium">Categoria</span>
            </div>
            <span className="inline-flex items-center bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-full text-sm font-medium truncate max-w-max">
              <FaFolder />
              <span className="truncate">{transaction.category.name}</span>
            </span>
          </div>
        )}


        {/* Conta com ícone */}
        {transaction.account?.name && (
          <div className="flex flex-col">
            <div className="flex items-center text-gray-800 mb-1">
              <FaCreditCard />
              <span className="text-xs font-medium">Conta</span>
            </div>
            <span className="inline-flex items-center bg-gray-100 text-gray-700 px-3 py-1.5 rounded-full text-sm font-medium max-w-max truncate">
              <FaMoneyBillWave />
              <span className="truncate">{transaction.account.name}</span>
            </span>
          </div>
        )}

        {/* Valor da transação - NOVO CAMPO ADICIONADO */}
        <div className="flex flex-col">
          <div className="flex items-center text-gray-800 mb-1">
            <FaDollarSign />
            <span className="text-xs font-medium">Valor</span>
          </div>
          <span className="inline-flex items-center bg-gray-100 text-gray-700 px-3 py-1.5 rounded-full text-sm font-medium max-w-max truncate">
            <FaMoneyBillWave />
            <span
              className={`truncate font-semibold text-sm ${
                transaction.type === "INCOME" ? "text-emerald-800" : "text-rose-800"
              }`}
            >
              {formatCurrency(transaction.amount)}
            </span>
          </span>
        </div>
      </div>
    );
  };

  return (
    <GenericList<TransactionModel>
      items={transactions}
      columns={columns}
      renderItemActions={renderItemActions}
      expandable
      renderExpandedContent={renderExpandedContent}
    />
  );
};

export default TransactionList;