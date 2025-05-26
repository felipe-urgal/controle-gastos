"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { fetchTransacao, Transacao } from "@/app/services/transacoesService";
import { useAuth } from "@/app/context/AuthContext";

import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { toast } from "react-toastify";

import Breadcrumb from "@/app/components/Breadcrumb";
import ProtectedRoute from "@/app/components/ProtectedRoute";
import { TransactionSummary } from "@/app/components/transactions/TransactionSummary";
import { TransactionFilters } from "@/app/components/transactions/TransactionFilters";
import { TransactionList } from "@/app/components/transactions/TransactionList";
import { TransactionPagination } from "@/app/components/transactions/TransactionPagination";
import Modal from "@/app/components/Modal";

export interface Categoria {
  id: string;
  nome: string;
}

const ITEMS_PER_PAGE = 5;

export default function Info() {
  const { user } = useAuth();
  const { mes, ano } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const mesSelecionado = Number(mes);
  const anoSelecionado = Number(ano);

  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [allTransacoes, setAllTransacoes] = useState<Transacao[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<number | null>(null);

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");
  const [filters, setFilters] = useState({
    tipo: searchParams.get("tipo") || "",
    categoria: searchParams.get("categoria") || "",
  });

  const [pagination, setPagination] = useState({
    currentPage: Number(searchParams.get("page")) || 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: ITEMS_PER_PAGE,
  });

  const updateURLParams = useCallback(
    (params: { search?: string; tipo?: string; categoria?: string; page?: number }) => {
      const query = new URLSearchParams();
      if (params.search) query.set("search", params.search);
      if (params.tipo) query.set("tipo", params.tipo);
      if (params.categoria) query.set("categoria", params.categoria);
      if (params.page && params.page > 1) query.set("page", params.page.toString());

      router.replace(`/dashboard/${anoSelecionado}/${mesSelecionado}?${query.toString()}`);
    },
    [router, anoSelecionado, mesSelecionado]
  );

  const fetchDados = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, pagination: pagData, allTransacoes } = await fetchTransacao(
        user.id,
        mesSelecionado,
        anoSelecionado,
        pagination.currentPage,
        ITEMS_PER_PAGE,
        filters.tipo,
        filters.categoria,
        searchTerm
      );

      const res = await fetch(`/api/categorias/todas?userId=${user.id}`);
      const { categorias } = await res.json();

      setCategorias(categorias);
      setTransacoes(data);
      setAllTransacoes(allTransacoes);
      setPagination(prev => ({
        ...prev,
        ...pagData,
      }));
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar dados.");
    } finally {
      setLoading(false);
    }
  }, [user, mesSelecionado, anoSelecionado, filters, pagination.currentPage, searchTerm]);

  useEffect(() => {
    fetchDados();
  }, [fetchDados]);

  const calcularSaldo = useCallback(
    (tipo: "investimentos" | "renda" | "despesa") => {
      return allTransacoes.reduce(
        (total, transacao) => total + (transacao.tipo === tipo ? Number(transacao.valor) : 0),
        0
      );
    },
    [allTransacoes]
  );

  const handleDeleteClick = async (id: number) => {
    setTransactionToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!transactionToDelete) return;

    setDeletingId(transactionToDelete);
    setIsDeleteModalOpen(false);
    setLoading(true);
    
    try {
      const response = await fetch(`/api/transacoes`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: transactionToDelete }),
      });

      if (!response.ok) throw new Error("Falha ao excluir transação");

      toast.success("Transação excluída com sucesso");
      fetchDados();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao excluir transação");
    } finally {
      setDeletingId(null);
      setTransactionToDelete(null);
    }
  };

  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
    
    // Cancela o timeout anterior se existir
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Configura um novo timeout para disparar após 500ms sem digitação
    searchTimeoutRef.current = setTimeout(() => {
      setPagination(prev => ({ ...prev, currentPage: 1 }));
      updateURLParams({ 
        search: value, 
        tipo: filters.tipo, 
        categoria: filters.categoria, 
        page: 1 
      });
    }, 500);
  }, [filters.tipo, filters.categoria, updateURLParams]);

  // Limpa o timeout quando o componente desmontar
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, currentPage: page }));
    updateURLParams({ search: searchTerm, tipo: filters.tipo, categoria: filters.categoria, page });
  };

  const handleFilterChange = (name: "tipo" | "categoria", value: string) => {
    const newFilters = { ...filters, [name]: value };
    setFilters(newFilters);
    setPagination(prev => ({ ...prev, currentPage: 1 }));
    updateURLParams({ search: searchTerm, tipo: newFilters.tipo, categoria: newFilters.categoria, page: 1 });
  };

  const handleClearFilters = () => {
    setFilters({ tipo: "", categoria: "" });
    setSearchTerm("");
    setPagination(prev => ({ ...prev, currentPage: 1 }));
    router.replace(`/dashboard/${anoSelecionado}/${mesSelecionado}`);
  };

  return (
    <ProtectedRoute>
      <div className="max-w-6xl mx-auto p-4">
        <Breadcrumb anoSelecionado={anoSelecionado} mesSelecionado={mesSelecionado} showMonthLink />

        <TransactionSummary
          transacoes={allTransacoes}
          categorias={categorias}
          saldo={calcularSaldo("renda") - calcularSaldo("despesa")}
          saldoRenda={calcularSaldo("renda")}
          saldoDespesa={calcularSaldo("despesa")}
          saldoInvestimentos={calcularSaldo("investimentos")}
          mes={mesSelecionado}
          ano={anoSelecionado}
        >

          <TransactionFilters
            searchTerm={searchTerm}
            onSearchChange={handleSearchChange}
            filters={filters}
            onFilterChange={handleFilterChange}
            categories={categorias}
            showFilters={showFilters}
            onToggleFilters={() => setShowFilters(prev => !prev)}
            onClearFilters={handleClearFilters}
          />
        </TransactionSummary>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden mb-6">

          {loading ? (
            <div className="p-4">
              <Skeleton className="h-15 w-full" />
              <Skeleton className="h-15 w-full" />
              <Skeleton className="h-15 w-full" />
              <Skeleton className="h-15 w-full" />
              <Skeleton className="h-15 w-full" />
            </div>
          ) : (
            <TransactionList
              transactions={transacoes}
              categories={categorias}
              onDelete={handleDeleteClick}
              deletingId={deletingId}
            />
          )}

          <TransactionPagination
            paginaAtual={pagination.currentPage}
            totalPaginas={pagination.totalPages}
            totalItens={pagination.totalItems}
            itensPorPagina={pagination.itemsPerPage}
            onPageChange={handlePageChange}
          />
        </div>
      </div>

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setTransactionToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        mensagem="Tem certeza que deseja excluir esta transação?"
        confirmText="Excluir"
        isLoading={deletingId !== null}
      />
    </ProtectedRoute>
  );
}
