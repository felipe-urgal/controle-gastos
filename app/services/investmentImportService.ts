// app/services/investmentImportService.ts
import { InvestmentType, AccountType } from "@prisma/client";
import { prisma } from '@/app/lib/prisma';
import { CsvProcessor } from '@/app/lib/csv/csvProcessor';

export class InvestmentImportService {
  public static readonly CSV_OPTIONS = {
    columnMappings: {
      'tipo': 'type',
      'valor': 'amount',
      'conta': 'account',
      'data': 'investmentDate',
      'descricao': 'description',
      'ticker': 'ticker',
      'quantidade': 'quantity',
      'preco_unitario': 'unitPrice',
    },
    requiredFields: ['type', 'amount', 'account', 'investmentDate'],
    decimalSeparator: ',' as const,
    dateFormats: ['dd/MM/yyyy', 'yyyy-MM-dd']
  };

  static async processInvestmentRecord(record: any, userId: string): Promise<{ success: boolean; errors?: string[] }> {
    const errors: string[] = [];

    // Validar e converter tipo de investimento
    const validTypesMapping: { [key: string]: InvestmentType } = {
      'COMPRA': InvestmentType.BUY,
      'VENDA': InvestmentType.SELL,
      'DIVIDENDO': InvestmentType.DIVIDEND,
      'BUY': InvestmentType.BUY,
      'SELL': InvestmentType.SELL,
      'DIVIDEND': InvestmentType.DIVIDEND
    };

    const typeUpper = (record.type || '').toUpperCase();
    const investmentType = validTypesMapping[typeUpper];
    
    if (!investmentType) {
      errors.push(`Tipo de investimento inválido: ${record.type}`);
    }

    // Validar e converter valor
    const amount = CsvProcessor.parseValue(record.amount, 'number', this.CSV_OPTIONS);
    if (!amount || amount <= 0) {
      errors.push(`Valor inválido: ${record.amount}`);
    }

    // Validar e converter data
    const investmentDate = CsvProcessor.parseValue(record.investmentDate, 'date', this.CSV_OPTIONS);
    if (!investmentDate) {
      errors.push(`Data inválida: ${record.investmentDate}`);
    }

    if (errors.length > 0) {
      return { success: false, errors };
    }

    // Encontrar conta
    const account = await this.findAccount(record, userId);
    if (!account) {
      return { success: false, errors: [`Conta não encontrada: ${record.account}`] };
    }

    try {
      await this.createInvestment({
        type: investmentType!,
        amount: amount!,
        investmentDate: investmentDate!,
        accountId: account.id,
        userId,
        description: record.description,
        ticker: record.ticker,
        quantity: record.quantity ? CsvProcessor.parseValue(record.quantity, 'number', this.CSV_OPTIONS) : 0,
        unitPrice: record.unitPrice ? CsvProcessor.parseValue(record.unitPrice, 'number', this.CSV_OPTIONS) : 0,
      });

      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        errors: [error instanceof Error ? error.message : 'Erro ao criar investimento'] 
      };
    }
  }

  private static async findAccount(record: any, userId: string) {
    if (record.account) {
      return prisma.account.findFirst({
        where: { 
          name: { equals: record.account, mode: 'insensitive' },
          userId,
          type: AccountType.INVESTMENT
        }
      });
    }

    return null;
  }

  private static async createInvestment(data: {
    type: InvestmentType;
    amount: number;
    investmentDate: Date;
    accountId: string;
    userId: string;
    description?: string;
    ticker?: string;
    quantity?: number;
    unitPrice?: number;
  }) {
    return prisma.$transaction(async (prisma) => {
      const investment = await prisma.investment.create({
        data: {
          type: data.type,
          amount: data.amount,
          quantity: data.quantity || 0,
          unitPrice: data.unitPrice || 0,
          description: data.description || '',
          ticker: data.ticker || '',
          investmentDate: data.investmentDate,
          accountId: data.accountId,
          userId: data.userId
        }
      });

      // Atualizar saldo da conta (exceto para dividendos)
      if (data.type !== InvestmentType.DIVIDEND) {
        const balanceChange = data.type === InvestmentType.BUY ? data.amount : -data.amount;
        
        await prisma.account.update({
          where: { id: data.accountId },
          data: { balance: { increment: balanceChange } }
        });
      }

      return investment;
    });
  }
}