import { FaSave, FaSpinner, FaTimes } from 'react-icons/fa';

import { Button, ShowBelow, ShowFrom } from '@/app/components/ui';

interface FormActionsProps {
  isEditing: boolean;
  loading: boolean;
  onCancel: () => void;
  submitLabel?: string;
  createLabel?: string;
  disabled?: boolean;
  /** No celular: botões compactos na mesma linha, cancelar num canto e salvar no outro. A partir de `sm` não muda. */
  iconsOnMobile?: boolean;
}

export default function FormActions({
  isEditing,
  loading,
  onCancel,
  submitLabel = 'Salvar alterações',
  createLabel = 'Criar',
  disabled = false,
  iconsOnMobile = false,
}: FormActionsProps) {
  const submitText = isEditing ? submitLabel : createLabel;
  const submitIcon = loading ? <FaSpinner className="animate-spin" /> : <FaSave />;

  const regular = (
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
        icon={submitIcon}
      >
        {loading ? (isEditing ? 'Salvando...' : 'Criando...') : submitText}
      </Button>
    </div>
  );

  if (!iconsOnMobile) return regular;

  return (
    <>
      <ShowBelow breakpoint="sm">
        <div className="flex items-center justify-between border-t border-[var(--border)] pt-5">
          <Button
            type="button"
            onClick={onCancel}
            variant="outline"
            size="compact"
            disabled={loading}
            icon={<FaTimes />}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            size="compact"
            disabled={loading || disabled}
            isLoading={loading}
            icon={submitIcon}
          >
            {loading ? (isEditing ? 'Salvando...' : 'Criando...') : submitText}
          </Button>
        </div>
      </ShowBelow>
      <ShowFrom breakpoint="sm">{regular}</ShowFrom>
    </>
  );
}
