"use client";

import { usePathname } from "next/navigation";
import { useState, useEffect, useRef, ReactNode } from "react";
import { Button } from "@/app/components";
import { FaSpinner, FaPlus, FaTimesCircle, FaFilter, FaTimes, FaFileImport, FaDownload } from "react-icons/fa";
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleFilters = () => {
    setShowModal(true);
    setTimeout(() => setIsVisible(true), 10);
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
  };

  const closeImportModal = () => {
    setShowImportModal(false);
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-3 lg:mb-4">
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
              icon={loading ? <FaSpinner className="animate-spin" /> : <FaFileImport size={12} />}
              variant="success"
              size="sm"
              className="w-full sm:w-auto"
              disabled={loading}
            >
              {loading ? 'Importando...' : 'Importar' }
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
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">{importConfig.title}</h3>
              <button
                onClick={closeImportModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <FaTimes className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-6">
              Escolha uma opção para importar:
            </p>

            <div className="flex flex-col gap-3">
              <button
                onClick={handleUploadFile}
                className="flex items-center justify-center gap-2 bg-blue-500 text-white px-4 py-3 rounded-lg hover:bg-blue-600 transition-colors"
                disabled={loading}
              >
                <FaFileImport className="w-4 h-4" />
                Fazer Upload do CSV
              </button>

              <button
                onClick={handleDownloadExample}
                className="flex items-center justify-center gap-2 bg-gray-500 text-white px-4 py-3 rounded-lg hover:bg-gray-600 transition-colors"
              >
                <FaDownload className="w-4 h-4" />
                Baixar Exemplo CSV
              </button>
            </div>

            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              {importConfig.formatDescription}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FiltersContainer;