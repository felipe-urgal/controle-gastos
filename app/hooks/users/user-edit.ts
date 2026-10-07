"use client";

import { useEffect, useState } from "react";

import { userService } from "@/app/services/user-service";
import { User } from "@/app/types/user";

export function useUser({ id }: { id: string }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const response = await userService.getCurrent();
        if (active) setUser(response.data);
      } catch {
        if (active) setError("Não foi possível carregar os dados do usuário");
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, []);

  return {
    user,
    loading,
    error,
    handleBack: `/usuario/show/${id}`,
  };
}
