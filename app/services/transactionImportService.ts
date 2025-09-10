import { Prisma, TransactionType, AccountType } from "@prisma/client";
import { prisma } from '@/app/lib/prisma';
import { CsvProcessor } from '@/app/lib/csv/csvProcessor';
import { parse as dateParse, parseISO, isValid } from 'date-fns';

export class TransactionImportService {
  public static readonly CSV_OPTIONS = {
    columnMappings: {
      'tipo': 'type',
      'valor': 'amount',
      'conta': 'account',
      'data': 'transactionDate',
      'descricao': 'description',
      'categoria': 'category',
      'data_transacao': 'transactionDate',
      'valor_transacao': 'amount',
      'descrição': 'description',
      'type': 'type',
      'amount': 'amount',
      'account': 'account',
      'transactionDate': 'transactionDate',
      'description': 'description',
      'category': 'category'
    },
    requiredFields: ['type', 'amount', 'account', 'transactionDate'],
    decimalSeparator: ',' as const,
    dateFormats: ['dd/MM/yyyy', 'yyyy-MM-dd', 'yyyy/MM/dd']
  };

  // Método público para validar headers
  static validateRequiredColumns(headers: string[]): boolean {
    const normalizedHeaders = headers.map(header => 
      CsvProcessor.normalizeHeader(header, this.CSV_OPTIONS.columnMappings)
    );
    
    return this.CSV_OPTIONS.requiredFields.every(field => 
      normalizedHeaders.includes(field)
    );
  }

  static async processTransactionRecord(record: any, userId: string): Promise<{ success: boolean; errors?: string[] }> {
    const errors: string[] = [];

    try {
      // Validar e converter tipo de transação
      const transactionType = this.parseTransactionType(record.type);
      if (!transactionType) {
        errors.push(`Tipo de transação inválido: ${record.type}`);
      }

      // Validar e converter valor
      const amount = CsvProcessor.parseValue(record.amount, 'number', this.CSV_OPTIONS);
      if (!amount || amount <= 0) {
        errors.push(`Valor inválido: ${record.amount}`);
      }

      // Validar e converter data
      const transactionDate = this.parseDate(record.transactionDate);
      if (!transactionDate) {
        errors.push(`Data inválida: ${record.transactionDate}`);
      }

      // Validar conta
      const accountName = record.account?.trim();
      if (!accountName) {
        errors.push('Nome da conta é obrigatório');
      }

      if (errors.length > 0) {
        return { success: false, errors };
      }

      // Encontrar ou criar conta
      const account = await this.findOrCreateAccount(accountName!, userId);
      if (!account) {
        return { success: false, errors: ['Erro ao processar conta'] };
      }

      // Encontrar ou criar categoria
      let categoryId: string | null = null;
      if (record.category) {
        const category = await this.findOrCreateCategory(record.category.trim(), userId);
        categoryId = category?.id || null;
      }

      // Criar transação
      await this.createTransaction({
        type: transactionType!,
        amount: amount!,
        transactionDate: transactionDate!,
        accountId: account.id,
        userId,
        description: record.description,
        categoryId
      });

      return { success: true };

    } catch (error) {
      return { 
        success: false, 
        errors: [error instanceof Error ? error.message : 'Erro ao criar transação'] 
      };
    }
  }

  private static parseTransactionType(type: string): TransactionType | null {
    const validTypesMapping: { [key: string]: TransactionType } = {
      'INCOME': TransactionType.INCOME,
      'EXPENSE': TransactionType.EXPENSE,
      'RECEITA': TransactionType.INCOME,
      'DESPESA': TransactionType.EXPENSE,
      'RENDIMENTO': TransactionType.INCOME,
      'GASTO': TransactionType.EXPENSE
    };

    const typeUpper = (type || '').toUpperCase();
    return validTypesMapping[typeUpper] || null;
  }

  private static parseDate(dateValue: string): Date | null {
    if (!dateValue) return null;

    try {
      // Tenta como ISO
      if (dateValue.includes('-')) {
        const isoDate = parseISO(dateValue);
        if (isValid(isoDate)) return isoDate;
      }
      
      // Tenta como formato brasileiro
      if (dateValue.includes('/')) {
        const parsedDate = dateParse(dateValue, 'dd/MM/yyyy', new Date());
        if (isValid(parsedDate)) return parsedDate;
      }

      // Tenta outros formatos
      for (const format of this.CSV_OPTIONS.dateFormats) {
        try {
          const parsedDate = dateParse(dateValue, format, new Date());
          if (isValid(parsedDate)) return parsedDate;
        } catch {
          continue;
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  private static async findOrCreateAccount(accountName: string, userId: string) {
    let account = await prisma.account.findFirst({
      where: { 
        name: { equals: accountName, mode: 'insensitive' },
        userId: userId,
        type: AccountType.CHECKING
      }
    });

    if (!account) {
      account = await prisma.account.create({
        data: {
          name: accountName,
          balance: 0,
          userId: userId,
          type: AccountType.CHECKING
        }
      });
    }

    return account;
  }

  private static async findOrCreateCategory(categoryName: string, userId: string) {
    if (!categoryName) return null;

    let category = await prisma.category.findFirst({
      where: { 
        name: { equals: categoryName, mode: 'insensitive' },
        userId: userId
      }
    });

    if (!category) {
      category = await prisma.category.create({
        data: {
          name: categoryName,
          userId: userId
        }
      });
    }

    return category;
  }

  private static async createTransaction(data: {
    type: TransactionType;
    amount: number;
    transactionDate: Date;
    accountId: string;
    userId: string;
    description?: string;
    categoryId?: string | null;
  }) {
    return prisma.$transaction(async (prisma) => {
      const balanceChange = data.type === TransactionType.INCOME
        ? new Prisma.Decimal(data.amount)
        : new Prisma.Decimal(-data.amount);

      await prisma.transaction.create({
        data: {
          type: data.type,
          amount: data.amount,
          description: data.description || '',
          transactionDate: data.transactionDate,
          year: data.transactionDate.getFullYear(),
          month: data.transactionDate.getMonth() + 1,
          day: data.transactionDate.getDate(),
          accountId: data.accountId,
          categoryId: data.categoryId,
          userId: data.userId
        }
      });

      await prisma.account.update({
        where: { id: data.accountId },
        data: { balance: { increment: balanceChange } }
      });
    });
  }
}
