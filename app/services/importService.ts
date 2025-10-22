// app/services/importService.ts
'use server';

import { 
  CSVTransaction, 
  CSVImportConfig, 
  ImportResult, 
  CSVParseResult,
  DateFormat,
  BankFormat,
  BankConfig 
} from '@/app/types/import';
import { transactionService } from './transactionService';
import { accountService } from './accountService';
import { categoryService } from './categoryService';

// Remove a classe e exporta funções diretamente

const bankConfigs: Record<BankFormat, BankConfig> = {
  [BankFormat.NUBANK]: {
    name: BankFormat.NUBANK,
    dateFormat: DateFormat.DD_MM_YYYY,
    decimalSeparator: ',',
    headers: ['data', 'valor', 'identificador', 'descrição'],
    amountMultiplier: -1
  },
  [BankFormat.ITAU]: {
    name: BankFormat.ITAU,
    dateFormat: DateFormat.DD_MM_YYYY,
    decimalSeparator: ',',
    headers: ['data', 'lançamento', 'valor'],
    amountMultiplier: 1
  },
  [BankFormat.BRADESCO]: {
    name: BankFormat.BRADESCO,
    dateFormat: DateFormat.DD_MM_YYYY,
    decimalSeparator: ',',
    headers: ['data', 'histórico', 'valor'],
    amountMultiplier: 1
  },
  [BankFormat.SANTANDER]: {
    name: BankFormat.SANTANDER,
    dateFormat: DateFormat.DD_MM_YYYY,
    decimalSeparator: ',',
    headers: ['data', 'descrição', 'valor'],
    amountMultiplier: 1
  },
  [BankFormat.GENERIC]: {
    name: BankFormat.GENERIC,
    dateFormat: DateFormat.DD_MM_YYYY,
    decimalSeparator: ',',
    headers: ['date', 'description', 'amount'],
    amountMultiplier: 1
  }
};

// Helper functions
function parseCSVFields(line: string): string[] {
  const result: string[] = [];
  let currentField = '';
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === ',' && !insideQuotes) {
      result.push(currentField.trim());
      currentField = '';
    } else {
      currentField += char;
    }
  }

  result.push(currentField.trim());
  return result;
}

function parseDate(dateStr: string): Date {
  const [day, month, year] = dateStr.split(/[/-]/).map(Number);
  
  let fullYear = year;
  if (year < 100) {
    fullYear = 2000 + year;
  }

  const date = new Date(fullYear, month - 1, day);
  
  if (isNaN(date.getTime())) {
    throw new Error(`Data inválida: ${dateStr}`);
  }

  return date;
}

function parseAmount(amountStr: string): number {
  const cleanStr = amountStr.replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.');
  
  const amount = parseFloat(cleanStr);
  
  if (isNaN(amount)) {
    throw new Error(`Valor inválido: ${amountStr}`);
  }

  return Math.round(amount);
}

function getFieldIndex(fieldName: string, fields: string[], config: CSVImportConfig): number {
  if (config.hasHeaders) {
    return fields.findIndex(field => field.toLowerCase() === fieldName.toLowerCase());
  }
  return parseInt(fieldName) || 0;
}

