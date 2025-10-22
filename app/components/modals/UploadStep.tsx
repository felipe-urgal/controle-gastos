// app/components/import/steps/UploadStep.tsx
'use client';

import { FaArrowRight, FaInfoCircle } from 'react-icons/fa';

import { useThemeColors } from '@/app/hook';

import { Button, CSVUploader, BankSelector } from '@/app/components';

import { UseImportReturn } from '@/app/hook/useImport';

interface UploadStepProps {
  importManager: UseImportReturn;
}

export default function UploadStep({ importManager }: UploadStepProps) {
  const colors = useThemeColors();

  const handleContinue = async () => {
    if (importManager.file) {
      await importManager.parseCSV();
    }
  };

  return (
    <div className="space-y-6">
      {/* Uploader */}
      <CSVUploader
        onFileSelect={importManager.setFile}
        selectedFile={importManager.file}
      />

      {/* Banco Selecionável - AGORA COM ESTADO */}
      <BankSelector
        onBankSelect={importManager.detectBankFormat}
        selectedBank={importManager.selectedBank} // ← ESTA É A CHAVE!
      />

      {/* Informações */}
      <div className={`p-4 rounded-lg ${colors.bg.secondary} border ${colors.border.primary}`}>
        <div className="flex items-start space-x-3">
          <FaInfoCircle className={`text-blue-500 mt-0.5 flex-shrink-0`} />
          <div className="space-y-2">
            <p className={`text-sm font-medium ${colors.text.primary}`}>
              Formatos suportados
            </p>
            <ul className={`text-xs space-y-1 ${colors.text.secondary}`}>
              <li>• <strong>NuBank:</strong> Extraído pelo site ou app</li>
              <li>• <strong>Itaú:</strong> Extrato em CSV</li>
              <li>• <strong>Bradesco:</strong> Extrato em CSV</li>
              <li>• <strong>Santander:</strong> Extrato em CSV</li>
              <li>• <strong>Genérico:</strong> Colunas: Data, Descrição, Valor</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Ações */}
      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <Button
          variant="secondary"
          onClick={() => importManager.reset()}
          disabled={!importManager.file}
        >
          Limpar
        </Button>
        
        <Button
          variant="primary"
          onClick={handleContinue}
          disabled={!importManager.file || importManager.parsing}
          isLoading={importManager.parsing}
          icon={<FaArrowRight />}
          iconPosition="right"
        >
          {importManager.parsing ? 'Processando...' : 'Continuar'}
        </Button>
      </div>
    </div>
  );
}