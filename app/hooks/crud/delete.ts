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

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete(id: string) {
    try {
      setIsDeleting(true);
      await deleteService(id);
      router.push(redirectPath);
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
    }
  }

  return {
    isDeleteModalOpen,
    setIsDeleteModalOpen,
    isDeleting,
    handleDelete,
  };
};
