"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/app/context";
import {
  FaCalendar,
  FaWallet,
  FaTags,
  FaSignOutAlt,
  FaMoneyBillWave,
} from "react-icons/fa";
import { motion } from "framer-motion";
import { useEffect, useRef } from "react";

const navItems = [
  { href: "/contas", label: "Contas", icon: <FaWallet /> },
  { href: "/categorias", label: "Categorias", icon: <FaTags /> },
  { href: "/calendario", label: "Calendário", icon: <FaCalendar /> },
  { href: "/transacoes", label: "Transações", icon: <FaMoneyBillWave /> },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { logout } = useAuth();
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

      container.scrollTo({
        left: scrollLeft,
        behavior: "smooth",
      });
    }
  }, [pathname]);

  return (
    <nav
      className="
        fixed bottom-6 left-1/2 -translate-x-1/2 z-50
        max-w-2xl w-[95%]
      "
    >
      <div
        ref={containerRef}
        className="
          relative flex items-center
          p-2
          overflow-x-auto overflow-y-hidden
          scrollbar-none
          rounded-2xl
          bg-white/70 dark:bg-slate-900/70
          backdrop-blur-2xl
          border border-white/20 dark:border-slate-700
          shadow-[0_20px_60px_-15px_rgba(0,0,0,0.4)]
        "
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
              className="relative flex-shrink-0"
            >
              {active && (
                <motion.div
                  layoutId="bottom-pill"
                  transition={{
                    type: "spring",
                    stiffness: 500,
                    damping: 35,
                  }}
                  className="
                    absolute inset-0
                    bg-purple-600
                    rounded-xl
                  "
                />
              )}

              <motion.div
                whileTap={{ scale: 0.92 }}
                whileHover={{ scale: 1.05 }}
                className={`
                  relative z-10
                  flex flex-col items-center justify-center
                  p-3
                  min-w-[75px]
                  rounded-xl
                  text-xs font-medium
                  transition-colors duration-300
                  ${
                    active
                      ? "text-white"
                      : "text-slate-500 dark:text-slate-400"
                  }
                `}
              >
                <div className="text-lg">{item.icon}</div>
              </motion.div>
            </Link>
          );
        })}

        <motion.button
          whileTap={{ scale: 0.92 }}
          className="
            flex flex-col items-center justify-center
            p-3 min-w-[75px]
            text-red-500 text-xs font-medium
            rounded-xl
          "
          onClick={logout}
        >
          <FaSignOutAlt className="text-lg" />
        </motion.button>
      </div>
    </nav>
  );
}
