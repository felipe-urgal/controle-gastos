import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

export async function GET(request: Request): Promise<NextResponse<any>> {
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

    return NextResponse.json({
      status: 200,
      success: true,
      message: "Contas carregadas com sucesso!",
      data: { items: accounts }
    });
  } catch(error) {
    const errorMessage = translateFetchError(error);
    
    return NextResponse.json({ 
      status: 500,
      success: false, 
      message: errorMessage,
    });
  }
}

function translateFetchError(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Erro interno ao buscar contas";
  }

  const errorMessage = error.message.toLowerCase();

  if (errorMessage.includes('prisma') || errorMessage.includes('database')) {
    if (errorMessage.includes('connection') || errorMessage.includes('timeout')) {
      return "Erro de conexão com o banco de dados. Tente novamente";
    }
    return "Erro no banco de dados ao buscar contas";
  }

  if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
    return "Erro de conexão. Verifique sua internet e tente novamente";
  }

  return "Erro inesperado ao buscar contas. Tente novamente";
}