import { NextResponse } from "next/server";

import { verifyEmailVerificationToken } from "@/app/lib/auth/email-verification-token";
import { getRequestId, logEvent } from "@/app/lib/observability";
import { prisma } from "@/app/lib/prisma";

const ROUTE = "/api/auth/verify-email";

function redirect(request: Request, state: "success" | "invalid") {
  const url = new URL("/login", request.url);
  url.searchParams.set("verification", state);
  return NextResponse.redirect(url);
}

export async function GET(request: Request) {
  const requestId = getRequestId(request);
  const token = new URL(request.url).searchParams.get("token")?.trim();

  if (!token) return redirect(request, "invalid");

  try {
    const verification = verifyEmailVerificationToken(token);
    const user = await prisma.user.findUnique({
      where: { id: verification.userId },
      select: {
        id: true,
        email: true,
        emailVerifiedAt: true,
        authVersion: true,
        isActive: true,
      },
    });

    if (
      !user ||
      !user.isActive ||
      user.authVersion !== verification.authVersion
    ) {
      return redirect(request, "invalid");
    }

    if (verification.kind === "signup") {
      if (user.email !== verification.email) return redirect(request, "invalid");

      if (!user.emailVerifiedAt) {
        await prisma.user.updateMany({
          where: {
            id: user.id,
            email: verification.email,
            authVersion: verification.authVersion,
            emailVerifiedAt: null,
          },
          data: { emailVerifiedAt: new Date() },
        });
      }
    } else {
      if (user.email === verification.email) return redirect(request, "success");

      const conflict = await prisma.user.findFirst({
        where: {
          email: verification.email,
          NOT: { id: user.id },
        },
        select: { id: true },
      });
      if (conflict) return redirect(request, "invalid");

      const updated = await prisma.user.updateMany({
        where: {
          id: user.id,
          authVersion: verification.authVersion,
        },
        data: {
          email: verification.email,
          emailVerifiedAt: new Date(),
          authVersion: { increment: 1 },
        },
      });
      if (updated.count !== 1) return redirect(request, "invalid");
    }

    logEvent("info", "auth_email_verified", {
      requestId,
      route: ROUTE,
      status: 302,
    });
    return redirect(request, "success");
  } catch (error) {
    logEvent("warn", "auth_email_verification_rejected", {
      requestId,
      route: ROUTE,
      status: 302,
    }, error);
    return redirect(request, "invalid");
  }
}
