// hooks/useImport.ts
import { useState, useCallback } from 'react';
import { toast } from 'react-toastify';

interface UseImportOptions {
  importFunction: (file: File, userId: string) => Promise<Response>;
  onSuccess?: () => void;
}

export function useImport({ importFunction, onSuccess }: UseImportOptions) {
  const [importLoading, setImportLoading] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<any[]>([]);

  // Função para baixar o CSV com resultados
  const downloadResultCSV = useCallback(async (response: Response) => {
    try {
      const csvContent = await response.text();
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `resultado_importacao_${Date.now()}.csv`;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      const blob = new Blob([csvContent], { type: 'text/csv; charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      return true;
    } catch (error) {
      console.error('Erro ao baixar CSV:', error);
      return false;
    }
  }, []);

  // Processar preview do arquivo
  const handleFileSelect = useCallback(async (file: File) => {
    try {
      setSelectedFile(file);
      
      // Fazer preview do arquivo
      const fileBuffer = await file.arrayBuffer();
      const fileContent = Buffer.from(fileBuffer).toString('utf-8');
      
      // Parse básico do CSV para preview
      const lines = fileContent.split('\n').filter(line => line.trim());
      const headers = lines[0].split(';');
      const previewData = lines.map(line => { // Mostrar apenas as primeiras 5 linhas + header
        const values = line.split(';');
        return headers.reduce((obj, header, index) => {
          obj[header.trim()] = values[index] ? values[index].trim() : '';
          return obj;
        }, {} as any);
      });
      
      setImportPreview(previewData);
      setImportModalOpen(true);
    } catch (error) {
      toast.error('Erro ao processar arquivo');
      console.error('File processing error:', error);
    }
  }, []);

  // Confirmar importação
  const handleConfirmImport = useCallback(async (userId: string) => {
    if (!selectedFile) return;
    
    try {
      setImportLoading(true);
      
      const response = await importFunction(selectedFile, userId);

      // Verificar se a resposta é um CSV (sucesso) ou JSON (erro)
      const contentType = response.headers.get('content-type');
      
      if (contentType?.includes('text/csv')) {
        // Sucesso - CSV com resultados
        const successCount = parseInt(response.headers.get('X-Success-Count') || '0');
        const errorCount = parseInt(response.headers.get('X-Error-Count') || '0');
        
        // Baixar automaticamente o CSV com resultados
        const downloadSuccess = await downloadResultCSV(response);
        
        if (downloadSuccess) {
          if (errorCount > 0) {
            toast.info(
              `Importação concluída com ${successCount} sucesso(s) e ${errorCount} erro(s). O arquivo com resultados foi baixado automaticamente.`,
              { autoClose: 10000 }
            );
          } else {
            toast.success(`Importação concluída com sucesso! ${successCount} registro(s) processado(s).`);
          }
        } else {
          toast.error('Erro ao baixar resultados da importação');
        }
        
        onSuccess?.();
      } else {
        // Erro - JSON com mensagem de erro
        const errorData = await response.json();
        toast.error(errorData.message || 'Erro ao importar arquivo');
        
        if (errorData.details?.errors) {
          errorData.details.errors.forEach((error: string) => {
            toast.error(error);
          });
        }
      }
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao importar arquivo';
      toast.error(errorMessage);
      console.error('Import error:', error);
    } finally {
      setImportModalOpen(false);
      setImportLoading(false);
      setSelectedFile(null);
      setImportPreview([]);
    }
  }, [selectedFile, importFunction, downloadResultCSV, onSuccess]);

  // Cancelar importação
  const handleCancelImport = useCallback(() => {
    setImportModalOpen(false);
    setSelectedFile(null);
    setImportPreview([]);
  }, []);

  return {
    importLoading,
    importModalOpen,
    selectedFile,
    importPreview,
    handleFileSelect,
    handleConfirmImport,
    handleCancelImport,
    setImportModalOpen
  };
}
