"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/app/context";
import { ApiClientError } from "@/app/services/api-client";
import {
  type DeleteAccountInput,
  userService,
} from "@/app/services/user-service";
import { User } from "@/app/types/user";

export function useUser() {
  const router = useRouter();
  const { requireReauthentication } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loadVersion, setLoadVersion] = useState(0);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoadingUser(true);
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

        setError("Não foi possível carregar seu perfil. Verifique sua conexão e tente novamente.");
      } finally {
        if (active) setLoadingUser(false);
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [loadVersion, requireReauthentication]);

  async function handleDelete(credentials: DeleteAccountInput) {
    try {
      setIsDeleting(true);
      await userService.deleteAccount(credentials);
      router.push("/");
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
    }
  }

  return {
    user,
    setUser,
    loading: loadingUser,
    error,
    notFound,
    retry: () => setLoadVersion((current) => current + 1),
    isDeleteModalOpen,
    setIsDeleteModalOpen,
    isDeleting,
    handleDelete,
  };
}
