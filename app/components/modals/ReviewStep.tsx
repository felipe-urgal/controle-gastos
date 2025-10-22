// app/components/import/steps/ReviewStep.tsx - VERSÃO CORRIGIDA
'use client';

import { FaArrowLeft, FaUpload } from 'react-icons/fa';

import { useThemeColors } from '@/app/hook';

import { Button, AccountSelector, ImportPreview } from '@/app/components';

import { UseImportReturn } from '@/app/hook/useImport';

interface ReviewStepProps {
  importManager: UseImportReturn;
}

export default function ReviewStep({ importManager }: ReviewStepProps) {
  const colors = useThemeColors();

  const handleImport = async () => {
    await importManager.processImport();
  };

  const handleTransactionsChange = (updatedTransactions: any[]) => {
    importManager.updatePreviewData(updatedTransactions);
  };

  const totalAmount = importManager.previewData.reduce((sum, transaction) => {
    return transaction.type === 'INCOME' ? sum + transaction.amount : sum - transaction.amount;
  }, 0);

  return (
    <div className="flex flex-col h-full">
      {/* Conteúdo scrollável */}
      <div className="flex-1 overflow-y-auto space-y-6 p-1">
        {/* Resumo */}
        <div className={`p-4 rounded-lg ${colors.bg.secondary} border ${colors.border.primary}`}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className={`text-2xl font-bold ${colors.text.primary}`}>
                {importManager.previewData.length}
              </p>
              <p className={`text-xs ${colors.text.secondary}`}>Transações</p>
            </div>
            <div>
              <p className={`text-2xl font-bold text-green-500`}>
                {importManager.previewData.filter(t => t.type === 'INCOME').length}
              </p>
              <p className={`text-xs ${colors.text.secondary}`}>Receitas</p>
            </div>
            <div>
              <p className={`text-2xl font-bold text-red-500`}>
                {importManager.previewData.filter(t => t.type === 'EXPENSE').length}
              </p>
              <p className={`text-xs ${colors.text.secondary}`}>Despesas</p>
            </div>
            <div>
              <p className={`text-2xl font-bold ${totalAmount >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                R$ {(Math.abs(totalAmount) / 100).toFixed(2)}
              </p>
              <p className={`text-xs ${colors.text.secondary}`}>Saldo</p>
            </div>
          </div>
        </div>

        {/* Seletor de Conta */}
        <div className={`p-4 rounded-lg ${colors.bg.secondary} border ${colors.border.primary}`}>
          <p className={`text-sm font-medium ${colors.text.primary} mb-3`}>
            Selecione a conta de destino
          </p>
          <AccountSelector
            onAccountSelect={importManager.setAccount}
            selectedAccountId={importManager.importConfig.accountId}
          />
        </div>

        {/* Barra de Progresso */}
        {importManager.importing && (
          <div className={`p-4 rounded-lg ${colors.bg.secondary} border ${colors.border.primary}`}>
            <div className="flex items-center justify-between mb-2">
              <p className={`text-sm font-medium ${colors.text.primary}`}>
                Importando transações...
              </p>
              <p className={`text-sm ${colors.text.secondary}`}>
                {importManager.progress}%
              </p>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${importManager.progress}%` }}
              ></div>
            </div>
            {importManager.jobId && (
              <p className={`text-xs ${colors.text.secondary} mt-2`}>
                Job: {importManager.jobId.substring(0, 8)}...
              </p>
            )}
          </div>
        )}

        {/* Pré-visualização EDITÁVEL */}
        <div className="flex-1 min-h-0">
          <ImportPreview
            transactions={importManager.previewData}
            onTransactionsChange={handleTransactionsChange}
          />
        </div>

        {/* Ações */}
        <div className="flex-shrink-0 p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="flex justify-between space-x-3">
            <Button
              variant="secondary"
              onClick={() => importManager.goToStep('mapping')}
              icon={<FaArrowLeft />}
            >
              Voltar
            </Button>
            
            <Button
              variant="primary"
              onClick={handleImport}
              disabled={!importManager.importConfig.accountId || importManager.importing}
              isLoading={importManager.importing}
              icon={<FaUpload />}
              iconPosition="right"
            >
              {importManager.importing ? 'Importando...' : 'Importar Transações'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}