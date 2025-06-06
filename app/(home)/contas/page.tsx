"use client";

// Hooks
import { Suspense, useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// Context
import { useAuth } from "@/app/context/AuthContext";

// Services
import { accountService } from "@/app/services/accountService";

// Toast
import 'react-toastify/dist/ReactToastify.css';
import { toast } from "react-toastify";

// Components
import Breadcrumb from "@/app/components/Breadcrumb";
import Modal from "@/app/components/Modal";
import ProtectedRoute from "@/app/components/ProtectedRoute";
import { AccountFilters } from "@/app/components/accounts/AccountFilters";
import { AccountList } from "@/app/components/accounts/AccountList";
import { Button } from "@/app/components/ui/Button";

// Icons
import { FaAngleDown } from "react-icons/fa6";

// Types
import { AccountModel } from '@/app/types/account'

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AccountsPage />
    </Suspense>
  );
}

function AccountsPage() {
  const { user }         = useAuth();
  const router           = useRouter();
  const searchParams     = useSearchParams();
  const itemsPerLoad     = 5;
  const DEBOUNCE_DELAY   = 500;

  const [accounts, setAccounts]     = useState<AccountModel[]>([]);
  const [accountId, setAccountId]   = useState<string | null>(null);
  const [isLoading, setIsLoading]   = useState(true);
  const [openModal, setOpenModal]   = useState(false);
  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [message, setMessage]             = useState("");
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const [filters, setFilters] = useState({
    type: searchParams.get("type") || "",
  });

  const updateURLParams = useCallback(
    (params: { search?: string; type?: string; }) => {
      const query = new URLSearchParams();
      if (params.search) query.set("search", params.search);
      if (params.type) query.set("type", params.type);

      router.replace(`/contas?${query.toString()}`);
    },
    [router]
  );

  const fetchAccounts = useCallback(async (isInitialLoad = true, page = 1) => {
    if (!user) return;

    if (isInitialLoad) {
      setIsLoading(true);
      setCurrentPage(1); // sempre reset para 1 ao buscar do zero
    } else {
      setIsLoadingMore(true);
      setCurrentPage(page); // atualiza página só ao carregar mais
    }

    try {
      const { data } = await accountService.getAccounts(user.id, {
        page,
        limit: itemsPerLoad,
        search: searchTerm,
        type: filters.type,
      });

      if (page === 1) {
        setAccounts(data.accounts || []);
      } else {
        setAccounts(prev => [...prev, ...(data.accounts || [])]);
      }

      // Verifica se há mais itens para carregar
      setHasMore((data.accounts?.length || 0) >= itemsPerLoad);
      setCurrentPage(page);

      if (searchTerm || filters.type) {
        setMessage(`${data.total} cont${data.total === 1 ? 'a' : 'as'} encontrada${data.total === 1 ? '' : 's'}`)
      } else {
        setMessage("")
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false)
    }

  }, [user, itemsPerLoad, searchTerm, filters.type]);
  
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchAccounts(true, 1);
    }, DEBOUNCE_DELAY);
    return () => clearTimeout(timeoutId);
  }, [user, searchTerm, filters.type, fetchAccounts]);

  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
    updateURLParams({ search: value, type: filters.type });
    setMessage("")
    setCurrentPage(1);
  }, [updateURLParams, filters.type]);

  const handleFilterChange = (name: "type", value: string) => {
    const newFilters = { ...filters, [name]: value };
    setFilters(newFilters);
    setCurrentPage(1);
    setMessage("")
    updateURLParams({ search: searchTerm, type: newFilters.type });
  };

  const handleClearFilters = () => {
    router.replace(`/contas`);
    setFilters({ type: "" });
    setSearchTerm("");
    setMessage("")
    setCurrentPage(1);
  };

  const handleLoadMore = () => {
    const nextPage = currentPage + 1;
    fetchAccounts(false, nextPage);
    setCurrentPage(nextPage);
  };

  const handleDeleteClick = async (id: string) => {
    setAccountId(id);
    setOpenModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!accountId) return;

    setOpenModal(false);
    setIsLoading(true);

    try {
      const response = await accountService.deleteAccount(accountId);

      if (!response.success) {
        const errorData = response.message;
        throw new Error(errorData || 'Erro ao excluir conta');
      }

      toast.success("Conta excluída com sucesso!");
      setAccountId(null);
      fetchAccounts();
    } catch (error) {
      toast.error((error as Error).message);
      setIsLoading(false);
      setAccountId(null);
    } finally {
      setOpenModal(false);
    }
  };
  
  return (
    <ProtectedRoute>
      <Breadcrumb loading={isLoading || isLoadingMore}/>
      
      <div className="">
        <AccountFilters
          searchTerm={searchTerm}
          onSearchChange={handleSearchChange}
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
          loading={isLoading || isLoadingMore}
          message={message}
        />

        <div className="">

          {isLoading ? (
            <div className="max-w-5xl mx-auto p-6 mt-5 flex justify-center items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <>
              <AccountList
                accounts={accounts}
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
          setAccountId(null);
        }}
        onConfirm={handleConfirmDelete}
        mensagem="Tem certeza que deseja excluir esta conta?"
        confirmText="Excluir"
        isLoading={isLoading}
      />
    </ProtectedRoute>
  );
}