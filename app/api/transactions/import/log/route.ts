// app/api/transaction/import/log/route.ts
import { NextRequest, NextResponse } from "next/server";
import fs from 'fs';
import path from 'path';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const logId = searchParams.get('id');

    if (!logId) {
      return NextResponse.json(
        { success: false, message: "ID do log é obrigatório" },
        { status: 400 }
      );
    }

    // Verificar se o logId é válido (apenas caracteres alfanuméricos e hífens)
    if (!/^[a-zA-Z0-9-]+$/.test(logId)) {
      return NextResponse.json(
        { success: false, message: "ID do log inválido" },
        { status: 400 }
      );
    }

    const logsDir = path.join(process.cwd(), 'logs');
    const logFilePath = path.join(logsDir, `import-${logId}.log`);

    console.log(`Buscando log em: ${logFilePath}`);
    
    if (!fs.existsSync(logFilePath)) {
      console.log('Arquivo de log não encontrado');
      return NextResponse.json(
        { success: false, message: "Log não encontrado" },
        { status: 404 }
      );
    }

    const logContent = fs.readFileSync(logFilePath, 'utf-8');

    return new NextResponse(logContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
        'Content-Disposition': `attachment; filename="import-log-${logId}.txt"`,
      },
    });

  } catch (error) {
    console.error('Erro ao recuperar log:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : "Erro ao recuperar log" 
      },
      { status: 500 }
    );
  }
}
