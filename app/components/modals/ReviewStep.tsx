// app/components/import/steps/ReviewStep.tsx - COM AVISOS MELHORADOS
'use client';

import { FaArrowLeft, FaUpload, FaExclamationTriangle, FaCheck } from 'react-icons/fa';
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
        {/* 🔥 NOVO: Alerta de Importação em Andamento */}
        {importManager.importing && (
          <div className={`p-4 rounded-lg border-2 border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 animate-pulse`}>
            <div className="flex items-start space-x-3">
              <FaExclamationTriangle className="text-yellow-600 text-xl mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="font-semibold text-yellow-800 dark:text-yellow-300">
                  Importação em Andamento
                </h4>
                <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
                  <strong>Não feche esta janela ou navegue para outra página</strong> enquanto a importação não for concluída.
                </p>
                <p className="text-xs text-yellow-600 dark:text-yellow-500 mt-2">
                  ⚠️ Se você sair agora, a importação será interrompida e as transações não serão salvas.
                </p>
              </div>
            </div>
          </div>
        )}

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

        {/* Barra de Progresso com Mais Informações */}
        {importManager.importing && (
          <div className={`p-4 rounded-lg ${colors.bg.secondary} border-2 border-blue-500`}>
            <div className="flex items-center justify-between mb-2">
              <p className={`text-sm font-medium ${colors.text.primary} flex items-center space-x-2`}>
                {importManager.progress < 100 ? (
                  <>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    <span>Processando importação...</span>
                  </>
                ) : (
                  <>
                    <FaCheck className="text-green-500" />
                    <span>Importação concluída!</span>
                  </>
                )}
              </p>
              <p className={`text-sm font-bold ${colors.text.primary}`}>
                {importManager.progress}%
              </p>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 dark:bg-gray-700 mb-3">
              <div 
                className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${importManager.progress}%` }}
              ></div>
            </div>
            
            {/* 🔥 NOVO: Informações de Tempo e Status */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className={`text-center p-2 rounded ${colors.bg.primary}`}>
                <p className={colors.text.secondary}>Transações</p>
                <p className="font-bold text-blue-600">
                  {importManager.previewData.length}
                </p>
              </div>
              <div className={`text-center p-2 rounded ${colors.bg.primary}`}>
                <p className={colors.text.secondary}>Status</p>
                <p className={`font-bold ${
                  importManager.progress < 100 ? 'text-yellow-600' : 'text-green-600'
                }`}>
                  {importManager.progress < 100 ? 'Processando' : 'Concluído'}
                </p>
              </div>
            </div>
            
            {/* 🔥 NOVO: Dica de Tempo Estimado */}
            {importManager.progress < 100 && (
              <div className={`mt-3 p-2 rounded text-center ${colors.bg.primary}`}>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  ⏱️ Tempo estimado: {importManager.previewData.length < 50 ? 'alguns segundos' : '1-2 minutos'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* 🔥 NOVO: Aviso Antes de Começar */}
        {!importManager.importing && (
          <div className={`p-4 rounded-lg border-2 border-blue-300 bg-blue-50 dark:bg-blue-900/20`}>
            <div className="flex items-start space-x-3">
              <FaExclamationTriangle className="text-blue-500 text-lg mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-blue-800 dark:text-blue-300 text-sm">
                  Antes de iniciar a importação:
                </h4>
                <ul className="text-xs text-blue-700 dark:text-blue-400 mt-2 space-y-1">
                  <li>• <strong>Certifique-se de ter tempo suficiente</strong> para aguardar o processamento</li>
                  <li>• <strong>Não feche esta janela</strong> durante a importação</li>
                  <li>• A importação pode levar alguns instantes dependendo do número de transações</li>
                </ul>
              </div>
            </div>
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
              disabled={importManager.importing}
            >
              Voltar
            </Button>
            
            <div className="flex flex-col items-end space-y-2">
              {/* 🔥 NOVO: Contador de Transações no Botão */}
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {importManager.previewData.length} transações para importar
              </p>
              
              <Button
                variant="primary"
                onClick={handleImport}
                disabled={!importManager.importConfig.accountId || importManager.importing}
                isLoading={importManager.importing}
                icon={<FaUpload />}
                iconPosition="right"
                className="min-w-32"
              >
                {importManager.importing ? (
                  `Processando... ${importManager.progress}%`
                ) : (
                  'Iniciar Importação'
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
