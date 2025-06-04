"use client";

// Hooks
import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// Context
import { useAuth } from "@/app/context/AuthContext";

// Services
import { transactionService } from "@/app/services/transactionService";
import { accountService } from "@/app/services/accountService";

// Toast
import { toast } from "react-toastify";

// Components
import ProtectedRoute from "@/app/components/ProtectedRoute";
import Breadcrumb from "@/app/components/Breadcrumb";
import { TransactionFilters } from "@/app/components/transactions/TransactionFilters";
import { TransactionList } from "@/app/components/transactions/TransactionList";
import Modal from "@/app/components/Modal";
import { Button } from "@/app/components/ui/Button";

// Icons
import { FaAngleDown } from "react-icons/fa6";

// Types
import { TransactionModel } from '@/app/types/transaction'
import { AccountModel } from '@/app/types/account'

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <TransactionsPage />
    </Suspense>
  );
}

function TransactionsPage() {
  const { user }         = useAuth();
  const router           = useRouter();
  const searchParams     = useSearchParams();
  const itemsPerLoad     = 5;
  const DEBOUNCE_DELAY   = 500;

  const [transactions, setTransactions]   = useState<TransactionModel[]>([]);
  const [transaction, setTransaction]     = useState<TransactionModel | null>(null);
  const [isLoading, setIsLoading]         = useState(true);
  const [openModal, setOpenModal]         = useState(false);
  const [searchTerm, setSearchTerm]       = useState(searchParams.get("search") || "");
  const [hasMore, setHasMore]             = useState(true);
  const [currentPage, setCurrentPage]     = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const [filters, setFilters] = useState({
    type: searchParams.get("type") || "",
  });

  const updateURLParams = useCallback(
    (params: { search?: string; type?: string; }) => {
      const query = new URLSearchParams();
      if (params.search) query.set("search", params.search);
      if (params.type) query.set("type", params.type);

      router.replace(`/transacoes?${query.toString()}`);
    },
    [router]
  );

  const fetchTransactions = useCallback(async (isInitialLoad = true, page = 1) => {
    if (!user) return;

    if (isInitialLoad) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }

    try {
      const { data } = await transactionService.getTransactions(user.id, {
        page,
        limit: itemsPerLoad,
        search: searchTerm,
        type: filters.type,
      });

      if (page === 1) {
        setTransactions(data.transactions || []);
      } else {
        setTransactions(prev => [...prev, ...(data.transactions || [])]);
      }

      setHasMore((data.transactions?.length || 0) >= itemsPerLoad);
      setCurrentPage(page);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [user, itemsPerLoad, searchTerm, filters.type]);

  useEffect(() => {
    if (searchTerm) {
      const timeoutId = setTimeout(() => fetchTransactions(true, 1), DEBOUNCE_DELAY);
      return () => clearTimeout(timeoutId);
    } else {
      fetchTransactions(true, 1);
    }
  }, [user, searchTerm, fetchTransactions]);

  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
    updateURLParams({ search: value, type: filters.type });
  }, [updateURLParams, filters.type]);

  const handleFilterChange = (name: "type", value: string) => {
    const newFilters = { ...filters, [name]: value };
    setFilters(newFilters);
    updateURLParams({ search: searchTerm, type: newFilters.type });
  };

  const handleClearFilters = () => {
    setFilters({ type: "" });
    setSearchTerm("");
    fetchTransactions(true, 1);
    router.replace(`/transacoes`);
  };

  const handleLoadMore = () => {
    fetchTransactions(false, currentPage + 1);
  };

  const handleDeleteClick = async (transaction: TransactionModel) => {
    setTransaction(transaction);
    setOpenModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!transaction) return;

    setOpenModal(false);
    setIsLoading(true);
    
    try {
      const account = await accountService.getAccountById(transaction.accountId as AccountModel);

      let newBalance;
      if (transaction.type === 'INCOME') {
        newBalance = Number(account.balance) - Number(transaction.amount);
      } else {
        newBalance = Number(account.balance) + Number(transaction.amount);
      }

      const response = await transactionService.deleteTransaction(transaction.id);

      if (!response.success) {
        const errorData = response.message;
        throw new Error(errorData || 'Erro ao excluir transação');
      }

      const payloadEdit = {
        id: account.id,
        balance: newBalance,
      };

      await accountService.updateAccount(payloadEdit);

      toast.success("Transação excluída com sucesso");
      setTransaction(null);
      fetchTransactions(true, 1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao excluir transação");
      setIsLoading(false);
      setTransaction(null);
    } finally {
      setOpenModal(false);
    }
  };

  return (
    <ProtectedRoute>
      <Breadcrumb loading={isLoading}/>
      
      <div className="">
        <TransactionFilters
          searchTerm={searchTerm}
          onSearchChange={handleSearchChange}
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
          loading={isLoading}
        />

        <div className="">
          {isLoading ? (
            <div className="max-w-5xl mx-auto p-6 mt-5 flex justify-center items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <>
              <TransactionList
                transactions={transactions}
                onDelete={handleDeleteClick}
              />

              {hasMore && (
                <div className="flex justify-center my-6">
                  <Button
                    onClick={handleLoadMore}
                    disabled={isLoadingMore}
                    variant="link"
                    className="text-blue-300"
                    icon={<FaAngleDown size={18} />}
                  >
                    {isLoadingMore ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-500 mr-2"></div>
                        Carregando...
                      </>
                    ) : (
                      "Ver mais"
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <Modal
        isOpen={openModal}
        onClose={() => {
          setOpenModal(false);
          setTransaction(null);
        }}
        onConfirm={handleConfirmDelete}
        mensagem="Tem certeza que deseja excluir esta transação?"
        confirmText="Excluir"
        isLoading={isLoading}
      />
    </ProtectedRoute>
  );
}