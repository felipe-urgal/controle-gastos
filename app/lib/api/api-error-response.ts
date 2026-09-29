import { ZodError } from "zod";

import { failure } from "@/app/lib/api-response";
import { isUnauthorizedError } from "@/app/lib/auth/auth-errors";
import { isHttpError } from "@/app/lib/http-error";

type ApiFailureOptions = {
  fallbackMessage: string;
  zodMessage?: string;
  unauthorizedMessage?: string;
  unauthorizedCode?: string;
};

export function apiFailureFromError(
  error: unknown,
  options: ApiFailureOptions,
) {
  if (error instanceof ZodError) {
    return failure(
      error.issues[0]?.message ?? options.zodMessage ?? "Dados inválidos",
      400,
    );
  }

  if (isHttpError(error)) {
    const response = failure(error.message, error.status, error.code);
    for (const [name, value] of Object.entries(error.headers ?? {})) {
      response.headers.set(name, value);
    }
    return response;
  }

  if (isUnauthorizedError(error)) {
    return failure(
      options.unauthorizedMessage ?? "Não autenticado",
      401,
      options.unauthorizedCode,
    );
  }

  return failure(options.fallbackMessage, 500);
}
