"use client"

import React from "react";

// components
import { GenericList } from "@/app/components";

// types
import { TransactionModel } from "@/app/types/transaction";

// Icons
import { FaTrash, FaPencilAlt } from "react-icons/fa";

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
      header: <span className="hidden lg:table-cell text-gray-600 text-sm font-medium">Data</span>,
      content: (transaction: TransactionModel) => {
        if (!transaction.transactionDate) return "";
        const date = new Date(transaction.transactionDate);
        const dia = date.getDate().toString().padStart(2, "0");
        const mes = (date.getMonth() + 1).toString().padStart(2, "0");
        
        return (
          <div className="hidden lg:flex flex-col">
            <span className="text-gray-800 text-sm font-medium">{`${dia}/${mes}`}</span>
            <span className="text-gray-400 text-xs">{date.getFullYear()}</span>
          </div>
        );
      },
      className: "hidden lg:table-cell",
    },
    {
      key: "description",
      header: <span className="text-gray-600 text-sm font-medium">Descrição</span>,
      content: (transaction: TransactionModel) => (
        <span className="text-sm font-medium text-gray-800">{transaction.description}</span>
      ),
    },
    {
      key: "category",
      header: <span className="hidden lg:table-cell text-gray-600 text-sm font-medium">Categoria</span>,
      content: (transaction: TransactionModel) =>
        transaction.category?.name ? (
          <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs font-medium hidden lg:inline-block">
            {transaction.category.name}
          </span>
        ) : null,
      className: "hidden lg:table-cell",
    },
    {
      key: "account",
      header: <span className="hidden lg:table-cell text-gray-600 text-sm font-medium">Conta</span>,
      content: (transaction: TransactionModel) =>
        transaction.account?.name ? (
          <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-medium hidden lg:inline-block">
            {transaction.account.name}
          </span>
        ) : null,
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 p-4 bg-gray-50/60 rounded-lg mt-2 border border-gray-100">
        {/* Data com dia da semana */}
        <div className="flex flex-col">
          <div className="flex items-center text-gray-500 mb-1">
            <CalendarIcon className="w-3 h-3 mr-1" />
            <span className="text-xs font-medium">Data</span>
          </div>
          <div className="flex items-center">
            <span className="text-sm font-medium text-gray-800">{formattedDate}</span>
            <span className="ml-2 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
              {dayOfWeek}
            </span>
          </div>
        </div>

        {/* Categoria com ícone e cor temática */}
        {transaction.category?.name && (
          <div className="flex flex-col">
            <div className="flex items-center text-gray-500 mb-1">
              <TagIcon className="w-3 h-3 mr-1" />
              <span className="text-xs font-medium">Categoria</span>
            </div>
            <span className="inline-flex items-center bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-full text-sm font-medium max-w-full truncate">
              <FolderIcon className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" />
              <span className="truncate">{transaction.category.name}</span>
            </span>
          </div>
        )}

        {/* Conta com ícone */}
        {transaction.account?.name && (
          <div className="flex flex-col">
            <div className="flex items-center text-gray-500 mb-1">
              <CreditCardIcon className="w-3 h-3 mr-1" />
              <span className="text-xs font-medium">Conta</span>
            </div>
            <span className="inline-flex items-center bg-gray-100 text-gray-700 px-3 py-1.5 rounded-full text-sm font-medium max-w-full truncate">
              <BanknotesIcon className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" />
              <span className="truncate">{transaction.account.name}</span>
            </span>
          </div>
        )}

        {/* Valor da transação - NOVO CAMPO ADICIONADO */}
        <div className="flex flex-col items-end justify-center">
          <div className="flex items-center text-gray-500 mb-1">
            <CurrencyDollarIcon className="w-3 h-3 mr-1" />
            <span className="text-xs font-medium">Valor</span>
          </div>
          <span
            className={`text-right font-semibold text-sm ${
              transaction.type === "INCOME" ? "text-emerald-600" : "text-rose-600"
            }`}
          >
            {formatCurrency(transaction.amount)}
          </span>
        </div>
      </div>
    );
  };

  // Ícones (adicionando o ícone de dinheiro)
  const CalendarIcon = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );

  const TagIcon = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
    </svg>
  );

  const CreditCardIcon = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  );

  const BanknotesIcon = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );

  const FolderIcon = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  );

  const CurrencyDollarIcon = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );

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