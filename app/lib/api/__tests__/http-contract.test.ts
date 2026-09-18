import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAuthenticatedUserId: vi.fn(),
  getForecastForUser: vi.fn(),
  createTransferForUser: vi.fn(),
  listTransfersForUser: vi.fn(),
  getTransferForUser: vi.fn(),
  updateTransferForUser: vi.fn(),
  deleteTransferForUser: vi.fn(),
}));

const observabilityMocks = vi.hoisted(() => ({
  logServerOperation: vi.fn(),
}));

vi.mock("@/app/lib/observability", () => ({
  getRequestId: (request: Request) =>
    request.headers.get("x-request-id") ?? "test-request-12345678",
  withRequestId: (response: Response, requestId: string) => {
    response.headers.set("x-request-id", requestId);
    return response;
  },
  logServerOperation: observabilityMocks.logServerOperation,
}));

vi.mock("@/app/lib/auth", () => ({
  getAuthenticatedUserId: mocks.getAuthenticatedUserId,
}));

vi.mock("@/app/lib/forecast/forecast", () => ({
  getForecastForUser: mocks.getForecastForUser,
}));

vi.mock("@/app/lib/transfers/create-transfer", () => ({
  createTransferForUser: mocks.createTransferForUser,
}));

vi.mock("@/app/lib/transfers/read-transfer", () => ({
  listTransfersForUser: mocks.listTransfersForUser,
  getTransferForUser: mocks.getTransferForUser,
}));

vi.mock("@/app/lib/transfers/lifecycle-transfer", () => ({
  updateTransferForUser: mocks.updateTransferForUser,
  deleteTransferForUser: mocks.deleteTransferForUser,
}));

import { GET as getForecast } from "@/app/api/forecast/route";
import {
  POST as createTransfer,
} from "@/app/api/transfers/route";
import { GET as getTransfer } from "@/app/api/transfers/[id]/route";
import {
  failure,
  rateLimitFailure,
  success,
} from "@/app/lib/api-response";
import { HttpError } from "@/app/lib/http-error";

const PRIVATE_CACHE_CONTROL = "private, no-store, max-age=0";

const validTransferInput = {
  sourceAccountId: "550e8400-e29b-41d4-a716-446655440000",
  destinationAccountId: "550e8400-e29b-41d4-a716-446655440001",
  amountCents: 2500,
  year: 2026,
  month: 9,
  day: 18,
  description: "Transferência",
  status: "COMPLETED",
};

async function expectFailureEnvelope(
  response: Response,
  expectedStatus: number,
  expectedMessage?: string,
) {
  expect(response.status).toBe(expectedStatus);
  expect(response.headers.get("cache-control")).toBe(PRIVATE_CACHE_CONTROL);

  const body = await response.json();
  expect(body.success).toBe(false);
  expect(body.error).toEqual(
    expect.objectContaining({
      message: expectedMessage ?? expect.any(String),
    }),
  );
  expect(body).not.toHaveProperty("stack");
  expect(body.error).not.toHaveProperty("stack");

  return body;
}

describe("shared HTTP response contract", () => {
  it("keeps success and failure envelopes private and predictable", async () => {
    const ok = success({ id: "item-1" }, "Item carregado");
    expect(ok.status).toBe(200);
    expect(ok.headers.get("cache-control")).toBe(PRIVATE_CACHE_CONTROL);
    await expect(ok.json()).resolves.toEqual({
      success: true,
      data: { id: "item-1" },
      message: "Item carregado",
    });

    const bad = failure("Dados inválidos", 400, "INVALID_INPUT");
    const body = await expectFailureEnvelope(bad, 400, "Dados inválidos");
    expect(body.error.code).toBe("INVALID_INPUT");
  });

  it("keeps rate-limit metadata in headers and the public failure envelope", async () => {
    const response = rateLimitFailure("Tente novamente", 42, "RATE_LIMITED");
    const body = await expectFailureEnvelope(response, 429, "Tente novamente");

    expect(response.headers.get("Retry-After")).toBe("42");
    expect(body.error.code).toBe("RATE_LIMITED");
  });
});

