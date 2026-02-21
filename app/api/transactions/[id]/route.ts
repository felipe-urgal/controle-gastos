import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

// GET /api/transactions/[id] - Buscar transação específica
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

    // 🔐 3. Busca a transação somente se pertencer ao usuário
    const transaction = await prisma.transaction.findFirst({
      where: {
        id,
        userId: decoded.userId
      },
      include: {
        user: { 
          select: { 
            id: true, 
            name: true, 
            email: true 
          }
        },
        account: {
          select: {
            id: true,
            name: true,
            type: true,
            currency: true,
            color: true,
            icon: true
          }
        },
        category: {
          select: {
            id: true,
            name: true,
            type: true,
            color: true,
            icon: true
          }
        }
      }
    });

    if (!transaction) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Transação não encontrada" 
        }, 
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: transaction
    });

  } catch (error) {
    console.error("Transaction fetch error:", error);
    
    if (error instanceof jwt.JsonWebTokenError) {
      return NextResponse.json(
        { success: false, message: "Token inválido ou expirado" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : "Erro ao buscar transação" 
      },
      { status: 500 }
    );
  }
}
