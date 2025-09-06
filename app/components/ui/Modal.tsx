"use client"

import React, { useEffect, ReactNode, useRef, useState } from "react";

// icons
import { FaTimes, FaCheckCircle, FaExclamationTriangle } from "react-icons/fa";

// Seu componente Button personalizado
import Button from "./Button"; // Ajuste o caminho conforme necessário

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  mensagem?: string;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
  type?: "confirmation" | "import" | "success" | "warning";
  children?: ReactNode;
  importPreview?: any[];
  importCount?: number;
  title?: string;
  hideActions?: boolean;
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
  importCount = 0,
  title,
  hideActions = false,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  // Fechar modal ao pressionar Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      setIsVisible(true);
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = 'hidden';
    } else {
      // Adiciona delay para a animação de saída
      const timer = setTimeout(() => setIsVisible(false), 300);
      return () => clearTimeout(timer);
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

  // Cores baseadas no tipo de modal
  const typeStyles = {
    confirmation: {
      header: "bg-gradient-to-r from-blue-50 to-indigo-50",
      accent: "text-blue-600",
      icon: <FaExclamationTriangle className="w-5 h-5 text-blue-500" />
    },
    import: {
      header: "bg-gradient-to-r from-purple-50 to-pink-50",
      accent: "text-purple-600",
      icon: <FaCheckCircle className="w-5 h-5 text-purple-500" />
    },
    success: {
      header: "bg-gradient-to-r from-green-50 to-teal-50",
      accent: "text-green-600",
      icon: <FaCheckCircle className="w-5 h-5 text-green-500" />
    },
    warning: {
      header: "bg-gradient-to-r from-amber-50 to-orange-50",
      accent: "text-amber-600",
      icon: <FaExclamationTriangle className="w-5 h-5 text-amber-500" />
    }
  };

  const actualImportCount = importCount > 0 ? importCount : importPreview.length;

  // Prevenir scroll do body quando modal estiver aberto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen && !isVisible) return null;

  return (
    <div 
      className={`fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50 p-2 sm:p-4 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
      style={{ 
        zIndex: 9999,
      }}
      onClick={onClose}
    >
      <div 
        ref={modalRef}
        className={`bg-white rounded-lg shadow-2xl w-full mx-auto ${sizeClasses[size]} flex flex-col transform transition-transform duration-300 ${isOpen ? 'scale-100' : 'scale-95'}`}
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: '70vh' }}
      >
        {/* HEADER */}
        <div className={`flex justify-between items-center p-3 border-b border-gray-100 sticky top-0 z-10 rounded-t-lg ${typeStyles[type].header}`}>
          <div className="flex items-center space-x-2">
            {typeStyles[type].icon}
            <div className="flex-1">
              <h3 className={`text-lg font-semibold ${typeStyles[type].accent}`}>
                {type === "import" ? "Confirmar Importação" : title || (type === "success" ? "Sucesso" : type === "warning" ? "Atenção" : "Confirmação")}
              </h3>
            </div>
          </div>
          
          <button
            onClick={onClose}
            disabled={isLoading}
            className="text-gray-400 hover:text-gray-600 transition-colors duration-200 p-1 rounded-full hover:bg-white/50 flex items-center justify-center w-8 h-8"
            aria-label="Fechar modal"
          >
            <FaTimes className="w-4 h-4" />
          </button>
        </div>

        {/* BODY - Conteúdo principal com scroll nativo */}
        <div 
          className="p-6 overflow-y-auto flex-1"
          style={{ 
            maxHeight: "calc(85vh - 120px)",
            WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'contain'
          }}
        >
          {mensagem && (
            <h2 className="text-lg font-medium text-gray-800 mb-4">{mensagem}</h2>
          )}
          
          {type === "import" && actualImportCount > 0 && (
            <p className="text-sm text-gray-500 mb-6 text-center py-2 bg-gray-50 rounded-lg">
              {actualImportCount} item{actualImportCount !== 1 ? 's' : ''} ser{actualImportCount === 1 ? '' : 'ão'} importado{actualImportCount === 1 ? '' : 's'}
            </p>
          )}

          {/* Conteúdo personalizado */}
          {children ? (
            <div className="text-gray-700">
              {children}
            </div>
          ) : type === "import" && importPreview.length > 0 ? (
            <div className="mt-4 bg-gray-50 rounded-lg p-4 border border-gray-100">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Preview dos dados:</h4>
              <div className="overflow-auto rounded-lg border border-gray-200">
                <table className="min-w-full">
                  <thead>
                    <tr className="bg-gray-100/60">
                      {importPreview.length > 0 && 
                        Object.keys(importPreview[0]).map((header) => (
                          <th 
                            key={header} 
                            className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200"
                          >
                            {header}
                          </th>
                        ))
                      }
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {importPreview.slice(0, 5).map((row, index) => (
                      <tr key={index}>
                        {Object.values(row).map((value: any, cellIndex) => (
                          <td 
                            key={cellIndex} 
                            className="text-gray-600 px-4 py-3 text-sm whitespace-nowrap overflow-hidden text-ellipsis max-w-[120px]"
                          >
                            {value || <span className="text-gray-400">-</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {importPreview.length > 5 && (
                      <tr>
                        <td 
                          colSpan={Object.keys(importPreview[0]).length} 
                          className="px-4 py-2 text-xs text-center text-gray-500 bg-gray-50"
                        >
                          + {importPreview.length - 5} outros registros
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            !children && <p className="text-sm text-gray-500 mt-4">Esta ação não pode ser desfeita.</p>
          )}
        </div>

        {/* FOOTER - Botões de ação */}
        {!hideActions && (
          <div className="p-4 border-t border-gray-100 bg-gray-50/30 sticky bottom-0 rounded-b-lg">
            <div className="flex flex-col-reverse sm:flex-row gap-3 justify-end">
              <Button
                onClick={onClose}
                disabled={isLoading}
                variant="secondary"
                size="sm"
                className="min-w-[100px]"
              >
                {cancelText}
              </Button>
              
              <Button
                onClick={onConfirm}
                disabled={isLoading}
                isLoading={isLoading}
                variant={
                  type === "import" ? "success" : 
                  type === "warning" ? "warning" :
                  type === "success" ? "success" : "primary"
                }
                size="sm"
                className="min-w-[100px]"
                icon={type === "import" && !isLoading ? <FaCheckCircle className="w-4 h-4" /> : undefined}
              >
                {isLoading 
                  ? (type === "import" ? "Importando..." : "Processando...")
                  : confirmText
                }
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;