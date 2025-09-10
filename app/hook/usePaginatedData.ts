// hooks/usePaginatedData.ts
import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";

type FilterType = Record<string, string>;

type FetchResponse<T, U = Record<string, unknown>> = {
  items: T[];
  total: number;
  additionalData?: U;
};

interface PaginatedDataOptions<T, U = Record<string, unknown>> {
  defaultFilters: FilterType;
  itemsPerLoad: number;
  debounceDelay: number;
  fetchFunction: (
    userId: string,
    params: { 
      page: string; 
      limit: string; 
      search: string;
      [key: string]: string;
    }
  ) => Promise<{ data: FetchResponse<T, U> }>;
}

export function usePaginatedData<T, U = Record<string, unknown>>(options: PaginatedDataOptions<T, U>) {
  const { user } = useAuth();
  const {
    defaultFilters,
    itemsPerLoad,
    debounceDelay,
    fetchFunction,
  } = options;

  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(Number(searchParams.get("page")) || 1);
  const [message, setMessage] = useState("");
  const [additionalData, setAdditionalData] = useState<U>({} as U);
  const [totalItems, setTotalItems] = useState(0);
  
  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");
  const [filters, setFilters] = useState<FilterType>({
    ...defaultFilters,
    ...Object.fromEntries(
      Object.keys(defaultFilters).map(key => 
        [key, searchParams.get(key) || ""]
      )
    )});

  // Função para buscar dados
  const fetchData = useCallback(async (page = 1) => {
    if (!user) return;

    setIsLoading(true);

    try {
      const userId = user.id;

      const params = {
        ...filters,
        page: page.toString(),
        limit: itemsPerLoad.toString(),
        search: searchTerm,
      };

      const { data: responseData } = await fetchFunction(userId, params);

      setTotalItems(responseData.total || 0);
      setData(responseData.items || []);
      
      if (responseData.additionalData) {
        setAdditionalData(responseData.additionalData);
      }

      setCurrentPage(page);

      if (searchTerm || Object.values(filters).some(Boolean)) {
        setMessage(`${responseData.total} item${responseData.total === 1 ? '' : 's'} encontrado${responseData.total === 1 ? '' : 's'}`);
      } else {
        setMessage("");
      }
    } catch (err) {
      console.error(err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [user, itemsPerLoad, searchTerm, filters, fetchFunction]);

  // Função para recarregar dados
  const refreshData = useCallback(() => {
    fetchData(currentPage);
  }, [fetchData, currentPage]);

  const handleClearFilters = useCallback(() => {
    const newUrl = new URL(window.location.href);
    newUrl.search = '';
    
    router.replace(newUrl.toString());
  
    setFilters(defaultFilters);
    setSearchTerm("");
    setMessage("");
  }, [defaultFilters, router]);

  const updateURLParams = useCallback(
    (params: Record<string, string>, page: number = 1) => {
      const query = new URLSearchParams();
      
      Object.entries(params).forEach(([key, value]) => {
        if (value) query.set(key, value);
      });
      
      if (page > 1) {
        query.set("page", page.toString());
      } else {
        query.delete("page");
      }
      
      router.replace(`?${query.toString()}`);
    },
    [router]
  );

  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
    updateURLParams({ search: value, ...filters }, 1);
    setMessage("");
  }, [updateURLParams, filters]);

  const handleFilterChange = useCallback((name: string, value: string) => {
    const newFilters = { ...filters, [name]: value };
    setFilters(newFilters);
    updateURLParams({ search: searchTerm, ...newFilters }, 1);
    setMessage("");
  }, [filters, searchTerm, updateURLParams]);

  const handlePageChange = useCallback((page: number) => {
    updateURLParams({ search: searchTerm, ...filters }, page);
  }, [searchTerm, filters, updateURLParams]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const urlPage = Number(searchParams.get("page")) || 1;
      fetchData(urlPage);
    }, debounceDelay);
    return () => clearTimeout(timeoutId);
  }, [user, searchTerm, filters, fetchData, debounceDelay, searchParams]);

  return {
    data,
    isLoading,
    currentPage,
    message,
    searchTerm,
    filters,
    additionalData,
    totalItems,
    totalPages: Math.ceil(totalItems / itemsPerLoad),
    setData,
    handleSearchChange,
    handleFilterChange,
    handleClearFilters,
    handlePageChange,
    refreshData,
    user
  };
}
