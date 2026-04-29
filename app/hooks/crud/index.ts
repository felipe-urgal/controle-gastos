"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useDebounce } from "@/app/hooks/use-debounce";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

type PaginatedData<T> = {
  items: T[];
  total?: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
  summary?: any;
};

type GetAllService<T> = (
  query?: Record<string, string | number>
) => Promise<{
  data?: PaginatedData<T>;
}>;

type UseIndexProps<T> = {
  service: {
    getAll: GetAllService<T>;
  };
  pagination?: boolean;
  initialPageSize?: number;
  debounceMs?: number;
  syncWithUrl?: boolean;
};

export function useIndex<T>({
  service,
  pagination = false,
  initialPageSize = 10,
  debounceMs = 500,
  syncWithUrl = true,
}: UseIndexProps<T>) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [summary, setSummary] = useState<any>();

  const isFirstRender = useRef(true);

  const [filters, setFilters] = useState<Record<string, any>>(() => {
    if (!syncWithUrl) return {};

    const entries = Object.fromEntries(searchParams.entries());

    delete entries.page;
    delete entries.pageSize;
    delete entries.viewMode;

    return entries;
  });

  const [page, setPage] = useState(() => {
    if (!syncWithUrl) return 1;
    return Number(searchParams.get("page")) || 1;
  });

  const [pageSize, setPageSize] = useState(() => {
    if (!syncWithUrl) return initialPageSize;

    const param = searchParams.get("pageSize");
    const parsed = param ? Number(param) : NaN;

    return !isNaN(parsed) && parsed > 0
      ? parsed
      : initialPageSize;
  });

  const [viewMode, setViewMode] = useState<"grid" | "list">(
    (searchParams.get("viewMode") as any) || "list"
  );

  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState<number>();
  const [totalPages, setTotalPages] = useState<number>();

  const debouncedFilters = useDebounce(filters, debounceMs);

  // 🔄 Sync URL
  useEffect(() => {
    if (!syncWithUrl) return;
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const params = new URLSearchParams();

    params.set("viewMode", viewMode);

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        params.set(key, String(value));
      }
    });

    if (pagination) {
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
    }

    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [filters, page, pageSize, viewMode]);

  // 🔄 Reset página quando filtro mudar
  useEffect(() => {
    if (pagination) setPage(1);
  }, [debouncedFilters]);

  const fetchItems = useCallback(async () => {
    setLoading(true);

    try {
      const query: Record<string, any> = { ...debouncedFilters };

      if (pagination) {
        query.page = page;
        query.pageSize = pageSize;
      }

      const response = await service.getAll(query);
      const data = response.data;

      setItems(data?.items || []);

      if (pagination) {
        setTotal(data?.total);
        setTotalPages(data?.totalPages);
      }

      setSummary(data?.summary);
    } catch (error: any) {
      // se quiser, só ignora 401 durante transição/logout
      if (error?.message === "Não autenticado") {
        setItems([]);
        return;
      }

      console.error("Erro ao carregar lista:", error);
    } finally {
      setLoading(false);
    }
  }, [debouncedFilters, page, pageSize, pagination, service]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const clearFilters = useCallback(() => {
    setFilters({});
    
    if (pagination) {
      setPage(1);
    }
  }, [pagination]);

  return {
    loading,
    items,
    filters,
    setFilters,
    clearFilters,
    viewMode,
    setViewMode,
    page,
    setPage,
    pageSize,
    setPageSize,
    total,
    totalPages,
    hasPagination: pagination,
    refetch: fetchItems,
    summary,
  };
};
