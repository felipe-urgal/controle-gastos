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
            total: number;
            byCategory: Array<{
              categoryId: string | null;
              categoryName: string;
              total: number;
            }>;
          };
        };
      }>,
      byType: { expense: 0, income: 0, investment: 0 }
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
          analytics.byType.investment += amount;
          analytics.total -= amount;
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
            investment: { total: 0, byCategory: [] }
          }
        };
      }

      const account = analytics.byAccount[transaction.accountId];

      // Atualiza totais por tipo na conta
      account.byType[type].total += amount;
      
      // Atualiza total da conta (lógica invertida para expenses/investments)
      switch(type) {
        case 'income':
          account.total += amount;
          break;
        case 'investment':
          account.total += amount;
          break;
        case 'expense':
          account.total -= amount;
          break;
      }

      // Processa categorias se existirem
      if (transaction.category) {
        const categoryData = {
          categoryId: transaction.categoryId,
          categoryName: transaction.category.name,
          total: amount
        };

        // Encontra ou cria a categoria no tipo correspondente
        const categoryIndex = account.byType[type].byCategory
          .findIndex(c => c.categoryId === transaction.categoryId);

        if (categoryIndex === -1) {
          account.byType[type].byCategory.push(categoryData);
        } else {
          account.byType[type].byCategory[categoryIndex].total += amount;
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