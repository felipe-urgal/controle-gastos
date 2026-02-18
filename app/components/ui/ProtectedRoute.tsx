"use client";

import { useAuth } from "@/app/context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loading } from "@/app/components";

export default function ProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-dvh flex justify-center items-center">
        <Loading text="Verificando autenticação..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // evita flicker enquanto redireciona
  }

  return <>{children}</>;
}