describe("representative route contracts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAuthenticatedUserId.mockResolvedValue("user-1");
    mocks.getForecastForUser.mockResolvedValue({
      currency: "BRL",
      days: 30,
      accounts: [],
      upcoming: [],
      overdue: [],
    });
    mocks.createTransferForUser.mockResolvedValue({
      replayed: false,
      id: "transfer-1",
    });
    mocks.listTransfersForUser.mockResolvedValue([]);
    mocks.getTransferForUser.mockResolvedValue({ id: "transfer-1" });
  });

  it("logs a safe performance context for a successful forecast", async () => {
    const response = await getForecast(
      new Request("http://localhost/api/forecast?currency=BRL&days=30", {
        headers: { "x-request-id": "forecast-observe-123" },
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("x-request-id")).toBe("forecast-observe-123");
    expect(observabilityMocks.logServerOperation).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "financial_forecast",
        requestId: "forecast-observe-123",
        route: "/api/forecast",
        status: 200,
        startedAt: expect.any(Number),
        context: {
          result: "success",
          currency: "BRL",
          horizonDays: 30,
          accountCount: 0,
          upcomingCount: 0,
          overdueCount: 0,
        },
      }),
    );
  });

  it("returns 400 for invalid query input using the failure envelope", async () => {
    const response = await getForecast(
      new Request("http://localhost/api/forecast?currency=BRL&days=365"),
    );

    await expectFailureEnvelope(response, 400);
    expect(mocks.getForecastForUser).not.toHaveBeenCalled();
  });

  it("returns 401 for unauthenticated access without leaking auth internals", async () => {
    mocks.getAuthenticatedUserId.mockRejectedValue(
      new Error("UNAUTHORIZED"),
    );

    const response = await getForecast(
      new Request("http://localhost/api/forecast"),
    );
    const body = await expectFailureEnvelope(
      response,
      401,
      "Não autenticado",
    );

    expect(JSON.stringify(body)).not.toContain("UNAUTHORIZED");
  });

  it("returns a safe 500 without driver details or stack content", async () => {
    mocks.getForecastForUser.mockRejectedValue(
      new Error("postgresql://user:super-secret@db.internal/app"),
    );

    const response = await getForecast(
      new Request("http://localhost/api/forecast"),
    );
    const body = await expectFailureEnvelope(
      response,
      500,
      "Erro ao carregar projeção financeira",
    );
    const serialized = JSON.stringify(body);

    expect(serialized).not.toMatch(/postgresql|super-secret|db\.internal|stack/i);
  });

  it("preserves ownership-safe 404 errors for foreign or missing resources", async () => {
    mocks.getTransferForUser.mockRejectedValue(
      new HttpError("Transferência não encontrada", 404, "NOT_FOUND"),
    );

    const response = await getTransfer(
      new Request("http://localhost/api/transfers/foreign"),
      { params: Promise.resolve({ id: "foreign" }) },
    );
    const body = await expectFailureEnvelope(
      response,
      404,
      "Transferência não encontrada",
    );

    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("requires an idempotency key before creating a transfer", async () => {
    const response = await createTransfer(
      new Request("http://localhost/api/transfers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(validTransferInput),
      }),
    );

    await expectFailureEnvelope(
      response,
      400,
      "Idempotency-Key obrigatório",
    );
    expect(mocks.createTransferForUser).not.toHaveBeenCalled();
  });

  it("returns 201 for a new idempotent transfer and 200 for its replay", async () => {
    const request = () =>
      new Request("http://localhost/api/transfers", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "Idempotency-Key": "attempt-123",
        },
        body: JSON.stringify(validTransferInput),
      });

    const created = await createTransfer(request());
    expect(created.status).toBe(201);
    expect(created.headers.get("cache-control")).toBe(PRIVATE_CACHE_CONTROL);
    await expect(created.json()).resolves.toMatchObject({
      success: true,
      data: { id: "transfer-1" },
      message: "Transferência criada com sucesso",
    });

    mocks.createTransferForUser.mockResolvedValueOnce({
      replayed: true,
      id: "transfer-1",
    });

    const replayed = await createTransfer(request());
    expect(replayed.status).toBe(200);
    expect(replayed.headers.get("cache-control")).toBe(PRIVATE_CACHE_CONTROL);
    await expect(replayed.json()).resolves.toMatchObject({
      success: true,
      data: { id: "transfer-1" },
      message: "Transferência já criada anteriormente",
    });
  });
});
