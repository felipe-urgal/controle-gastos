// app/api/dashboard/route.ts
import { Prisma, PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const year = searchParams.get('year');
    const month = searchParams.get('month');

    if (!userId) {
      return new NextResponse('User ID is required', { status: 400 });
    }

    // Configurações de filtro para transações
    const transactionWhere: Prisma.TransactionWhereInput = { userId };
    if (year) transactionWhere.year = parseInt(year);
    if (month) transactionWhere.month = parseInt(month);

    // Configurações de filtro para investimentos
    const investmentWhere: Prisma.InvestmentWhereInput = { userId };
    if (year) {
      investmentWhere.investmentDate = {
        gte: new Date(parseInt(year), month ? parseInt(month) - 1 : 0, 1),
        lt: new Date(parseInt(year), month ? parseInt(month) : 12, 1)
      };
    }

    // Busca transações e investimentos em paralelo
    const [transactions, investments] = await Promise.all([
      prisma.transaction.findMany({
        where: transactionWhere,
        include: { category: true, account: true },
        orderBy: { transactionDate: 'desc' }
      }),
      prisma.investment.findMany({
        where: investmentWhere,
        include: { account: true },
        orderBy: { investmentDate: 'desc' }
      })
    ]);

    const analytics = {
      total: 0,
      transactionCount: transactions.length,
      investmentCount: investments.length,
      byAccount: {} as Record<string, {
        accountId: string;
        accountName: string;
        total: number;
        byType: {
          income: {
            total: number;
            byCategory: Array<{
              categoryId: string | null;
              categoryName: string;
              total: number;
            }>;
          };
          expense: {
            total: number;
            byCategory: Array<{
              categoryId: string | null;
              categoryName: string;
              total: number;
            }>;
          };
          investment: {
            buy: {
              total: number;
              byTicker?: Array<{ // Agora agrupamos por ticker em vez de categoria
                ticker: string | null;
                total: number;
              }>;
            };
            sell: {
              total: number;
              byTicker?: Array<{
                ticker: string | null;
                total: number;
              }>;
            };
            net: number;
          };
        };
      }>,
      byType: { 
        expense: 0, 
        income: 0, 
        investment: { 
          buy: 0, 
          sell: 0, 
          net: 0,
          byTicker: {} as Record<string, { // Novo: agrupamento por ticker
            buy: number;
            sell: number;
            net: number;
          }>
        } 
      }
    };

    // Processa transações normais (income/expense)
    transactions.forEach(transaction => {
      const amount = Number(transaction.amount);
      const type = transaction.type.toLowerCase() as 'income' | 'expense';

      // Atualiza totais gerais
      if (type === 'income') {
        analytics.byType.income += amount;
        analytics.total += amount;
      } else {
        analytics.byType.expense += amount;
        analytics.total -= amount;
      }

      // Inicializa estrutura da conta se não existir
      if (!analytics.byAccount[transaction.accountId]) {
        analytics.byAccount[transaction.accountId] = {
          accountId: transaction.accountId,
          accountName: transaction.account.name,
          total: 0,
          byType: {
            income: { total: 0, byCategory: [] },
            expense: { total: 0, byCategory: [] },
            investment: { 
              buy: { total: 0, byTicker: [] },
              sell: { total: 0, byTicker: [] },
              net: 0
            }
          }
        };
      }

      const account = analytics.byAccount[transaction.accountId];

      // Atualiza totais por tipo na conta
      account.byType[type].total += amount;
      
      // Atualiza total da conta
      if (type === 'income') {
        account.total += amount;
      } else {
        account.total -= amount;
      }

      // Processa categorias se existirem
      if (transaction.category) {
        const categoryData = {
          categoryId: transaction.categoryId,
          categoryName: transaction.category.name,
          total: amount
        };

        const categoryIndex = account.byType[type].byCategory
          .findIndex(c => c.categoryId === transaction.categoryId);

        if (categoryIndex === -1) {
          account.byType[type].byCategory.push(categoryData);
        } else {
          account.byType[type].byCategory[categoryIndex].total += amount;
        }
      }
    });

    // Processa investimentos
    investments.forEach(investment => {
      const amount = Number(investment.amount);
      const type = investment.type.toLowerCase() as 'buy' | 'sell' | 'dividend' | 'interest' | 'split' | 'merger';
      const ticker = investment.ticker || 'OTHER';

      // Só consideramos compra e venda para os totais
      if (type === 'buy' || type === 'sell') {
        // Atualiza totais gerais de investimento
        if (type === 'buy') {
          analytics.byType.investment.buy += amount;
        } else {
          analytics.byType.investment.sell += amount;
        }
        
        // Atualiza agrupamento por ticker
        if (!analytics.byType.investment.byTicker[ticker]) {
          analytics.byType.investment.byTicker[ticker] = { buy: 0, sell: 0, net: 0 };
        }
        
        if (type === 'buy') {
          analytics.byType.investment.byTicker[ticker].buy += amount;
        } else {
          analytics.byType.investment.byTicker[ticker].sell += amount;
        }
        analytics.byType.investment.byTicker[ticker].net = 
          analytics.byType.investment.byTicker[ticker].buy - 
          analytics.byType.investment.byTicker[ticker].sell;
      }

      // Inicializa estrutura da conta se não existir
      if (!analytics.byAccount[investment.accountId]) {
        analytics.byAccount[investment.accountId] = {
          accountId: investment.accountId,
          accountName: investment.account.name,
          total: 0,
          byType: {
            income: { total: 0, byCategory: [] },
            expense: { total: 0, byCategory: [] },
            investment: { 
              buy: { total: 0, byTicker: [] },
              sell: { total: 0, byTicker: [] },
              net: 0
            }
          }
        };
      }

      const account = analytics.byAccount[investment.accountId];

      // Atualiza totais por tipo na conta (só para compra/venda)
      if (type === 'buy' || type === 'sell') {
        account.byType.investment[type].total += amount;
        account.byType.investment.net = 
          account.byType.investment.buy.total - 
          account.byType.investment.sell.total;

        // Processa por ticker
        const tickerData = {
          ticker,
          total: amount
        };

        const tickerIndex = account.byType.investment[type].byTicker
          ?.findIndex(t => t.ticker === ticker) ?? -1;

        if (tickerIndex === -1) {
          account.byType.investment[type].byTicker?.push(tickerData);
        } else {
          account.byType.investment[type].byTicker![tickerIndex].total += amount;
        }
      }
    });

    // Calcula totais líquidos
    analytics.byType.investment.net = 
      analytics.byType.investment.buy - analytics.byType.investment.sell;

    return NextResponse.json({
      transactions,
      investments,
      analytics: {
        ...analytics,
        byAccount: Object.values(analytics.byAccount), // Converte para array
        byType: {
          ...analytics.byType,
          investment: {
            ...analytics.byType.investment,
            byTicker: Object.entries(analytics.byType.investment.byTicker).map(([ticker, data]) => ({
              ticker,
              ...data
            }))
          }
        }
      }
    });
  } catch (error) {
    console.error('[DASHBOARD_GET]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}