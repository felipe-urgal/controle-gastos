// importing components
import { Button } from "@/app/components/ui";

// importing icons
import { FaSave, FaTimes, FaSpinner } from "react-icons/fa";

interface FormActionsProps {
  isEditing: boolean;
  loading: boolean;
  onCancel: () => void;
  submitLabel?: string;
  createLabel?: string;
  disabled?: boolean;
};

export default function FormActions({
  isEditing,
  loading,
  onCancel,
  submitLabel = "Salvar Alterações",
  createLabel = "Criar",
  disabled = false,
}: FormActionsProps) {
  return (
    <div className="flex flex-col sm:flex-row justify-between gap-3 pt-4 border-t border-white/10">
      <div className="hidden lg:flex">
        <Button
          type="button"
          onClick={onCancel}
          variant="outline"
          disabled={loading}
          icon={<FaTimes />}
        >
          Cancelar
        </Button>
      </div>

      <Button
        type="submit"
        disabled={loading || disabled}
        className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700
          text-white font-semibold shadow-lg"
        icon={loading ? <FaSpinner className="animate-spin" /> : <FaSave />}
      >
        {loading
          ? isEditing
            ? "Salvando..."
            : "Criando..."
          : isEditing
          ? submitLabel
          : createLabel}
      </Button>
    </div>
  );
};
