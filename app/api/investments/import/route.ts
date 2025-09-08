import { NextRequest, NextResponse } from "next/server";
import { Prisma, InvestmentType, AccountType } from "@prisma/client";
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
    addLog(`Iniciando importação de investimentos ID: ${importId}`);
    
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
      'tipo': 'type',
      'valor': 'amount',
      'conta': 'account',
      'data': 'investmentDate',
      'descricao': 'description',
      'ticker': 'ticker',
      'quantidade': 'quantity',
      'preco_unitario': 'unitPrice',
      'data_investimento': 'investmentDate',
      'id_conta': 'accountId',
      'conta_id': 'accountId'
    };

    // Processar registros com mapeamento de colunas
    const processedRecords = records.map((record: any) => {
      const processedRecord: any = {};
      
      for (const [portugueseKey, englishKey] of Object.entries(columnMapping)) {
        if (record[portugueseKey] !== undefined) {
          processedRecord[englishKey] = record[portugueseKey];
        }
      }
      
      // Manter colunas que já estão em inglês
      for (const key in record) {
        if (!columnMapping[key] && !processedRecord[key]) {
          processedRecord[key] = record[key];
        }
      }
      
      return processedRecord;
    });

    // Validação básica do CSV - aceita ambos os idiomas
    const requiredColumnsEnglish = ['type', 'amount', 'account', 'investmentDate'];
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
        let amountValue = record.amount;
        
        if (typeof amountValue === 'string') {
          amountValue = amountValue.replace(',', '.').replace(/[R$\s]/g, '');
        }
        
        const amount = parseFloat(amountValue);
        if (isNaN(amount) || amount <= 0) {
          throw new Error(`Valor inválido: ${record.amount}`);
        }

        // Validar quantidade (opcional)
        let quantity: number | null = null;

        if (record.quantity) {
          let quantityValue = record.quantity;
          if (typeof quantityValue === 'string') {
            quantityValue = quantityValue.replace(',', '.');
          }
          quantity = parseFloat(quantityValue as string);
          if (isNaN(quantity) || quantity <= 0) {
            throw new Error(`Quantidade inválida: ${record.quantity}`);
          }
        }

        // Validar preço unitário (opcional)
        let unitPrice: number | null = null;

        if (record.unitPrice) {
          let unitPriceValue = record.unitPrice;
          if (typeof unitPriceValue === 'string') {
            unitPriceValue = unitPriceValue.replace(',', '.').replace(/[R$\s]/g, '');
          }
          unitPrice = parseFloat(unitPriceValue as string);
          if (isNaN(unitPrice) || unitPrice <= 0) {
            throw new Error(`Preço unitário inválido: ${record.unitPrice}`);
          }
        }

        // Validar tipo de investimento (aceita em português também)
        const validTypesEnglish = ['BUY', 'SELL', 'DIVIDEND'];
        const validTypesPortuguese = ['COMPRA', 'VENDA', 'DIVIDENDO'];
        const validTypesMapping: { [key: string]: string } = {
          'COMPRA': 'BUY',
          'VENDA': 'SELL',
          'DIVIDENDO': 'DIVIDEND'
        };
        
        const typeUpper = record.type.toUpperCase();
        let investmentType: InvestmentType;
        
        if (validTypesEnglish.includes(typeUpper)) {
          investmentType = typeUpper as InvestmentType;
        } else if (validTypesPortuguese.includes(typeUpper)) {
          investmentType = (validTypesMapping[typeUpper] || typeUpper) as InvestmentType;
        } else {
          throw new Error(`Tipo de investimento inválido: ${record.type}. Use: ${validTypesEnglish.join('/')} ou ${validTypesPortuguese.join('/')}`);
        }

        // Validar data - formatos suportados
        let investmentDate: Date | null = null;
        const dateValue = record.investmentDate;

        if (typeof dateValue === 'string') {
          try {
            // Tenta como ISO
            if (dateValue.includes('-')) {
              investmentDate = parseISO(dateValue);
            } 
            // Tenta como formato brasileiro
            else if (dateValue.includes('/')) {
              investmentDate = dateParse(dateValue, 'dd/MM/yyyy', new Date());
            }
            
            if (!investmentDate || !isValid(investmentDate)) {
              throw new Error('Data inválida');
            }
            
          } catch (error) {
            console.error(error)
            throw new Error(`Formato de data inválido: ${dateValue}`);
          }
        }

        // Verificar se investmentDate foi definido
        if (!investmentDate) {
          throw new Error('Data de investimento é obrigatória');
        }

        // Verificar se a conta existe pelo NOME ou ID
        const accountIdentifier = record.account?.trim() || record.accountId;
        if (!accountIdentifier) {
          throw new Error('Identificador da conta é obrigatório (account ou accountId)');
        }

        let account;
        
        // Tentar encontrar por ID primeiro
        if (record.accountId) {
          account = await prisma.account.findUnique({
            where: { 
              id: record.accountId,
              userId: userId as string,
              type: "INVESTMENT" as AccountType
            }
          });
        }
        
        // Se não encontrou por ID, tentar por nome
        if (!account && record.account) {
          account = await prisma.account.findFirst({
            where: { 
              name: { 
                equals: record.account, 
                mode: 'insensitive'
              },
              userId: userId as string,
              type: "INVESTMENT" as AccountType
            }
          });
        }

        if (!account) {
          addLog(`Conta "${record.account}" não encontrada. Criando nova conta...`, 'info');
          account = await prisma.account.create({
            data: {
              name: record.account,
              balance: 0,
              userId: userId as string,
              type: "INVESTMENT"
            }
          });
          addLog(`Conta criada: ${account.name} (ID: ${account.id})`, 'success');
        }

        // Processar em transação para garantir consistência
        await prisma.$transaction(async (prisma) => {
          // Calcular alteração de saldo
          const balanceChange = investmentType === "DIVIDEND"
            ? new Prisma.Decimal(0)
            : investmentType === "BUY"
              ? new Prisma.Decimal(amount)
              : new Prisma.Decimal(-amount);

          // Criar o investimento
          await prisma.investment.create({
            data: {
              type: investmentType,
              amount: amount,
              quantity: quantity ?? 0,   // usa 0 como fallback
              unitPrice: unitPrice ?? 0, // idem
              description: record.description || '',
              ticker: record.ticker || '',
              investmentDate: investmentDate,
              accountId: account.id,
              userId: userId as string
            }
          });

          // Atualizar saldo da conta (exceto para dividendos)
          if (investmentType !== "DIVIDEND") {
            await prisma.account.update({
              where: { id: account.id },
              data: {
                balance: { increment: balanceChange }
              }
            });
          }
        });

        results.success++;
        addLog(`Linha ${lineNumber} processada com sucesso: ${investmentType} ${amount}`, 'success');

      } catch (error) {
        results.errors++;
        const errorMsg = `Linha ${lineNumber}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`;
        results.errorMessages.push(errorMsg);
        addLog(errorMsg, 'error');
      }
    }

    // Gerar conteúdo do log
    const logContent = [
      `=== LOG DE IMPORTAÇÃO DE INVESTIMENTOS ===`,
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

    const responseMessage = `Importação concluída: ${results.success} investimento(s) processado(s), ${results.errors} erro(s)`;
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
