// app/components/import/steps/MappingStep.tsx
'use client';

import { FaArrowRight, FaArrowLeft } from 'react-icons/fa';

import { useThemeColors } from '@/app/hook';

import { Button, ColumnMapper } from '@/app/components';

import { UseImportReturn } from '@/app/hook/useImport';

interface MappingStepProps {
  importManager: UseImportReturn;
}

export default function MappingStep({ importManager }: MappingStepProps) {
  const colors = useThemeColors();

  const handleContinue = () => {
    if (importManager.previewData.length > 0) {
      importManager.goToStep('review');
    }
  };

  return (
    <div className="space-y-6">
      <div className={`p-4 rounded-lg ${colors.bg.secondary} border ${colors.border.primary}`}>
        <p className={`text-sm font-medium ${colors.text.primary} mb-3`}>
          Configure o mapeamento das colunas
        </p>
        
        <ColumnMapper
          config={importManager.importConfig}
          onConfigChange={importManager.updateConfig}
          sampleData={importManager.previewData.slice(0, 3)} // Mostrar primeiras 3 linhas como exemplo
        />
      </div>

      {/* Pré-visualização rápida */}
      {importManager.previewData.length > 0 && (
        <div className={`p-4 rounded-lg ${colors.bg.secondary} border ${colors.border.primary}`}>
          <p className={`text-sm font-medium ${colors.text.primary} mb-3`}>
            Pré-visualização ({importManager.previewData.length} transações)
          </p>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {importManager.previewData.slice(0, 5).map((transaction, index) => (
              <div key={index} className={`flex justify-between items-center text-xs p-2 rounded ${colors.bg.primary}`}>
                <span className={colors.text.primary}>{transaction.date}</span>
                <span className={`truncate flex-1 mx-2 ${colors.text.secondary}`}>
                  {transaction.description}
                </span>
                <span className={transaction.type === 'INCOME' ? 'text-green-500' : 'text-red-500'}>
                  R$ {(transaction.amount / 100).toFixed(2)}
                </span>
              </div>
            ))}
            {importManager.previewData.length > 5 && (
              <p className={`text-xs text-center ${colors.text.tertiary}`}>
                ... e mais {importManager.previewData.length - 5} transações
              </p>
            )}
          </div>
        </div>
      )}

      {/* Ações */}
      <div className="flex justify-between space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <Button
          variant="secondary"
          onClick={() => importManager.goToStep('upload')}
          icon={<FaArrowLeft />}
        >
          Voltar
        </Button>
        
        <Button
          variant="primary"
          onClick={handleContinue}
          disabled={importManager.previewData.length === 0}
          icon={<FaArrowRight />}
          iconPosition="right"
        >
          Revisar Transações
        </Button>
      </div>
    </div>
  );
}