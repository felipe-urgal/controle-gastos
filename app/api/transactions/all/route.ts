import { NextResponse } from 'next/server';
import { Prisma, TransactionType } from '@prisma/client';
import { prisma } from '@/app/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const accountId = searchParams.get('accountId');
  const categoryId = searchParams.get('categoryId');
  const type = searchParams.get('type');
  const year = searchParams.get('year');
  const month = searchParams.get('month');
  // const startDate = searchParams.get('startDate');
  // const endDate = searchParams.get('endDate');
  // const page = parseInt(searchParams.get('page') || '1');
  // const limit = parseInt(searchParams.get('limit') || '10');

  if (!userId) {
    return NextResponse.json(
      { success: false, error: 'userId é obrigatório' },
      { status: 400 }
    );
  }

  try {
    // Construir filtros dinâmicos
    const where: Prisma.TransactionWhereInput = { userId };
    
    if (accountId) where.accountId = accountId;
    if (categoryId) where.categoryId = categoryId;
    if (type && Object.values(TransactionType).includes(type as TransactionType)) {
      where.type = type as TransactionType;
    }
    
    // Filtros por data
    if (year) where.year = parseInt(year);
    if (month) where.month = parseInt(month);

    // Paginação
    // const skip = (page - 1) * limit;

    // const [transactions, total] = await Promise.all([
    const [transactions] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          account: {
            select: {
              id: true,
              name: true,
              type: true,
              currency: true
            }
          },
          category: {
            select: {
              id: true,
              name: true
            }
          }
        },
        // skip,
        // take: limit
      }),
      // prisma.transaction.count({ where })
    ]);

    return NextResponse.json({
      success: true,
      data: transactions,
      // pagination: {
      //   total,
      //   page,
      //   limit,
      //   totalPages: Math.ceil(total / limit)
      // }
    }, { status: 200 });
  } catch (error) {
    console.error('Erro ao listar transações:', error);
    const errorMessage =
      error instanceof Error ? error.message : String(error);

    return NextResponse.json(
      {
        success: false,
        error: 'Erro ao listar transações',
        details: process.env.NODE_ENV === 'development' ? errorMessage : null
      },
      { status: 500 }
    );
  }
}