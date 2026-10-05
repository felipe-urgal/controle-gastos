"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type UseDeleteProps<T = any> = {
  redirectPath: string;
  deleteService: (id: string) => Promise<T>;
};

export function useDelete<T = any>({
  redirectPath,
  deleteService,
}: UseDeleteProps<T>) {
  const router = useRouter();

  const [isDeleteModalOpen, setDeleteModalOpenState] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function setIsDeleteModalOpen(value: boolean) {
    if (!isDeleting) {
      setDeleteError(null);
      setDeleteModalOpenState(value);
    }
  }

  async function handleDelete(id: string) {
    setIsDeleting(true);
    setDeleteError(null);

    try {
      await deleteService(id);
      setDeleteModalOpenState(false);
      router.push(redirectPath);
    } catch (error) {
      setDeleteError(
        error instanceof Error ? error.message : "Erro ao excluir registro",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  return {
    isDeleteModalOpen,
    setIsDeleteModalOpen,
    isDeleting,
    deleteError,
    handleDelete,
  };
};
