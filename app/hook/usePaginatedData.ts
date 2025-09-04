"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { toast } from "react-toastify";

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
  importFunction?: (file: File, userId: string) => Promise<{ 
    success: boolean; 
    message: string; 
    details?: { errors: string[], logId: string, errorCount: number } 
  }>;
  importLog?: string;
}

export function usePaginatedData<T, U = Record<string, unknown>>(options: PaginatedDataOptions<T, U>) {
  const { user } = useAuth();

  const {
    defaultFilters,
    itemsPerLoad,
    debounceDelay,
    fetchFunction,
    importFunction,
    importLog,
  } = options;

  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(Number(searchParams.get("page")) || 1);
  const [message, setMessage] = useState("");
  const [additionalData, setAdditionalData] = useState<U>({} as U);
  const [totalItems, setTotalItems] = useState(0);
  
  // Estados para importação
  const [importLoading, setImportLoading] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  
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

  // Função para recarregar dados (refresh)
  const refreshData = useCallback(() => {
    fetchData(currentPage);
  }, [fetchData, currentPage]);

  // Função para processar preview do arquivo
  const handleFileSelect = useCallback(async (file: File) => {
    try {
      setSelectedFile(file);
      
      // Fazer preview do arquivo
      const fileBuffer = await file.arrayBuffer();
      const fileContent = Buffer.from(fileBuffer).toString('utf-8');
      
      // Parse básico do CSV para preview
      const lines = fileContent.split('\n').filter(line => line.trim());
      const headers = lines[0].split(';');
      const previewData = lines.map(line => {
        const values = line.split(';');
        return headers.reduce((obj, header, index) => {
          obj[header.trim()] = values[index] ? values[index].trim() : '';
          return obj;
        }, {} as any);
      });
      
      setImportPreview(previewData);
      setImportModalOpen(true);
    } catch (error) {
      toast.error('Erro ao processar arquivo');
      console.error('File processing error:', error);
    }
  }, []);

  const handleClearFilters = useCallback(() => {
    const newUrl = new URL(window.location.href);
    newUrl.search = '';
    
    router.replace(newUrl.toString());
  
    setFilters(defaultFilters);
    setSearchTerm("");
    setMessage("");
  }, [defaultFilters, router]);

  // No handleConfirmImport, substitua a parte do toast.info:
  const handleConfirmImport = useCallback(async () => {
    if (!selectedFile || !user || !importFunction) return;
    
    try {
      setImportLoading(true);
      
      const result = await importFunction(selectedFile, user.id);

      if (result.success) {
        toast.success(result.message);
        
        // Mostrar link para o log se houver erros
        if (result.details?.logId && result.details?.errorCount > 0) {
          toast.info(
            `Importação concluída. Clique aqui para baixar o log completo.`,
            {
              autoClose: false,
              closeOnClick: false,
              onClick: () => {
                const link = document.createElement('a');
                link.href = `/api/${importLog}/import/log?id=${result?.details?.logId}`;
                link.download = `import-log-${result?.details?.logId}.txt`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                toast.dismiss();
              }
            }
          );
        }
        
        refreshData();
      } else {
        toast.error(result.message);
        
        if (result.details?.errors) {
          result.details.errors.forEach((error: string) => {
            toast.error(error);
          });
        }
      }
    } catch (error: any) {
      let errorMessage = error instanceof Error ? error.message : 'Erro ao importar arquivo';
      
      // Se tiver logId, adicionar ao erro
      if (error.response?.data?.logId) {
        errorMessage += ` | Log ID: ${error.response.data.logId}`;
      }
      
      toast.error(errorMessage);
      console.error('Import error:', error);
    } finally {
      setImportModalOpen(false);
      setImportLoading(false);
      setSelectedFile(null);
      setImportPreview([]);
    }
  }, [selectedFile, user, importFunction, refreshData, importLog]);

  // Função para cancelar importação
  const handleCancelImport = useCallback(() => {
    setImportModalOpen(false);
    setSelectedFile(null);
    setImportPreview([]);
  }, []);

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
    isLoading: isLoading || importLoading,
    currentPage,
    message,
    searchTerm,
    filters,
    additionalData,
    setData,
    handleSearchChange,
    handleFilterChange,
    handleClearFilters,
    updateURLParams,
    totalItems,
    totalPages: Math.ceil(totalItems / itemsPerLoad),
    handlePageChange,
    itemsPerLoad,
    user,
    importLoading,
    importModalOpen,
    selectedFile,
    importPreview,
    handleFileSelect,
    handleConfirmImport,
    handleCancelImport,
    setImportModalOpen,
    refreshData // Agora esta função está sendo retornada
  };
}
