import { NextRequest, NextResponse } from "next/server";
import { AccountType } from "@prisma/client";
import { parse } from "csv-parse/sync";
import { prisma } from '@/app/lib/prisma';
import fs from 'fs';
import path from 'path';

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
    addLog(`Iniciando importação de contas ID: ${importId}`);
    
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
      'tipo': 'type',
      'saldo': 'balance',
      'moeda': 'currency',
      'valor': 'balance',
      'name': 'name',
      'type': 'type',
      'balance': 'balance',
      'currency': 'currency'
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
    const requiredColumnsEnglish = ['name', 'type', 'balance'];
    const requiredColumnsPortuguese = ['nome', 'tipo', 'saldo'];
    
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

        // Validar e converter dados - tratar vírgula como decimal
        let balanceValue = record.balance;
        
        if (typeof balanceValue === 'string') {
          balanceValue = balanceValue.replace(',', '.').replace(/[R$\s]/g, '');
        }
        
        const balance = parseFloat(balanceValue);
        if (isNaN(balance)) {
          throw new Error(`Saldo inválido: ${record.balance}`);
        }

        // Validar tipo de conta (aceita em português também)
        const validTypesEnglish = ['CHECKING', 'SAVINGS', 'INVESTMENT', 'CREDIT', 'OTHER'];
        const validTypesPortuguese = ['CORRENTE', 'POUPANCA', 'INVESTIMENTO', 'CREDITO', 'OUTRO'];
        const validTypesMapping: { [key: string]: string } = {
          'CORRENTE': 'CHECKING',
          'POUPANCA': 'SAVINGS',
          'INVESTIMENTO': 'INVESTMENT',
          'CREDITO': 'CREDIT',
          'OUTRO': 'OTHER'
        };
        
        const typeUpper = record.type.toUpperCase();
        let accountType: string;
        
        if (validTypesEnglish.includes(typeUpper)) {
          accountType = typeUpper;
        } else if (validTypesPortuguese.includes(typeUpper)) {
          accountType = validTypesMapping[typeUpper] || typeUpper;
        } else {
          throw new Error(`Tipo de conta inválido: ${record.type}. Use: ${validTypesEnglish.join('/')} ou ${validTypesPortuguese.join('/')}`);
        }

        // Validar nome da conta
        const accountName = record.name?.trim();
        if (!accountName) {
          throw new Error('Nome da conta é obrigatório');
        }

        // Verificar se conta já existe
        const existingAccount = await prisma.account.findFirst({
          where: { 
            name: { 
              equals: accountName, 
              mode: 'insensitive'
            },
            userId: userId as string,
            type: accountType as AccountType
          }
        });

        if (existingAccount) {
          addLog(`Conta "${accountName}" já existe, ignorando duplicata`, 'info');
          results.success++; // Considera como sucesso pois já existe
          continue;
        }

        // Validar moeda (opcional)
        let currency = record.currency || 'BRL';
        if (currency) {
          currency = currency.toUpperCase();
          const validCurrencies = ['BRL', 'USD', 'EUR', 'GBP'];
          if (!validCurrencies.includes(currency)) {
            addLog(`Moeda inválida: ${currency}, usando BRL como padrão`, 'info');
            currency = 'BRL';
          }
        }

        // Criar a conta
        await prisma.account.create({
          data: {
            name: accountName,
            type: AccountType[accountType as keyof typeof AccountType],
            balance: balance,
            currency: currency,
            userId: userId as string
          }
        });

        results.success++;
        addLog(`Linha ${lineNumber} processada com sucesso: ${accountName}`, 'success');

      } catch (error) {
        results.errors++;
        const errorMsg = `Linha ${lineNumber}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`;
        results.errorMessages.push(errorMsg);
        addLog(errorMsg, 'error');
      }
    }

    // Gerar conteúdo do log
    const logContent = [
      `=== LOG DE IMPORTAÇÃO DE CONTAS ===`,
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

    const responseMessage = `Importação concluída: ${results.success} conta(s) processada(s), ${results.errors} erro(s)`;
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
