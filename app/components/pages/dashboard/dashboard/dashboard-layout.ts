/**
 * Layout do Dashboard: quais seções aparecem e em que ordem. O topo (saldo disponível e atenção) é fixo.
 * A preferência vive no aparelho (como o tema), por usuário; ver docs/USER_PREFERENCES.md.
 */

export const DASHBOARD_SECTIONS = [
  { key: 'pace', label: 'Ritmo do mês e fluxo' },
  { key: 'pending', label: 'Pendentes' },
  { key: 'lists', label: 'Próximos, recentes e categorias' },
  { key: 'overview', label: 'Cartões, metas e patrimônio' },
  { key: 'summary', label: 'Resumo periódico' },
] as const;

export type DashboardSectionKey = (typeof DASHBOARD_SECTIONS)[number]['key'];

export type DashboardLayout = { order: DashboardSectionKey[]; hidden: DashboardSectionKey[] };

const KEYS: readonly DashboardSectionKey[] = DASHBOARD_SECTIONS.map((section) => section.key);

export const DEFAULT_DASHBOARD_LAYOUT: DashboardLayout = { order: [...KEYS], hidden: [] };

const isKey = (value: unknown): value is DashboardSectionKey => typeof value === 'string' && (KEYS as readonly string[]).includes(value);

/**
 * Aceita qualquer coisa guardada e devolve um layout válido: chaves desconhecidas somem, repetidas contam uma vez e
 * seções novas (que o aparelho nunca viu) entram ao final, visíveis. Assim uma versão nova do app nunca "perde" uma seção.
 */
export function normalizeDashboardLayout(raw: unknown): DashboardLayout {
  const source = raw && typeof raw === 'object' ? (raw as { order?: unknown; hidden?: unknown }) : {};
  const order: DashboardSectionKey[] = [];
  for (const value of Array.isArray(source.order) ? source.order : []) {
    if (isKey(value) && !order.includes(value)) order.push(value);
  }
  for (const key of KEYS) if (!order.includes(key)) order.push(key);

  const hidden = [...new Set((Array.isArray(source.hidden) ? source.hidden : []).filter(isKey))];
  return { order, hidden };
}

export function moveDashboardSection(layout: DashboardLayout, key: DashboardSectionKey, direction: -1 | 1): DashboardLayout {
  const index = layout.order.indexOf(key);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= layout.order.length) return layout;
  const order = [...layout.order];
  [order[index], order[target]] = [order[target], order[index]];
  return { ...layout, order };
}

export function toggleDashboardSection(layout: DashboardLayout, key: DashboardSectionKey): DashboardLayout {
  return {
    ...layout,
    hidden: layout.hidden.includes(key) ? layout.hidden.filter((item) => item !== key) : [...layout.hidden, key],
  };
}

export function visibleDashboardSections(layout: DashboardLayout): DashboardSectionKey[] {
  return layout.order.filter((key) => !layout.hidden.includes(key));
}

export function dashboardLayoutStorageKey(userId: string) {
  return `controle-gastos:dashboard-layout:${userId}`;
}

export function readDashboardLayout(storage: Pick<Storage, 'getItem'>, key: string): DashboardLayout {
  try {
    const raw = storage.getItem(key);
    return raw ? normalizeDashboardLayout(JSON.parse(raw)) : { ...DEFAULT_DASHBOARD_LAYOUT, order: [...KEYS] };
  } catch {
    return { ...DEFAULT_DASHBOARD_LAYOUT, order: [...KEYS] };
  }
}

export function writeDashboardLayout(storage: Pick<Storage, 'setItem'>, key: string, layout: DashboardLayout) {
  try {
    storage.setItem(key, JSON.stringify(layout));
  } catch {
    // Armazenamento cheio ou bloqueado: o layout vale nesta sessão, só não persiste.
  }
}
