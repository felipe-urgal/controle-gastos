import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { ErrorResponse } from '@/app/types/error';

export async function GET(request: Request): Promise<NextResponse<any | ErrorResponse>> {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const isActive = searchParams.get("isActive") || 'true';

  if (!userId) {
    return NextResponse.json(
      { 
        success: false, 
        message: "userId é obrigatório" 
      },
      { status: 400 }
    );
  }

  try {
    const accounts = await prisma.account.findMany({
      where: { 
        userId,
        isActive: isActive === 'true'
      },
      orderBy: [
        { type: 'asc' },
        { name: 'asc' }
      ],
      select: {
        id: true,
        name: true,
        type: true,
        balance: true,
        currency: true,
        color: true,
        icon: true,
        description: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            transactions: true,
            investments: true
          }
        }
      }
    });

    // Calcular totais
    const totals = await prisma.account.aggregate({
      where: { 
        userId,
        isActive: true
      },
      _sum: {
        balance: true
      },
      _count: {
        id: true
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        items: accounts,
        total: accounts.length,
        additionalData: {
          totalBalance: totals._sum.balance || 0,
          totalAccounts: totals._count.id || 0
        }
      }
    });
  } catch (error) {
    console.error("Accounts list error:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}