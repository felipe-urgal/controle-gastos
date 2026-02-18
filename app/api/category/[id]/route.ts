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

    // 🔐 1. Pegar token
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, message: "Não autenticado" },
        { status: 401 }
      );
    }

    // 🔐 2. Validar token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET!
    ) as { userId: string };

    // 🔐 3. Buscar categoria somente do usuário
    const category = await prisma.category.findFirst({
      where: {
        id,
        userId: decoded.userId,
      },
      include: {
        _count: {
          select: {
            transactions: true
          }
        }
      }
    });

    if (!category) {
      return NextResponse.json(
        { success: false, message: "Categoria não encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: category,
    });

  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { success: false, message: "Token inválido ou expirado" },
      { status: 401 }
    );
  }
}
