"use client";

// Hooks
import { Suspense, useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// Context
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
import { CategoryFilters } from "@/app/components/categories/CategoryFilters";
import { CategoryList } from "@/app/components/categories/CategoryList";
import { Button } from "@/app/components/ui/Button";

// Icons
import { FaAngleDown } from "react-icons/fa6";

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
  const itemsPerLoad     = 5;
  const DEBOUNCE_DELAY   = 500;

  const [categories, setCategories] = useState<CategoryModel[]>([]);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [isLoading, setIsLoading]   = useState(true);
  const [openModal, setOpenModal]   = useState(false);
  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [message, setMessage]             = useState("");

  const updateURLParams = useCallback(
    (params: { search?: string; type?: string; }) => {
      const query = new URLSearchParams();
      if (params.search) query.set("search", params.search);

      router.replace(`/categorias?${query.toString()}`);
    },
    [router]
  );

  const fetchCategories = useCallback(async (isInitialLoad = true, page = 1) => {
    if (!user) return;
    
    if (isInitialLoad) {
      setIsLoading(true);
      setCurrentPage(1); // sempre reset para 1 ao buscar do zero
    } else {
      setIsLoadingMore(true);
      setCurrentPage(page); // atualiza página só ao carregar mais
    }

    try {
      const { data } = await categoryService.getCategories(user.id, {
        page,
        limit: itemsPerLoad,
        search: searchTerm,
      });

      if (page === 1) {
        setCategories(data.categories || []);
      } else {
        setCategories(prev => [...prev, ...(data.categories || [])]);
      }

      // Verifica se há mais itens para carregar
      setHasMore((data.categories?.length || 0) >= itemsPerLoad);
      setCurrentPage(page);

      if (searchTerm) {
        setMessage(`${data.total} categori${data.total === 1 ? 'a' : 's'} encontrada${data.total === 1 ? '' : 's'}`)
      } else {
        setMessage("")
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false)
    }

  }, [user, itemsPerLoad, searchTerm]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchCategories(true, 1);
    }, DEBOUNCE_DELAY);
    return () => clearTimeout(timeoutId);
  }, [user, searchTerm, fetchCategories]);

  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
    setCurrentPage(1); // reset page
    updateURLParams({ search: value });
    setMessage("")
  }, [updateURLParams]);

  const handleLoadMore = () => {
    const nextPage = currentPage + 1;
    fetchCategories(false, nextPage);
    setCurrentPage(nextPage);
  };

  const handleClearFilters = () => {
    router.replace(`/categorias`);
    setSearchTerm("");
    setCurrentPage(1);
    setMessage("")
  };

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
      // Recarrega a lista desde o início após exclusão
      fetchCategories(true, 1);
    } catch (error) {
      toast.error((error as Error).message);
      setIsLoading(false);
      setCategoryId(null);
    } finally {
      setOpenModal(false);
    }
  };

  return (
    <ProtectedRoute>
      <Breadcrumb loading={isLoading || isLoadingMore}/>
      
      <div className="">
        <CategoryFilters
          searchTerm={searchTerm}
          onSearchChange={handleSearchChange}
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
              <CategoryList
                categories={categories}
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