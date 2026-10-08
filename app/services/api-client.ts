type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

export const SESSION_EXPIRED_EVENT = "auth:session-expired";

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
    public readonly retryAfterSeconds?: number,
    public readonly fieldErrors?: Record<string, string>,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

interface ApiClientOptions<TRequestBody = unknown> {
  method?: HttpMethod;
  queryParams?: Record<string, string | number | boolean>;
  body?: TRequestBody;
  headers?: HeadersInit;
  credentials?: RequestCredentials;
  signal?: AbortSignal;
};

export async function apiClient<TResponse = unknown, TRequestBody = unknown>(
  endpoint: string,
  {
    method = "GET",
    queryParams,
    body,
    headers = { "Content-Type": "application/json" },
    credentials = "include",
    signal,
  }: ApiClientOptions<TRequestBody> = {}
): Promise<TResponse> {
  try {
    const baseUrl = typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXTAUTH_URL || "http://localhost:3000";

    const url = new URL(endpoint, baseUrl);

    if (queryParams) {
      for (const [key, value] of Object.entries(queryParams)) {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      }
    }

    const isFormData = body instanceof FormData;
    const finalHeaders = isFormData ? {} : headers;

    const response = await fetch(url.toString(), {
      method,
      headers: finalHeaders,
      body: isFormData ? body : body ? JSON.stringify(body) : undefined,
      credentials,
      signal,
    });

    if (!response.ok) {
      let errorMessage = `Erro ${response.status}: ${response.statusText}`;
      let errorCode: string | undefined;
      let fieldErrors: Record<string, string> | undefined;
      const rawRetryAfter = response.headers.get("Retry-After");
      const retryAfterSeconds =
        rawRetryAfter && /^\d+$/.test(rawRetryAfter)
          ? Number(rawRetryAfter)
          : rawRetryAfter && !Number.isNaN(Date.parse(rawRetryAfter))
            ? Math.max(0, Math.ceil((Date.parse(rawRetryAfter) - Date.now()) / 1000))
            : undefined;

      try {
        const errorData = (await response.json()) as {
          error?: { message?: string; code?: string };
          message?: string;
          code?: string;
          fieldErrors?: Record<string, string>;
        };
        errorMessage =
          errorData?.error?.message || errorData?.message || errorMessage;
        errorCode = errorData?.error?.code ?? errorData?.code;
        fieldErrors = errorData?.fieldErrors;
      } catch {
        // Keep the HTTP fallback when the response body is not JSON.
      }

      // Só leituras disparam o logout global: escritas (ex.: fila offline) tratam
      // o 401 por conta própria para preservar o item e oferecer novo login.
      if (
        response.status === 401 &&
        method === "GET" &&
        !errorCode &&
        !endpoint.startsWith("/api/auth/") &&
        typeof window !== "undefined"
      ) {
        window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
      }

      throw new ApiClientError(
        errorMessage,
        response.status,
        errorCode,
        retryAfterSeconds,
        fieldErrors,
      );
    }

    const contentType = response.headers.get("content-type");

    if (contentType?.includes("application/json")) {
      return (await response.json()) as TResponse;
    }

    return null as unknown as TResponse;
  } catch (error) {
    throw error instanceof Error ? error : new Error("Erro inesperado na requisição");
  }
};
