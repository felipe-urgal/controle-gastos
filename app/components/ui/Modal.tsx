"use client"

import React, { useEffect, ReactNode, useRef } from "react";

// icons
import { FaTimes, FaCheckCircle } from "react-icons/fa";

// Definindo o componente Button para tornar o exemplo autossuficiente
const Button = ({ 
  onClick, 
  disabled, 
  isLoading, 
  variant, 
  size, 
  fullWidth, 
  icon, 
  children 
}: any) => (
  <button
    onClick={onClick}
    disabled={disabled || isLoading}
    className={`
      flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors
      ${variant === 'primary' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}
      ${size === 'sm' ? 'text-sm py-2' : 'text-base py-2.5'}
      ${fullWidth ? 'w-full' : ''}
      ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}
    `}
  >
    {isLoading ? (
      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
    ) : icon}
    {children}
  </button>
);

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  mensagem?: string;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
  type?: "confirmation" | "import";
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
  const contentRef = useRef<HTMLDivElement>(null);
  
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
      className="fixed inset-0 flex items-center justify-center bg-black/30 z-50 p-4"
      style={{ 
        zIndex: 9999,
        animation: "fadeIn 0.3s ease-out forwards",
      }}
      onClick={onClose}
    >
      <div 
        ref={modalRef}
        className={`bg-white rounded-xl shadow-xl w-full mx-auto ${sizeClasses[size]} flex flex-col max-h-[80vh]`}
        onClick={(e) => e.stopPropagation()}
        style={{ 
          animation: "slideIn 0.3s ease-out forwards"
        }}
      >
        {/* HEADER */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200 sticky top-0 bg-white z-10 rounded-t-xl">
          <div className="w-6"></div> {/* Espaçador para centralizar o título */}
          
          <div className="flex-1 text-center">
            <h3 className="text-lg font-semibold text-gray-800">
              {type === "import" ? "Confirmar Importação" : title || "Confirmação"}
            </h3>
          </div>
          
          <button
            onClick={onClose}
            disabled={isLoading}
            className="text-gray-400 hover:text-gray-600 transition-colors duration-200 p-1 rounded-full hover:bg-gray-100 flex items-center justify-center w-6 h-6"
            aria-label="Fechar modal"
          >
            <FaTimes className="w-4 h-4" />
          </button>
        </div>

        {/* BODY - Conteúdo principal com scroll */}
        <div 
          ref={contentRef}
          className="flex-1 overflow-y-auto p-4"
        >
          {mensagem && (
            <h2 className="text-xl font-semibold text-gray-800 text-center mb-4">{mensagem}</h2>
          )}
          
          {type === "import" && actualImportCount > 0 && (
            <p className="text-sm text-gray-500 text-center mb-4">
              {actualImportCount} item{actualImportCount !== 1 ? 's' : ''} ser{actualImportCount === 1 ? '' : 'ão'} importado{actualImportCount === 1 ? '' : 's'}
            </p>
          )}

          {/* Conteúdo personalizado */}
          {children ? (
            <div>
              {children}
            </div>
          ) : type === "import" && importPreview.length > 0 ? (
            <div className="mt-4 bg-gray-50 rounded-lg p-3">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Preview dos dados:</h4>
              <div className="overflow-auto">
                <table className="min-w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      {importPreview.length > 0 && 
                        Object.keys(importPreview[0]).map((header) => (
                          <th 
                            key={header} 
                            className="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider border-b border-gray-200"
                          >
                            {header}
                          </th>
                        ))
                      }
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {importPreview.map((row, index) => (
                      <tr 
                        key={index} 
                        className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                      >
                        {Object.values(row).map((value: any, cellIndex) => (
                          <td 
                            key={cellIndex} 
                            className="px-3 py-2 text-xs whitespace-nowrap overflow-hidden text-ellipsis max-w-[120px]"
                          >
                            {value || <span className="text-gray-400">-</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {/*{importPreview.length > 5 && (
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    + {importPreview.length - 5} item{importPreview.length - 5 !== 1 ? 's' : ''} adicional{importPreview.length - 5 === 1 ? '' : 'es'}
                  </p>
                )}*/}
              </div>
            </div>
          ) : (
            !children && <p className="text-sm text-gray-500 text-center mt-2">Esta ação não pode ser desfeita</p>
          )}
        </div>

        {/* FOOTER - Botões de ação */}
        {!hideActions && (
          <div className="p-4 border-t border-gray-200 bg-white sticky bottom-0 rounded-b-xl">
            <div className="flex flex-col-reverse sm:flex-row gap-2">
              <Button
                onClick={onClose}
                disabled={isLoading}
                variant="secondary"
                size="sm"
                fullWidth
              >
                {cancelText}
              </Button>
              
              <Button
                onClick={onConfirm}
                disabled={isLoading}
                isLoading={isLoading}
                variant="primary"
                size="sm"
                fullWidth
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

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideIn {
          from { transform: translateY(-20px) scale(0.95); opacity: 0; }
          to { transform: translateY(0) scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default Modal;