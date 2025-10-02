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
        message: "ID da conta não informado" 
      }, 
      { status: 400 }
    );
  }

  try {
    const account = await prisma.account.findUnique({
      where: { id },
      include: { 
        user: { 
          select: { 
            id: true, 
            name: true, 
            email: true 
          }
        },
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
        { 
          success: false, 
          message: "Conta não encontrada" 
        }, 
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: account
    });
  } catch(error) {
    console.error("Account fetch error:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}