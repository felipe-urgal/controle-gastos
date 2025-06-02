import { Button } from './Button';
import { FiSave, FiX, FiEdit } from 'react-icons/fi'; // Exemplo usando Feather Icons
import { ImSpinner2 } from 'react-icons/im'

interface FormContainerProps {
  isSubmitting: boolean;
  isEdit?: boolean;
  handleSubmit: (e: React.FormEvent) => void;
  submitLabel?: string;
  cancelLabel?: string;
  onCancel?: () => void;
  children: React.ReactNode;
  className?: string;
  showIcons?: boolean; // Prop para controlar a exibição dos ícones
}

export const FormContainer = ({
  isSubmitting,
  isEdit = false,
  handleSubmit,
  submitLabel,
  cancelLabel = 'Cancelar',
  onCancel,
  children,
  className = '',
  showIcons = true, // Padrão é mostrar ícones
}: FormContainerProps) => {
  const icon = isSubmitting
    ? <ImSpinner2 className="animate-spin" />
    : showIcons
      ? isEdit
        ? <FiEdit />
        : <FiSave />
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

      <div className="mt-4 ml-[-2rem] mr-[-.7rem] sm:ml-[-2.5rem] sm:mr-[-.7rem]">
        <div className="border-b border-gray-700 w-[calc(100%+0.8rem)] sm:w-[calc(100%+0.8rem)]"></div>
      </div>

      <div className="pt-3 flex sm:flex-row justify-between">
        <Button
          variant="secondary"
          onClick={onCancel}
          disabled={isSubmitting}
          type="button"
          icon={showIcons ? <FiX /> : undefined}
        >
          {cancelLabel}
        </Button>

        <Button
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