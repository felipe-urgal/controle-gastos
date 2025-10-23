// app/components/modals/ImportModal.tsx - VERSÃO SIMPLIFICADA
'use client';

import { useEffect, useRef, useCallback } from 'react';

import { useAuth } from '@/app/context';

import { useImport } from '@/app/hook';

import { 
  ModalBase, 
  ModalMessage,
  UploadStep,
  MappingStep,
  ReviewStep,
  ResultStep
} from '@/app/components';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ImportModal({ isOpen, onClose }: ImportModalProps) {
  const { user } = useAuth();

  const importManager = useImport({ 
    userId: user?.id || '' 
  });

  const hasResetRef = useRef(false);

  // Reset apenas quando o modal abrir pela primeira vez após um reset completo
  useEffect(() => {
    if (isOpen && !hasResetRef.current && importManager.currentStep === 'upload' && !importManager.file) {
      // Só reseta se estiver no início e sem arquivo
      hasResetRef.current = true;
    }
  }, [isOpen, importManager.currentStep, importManager.file]);

  const handleClose = useCallback(() => {
    if (importManager.importing) {
      if (!window.confirm('A importação está em andamento. Se você fechar agora, os dados não serão salvos. Tem certeza que deseja cancelar?')) {
        return;
      }
      importManager.cancelImport();
    }
    onClose();
  }, [onClose, importManager]);

  // Handle back to list functionality
  const handleBackToList = useCallback(() => {
    if (importManager.currentStep === 'upload') {
      // If already on upload step, close the modal
      handleClose();
    } else {
      // Go back to upload step to start over
      importManager.goToStep('upload');
    }
  }, [importManager, handleClose]);

  // Renderizar step atual
  const renderCurrentStep = () => {
    switch (importManager.currentStep) {
      case 'upload':
        return <UploadStep importManager={importManager} />;
      
      case 'mapping':
        return <MappingStep importManager={importManager} />;
      
      case 'review':
        return <ReviewStep importManager={importManager} />;
      
      case 'result':
        return <ResultStep importManager={importManager} onClose={handleClose} />;
      
      default:
        return <UploadStep importManager={importManager} />;
    }
  };

  // Obter título dinâmico
  const getTitle = () => {
    const titles = {
      upload: 'Importar Extrato',
      mapping: 'Configurar Importação',
      review: 'Revisar Transações',
      result: 'Resultado da Importação'
    };
    return titles[importManager.currentStep];
  };

  // Obter subtítulo dinâmico
  const getSubtitle = () => {
    if (importManager.currentStep === 'review' && importManager.previewData.length > 0) {
      return `${importManager.previewData.length} transações encontradas`;
    }
    
    if (importManager.currentStep === 'result' && importManager.importResult) {
      const { importedCount, duplicates, errorCount } = importManager.importResult;
      return `${importedCount} importadas • ${duplicates} duplicatas • ${errorCount} erros`;
    }

    if (importManager.importing) {
      return `Importando... ${importManager.progress}%`;
    }

    return undefined;
  };

  return (
    <ModalBase
      isOpen={isOpen}
      onClose={handleClose}
      title={getTitle()}
      subtitle={getSubtitle()}
      onBackToList={handleBackToList}
      size="xl"
      showForm={false}
    >
      {/* Mensagens de erro */}
      {importManager.errors.length > 0 && (
        <div className="flex-shrink-0 mb-4 space-y-2">
          {importManager.errors.map((error, index) => (
            <ModalMessage
              key={index}
              type="error"
              message={error}
              onClose={() => importManager.goToStep('upload')}
            />
          ))}
        </div>
      )}

      {/* Indicador de estado recuperado */}
      {isOpen && importManager.currentStep !== 'upload' && importManager.previewData.length > 0 && (
        <div className="flex-shrink-0 mb-4">
          <ModalMessage
            type="info"
            message={`Importação anterior recuperada (${importManager.previewData.length} transações)`}
            onClose={() => {}}
          />
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-3">
          {renderCurrentStep()}
        </div>
      </div>
    </ModalBase>
  );
}