'use client';

// importing hooks
import { usePathname } from 'next/navigation';

// importing components
import Link from 'next/link';

// importing context
import { useAuth } from '@/app/context';

// importing icons
import { FaWallet, FaTags, FaSignOutAlt, FaCalendar, FaMoneyBillWave } from 'react-icons/fa';

export default function AppSidebar() {
  const { logout } = useAuth();
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 w-72 h-screen flex flex-col backdrop-blur-2xl 
      bg-white/60 dark:bg-slate-900/60 border-r border-white/20 dark:border-slate-800
      shadow-xl z-40"
    >
      <div className="p-6 border-b border-slate-300/20 dark:border-slate-700">
        <h1 className="text-xl font-bold tracking-tight">
          Controle Financeiro
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Organize com clareza
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-2">
        <SidebarLink
          href="/contas"
          icon={<FaWallet />}
          label="Contas"
          active={pathname?.startsWith('/contas')}
        />

        <SidebarLink
          href="/categorias"
          icon={<FaTags />}
          label="Categorias"
          active={pathname?.startsWith('/categorias')}
        />

        <SidebarLink
          href="/transacoes"
          icon={<FaMoneyBillWave />}
          label="Transações"
          active={pathname?.startsWith('/transacoes')}
        />

        <SidebarLink
          href="/calendario"
          icon={<FaCalendar />}
          label="Calendário"
          active={pathname === '/calendario'}
        />
      </div>

      <div className="p-6 border-t border-slate-300/40 dark:border-slate-700 space-y-2">
        <SidebarButton
          icon={<FaSignOutAlt />}
          label="Sair"
          onClick={logout}
          danger
        />
      </div>
    </aside>
  );
};

function SidebarLink({
  href,
  icon,
  label,
  active
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200
        ${active ? 'bg-purple-600 text-white shadow-md' 
          : 'text-slate-700 dark:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800'}
      `}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </Link>
  );
};

function SidebarButton({
  icon,
  label,
  onClick,
  danger = false,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200
        ${danger ? 'text-red-500 hover:bg-red-500/10'
          : 'text-slate-700 dark:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800'
        }
      `}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );
};
