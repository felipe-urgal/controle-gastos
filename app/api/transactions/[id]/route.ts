import { NextRequest, NextResponse } from "next/server";
import { prisma } from '@/app/lib/prisma';
import { ErrorResponse } from '@/app/types/error';

export async function GET(req: NextRequest): Promise<NextResponse<any | ErrorResponse>> {
  const url = new URL(req.url);
  const id = url.pathname.split("/").pop();

  if (!id) {
    return NextResponse.json(
      { 
        success: false, 
        message: "ID da transação não informado" 
      }, 
      { status: 400 }
    );
  }

  try {
    const transaction = await prisma.transaction.findUnique({
      where: { id },
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
  } catch(error) {
    console.error("Transaction fetch error:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}