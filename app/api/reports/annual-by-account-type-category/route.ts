// app/api/reports/annual-by-account-type-category/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const year = searchParams.get('year');

  if (!userId || !year) {
    return NextResponse.json(
      { success: false, error: 'userId e year são obrigatórios' },
      { status: 400 }
    );
  }

  try {
    const numericYear = parseInt(year);

    // Obter transações agrupadas por conta, mês, tipo e categoria
    const transactions = await prisma.transaction.groupBy({
      by: ['accountId', 'month', 'type', 'categoryId'],
      where: {
        userId,
        year: numericYear
      },
      _sum: {
        amount: true
      },
      orderBy: [
        { accountId: 'asc' },
        { month: 'asc' }
      ]
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

    // Organizar os dados por conta -> mês -> tipo -> categoria
    const reportData = accounts.map(account => {
      const accountTransactions = transactions.filter(t => t.accountId === account.id);
      
      // Agrupar por mês
      const monthlyData = Array.from({ length: 12 }, (_, i) => {
        const month = i + 1;
        const monthTransactions = accountTransactions.filter(t => t.month === month);

        // Agrupar por tipo de transação
        const typesData = monthTransactions.reduce((acc, transaction) => {
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

        // Calcular totais do mês
        const income = typesData['INCOME']?.total || 0;
        const expense = typesData['EXPENSE']?.total || 0;
        const investment = typesData['INVESTMENT']?.total || 0;
        const balance = income - expense;

        return {
          month,
          income,
          expense,
          investment,
          balance,
          types: Object.values(typesData).map(typeData => ({
            type: typeData.type,
            total: typeData.total,
            categories: Object.values(typeData.categories)
          }))
        };
      });

      // Calcular totais anuais para esta conta
      const annualIncome = monthlyData.reduce((sum, month) => sum + Number(month.income), 0);
      const annualExpense = monthlyData.reduce((sum, month) => sum + Number(month.expense), 0);
      const annualInvestment = monthlyData.reduce((sum, month) => sum + Number(month.investment), 0);
      const annualBalance = annualIncome - annualExpense;

      // Agrupar categorias anuais
      const annualTypesData = monthlyData.reduce((acc, month) => {
        month.types.forEach(typeData => {
          if (!acc[typeData.type]) {
            acc[typeData.type] = {
              type: typeData.type,
              total: 0,
              categories: {}
            };
          }

          typeData.categories.forEach(category => {
            if (!acc[typeData.type].categories[category.categoryId || 'uncategorized']) {
              acc[typeData.type].categories[category.categoryId || 'uncategorized'] = {
                categoryId: category.categoryId,
                categoryName: category.categoryName,
                amount: 0
              };
            }

            acc[typeData.type].categories[category.categoryId || 'uncategorized'].amount += category.amount;
          });

          acc[typeData.type].total += typeData.total;
        });

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

      return {
        accountId: account.id,
        accountName: account.name,
        currency: account.currency,
        monthlyData,
        annualTotals: {
          income: annualIncome,
          expense: annualExpense,
          investment: annualInvestment,
          balance: annualBalance
        },
        annualTypes: Object.values(annualTypesData).map(typeData => ({
          type: typeData.type,
          total: typeData.total,
          categories: Object.values(typeData.categories)
        }))
      };
    });

    // Calcular totais gerais anuais
    const totalIncome = reportData.reduce((sum, account) => sum + Number(account.annualTotals.income), 0);
    const totalExpense = reportData.reduce((sum, account) => sum + Number(account.annualTotals.expense), 0);
    const totalInvestment = reportData.reduce((sum, account) => sum + Number(account.annualTotals.investment), 0);
    const totalBalance = totalIncome - totalExpense;

    return NextResponse.json({
      success: true,
      data: {
        year: numericYear,
        accounts: reportData,
        annualTotals: {
          income: totalIncome,
          expense: totalExpense,
          investment: totalInvestment,
          balance: totalBalance
        }
      }
    }, { status: 200 });
  } catch (error) {
    console.error('Erro ao gerar relatório anual por conta, tipo e categoria:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Erro ao gerar relatório anual por conta, tipo e categoria',
        details: process.env.NODE_ENV === 'development' ? error : null
      },
      { status: 500 }
    );
  }
}