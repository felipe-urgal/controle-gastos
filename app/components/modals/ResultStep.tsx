// app/components/import/steps/ResultStep.tsx
'use client';

import { useState } from 'react';

import { FaCheckCircle, FaExclamationTriangle, FaTimesCircle, FaRedo, FaSyncAlt } from 'react-icons/fa';

import { Button } from '@/app/components';

import { UseImportReturn } from '@/app/hook/useImport';

interface ResultStepProps {
  importManager: UseImportReturn;
  onClose: () => void;
}

export default function ResultStep({ importManager, onClose }: ResultStepProps) {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    // Forçar atualização
    window.dispatchEvent(new CustomEvent('forceReloadTransactions'));
    
    // Pequeno feedback visual
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  if (!importManager.importResult) {
    return null;
  }

  const { importedCount, duplicates, errorCount, errors } = importManager.importResult;
  const success = importedCount > 0 && errorCount === 0;

  const handleImportAgain = () => {
    importManager.reset();
  };

  return (
    <div className="space-y-6">
      {/* Resultado Principal */}
      <div className={`p-6 rounded-lg text-center ${
        success 
          ? 'bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-800' 
          : 'bg-yellow-50 border border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800'
      }`}>
        {success ? (
          <FaCheckCircle className="text-green-500 text-5xl mx-auto mb-4" />
        ) : (
          <FaExclamationTriangle className="text-yellow-500 text-5xl mx-auto mb-4" />
        )}
        
        <h3 className={`text-lg font-semibold mb-2 ${
          success ? 'text-green-800 dark:text-green-300' : 'text-yellow-800 dark:text-yellow-300'
        }`}>
          {success ? 'Importação Concluída!' : 'Importação com Observações'}
        </h3>
        
        <div className="space-y-1 text-sm">
          <p className={success ? 'text-green-700 dark:text-green-400' : 'text-yellow-700 dark:text-yellow-400'}>
            <strong>{importedCount}</strong> transações importadas com sucesso
          </p>
          {duplicates > 0 && (
            <p className="text-blue-600 dark:text-blue-400">
              <strong>{duplicates}</strong> transações duplicadas (ignoradas)
            </p>
          )}
          {errorCount > 0 && (
            <p className="text-red-600 dark:text-red-400">
              <strong>{errorCount}</strong> erros durante a importação
            </p>
          )}
        </div>
      </div>

      {/* Erros Detalhados */}
      {errors.length > 0 && (
        <div className={`p-4 rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800`}>
          <h4 className={`font-medium text-red-800 dark:text-red-300 mb-2 flex items-center`}>
            <FaTimesCircle className="mr-2" />
            Erros encontrados:
          </h4>
          <ul className="text-sm text-red-700 dark:text-red-400 space-y-1 max-h-32 overflow-y-auto">
            {errors.slice(0, 10).map((error, index) => (
              <li key={index}>• {error}</li>
            ))}
            {errors.length > 10 && (
              <li className="text-red-600 dark:text-red-500">
                ... e mais {errors.length - 10} erros
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Ações */}
      <div className="flex justify-between space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex space-x-3">
          <Button
            variant="secondary"
            onClick={handleImportAgain}
            icon={<FaRedo />}
          >
            Importar Outro
          </Button>
          
          {/* 🔥 NOVO BOTÃO DE ATUALIZAR */}
          <Button
            variant="secondary"
            onClick={handleRefresh}
            isLoading={refreshing}
            icon={<FaSyncAlt />}
          >
            {refreshing ? 'Atualizando...' : 'Atualizar Lista'}
          </Button>
        </div>
        
        <Button
          variant="primary"
          onClick={onClose}
        >
          Concluir
        </Button>
      </div>
    </div>
  );
}