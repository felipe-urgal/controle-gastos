"use client";

import { useRouter } from "next/navigation";
import { FaArrowLeft, FaEdit, FaTrash, FaPlus } from "react-icons/fa";
import Button from "@/app/components/ui/Button";

interface PageHeaderProps {
  title: string;
  description?: string;

  // Back
  onBack?: () => void;

  // Edit
  editUrl?: string;
  onEdit?: () => void;

  // Delete
  onDelete?: () => void;

  // Create
  createUrl?: string;
  onCreate?: () => void;

  loading?: boolean;
  isDeleting?: boolean;
}

export default function PageHeader({
  title,
  description,
  onBack,
  editUrl,
  onEdit,
  onDelete,
  createUrl,
  onCreate,
  loading,
  isDeleting,
}: PageHeaderProps) {
  const router = useRouter();

  const handleNavigation = (url?: string, callback?: () => void) => {
    if (callback) return callback();
    if (url) return router.push(url);
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div className="flex items-start sm:items-center gap-3">
        {onBack && (
          <Button
            variant="outline"
            onClick={onBack}
            icon={<FaArrowLeft />}
            disabled={isDeleting}
            isLoading={loading}
          >
            Voltar
          </Button>
        )}

        <div>
          <h1 className="text-2xl sm:text-4xl font-bold text-white">
            {title}
          </h1>

          {description && (
            <p className="text-xs sm:text-sm text-slate-400">
              {description}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 w-full sm:w-auto">
        {(createUrl || onCreate) && (
          <Button
            variant="primary"
            icon={<FaPlus />}
            onClick={() => handleNavigation(createUrl, onCreate)}
          >
            Nova Conta
          </Button>
        )}

        {(editUrl || onEdit) && (
          <Button
            variant="primary"
            icon={<FaEdit />}
            onClick={() => handleNavigation(editUrl, onEdit)}
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
    </div>
  );
}