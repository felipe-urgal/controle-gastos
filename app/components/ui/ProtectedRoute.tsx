"use client";

// context
import { useAuth } from "@/app/context";

// hooks
import { useRouter } from "next/navigation";

import { useEffect, useState } from "react";

// components
import { Loading } from "@/app/components";

import { toast } from "react-toastify";

export default function ProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !user) {
      setRedirecting(true);
      toast.info("Redirecionando para login...");
      
      const timer = setTimeout(() => {
        router.push("/login");
      }, 1500);
      
      return () => clearTimeout(timer);
    }
  }, [user, isLoading, isAuthenticated, router]);

  if (isLoading || redirecting || !user) {
    return (
      <div className="min-h-dvh flex flex-col justify-center items-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="text-center">
          <Loading text={redirecting ? "Redirecionando..." : "Verificando autenticação..."}/>
        </div>
      </div>
    );
  }

  return (
    <>
      {children}
    </>
  );
}