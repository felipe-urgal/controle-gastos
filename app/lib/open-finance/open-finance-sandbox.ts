import { z } from "zod";

import {
  parseImportDate,
  parseMoneyToCents,
  type ImportTransactionType,
} from "@/app/lib/transactions/import/parser";

const DEFAULT_TIMEOUT_MS = 5_000;
export const OPEN_FINANCE_SANDBOX_MAX_PAGE_SIZE = 100;

const accountSchema = z.object({
  accountId: z.string().min(1),
  type: z.string().min(1).optional(),
  subtype: z.string().min(1).optional(),
  currency: z.string().length(3).default("BRL"),
  name: z.string().min(1).optional(),
});

const accountsResponseSchema = z.object({
  data: z.array(accountSchema),
  meta: z
    .object({
      totalRecords: z.number().int().nonnegative().optional(),
      totalPages: z.number().int().positive().optional(),
    })
    .optional(),
});

const transactionSchema = z.object({
  transactionId: z.string().min(1),
  transactionName: z.string().min(1).optional(),
  creditDebitType: z.enum(["CREDITO", "DEBITO", "CREDIT", "DEBIT"]),
  transactionAmount: z.object({
    amount: z.union([z.string(), z.number()]).transform(String),
    currency: z.string().length(3),
  }),
  transactionDateTime: z.string().min(10).optional(),
  transactionDate: z.string().min(10).optional(),
  status: z.enum(["BOOKED", "PENDING"]).default("BOOKED"),
});

const transactionsResponseSchema = z.object({
  data: z.array(transactionSchema),
  meta: z
    .object({
      totalRecords: z.number().int().nonnegative().optional(),
      totalPages: z.number().int().positive().optional(),
    })
    .optional(),
});

export type ExternalAccount = {
  externalId: string;
  name: string;
  currency: string;
  type?: string;
  subtype?: string;
};

export type ExternalTransaction = {
  externalId: string;
  accountExternalId: string;
  date: string;
  amountCents: number;
  type: ImportTransactionType;
  description: string;
  currency: string;
  status: "BOOKED" | "PENDING";
};

export type SandboxImportPreviewItem = {
  index: number;
  source: "OPEN_FINANCE_SANDBOX";
  date: string;
  amountCents: number;
  type: ImportTransactionType;
  description: string;
  externalId: string;
  currency: string;
  errors: string[];
};

export type OpenFinanceSandboxErrorCode =
  | "PRODUCTION_BLOCKED"
  | "UNSAFE_BASE_URL"
  | "INVALID_RESPONSE"
  | "CONSENT_EXPIRED"
  | "RATE_LIMITED"
  | "NOT_FOUND"
  | "UPSTREAM_UNAVAILABLE"
  | "TIMEOUT"
  | "NETWORK_ERROR";

export class OpenFinanceSandboxError extends Error {
  constructor(
    message: string,
    public readonly code: OpenFinanceSandboxErrorCode,
  ) {
    super(message);
    this.name = "OpenFinanceSandboxError";
  }
}

type FetchLike = typeof fetch;

type OpenFinanceSandboxClientOptions = {
  baseUrl: string;
  accessToken: string;
  consentId: string;
  runtimeEnv?: string;
  fetchFn?: FetchLike;
  timeoutMs?: number;
};

function assertSandboxBaseUrl(raw: string) {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new OpenFinanceSandboxError(
      "URL do sandbox Open Finance é inválida.",
      "UNSAFE_BASE_URL",
    );
  }

  const hostname = url.hostname.toLowerCase();
  const local = hostname === "localhost" || hostname === "127.0.0.1";
  const namedSandbox = hostname.includes("sandbox") || hostname.includes("mock");
  if ((!local && url.protocol !== "https:") || (!local && !namedSandbox)) {
    throw new OpenFinanceSandboxError(
      "O experimento aceita somente localhost ou hosts explicitamente identificados como sandbox/mock.",
      "UNSAFE_BASE_URL",
    );
  }

  return url;
}

function responseError(status: number) {
  if (status === 401 || status === 403) {
    return new OpenFinanceSandboxError(
      "Consentimento/token do sandbox expirado ou inválido.",
      "CONSENT_EXPIRED",
    );
  }
  if (status === 404) {
    return new OpenFinanceSandboxError(
      "Recurso não encontrado no sandbox Open Finance.",
      "NOT_FOUND",
    );
  }
  if (status === 429) {
    return new OpenFinanceSandboxError(
      "Limite de requisições do sandbox excedido.",
      "RATE_LIMITED",
    );
  }
  return new OpenFinanceSandboxError(
    "Sandbox Open Finance indisponível.",
    "UPSTREAM_UNAVAILABLE",
  );
}

function accountName(account: z.infer<typeof accountSchema>) {
  if (account.name?.trim()) return account.name.trim();
  const parts = [account.type, account.subtype].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : `Conta ${account.accountId}`;
}

function normalizeDate(value: string | undefined) {
  const date = value ? parseImportDate(value.slice(0, 10)) : null;
  if (!date) {
    throw new OpenFinanceSandboxError(
      "Transação do sandbox possui data inválida.",
      "INVALID_RESPONSE",
    );
  }
  return date;
}

function normalizeAmount(
  amount: string,
  direction: z.infer<typeof transactionSchema>["creditDebitType"],
) {
  const parsed = parseMoneyToCents(amount);
  if (parsed === null || parsed === 0) {
    throw new OpenFinanceSandboxError(
      "Transação do sandbox possui valor inválido.",
      "INVALID_RESPONSE",
    );
  }
  const debit = direction === "DEBITO" || direction === "DEBIT";
  return {
    amountCents: Math.abs(parsed),
    type: debit ? ("EXPENSE" as const) : ("INCOME" as const),
  };
}

