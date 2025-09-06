import { NextRequest, NextResponse } from "next/server";
import { Prisma, TransactionType, AccountType } from "@prisma/client";
import { parse } from "csv-parse/sync";
import { prisma } from '@/app/lib/prisma';
import fs from 'fs';
import path from 'path';
import { parse as dateParse, parseISO, isValid } from 'date-fns';

// Função para limpar logs antigos (mais de 1 minuto)
const cleanupOldLogs = () => {
  try {
    const logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logsDir)) return;

    const files = fs.readdirSync(logsDir);
    const now = Date.now();
    const oneMinuteAgo = now - 60000; // 1 minuto em milissegundos

    files.forEach(file => {
      if (file.startsWith('import-') && file.endsWith('.log')) {
        const filePath = path.join(logsDir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.mtimeMs < oneMinuteAgo) {
          fs.unlinkSync(filePath);
          console.log(`Log antigo removido: ${file}`);
        }
      }
    });
  } catch (error) {
    console.error('Erro ao limpar logs antigos:', error);
  }
};

// Agendar limpeza a cada 5 minutos
setInterval(cleanupOldLogs, 5 * 60 * 1000);

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
    addLog(`Iniciando importação ID: ${importId}`);
    
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;

    if (!file) {
      addLog('Nenhum arquivo enviado', 'error');
      return NextResponse.json(
        { success: false, message: "Nenhum arquivo enviado" },
        { status: 400 }
      );
    }

    if (!userId) {
      addLog('Usuário não fornecido', 'error');
      return NextResponse.json(
        { success: false, message: "Usuário é obrigatório" },
        { status: 400 }
      );
    }

    addLog(`Arquivo recebido: ${file.name} (${file.size} bytes)`);
    addLog(`Processando para usuário: ${userId}`);

    const fileBuffer = await file.arrayBuffer();
    const fileContent = Buffer.from(fileBuffer).toString('utf-8');

    // Detectar delimitador automaticamente
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
      'tipo': 'type',
      'valor': 'amount',
      'conta': 'account',
      'data': 'transactionDate',
      'descricao': 'description',
      'categoria': 'category',
      'data_transacao': 'transactionDate',
      'valor_transacao': 'amount',
      'descrição': 'description'
    };

    // Processar registros com mapeamento de colunas
    const processedRecords = records.map((record: any) => {
      const processedRecord: any = {};
      
      for (const [portugueseKey, englishKey] of Object.entries(columnMapping)) {
        if (record[portugueseKey] !== undefined) {
          processedRecord[englishKey] = record[portugueseKey];
        }
      }
      
      for (const key in record) {
        if (!columnMapping[key] && !processedRecord[key]) {
          processedRecord[key] = record[key];
        }
      }
      
      return processedRecord;
    });

    // Validação básica do CSV
    const requiredColumnsEnglish = ['type', 'amount', 'account', 'transactionDate'];
    const requiredColumnsPortuguese = ['tipo', 'valor', 'conta', 'data'];
    
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

    for (const [index, record] of processedRecords.entries()) {
      const lineNumber = index + 2; // +2 porque a linha 1 é o header
      
      try {
        addLog(`Processando linha ${lineNumber}: ${JSON.stringify(record)}`);

        // Validar e converter dados
        let amountValue = record.amount;
        
        if (typeof amountValue === 'string') {
          amountValue = amountValue.replace(',', '.');
        }
        
        const amount = parseFloat(amountValue);
        if (isNaN(amount) || amount <= 0) {
          throw new Error(`Valor inválido: ${record.amount}`);
        }

        // Validar tipo de transação
        const validTypesEnglish = ['INCOME', 'EXPENSE'];
        const typeUpper = record.type.toUpperCase();
        
        let transactionType: TransactionType;
        
        if (validTypesEnglish.includes(typeUpper)) {
          transactionType = typeUpper as TransactionType;
        } else if (typeUpper === 'RECEITA') {
          transactionType = 'INCOME';
        } else if (typeUpper === 'DESPESA') {
          transactionType = 'EXPENSE';
        } else {
          throw new Error(`Tipo de transação inválido: ${record.type}`);
        }

        // Validar data
        let transactionDate: Date;
        const dateValue = record.transactionDate;

        if (typeof dateValue === 'string') {
          try {
            // Tenta como ISO
            if (dateValue.includes('-')) {
              transactionDate = parseISO(dateValue);
            } 
            // Tenta como formato brasileiro
            else if (dateValue.includes('/')) {
              transactionDate = dateParse(dateValue, 'dd/MM/yyyy', new Date());
            }
            
            if (!isValid(transactionDate)) {
              throw new Error('Data inválida');
            }
            
          } catch (error) {
            throw new Error(`Formato de data inválido: ${dateValue}`);
          }
        }

        // Verificar ou criar conta
        const accountName = record.account?.trim();
        if (!accountName) {
          throw new Error('Nome da conta é obrigatório');
        }

        let account = await prisma.account.findFirst({
          where: { 
            name: { equals: accountName, mode: 'insensitive' },
            userId: userId,
            type: "CHECKING" as AccountType
          }
        });

        if (!account) {
          addLog(`Conta "${accountName}" não encontrada. Criando nova conta...`, 'info');
          account = await prisma.account.create({
            data: {
              name: accountName,
              balance: 0,
              userId: userId,
              type: "CHECKING" as AccountType
            }
          });
          addLog(`Conta criada: ${account.name} (ID: ${account.id})`, 'success');
        }

        // Verificar ou criar categoria
        let categoryId: string | null = null;
        
        if (record.category) {
          const categoryName = record.category.trim();
          if (categoryName) {
            let category = await prisma.category.findFirst({
              where: { 
                name: { equals: categoryName, mode: 'insensitive' },
                userId: userId
              }
            });

            if (!category) {
              addLog(`Categoria "${categoryName}" não encontrada. Criando nova categoria...`, 'info');
              category = await prisma.category.create({
                data: {
                  name: categoryName,
                  userId: userId
                }
              });
              addLog(`Categoria criada: ${category.name} (ID: ${category.id})`, 'success');
            }
            categoryId = category.id;
          }
        }

        // Processar transação
        await prisma.$transaction(async (prisma) => {
          const balanceChange = transactionType === "INCOME"
            ? new Prisma.Decimal(amount)
            : new Prisma.Decimal(-amount);

          await prisma.transaction.create({
            data: {
              type: transactionType,
              amount: amount,
              description: record.description || '',
              transactionDate: transactionDate,
              year: transactionDate.getFullYear(),
              month: transactionDate.getMonth() + 1,
              day: transactionDate.getDate(),
              accountId: account.id,
              categoryId: categoryId,
              userId: userId
            }
          });

          await prisma.account.update({
            where: { id: account.id },
            data: { balance: { increment: balanceChange } }
          });
        });

        results.success++;
        addLog(`Linha ${lineNumber} processada com sucesso`, 'success');

      } catch (error) {
        results.errors++;
        const errorMsg = `Linha ${lineNumber}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`;
        results.errorMessages.push(errorMsg);
        addLog(errorMsg, 'error');
      }
    }

    // Gerar arquivo de log
    const logContent = [
      `=== LOG DE IMPORTAÇÃO ===`,
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

    // Salvar log em arquivo
    try {
      const logsDir = path.join(process.cwd(), 'logs');
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }
      
      const logFileName = `import-${importId}.log`;
      const logFilePath = path.join(logsDir, logFileName);
      fs.writeFileSync(logFilePath, logContent);
      
      addLog(`Log salvo em: ${logFilePath}`);

      // Agendar remoção do arquivo após 1 minuto
      setTimeout(() => {
        try {
          if (fs.existsSync(logFilePath)) {
            fs.unlinkSync(logFilePath);
            console.log(`Log removido automaticamente: ${logFilePath}`);
          }
        } catch (error) {
          console.error(`Erro ao remover log ${importId}:`, error);
        }
      }, 60000); // 1 minuto

    } catch (logError) {
      addLog(`Erro ao salvar log: ${logError}`, 'error');
    }

    const responseMessage = `Importação concluída: ${results.success} transação(ões) processada(s), ${results.errors} erro(s)`;
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
