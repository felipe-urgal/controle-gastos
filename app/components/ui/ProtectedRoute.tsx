"use client";

// context
import { useAuth } from "@/app/context/AuthContext";

// hooks
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// components
import { LoadingSpinner } from "./LoadingSpinner";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

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
      <div className="min-h-screen flex flex-col justify-center items-center">
        <div className="flex flex-col items-center space-y-4 p-8 bg-white dark:bg-slate-850 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
          <LoadingSpinner size="lg" />
          <div className="text-center">
            <p className="text-slate-700 dark:text-slate-300 font-medium">
              {redirecting ? "Redirecionando..." : "Verificando autenticação"}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {redirecting ? "Você será redirecionado em instantes" : "Por favor, aguarde"}
            </p>
          </div>
        </div>
        <ToastContainer
          position="bottom-right"
          autoClose={1000}
          hideProgressBar
          theme="colored"
        />
      </div>
    );
  }

  return (
    <>
      {children}
      <ToastContainer
        position="bottom-right"
        autoClose={3000}
        hideProgressBar
        theme="colored"
      />
    </>
  );
}