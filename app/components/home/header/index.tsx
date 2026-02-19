"use client";

import Link from "next/link";
import { ROUTES } from "@/app/utils/home/animation";
import { useEffect, useState } from "react";

export default function Header() {
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const isInStandaloneMode = () =>
      window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in window.navigator && (window.navigator as any).standalone) ||
      document.referrer.includes('android-app://');

    setIsStandalone(isInStandaloneMode());

    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleChange = (e: MediaQueryListEvent) => {
      setIsStandalone(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Determina a classe margin-top baseado no estado
  const marginTopClass = isStandalone ? 'mt-9' : 'mt-0';

  return (
    <header className={`fixed top-0 w-full backdrop-blur-xl bg-white/70 dark:bg-slate-950/70 border-0 lg:border-b border-slate-200 dark:border-slate-800 z-50 ${marginTopClass}`}>
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link 
          href={ROUTES.HOME}
          className="font-semibold tracking-tight text-lg hover:opacity-80 transition"
          aria-label="Página inicial"
        >
          Controle
        </Link>
        
        <nav className="flex items-center gap-4 sm:gap-6 text-sm" aria-label="Navegação principal">
          <Link 
            href={ROUTES.LOGIN} 
            className="hover:opacity-70 transition px-3 py-2 rounded-lg"
            aria-label="Fazer login"
          >
            Login
          </Link>
          <Link
            href={ROUTES.REGISTER}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-all duration-300 shadow-md hover:shadow-purple-500/30 hover:scale-[1.02] focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
            aria-label="Criar nova conta"
          >
            Criar conta
          </Link>
        </nav>
      </div>
    </header>
  );
}
