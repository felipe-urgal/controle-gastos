"use client";

// importing components

import { useMediaQuery } from '@/app/hooks/use-media-query';
import { PageHeader } from "@/app/components/base-pages";
import { PageLoading, PageEmpty } from "@/app/components/feedback";
import { ProtectedRoute } from "@/app/components/layout";
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
  deleteError?: string | null;
  deleteWarning?: string;
  allowMutations?: boolean;
  /** A página oferece a exclusão no próprio conteúdo; o cabeçalho mostra só Editar. */
  hideHeaderDelete?: boolean;

  emptyRedirectTo?: string;
  mobileContent?: React.ReactNode;

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
  deleteError,
  deleteWarning,
  allowMutations = true,
  hideHeaderDelete = false,
  emptyRedirectTo,
  mobileContent,
  children,
}: ShowPageProps<T>) {
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  // Com `mobileContent`, monta só a árvore do viewport (sem duplicar DOM escondido por CSS).
  const showDesktop = !mobileContent || isDesktop;

  return (
    <ProtectedRoute>
      <DeleteOverlay
        isOpen={isDeleting}
        entityName={entityName}
        title={`Excluindo ${entityName}`}
      />

      {showDesktop && (
        <PageHeader
          title={titleFallback}
          description={description}
          backUrl={backUrl}
          editUrl={allowMutations ? editUrl : undefined}
          onDelete={allowMutations && !hideHeaderDelete ? () => setIsDeleteModalOpen(true) : undefined}
          loading={loading}
          isDeleting={isDeleting}
        />
      )}

      {loading ? (
        <PageLoading type="details" />
      ) : !entity ? (
        <PageEmpty
          title={`${entityName.charAt(0).toUpperCase() + entityName.slice(1)} não encontrada`}
          redirectTo={emptyRedirectTo}
        />
      ) : (
        <>
          {!showDesktop && mobileContent}
          {showDesktop && children}

          {allowMutations && (
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
              dangerNotice={deleteWarning ?? undefined}
            >
              {deleteError && (
                <p
                  role="alert"
                  className="rounded-[var(--radius-md)] border border-[var(--danger)] bg-[var(--danger-subtle)] p-3 text-sm text-[var(--expense)]"
                >
                  {deleteError}
                </p>
              )}
            </ConfirmationModal>
          )}
        </>
      )}
    </ProtectedRoute>
  );
};
