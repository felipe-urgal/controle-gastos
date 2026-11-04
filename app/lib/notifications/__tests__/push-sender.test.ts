import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const webPushMock = vi.hoisted(() => ({ sendNotification: vi.fn() }));
vi.mock("web-push", () => ({ default: { sendNotification: webPushMock.sendNotification } }));

import { isPushConfigured, sendPush, vapidPublicKey } from "@/app/lib/notifications/push-sender";

const ENV = ["VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY", "VAPID_SUBJECT"] as const;
const saved: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const name of ENV) saved[name] = process.env[name];
  process.env.VAPID_PUBLIC_KEY = "pub";
  process.env.VAPID_PRIVATE_KEY = "priv";
  process.env.VAPID_SUBJECT = "mailto:avisos@example.test";
  webPushMock.sendNotification.mockReset();
});

afterEach(() => {
  for (const name of ENV) {
    if (saved[name] === undefined) delete process.env[name];
    else process.env[name] = saved[name];
  }
});

const target = { endpoint: "https://push.example.test/abc", p256dh: "p", auth: "a" };
const payload = { title: "Aluguel", body: "vence amanhã", url: "/compromissos" };

describe("push-sender", () => {
  it("só está configurado com as três variáveis VAPID", () => {
    expect(isPushConfigured()).toBe(true);
    expect(vapidPublicKey()).toBe("pub");

    delete process.env.VAPID_SUBJECT;
    expect(isPushConfigured()).toBe(false);
    expect(vapidPublicKey()).toBeNull();
  });

  it("envia o payload em JSON com VAPID, TTL e timeout", async () => {
    webPushMock.sendNotification.mockResolvedValue({ statusCode: 201 });

    await expect(sendPush(target, payload)).resolves.toBe("sent");

    const [subscription, body, options] = webPushMock.sendNotification.mock.calls[0];
    expect(subscription).toEqual({ endpoint: target.endpoint, keys: { p256dh: "p", auth: "a" } });
    expect(JSON.parse(body)).toEqual(payload);
    expect(options).toMatchObject({
      vapidDetails: { subject: "mailto:avisos@example.test", publicKey: "pub", privateKey: "priv" },
      TTL: 86_400,
    });
    expect(options.timeout).toBeGreaterThan(0);
  });

  it("404 e 410 significam inscrição expirada; outros erros são falha", async () => {
    webPushMock.sendNotification.mockRejectedValueOnce({ statusCode: 410 });
    await expect(sendPush(target, payload)).resolves.toBe("gone");

    webPushMock.sendNotification.mockRejectedValueOnce({ statusCode: 404 });
    await expect(sendPush(target, payload)).resolves.toBe("gone");

    webPushMock.sendNotification.mockRejectedValueOnce({ statusCode: 500 });
    await expect(sendPush(target, payload)).resolves.toBe("failed");

    webPushMock.sendNotification.mockRejectedValueOnce(new Error("rede"));
    await expect(sendPush(target, payload)).resolves.toBe("failed");
  });

  it("sem configuração não chama o serviço de push", async () => {
    delete process.env.VAPID_PRIVATE_KEY;

    await expect(sendPush(target, payload)).resolves.toBe("failed");
    expect(webPushMock.sendNotification).not.toHaveBeenCalled();
  });
});
