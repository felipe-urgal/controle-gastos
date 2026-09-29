import { describe, expect, it } from "vitest";
import { z } from "zod";

import { apiFailureFromError } from "@/app/lib/api/api-error-response";
import { parseQuery } from "@/app/lib/api/query";
import { UnauthorizedError } from "@/app/lib/auth/auth-errors";
import { HttpError } from "@/app/lib/http-error";

describe("parseQuery", () => {
  const schema = z.object({
    page: z.coerce.number().int().positive(),
    currency: z.enum(["BRL", "USD", "EUR"]).default("BRL"),
  });

  it("parses the first value for duplicated query parameters", () => {
    const request = new Request(
      "http://localhost/api/test?page=2&page=9&currency=USD",
    );

    expect(parseQuery(request, schema)).toEqual({
      page: 2,
      currency: "USD",
    });
  });

  it("supports explicit defaults for missing parameters", () => {
    const optionalSchema = z.object({
      q: z.string().min(2),
    });

    expect(() =>
      parseQuery(
        new Request("http://localhost/api/test"),
        optionalSchema,
        { q: "" },
      ),
    ).toThrow("Too small");
  });
});

describe("apiFailureFromError", () => {
  it("maps Zod errors to 400 preserving the validation message", async () => {
    const error = z.string().min(3, "Campo inválido").safeParse("x").error!;
    const response = apiFailureFromError(error, {
      fallbackMessage: "Falha",
      zodMessage: "Dados inválidos",
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: { message: "Campo inválido" },
    });
  });

  it("maps authentication errors to 401", async () => {
    const response = apiFailureFromError(new UnauthorizedError(), {
      fallbackMessage: "Falha",
    });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: { message: "Não autenticado" },
    });
  });

  it("preserves HttpError status, code and headers", async () => {
    const response = apiFailureFromError(
      new HttpError("Conflito", 409, "CONFLICT", { "Retry-After": "7" }),
      { fallbackMessage: "Falha" },
    );

    expect(response.status).toBe(409);
    expect(response.headers.get("Retry-After")).toBe("7");
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "CONFLICT", message: "Conflito" },
    });
  });

  it("uses a safe 500 fallback for unexpected errors", async () => {
    const response = apiFailureFromError(new Error("database secret"), {
      fallbackMessage: "Erro interno",
    });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({
      error: { message: "Erro interno" },
    });
  });
});
