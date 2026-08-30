import { FaSave, FaSpinner, FaTimes } from 'react-icons/fa';

import { Button } from '@/app/components/ui';

interface FormActionsProps {
  isEditing: boolean;
  loading: boolean;
  onCancel: () => void;
  submitLabel?: string;
  createLabel?: string;
  disabled?: boolean;
}

export default function FormActions({
  isEditing,
  loading,
  onCancel,
  submitLabel = 'Salvar alterações',
  createLabel = 'Criar',
  disabled = false,
}: FormActionsProps) {
  return (
    <div className="flex flex-col-reverse gap-2 border-t border-[var(--border)] pt-5 sm:flex-row sm:justify-end">
      <Button
        type="button"
        onClick={onCancel}
        variant="outline"
        disabled={loading}
        icon={<FaTimes />}
      >
        Cancelar
      </Button>

      <Button
        type="submit"
        disabled={loading || disabled}
        isLoading={loading}
        icon={loading ? <FaSpinner className="animate-spin" /> : <FaSave />}
      >
        {loading
          ? isEditing
            ? 'Salvando...'
            : 'Criando...'
          : isEditing
            ? submitLabel
            : createLabel}
      </Button>
    </div>
  );
}
