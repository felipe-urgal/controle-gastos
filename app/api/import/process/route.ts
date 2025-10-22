// app/api/import/process/route.ts - VERSÃO CORRIGIDA
import { NextRequest, NextResponse } from 'next/server';
import { importTransactions } from '@/app/services/importService';
import { 
  createJob, 
  updateJob, 
  getJob, 
  cancelJob 
} from '@/app/services/jobService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { transactions, accountId, userId, fileName, fileSize, bankFormat } = body;

    if (!transactions || !accountId || !userId) {
      return NextResponse.json({ 
        error: 'Dados obrigatórios faltando' 
      }, { status: 400 });
    }

    // Criar job no database
    const jobId = `import-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    await createJob({
      jobId,
      userId,
      status: 'PROCESSING',
      progress: 0,
      fileName,
      fileSize,
      bankFormat,
      totalRows: transactions.length
    });

    // Processar em background
    processImportInBackground(jobId, transactions, accountId, userId)
      .catch(error => {
        console.error(`Erro no background job ${jobId}:`, error);
      });

    return NextResponse.json({ 
      success: true,
      jobId,
      status: 'PROCESSING',
      message: 'Importação iniciada' 
    });

  } catch (error) {
    console.error('Erro na importação:', error);
    return NextResponse.json(
      { error: 'Erro ao iniciar importação' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json({ error: 'jobId é obrigatório' }, { status: 400 });
    }

    const job = await getJob(jobId);
    
    if (!job) {
      return NextResponse.json({ error: 'Job não encontrado' }, { status: 404 });
    }

    return NextResponse.json({
      jobId: job.jobId,
      status: job.status,
      progress: job.progress,
      result: job.result,
      error: job.error,
      fileName: job.fileName,
      totalRows: job.totalRows,
      importedRows: job.importedRows
    });

  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Erro ao verificar status' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json({ error: 'jobId é obrigatório' }, { status: 400 });
    }

    await cancelJob(jobId);

    return NextResponse.json({ 
      success: true,
      message: 'Importação cancelada'
    });

  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Erro ao cancelar importação' },
      { status: 500 }
    );
  }
}

// Função de processamento em background
async function processImportInBackground(
  jobId: string, 
  transactions: any[], 
  accountId: string, 
  userId: string
) {
  try {
    console.log(`🚀 Iniciando processamento background: ${jobId}`);
    
    const result = await importTransactions(transactions, accountId, userId);
    
    // Atualizar progresso final
    await updateJob(jobId, {
      status: 'COMPLETED',
      progress: 100,
      result: result,
      importedRows: result.importedCount
    });

    console.log(`✅ Job ${jobId} concluído: ${result.importedCount} importadas`);

  } catch (error) {
    console.error(`❌ Erro no job ${jobId}:`, error);
    
    await updateJob(jobId, {
      status: 'FAILED',
      progress: 0,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}