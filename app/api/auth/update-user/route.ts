import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { getSession } from "@/app/lib/session";

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;

type UserUpdatePayload = {
  name?: string;
  email?: string;
  password?: string;
};

export async function PUT(request: Request) {
  try {
    // Obter o token do header Authorization
    const cookieHeader = request.headers.get("cookie");
    const token = cookieHeader
      ?.split(";")
      .find(c => c.trim().startsWith("token="))
      ?.split("=")[1];

    if (!token) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    console.log(request)
    if (!token) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Verificar a sessão diretamente com o token
    const session = await getSession(token);
    
    if (!session?.userId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { name, email, currentPassword, newPassword } = await request.json();
    const updateData: UserUpdatePayload = {};

    // Atualizar nome/email
    if (name) updateData.name = name;
    if (email) updateData.email = email;

    // Atualizar senha (se for o caso)
    if (currentPassword && newPassword) {
      const user = await prisma.user.findUnique({
        where: { id: session.userId }
      });

      if (!user) {
        return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
      }

      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return NextResponse.json({ error: "Senha atual incorreta" }, { status: 400 });
      }

      updateData.password = await bcrypt.hash(newPassword, SALT_ROUNDS);
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        // outros campos que deseja retornar
      }
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("Erro ao atualizar usuário:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}