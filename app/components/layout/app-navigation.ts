import type { IconType } from 'react-icons';
import {
  FaCalendarAlt,
  FaChartPie,
  FaMoneyBillWave,
  FaTags,
  FaUser,
  FaWallet,
} from 'react-icons/fa';

export type AppNavigationItem = {
  key: 'dashboard' | 'accounts' | 'categories' | 'transactions' | 'calendar' | 'profile';
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
      key: 'categories',
      label: 'Categorias',
      href: '/categorias',
      icon: FaTags,
      isActive: (pathname) => pathname === '/categorias' || pathname.startsWith('/categorias/'),
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
