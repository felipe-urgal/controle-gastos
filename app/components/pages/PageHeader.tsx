"use client";

// importing icons
import { FaArrowLeft, FaEdit, FaTrash, FaPlus } from "react-icons/fa";

// importing components
import { Button } from "@/app/components/ui";
import Link from "next/link"

interface PageHeaderProps {
  title?: string;
  description?: string;
  backUrl?: string;
  editUrl?: string;
  onDelete?: () => void;
  createUrl?: string;
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
  loading,
  isDeleting,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-center justify-between w-full gap-3">
        {backUrl && (
          <Link
            href={backUrl}
            className="inline-block"
          >
            <Button
              variant="outline"
              icon={<FaArrowLeft />}
              disabled={isDeleting}
              isLoading={loading}
            >
              Voltar
            </Button>
          </Link>
        )}

        <div>
          {title && (
            <h1 className="text-2xl sm:text-4xl font-bold text-white">
              {title}
            </h1>
          )}

          {description && (
            <p className="text-xs sm:text-sm text-slate-400">
              {description}
            </p>
          )}
        </div>

        <div className="flex gap-3">
          {createUrl && (
            <Link
              href={createUrl}
              className="inline-block"
            >
              <Button
                variant="primary"
                icon={<FaPlus />}
                isLoading={loading}
              >
                Adicionar
              </Button>
            </Link>
          )}

          {editUrl && (
            <Link
              href={editUrl}
              className="inline-block"
            >
              <Button
                variant="primary"
                icon={<FaEdit />}
                disabled={isDeleting}
                isLoading={loading}
              >
                Editar
              </Button>
            </Link>
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
      </div>
    </div>
  );
};