// Versão simplificada da função findDefaultCategory
// CORREÇÃO da função findDefaultCategory
// Função findDefaultCategory corrigida
async function findDefaultCategory(
  userId: string, 
  transactionType: 'EXPENSE' | 'INCOME', 
  categoryName: string = ''
): Promise<string> {
  try {
    const categories = await categoryService.getCategories(userId);
    const categoryItems = categories.data?.items || [];
    
    console.log('🔍 Buscando categoria. Total de categorias:', categoryItems.length);
    console.log('🔍 Categoria informada:', categoryName || 'Nenhuma');

    // 1. PRIMEIRO: Buscar pela categoria específica informada (se existir)
    if (categoryName && categoryName.trim() !== '') {
      console.log(`🔍 Buscando categoria específica: "${categoryName}"`);
      
      // Buscar exatamente pelo nome da categoria
      const exactCategory = categoryItems.find((cat: any) => 
        cat.name.toLowerCase().trim() === categoryName.toLowerCase().trim() && 
        cat.type === transactionType
      );
      
      if (exactCategory) {
        console.log(`✅ Categoria exata encontrada: ${exactCategory.name} (${exactCategory.id})`);
        return exactCategory.id;
      }

      // Buscar por categoria que contenha o nome (busca parcial)
      const partialCategory = categoryItems.find((cat: any) => 
        cat.name.toLowerCase().includes(categoryName.toLowerCase()) && 
        cat.type === transactionType
      );
      
      if (partialCategory) {
        console.log(`✅ Categoria similar encontrada: ${partialCategory.name} (${partialCategory.id})`);
        return partialCategory.id;
      }

      // Buscar por categoria que seja contida no nome
      const containedCategory = categoryItems.find((cat: any) => 
        categoryName.toLowerCase().includes(cat.name.toLowerCase()) && 
        cat.type === transactionType
      );
      
      if (containedCategory) {
        console.log(`✅ Categoria contida encontrada: ${containedCategory.name} (${containedCategory.id})`);
        return containedCategory.id;
      }

      console.log(`❌ Categoria "${categoryName}" não encontrada, buscando padrão...`);
    }

    // 2. SEGUNDO: Buscar categoria "Cartão de crédito" do tipo correto
    const cartaoCreditoCategory = categoryItems.find((cat: any) => 
      cat.name.toLowerCase().includes('cartão de crédito') && 
      cat.type === transactionType
    );
    
    if (cartaoCreditoCategory) {
      console.log(`✅ Categoria "Cartão de crédito" encontrada: ${cartaoCreditoCategory.id}`);
      return cartaoCreditoCategory.id;
    }

    // 3. TERCEIRO: Buscar QUALQUER categoria do tipo correto
    const anyCategoryOfType = categoryItems.find((cat: any) => cat.type === transactionType);
    
    if (anyCategoryOfType) {
      console.log(`✅ Categoria do tipo ${transactionType} encontrada: ${anyCategoryOfType.id}`);
      return anyCategoryOfType.id;
    }

    // 4. QUARTO: Se não há categorias do tipo, criar uma baseada no nome ou padrão
    console.log(`🆕 Criando categoria para: ${transactionType}`);
    
    let newCategoryName: string;
    let newCategoryColor: string;

    if (categoryName && categoryName.trim() !== '') {
      // Usar o nome da categoria informada
      newCategoryName = categoryName.trim();
      newCategoryColor = transactionType === 'INCOME' ? '#10B981' : '#EF4444';
    } else {
      // Usar nome padrão
      newCategoryName = transactionType === 'INCOME' ? 'Outras Receitas' : 'Outras Despesas';
      newCategoryColor = transactionType === 'INCOME' ? '#10B981' : '#EF4444';
    }

    const newCategory = await categoryService.createCategory({
      name: newCategoryName,
      type: transactionType,
      color: newCategoryColor,
      userId: userId
    });
    
    console.log(`✅ Nova categoria criada: ${newCategory.name} (${newCategory.id})`);
    return newCategory.id;
    
  } catch (error) {
    console.error('❌ Erro ao buscar/criar categoria:', error);
    throw new Error(`Não foi possível obter uma categoria para ${transactionType}`);
  }
}

