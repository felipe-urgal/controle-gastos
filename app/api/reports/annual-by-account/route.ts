// app/api/reports/annual-by-account/route.ts
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

    // Obter investimentos agrupados por conta, mês e tipo
    const investmentsByAccountAndMonth = await prisma.investment.groupBy({
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

      // Processar investimentos da conta
      const accountInvestments = investmentsByAccountAndMonth.filter(
        i => i.accountId === account.id
      );

      const investmentBuys = accountInvestments.find(i => i.type === 'BUY')?._sum.amount || 0;
      const investmentSells = accountInvestments.find(i => i.type === 'SELL')?._sum.amount || 0;
      const investmentNet = Number(investmentSells) - Number(investmentBuys); // Vendas - Compras

      // Calcular totais anuais para esta conta
      const annualIncome = monthlyData.reduce((sum, month) => sum + Number(month.income), 0);
      const annualExpense = monthlyData.reduce((sum, month) => sum + Number(month.expense), 0);
      const annualBalance = annualIncome - annualExpense;

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
        }
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