"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FaCodeMerge } from "react-icons/fa6";

import { useCategories } from "@/app/hooks/categories/category-show";
import { ShowPage } from "@/app/components/base-pages";
import { pageBarButtonProps } from "@/app/components/base-pages/page-bar";
import CategoryMergeDialog from '@/app/components/pages/category/show/category-merge-dialog';
import { Button } from "@/app/components/ui";
import CategoryShowSkeleton from '@/app/components/pages/category/show/category-show-skeleton';
import CategoryShowView from '@/app/components/pages/category/show/category-show-view';

export default function Show({ id }: { id: string }) {
  const {
    category,
    loading,
    isDeleteModalOpen,
    setIsDeleteModalOpen,
    isDeleting,
    deleteError,
    handleDelete,
    handleBack,
  } = useCategories({ id });
  const router = useRouter();
  const [mergeOpen, setMergeOpen] = useState(false);

  const view = category ? (
    <CategoryShowView
      category={category}
      backUrl={handleBack}
      editUrl={`/categorias/alterar/${id}`}
      isDeleting={isDeleting}
      onDeleteRequest={() => setIsDeleteModalOpen(true)}
    />
  ) : null;

  return (
    <>
    <ShowPage
      entity={category}
      entityName="categoria"
      titleFallback="Detalhes da categoria"
      sidebarAligned
      animatedActions
      animated="fan"
      breadcrumb={[{ label: 'Categorias', href: '/categorias' }, { label: category?.name ?? 'Categoria' }]}
      loadingSkeleton={<CategoryShowSkeleton backUrl={handleBack} />}
      loading={loading}
      editUrl={`/categorias/alterar/${id}`}
      backUrl={handleBack}
      isDeleting={isDeleting}
      isDeleteModalOpen={isDeleteModalOpen}
      setIsDeleteModalOpen={setIsDeleteModalOpen}
      onDelete={handleDelete}
      deleteError={deleteError}
      deleteWarning="Categorias com transações, divisões, limites, regras de importação ou modelos vinculados não podem ser excluídas. Para preservar o histórico, você pode inativar a categoria."
      emptyRedirectTo="/categorias"
      headerActions={
        category ? (
          <Button variant="outline" {...pageBarButtonProps} icon={<FaCodeMerge />} onClick={() => setMergeOpen(true)}>
            Mesclar
          </Button>
        ) : undefined
      }
      mobileContent={view}
    >
      {view}
    </ShowPage>
    {mergeOpen && category && (
      <CategoryMergeDialog
        category={category}
        onClose={() => setMergeOpen(false)}
        onMerged={(targetId) => router.replace(`/categorias/show/${targetId}`)}
      />
    )}
    </>
  );
};
