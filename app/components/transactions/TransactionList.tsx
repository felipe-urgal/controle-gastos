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
  income: string;
  expenses: string;
};

const TransactionList = ({ transactions, onDelete, income, expenses }: TransactionListProps) => {
  const router = useRouter();

  // Header/Footer summaries
  const headerSummary = [
    {
      content: (
        <span className=" font-semibold text-green-400 text-xs lg:text-sm">
          Renda: {formatCurrency(income)}
        </span>
      ),
      className: "",
      colSpan: 1,
    },
    { content: "", className: "", colSpan: 1 },
    { content: "", className: "hidden lg:table-cell", colSpan: 1 },
    {
      content: (
        <span className=" font-semibold text-red-400 text-xs lg:text-sm">
          Despesa: {formatCurrency(expenses)}
        </span>
      ),
      className: "",
      colSpan: 1,
    },
    { content: "", className: "hidden lg:table-cell", colSpan: 1 },
    { content: "", className: "hidden lg:table-cell text-right text-blue-400 text-xs lg:text-sm", colSpan: 1 },
  ];
  const footerSummary = headerSummary;

  // Colunas
  const columns = [
    {
      key: "transactionDate",
      header: <span className="hidden lg:table-cell">Data</span>,
      content: (transaction: TransactionModel) => {
        if (!transaction.transactionDate) return "";
        const date = new Date(transaction.transactionDate);
        const dia = date.getDate().toString().padStart(2, "0");
        const mes = (date.getMonth() + 1).toString().padStart(2, "0");
        const ano = date.getFullYear();
        return <span className="hidden lg:table-cell text-gray-400 text-xs lg:text-sm">{`${dia}/${mes}/${ano}`}</span>;
      },
      className: "hidden lg:table-cell",
    },
    {
      key: "description",
      header: "Descrição",
      content: (transaction: TransactionModel) => (
        <span className="text-xs lg:text-sm font-medium text-gray-400">{transaction.description}</span>
      ),
    },
    {
      key: "category",
      header: <span className="hidden lg:table-cell">Categoria</span>,
      content: (transaction: TransactionModel) =>
        transaction.category?.name ? (
          <span className="bg-gray-700/50 px-2 py-2 rounded-md text-xs text-gray-400 hidden lg:inline-block">
            {transaction.category.name}
          </span>
        ) : null,
      className: "hidden lg:table-cell",
    },
    {
      key: "account",
      header: <span className="hidden lg:table-cell">Conta</span>,
      content: (transaction: TransactionModel) =>
        transaction.account?.name ? (
          <span className="bg-gray-700/50 px-2 py-2 rounded-md text-xs text-gray-400 hidden lg:inline-block">
            {transaction.account.name}
          </span>
        ) : null,
      className: "hidden lg:table-cell",
    },
    {
      key: "amount",
      header: "Valor",
      content: (transaction: TransactionModel) => (
        <span
          className={`text-right font-semibold text-xs lg:text-sm ${
            transaction.type === "INCOME" ? "text-green-400" : "text-red-400"
          }`}
        >
          {formatCurrency(transaction.amount)}
        </span>
      ),
      className: "px-4 py-3 text-right",
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
      <>
        <button
          onClick={handleEditar}
          className="cursor-pointer text-blue-500 hover:text-blue-700 p-3 rounded-full hover:bg-gray-700/50 transition-colors"
          aria-label="Editar transação"
        >
          <FaPencilAlt className="h-3 w-3" />
        </button>
        <button
          onClick={handleDelete}
          className="cursor-pointer text-red-500 hover:text-red-700 p-3 rounded-full hover:bg-gray-700/50 transition-colors"
          aria-label="Excluir transação"
        >
          <FaTrash className="h-3 w-3" />
        </button>
      </>
    );
  };

  // Conteúdo expandido para mobile
  const renderExpandedContent = (transaction: TransactionModel) => {
    if (!transaction) return null;
    const date = new Date(transaction.transactionDate!);
    const dia = date.getDate().toString().padStart(2, "0");
    const mes = (date.getMonth() + 1).toString().padStart(2, "0");
    const ano = date.getFullYear();
    return (
      <div className="flex flex-wrap items-center gap-3">
        {/* Date */}
        <div className="flex items-center flex-col text-gray-400 text-xs">
          Data transação: 
          <span className="bg-gray-700/50 p-1 text-xs rounded-md text-gray-400">{`${dia}/${mes}/${ano}`}</span>
        </div>

        {transaction.category?.name && (
          <div className="flex items-center flex-col text-gray-400 text-xs">
            Categoria: 
            <span className="bg-gray-700/50 p-1 text-xs rounded-md text-gray-400">{transaction.category.name}</span>
          </div>
        )}

        {transaction.account?.name && (
          <div className="flex items-center flex-col text-gray-400 text-xs">
            Conta: 
            <span className="bg-gray-700/50 p-1 text-xs rounded-md text-gray-400">{transaction.account.name}</span>
          </div>
        )}
          
      </div>
    );
  };

  return (
    <GenericList<TransactionModel>
      items={transactions}
      columns={columns}
      renderItemActions={renderItemActions}
      emptyMessage="Nenhuma transação encontrada"
      headerSummary={transactions.length > 0 ? headerSummary : undefined}
      footerSummary={transactions.length > 20 ? footerSummary : undefined}
      expandable
      renderExpandedContent={renderExpandedContent}
    />
  );
};

export default TransactionList;
