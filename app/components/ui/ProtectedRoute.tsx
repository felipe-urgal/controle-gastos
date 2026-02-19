"use client";

import { useAuth } from "@/app/context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { SplashScreen } from "@/app/components";
import { useStandalone } from "@/app/hook";

export default function ProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const { isStandalone } = useStandalone();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/");
    }
  }, [isAuthenticated, isLoading, router]);

  const marginTopClass = isStandalone ? 'mt-12 mb-4' : 'my-4';

  if (isLoading) {
    return (
      <SplashScreen />
    );
  }

  if (!isAuthenticated) {
    return null; // evita flicker enquanto redireciona
  }

  return (
    <div className={`px-4 space-y-4 ${marginTopClass}`}>
      {children}
    </div>
  );
}
