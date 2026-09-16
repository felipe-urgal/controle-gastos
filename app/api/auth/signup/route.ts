import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { parseJsonBody } from "@/app/lib/api/request-json";
import {
  AUTH_INPUT_LIMITS,
  asInputRecord,
  stringInput,
} from "@/app/lib/auth/auth-input";
import { isHttpError } from "@/app/lib/http-error";
import { prisma } from "@/app/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await parseJsonBody(request);
    const payload = asInputRecord(body);
    const name = stringInput(payload, "name")?.trim();
    const email = stringInput(payload, "email")?.trim().toLowerCase();
    const password = stringInput(payload, "password");

    const errors: string[] = [];

    if (!name) errors.push("Nome é obrigatório");
    if (!email) errors.push("E-mail é obrigatório");
    if (!password) errors.push("Senha é obrigatória");

    if (name && name.length < 2)
      errors.push("Nome deve ter pelo menos 2 caracteres");

    if (name && name.length > AUTH_INPUT_LIMITS.name)
      errors.push("Nome não pode exceder 100 caracteres");

    if (email && email.length > AUTH_INPUT_LIMITS.email) {
      errors.push("E-mail é muito longo");
    } else if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push("Formato de e-mail inválido");
    }

    if (password && password.length < 6)
      errors.push("Senha deve ter pelo menos 6 caracteres");

    if (password && password.length > AUTH_INPUT_LIMITS.password)
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

    const hashedPassword = await bcrypt.hash(password!, 12);

    const user = await prisma.user.create({
      data: {
        name: name!,
        email: email!,
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
  } catch (error: unknown) {
    if (isHttpError(error)) {
      return NextResponse.json(
        { success: false, message: error.message, code: error.code },
        { status: error.status },
      );
    }

    if (
      error !== null &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    ) {
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
