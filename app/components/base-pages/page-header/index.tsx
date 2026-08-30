'use client';

import { FaArrowLeft, FaEdit, FaPlus, FaTrash } from 'react-icons/fa';

import { Button } from '@/app/components/ui';

interface PageHeaderProps {
  title?: string;
  description?: string;
  backUrl?: string;
  editUrl?: string;
  onDelete?: () => void;
  createUrl?: string;
  createLabel?: string;
  loading?: boolean;
  isDeleting?: boolean;
}

export default function PageHeader({
  title,
  description,
  backUrl,
  editUrl,
  onDelete,
  createUrl,
  createLabel = 'Adicionar',
  loading,
  isDeleting,
}: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        {backUrl && (
          <Button
            as="a"
            href={backUrl}
            variant="ghost"
            size="sm"
            icon={<FaArrowLeft />}
            disabled={isDeleting}
            isLoading={loading}
            aria-label="Voltar"
          />
        )}

        <div className="min-w-0">
          {title && (
            <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)] sm:text-3xl">
              {title}
            </h1>
          )}
          {description && (
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[var(--text-muted)] sm:text-base">
              {description}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        {createUrl && (
          <Button
            as="a"
            href={createUrl}
            variant="primary"
            icon={<FaPlus />}
            isLoading={loading}
          >
            {createLabel}
          </Button>
        )}

        {editUrl && (
          <Button
            as="a"
            href={editUrl}
            variant="outline"
            icon={<FaEdit />}
            disabled={isDeleting}
            isLoading={loading}
          >
            Editar
          </Button>
        )}

        {onDelete && (
          <Button
            variant="danger"
            icon={<FaTrash />}
            onClick={onDelete}
            disabled={isDeleting}
            isLoading={loading}
          >
            Excluir
          </Button>
        )}
      </div>
    </header>
  );
}
