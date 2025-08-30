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
      className={`space-y-6 ${className}`}
    >
      <div className="">
        {children}
      </div>

      <div className="flex gap-4 pt-6 border-t border-gray-100">
        <Button
          variant="secondary"
          onClick={onCancel}
          disabled={isSubmitting}
          type="button"
          icon={showIcons ? <FaTimes /> : undefined}
          className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors duration-200"
        >
          {cancelLabel}
        </Button>

        <Button
          variant="primary"
          type="submit"
          disabled={isSubmitting}
          icon={icon}
          className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-xl font-medium hover:from-indigo-700 hover:to-blue-700 transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {label}
        </Button>
      </div>
    </form>
  );
};

export default FormContainer;