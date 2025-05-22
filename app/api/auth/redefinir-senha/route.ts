import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const { token, novaSenha } = await request.json();
    
    if (!token || !novaSenha) {
      return NextResponse.json(
        { error: 'Token e nova senha são obrigatórios' },
        { status: 400 }
      );
    }

    // Busca o token válido
    const resetToken = await prisma.passwordResetToken.findFirst({
      where: {
        token,
        expiresAt: { gt: new Date() }, // Token não expirado
      },
      include: { user: true },
    });

    if (!resetToken) {
      return NextResponse.json(
        { error: 'Token inválido ou expirado' },
        { status: 400 }
      );
    }

    // Atualiza a senha do usuário
    const hashedPassword = await bcrypt.hash(novaSenha, 10);
    await prisma.user.update({
      where: { id: resetToken.userId },
      data: { password: hashedPassword },
    });

    // Remove o token (já foi usado)
    await prisma.passwordResetToken.delete({ where: { id: resetToken.id } });

    return NextResponse.json(
      { message: 'Senha redefinida com sucesso' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Erro na redefinição de senha:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
