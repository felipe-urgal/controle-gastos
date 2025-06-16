// app/api/reports/summary/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

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

    // Obter transações normais (income/expense) agrupadas por tipo
    const totalsByType = await prisma.transaction.groupBy({
      by: ['type'],
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

    // Obter transações normais agrupadas por categoria
    const totalsByCategory = await prisma.transaction.groupBy({
      by: ['categoryId', 'type'],
      where: {
        userId,
        year: numericYear,
        month: numericMonth,
        type: { in: ['INCOME', 'EXPENSE'] } // Filtra apenas receitas e despesas
      },
      _sum: {
        amount: true
      },
      orderBy: {
        _sum: {
          amount: 'desc'
        }
      }
    });

    // Obter investimentos (compras e vendas)
    const investments = await prisma.investment.groupBy({
      by: ['type'],
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

    // Obter categorias para mapear IDs para nomes
    const categories = await prisma.category.findMany({
      where: { userId },
      select: { id: true, name: true }
    });

    const categoriesMap = new Map(categories.map(cat => [cat.id, cat.name]));

    // Formatando os dados para resposta
    const income = totalsByType.find(t => t.type === 'INCOME')?._sum.amount || 0;
    const expense = totalsByType.find(t => t.type === 'EXPENSE')?._sum.amount || 0;
    const balance = Number(income) - Number(expense);

    // Calcular totais de investimentos
    const investmentBuys = investments.find(i => i.type === 'BUY')?._sum.amount || 0;
    const investmentSells = investments.find(i => i.type === 'SELL')?._sum.amount || 0;
    const investmentNet = Number(investmentSells) - Number(investmentBuys);

    const categoriesData = totalsByCategory.map(item => ({
      categoryId: item.categoryId,
      categoryName: item.categoryId ? categoriesMap.get(item.categoryId) : 'Sem categoria',
      type: item.type as 'INCOME' | 'EXPENSE',
      amount: item._sum.amount || 0
    }));

    return NextResponse.json({
      success: true,
      data: {
        year: numericYear,
        month: numericMonth,
        income,
        expense,
        balance,
        investments: {
          buys: investmentBuys,
          sells: investmentSells,
          net: investmentNet
        },
        categories: categoriesData
      }
    }, { status: 200 });
  } catch (error) {
    console.error('Erro ao gerar relatório:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Erro ao gerar relatório',
        details: process.env.NODE_ENV === 'development' ? error : null
      },
      { status: 500 }
    );
  }
}