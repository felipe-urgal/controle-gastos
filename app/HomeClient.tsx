// app/page.tsx
"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context";
import { SplashScreen, Header, HeroSection, HowItWorks, Footer, BackgroundParticles } from "@/app/components";
import { ANIMATION_CONFIG, ROUTES } from "@/app/utils/home/animation";

export default function HomeClient() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [saldo, setSaldo] = useState(0);
  const [isPageReady, setIsPageReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Redirecionamento com tratamento de erro
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      try {
        router.replace(ROUTES.DASHBOARD);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Erro ao redirecionar"));
        console.error("Erro ao redirecionar:", err);
      }
    }
  }, [isAuthenticated, isLoading, router]);

  // Animação do saldo mais suave
  useEffect(() => {
    const { SALDO_TARGET, SALDO_INTERVAL } = ANIMATION_CONFIG;
    const duration = 1000; // 1 segundo
    const totalIntervals = duration / SALDO_INTERVAL;
    const increment = SALDO_TARGET / totalIntervals;

    let currentValue = 0;
    let animationFrame: number;

    const updateSaldo = () => {
      currentValue = Math.min(currentValue + increment, SALDO_TARGET);
      setSaldo(Math.round(currentValue));
      
      if (currentValue < SALDO_TARGET) {
        animationFrame = requestAnimationFrame(updateSaldo);
      }
    };

    animationFrame = requestAnimationFrame(updateSaldo);

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, []);

  // Marcar página como pronta
  useEffect(() => {
    const timer = setTimeout(() => setIsPageReady(true), ANIMATION_CONFIG.HERO_DELAY);
    return () => clearTimeout(timer);
  }, []);

  // Formatar saldo com memoization
  const formattedSaldo = useMemo(() => 
    saldo.toLocaleString("pt-BR", { 
      minimumFractionDigits: 2,
      maximumFractionDigits: 2 
    }),
  [saldo]);

  // Handler para reload em caso de erro
  const handleReload = useCallback(() => {
    window.location.reload();
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">
            Ops! Algo deu errado
          </h2>
          <button
            onClick={handleReload}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) return <SplashScreen />;
  if (isAuthenticated) return null;

  return (
    <div className="relative min-h-screen overflow-hidden bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <BackgroundParticles />
      </div>

      <div className="fixed inset-0 -z-10" aria-hidden="true">
        <div className="absolute top-[-300px] left-1/2 -translate-x-1/2 w-[900px] h-[900px] bg-purple-500/20 blur-[140px] rounded-full" />
        <div className="absolute bottom-[-300px] right-[-300px] w-[600px] h-[600px] bg-indigo-500/20 blur-[140px] rounded-full" />
      </div>

      <Header />
      
      <main>
        {isPageReady && (
          <>
            <HeroSection formattedSaldo={formattedSaldo} />
            <HowItWorks />
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
