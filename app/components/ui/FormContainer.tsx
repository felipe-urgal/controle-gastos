// Components
import { Button } from "@/app/components";

// icons
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
    <form onSubmit={handleSubmit} className={`${className}`}>
      <div className="grid xs:grid-cols-1 sm:grid-cols-1 md:grid-cols-4 gap-2">
        {children}
      </div>

      <div className="mt-4 ml-[-2rem] mr-[-.1rem] sm:ml-[-2.5rem] sm:mr-[-.1rem]">
        <div className="border-b border-gray-700 w-[calc(100%+0.6rem)] sm:w-[calc(100%+0.6rem)]"></div>
      </div>

      <div className="pt-3 flex flex-col gap-3 sm:flex-row sm:gap-0 justify-between">
        <Button
          variant="secondary"
          onClick={onCancel}
          disabled={isSubmitting}
          type="button"
          icon={showIcons ? <FaTimes /> : undefined}
        >
          {cancelLabel}
        </Button>

        <Button
          variant="primary"
          type="submit"
          disabled={isSubmitting}
          icon={icon}
        >
          {label}
        </Button>
      </div>
    </form>
  );
};

export default FormContainer;
