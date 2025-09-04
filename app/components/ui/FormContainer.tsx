import { Button } from "@/app/components";
import { FaSave, FaTimes, FaEdit, FaSpinner } from 'react-icons/fa';

interface FormContainerProps {
  isSubmitting: boolean;
  isEdit?: boolean;
  handleSubmit: (e: React.FormEvent) => void;
  submitLabel?: string;
  cancelLabel?: string;
  onCancel?: () => void;
  children: React.ReactNode;
  className?: string;
  showIcons?: boolean;
}

const FormContainer = ({
  isSubmitting,
  isEdit = false,
  handleSubmit,
  submitLabel,
  cancelLabel = 'Cancelar',
  onCancel,
  children,
  className = '',
  showIcons = true,
}: FormContainerProps) => {
  const icon = isSubmitting
    ? <FaSpinner className="animate-spin" />
    : showIcons
      ? isEdit
        ? <FaEdit />
        : <FaSave />
      : undefined;

  const label = submitLabel || (
    isEdit
      ? isSubmitting
        ? 'Atualizando...'
        : 'Atualizar'
      : isSubmitting
        ? 'Criando...'
        : 'Criar'
  );

  return (
    <form 
      onSubmit={handleSubmit} 
      className={`space-y-4 ${className}`}
    >
      <div className="">
        {children}
      </div>

      <div className="flex flex-col-reverse sm:flex-row gap-2 justify-between">
        <Button
          variant="secondary"
          onClick={onCancel}
          disabled={isSubmitting}
          type="button"
          icon={showIcons ? <FaTimes /> : undefined}
          size='sm'
          className="w-full sm:w-auto"
        >
          {cancelLabel}
        </Button>

        <Button
          variant="primary"
          type="submit"
          disabled={isSubmitting}
          icon={icon}
          size='sm'
          className="w-full sm:w-auto"
        >
          {label}
        </Button>
      </div>
    </form>
  );
};

export default FormContainer;
