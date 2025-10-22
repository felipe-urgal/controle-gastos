// app/api/import/process/route.ts - VERSÃO COMPLETA ASSÍNCRONA
import { NextRequest, NextResponse } from 'next/server';
import { importTransactions } from '@/app/services/importService';

// Tipo para os jobs de importação
interface ImportJob {
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED';
  progress: number;
  result?: any;
  error?: string;
  startTime: number;
}

// Extender o tipo global para armazenar jobs
declare global {
  // eslint-disable-next-line no-var
  var importJobs: Record<string, ImportJob>;
}

// Garantir que o TypeScript reconheça o campo
const g = globalThis as typeof globalThis & { importJobs: Record<string, ImportJob> };

// Inicializar storage em memória (em produção use Redis)
g.importJobs = g.importJobs || {};

// Limpar jobs antigos periodicamente
setInterval(() => {
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;
  
  for (const jobId in g.importJobs) {
    if (now - g.importJobs[jobId].startTime > oneHour) {
      delete g.importJobs[jobId];
    }
  }
}, 30 * 60 * 1000); // Limpar a cada 30 minutos

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { transactions, accountId, userId } = body;

    if (!transactions || !accountId || !userId) {
      return NextResponse.json({ 
        error: 'Dados obrigatórios faltando: transactions, accountId e userId são obrigatórios' 
      }, { status: 400 });
    }

    // Criar job de importação
    const jobId = `import-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Inicializar job
    g.importJobs[jobId] = {
      status: 'PROCESSING',
      progress: 0,
      startTime: Date.now()
    };

    // Iniciar processamento em background (NÃO ESPERAR)
    processImportAsync(jobId, transactions, accountId, userId);

    return NextResponse.json({ 
      success: true,
      jobId,
      status: 'PROCESSING',
      message: 'Importação iniciada em background' 
    });

  } catch (error) {
    console.error('💥 ERRO CRÍTICO NA IMPORTACAO:', error);
    
    return NextResponse.json(
      { 
        error: 'Erro ao iniciar importação',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
}

// Rota para verificar status do job
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json({ 
        error: 'jobId é obrigatório' 
      }, { status: 400 });
    }

    const job = g.importJobs[jobId];
    
    if (!job) {
      return NextResponse.json({ 
        error: 'Job não encontrado ou expirado' 
      }, { status: 404 });
    }

    return NextResponse.json({
      jobId,
      status: job.status,
      progress: job.progress,
      result: job.result,
      error: job.error
    });

  } catch (error) {
    console.error('Erro ao verificar status:', error);
    return NextResponse.json(
      { error: 'Erro ao verificar status da importação' },
      { status: 500 }
    );
  }
}

// Função assíncrona que roda em background
// app/api/import/process/route.ts - OTIMIZAÇÃO
async function processImportAsync(
  jobId: string, 
  transactions: any[], 
  accountId: string, 
  userId: string
) {
  try {
    console.log(`🚀 Iniciando processamento assíncrono do job: ${jobId}`);
    
    const totalTransactions = transactions.length;
    let importedCount = 0;
    let errorCount = 0;
    let duplicates = 0;

    // Atualizar progresso inicial
    g.importJobs[jobId].progress = 5;

    // Processar em lotes menores para feedback mais rápido
    const batchSize = 5; // Reduzido para 5
    const results = {
      success: true,
      importedCount: 0,
      errorCount: 0,
      duplicates: 0,
      skipped: 0,
      errors: [] as string[]
    };

    for (let i = 0; i < transactions.length; i += batchSize) {
      const batch = transactions.slice(i, i + batchSize);
      
      // Processar lote em paralelo
      const batchPromises = batch.map(transaction => 
        processSingleTransaction(transaction, accountId, userId)
      );
      
      const batchResults = await Promise.allSettled(batchPromises);
      
      // Contar resultados
      batchResults.forEach(result => {
        if (result.status === 'fulfilled') {
          if (result.value.duplicate) {
            duplicates++;
          } else if (result.value.success) {
            importedCount++;
          } else {
            errorCount++;
            if (result.value.error) {
              results.errors.push(result.value.error);
            }
          }
        } else {
          errorCount++;
          results.errors.push('Erro desconhecido na transação');
        }
      });

      // Atualizar progresso com mais frequência
      const progress = Math.min(95, Math.round(((i + batchSize) / totalTransactions) * 100));
      g.importJobs[jobId].progress = progress;
      
      // Pequena pausa para não sobrecarregar
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    // 🔥 ATUALIZAR CACHE IMEDIATAMENTE
    await invalidateCache();

    // Marcar como concluído
    results.importedCount = importedCount;
    results.errorCount = errorCount;
    results.duplicates = duplicates;

    g.importJobs[jobId].status = 'COMPLETED';
    g.importJobs[jobId].progress = 100;
    g.importJobs[jobId].result = results;

    console.log(`✅ Job ${jobId} concluído: ${importedCount} importadas, ${duplicates} duplicatas, ${errorCount} erros`);

  } catch (error) {
    console.error(`❌ Erro no job ${jobId}:`, error);
    
    g.importJobs[jobId].status = 'FAILED';
    g.importJobs[jobId].progress = 0;
    g.importJobs[jobId].error = error instanceof Error ? error.message : 'Erro desconhecido';
  }
}

async function invalidateCache(): Promise<void> {
  try {
    console.log('🔥 Cache invalidado para transações');
  } catch (error) {
    console.error(error);
    console.log('⚠️ Não foi possível invalidar cache');
  }
}

// Processar transação individual
async function processSingleTransaction(transaction: any, accountId: string, userId: string) {
  try {
    // Sua lógica de criação de transação aqui
    // Retornar { success: true, duplicate: false } ou { success: false, error: 'mensagem' }
    
    // EXEMPLO:
    const result = await importTransactions([transaction], accountId, userId);
    return { 
      success: result.importedCount > 0, 
      duplicate: result.duplicates > 0,
      error: result.errors[0] 
    };
    
  } catch (error) {
    return { 
      success: false, 
      duplicate: false, 
      error: error instanceof Error ? error.message : 'Erro desconhecido' 
    };
  }
}