export class OpenFinanceSandboxClient {
  private readonly baseUrl: URL;
  private readonly accessToken: string;
  private readonly consentId: string;
  private readonly fetchFn: FetchLike;
  private readonly timeoutMs: number;

  constructor(options: OpenFinanceSandboxClientOptions) {
    const runtimeEnv = options.runtimeEnv ?? process.env.NODE_ENV;
    if (runtimeEnv === "production") {
      throw new OpenFinanceSandboxError(
        "Adapter Open Finance sandbox é bloqueado em produção.",
        "PRODUCTION_BLOCKED",
      );
    }
    if (!options.accessToken.trim() || !options.consentId.trim()) {
      throw new OpenFinanceSandboxError(
        "Token e consentimento do sandbox são obrigatórios.",
        "CONSENT_EXPIRED",
      );
    }

    this.baseUrl = assertSandboxBaseUrl(options.baseUrl);
    this.accessToken = options.accessToken;
    this.consentId = options.consentId;
    this.fetchFn = options.fetchFn ?? fetch;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  private async request<T>(path: string, schema: z.ZodType<T>) {
    const url = new URL(path, this.baseUrl);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.fetchFn(url, {
        method: "GET",
        headers: {
          accept: "application/json",
          authorization: `Bearer ${this.accessToken}`,
          "x-consent-id": this.consentId,
        },
        signal: controller.signal,
        cache: "no-store",
      });

      if (!response.ok) throw responseError(response.status);

      let json: unknown;
      try {
        json = await response.json();
      } catch {
        throw new OpenFinanceSandboxError(
          "Sandbox Open Finance retornou JSON inválido.",
          "INVALID_RESPONSE",
        );
      }

      const parsed = schema.safeParse(json);
      if (!parsed.success) {
        throw new OpenFinanceSandboxError(
          "Sandbox Open Finance retornou payload incompatível.",
          "INVALID_RESPONSE",
        );
      }
      return parsed.data;
    } catch (error) {
      if (error instanceof OpenFinanceSandboxError) throw error;
      if (error instanceof Error && error.name === "AbortError") {
        throw new OpenFinanceSandboxError(
          "Tempo limite excedido ao consultar o sandbox Open Finance.",
          "TIMEOUT",
        );
      }
      throw new OpenFinanceSandboxError(
        "Falha de rede ao consultar o sandbox Open Finance.",
        "NETWORK_ERROR",
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  async listAccounts() {
    const payload = await this.request(
      "/open-banking/accounts/v2/accounts",
      accountsResponseSchema,
    );

    return payload.data.map(
      (account): ExternalAccount => ({
        externalId: account.accountId,
        name: accountName(account),
        currency: account.currency.toUpperCase(),
        type: account.type,
        subtype: account.subtype,
      }),
    );
  }

  async listTransactions(
    accountExternalId: string,
    input: {
      page?: number;
      pageSize?: number;
      fromDate?: string;
      toDate?: string;
    } = {},
  ) {
    const page = input.page ?? 1;
    const pageSize = input.pageSize ?? 50;
    if (!Number.isInteger(page) || page < 1) {
      throw new RangeError("page deve ser inteiro positivo.");
    }
    if (
      !Number.isInteger(pageSize) ||
      pageSize < 1 ||
      pageSize > OPEN_FINANCE_SANDBOX_MAX_PAGE_SIZE
    ) {
      throw new RangeError(
        `pageSize deve estar entre 1 e ${OPEN_FINANCE_SANDBOX_MAX_PAGE_SIZE}.`,
      );
    }

    const path = `/open-banking/accounts/v2/accounts/${encodeURIComponent(
      accountExternalId,
    )}/transactions`;
    const url = new URL(path, this.baseUrl);
    url.searchParams.set("page", String(page));
    url.searchParams.set("page-size", String(pageSize));
    if (input.fromDate) url.searchParams.set("fromBookingDateTime", input.fromDate);
    if (input.toDate) url.searchParams.set("toBookingDateTime", input.toDate);

    const relative = `${url.pathname}${url.search}`;
    const payload = await this.request(relative, transactionsResponseSchema);
    const items = payload.data.map((transaction): ExternalTransaction => {
      const amount = normalizeAmount(
        transaction.transactionAmount.amount,
        transaction.creditDebitType,
      );
      return {
        externalId: transaction.transactionId,
        accountExternalId,
        date: normalizeDate(
          transaction.transactionDateTime ?? transaction.transactionDate,
        ),
        ...amount,
        description:
          transaction.transactionName?.trim() || "Transação Open Finance",
        currency: transaction.transactionAmount.currency.toUpperCase(),
        status: transaction.status,
      };
    });

    const totalPages = payload.meta?.totalPages;
    return {
      items,
      page,
      nextPage: totalPages && page < totalPages ? page + 1 : null,
      totalRecords: payload.meta?.totalRecords ?? items.length,
    };
  }
}

export function toSandboxImportPreview(
  transactions: readonly ExternalTransaction[],
): SandboxImportPreviewItem[] {
  const seenExternalIds = new Set<string>();

  return transactions.map((transaction, index) => {
    const errors: string[] = [];
    if (transaction.status === "PENDING") {
      errors.push("Transação pendente; revisar antes de qualquer importação.");
    }
    if (seenExternalIds.has(transaction.externalId)) {
      errors.push("Identificador externo repetido no payload do sandbox.");
    }
    seenExternalIds.add(transaction.externalId);

    return {
      index,
      source: "OPEN_FINANCE_SANDBOX",
      date: transaction.date,
      amountCents: transaction.amountCents,
      type: transaction.type,
      description: transaction.description.slice(0, 100),
      externalId: transaction.externalId,
      currency: transaction.currency,
      errors,
    };
  });
}
