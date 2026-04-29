"use client";

import { useEffect, useState } from "react";
import { useDelete } from "@/app/hooks/crud/delete";
import { authService } from "@/app/services/auth-service";
import { User } from "@/app/types/user";

export function useProfile() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const {
    isDeleteModalOpen,
    setIsDeleteModalOpen,
    isDeleting,
    handleDelete,
  } = useDelete({
    redirectPath: "/login",
    deleteService: async () => {
      await authService.deleteAccount();
      return {
        success: true,
        data: null,
      };
    },
  });

  useEffect(() => {
    async function load() {
      try {
        const currentUser = await authService.getCurrentUser();
        setUser(currentUser);
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
    isDeleteModalOpen,
    setIsDeleteModalOpen,
    isDeleting,
    handleDelete: () => user && handleDelete(user.id),
    handleBack: "/contas",
  };
};
