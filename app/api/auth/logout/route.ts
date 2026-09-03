import { NextResponse } from "next/server";
import { shouldUseSecureAuthCookie } from "@/app/lib/auth-cookie";

export async function POST(request: Request): Promise<NextResponse> {
  const response = NextResponse.json(
    {
      success: true,
      message: "Logout realizado com sucesso!",
    },
    { status: 200 }
  );

  response.cookies.set("token", "", {
    httpOnly: true,
    secure: shouldUseSecureAuthCookie(request),
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    priority: "high",
  });

  return response;
};
