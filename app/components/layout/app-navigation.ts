import type { IconType } from 'react-icons';
import {
  FaCalendarAlt,
  FaCalendarCheck,
  FaBalanceScale,
  FaBullseye,
  FaBriefcase,
  FaChartLine,
  FaChartPie,
  FaCoins,
  FaFileInvoiceDollar,
  FaMoneyBillWave,
  FaStore,
  FaListUl,
  FaBookmark,
  FaSyncAlt,
  FaTags,
  FaUser,
  FaWallet,
} from 'react-icons/fa';

export type AppNavigationItem = {
  key: 'dashboard' | 'closing' | 'comparison' | 'commitments' | 'templates' | 'accounts' | 'net-worth' | 'investments' | 'payroll' | 'debts' | 'recurrences' | 'goals' | 'categories' | 'merchants' | 'tags' | 'transactions' | 'calendar' | 'profile';
  label: string;
  href: string;
  icon: IconType;
  isActive: (pathname: string) => boolean;
};

export function getAppNavigation(userId?: string | null): AppNavigationItem[] {
  return [
    {
      key: 'dashboard',
      label: 'Dashboard',
      href: '/dashboard',
      icon: FaChartPie,
      isActive: (pathname) => pathname === '/dashboard' || pathname.startsWith('/dashboard/'),
    },
    {
      key: 'closing',
      label: 'Fechamento',
      href: '/fechamento',
      icon: FaCalendarCheck,
      isActive: (pathname) => pathname === '/fechamento' || pathname.startsWith('/fechamento/'),
    },
    {
      key: 'comparison',
      label: 'Comparar',
      href: '/comparar',
      icon: FaBalanceScale,
      isActive: (pathname) => pathname === '/comparar' || pathname.startsWith('/comparar/'),
    },
    {
      key: 'commitments',
      label: 'Compromissos',
      href: '/compromissos',
      icon: FaListUl,
      isActive: (pathname) => pathname === '/compromissos' || pathname.startsWith('/compromissos/'),
    },
    {
      key: 'templates',
      label: 'Modelos',
      href: '/modelos',
      icon: FaBookmark,
      isActive: (pathname) => pathname === '/modelos' || pathname.startsWith('/modelos/'),
    },
    {
      key: 'transactions',
      label: 'Transações',
      href: '/transacoes',
      icon: FaMoneyBillWave,
      isActive: (pathname) => pathname === '/transacoes' || pathname.startsWith('/transacoes/'),
    },
    {
      key: 'accounts',
      label: 'Contas',
      href: '/contas',
      icon: FaWallet,
      isActive: (pathname) => pathname === '/contas' || pathname.startsWith('/contas/'),
    },
    {
      key: 'net-worth',
      label: 'Patrimônio',
      href: '/patrimonio',
      icon: FaChartLine,
      isActive: (pathname) => pathname === '/patrimonio' || pathname.startsWith('/patrimonio/'),
    },
    {
      key: 'investments',
      label: 'Investimentos',
      href: '/investimentos',
      icon: FaCoins,
      isActive: (pathname) => pathname === '/investimentos' || pathname.startsWith('/investimentos/'),
    },
    {
      key: 'payroll',
      label: 'Rendimentos',
      href: '/rendimentos-trabalho',
      icon: FaBriefcase,
      isActive: (pathname) => pathname === '/rendimentos-trabalho' || pathname.startsWith('/rendimentos-trabalho/'),
    },
    {
      key: 'debts',
      label: 'Dívidas',
      href: '/dividas',
      icon: FaFileInvoiceDollar,
      isActive: (pathname) => pathname === '/dividas' || pathname.startsWith('/dividas/'),
    },
    {
      key: 'recurrences',
      label: 'Recorrências',
      href: '/recorrencias',
      icon: FaSyncAlt,
      isActive: (pathname) => pathname === '/recorrencias' || pathname.startsWith('/recorrencias/'),
    },
    {
      key: 'goals',
      label: 'Metas',
      href: '/metas',
      icon: FaBullseye,
      isActive: (pathname) => pathname === '/metas' || pathname.startsWith('/metas/'),
    },
    {
      key: 'categories',
      label: 'Categorias',
      href: '/categorias',
      icon: FaTags,
      isActive: (pathname) => pathname === '/categorias' || pathname.startsWith('/categorias/'),
    },
    {
      key: 'merchants',
      label: 'Estabelecimentos',
      href: '/estabelecimentos',
      icon: FaStore,
      isActive: (pathname) => pathname === '/estabelecimentos' || pathname.startsWith('/estabelecimentos/'),
    },
    {
      key: 'tags',
      label: 'Tags',
      href: '/tags',
      icon: FaTags,
      isActive: (pathname) => pathname === '/tags' || pathname.startsWith('/tags/'),
    },
    {
      key: 'calendar',
      label: 'Calendário',
      href: '/calendario',
      icon: FaCalendarAlt,
      isActive: (pathname) => pathname === '/calendario' || pathname.startsWith('/calendario/'),
    },
    {
      key: 'profile',
      label: 'Perfil',
      href: userId ? `/usuario/show/${userId}` : '/usuario',
      icon: FaUser,
      isActive: (pathname) => pathname === '/usuario' || pathname.startsWith('/usuario/'),
    },
  ];
}

export const mobilePrimaryNavigationKeys = [
  'dashboard',
  'transactions',
  'accounts',
  'categories',
  'calendar',
] as const;
