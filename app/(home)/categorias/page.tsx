"use client";

// Hooks
import { Suspense, useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";

// Services
import { categoryService } from "@/app/services/categoryService";

// Toast
import 'react-toastify/dist/ReactToastify.css';
import { toast } from "react-toastify";

// Components
import Breadcrumb from "@/app/components/Breadcrumb";
import Modal from "@/app/components/Modal";
import ProtectedRoute from "@/app/components/ProtectedRoute";
import { Pagination } from "@/app/components/ui/Pagination";
import { CategoryFilters } from "@/app/components/categories/CategoryFilters";
import { CategoryList } from "@/app/components/categories/CategoryList";

// Types
import { CategoryModel } from '@/app/types/category'

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CategoriesPage />
    </Suspense>
  );
}

function CategoriesPage() {
  const { user }         = useAuth();
  const router           = useRouter();
  const searchParams     = useSearchParams();
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const itensForPage     = 8;
  const DEBOUNCE_DELAY   = 500;

  const [categories, setCategories] = useState<CategoryModel[]>([]);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [isLoading, setIsLoading]   = useState(true);
  const [openModal, setOpenModal]   = useState(false);
  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");

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
      if (params.page && params.page > 1) query.set("page", params.page.toString());

      router.replace(`/categorias?${query.toString()}`);
    },
    [router]
  );

  const fetchCategories = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data, pagination: pagData } = await categoryService.getCategories(user.id, {
        page: pagination.currentPage,
        limit: itensForPage,
        search: searchTerm,
      });

      setCategories(data.categories || []);
      setPagination(prev => ({
        ...prev,
        totalPages: pagData.totalPages,
        totalItems: pagData.totalItems,
      }));
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [user, pagination.currentPage, itensForPage, searchTerm]);

  useEffect(() => {
    // Immediate fetch for page changes
    if (searchTerm) {
      const timeoutId = setTimeout(fetchCategories, DEBOUNCE_DELAY);
      return () => clearTimeout(timeoutId);
    } else {
      fetchCategories();
      return () => {};
    }
  }, [user, pagination.currentPage, itensForPage, searchTerm, fetchCategories]);

  const handleDeleteClick = async (id: string) => {
    setCategoryId(id);
    setOpenModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!categoryId) return;

    setIsLoading(true);

    try {
      const response = await categoryService.deleteCategory(categoryId);

      if (!response.success) {
        const errorData = response.message;
        throw new Error(errorData || 'Erro ao excluir categoria');
      }

      toast.success("Categoria excluída com sucesso!");
      setCategoryId(null);
      fetchCategories();
    } catch (error) {
      toast.error((error as Error).message);
      setIsLoading(false);
      setCategoryId(null);
    } finally {
      setOpenModal(false);
    }
  };

  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    const currentTimeout = setTimeout(() => {
      setPagination(prev => ({ ...prev, currentPage: 1 }));
      updateURLParams({ search: value, page: 1 });
    }, DEBOUNCE_DELAY);
    
    searchTimeoutRef.current = currentTimeout;
  }, [updateURLParams]);

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
    updateURLParams({ search: searchTerm, page });
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setPagination(prev => ({ ...prev, currentPage: 1 }));
    router.replace(`/categorias`);
  };

  return (
    <ProtectedRoute>
      <Breadcrumb loading={isLoading}/>
      
      <div className="max-w-7xl">
        <CategoryFilters
          searchTerm={searchTerm}
          onSearchChange={handleSearchChange}
          onClearFilters={handleClearFilters}
        />

        <div className="">

          {isLoading ? (
            <div className="max-w-5xl mx-auto p-6 mt-5 flex justify-center items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <CategoryList
              categories={categories}
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
          setCategoryId(null);
        }}
        onConfirm={handleConfirmDelete}
        mensagem="Tem certeza que deseja excluir esta categoria?"
        confirmText="Excluir"
        isLoading={isLoading}
      />
    </ProtectedRoute>
  );
}