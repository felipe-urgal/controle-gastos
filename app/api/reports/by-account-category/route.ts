// app/api/reports/by-account-category/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const year = searchParams.get('year');
  const month = searchParams.get('month');

  if (!userId || !year || !month) {
    return NextResponse.json(
      { success: false, error: 'userId, year e month são obrigatórios' },
      { status: 400 }
    );
  }

  try {
    const numericYear = parseInt(year);
    const numericMonth = parseInt(month);

    // Obter transações agrupadas por conta, categoria e tipo
    const transactions = await prisma.transaction.groupBy({
      by: ['accountId', 'categoryId', 'type'],
      where: {
        userId,
        year: numericYear,
        month: numericMonth
      },
      _sum: {
        amount: true
      }
    });

    // Obter informações das contas e categorias
    const [accounts, categories] = await Promise.all([
      prisma.account.findMany({
        where: { userId },
        select: { id: true, name: true, currency: true }
      }),
      prisma.category.findMany({
        where: { userId },
        select: { id: true, name: true }
      })
    ]);

    const categoriesMap = new Map(categories.map(cat => [cat.id, cat]));

    // Organizar os dados por conta
    const reportData = accounts.map(account => {
      const accountTransactions = transactions.filter(t => t.accountId === account.id);
      
      // Agrupar por categoria
      const categoriesData = accountTransactions.reduce((acc, transaction) => {
        const categoryId = transaction.categoryId || 'uncategorized';
        const categoryName = transaction.categoryId ? 
          categoriesMap.get(transaction.categoryId)?.name : 'Sem categoria';
        
        if (!acc[categoryId]) {
          acc[categoryId] = {
            categoryId,
            categoryName,
            income: 0,
            expense: 0,
            investment: 0
          };
        }

        if (transaction.type === 'INCOME') {
          acc[categoryId].income += Number(transaction._sum.amount) || 0;
        } else if (transaction.type === 'EXPENSE') {
          acc[categoryId].expense += Number(transaction._sum.amount) || 0;
        } else {
          acc[categoryId].investment += Number(transaction._sum.amount) || 0;
        }

        return acc;
      }, {} as Record<string, { categoryId: string | null; categoryName: string | undefined; income: number; expense: number; investment: number }>);

      // Calcular totais da conta
      const accountCategories = Object.values(categoriesData);
      const income = accountCategories.reduce((sum, cat) => sum + cat.income, 0);
      const expense = accountCategories.reduce((sum, cat) => sum + cat.expense, 0);
      const investment = accountCategories.reduce((sum, cat) => sum + cat.investment, 0);
      const balance = income - expense;

      return {
        accountId: account.id,
        accountName: account.name,
        currency: account.currency,
        income,
        expense,
        investment,
        balance,
        categories: accountCategories
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        year: numericYear,
        month: numericMonth,
        accounts: reportData
      }
    }, { status: 200 });
  } catch (error) {
    console.error('Erro ao gerar relatório por conta e categoria:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Erro ao gerar relatório por conta e categoria',
        details: process.env.NODE_ENV === 'development' ? error : null
      },
      { status: 500 }
    );
  }
}