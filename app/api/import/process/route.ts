// app/api/import/process/route.ts - VERSÃO SÍNCRONA
import { NextRequest, NextResponse } from 'next/server';
import { importTransactions } from '@/app/services/importService';
import { 
  createJob, 
  getJob,
  cancelJob,
  updateJob
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
      totalRows: transactions.length,
      importedRows: 0
    });

    // ✅ PROCESSAMENTO SÍNCRONO DIRETO
    try {
      // console.log(`🎯 Iniciando importação síncrona: ${jobId}`);
      
      // Atualizar progresso para 10%
      await updateJob(jobId, { progress: 10 });
      
      // Processar importação
      const result = await importTransactions(transactions, accountId, userId);
      
      // Atualizar job com resultado
      await updateJob(jobId, {
        status: result.success ? 'COMPLETED' : 'FAILED',
        progress: 100,
        result: result,
        importedRows: result.importedCount,
        error: result.errors.length > 0 ? result.errors[0] : undefined
      });

      // console.log(`✅ Importação concluída: ${jobId}`, {
      //   imported: result.importedCount,
      //   duplicates: result.duplicates,
      //   errors: result.errorCount
      // });

      return NextResponse.json({ 
        success: true,
        jobId,
        status: 'COMPLETED',
        result: result,
        message: 'Importação concluída com sucesso' 
      });

    } catch (processError) {
      console.error(`❌ Erro no processamento: ${jobId}`, processError);
      
      await updateJob(jobId, {
        status: 'FAILED',
        progress: 0,
        error: processError instanceof Error ? processError.message : 'Erro durante o processamento'
      });

      return NextResponse.json(
        { 
          error: 'Erro durante o processamento',
          details: processError instanceof Error ? processError.message : 'Erro desconhecido'
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Erro ao iniciar importação:', error);
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