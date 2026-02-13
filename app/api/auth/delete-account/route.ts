import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getAuthUserIdFromRequest } from "@/app/lib/auth";

export async function DELETE(request: NextRequest): Promise<NextResponse<any>> {
  try {
    const userId = getAuthUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ 
        status: 401,
        success: false, 
        message: 'Sessão inválida ou expirada' 
      });
    }


    // Verificar se o usuário existe
    const userExists = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true }
    });

    if (!userExists) {
      return NextResponse.json({ 
        status: 404,
        success: false, 
        message: "Usuário não encontrado!" 
      });
    }

    // Usar transação para garantir atomicidade
    await prisma.$transaction(async (tx) => {
      // Ordem de exclusão importante devido a constraints de foreign key
      
      // 1. Primeiro excluir transações (dependem de categorias e contas)
      await tx.transaction.deleteMany({
        where: { userId }
      });

      // 2. Excluir investimentos
      await tx.investment.deleteMany({
        where: { userId }
      });

      // 3. Excluir categorias
      await tx.category.deleteMany({
        where: { userId }
      });

      // 4. Excluir contas
      await tx.account.deleteMany({
        where: { userId }
      });

      // 5. Excluir tokens de redefinição de senha
      await tx.passwordResetToken.deleteMany({
        where: { userId }
      });

      // 6. Finalmente excluir o usuário
      await tx.user.delete({
        where: { id: userId }
      });
    });

    return NextResponse.json({
      status: 200,
      success: true,
      message: 'Conta e todos os dados associados foram excluídos com sucesso'
    });

  } catch (error) {
    const errorMessage = translateDeleteAccountError(error);
    
    return NextResponse.json({ 
      status: 500,
      success: false, 
      message: errorMessage,
    });
  }
}

function translateDeleteAccountError(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Erro interno ao excluir a conta";
  }

  const errorMessage = error.message.toLowerCase();

  if (errorMessage.includes('prisma') || errorMessage.includes('database')) {
    if (errorMessage.includes('foreign key constraint')) {
      return "Erro de integridade referencial. Alguns dados não puderam ser excluídos.";
    }
    if (errorMessage.includes('connection') || errorMessage.includes('timeout')) {
      return "Erro de conexão com o banco de dados. Tente novamente";
    }
    return "Erro no banco de dados ao excluir a conta";
  }

  if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
    return "Erro de conexão. Verifique sua internet e tente novamente";
  }

  return "Erro inesperado ao excluir a conta. Tente novamente";
}