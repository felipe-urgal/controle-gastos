"use client";

// importing context
import { useTheme } from "@/app/context/ThemeContext";

// importing icons
import { HiX, HiTrash } from "react-icons/hi";

// importing types 
import { DeleteConfirmationModalProps } from "@/app/types/calendar";
import { Button } from "@/app/components"; // ajuste o caminho conforme necessário

export default function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  itemName,
  itemType,
  isDeleting
}: DeleteConfirmationModalProps) {
  const { resolvedTheme } = useTheme();
  
  const colors = {
    bg: resolvedTheme === 'dark' ? 'bg-gray-900' : 'bg-white',
    bgSecondary: resolvedTheme === 'dark' ? 'bg-gray-800' : 'bg-gray-50',
    text: resolvedTheme === 'dark' ? 'text-gray-100' : 'text-gray-800',
    textSecondary: resolvedTheme === 'dark' ? 'text-gray-300' : 'text-gray-600',
    textTertiary: resolvedTheme === 'dark' ? 'text-gray-400' : 'text-gray-500',
    border: resolvedTheme === 'dark' ? 'border-gray-700' : 'border-gray-300',
    borderSecondary: resolvedTheme === 'dark' ? 'border-gray-600' : 'border-gray-200',
    redBg: resolvedTheme === 'dark' ? 'bg-red-900/20' : 'bg-red-100',
    redText: resolvedTheme === 'dark' ? 'text-red-300' : 'text-red-500',
    redBorder: resolvedTheme === 'dark' ? 'border-red-800' : 'border-red-200',
  };

  if (!isOpen) return null;
  
  const getTypeDisplayName = () => {
    switch (itemType) {
      case 'transação': return 'transação';
      case 'investimento': return 'investimento';
      default: return itemType;
    }
  };

  // Função para truncar texto muito longo em mobile
  const truncateText = (text: string, maxLength: number = 30) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <div className="fixed inset-0 bg-black/40 bg-opacity-50 flex items-center justify-center z-50">
      <div className={`${colors.bg} rounded-3xl shadow-xl sm:max-w-6xl max-w-[50vh] max-h-[90vh] p-6 overflow-y-auto`}>
        <div className={`w-10 h-10 ${colors.redBg} rounded-full flex items-center justify-center mb-3 mx-auto border ${colors.redBorder}`}>
          <HiTrash className={`w-5 h-5 ${colors.redText}`} />
        </div>
        
        <h4 className={`text-base font-semibold ${colors.text} mb-2 text-center`}>
          Excluir {getTypeDisplayName()}?
        </h4>
        
        <p className={`text-sm ${colors.textSecondary} mb-4 text-center leading-relaxed`}>
          Tem certeza que deseja excluir <strong className="break-words">{truncateText(itemName)}</strong>?
        </p>
        
        <p className={`text-xs ${resolvedTheme === 'dark' ? 'text-red-400' : 'text-red-500'} text-center mb-4`}>
          Esta ação não pode ser desfeita.
        </p>
        
        <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2 sm:justify-center">
          <Button 
            onClick={onClose}
            variant="secondary"
            size="md"
            className="flex-1 sm:flex-none"
            icon={<HiX className="w-4 h-4" />}
          >
            Cancelar
          </Button>
          <Button 
            onClick={onConfirm}
            variant="danger"
            size="md"
            className="flex-1 sm:flex-none"
            icon={<HiTrash className="w-4 h-4" />}
            isLoading={isDeleting}
          >
            Excluir
          </Button>
        </div>
      </div>
    </div>
  );
}
