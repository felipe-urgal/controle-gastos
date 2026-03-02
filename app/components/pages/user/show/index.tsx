"use client";

// importing hooks
import { useUser } from "@/app/hooks/users/user-show";

// importing components
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
  } = useUser({ id });

  return (
    <ShowPage
      titleFallback="Usuario"
      entity={user}
      entityName="usuario"
      loading={loading}
      editUrl={`/usuario/alterar/${id}`}
      backUrl={handleBack}
      isDeleting={isDeleting}
      isDeleteModalOpen={isDeleteModalOpen}
      setIsDeleteModalOpen={setIsDeleteModalOpen}
      onDelete={handleDelete}
      // emptyRedirectTo="/contas"
    >
      <UserInfo
        user={user!}
        isDeleting={isDeleting}
      />
    </ShowPage>
  );
};
