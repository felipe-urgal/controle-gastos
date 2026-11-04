// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { merchantGetAll, aliasGetAll } = vi.hoisted(() => ({ merchantGetAll: vi.fn(), aliasGetAll: vi.fn() }));

vi.mock('@/app/components/layout', () => ({ ProtectedRoute: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('@/app/context', () => ({ useAuth: () => ({ user: { showValues: true } }) }));
vi.mock('@/app/services/merchant-service', () => ({
  merchantService: { getAll: merchantGetAll, getById: vi.fn(), update: vi.fn(), create: vi.fn(), delete: vi.fn() },
}));
vi.mock('@/app/services/merchant-alias-service', () => ({
  merchantAliasService: { getAll: aliasGetAll, preview: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn(), reassign: vi.fn() },
}));

import MerchantsPage from '@/app/components/pages/merchant/merchants-page';

const merchant = (id: string, name: string) => ({
  id,
  name,
  isActive: true,
  transactionsCount: 0,
  aliasesCount: 0,
  createdAt: '',
  updatedAt: '',
});

class FakeIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

beforeEach(() => {
  vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
  // jsdom não tem matchMedia (framer-motion / hooks de movimento reduzido).
  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
    onchange: null,
  })) as typeof window.matchMedia;
  merchantGetAll.mockImplementation(async (params: { page?: number }) => ({
    data: {
      items: params.page === 2 ? [merchant('m3', 'Padaria Sol')] : [merchant('m1', 'Mercado Bom'), merchant('m2', 'Posto Azul')],
      total: 12,
      totalPages: 2,
    },
  }));
  aliasGetAll.mockResolvedValue({ data: { items: [], total: 0, page: 1, pageSize: 10, totalPages: 1 } });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('MerchantsPage', () => {
  it('carrega e mostra os estabelecimentos e o total', async () => {
    render(<MerchantsPage />);

    expect(await screen.findByText('Mercado Bom')).toBeTruthy();
    expect(screen.getByText('Posto Azul')).toBeTruthy();
    expect(screen.getByText('12 cadastrado(s)')).toBeTruthy();
    expect(screen.getByText('Nenhum alias encontrado.')).toBeTruthy();
  });

  it('mostra o erro da lista sem derrubar a tela', async () => {
    merchantGetAll.mockRejectedValue(new Error('servidor caiu'));
    render(<MerchantsPage />);

    expect(await screen.findByText('servidor caiu')).toBeTruthy();
    expect(screen.getByText('Nenhum estabelecimento encontrado.')).toBeTruthy();
  });

  it('buscar volta para a página 1 e envia o termo à API', async () => {
    render(<MerchantsPage />);
    await screen.findByText('Mercado Bom');

    fireEvent.change(screen.getByLabelText('Buscar estabelecimentos'), { target: { value: 'padaria' } });

    await waitFor(() =>
      expect(merchantGetAll).toHaveBeenCalledWith(expect.objectContaining({ page: 1, search: 'padaria', pageSize: 10 })),
    );
  });
});
