export const ANIMATION_CONFIG = {
  SALDO_TARGET: 1450,
  SALDO_STEP: 50,
  SALDO_INTERVAL: 25,
  DURATION_FAST: 0.8,
  DURATION_SLOW: 1,
  HERO_DELAY: 100,
  MOCK_DELAY: 200
};

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/criar-conta',
  DASHBOARD: '/contas'
} as const;

export const MOCK_DATA = {
  RECEITAS: 4200,
  DESPESAS: 2750
} as const;