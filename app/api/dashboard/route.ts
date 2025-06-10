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

    const where: Prisma.TransactionWhereInput = { userId };
    if (year) where.year = parseInt(year);
    if (month) where.month = parseInt(month);

    const transactions = await prisma.transaction.findMany({
      where,
      include: { category: true, account: true },
      orderBy: { transactionDate: 'desc' }
    });

    const analytics = {
      total: 0,
      count: transactions.length,
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
              byCategory: Array<{
                categoryId: string | null;
                categoryName: string;
                total: number;
              }>;
            };
            sell: {
              total: number;
              byCategory: Array<{
                categoryId: string | null;
                categoryName: string;
                total: number;
              }>;
            };
            net: number; // Adicionado para mostrar o saldo líquido de investimentos
          };
        };
      }>,
      byType: { expense: 0, income: 0, investment: { buy: 0, sell: 0, net: 0 } }
    };

    transactions.forEach(transaction => {
      const amount = Number(transaction.amount);
      const type = transaction.type.toLowerCase() as 'income' | 'expense' | 'investment';

      // Atualiza totais gerais
      switch(type) {
        case 'income':
          analytics.byType.income += amount;
          analytics.total += amount;
          break;
        case 'investment':
          if (transaction.investmentType === 'BUY') {
            analytics.byType.investment.buy += amount;
            // analytics.total -= amount; // Compra diminui o saldo disponível
          } else if (transaction.investmentType === 'SELL') {
            analytics.byType.investment.sell += amount;
            // analytics.total += amount; // Venda aumenta o saldo disponível
          }
          analytics.byType.investment.net = analytics.byType.investment.sell - analytics.byType.investment.buy;
          break;
        case 'expense':
          analytics.byType.expense += amount;
          analytics.total -= amount;
          break;
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
              buy: { total: 0, byCategory: [] },
              sell: { total: 0, byCategory: [] },
              net: 0
            }
          }
        };
      }

      const account = analytics.byAccount[transaction.accountId];

      // Atualiza totais por tipo na conta
      if (type === 'investment') {
        if (transaction.investmentType === 'BUY') {
          account.byType.investment.buy.total += amount;
          // account.total -= amount; // Compra diminui o saldo da conta
        } else if (transaction.investmentType === 'SELL') {
          account.byType.investment.sell.total += amount;
          // account.total += amount; // Venda aumenta o saldo da conta
        }
        account.byType.investment.net = account.byType.investment.sell.total - account.byType.investment.buy.total;
      } else {
        account.byType[type].total += amount;
        // Atualiza total da conta (lógica invertida para expenses)
        if (type === 'income') {
          account.total += amount;
        } else if (type === 'expense') {
          account.total -= amount;
        }
      }

      // Processa categorias se existirem
      if (transaction.category) {
        const categoryData = {
          categoryId: transaction.categoryId,
          categoryName: transaction.category.name,
          total: amount
        };

        // Para investimentos, tratamos compras e vendas separadamente
        if (type === 'investment') {
          if (!transaction.investmentType) return; // Or handle error

          const investmentType = transaction.investmentType.toLowerCase() as 'buy' | 'sell';
          const categoryIndex = account.byType.investment[investmentType].byCategory
            .findIndex(c => c.categoryId === transaction.categoryId);

          if (categoryIndex === -1) {
            account.byType.investment[investmentType].byCategory.push(categoryData);
          } else {
            account.byType.investment[investmentType].byCategory[categoryIndex].total += amount;
          }
        } else {
          // Para income/expense, mantemos a lógica original
          const categoryIndex = account.byType[type].byCategory
            .findIndex(c => c.categoryId === transaction.categoryId);

          if (categoryIndex === -1) {
            account.byType[type].byCategory.push(categoryData);
          } else {
            account.byType[type].byCategory[categoryIndex].total += amount;
          }
        }
      }
    });

    return NextResponse.json({
      transactions,
      analytics: {
        ...analytics,
        byAccount: Object.values(analytics.byAccount) // Converte para array
      }
    });
  } catch (error) {
    console.error('[DASHBOARD_GET]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}