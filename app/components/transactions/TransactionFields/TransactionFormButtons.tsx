import React from "react";

interface TransactionFormButtonsProps {
  isSubmitting: boolean;
  onCancel: () => void;
  isEdit?: boolean;
}

const TransactionFormButtons: React.FC<TransactionFormButtonsProps> = ({ 
  isSubmitting, 
  onCancel,
  isEdit = false
}) => (
  <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-between">
    <button
      type="button"
      onClick={onCancel}
      disabled={isSubmitting}
      className="w-30 p-2 rounded-md border border-gray-300 bg-white text-gray-700 font-small hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
    >
      Cancelar
    </button>

    <button
      type="submit"
      disabled={isSubmitting}
      className={`w-40 py-3 px-4 rounded-md text-white font-medium transition-colors ${
        isSubmitting 
          ? 'bg-gray-400 cursor-not-allowed' 
          : 'bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
      }`}
    >
      {isSubmitting ? (
        <span className="flex items-center justify-center">
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {isEdit ? 'Atualizando...' : 'Salvando...'}
        </span>
      ) : (
        isEdit ? 'Atualizar Transação' : 'Salvar Transação'
      )}
    </button>
  </div>
);

export default TransactionFormButtons;