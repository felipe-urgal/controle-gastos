"use client";

import { userService } from "@/app/services/userService";
import { User } from "@/app/types/user";
import { useEdit } from "@/app/hooks/crud/edit";

export function useUser({ id }: { id: string }) {
  const { entity, ...rest } = useEdit<User>({
    id,
    service: userService,
    backPath: `/usuario/show/${id}`,
    errorMessage: "Não foi possível carregar os dados do usuário",
  });

  return {
    user: entity,
    ...rest,
  };
};