// Export async functions instead of class instance
export async function parseCSV(
  fileContent: string, 
  config: CSVImportConfig,
): Promise<CSVParseResult> {
  try {
    const lines = fileContent.split('\n').filter(line => line.trim());
    const transactions: CSVTransaction[] = [];
    const errors: string[] = [];
    let validRows = 0;

    const startLine = config.hasHeaders ? 1 : 0;

    for (let i = startLine; i < lines.length; i++) {
      try {
        const fields = parseCSVFields(lines[i]);
        
        // Ajuste aqui: Verificar se temos pelo menos 4 campos (Data, Valor, Identificador, Descrição)
        if (fields.length < 4) {
          errors.push(`Linha ${i + 1}: Número insuficiente de colunas (${fields.length})`);
          continue;
        }

        // Mapear corretamente para a estrutura do seu arquivo:
        // [0] = Data, [1] = Valor, [2] = Identificador, [3] = Descrição
        const date = parseDate(fields[0]);
        const description = fields[3]; // Descrição está na 4ª coluna
        const amount = parseAmount(fields[1]);
        
        const type = amount >= 0 ? 'INCOME' : 'EXPENSE';
        const absoluteAmount = Math.abs(amount);

        transactions.push({
          date: date.toISOString().split('T')[0],
          description: description.trim(),
          amount: absoluteAmount,
          type,
          categoryName: config.fieldMapping.category ? fields[getFieldIndex(config.fieldMapping.category, fields, config)] : undefined,
          originalData: Object.fromEntries(fields.map((field, index) => [`col${index}`, field]))
        });
        
        validRows++;
      } catch (error) {
        errors.push(`Linha ${i + 1}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      }
    }

    const suggestedMapping = await detectCSVFormat(fileContent);

    return {
      transactions,
      errors,
      suggestedMapping,
      totalRows: lines.length - startLine,
      validRows
    };

  } catch (error) {
    throw new Error(`Erro ao processar CSV: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
}

export async function detectCSVFormat(fileContent: string): Promise<Partial<CSVImportConfig>> {
  const firstLine = fileContent.split('\n')[0].toLowerCase();
  
  // Verificar se é formato Nubank (com 4 colunas)
  if (firstLine.includes('data') && firstLine.includes('valor') && 
      firstLine.includes('identificador') && firstLine.includes('descrição')) {
    return {
      dateFormat: DateFormat.DD_MM_YYYY,
      decimalSeparator: ',',
      hasHeaders: true,
      fieldMapping: {
        date: 'data',
        description: 'descrição',
        amount: 'valor'
      }
    };
  }
  
  // Sua lógica original para outros bancos...
  let detectedBank: BankFormat = BankFormat.GENERIC;
  
  for (const [bank, config] of Object.entries(bankConfigs)) {
    if (config.headers.every(header => firstLine.includes(header.toLowerCase()))) {
      detectedBank = bank as BankFormat;
      break;
    }
  }

  const bankConfig = bankConfigs[detectedBank];

  return {
    dateFormat: bankConfig.dateFormat,
    decimalSeparator: bankConfig.decimalSeparator,
    hasHeaders: true,
    fieldMapping: {
      date: bankConfig.headers[0],
      description: bankConfig.headers[1],
      amount: bankConfig.headers[2]
    }
  };
}

// app/services/importService.ts - CORREÇÃO DA LÓGICA DE CATEGORIAS
export async function importTransactions(
  transactions: CSVTransaction[],
  accountId: string,
  userId: string
): Promise<ImportResult> {
  const result: ImportResult = {
    success: true,
    importedCount: 0,
    errorCount: 0,
    duplicates: 0,
    skipped: 0,
    errors: []
  };

  // console.log('🔍 INICIANDO IMPORTACAO:', {
  //   totalTransactions: transactions.length,
  //   accountId,
  //   userId
  // });

  try {
    // Validar conta
    // console.log('🔍 Buscando contas do usuário:', userId);
    const accounts = await accountService.getAccounts(userId);
    // console.log('🔍 Contas encontradas:', accounts);
    
    const account = accounts.data?.items?.find((acc: any) => acc.id === accountId);
    // console.log('🔍 Conta selecionada:', account);

    if (!account) {
      const errorMsg = `Conta não encontrada: ${accountId}. Contas disponíveis: ${accounts.data?.items?.map((a: any) => a.id).join(', ') || 'nenhuma'}`;
      // console.log('❌', errorMsg);
      result.success = false;
      result.errors.push(errorMsg);
      return result;
    }

    // console.log('✅ Conta validada com sucesso');

    for (const transaction of transactions) {
      try {
        // console.log(`🔍 Processando transação ${index + 1}/${transactions.length}:`, {
        //   description: transaction.description,
        //   amount: transaction.amount,
        //   date: transaction.date,
        //   type: transaction.type
        // });

        const transactionDate = new Date(transaction.date);
        
        // Verificar duplicata
        // console.log(`🔍 Verificando duplicatas para: ${transaction.description}`);
        let existingTransactions: any = null;
        
        try {
          existingTransactions = await transactionService.getTransactions(userId, {
            account: accountId,
            month: String(transactionDate.getMonth() + 1),
            year: String(transactionDate.getFullYear()),
            day: String(transactionDate.getDate())
          });
          // console.log(`🔍 Transações existentes encontradas: ${existingTransactions.data?.items?.length || 0}`);
        } catch (searchError) {
          console.error(searchError)
          // console.warn('⚠️ Erro ao buscar transações existentes:', searchError);
        }

        // Verificar duplicatas
        const isDuplicate = existingTransactions.data?.items?.some((existingTx: any) => {
          const isDup = existingTx.description === transaction.description &&
                       existingTx.amount === transaction.amount;
          return isDup;
        });

        if (isDuplicate) {
          result.duplicates++;
          // console.log(`⏭️ Pulando transação duplicada: ${transaction.description}`);
          continue;
        }

        // LÓGICA DE CATEGORIAS CORRIGIDA
        let categoryId = '';
        
        if (transaction.categoryName && transaction.categoryName.trim() !== '') {
          // console.log(`🔍 Buscando categoria: "${transaction.categoryName}"`);
          const categories = await categoryService.getCategories(userId);
          const categoryItems = categories.data?.items || [];
          
          // Buscar categoria pelo nome
          const found = categoryItems.find((cat: any) => 
            cat.name.toLowerCase().includes(transaction.categoryName!.toLowerCase()) ||
            transaction.categoryName!.toLowerCase().includes(cat.name.toLowerCase())
          );
          
          if (found) {
            categoryId = found.id;
            // console.log(`✅ Categoria encontrada: ${found.name} (${found.id})`);
          } else {
            // console.log(`⚠️ Categoria não encontrada: "${transaction.categoryName}"`);
            // Usar categoria padrão baseada no tipo
            categoryId = await findDefaultCategory(userId, transaction.type, transaction.categoryName);
          }
        } else {
          // Sem categoryName, usar categoria padrão baseada no tipo
          // console.log(`🔍 Sem nome de categoria, usando padrão para: ${transaction.type}`);
          categoryId = await findDefaultCategory(userId, transaction.type);
        }

        console.log(`📝 Dados da transação antes de criar:`, {
          description: transaction.description,
          amount: transaction.amount,
          type: transaction.type,
          accountId,
          categoryId,
          userId,
          date: transactionDate.toISOString().split('T')[0],
          day: transactionDate.getDate(),
          month: transactionDate.getMonth() + 1,
          year: transactionDate.getFullYear()
        })

        await transactionService.createTransaction({
          amount: transaction.amount,
          description: transaction.description,
          type: transaction.type,
          accountId,
          categoryId: categoryId,
          userId,
          day: transactionDate.getDate(),
          month: transactionDate.getMonth() + 1,
          year: transactionDate.getFullYear(),
          status: 'COMPLETED'
        });

        // console.log(`✅ Transação criada com sucesso`);
        result.importedCount++;

      } catch (transactionError) {
        const errorMsg = `Erro na transação "${transaction.description}": ${transactionError instanceof Error ? transactionError.message : 'Erro desconhecido'}`;
        console.error('❌', errorMsg, transactionError);
        result.errorCount++;
        result.errors.push(errorMsg);
      }
    }

    // console.log('🎉 IMPORTACAO CONCLUIDA:', {
    //   importadas: result.importedCount,
    //   duplicatas: result.duplicates,
    //   erros: result.errorCount
    // });

  } catch (globalError) {
    const errorMsg = `Erro geral na importação: ${globalError instanceof Error ? globalError.message : 'Erro desconhecido'}`;
    console.error('❌ ERRO GLOBAL:', errorMsg, globalError);
    result.success = false;
    result.errorCount++;
    result.errors.push(errorMsg);
  }

  return result;
}