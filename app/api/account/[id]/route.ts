import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

// show
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    // 🔐 1. Pega o token do cookie
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, message: "Não autenticado" },
        { status: 401 }
      );
    }

    // 🔐 2. Valida o token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET!
    ) as { userId: string };

    // 🔐 3. Busca a conta somente se pertencer ao usuário
    const account = await prisma.account.findFirst({
      where: {
        id,
        userId: decoded.userId
      },
      include: {
        _count: {
          select: {
            transactions: true,
            investments: true
          }
        }
      }
    });

    if (!account) {
      return NextResponse.json(
        { success: false, message: "Conta não encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: account
    });

  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Token inválido ou expirado" },
      { status: 401 }
    );
  }
}