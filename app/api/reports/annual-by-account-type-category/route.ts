
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
    const yearStart = new Date(numericYear, 0, 1);
    const yearEnd = new Date(numericYear + 1, 0, 1);

    // Obter transações normais (income/expense) agrupadas por conta, mês, tipo e categoria
    const transactions = await prisma.transaction.groupBy({
      by: ['accountId', 'month', 'type', 'categoryId'],
      where: {
        userId,
        year: numericYear,
        type: { in: ['INCOME', 'EXPENSE'] } // Filtra apenas receitas e despesas
      },
      _sum: {
        amount: true
      },
      orderBy: [
        { accountId: 'asc' },
        { month: 'asc' }
      ]
    });

    // Obter investimentos agrupados por conta e tipo
    const investments = await prisma.investment.groupBy({
      by: ['accountId', 'type'],
      where: {
        userId,
        investmentDate: {
          gte: yearStart,
          lt: yearEnd
        }
      },
      _sum: {
        amount: true
      },
      orderBy: {
        accountId: 'asc'
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

    // Organizar os dados por conta -> mês -> tipo -> categoria
    const reportData = accounts.map(account => {
      const accountTransactions = transactions.filter(t => t.accountId === account.id);
      const accountInvestments = investments.filter(i => i.accountId === account.id);
      
      // Calcular totais de investimentos
      const investmentBuys = accountInvestments.find(i => i.type === 'BUY')?._sum.amount || 0;
      const investmentSells = accountInvestments.find(i => i.type === 'SELL')?._sum.amount || 0;
      const investmentNet = Number(investmentSells) - Number(investmentBuys);

      // Agrupar por mês (apenas transações normais)
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
        const balance = income - expense;

        return {
          month,
          income,
          expense,
          balance,
          types: Object.values(typesData).map(typeData => ({
            type: typeData.type,
            total: typeData.total,
            categories: Object.values(typeData.categories)
          }))
        };
      });

      // Calcular totais anuais para esta conta (transações normais)
      const annualIncome = monthlyData.reduce((sum, month) => sum + Number(month.income), 0);
      const annualExpense = monthlyData.reduce((sum, month) => sum + Number(month.expense), 0);
      const annualBalance = annualIncome - annualExpense;

      // Agrupar categorias anuais (transações normais)
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
        investments: {
          buys: investmentBuys,
          sells: investmentSells,
          net: investmentNet
        },
        annualTotals: {
          income: annualIncome,
          expense: annualExpense,
          balance: annualBalance,
          investmentNet: investmentNet
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
    const totalBalance = totalIncome - totalExpense;
    
    const totalInvestmentBuys = reportData.reduce((sum, account) => sum + Number(account.investments.buys), 0);
    const totalInvestmentSells = reportData.reduce((sum, account) => sum + Number(account.investments.sells), 0);
    const totalInvestmentNet = totalInvestmentSells - totalInvestmentBuys;

    return NextResponse.json({
      success: true,
      data: {
        year: numericYear,
        accounts: reportData,
        annualTotals: {
          income: totalIncome,
          expense: totalExpense,
          balance: totalBalance,
          investments: {
            buys: totalInvestmentBuys,
            sells: totalInvestmentSells,
            net: totalInvestmentNet
          }
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