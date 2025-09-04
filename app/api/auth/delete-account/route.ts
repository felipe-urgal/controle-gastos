// app/api/auth/delete-account/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from "@/app/lib/session";
import { prisma } from '@/app/lib/prisma';

export async function DELETE(req: NextRequest) {
  try {
    

    const cookieHeader = req.headers.get("cookie");

    const token = cookieHeader
      ?.split(";")
      .find(c => c.trim().startsWith("token="))
      ?.split("=")[1];

    if (!token) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Verificar a sessão diretamente com o token
    const session = await getSession(token);

    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Sessão inválida ou expirada' }, { status: 401 });
    }

    const userId = session.userId;

    console.log('Excluindo conta do usuário:', userId);

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

      // 5. Excluir categorias
      await tx.category.deleteMany({
        where: { userId }
      });

      // 6. Excluir contas
      await tx.account.deleteMany({
        where: { userId }
      });

      // 6. Excluir contas
      await tx.passwordResetToken.deleteMany({
        where: { userId }
      });

      // 8. Finalmente excluir o usuário
      await tx.user.delete({
        where: { id: userId }
      });
    });

    console.log('Conta excluída com sucesso para o usuário:', userId);

    return NextResponse.json({
      success: true,
      message: 'Conta e todos os dados associados foram excluídos com sucesso'
    });

  } catch (error) {
    console.error('Erro detalhado ao excluir conta:', error);
    
    // Verificar se é erro de constraint do Prisma
    if (error instanceof Error && error.message.includes('foreign key constraint')) {
      return NextResponse.json(
        { error: 'Erro de integridade referencial. Alguns dados não puderam ser excluídos.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Erro interno do servidor ao excluir conta' },
      { status: 500 }
    );
  }
}