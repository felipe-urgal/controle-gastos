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
    const monthStart = new Date(numericYear, numericMonth - 1, 1);
    const monthEnd = new Date(numericYear, numericMonth, 1);

    // Obter transações normais (income/expense) agrupadas por conta, tipo e categoria
    const transactions = await prisma.transaction.groupBy({
      by: ['accountId', 'type', 'categoryId'],
      where: {
        userId,
        year: numericYear,
        month: numericMonth,
        type: { in: ['INCOME', 'EXPENSE'] } // Filtra apenas receitas e despesas
      },
      _sum: {
        amount: true
      }
    });

    // Obter investimentos agrupados por conta e tipo
    const investments = await prisma.investment.groupBy({
      by: ['accountId', 'type'],
      where: {
        userId,
        investmentDate: {
          gte: monthStart,
          lt: monthEnd
        }
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

    // Organizar os dados por conta -> tipo -> categoria
    const reportData = accounts.map(account => {
      const accountTransactions = transactions.filter(t => t.accountId === account.id);
      const accountInvestments = investments.filter(i => i.accountId === account.id);
      
      // Calcular totais de investimentos
      const investmentBuys = accountInvestments.find(i => i.type === 'BUY')?._sum.amount || 0;
      const investmentSells = accountInvestments.find(i => i.type === 'SELL')?._sum.amount || 0;
      const investmentNet = Number(investmentSells) - Number(investmentBuys);

      // Agrupar por tipo de transação (apenas income/expense)
      const typesData = accountTransactions.reduce((acc, transaction) => {
        const type = transaction.type;
        const categoryId = transaction.categoryId || 'uncategorized';
        const categoryName = transaction.categoryId ? 
          categoriesMap.get(transaction.categoryId)?.name : 'Sem categoria';
        
        if (!acc[type]) {
          acc[type] = {
            type,
            total: 0,
            categories: {}
          };
        }

        if (!acc[type].categories[categoryId]) {
          acc[type].categories[categoryId] = {
            categoryId,
            categoryName,
            amount: 0
          };
        }

        const amount = Number(transaction._sum.amount) || 0;
        acc[type].categories[categoryId].amount += amount;
        acc[type].total += amount;

        return acc;
      }, {} as Record<string, {
        type: string;
        total: number;
        categories: Record<string, {
          categoryId: string | null;
          categoryName: string | undefined;
          amount: number;
        }>;
      }>);

      // Calcular totais da conta
      const income = typesData['INCOME']?.total || 0;
      const expense = typesData['EXPENSE']?.total || 0;
      const balance = income - expense;

      return {
        accountId: account.id,
        accountName: account.name,
        currency: account.currency,
        income,
        expense,
        balance,
        investments: {
          buys: investmentBuys,
          sells: investmentSells,
          net: investmentNet
        },
        types: Object.values(typesData).map(typeData => ({
          type: typeData.type,
          total: typeData.total,
          categories: Object.values(typeData.categories)
        }))
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
    console.error('Erro ao gerar relatório por conta, tipo e categoria:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Erro ao gerar relatório por conta, tipo e categoria',
        details: process.env.NODE_ENV === 'development' ? error : null
      },
      { status: 500 }
    );
  }
}