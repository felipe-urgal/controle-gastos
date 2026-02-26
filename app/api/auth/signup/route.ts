import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/app/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = body?.name?.trim();
    const email = body?.email?.trim().toLowerCase();
    const password = body?.password;

    const errors: string[] = [];

    // Validações
    if (!name) errors.push("Nome é obrigatório");
    if (!email) errors.push("E-mail é obrigatório");
    if (!password) errors.push("Senha é obrigatória");

    if (name && name.length < 2)
      errors.push("Nome deve ter pelo menos 2 caracteres");

    if (name && name.length > 100)
      errors.push("Nome não pode exceder 100 caracteres");

    if (
      email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      errors.push("Formato de e-mail inválido");
    }

    if (password && password.length < 6)
      errors.push("Senha deve ter pelo menos 6 caracteres");

    if (password && password.length > 100)
      errors.push("Senha não pode exceder 100 caracteres");

    if (password && !/[A-Z]/.test(password))
      errors.push("Senha deve conter ao menos uma letra maiúscula");

    if (password && !/[0-9]/.test(password))
      errors.push("Senha deve conter ao menos um número");

    if (errors.length > 0) {
      return NextResponse.json(
        { success: false, message: errors.join(". ") },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
      select: {
        id: true,
        name: true,
        email: true,
        showValues: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Usuário criado com sucesso!",
        data: user,
      },
      { status: 201 }
    );
  } catch (error: any) {
    // Tratamento robusto de erro Prisma
    if (error.code === "P2002") {
      return NextResponse.json(
        { success: false, message: "E-mail já está em uso" },
        { status: 400 }
      );
    }

    console.error("REGISTER ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Erro interno ao realizar registro",
      },
      { status: 500 }
    );
  }
}
