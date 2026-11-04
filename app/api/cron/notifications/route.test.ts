import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const cronMocks = vi.hoisted(() => ({ runNotificationsCron: vi.fn() }));

vi.mock("@/app/lib/notifications/notification-cron", () => ({
  runNotificationsCron: cronMocks.runNotificationsCron,
}));

import { GET } from "@/app/api/cron/notifications/route";

const previousSecret = process.env.CRON_SECRET;

beforeEach(() => {
  process.env.CRON_SECRET = "secret";
  cronMocks.runNotificationsCron.mockReset();
});

afterEach(() => {
  if (previousSecret === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = previousSecret;
});

const url = "http://localhost/api/cron/notifications";

describe("GET /api/cron/notifications", () => {
  it("recusa sem credencial, com credencial errada e sem segredo configurado", async () => {
    expect((await GET(new Request(url))).status).toBe(401);
    expect((await GET(new Request(url, { headers: { authorization: "Bearer wrong" } }))).status).toBe(401);

    delete process.env.CRON_SECRET;
    expect((await GET(new Request(url, { headers: { authorization: "Bearer " } }))).status).toBe(401);
    expect(cronMocks.runNotificationsCron).not.toHaveBeenCalled();
  });

  it("executa o job com o segredo correto", async () => {
    cronMocks.runNotificationsCron.mockResolvedValue({ status: "ok", createdNotifications: 2 });

    const response = await GET(new Request(url, { headers: { authorization: "Bearer secret" } }));

    expect(response.status).toBe(200);
    expect((await response.json()).data).toEqual({ status: "ok", createdNotifications: 2 });
  });

  it("falha do job vira 500 sem vazar detalhe", async () => {
    cronMocks.runNotificationsCron.mockRejectedValue(new Error("detalhe interno"));

    const response = await GET(new Request(url, { headers: { authorization: "Bearer secret" } }));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(JSON.stringify(body)).not.toContain("detalhe interno");
  });
});
