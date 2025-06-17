// app/api/reports/annual-by-account/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

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

    // Obter transações normais (income/expense) agrupadas por conta, mês e tipo
    const transactionsByAccountAndMonth = await prisma.transaction.groupBy({
      by: ['accountId', 'month', 'type'],
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

    // Obter informações das contas
    const accounts = await prisma.account.findMany({
      where: { userId },
      select: { id: true, name: true, currency: true }
    });

    // Formatando os dados para resposta
    const reportData = accounts.map(account => {
      // Processar transações normais por mês
      const monthlyData = Array.from({ length: 12 }, (_, i) => {
        const month = i + 1;
        const monthTransactions = transactionsByAccountAndMonth.filter(
          t => t.accountId === account.id && t.month === month
        );

        const income = monthTransactions.find(t => t.type === 'INCOME')?._sum.amount || 0;
        const expense = monthTransactions.find(t => t.type === 'EXPENSE')?._sum.amount || 0;
        const balance = Number(income) - Number(expense);

        return {
          month,
          income,
          expense,
          balance
        };
      });

      // Calcular totais anuais para esta conta
      const annualIncome = monthlyData.reduce((sum, month) => sum + Number(month.income), 0);
      const annualExpense = monthlyData.reduce((sum, month) => sum + Number(month.expense), 0);
      const annualBalance = annualIncome - annualExpense;

      return {
        accountId: account.id,
        accountName: account.name,
        monthlyData,
        annualTotals: {
          income: annualIncome,
          expense: annualExpense,
          balance: annualBalance,
        }
      };
    });

    // Calcular totais gerais anuais
    const totalIncome = reportData.reduce((sum, account) => sum + Number(account.annualTotals.income), 0);
    const totalExpense = reportData.reduce((sum, account) => sum + Number(account.annualTotals.expense), 0);
    const totalBalance = totalIncome - totalExpense;

    return NextResponse.json({
      success: true,
      data: {
        year: numericYear,
        accounts: reportData,
        annualTotals: {
          income: totalIncome,
          expense: totalExpense,
          balance: totalBalance,
        }
      }
    }, { status: 200 });
  } catch (error) {
    console.error('Erro ao gerar relatório anual por conta:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Erro ao gerar relatório anual por conta',
        details: process.env.NODE_ENV === 'development' ? error : null
      },
      { status: 500 }
    );
  }
}