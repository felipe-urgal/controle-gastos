import { NextResponse } from "next/server";
import { prisma } from '@/app/lib/prisma';
import bcrypt from "bcryptjs";

const RODADAS_SALT = 10;

export async function POST(req: Request) {
  try {
    const { email, senhaAtual, novaSenha } = await req.json();

    // Validações básicas
    if (!email || !senhaAtual || !novaSenha) {
      return NextResponse.json(
        { error: "Todos os campos são obrigatórios" },
        { status: 400 }
      );
    }

    if (novaSenha.length < 8) {
      return NextResponse.json(
        { error: "A nova senha deve ter pelo menos 8 caracteres" },
        { status: 400 }
      );
    }

    // Busca usuário
    const usuario = await prisma.user.findUnique({
      where: { email },
    });

    if (!usuario) {
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 404 }
      );
    }

    // Verifica senha atual
    const senhaAtualCorreta = await bcrypt.compare(senhaAtual, usuario.password);
    if (!senhaAtualCorreta) {
      return NextResponse.json(
        { error: "Senha atual incorreta" },
        { status: 400 }
      );
    }

    // Cria hash da nova senha
    const hashNovaSenha = await bcrypt.hash(novaSenha, RODADAS_SALT);

    // Atualiza senha no banco de dados
    await prisma.user.update({
      where: { id: usuario.id },
      data: { password: hashNovaSenha },
    });

    return NextResponse.json({
      mensagem: "Senha alterada com sucesso",
    });

  } catch (error) {
    console.error("Erro ao mudar senha:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}