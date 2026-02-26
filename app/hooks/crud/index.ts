"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useDebounce } from "@/app/hooks/useDebounce";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

type PaginatedData<T> = {
  items: T[];
  total?: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
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

export function useIndex<T extends Record<string, any>>({
  service,
  pagination = false,
  initialPageSize = 6,
  debounceMs = 500,
  syncWithUrl = true,
}: UseIndexProps<T>) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const isFirstRender = useRef(true);
  const isUpdatingFromUrl = useRef(false);
  
  const [search, setSearch] = useState(() => {
    if (syncWithUrl) {
      return searchParams.get("search") || "";
    }
    return "";
  });
  
  const [page, setPage] = useState(() => {
    if (syncWithUrl) {
      const pageParam = searchParams.get("page");
      return pageParam ? Number(pageParam) : 1;
    }
    return 1;
  });
  
  const [pageSize, setPageSize] = useState(() => {
    if (syncWithUrl) {
      const pageSizeParam = searchParams.get("pageSize");
      return pageSizeParam ? Number(pageSizeParam) : initialPageSize;
    }
    return initialPageSize;
  });

  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState<number | undefined>(undefined);
  const [totalPages, setTotalPages] = useState<number | undefined>(undefined);

  const debouncedSearch = useDebounce(search, debounceMs);

  useEffect(() => {
    if (!syncWithUrl) return;
    
    if (isUpdatingFromUrl.current) {
      isUpdatingFromUrl.current = false;
      return;
    }

    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    let hasChanges = false;

    if (search) {
      if (params.get("search") !== search) {
        params.set("search", search);
        hasChanges = true;
      }
    } else {
      if (params.has("search")) {
        params.delete("search");
        hasChanges = true;
      }
    }

    if(viewMode) {
      if (params.get("viewMode") !== viewMode) {
        params.set("viewMode", viewMode);
        hasChanges = true;
      }
    }

    if (pagination) {
      const pageStr = String(page);
      if (params.get("page") !== pageStr) {
        params.set("page", pageStr);
        hasChanges = true;
      }

      const pageSizeStr = String(pageSize);
      if (params.get("pageSize") !== pageSizeStr) {
        params.set("pageSize", pageSizeStr);
        hasChanges = true;
      }
    }

    if (hasChanges) {
      const newUrl = `${pathname}${params.toString() ? `?${params.toString()}` : ""}`;
      router.replace(newUrl, { scroll: false });
    }
  }, [search, page, pageSize, pagination, pathname, router, searchParams, syncWithUrl, viewMode]);

  useEffect(() => {
    if (!syncWithUrl) return;

    const urlSearch = searchParams.get("search") || "";
    const urlPage = searchParams.get("page");
    const urlPageSize = searchParams.get("pageSize");

    let hasChanges = false;

    if (urlSearch !== search) {
      isUpdatingFromUrl.current = true;
      setSearch(urlSearch);
      hasChanges = true;
    }

    if (pagination) {
      const newPage = urlPage ? Number(urlPage) : 1;
      if (newPage !== page) {
        isUpdatingFromUrl.current = true;
        setPage(newPage);
        hasChanges = true;
      }

      const newPageSize = urlPageSize ? Number(urlPageSize) : initialPageSize;
      if (newPageSize !== pageSize) {
        isUpdatingFromUrl.current = true;
        setPageSize(newPageSize);
        hasChanges = true;
      }
    }

    if (hasChanges) {
      fetchItems();
    }
  }, [searchParams, pagination, initialPageSize]);

  const fetchItems = useCallback(async () => {
    setLoading(true);

    try {
      const query: Record<string, string | number> = {};

      if (pagination) {
        query.page = page;
        query.pageSize = pageSize;
      }

      if (debouncedSearch) {
        query.search = debouncedSearch;
      }

      const response = await service.getAll(query);
      const data = response.data;

      setItems(data?.items || []);

      if (pagination) {
        setTotal(data?.total);
        setTotalPages(data?.totalPages);
      }

    } catch {
    } finally {
      setLoading(false);
    }
  }, [service, pagination, page, pageSize, debouncedSearch]);

  useEffect(() => {
    if (pagination && debouncedSearch) {
      setPage(1);
    }
  }, [debouncedSearch, pagination]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  return {
    loading,
    items,
    search,
    setSearch,
    viewMode,
    setViewMode,
    refetch: fetchItems,
    page,
    setPage,
    pageSize,
    setPageSize,
    total,
    totalPages,
    hasPagination: pagination,
  };
};
