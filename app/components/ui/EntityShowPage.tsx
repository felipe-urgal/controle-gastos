"use client";

import PageHeader from "./PageHeader";
import PageLoading from "./PageLoading";
import PageEmpty from "./PageEmpty";
import DeleteOverlay from "./DeleteOverlay";
import ConfirmationModal from "./ConfirmationModal";

interface EntityShowPageProps<T> {
  entity: T | null | undefined;
  entityName: string; // "conta", "categoria"
  titleFallback: string;
  description: string;
  loading: boolean;

  editUrl: string;
  back: () => void;

  isDeleting: boolean;
  isDeleteModalOpen: boolean;
  setIsDeleteModalOpen: (v: boolean) => void;
  onDelete: () => void;

  emptyRedirectTo: string;

  children: React.ReactNode;
}

export default function EntityShowPage<T>({
  entity,
  entityName,
  titleFallback,
  description,
  loading,
  editUrl,
  back,
  isDeleting,
  isDeleteModalOpen,
  setIsDeleteModalOpen,
  onDelete,
  emptyRedirectTo,
  children,
}: EntityShowPageProps<T>) {
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
        onBack={back}
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
}