import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/app/lib/prisma';

export async function POST(request: Request): Promise<NextResponse<any>> {
  try {
    const { token, novaSenha } = await request.json();
    
    let errors = "";

    // Validações
    if (!token?.trim()) {
      errors += "Token é obrigatório!;";
    }

    if (!novaSenha) {
      errors += "Nova senha é obrigatória!;";
    }

    if (novaSenha && novaSenha.length < 6) {
      errors += "Senha deve ter pelo menos 6 caracteres!;";
    }

    if (novaSenha && novaSenha.length > 100) {
      errors += "Senha não pode exceder 100 caracteres!;";
    }

    if (errors) {
      const formattedErrors = errors.slice(0, -1);
      return NextResponse.json({ 
        status: 400,
        success: false,
        message: formattedErrors
      });
    }

    // Busca o token válido
    const resetToken = await prisma.passwordResetToken.findFirst({
      where: {
        token: token.trim(),
        expiresAt: { gt: new Date() }, // Token não expirado
      },
      include: { user: true },
    });

    if (!resetToken) {
      return NextResponse.json({ 
        status: 400,
        success: false,
        message: "Token inválido ou expirado"
      });
    }

    // Atualiza a senha do usuário
    const hashedPassword = await bcrypt.hash(novaSenha, 10);
    await prisma.user.update({
      where: { id: resetToken.userId },
      data: { password: hashedPassword },
    });

    // Remove o token (já foi usado)
    await prisma.passwordResetToken.delete({ where: { id: resetToken.id } });

    return NextResponse.json({
      status: 200,
      success: true,
      message: "Senha redefinida com sucesso!"
    });

  } catch (error) {
    const errorMessage = translateResetPasswordError(error);
    
    return NextResponse.json({ 
      status: 500,
      success: false, 
      message: errorMessage,
    });
  } finally {
    await prisma.$disconnect();
  }
}

function translateResetPasswordError(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Erro interno ao processar a redefinição de senha";
  }

  const errorMessage = error.message.toLowerCase();

  // Erros do Prisma
  if (errorMessage.includes('prisma') || errorMessage.includes('database')) {
    if (errorMessage.includes('connection') || errorMessage.includes('timeout')) {
      return "Erro de conexão com o banco de dados. Tente novamente";
    }
    if (errorMessage.includes('record to update not found')) {
      return "Usuário não encontrado";
    }
    return "Erro no banco de dados ao redefinir senha";
  }

  // Erros do bcrypt
  if (errorMessage.includes('bcrypt') || errorMessage.includes('hash')) {
    return "Erro ao criptografar a senha";
  }

  // Erros de rede/requisição
  if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
    return "Erro de conexão. Verifique sua internet e tente novamente";
  }

  // Erro genérico
  return "Erro inesperado ao redefinir senha. Tente novamente";
}