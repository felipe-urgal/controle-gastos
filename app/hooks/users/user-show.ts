"use client";

import { userService } from "@/app/services/userService";
import { User } from "@/app/types/user";
import { useShow } from "@/app/hooks/crud/show";
import { useDelete } from "@/app/hooks/crud/delete";

export function useUser({ id }: { id: string }) {
  const { entity: user, loading: loadingUser } =
    useShow<User>({
      id,
      service: userService,
    });

  const handleBack = "";

  const {
    isDeleteModalOpen,
    setIsDeleteModalOpen,
    isDeleting,
    handleDelete,
  } = useDelete({
    redirectPath: "/",
    deleteService: userService.delete,
  });

  return {
    user,
    loading: loadingUser,
    isDeleteModalOpen,
    setIsDeleteModalOpen,
    isDeleting,
    handleDelete: () =>
      user && handleDelete(user.id),
    handleBack,
  };
};
