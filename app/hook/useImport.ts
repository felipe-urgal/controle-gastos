// app/hooks/useImport.ts - CORREÇÃO COMPLETA
'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

import { 
  CSVTransaction, 
  CSVImportConfig, 
  ImportResult, 
  CSVParseResult,
  BankFormat,
  DateFormat 
} from '@/app/types/import';

import { usePersistedState } from './usePersistedState';

export interface UseImportProps {
  userId: string;
}

export interface UseImportReturn {
  // Estados
  loading: boolean;
  parsing: boolean;
  importing: boolean;
  currentStep: 'upload' | 'mapping' | 'review' | 'result';
  file: File | null;
  previewData: CSVTransaction[];
  importConfig: CSVImportConfig;
  importResult: ImportResult | null;
  errors: string[];
  progress: number;
  jobId: string | null;
  
  // Ações
  setFile: (file: File | null) => void;
  parseCSV: () => Promise<void>;
  updateConfig: (config: Partial<CSVImportConfig>) => void;
  setAccount: (accountId: string) => void;
  processImport: () => Promise<void>;
  goToStep: (step: 'upload' | 'mapping' | 'review' | 'result') => void;
  reset: () => void;
  detectBankFormat: (bank: BankFormat) => void;
  selectedBank: BankFormat | null;
  cancelImport: () => void;
  updatePreviewData: (transactions: CSVTransaction[]) => void;
}

// Estado persistido - AGORA INCLUI FILE INFO
export interface PersistedImportState {
  currentStep: 'upload' | 'mapping' | 'review' | 'result';
  previewData: CSVTransaction[];
  importConfig: CSVImportConfig;
  importResult: ImportResult | null;
  selectedBank: BankFormat | null;
  importing: boolean;
  progress: number;
  jobId: string | null;
  fileInfo: {
    name: string;
    size: number;
    lastModified: number;
  } | null;
}

const defaultPersistedState: PersistedImportState = {
  currentStep: 'upload',
  previewData: [],
  importConfig: {
    dateFormat: DateFormat.DD_MM_YYYY,
    decimalSeparator: ',',
    hasHeaders: true,
    fieldMapping: {
      date: 'data',
      description: 'descrição',
      amount: 'valor',
      type: undefined,
      category: undefined
    },
    accountId: ''
  },
  importResult: null,
  selectedBank: null,
  importing: false,
  progress: 0,
  jobId: null,
  fileInfo: null
};

