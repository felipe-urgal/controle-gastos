// app/api/reports/summary/route.ts
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

    // Obter totais por tipo de transação
    const totalsByType = await prisma.transaction.groupBy({
      by: ['type'],
      where: {
        userId,
        year: numericYear,
        month: numericMonth
      },
      _sum: {
        amount: true
      }
    });

    // Obter totais por categoria
    const totalsByCategory = await prisma.transaction.groupBy({
      by: ['categoryId', 'type'],
      where: {
        userId,
        year: numericYear,
        month: numericMonth
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

    // Obter categorias para mapear IDs para nomes
    const categories = await prisma.category.findMany({
      where: { userId },
      select: { id: true, name: true }
    });

    const categoriesMap = new Map(categories.map(cat => [cat.id, cat.name]));

    // Formatando os dados para resposta
    const income = totalsByType.find(t => t.type === 'INCOME')?._sum.amount || 0;
    const expense = totalsByType.find(t => t.type === 'EXPENSE')?._sum.amount || 0;
    const investment = totalsByType.find(t => t.type === 'INVESTMENT')?._sum.amount || 0;
    const balance = Number(income) - Number(expense);

    const categoriesData = totalsByCategory.map(item => ({
      categoryId: item.categoryId,
      categoryName: item.categoryId ? categoriesMap.get(item.categoryId) : 'Sem categoria',
      type: item.type,
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
        investment,
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