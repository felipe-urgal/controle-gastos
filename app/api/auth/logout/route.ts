import { NextResponse } from "next/server";
import {
  clearAuthCookies,
  shouldUseSecureAuthCookie,
} from "@/app/lib/auth/auth-cookie";

export async function POST(request: Request): Promise<NextResponse> {
  const response = NextResponse.json(
    {
      success: true,
      message: "Logout realizado com sucesso!",
    },
    { status: 200 }
  );

  clearAuthCookies(response, shouldUseSecureAuthCookie(request));

  return response;
};
