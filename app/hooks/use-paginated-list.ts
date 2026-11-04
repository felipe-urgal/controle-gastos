'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { errorMessage } from '@/app/lib/error-message';

export type PaginatedPage<T> = {
  items?: T[];
  total?: number;
  totalPages?: number;
};

type Options<T> = {
  /**
   * Busca uma página. Deve ser estável (`useCallback`) e depender dos filtros:
   * trocar a identidade da função dispara nova busca. Ao mudar filtros, volte `page` para 1.
   */
  fetchPage: (page: number) => Promise<PaginatedPage<T>>;
  fallbackError: string;
  /** Ordenação/normalização aplicada aos itens recebidos. */
  transform?: (items: T[]) => T[];
};

type State<T> = {
  request: object | null;
  items: T[];
  total: number;
  totalPages: number;
  error: string;
};

/**
 * Lista paginada no servidor. Respostas de buscas antigas são descartadas (sem corrida) e
 * uma página além do total é corrigida para a última. `loading` é derivado: dura até a
 * busca atual terminar, sem precisar de setState dentro do efeito.
 */
export function usePaginatedList<T>({ fetchPage, fallbackError, transform }: Options<T>) {
  const [page, setPage] = useState(1);
  const [reloadCount, setReloadCount] = useState(0);
  const [state, setState] = useState<State<T>>({
    request: null,
    items: [],
    total: 0,
    totalPages: 1,
    error: '',
  });

  // Nova identidade a cada combinação filtros/página/recarga.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const request = useMemo(() => ({}), [fetchPage, page, reloadCount]);

  useEffect(() => {
    let active = true;

    fetchPage(page)
      .then((data) => {
        if (!active) return;
        const nextTotalPages = Math.max(1, data.totalPages ?? 1);
        if (page > nextTotalPages) {
          setPage(nextTotalPages);
          return;
        }
        const items = data.items ?? [];
        setState({
          request,
          items: transform ? transform(items) : items,
          total: data.total ?? 0,
          totalPages: nextTotalPages,
          error: '',
        });
      })
      .catch((error) => {
        if (!active) return;
        setState((current) => ({ ...current, request, error: errorMessage(error, fallbackError) }));
      });

    return () => {
      active = false;
    };
    // `transform` e `fallbackError` são estáveis por contrato do chamador.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchPage, page, request]);

  const setItems = useCallback((update: (items: T[]) => T[]) => {
    setState((current) => ({ ...current, items: update(current.items) }));
  }, []);

  const setTotal = useCallback((update: (total: number) => number) => {
    setState((current) => ({ ...current, total: update(current.total) }));
  }, []);

  const reload = useCallback(() => setReloadCount((count) => count + 1), []);

  return {
    items: state.items,
    total: state.total,
    totalPages: state.totalPages,
    page,
    setPage,
    loading: state.request !== request,
    // O erro só vale para a busca que falhou; ao recarregar, some até a nova resposta.
    error: state.request === request ? state.error : '',
    setItems,
    setTotal,
    reload,
  };
}