export function useImport({ userId }: UseImportProps): UseImportReturn {
  // Estados persistidos
  const [persistedState, setPersistedState] = usePersistedState<PersistedImportState>(
    `import-${userId}`,
    defaultPersistedState,
    'session'
  );

  // Estados não persistidos
  const [loading, setLoading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  
  // Refs para controlar o polling
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Atualizar estados persistidos individualmente
  const updatePersistedState = useCallback((updates: Partial<PersistedImportState>) => {
    setPersistedState(prev => ({ ...prev, ...updates }));
  }, [setPersistedState]);

  // Setters para estados persistidos
  const setCurrentStep = useCallback((step: 'upload' | 'mapping' | 'review' | 'result') => {
    updatePersistedState({ currentStep: step });
    setErrors([]);
  }, [updatePersistedState]);

  const setPreviewData = useCallback((data: CSVTransaction[]) => {
    updatePersistedState({ previewData: data });
  }, [updatePersistedState]);

  const setImportConfig = useCallback((config: CSVImportConfig) => {
    updatePersistedState({ importConfig: config });
  }, [updatePersistedState]);

  const setImportResult = useCallback((result: ImportResult | null) => {
    updatePersistedState({ importResult: result });
  }, [updatePersistedState]);

  const setSelectedBank = useCallback((bank: BankFormat | null) => {
    updatePersistedState({ selectedBank: bank });
  }, [updatePersistedState]);

  const setImporting = useCallback((importing: boolean) => {
    updatePersistedState({ importing });
  }, [updatePersistedState]);

  const setProgress = useCallback((progress: number) => {
    updatePersistedState({ progress });
  }, [updatePersistedState]);

  const setJobId = useCallback((jobId: string | null) => {
    updatePersistedState({ jobId });
  }, [updatePersistedState]);

  const setFileInfo = useCallback((fileInfo: PersistedImportState['fileInfo']) => {
    updatePersistedState({ fileInfo });
  }, [updatePersistedState]);

  // Inicializar file do estado persistido
  useEffect(() => {
    if (persistedState.fileInfo && !file) {
      // Podemos mostrar informações do arquivo mesmo sem o File object
      console.log('Arquivo recuperado do estado:', persistedState.fileInfo);
    }
  }, [persistedState.fileInfo, file]);

  const forceRefreshTransactions = useCallback(async () => {
    try {
      // Disparar evento customizado para atualizar listas
      window.dispatchEvent(new CustomEvent('transactionsUpdated'));
      
      // Invalidar cache se estiver usando React Query
      if (typeof window !== 'undefined' && (window as any).queryClient) {
        (window as any).queryClient.invalidateQueries(['transactions']);
        (window as any).queryClient.invalidateQueries(['accounts']);
      }

      // Forçar recarregamento da página de transações se estiver aberta
      const transactionPages = ['/transactions', '/dashboard', '/'];
      if (transactionPages.some(path => window.location.pathname.includes(path))) {
        // Pequeno delay para garantir que o banco processou
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('forceReloadTransactions'));
        }, 500);
      }

    } catch (error) {
      console.log('Forçando atualização de transações...');
      console.error(error)
    }
  }, []);

  const startPolling = useCallback((jobId: string) => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    const poll = async () => {
      if (!isMountedRef.current) return;

      try {
        const statusResponse = await fetch(`/api/import/process?jobId=${jobId}`);
        
        if (!statusResponse.ok) {
          throw new Error('Erro ao verificar status');
        }

        const status = await statusResponse.json();

        // Atualizar progresso
        if (status.progress !== undefined) {
          setProgress(status.progress);
        }

        // CORREÇÃO: Verificar todos os status finais
        if (status.status !== 'PROCESSING') {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
          
          if (status.status === 'COMPLETED') {
            setImportResult(status.result);
            setCurrentStep('result');
            setImporting(false);
            setProgress(100);
            await forceRefreshTransactions();
          } else if (status.status === 'FAILED' || status.status === 'CANCELLED') {
            setErrors([status.error || `Importação ${status.status.toLowerCase()}`]);
            setImporting(false);
            setProgress(0);
          }
        }

      } catch (error) {
        console.error('Erro no polling:', error);
        // Em caso de erro, continuar polling (pode ser temporário)
      }
    };

    // CORREÇÃO: Polling mais conservador para Vercel (3 segundos)
    pollIntervalRef.current = setInterval(poll, 3000);
    
    // Primeiro poll imediato
    poll();
  }, [setProgress, setImportResult, setCurrentStep, setImporting, forceRefreshTransactions]);

  // Garantir que o polling seja limpo quando o componente desmontar
  useEffect(() => {
    isMountedRef.current = true;

    // Se havia um job ativo ao carregar, reiniciar o polling
    if (persistedState.importing && persistedState.jobId) {
      startPolling(persistedState.jobId);
    }
    
    return () => {
      isMountedRef.current = false;
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [persistedState.importing, persistedState.jobId, startPolling]);

  // Função para cancelar importação
  const cancelImport = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    setImporting(false);
    setProgress(0);
    setJobId(null);
    setErrors(['Importação cancelada pelo usuário']);
  }, [setImporting, setProgress, setJobId]);

  // Handler para definir arquivo
  const handleSetFile = useCallback(async (newFile: File | null) => {
    setFile(newFile);
    setErrors([]);
    
    if (newFile) {
      // Salvar informações do arquivo (não o objeto File completo)
      setFileInfo({
        name: newFile.name,
        size: newFile.size,
        lastModified: newFile.lastModified
      });
      setPreviewData([]);
      setProgress(0);
      setJobId(null);
    } else {
      setFileInfo(null);
      setPreviewData([]);
      setProgress(0);
      setJobId(null);
      
      setImportConfig({
        ...persistedState.importConfig,
        fieldMapping: {
          date: 'data',
          description: 'descrição', 
          amount: 'valor',
          type: undefined,
          category: undefined
        }
      });
      return;
    }

    try {
      setLoading(true);
      const content = await readFileContent(newFile);
      
      const detectResponse = await fetch('/api/import/detect-format', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileContent: content })
      });

      if (detectResponse.ok) {
        const detectedConfig = await detectResponse.json();
        setImportConfig({
          ...persistedState.importConfig,
          ...detectedConfig
        });
      }
    } catch (error) {
      console.error('Erro ao detectar formato:', error);
      setErrors(['Erro ao detectar formato do arquivo']);
    } finally {
      setLoading(false);
    }
  }, [persistedState.importConfig, setPreviewData, setProgress, setJobId, setImportConfig, setFileInfo]);

  // Parse do CSV
  const parseCSV = useCallback(async () => {
    if (!file) {
      setErrors(['Selecione um arquivo primeiro']);
      return;
    }

    try {
      setParsing(true);
      setErrors([]);
      
      const content = await readFileContent(file);
      
      const parseResponse = await fetch('/api/import/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileContent: content,
          config: persistedState.importConfig,
          userId
        })
      });

      const result: CSVParseResult = await parseResponse.json();

      if (parseResponse.ok) {
        setPreviewData(result.transactions);
        
        if (result.errors.length > 0) {
          setErrors(prev => [...prev, ...result.errors.slice(0, 5)]);
        }

        if (result.transactions.length > 0) {
          setCurrentStep('review');
        } else {
          setErrors(['Nenhuma transação válida encontrada no arquivo']);
        }
      } else {
        setErrors([result.errors?.[0] || 'Erro ao processar arquivo']);
      }
    } catch (error) {
      console.error('Erro no parse:', error);
      setErrors(['Erro ao processar arquivo CSV']);
    } finally {
      setParsing(false);
    }
  }, [file, persistedState.importConfig, userId, setPreviewData, setCurrentStep]);

  const updateConfig = useCallback((config: Partial<CSVImportConfig>) => {
    setImportConfig({ ...persistedState.importConfig, ...config });
  }, [persistedState.importConfig, setImportConfig]);

  const setAccount = useCallback((accountId: string) => {
    setImportConfig({ ...persistedState.importConfig, accountId });
  }, [persistedState.importConfig, setImportConfig]);

  const goToStep = useCallback((step: 'upload' | 'mapping' | 'review' | 'result') => {
    setCurrentStep(step);
  }, [setCurrentStep]);

  const detectBankFormat = useCallback((bank: BankFormat) => {
    setSelectedBank(bank);

    const bankConfigs = {
      [BankFormat.NUBANK]: {
        dateFormat: DateFormat.DD_MM_YYYY,
        decimalSeparator: ',' as const,
        hasHeaders: true,
        fieldMapping: {
          date: 'data',
          description: 'descrição',
          amount: 'valor',
          type: undefined,
          category: undefined
        }
      },
      [BankFormat.ITAU]: {
        dateFormat: DateFormat.DD_MM_YYYY,
        decimalSeparator: ',' as const,
        hasHeaders: true,
        fieldMapping: {
          date: 'data',
          description: 'lançamento',
          amount: 'valor',
          type: undefined,
          category: undefined
        }
      },
      [BankFormat.BRADESCO]: {
        dateFormat: DateFormat.DD_MM_YYYY,
        decimalSeparator: ',' as const,
        hasHeaders: true,
        fieldMapping: {
          date: 'data',
          description: 'histórico',
          amount: 'valor',
          type: undefined,
          category: undefined
        }
      },
      [BankFormat.SANTANDER]: {
        dateFormat: DateFormat.DD_MM_YYYY,
        decimalSeparator: ',' as const,
        hasHeaders: true,
        fieldMapping: {
          date: 'data',
          description: 'descrição',
          amount: 'valor',
          type: undefined,
          category: undefined
        }
      },
      [BankFormat.GENERIC]: {
        dateFormat: DateFormat.DD_MM_YYYY,
        decimalSeparator: ',' as const,
        hasHeaders: true,
        fieldMapping: {
          date: 'date',
          description: 'description',
          amount: 'amount',
          type: undefined,
          category: undefined
        }
      }
    };

    setImportConfig({
      ...persistedState.importConfig,
      ...bankConfigs[bank]
    });
  }, [persistedState.importConfig, setImportConfig, setSelectedBank]);

  // Processar importação com polling
  const processImport = useCallback(async () => {
    if (!persistedState.importConfig.accountId) {
      setErrors(['Selecione uma conta de destino']);
      return;
    }

    if (persistedState.previewData.length === 0) {
      setErrors(['Nenhuma transação para importar']);
      return;
    }

    setImporting(true);
    setProgress(0);
    setErrors([]);
    setJobId(null);

    try {
      // Iniciar importação
      const startResponse = await fetch('/api/import/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactions: persistedState.previewData,
          accountId: persistedState.importConfig.accountId,
          userId
        })
      });

      if (!startResponse.ok) {
        throw new Error('Erro ao iniciar importação');
      }

      const startResult = await startResponse.json();
      
      if (!startResult.jobId) {
        throw new Error('Job ID não retornado');
      }

      setJobId(startResult.jobId);
      setProgress(5);

      // Iniciar polling
      startPolling(startResult.jobId);

    } catch (error) {
      console.error('Erro ao iniciar importação:', error);
      setErrors(['Erro ao iniciar importação: ' + (error instanceof Error ? error.message : 'Erro desconhecido')]);
      setImporting(false);
      setProgress(0);
    }
  }, [persistedState.previewData, persistedState.importConfig.accountId, userId, startPolling, setImporting, setProgress, setJobId]);

  const reset = useCallback(() => {
    setLoading(false);
    setParsing(false);
    setImporting(false);
    setCurrentStep('upload');
    setFile(null);
    setPreviewData([]);
    setImportConfig(defaultPersistedState.importConfig);
    setImportResult(null);
    setErrors([]);
    setSelectedBank(null);
    setProgress(0);
    setJobId(null);
    setFileInfo(null);
    
    // Limpar polling
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

    // Limpar storage
    sessionStorage.removeItem(`import-${userId}`);
  }, [userId, setCurrentStep, setPreviewData, setImportConfig, setImportResult, setSelectedBank, setImporting, setProgress, setJobId, setFileInfo]);

  const updatePreviewData = useCallback((updatedTransactions: CSVTransaction[]) => {
    setPreviewData(updatedTransactions);
  }, [setPreviewData]);

  return {
    // Estados
    loading,
    parsing,
    importing: persistedState.importing,
    currentStep: persistedState.currentStep,
    file,
    previewData: persistedState.previewData,
    importConfig: persistedState.importConfig,
    importResult: persistedState.importResult,
    errors,
    selectedBank: persistedState.selectedBank,
    progress: persistedState.progress,
    jobId: persistedState.jobId,
    
    // Ações
    setFile: handleSetFile,
    parseCSV,
    updateConfig,
    setAccount,
    processImport,
    goToStep,
    reset,
    detectBankFormat,
    cancelImport,
    updatePreviewData
  };
}

// Helper para ler conteúdo do arquivo
async function readFileContent(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      resolve(e.target?.result as string);
    };
    
    reader.onerror = () => {
      reject(new Error('Erro ao ler arquivo'));
    };
    
    reader.readAsText(file, 'UTF-8');
  });
}
