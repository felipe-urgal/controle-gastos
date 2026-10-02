import { z } from "zod";

import { getAuthenticatedUserId } from "@/app/lib/auth";
import { isUnauthorizedError } from "@/app/lib/auth/auth-errors";
import {
  annualTaxReportToCsv,
  annualTaxReportToPdf,
} from "@/app/lib/investments/investment-annual-tax-support-export";
import { getAnnualTaxSupportReportForUser } from "@/app/lib/investments/investment-annual-tax-support-report";

const querySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  format: z.enum(["csv", "pdf"]),
});

export async function GET(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    const url = new URL(request.url);
    const input = querySchema.parse({
      year: url.searchParams.get("year"),
      format: url.searchParams.get("format"),
    });
    const report = await getAnnualTaxSupportReportForUser(userId, input.year);
    const filename = `apoio-ir-${input.year}.${input.format}`;

    if (input.format === "csv") {
      return new Response(annualTaxReportToCsv(report), {
        headers: {
          "content-type": "text/csv; charset=utf-8",
          "content-disposition": `attachment; filename="${filename}"`,
          "cache-control": "private, no-store",
        },
      });
    }

    return new Response(annualTaxReportToPdf(report), {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="${filename}"`,
        "cache-control": "private, no-store",
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { success: false, message: error.issues[0]?.message ?? "Dados inválidos" },
        { status: 400 },
      );
    }
    if (isUnauthorizedError(error)) {
      return Response.json(
        { success: false, message: "Não autenticado" },
        { status: 401 },
      );
    }
    return Response.json(
      { success: false, message: "Erro ao exportar relatório anual" },
      { status: 500 },
    );
  }
}
