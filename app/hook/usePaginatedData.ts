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
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [message, setMessage] = useState("");
  const [additionalData, setAdditionalData] = useState<U>({} as U);
  
  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");
  const [filters, setFilters] = useState<FilterType>({
    ...defaultFilters,
    ...Object.fromEntries(
      Object.keys(defaultFilters).map(key => 
        [key, searchParams.get(key) || ""]
      )
    )});

  const updateURLParams = useCallback(
    (params: Record<string, string>) => {
      const query = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value) query.set(key, value);
      });
      router.replace(`?${query.toString()}`);
    },
    [router]
  );

  const fetchData = useCallback(async (isInitialLoad = true, page = 1) => {
    if (!user) return;

    if (isInitialLoad) {
      setIsLoading(true);
      setCurrentPage(1);
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

      if (page === 1) {
        setData(responseData.items || []);
        if (responseData.additionalData) {
          setAdditionalData(responseData.additionalData);
        }
      } else {
        setData(prev => [...prev, ...(responseData.items || [])]);
      }

      setHasMore((responseData.items?.length || 0) >= itemsPerLoad);
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
      setIsLoadingMore(false);
    }
  }, [user, itemsPerLoad, searchTerm, filters, fetchFunction]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchData(true, 1);
    }, debounceDelay);
    return () => clearTimeout(timeoutId);
  }, [user, searchTerm, filters, fetchData, debounceDelay]);

  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
    updateURLParams({ search: value, ...filters });
    setMessage("");
  }, [updateURLParams, filters]);

  const handleFilterChange = useCallback((name: string, value: string) => {
    const newFilters = { ...filters, [name]: value };
    setFilters(newFilters);
    setCurrentPage(1);
    updateURLParams({ search: searchTerm, ...newFilters });
    setMessage("");
  }, [filters, searchTerm, updateURLParams]);

  const handleClearFilters = useCallback(() => {
    const newUrl = new URL(window.location.href);
    newUrl.search = '';
    
    // Replace the current URL
    router.replace(newUrl.toString());
  
    setFilters(defaultFilters);
    setSearchTerm("");
    setCurrentPage(1);
    setMessage("");
  }, [defaultFilters, router]);

  const handleLoadMore = useCallback(() => {
    const nextPage = currentPage + 1;
    fetchData(false, nextPage);
  }, [currentPage, fetchData]);

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
    updateURLParams
  };
}