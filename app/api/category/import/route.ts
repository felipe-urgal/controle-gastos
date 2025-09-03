import { NextRequest, NextResponse } from "next/server";
import { parse } from "csv-parse/sync";
import { prisma } from '@/app/lib/prisma';
import fs from 'fs';
import path from 'path';

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Criar ID único para esta importação
  const importId = Date.now().toString(36) + Math.random().toString(36).substr(2);
  const logEntries: string[] = [];
  
  const addLog = (message: string, type: 'info' | 'error' | 'success' = 'info') => {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${type.toUpperCase()}] ${message}`;
    logEntries.push(logEntry);
    console.log(logEntry);
  };

  try {
    addLog(`Iniciando importação de categorias ID: ${importId}`);
    
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      addLog('Nenhum arquivo enviado', 'error');
      return NextResponse.json(
        { success: false, message: "Nenhum arquivo enviado" },
        { status: 400 }
      );
    }

    addLog(`Arquivo recebido: ${file.name} (${file.size} bytes)`);

    const fileBuffer = await file.arrayBuffer();
    const fileContent = Buffer.from(fileBuffer).toString('utf-8');

    // Detectar o delimitador automaticamente
    const detectDelimiter = (content: string): string => {
      const firstLine = content.split('\n')[0];
      const semicolonCount = (firstLine.match(/;/g) || []).length;
      const commaCount = (firstLine.match(/,/g) || []).length;
      
      if (semicolonCount > commaCount) return ';';
      if (commaCount > semicolonCount) return ',';
      return ';';
    };

    const delimiter = detectDelimiter(fileContent);
    addLog(`Delimitador detectado: ${delimiter}`);

    // Parse do CSV com delimitador detectado
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      delimiter: delimiter
    });

    addLog(`Total de linhas no CSV: ${records.length}`);

    // Mapeamento de colunas em português para inglês
    const columnMapping: { [key: string]: string } = {
      'nome': 'name',
      'name': 'name',
      'categoria': 'name',
      'category': 'name'
    };

    // Processar registros com mapeamento de colunas
    const processedRecords = records.map((record: any) => {
      const processedRecord: any = {};
      
      for (const [originalKey, englishKey] of Object.entries(columnMapping)) {
        if (record[originalKey] !== undefined) {
          processedRecord[englishKey] = record[originalKey];
        }
      }
      
      // Manter colunas que não estão no mapeamento
      for (const key in record) {
        if (!columnMapping[key] && !processedRecord[key]) {
          processedRecord[key] = record[key];
        }
      }
      
      return processedRecord;
    });

    // Validação básica do CSV - aceita ambos os idiomas
    const requiredColumnsEnglish = ['name'];
    const requiredColumnsPortuguese = ['nome'];
    
    const csvColumns = Object.keys(processedRecords[0] || {});
    
    const hasEnglishColumns = requiredColumnsEnglish.every(col => csvColumns.includes(col));
    const hasPortugueseColumns = requiredColumnsPortuguese.every(col => csvColumns.includes(col));
    
    if (!hasEnglishColumns && !hasPortugueseColumns) {
      addLog('Colunas obrigatórias faltando', 'error');
      return NextResponse.json(
        { 
          success: false, 
          message: `Colunas obrigatórias faltando. Use: ${requiredColumnsEnglish.join(', ')} ou ${requiredColumnsPortuguese.join(', ')}` 
        },
        { status: 400 }
      );
    }

    addLog('Validação de colunas bem-sucedida');

    // Processar registros
    const results = {
      success: 0,
      errors: 0,
      errorMessages: [] as string[]
    };

    const userId = formData.get('userId');

    if (!userId) {
      addLog('Usuário não fornecido', 'error');
      return NextResponse.json(
        { success: false, message: "Usuário é obrigatório" },
        { status: 400 }
      );
    }

    addLog(`Processando para usuário: ${userId}`);

    for (const [index, record] of processedRecords.entries()) {
      const lineNumber = index + 2; // +2 porque a linha 1 é o header
      
      try {
        addLog(`Processando linha ${lineNumber}: ${JSON.stringify(record)}`);

        // Validar nome da categoria
        const categoryName = record.name?.trim();
        if (!categoryName || categoryName === '') {
          throw new Error('Nome da categoria é obrigatório');
        }

        // Verificar se categoria já existe para este usuário
        const existingCategory = await prisma.category.findFirst({
          where: { 
            name: { 
              equals: categoryName, 
              mode: 'insensitive'
            },
            userId: userId as string
          }
        });

        if (existingCategory) {
          addLog(`Categoria "${categoryName}" já existe, ignorando duplicata`, 'info');
          results.success++; // Considera como sucesso pois já existe
          continue;
        }

        // Criar nova categoria
        await prisma.category.create({
          data: {
            name: categoryName,
            userId: userId as string
          }
        });

        results.success++;
        addLog(`Linha ${lineNumber} processada com sucesso: ${categoryName}`, 'success');

      } catch (error) {
        results.errors++;
        const errorMsg = `Linha ${lineNumber}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`;
        results.errorMessages.push(errorMsg);
        addLog(errorMsg, 'error');
      }
    }

    // Gerar conteúdo do log
    const logContent = [
      `=== LOG DE IMPORTAÇÃO DE CATEGORIAS ===`,
      `ID: ${importId}`,
      `Data: ${new Date().toISOString()}`,
      `Usuário: ${userId}`,
      `Arquivo: ${file.name}`,
      `Total de linhas: ${records.length}`,
      `Sucessos: ${results.success}`,
      `Erros: ${results.errors}`,
      `Taxa de sucesso: ${((results.success / records.length) * 100).toFixed(2)}%`,
      ``,
      `=== DETALHES ===`,
      ...logEntries,
      ``,
      `=== ERROS DETALHADOS ===`,
      ...results.errorMessages
    ].join('\n');

    try {
      const logsDir = path.join(process.cwd(), 'logs');
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }
      
      const logFileName = `import-${importId}.log`;
      const logFilePath = path.join(logsDir, logFileName);
      fs.writeFileSync(logFilePath, logContent);
      
      addLog(`Log salvo em: ${logFilePath}`);
    } catch (logError) {
      addLog(`Erro ao salvar log: ${logError}`, 'error');
    }

    const responseMessage = `Importação concluída: ${results.success} categoria(s) processada(s), ${results.errors} erro(s)`;
    addLog(responseMessage, 'success');

    return NextResponse.json({
      success: true,
      message: responseMessage,
      details: results.errorMessages.length > 0 ? {
        errors: results.errorMessages,
        logId: importId,
        successCount: results.success,
        errorCount: results.errors
      } : undefined
    });

  } catch (error) {
    addLog(`Erro durante a importação: ${error instanceof Error ? error.message : 'Erro desconhecido'}`, 'error');
    
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : "Erro durante a importação",
        logId: importId
      },
      { status: 500 }
    );
  }
}
