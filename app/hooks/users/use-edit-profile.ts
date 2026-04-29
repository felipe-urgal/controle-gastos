"use client";

import { useEffect, useState } from "react";
import { authService } from "@/app/services/auth-service";
import { User } from "@/app/types/user";

export function useEditProfile({ id }: { id: string }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);

        const currentUser = await authService.getCurrentUser();
        setUser(currentUser);
      } catch {
        setError("Não foi possível carregar os dados do usuário");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  return {
    user,
    setUser,
    loading,
    error,
    handleBack: `/usuario/show/${id}`,
  };
};
