"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { useShow } from "@/app/hooks/crud/show";
import {
  type DeleteAccountInput,
  userService,
} from "@/app/services/user-service";
import { User } from "@/app/types/user";

export function useUser({ id }: { id: string }) {
  const router = useRouter();
  const {
    entity: user,
    setEntity: setUser,
    loading: loadingUser,
  } = useShow<User>({
    id,
    service: userService,
  });

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const handleBack = "";

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
