"use client";

import { useEffect, useState } from "react";

import { useAuth } from "@/app/context";
import { ApiClientError } from "@/app/services/api-client";
import { userService } from "@/app/services/user-service";
import { User } from "@/app/types/user";

export function useUser() {
  const { requireReauthentication } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loadVersion, setLoadVersion] = useState(0);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        setNotFound(false);

        const response = await userService.getCurrent();
        if (active) setUser(response.data);
      } catch (caught) {
        if (!active) return;

        setUser(null);

        if (caught instanceof ApiClientError && caught.status === 401) {
          requireReauthentication();
          return;
        }

        if (caught instanceof ApiClientError && caught.status === 404) {
          setNotFound(true);
          return;
        }

        setError("Não foi possível carregar os dados do perfil. Tente novamente.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [loadVersion, requireReauthentication]);

  return {
    user,
    loading,
    error,
    notFound,
    retry: () => setLoadVersion((current) => current + 1),
    handleBack: "/usuario",
  };
}
