"use client";

import { useProfile } from "@/app/hooks/users/use-profile";
import { ShowPage } from "@/app/components/base-pages";
import { UserInfo } from "@/app/components/pages/user";

export default function Show({ id }: { id: string }) {
  const {
    user,
    loading,
    isDeleteModalOpen,
    setIsDeleteModalOpen,
    isDeleting,
    handleDelete,
    handleBack,
  } = useProfile();

  return (
    <ShowPage
      titleFallback="Usuário"
      entity={user}
      entityName="usuário"
      loading={loading}
      editUrl={`/usuario/alterar/${id}`}
      backUrl={handleBack}
      isDeleting={isDeleting}
      isDeleteModalOpen={isDeleteModalOpen}
      setIsDeleteModalOpen={setIsDeleteModalOpen}
      onDelete={handleDelete}
    >
      {user && (
        <UserInfo
          user={user}
          isDeleting={isDeleting}
        />
      )}
    </ShowPage>
  );
};
