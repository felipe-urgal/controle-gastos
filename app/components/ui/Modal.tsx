"use client"

import React, { useEffect, ReactNode } from "react";

// icons
import { FaExclamationTriangle, FaTimes, FaSpinner, FaFileImport, FaCheckCircle } from "react-icons/fa";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  mensagem?: string;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
  type?: "confirmation" | "import";
  children?: ReactNode;
  importPreview?: any[];
  importCount?: number;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  mensagem,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  isLoading = false,
  size = "md",
  type = "confirmation",
  children,
  importPreview = [],
  importCount = 0
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

  // Tamanhos do modal
  const sizeClasses = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl"
  };

  const actualImportCount = importCount > 0 ? importCount : importPreview.length;

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-md z-50 transition-opacity duration-300 animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className={`bg-white/95 backdrop-blur-lg p-6 rounded-2xl shadow-2xl w-full mx-4 border border-white/20 ${sizeClasses[size]}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with close button */}
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800">
            {type === "import" ? "Confirmar Importação" : "Confirmação"}
          </h3>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="text-gray-400 hover:text-gray-600 transition-colors duration-200 p-1 rounded-full hover:bg-gray-100"
            aria-label="Fechar modal"
          >
            <FaTimes className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-6">
          {/* Ícone baseado no tipo */}
          <div className={`mx-auto flex items-center justify-center h-16 w-16 rounded-full mb-4 ${
            type === "import" ? "bg-blue-100/80" : "bg-amber-100/80"
          }`}>
            {type === "import" ? (
              <FaFileImport className="h-8 w-8 text-blue-500" />
            ) : (
              <FaExclamationTriangle className="h-8 w-8 text-amber-500" />
            )}
          </div>

          <h2 className="text-xl font-semibold text-gray-800 mb-2 text-center">{mensagem || ""}</h2>
          
          {type === "import" && actualImportCount > 0 && (
            <p className="text-sm text-gray-500 text-center mb-4">
              {actualImportCount} item{actualImportCount !== 1 ? 's' : ''} ser{actualImportCount === 1 ? '' : 'ão'} importado{actualImportCount === 1 ? '' : 's'}
            </p>
          )}

          {/* Conteúdo personalizado */}
          {children ? (
            <div className="mt-4">
              {children}
            </div>
          ) : type === "import" && importPreview.length > 0 ? (
            <div className="mt-4 max-h-60 overflow-y-auto">
              <div className="bg-gray-50 rounded-lg p-3">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Preview dos dados:</h4>
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-100">
                    <tr>
                      {importPreview.length > 0 && Object.keys(importPreview[0]).map((header) => (
                        <th key={header} className="px-2 py-1 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {importPreview.slice(0, 5).map((row, index) => (
                      <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                        {Object.values(row).map((value: any, cellIndex) => (
                          <td key={cellIndex} className="px-2 py-1 text-xs">
                            {value || <span className="text-gray-400">-</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {importPreview.length > 5 && (
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    + {importPreview.length - 5} item{importPreview.length - 5 !== 1 ? 's' : ''} adicional{importPreview.length - 5 === 1 ? '' : 'es'}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center">Esta ação não pode ser desfeita</p>
          )}
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
            className={`flex-1 px-4 py-3 border border-transparent rounded-xl shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 font-medium flex items-center justify-center gap-2 ${
              type === "import" 
                ? "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 focus:ring-blue-400"
                : "bg-gradient-to-r from-red-500 to-amber-500 hover:from-red-600 hover:to-amber-600 focus:ring-red-400"
            }`}
          >
            {isLoading ? (
              <>
                <FaSpinner className="w-4 h-4 animate-spin" />
                {type === "import" ? "Importando..." : "Processando..."}
              </>
            ) : type === "import" ? (
              <>
                <FaCheckCircle className="w-4 h-4" />
                {confirmText}
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
