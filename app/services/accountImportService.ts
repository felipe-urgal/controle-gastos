import { AccountType } from "@prisma/client";
import { prisma } from '@/app/lib/prisma';
import { CsvProcessor } from '@/app/lib/csv/csvProcessor';

export class AccountImportService {
  public static readonly CSV_OPTIONS = {
    columnMappings: {
      'nome': 'name',
      'tipo': 'type',
      'saldo': 'balance',
      'moeda': 'currency',
      'valor': 'balance',
      'name': 'name',
      'type': 'type',
      'balance': 'balance',
      'currency': 'currency'
    },
    requiredFields: ['name', 'type', 'balance'],
    decimalSeparator: ',' as const,
    dateFormats: ['dd/MM/yyyy', 'yyyy-MM-dd']
  };

  // Método público para validar headers do CSV
  static validateRequiredColumns(headers: string[]): boolean {
    const normalizedHeaders = headers.map(header => 
      CsvProcessor.normalizeHeader(header, this.CSV_OPTIONS.columnMappings)
    );
    
    return this.CSV_OPTIONS.requiredFields.every(field => 
      normalizedHeaders.includes(field)
    );
  }

  static async processAccountRecord(record: any, userId: string): Promise<{ success: boolean; errors?: string[] }> {
    const errors: string[] = [];

    // Validar nome da conta
    const accountName = record.name?.trim();
    if (!accountName) {
      errors.push('Nome da conta é obrigatório');
    }

    // Validar e converter saldo
    const balance = CsvProcessor.parseValue(record.balance, 'number', this.CSV_OPTIONS);
    if (balance === null || isNaN(balance)) {
      errors.push(`Saldo inválido: ${record.balance}`);
    }

    // Validar tipo de conta
    const accountType = this.parseAccountType(record.type);
    if (!accountType) {
      errors.push(`Tipo de conta inválido: ${record.type}`);
    }

    // Validar moeda
    const currency = this.parseCurrency(record.currency);

    if (errors.length > 0) {
      return { success: false, errors };
    }

    try {
      await this.createAccount({
        name: accountName!,
        type: accountType!,
        balance: balance!,
        currency,
        userId,
      });

      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        errors: [error instanceof Error ? error.message : 'Erro ao criar conta'] 
      };
    }
  }

  private static parseAccountType(type: string): AccountType | null {
    const validTypesMapping: { [key: string]: AccountType } = {
      'CORRENTE': AccountType.CHECKING,
      'POUPANCA': AccountType.SAVINGS,
      'INVESTIMENTO': AccountType.INVESTMENT,
      'CREDITO': AccountType.CREDIT,
      'OUTRO': AccountType.OTHER,
      'CHECKING': AccountType.CHECKING,
      'SAVINGS': AccountType.SAVINGS,
      'INVESTMENT': AccountType.INVESTMENT,
      'CREDIT': AccountType.CREDIT,
      'OTHER': AccountType.OTHER
    };

    const typeUpper = (type || '').toUpperCase();
    return validTypesMapping[typeUpper] || null;
  }

  private static parseCurrency(currency: string): string {
    if (!currency) return 'BRL';
    
    const upperCurrency = currency.toUpperCase();
    const validCurrencies = ['BRL', 'USD', 'EUR', 'GBP'];
    
    return validCurrencies.includes(upperCurrency) ? upperCurrency : 'BRL';
  }

  private static async createAccount(data: {
    name: string;
    type: AccountType;
    balance: number;
    currency: string;
    userId: string;
  }) {
    // Verificar se conta já existe
    const existingAccount = await prisma.account.findFirst({
      where: { 
        name: { equals: data.name, mode: 'insensitive' },
        userId: data.userId,
        type: data.type
      }
    });

    if (existingAccount) {
      throw new Error(`Conta "${data.name}" já existe`);
    }

    return prisma.account.create({
      data: {
        name: data.name,
        type: data.type,
        balance: data.balance,
        currency: data.currency,
        userId: data.userId
      }
    });
  }
}
