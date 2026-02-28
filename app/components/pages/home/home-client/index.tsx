// app/page.tsx
"use client";

// importing hooks
import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";

// importing context
import { useAuth } from "@/app/context";

// importing components
import { Header, HeroSection, HowItWorks, Footer } from "@/app/components/pages/home";
import { BackgroundParticles } from "@/app/components/layout";
import { SplashScreen } from "@/app/components/feedback";

// importing utils
import { ANIMATION_CONFIG, ROUTES } from "@/app/utils/home/animation";

export default function HomeClient() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [saldo, setSaldo] = useState(0);
  const [isPageReady, setIsPageReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      try {
        router.replace(ROUTES.DASHBOARD);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Erro ao redirecionar"));
      }
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    const { SALDO_TARGET, SALDO_INTERVAL } = ANIMATION_CONFIG;
    const duration = 1000;
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

  useEffect(() => {
    const timer = setTimeout(() => setIsPageReady(true), ANIMATION_CONFIG.HERO_DELAY);
    return () => clearTimeout(timer);
  }, []);

  const formattedSaldo = useMemo(() => 
    saldo.toLocaleString("pt-BR", { 
      minimumFractionDigits: 2,
      maximumFractionDigits: 2 
    }),
  [saldo]);

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
  };

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
};
