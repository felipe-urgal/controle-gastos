import { describe, expect, it } from 'vitest';

import {
  DEFAULT_DASHBOARD_LAYOUT,
  dashboardLayoutStorageKey,
  moveDashboardSection,
  normalizeDashboardLayout,
  readDashboardLayout,
  toggleDashboardSection,
  visibleDashboardSections,
  writeDashboardLayout,
} from '@/app/components/pages/dashboard/dashboard/dashboard-layout';

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => void data.set(key, value) };
}

describe('normalizeDashboardLayout', () => {
  it('descarta chaves desconhecidas e repetidas e acrescenta no fim as seções que faltam', () => {
    const layout = normalizeDashboardLayout({ order: ['overview', 'nao-existe', 'overview', 'pace'], hidden: ['pending', 'x', 'pending'] });
    expect(layout.order).toEqual(['overview', 'pace', 'pending', 'lists', 'summary']);
    expect(layout.hidden).toEqual(['pending']);
  });

  it('lixo vira o layout padrão', () => {
    for (const raw of [null, undefined, 42, 'abc', [], { order: 'x', hidden: 3 }]) {
      expect(normalizeDashboardLayout(raw)).toEqual(DEFAULT_DASHBOARD_LAYOUT);
    }
  });
});

describe('mover, ocultar e ler as seções visíveis', () => {
  it('troca a posição com a vizinha e não passa das pontas', () => {
    const moved = moveDashboardSection(DEFAULT_DASHBOARD_LAYOUT, 'lists', -1);
    expect(moved.order).toEqual(['pace', 'lists', 'pending', 'overview', 'summary']);
    expect(moveDashboardSection(moved, 'pace', -1)).toBe(moved);
    expect(moveDashboardSection(moved, 'summary', 1)).toBe(moved);
  });

  it('oculta e reexibe sem perder a ordem', () => {
    const hidden = toggleDashboardSection(DEFAULT_DASHBOARD_LAYOUT, 'pending');
    expect(visibleDashboardSections(hidden)).toEqual(['pace', 'lists', 'overview', 'summary']);
    expect(visibleDashboardSections(toggleDashboardSection(hidden, 'pending'))).toEqual(DEFAULT_DASHBOARD_LAYOUT.order);
  });
});

describe('armazenamento no aparelho', () => {
  it('grava e lê por usuário, e conteúdo inválido cai no padrão', () => {
    const storage = memoryStorage();
    const layout = toggleDashboardSection(moveDashboardSection(DEFAULT_DASHBOARD_LAYOUT, 'overview', -1), 'summary');
    writeDashboardLayout(storage, dashboardLayoutStorageKey('a'), layout);
    expect(readDashboardLayout(storage, dashboardLayoutStorageKey('a'))).toEqual(layout);
    expect(readDashboardLayout(storage, dashboardLayoutStorageKey('b'))).toEqual(DEFAULT_DASHBOARD_LAYOUT);
    expect(readDashboardLayout(memoryStorage({ k: '{ruim' }), 'k')).toEqual(DEFAULT_DASHBOARD_LAYOUT);
  });

  it('não propaga erro de armazenamento cheio', () => {
    const broken = { setItem: () => { throw new Error('QuotaExceededError'); } };
    expect(() => writeDashboardLayout(broken, 'k', DEFAULT_DASHBOARD_LAYOUT)).not.toThrow();
  });
});
