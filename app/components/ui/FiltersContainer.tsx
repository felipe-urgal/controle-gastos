"use client";

import { usePathname } from "next/navigation";
import { useState, useEffect, useRef, ReactNode } from "react";
import { Button } from "@/app/components";
import { FaPlus, FaTimesCircle, FaFilter, FaTimes, FaFileImport, FaDownload } from "react-icons/fa";
import Link from "next/link";

interface FiltersContainerProps {
  children: ReactNode;
  onClearFilters: () => void;
  onFileSelect?: (file: File) => void;
  importConfig?: {
    title: string;
    exampleContent: string;
    formatDescription: ReactNode;
    downloadFileName: string;
  };
  message?: string;
  loading?: boolean;
  showImportButton?: boolean;
}

const FiltersContainer = ({ 
  children, 
  onClearFilters, 
  onFileSelect,
  importConfig,
  message, 
  loading = false,
  showImportButton = false 
}: FiltersContainerProps) => {
  const pathname = usePathname();
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [showMobileButtons, setShowMobileButtons] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mobileButtonsRef = useRef<HTMLDivElement>(null);

  const toggleFilters = () => {
    setShowModal(true);
    setTimeout(() => setIsVisible(true), 10);
    setShowMobileButtons(false);
  };

  const handleClearAll = () => {
    onClearFilters();
    closeModal();
  };

  const closeModal = () => {
    setIsVisible(false);
    setTimeout(() => setShowModal(false), 300);
  };

  const openImportModal = () => {
    setShowImportModal(true);
    setShowMobileButtons(false);
  };

  const closeImportModal = () => {
    setShowImportModal(false);
  };

  const toggleMobileButtons = () => {
    setShowMobileButtons(!showMobileButtons);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && onFileSelect) {
      onFileSelect(file);
      event.target.value = '';
    }
    closeImportModal();
  };

  const handleUploadFile = () => {
    fileInputRef.current?.click();
  };

  const handleDownloadExample = () => {
    if (!importConfig) return;
    
    const blob = new Blob([importConfig.exampleContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = importConfig.downloadFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  // Fechar os botões móveis ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mobileButtonsRef.current && !mobileButtonsRef.current.contains(event.target as Node)) {
        setShowMobileButtons(false);
      }
    };

    if (showMobileButtons) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMobileButtons]);

  useEffect(() => {
    if (showModal || showImportModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [showModal, showImportModal]);

  const getActionButtonHref = () => {
    const paths = pathname.split('/').filter(path => path);
    const section = paths[0];
    return `/${section}/nova`;
  };

  return (
    <>
      {/* Botão flutuante moderno para mobile */}
      <div className="sm:hidden fixed bottom-4 right-4 z-40" ref={mobileButtonsRef}>
        {/* Botão principal flutuante */}
        <button
          onClick={toggleMobileButtons}
          className={`
            w-10 h-10 rounded-full flex items-center justify-center
            bg-gradient-to-br from-blue-500 to-blue-600
            transition-all duration-300
            border-2 border-white/20
            transform hover:scale-105
            relative
            ${showMobileButtons ? 'rotate-180' : 'rotate-0'}
          `}
          aria-label="Menu de ações"
        >
          {/* Ícone central animado */}
          <div className="relative w-3 h-3 flex items-center justify-center">
            <div className={`
              absolute w-4 h-0.5 bg-white rounded-full transition-all duration-300
              ${showMobileButtons ? 'rotate-45 translate-y-0' : '-translate-y-1'}
            `} />
            <div className={`
              absolute w-4 h-0.5 bg-white rounded-full transition-all duration-300
              ${showMobileButtons ? 'opacity-0' : 'opacity-100'}
            `} />
            <div className={`
              absolute w-4 h-0.5 bg-white rounded-full transition-all duration-300
              ${showMobileButtons ? '-rotate-45 translate-y-0' : 'translate-y-1'}
            `} />
          </div>

          {/* Efeito de brilho sutil */}
          <div className="absolute inset-0 rounded-full bg-white/10 opacity-0 hover:opacity-100 transition-opacity duration-300" />
        </button>

        {/* Menu flutuante com animação */}
        {showMobileButtons && (
          <div className="absolute right-0 bottom-full mb-2 space-y-2">
            {/* Botão de Filtros */}
            <div className="animate-fade-in-up delay-75">
              <Button 
                onClick={toggleFilters} 
                icon={<FaFilter size={12} />} 
                variant="info"
                size="sm"
                className="!rounded-full !w-10 !h-10 !p-0 shadow-lg"
                disabled={loading}
                title="Filtros"
              />
            </div>

            {showImportButton && onFileSelect && (
              <>
                {/* Botão de Importar */}
                <div className="animate-fade-in-up delay-150">
                  <Button 
                    onClick={openImportModal}
                    icon={<FaFileImport size={12} />}
                    variant="success"
                    size="sm"
                    className="!rounded-full !w-10 !h-10 !p-0 shadow-lg"
                    disabled={loading}
                    title="Importar"
                  />
                </div>

                {/* Botão de Adicionar */}
                <div className="animate-fade-in-up delay-225">
                  <Link href={getActionButtonHref()} passHref>
                    <Button 
                      icon={<FaPlus size={12} />} 
                      variant="primary"
                      size="sm"
                      className="!rounded-full !w-10 !h-10 !p-0 shadow-lg"
                      disabled={loading}
                      title="Adicionar"
                    />
                  </Link>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Container principal (apenas para desktop) */}
      <div className="hidden sm:flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-3 lg:mb-4">
        <Button 
          onClick={toggleFilters} 
          icon={<FaFilter size={12} />} 
          variant="info"
          size="sm"
          className="w-full sm:w-auto"
          disabled={loading}
        >
          Filtros
        </Button>

        {showImportButton && onFileSelect && (
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <Button 
              onClick={openImportModal}
              icon={<FaFileImport size={12} />}
              variant="success"
              size="sm"
              className="w-full sm:w-auto"
              disabled={loading}
            >
              Importar
            </Button>

            <Link href={getActionButtonHref()} passHref className="flex-1 sm:flex-none">
              <Button 
                icon={<FaPlus size={12} />} 
                variant="primary"
                size="sm"
                className="w-full sm:w-auto"
                disabled={loading}
              >
                Adicionar
              </Button>
            </Link>
          </div>
        )}
      </div>

      {message && (
        <div className="my-3 bg-gradient-to-r from-indigo-50 to-indigo-100 px-3 py-2 rounded-lg border border-indigo-200 flex justify-between items-center">
          <span className="text-indigo-700 text-sm font-medium">{message}</span>

          <Button
            onClick={handleClearAll}
            icon={<FaTimesCircle size={12} />}
            variant="link"
            className="text-indigo-600 hover:text-indigo-800 cursor-pointer"
            size="sm"
          >
            Limpar Filtros
          </Button>
        </div>
      )}

      {/* Input de arquivo oculto */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Modal de Filtros */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex" style={{ top: "4rem" }}>
          <div
            className={`bg-white/95 dark:bg-gray-900/95 w-full max-w-md h-[calc(100vh-4rem)] shadow-xl transform transition-transform duration-300 ease-in-out
              ${isVisible ? "translate-x-0" : "-translate-x-full"}`}
          >
            <div className="p-4 h-full flex flex-col">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Filtros
                </h3>
                <Button
                  onClick={closeModal}
                  icon={<FaTimes size={20} />}
                  variant="link"
                  size="sm"
                  className="text-gray-400 hover:text-gray-400 dark:text-gray-300 p-0 m-0 border-0 cursor-pointer"
                />
              </div>

              <div className="flex-1 overflow-y-auto flex flex-col gap-2 mb-4">
                {children}
              </div>
            </div>
          </div>

          <div
            className={`flex-1 bg-black transition-opacity duration-300 ease-in-out 
              ${isVisible ? "opacity-80" : "opacity-0"}`}
            onClick={closeModal}
          />
        </div>
      )}

      {/* Modal de Importação */}
      {showImportModal && importConfig && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-white/95 dark:bg-gray-900/95 w-full shadow-xl transform transition-transform duration-300 ease-in-out">
          <div className="bg-white rounded-lg p-4 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold text-gray-800">{importConfig.title}</h3>
              <Button
                onClick={closeImportModal}
                icon={<FaTimes size={16} />}
                variant="link"
                size="sm"
                className="text-gray-400 hover:text-gray-400 dark:text-gray-300 p-0 m-0 border-0 cursor-pointer"
              />
            </div>

            <p className="text-sm text-gray-600 mb-2">
              Escolha uma opção para importar:
            </p>

            <div className="flex flex-col gap-2 mb-3">
              <Button
                onClick={handleUploadFile}
                disabled={loading}
                icon={<FaFileImport size={12} />}
                variant="warning"
                size="sm"
                className="w-full sm:w-auto"
              >
                Fazer Upload do CSV
              </Button>

              <Button
                onClick={handleDownloadExample}
                icon={<FaDownload size={12} />}
                variant="success"
                size="sm"
                className="w-full sm:w-auto"
                disabled={loading}
              >
                Baixar Exemplo CSV
              </Button>
            </div>

            <div className="p-3 bg-gray-50 rounded-lg text-xs">
              {importConfig.formatDescription}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out forwards;
        }
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.3s ease-out forwards;
        }
        .delay-75 { animation-delay: 75ms; }
        .delay-150 { animation-delay: 150ms; }
        .delay-225 { animation-delay: 225ms; }
      `}</style>
    </>
  );
};

export default FiltersContainer;