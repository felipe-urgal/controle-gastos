// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { usePaginatedList, type PaginatedPage } from '@/app/hooks/use-paginated-list';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const page = (items: number[], total = items.length, totalPages = 1): PaginatedPage<number> => ({ items, total, totalPages });

describe('usePaginatedList', () => {
  it('começa carregando e carrega a primeira página', async () => {
    const fetchPage = vi.fn(async (pageNumber: number) => page([pageNumber], 1, 1));
    const { result } = renderHook(() => usePaginatedList<number>({ fetchPage, fallbackError: 'erro' }));

    expect(result.current.loading).toBe(true);
    expect(result.current.items).toEqual([]);

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.items).toEqual([1]);
    expect(result.current.total).toBe(1);
    expect(result.current.error).toBe('');
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });

  it('trocar a página busca a nova e mostra carregando até chegar', async () => {
    const fetchPage = vi.fn(async (pageNumber: number) => page([pageNumber * 10], 30, 3));
    const { result } = renderHook(() => usePaginatedList<number>({ fetchPage, fallbackError: 'erro' }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setPage(2));
    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.items).toEqual([20]);
    expect(result.current.page).toBe(2);
    expect(result.current.totalPages).toBe(3);
  });

  it('descarta a resposta de uma busca antiga que chega depois da nova (sem corrida)', async () => {
    const slow = deferred<PaginatedPage<string>>();
    const slowFetch = () => slow.promise;
    const fastFetch = async () => ({ items: ['novo'], total: 1, totalPages: 1 });

    const { result, rerender } = renderHook(
      ({ fetchPage }) => usePaginatedList<string>({ fetchPage, fallbackError: 'erro' }),
      { initialProps: { fetchPage: slowFetch } },
    );

    // O usuário muda o filtro: nova função de busca, a anterior ainda não respondeu.
    rerender({ fetchPage: fastFetch });
    await waitFor(() => expect(result.current.items).toEqual(['novo']));

    await act(async () => {
      slow.resolve({ items: ['antigo'], total: 1, totalPages: 1 });
      await slow.promise;
    });

    expect(result.current.items).toEqual(['novo']);
    expect(result.current.loading).toBe(false);
  });

  it('página além do total é corrigida para a última e busca de novo', async () => {
    const fetchPage = vi.fn(async (pageNumber: number) => page([pageNumber], 5, 2));
    const { result } = renderHook(() => usePaginatedList<number>({ fetchPage, fallbackError: 'erro' }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setPage(9));

    await waitFor(() => expect(result.current.page).toBe(2));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.items).toEqual([2]);
  });

  it('erro mostra a mensagem do erro (ou a padrão) e para de carregar; recarregar limpa o erro', async () => {
    const fetchPage = vi
      .fn<(pageNumber: number) => Promise<PaginatedPage<number>>>()
      .mockRejectedValueOnce(new Error('servidor caiu'))
      .mockResolvedValueOnce(page([7]));
    const { result } = renderHook(() => usePaginatedList<number>({ fetchPage, fallbackError: 'erro padrão' }));

    await waitFor(() => expect(result.current.error).toBe('servidor caiu'));
    expect(result.current.loading).toBe(false);

    act(() => result.current.reload());
    expect(result.current.error).toBe('');
    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.items).toEqual([7]));
    expect(result.current.error).toBe('');
  });

  it('erro sem mensagem usa o texto padrão', async () => {
    // A função de busca precisa ser estável (como um useCallback na tela); uma nova a cada render refaria a busca sem parar.
    const fetchPage = () => Promise.reject({});
    const { result } = renderHook(() => usePaginatedList<number>({ fetchPage, fallbackError: 'erro padrão' }));
    await waitFor(() => expect(result.current.error).toBe('erro padrão'));
  });

  it('transform ordena os itens recebidos', async () => {
    const fetchPage = async () => page([3, 1, 2]);
    const transform = (items: number[]) => [...items].sort((a, b) => a - b);
    const { result } = renderHook(() => usePaginatedList<number>({ fetchPage, fallbackError: 'erro', transform }));
    await waitFor(() => expect(result.current.items).toEqual([1, 2, 3]));
  });

  it('setItems e setTotal ajustam a lista na tela sem nova busca (atualização otimista)', async () => {
    const fetchPage = vi.fn(async () => page([1, 2, 3], 3));
    const { result } = renderHook(() => usePaginatedList<number>({ fetchPage, fallbackError: 'erro' }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.setItems((items) => items.filter((item) => item !== 2));
      result.current.setTotal((total) => total - 1);
    });

    expect(result.current.items).toEqual([1, 3]);
    expect(result.current.total).toBe(2);
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });

  it('resposta sem items/total/totalPages vira lista vazia, total 0 e 1 página', async () => {
    const fetchPage = async () => ({});
    const { result } = renderHook(() => usePaginatedList<number>({ fetchPage, fallbackError: 'erro' }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current).toMatchObject({ items: [], total: 0, totalPages: 1, error: '' });
  });
});
