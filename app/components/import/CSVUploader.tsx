// app/components/import/CSVUploader.tsx
'use client';

import { useRef, useCallback } from 'react';

import { FaUpload, FaFileCsv } from 'react-icons/fa';

import { useThemeColors } from '@/app/hook';

interface CSVUploaderProps {
  onFileSelect: (file: File | null) => void;
  selectedFile: File | null;
  acceptedFormats?: string;
}

export default function CSVUploader({ 
  onFileSelect, 
  selectedFile, 
  acceptedFormats = '.csv,.txt' 
}: CSVUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const colors = useThemeColors();

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    onFileSelect(file);
  }, [onFileSelect]);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file && (file.type === 'text/csv' || file.name.endsWith('.csv'))) {
      onFileSelect(file);
    }
  }, [onFileSelect]);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  }, []);

  const openFileDialog = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedFormats}
        onChange={handleFileChange}
        className="hidden"
      />
      
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={openFileDialog}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-all duration-200 hover:border-blue-400 hover:bg-blue-50/50
          dark:hover:bg-blue-900/20
          ${selectedFile ? 'border-green-400 bg-green-50/50 dark:bg-green-900/20' : colors.border.primary}
        `}
      >
        <div className="flex flex-col items-center justify-center space-y-3">
          {selectedFile ? (
            <>
              <FaFileCsv className="text-green-500 text-4xl" />
              <div>
                <p className="font-medium text-green-700 dark:text-green-300">
                  {selectedFile.name}
                </p>
                <p className="text-sm text-green-600 dark:text-green-400">
                  {(selectedFile.size / 1024).toFixed(2)} KB
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onFileSelect(null);
                }}
                className="text-sm text-red-500 hover:text-red-700"
              >
                Remover arquivo
              </button>
            </>
          ) : (
            <>
              <FaUpload className={`text-4xl ${colors.text.secondary}`} />
              <div>
                <p className={`font-medium ${colors.text.primary}`}>
                  Clique para selecionar ou arraste um arquivo CSV
                </p>
                <p className={`text-sm ${colors.text.tertiary} mt-1`}>
                  Suporta extratos do NuBank, Itaú, Bradesco, Santander
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {selectedFile && (
        <div className={`text-sm ${colors.text.secondary}`}>
          <p>✅ Arquivo selecionado: <strong>{selectedFile.name}</strong></p>
          <p>📊 Pronto para processar e visualizar as transações</p>
        </div>
      )}

      {/*{!selectedFile && importManager.persistedState?.fileInfo && (
        <div className={`p-3 rounded-lg ${colors.bg.secondary} border ${colors.border.primary} mb-4`}>
          <p className={`text-sm ${colors.text.primary}`}>
            📁 Arquivo anterior: <strong>{importManager.persistedState.fileInfo.name}</strong>
          </p>
          <p className={`text-xs ${colors.text.secondary}`}>
            Selecione um novo arquivo para continuar
          </p>
        </div>
      )}*/}
    </div>
  );
}