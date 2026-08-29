"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/app/context";
import { HeroSection, HowItWorks, Footer } from "@/app/components/pages/home";
import { BackgroundParticles } from "@/app/components/layout";
import { SplashScreen } from "@/app/components/feedback";
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
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let animationFrame = 0;

    if (reduceMotion) {
      animationFrame = requestAnimationFrame(() => setSaldo(SALDO_TARGET));
      return () => cancelAnimationFrame(animationFrame);
    }

    const duration = 1000;
    const totalIntervals = duration / SALDO_INTERVAL;
    const increment = SALDO_TARGET / totalIntervals;

    let currentValue = 0;

    const updateSaldo = () => {
      currentValue = Math.min(currentValue + increment, SALDO_TARGET);
      setSaldo(Math.round(currentValue));

      if (currentValue < SALDO_TARGET) {
        animationFrame = requestAnimationFrame(updateSaldo);
      }
    };

    animationFrame = requestAnimationFrame(updateSaldo);

    return () => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
    };
  }, []);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduceMotion) {
      const frame = requestAnimationFrame(() => setIsPageReady(true));
      return () => cancelAnimationFrame(frame);
    }

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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-purple-950/40 to-indigo-950/30">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <BackgroundParticles />
        </div>

        <div className="text-center">
          <h2 className="text-lg font-bold mb-3">
            Ops! Algo deu errado
          </h2>
          <button
            type="button"
            onClick={handleReload}
            className="p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
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
    <div className="relative min-h-screen overflow-hidden">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <BackgroundParticles />
      </div>

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
