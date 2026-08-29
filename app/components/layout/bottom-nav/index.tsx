"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";

import { useAuth } from "@/app/context";

import { FaCalendar, FaWallet, FaTags, FaSignOutAlt, FaMoneyBillWave, FaUser } from "react-icons/fa";

export default function BottomNav() {
  const pathname = usePathname();
  const { logout, user } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const activeEl = containerRef.current?.querySelector(
      "[data-active='true']"
    ) as HTMLElement | null;

    if (activeEl && containerRef.current) {
      const container = containerRef.current;
      const scrollLeft =
        activeEl.offsetLeft -
        container.offsetWidth / 2 +
        activeEl.offsetWidth / 2;
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      container.scrollTo({
        left: scrollLeft,
        behavior: reduceMotion ? "auto" : "smooth",
      });
    }
  }, [pathname]);

  const navItems = [
    { href: "/contas", label: "Contas", icon: <FaWallet aria-hidden="true" /> },
    { href: "/categorias", label: "Categorias", icon: <FaTags aria-hidden="true" /> },
    { href: "/transacoes", label: "Transações", icon: <FaMoneyBillWave aria-hidden="true" /> },
    { href: "/calendario", label: "Calendário", icon: <FaCalendar aria-hidden="true" /> },
    { href: `/usuario/show/${user?.id}`, label: "Meu Perfil", icon: <FaUser aria-hidden="true" /> },
  ];

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed left-1/2 -translate-x-1/2 z-50 w-[90%] min-w-[100px] max-w-2xl"
      style={{ bottom: "max(1rem, env(safe-area-inset-bottom))" }}
    >
      <div
        ref={containerRef}
        className="relative flex items-center p-2 justify-center overflow-x-auto overflow-y-hidden
          scrollbar-none rounded-2xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl border border-white/5
          dark:border-white/5 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.4)]"
      >
        {navItems.map((item) => {
          const isExact = pathname === item.href;
          const isNested =
            item.href !== "/calendario" &&
            pathname.startsWith(item.href + "/");

          const active = isExact || isNested;

          return (
            <Link
              key={item.href}
              href={item.href}
              data-active={active}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              className="relative flex-shrink-0 rounded-xl"
            >
              {active && (
                <div aria-hidden="true" className="absolute inset-0 bg-purple-600 rounded-xl" />
              )}

              <div
                className={`relative z-10 flex flex-col items-center justify-center
                  p-3 min-w-[60px] rounded-xl text-xs font-medium transition-colors duration-300
                  ${active ? "text-white" : "text-slate-500 dark:text-slate-400"}
                `}
              >
                <div className="text-lg" aria-hidden="true">{item.icon}</div>
                <span className="sr-only">{item.label}</span>
              </div>
            </Link>
          );
        })}

        <button
          type="button"
          aria-label="Sair"
          className="flex flex-col items-center justify-center p-3 min-w-[60px]
            text-red-500 text-xs font-medium rounded-xl"
          onClick={logout}
        >
          <FaSignOutAlt className="text-lg" aria-hidden="true" />
          <span className="sr-only">Sair</span>
        </button>
      </div>
    </nav>
  );
};
