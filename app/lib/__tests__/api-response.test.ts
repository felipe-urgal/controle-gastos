import { describe, expect, it } from "vitest";

import { failure, success } from "@/app/lib/api-response";

describe("api response cache policy", () => {
  it("marks successful private API responses as non-cacheable", () => {
    const response = success({ id: "account-1" });

    expect(response.headers.get("cache-control")).toBe(
      "private, no-store, max-age=0"
    );
  });

  it("marks error responses as non-cacheable", () => {
    const response = failure("Não autenticado", 401);

    expect(response.headers.get("cache-control")).toBe(
      "private, no-store, max-age=0"
    );
  });
});
