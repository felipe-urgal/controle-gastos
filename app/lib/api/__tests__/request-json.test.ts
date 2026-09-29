import { describe, expect, it } from "vitest";

import {
  DEFAULT_JSON_BODY_LIMIT_BYTES,
  parseJsonBody,
} from "@/app/lib/api/request-json";
import { HttpError } from "@/app/lib/http-error";

describe("parseJsonBody", () => {
  it("parses JSON within the default limit", async () => {
    const request = new Request("http://localhost/api/test", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ok: true }),
    });

    await expect(parseJsonBody(request)).resolves.toEqual({ ok: true });
  });

  it("rejects declared content-length above the limit before reading the body", async () => {
    const request = new Request("http://localhost/api/test", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "content-length": String(DEFAULT_JSON_BODY_LIMIT_BYTES + 1),
      },
      body: "{}",
    });

    await expect(parseJsonBody(request)).rejects.toMatchObject<HttpError>({
      status: 413,
      code: "PAYLOAD_TOO_LARGE",
    });
  });

  it("rejects streamed bodies that exceed the limit without content-length", async () => {
    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode('{"value":"'));
        controller.enqueue(encoder.encode("x".repeat(40)));
        controller.enqueue(encoder.encode('"}'));
        controller.close();
      },
    });

    const request = new Request("http://localhost/api/test", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      duplex: "half",
    } as RequestInit & { duplex: "half" });

    await expect(
      parseJsonBody(request, { maxBytes: 32 }),
    ).rejects.toMatchObject<HttpError>({
      status: 413,
      code: "PAYLOAD_TOO_LARGE",
    });
  });

  it("counts UTF-8 bytes instead of JavaScript characters", async () => {
    const request = new Request("http://localhost/api/test", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ value: "💰💰💰" }),
    });

    await expect(
      parseJsonBody(request, { maxBytes: 20 }),
    ).rejects.toMatchObject<HttpError>({
      status: 413,
      code: "PAYLOAD_TOO_LARGE",
    });
  });

  it("keeps invalid JSON as a 400 INVALID_JSON error", async () => {
    const request = new Request("http://localhost/api/test", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{invalid",
    });

    await expect(parseJsonBody(request)).rejects.toMatchObject<HttpError>({
      status: 400,
      code: "INVALID_JSON",
    });
  });

  it("supports a route-specific limit override", async () => {
    const request = new Request("http://localhost/api/test", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ value: "x".repeat(200) }),
    });

    await expect(
      parseJsonBody(request, { maxBytes: 1024 }),
    ).resolves.toEqual({ value: "x".repeat(200) });
  });
});
