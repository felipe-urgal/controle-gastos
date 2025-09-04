"use client"

import React, { useEffect, ReactNode, useRef, useState } from "react";

// icons
import { FaExclamationTriangle, FaTimes, FaFileImport, FaCheckCircle } from "react-icons/fa";
import Button from "./Button";

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
  const [isScrolling, setIsScrolling] = useState(false);
  const [startY, setStartY] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);
  
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
      document.body.style.touchAction = 'none';
      document.documentElement.style.overscrollBehavior = 'none';
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = 'unset';
      document.body.style.touchAction = '';
      document.documentElement.style.overscrollBehavior = '';
    };
  }, [isOpen, onClose]);

  // Prevenir scroll no fundo quando modal estiver aberto
  useEffect(() => {
    const preventDefault = (e: TouchEvent) => {
      if (isOpen) e.preventDefault();
    };

    document.addEventListener('touchmove', preventDefault, { passive: false });
    
    return () => {
      document.removeEventListener('touchmove', preventDefault);
    };
  }, [isOpen]);

  // Tamanhos do modal
  const sizeClasses = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl"
  };

  const actualImportCount = importCount > 0 ? importCount : importPreview.length;

  // Handlers para scroll tátil
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!contentRef.current) return;
    
    const touch = e.touches[0];
    setStartY(touch.pageY);
    setScrollTop(contentRef.current.scrollTop);
    setIsScrolling(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isScrolling || !contentRef.current) return;
    
    const touch = e.touches[0];
    const y = touch.pageY;
    const walk = (y - startY); // Distância percorrida
    contentRef.current.scrollTop = scrollTop - walk;
  };

  const handleTouchEnd = () => {
    setIsScrolling(false);
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-md z-50 p-2 sm:p-4 overflow-y-auto"
      onClick={onClose}
      style={{ animation: "fadeIn 0.3s ease-out forwards" }}
    >
      <div 
        ref={modalRef}
        className={`bg-white/95 backdrop-blur-lg p-4 rounded-2xl shadow-2xl w-full mx-auto ${sizeClasses[size]} my-auto`}
        onClick={(e) => e.stopPropagation()}
        style={{ 
          maxHeight: "90vh", 
          overflow: "visible",
          WebkitOverflowScrolling: 'touch',
          animation: "slideIn 0.3s ease-out forwards"
        }}
      >
        {/* Header with close button */}
        <div className="flex justify-between items-center mb-4 sticky top-0 bg-white/95 py-2 z-10">
          <h3 className="text-lg font-semibold text-gray-800">
            {type === "import" ? "Confirmar Importação" : title || "Confirmação"}
          </h3>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="text-gray-400 hover:text-gray-600 transition-colors duration-200 p-1 rounded-full hover:bg-gray-100 flex-shrink-0"
            aria-label="Fechar modal"
          >
            <FaTimes className="w-5 h-5" />
          </button>
        </div>

        <div 
          ref={contentRef}
          className="mb-4 overflow-y-auto"
          style={{ 
            maxHeight: "calc(90vh - 120px)",
            WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'contain'
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Ícone baseado no tipo */}
          {!hideActions && (
            <div className={`mx-auto flex items-center justify-center h-12 w-12 rounded-full ${
              type === "import" ? "bg-blue-100/80" : "bg-amber-100/80"
            } mb-4`}>
              {type === "import" ? (
                <FaFileImport className="h-6 w-6 text-blue-500" />
              ) : (
                <FaExclamationTriangle className="h-6 w-6 text-amber-500" />
              )}
            </div>
          )}

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
            <div className="mt-4">
              {children}
            </div>
          ) : type === "import" && importPreview.length > 0 ? (
            <div className="mt-4 bg-gray-50 rounded-lg p-3">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Preview dos dados:</h4>
              <div className="overflow-auto">
                <div className="min-w-full">
                  {/* Header row */}
                  <div className="flex border-b border-gray-200 font-medium text-xs text-gray-600 uppercase tracking-wider">
                    {importPreview.length > 0 && Object.keys(importPreview[0]).map((header) => (
                      <div key={header} className="px-2 py-2 flex-1 min-w-[100px] whitespace-nowrap overflow-hidden text-ellipsis">
                        {header}
                      </div>
                    ))}
                  </div>
                  
                  {/* Data rows */}
                  <div className="max-h-40 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
                    {importPreview.slice(0, 5).map((row, index) => (
                      <div key={index} className={`flex border-b border-gray-200 ${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
                        {Object.values(row).map((value: any, cellIndex) => (
                          <div key={cellIndex} className="px-2 py-2 text-xs flex-1 min-w-[100px] whitespace-nowrap overflow-hidden text-ellipsis">
                            {value || <span className="text-gray-400">-</span>}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
                
                {importPreview.length > 5 && (
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    + {importPreview.length - 5} item{importPreview.length - 5 !== 1 ? 's' : ''} adicional{importPreview.length - 5 === 1 ? '' : 'es'}
                  </p>
                )}
              </div>
            </div>
          ) : (
            !children && <p className="text-sm text-gray-500 text-center mt-2">Esta ação não pode ser desfeita</p>
          )}
        </div>

        {!hideActions && (
          <div className="flex flex-col-reverse sm:flex-row gap-2 sticky bottom-0 bg-white/95 py-2">
            <Button
              onClick={onClose}
              disabled={isLoading}
              variant="secondary"
              size="sm"
              fullWidth
              icon={<FaTimes className="w-4 h-4" />}
              className="flex-1"
            >
              {cancelText}
            </Button>
            
            <Button
              onClick={onConfirm}
              disabled={isLoading}
              isLoading={isLoading}
              variant={type === "import" ? "primary" : "danger"}
              size="sm"
              fullWidth
              icon={type === "import" && !isLoading ? <FaCheckCircle className="w-4 h-4" /> : undefined}
              className="flex-1"
            >
              {isLoading 
                ? (type === "import" ? "Importando..." : "Processando...")
                : confirmText
              }
            </Button>
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
        
        /* Estilos para melhorar a experiência de scroll no iOS */
        .overflow-y-auto {
          -webkit-overflow-scrolling: touch;
          overflow-y: auto;
        }
      `}</style>
    </div>
  );
};

export default Modal;
