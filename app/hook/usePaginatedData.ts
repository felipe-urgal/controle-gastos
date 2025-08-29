"use client";

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
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(Number(searchParams.get("page")) || 1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
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

  const updateURLParams = useCallback(
    (params: Record<string, string>, page: number = 1) => {
      const query = new URLSearchParams();
      
      // Adiciona todos os parâmetros existentes
      Object.entries(params).forEach(([key, value]) => {
        if (value) query.set(key, value);
      });
      
      // Adiciona a página atual (só adiciona se for maior que 1 para evitar poluição visual)
      if (page > 1) {
        query.set("page", page.toString());
      } else {
        query.delete("page"); // Remove o parâmetro page se for a primeira página
      }
      
      router.replace(`?${query.toString()}`);
    },
    [router]
  );

  const fetchData = useCallback(async (isInitialLoad = true, page = 1) => {
    if (!user) return;

    if (isInitialLoad) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }

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

      setHasMore((responseData.items?.length || 0) >= itemsPerLoad);
      setCurrentPage(page);
      
      // Atualiza a URL com a página atual
      // updateURLParams({ search: searchTerm, ...filters }, page);

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
      setIsLoadingMore(false);
    }
  }, [user, itemsPerLoad, searchTerm, filters, fetchFunction]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      // Pega a página da URL ou usa 1 como padrão
      const urlPage = Number(searchParams.get("page")) || 1;
      fetchData(true, urlPage);
    }, debounceDelay);
    return () => clearTimeout(timeoutId);
  }, [user, searchTerm, filters, fetchData, debounceDelay, searchParams]);

  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
    updateURLParams({ search: value, ...filters }, 1); // Sempre volta para página 1 na busca
    setMessage("");
  }, [updateURLParams, filters]);

  const handleFilterChange = useCallback((name: string, value: string) => {
    const newFilters = { ...filters, [name]: value };
    setFilters(newFilters);
    updateURLParams({ search: searchTerm, ...newFilters }, 1); // Sempre volta para página 1 no filtro
    setMessage("");
  }, [filters, searchTerm, updateURLParams]);

  const handleClearFilters = useCallback(() => {
    const newUrl = new URL(window.location.href);
    newUrl.search = '';
    
    router.replace(newUrl.toString());
  
    setFilters(defaultFilters);
    setSearchTerm("");
    setMessage("");
  }, [defaultFilters, router]);

  const handleLoadMore = useCallback(() => {
    const nextPage = currentPage + 1;
    fetchData(false, nextPage);
  }, [currentPage, fetchData]);

  const handlePageChange = useCallback((page: number) => {
    updateURLParams({ search: searchTerm, ...filters }, page);
    // fetchData(true, page);
  }, [searchTerm, filters, updateURLParams]);

  return {
    data,
    isLoading,
    isLoadingMore,
    hasMore,
    currentPage,
    message,
    searchTerm,
    filters,
    additionalData,
    setData,
    handleSearchChange,
    handleFilterChange,
    handleClearFilters,
    handleLoadMore,
    updateURLParams,
    totalItems,
    totalPages: Math.ceil(totalItems / itemsPerLoad),
    handlePageChange,
    itemsPerLoad,
  };
}