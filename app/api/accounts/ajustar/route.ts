import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function GET() {
  try {
    await prisma.account.update({
      where: {
        id: "fc2e881d-6c5b-4ecc-b03a-ec4bee8ac7ee",
      },
      data: {
        balance: {
          decrement: 1, // 🔥 remove 1 centavo
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "R$ 0,01 removido com sucesso",
    });

  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error.message,
      },
      { status: 500 }
    );
  }
}