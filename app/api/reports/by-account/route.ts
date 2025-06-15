// app/api/reports/by-account/route.ts
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

    // Obter transações normais (income/expense) agrupadas por conta e tipo
    const transactionsByAccount = await prisma.transaction.groupBy({
      by: ['accountId', 'type'],
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
    const investmentsByAccount = await prisma.investment.groupBy({
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

    // Obter informações das contas
    const accounts = await prisma.account.findMany({
      where: { userId },
      select: { id: true, name: true, currency: true }
    });

    // Formatando os dados para resposta
    const reportData = accounts.map(account => {
      // Processar transações normais
      const accountTransactions = transactionsByAccount.filter(t => t.accountId === account.id);
      const income = accountTransactions.find(t => t.type === 'INCOME')?._sum.amount || 0;
      const expense = accountTransactions.find(t => t.type === 'EXPENSE')?._sum.amount || 0;
      const balance = Number(income) - Number(expense);

      // Processar investimentos
      const accountInvestments = investmentsByAccount.filter(i => i.accountId === account.id);
      const investmentBuys = accountInvestments.find(i => i.type === 'BUY')?._sum.amount || 0;
      const investmentSells = accountInvestments.find(i => i.type === 'SELL')?._sum.amount || 0;
      const investmentNet = Number(investmentSells) - Number(investmentBuys);

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
        }
      };
    });

    // Calcular totais gerais
    const totalIncome = reportData.reduce((sum, item) => sum + Number(item.income), 0);
    const totalExpense = reportData.reduce((sum, item) => sum + Number(item.expense), 0);
    const totalBalance = totalIncome - totalExpense;
    
    const totalInvestmentBuys = reportData.reduce((sum, item) => sum + Number(item.investments.buys), 0);
    const totalInvestmentSells = reportData.reduce((sum, item) => sum + Number(item.investments.sells), 0);
    const totalInvestmentNet = totalInvestmentSells - totalInvestmentBuys;

    return NextResponse.json({
      success: true,
      data: {
        year: numericYear,
        month: numericMonth,
        accounts: reportData,
        totals: {
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
    console.error('Erro ao gerar relatório por conta:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Erro ao gerar relatório por conta',
        details: process.env.NODE_ENV === 'development' ? error : null
      },
      { status: 500 }
    );
  }
}
