"use client"

// hooks
import React, { useEffect } from "react";

// icons
import { FaExclamationTriangle, FaTimes, FaSpinner } from "react-icons/fa";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  mensagem: string;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  mensagem,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  isLoading = false
}) => {
  // Fechar modal ao pressionar Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-md z-50 transition-opacity duration-300 animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="bg-white/95 backdrop-blur-lg p-6 rounded-2xl shadow-2xl w-full max-w-md mx-4 border border-white/20"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with close button */}
        <div className="flex justify-end mb-2">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="text-gray-400 hover:text-gray-600 transition-colors duration-200 p-1 rounded-full hover:bg-gray-100"
            aria-label="Fechar modal"
          >
            <FaTimes className="w-5 h-5" />
          </button>
        </div>

        <div className="text-center mb-6">
          {/* Ícone de alerta */}
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-amber-100/80 mb-4">
            <FaExclamationTriangle className="h-8 w-8 text-amber-500" />
          </div>

          <h2 className="text-xl font-semibold text-gray-800 mb-2">{mensagem}</h2>
          <p className="text-sm text-gray-500">Esta ação não pode ser desfeita</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 transition-all duration-200 disabled:opacity-50 font-medium flex items-center justify-center gap-2"
          >
            <FaTimes className="w-4 h-4" />
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 px-4 py-3 border border-transparent rounded-xl shadow-sm text-white bg-gradient-to-r from-red-500 to-amber-500 hover:from-red-600 hover:to-amber-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-400 transition-all duration-200 disabled:opacity-50 font-medium flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <FaSpinner className="w-4 h-4 animate-spin" />
                Processando...
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default Modal;