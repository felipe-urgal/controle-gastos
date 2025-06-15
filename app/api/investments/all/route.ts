import { NextResponse } from 'next/server';
import { PrismaClient, Prisma, InvestmentType } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const accountId = searchParams.get('accountId');
  const type = searchParams.get('type');
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
    const where: Prisma.InvestmentWhereInput = { userId };
    
    if (accountId) where.accountId = accountId;
    if (type && Object.values(InvestmentType).includes(type as InvestmentType)) {
      where.type = type as InvestmentType;
    }

    // Paginação
    // const skip = (page - 1) * limit;

    // const [investments, total] = await Promise.all([
    const [investments] = await Promise.all([
      prisma.investment.findMany({
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
        },
        orderBy: {
          investmentDate: 'desc'
        },
        // skip,
        // take: limit
      }),
      // prisma.investment.count({ where })
    ]);

    return NextResponse.json({
      success: true,
      data: investments,
      // pagination: {
      //   total,
      //   page,
      //   limit,
      //   totalPages: Math.ceil(total / limit)
      // }
    }, { status: 200 });
  } catch (error) {
    console.error('Erro ao listar investimentos:', error);
    const errorMessage =
      error instanceof Error ? error.message : String(error);

    return NextResponse.json(
      {
        success: false,
        error: 'Erro ao listar investimentos',
        details: process.env.NODE_ENV === 'development' ? errorMessage : null
      },
      { status: 500 }
    );
  }
}