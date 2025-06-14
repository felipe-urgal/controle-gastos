"use client";

// context
import { useAuth } from "@/app/context/AuthContext";

// hooks
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated && !isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, isAuthenticated, router]);

  if (isLoading || !user) {
    return (
      <div className="max-w-5xl mx-auto p-4 flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return <>{children}</>;
}