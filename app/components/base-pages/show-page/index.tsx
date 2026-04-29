"use client";

// importing components

import { PageHeader } from "@/app/components/base-pages";
import { PageLoading, PageEmpty } from "@/app/components/feedback";
import { DeleteOverlay, ConfirmationModal } from "@/app/components/overlays";

interface ShowPageProps<T> {
  entity: T | null | undefined;
  entityName: string;
  titleFallback?: string;
  description?: string;
  loading: boolean;

  editUrl: string;
  backUrl: string;

  isDeleting: boolean;
  isDeleteModalOpen: boolean;
  setIsDeleteModalOpen: (v: boolean) => void;
  onDelete: () => void;

  emptyRedirectTo?: string;

  children: React.ReactNode;
};

export default function ShowPage<T>({
  entity,
  entityName,
  titleFallback,
  description,
  loading,
  editUrl,
  backUrl,
  isDeleting,
  isDeleteModalOpen,
  setIsDeleteModalOpen,
  onDelete,
  emptyRedirectTo,
  children,
}: ShowPageProps<T>) {
  return (
    <>
      <DeleteOverlay
        isOpen={isDeleting}
        entityName={entityName}
        title={`Excluindo ${entityName}`}
      />

      <PageHeader
        title={titleFallback}
        description={description}
        backUrl={backUrl}
        editUrl={editUrl}
        onDelete={() => setIsDeleteModalOpen(true)}
        loading={loading}
        isDeleting={isDeleting}
      />

      {loading ? (
        <PageLoading type="details" />
      ) : !entity ? (
        <PageEmpty
          title={`${entityName.charAt(0).toUpperCase() + entityName.slice(1)} não encontrada`}
          redirectTo={emptyRedirectTo}
        />
      ) : (
        <>
          {children}

          <ConfirmationModal
            isOpen={isDeleteModalOpen}
            onClose={() => !isDeleting && setIsDeleteModalOpen(false)}
            onConfirm={onDelete}
            title={`Excluir ${entityName}`}
            message={`Tem certeza que deseja excluir ${
              (entity as any)?.name ?? entityName
            }? Esta ação não poderá ser desfeita.`}
            confirmText="Excluir"
            variant="danger"
            isLoading={isDeleting}
          />
        </>
      )}
    </>
  );
};
