// app/api/import/process/route.ts - VERSÃO COMPLETA CORRIGIDA
import { NextRequest, NextResponse } from 'next/server';
import { inngest } from '@/app/lib/inngest';
import { 
  createJob, 
  getJob,  // ✅ ADICIONAR IMPORT
  cancelJob, // ✅ ADICIONAR IMPORT
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

    // ✅ DISPARAR EVENTO PARA INNGEST (processamento em background)
    await inngest.send({
      name: 'import/transactions',
      data: {
        jobId,
        transactions,
        accountId,
        userId
      }
    });

    console.log(`🎯 Evento disparado para Inngest: ${jobId}`);

    return NextResponse.json({ 
      success: true,
      jobId,
      status: 'PROCESSING',
      message: 'Importação iniciada em background' 
    });

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

    const job = await getJob(jobId); // ✅ AGORA ESTÁ IMPORTADO
    
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

    await cancelJob(jobId); // ✅ AGORA ESTÁ IMPORTADO

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

// ✅ REMOVER ESTA FUNÇÃO - AGORA É PROCESSADA PELO INNGEST
// A função processImportInBackground não é mais necessária aqui
// pois o Inngest vai chamar a função de background separadamente