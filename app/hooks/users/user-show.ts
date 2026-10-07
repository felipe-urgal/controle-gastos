"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  type DeleteAccountInput,
  userService,
} from "@/app/services/user-service";
import { User } from "@/app/types/user";

export function useUser() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const handleBack = "";

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const response = await userService.getCurrent();
        if (active) setUser(response.data);
      } finally {
        if (active) setLoadingUser(false);
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, []);

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
    isDeleteModalOpen,
    setIsDeleteModalOpen,
    isDeleting,
    handleDelete,
    handleBack,
  };
}
