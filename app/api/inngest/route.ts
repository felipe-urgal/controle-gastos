// app/api/inngest/route.ts
import { serve } from 'inngest/next';
import { inngest } from '@/app/lib/inngest';
import { importTransactions } from '@/app/services/importService';
import { updateJob } from '@/app/services/jobService';

// ✅ FUNÇÃO DE BACKGROUND DO INNGEST
const importTransactionsFunction = inngest.createFunction(
  { 
    id: 'import-transactions',
    name: 'Importar Transações CSV' 
  },
  { event: 'import/transactions' },
  async ({ event }) => {
    const { jobId, transactions, accountId, userId } = event.data;
    
    console.log(`🚀 Iniciando importação em background: ${jobId}`);
    
    try {
      // Atualizar progresso inicial
      await updateJob(jobId, { progress: 10 });
      
      // Processar importação
      const result = await importTransactions(transactions, accountId, userId);
      
      // Atualizar job como concluído
      await updateJob(jobId, {
        status: 'COMPLETED',
        progress: 100,
        result: result,
        importedRows: result.importedCount
      });

      console.log(`✅ Importação concluída: ${result.importedCount} transações`);
      
      return { success: true, result };
      
    } catch (error) {
      console.error(`❌ Erro na importação:`, error);
      
      await updateJob(jobId, {
        status: 'FAILED',
        progress: 0,
        error: error instanceof Error ? error.message : 'Erro na importação'
      });
      
      throw error; // Inngest faz retry automático
    }
  }
);

// ✅ SERVER DO INNGEST
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [importTransactionsFunction],
});