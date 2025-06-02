"use client";

// Hooks
import { Suspense, useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { Pagination } from "@/app/components/ui/Pagination";
import { AccountFilters } from "@/app/components/accounts/AccountFilters";
import { AccountList } from "@/app/components/accounts/AccountList";

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
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const itensForPage     = 8;
  const DEBOUNCE_DELAY   = 500;

  const [accounts, setAccounts]     = useState<AccountModel[]>([]);
  const [accountId, setAccountId]   = useState<string | null>(null);
  const [isLoading, setIsLoading]   = useState(true);
  const [openModal, setOpenModal]   = useState(false);
  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");

  const [filters, setFilters] = useState({
    type: searchParams.get("type") || "",
  });

  const [pagination, setPagination] = useState({
    currentPage: Number(searchParams.get("page")) || 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: itensForPage,
  });

  const updateURLParams = useCallback(
    (params: { search?: string; type?: string; page?: number }) => {
      const query = new URLSearchParams();
      if (params.search) query.set("search", params.search);
      if (params.type) query.set("type", params.type);
      if (params.page && params.page > 1) query.set("page", params.page.toString());

      router.replace(`/contas?${query.toString()}`);
    },
    [router]
  );

  const fetchAccounts = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { data, pagination: pagData } = await accountService.getAccounts(user.id, {
        page: pagination.currentPage,
        limit: itensForPage,
        search: searchTerm,
        type: filters.type,
      });

      setAccounts(data.accounts || []);
      setPagination(prev => ({
        ...prev,
        currentPage: pagination.currentPage,
        totalPages: pagData.totalPages,
        totalItems: pagData.totalItems,
      }));
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [user, pagination.currentPage, itensForPage, searchTerm, filters.type]);
  
  useEffect(() => {
    // Immediate fetch for page changes
    if (searchTerm) {
      const timeoutId = setTimeout(fetchAccounts, DEBOUNCE_DELAY);
      return () => clearTimeout(timeoutId);
    } else {
      fetchAccounts();
      return () => {};
    }
  }, [user, pagination.currentPage, itensForPage, searchTerm, fetchAccounts]);

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

  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      setPagination(prev => ({ ...prev, currentPage: 1 }));
      updateURLParams({ 
        search: value,
        type: filters.type,
        page: 1 
      });
    }, DEBOUNCE_DELAY);
  }, [filters.type, updateURLParams]);

  useEffect(() => {
    const currentTimeout = searchTimeoutRef.current;
    return () => {
      if (currentTimeout) {
        clearTimeout(currentTimeout);
      }
    };
  }, []);

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, currentPage: page }));
    updateURLParams({ search: searchTerm, type: filters.type, page });
  };

  const handleFilterChange = (name: "type", value: string) => {
    const newFilters = { ...filters, [name]: value };
    setFilters(newFilters);
    setPagination(prev => ({ ...prev, currentPage: 1 }));
    updateURLParams({ search: searchTerm, type: newFilters.type, page: 1 });
  };

  const handleClearFilters = () => {
    setFilters({ type: "" });
    setSearchTerm("");
    setPagination(prev => ({ ...prev, currentPage: 1 }));
    router.replace(`/contas`);
  };

  return (
    <ProtectedRoute>
      <Breadcrumb loading={isLoading}/>
      
      <div className="max-w-7xl">
        <AccountFilters
          searchTerm={searchTerm}
          onSearchChange={handleSearchChange}
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
        />

        <div className="">

          {isLoading ? (
            <div className="max-w-5xl mx-auto p-6 mt-5 flex justify-center items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <AccountList
              accounts={accounts}
              onDelete={handleDeleteClick}
            />
          )}

          <Pagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            totalItems={pagination.totalItems}
            itemsPerPage={pagination.itemsPerPage}
            onPageChange={handlePageChange}
          />
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